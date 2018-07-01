/* global Directors, sails, Status, Calendar, Meta, Tasks, Playlists, Playlists_list, moment, Timesheet, needle, Statelogs, Logs, Recipients, Category, History, Requests, Events, Subcategory, Genre, Settings, Hosts, Nodeusers, Discipline, Messages, Eas, Songs */

module.exports.cron = {

    // Run checks every second
    checks: {
        schedule: '* * * * * *',
        onTick: function () {
            return new Promise(async (resolve, reject) => {
                sails.log.debug(`CRON checks triggered.`);

                var change = {queueLength: 0, percent: 0, time: moment().toISOString()}; // Instead of doing a bunch of changeMetas, put all non-immediate changes into this object and changeMeta at the end of this operation.
                //
                // Skip all checks and use default meta template if sails.config.custom.lofi = true
                if (sails.config.custom.lofi)
                {
                    try {
                        change = Meta.template;
                        change.time = moment().toISOString();
                        await Meta.changeMeta(change);
                    } catch (e) {
                        Meta.changeMeta({time: moment().toISOString()});
                        sails.log.error(e);
                        return resolve(e);
                    }
                    return resolve();
                }

                // Try to get the current RadioDJ queue. Add an error count if we fail.
                try {
                    var queue = await sails.helpers.rest.getQueue();

                    // Remove duplicate tracks. Also, calculate length of the queue
                    async function queueCheck() {
                        try {
                            sails.log.silly(`queueCheck executed.`);
                            var theTracks = [];
                            return sails.helpers.asyncForEach(queue, function (track, index) {
                                return new Promise(async (resolve2, reject2) => {
                                    var title = `${track.Artist} - ${track.Title}`;

                                    // If there is a duplicate, remove the track, store for later queuing if necessary, and start duplicate checking over again
                                    if (theTracks.indexOf(title) > -1)
                                    {
                                        sails.log.debug(`Track ${track.ID} on index ${index} is a duplicate of index (${theTracks[theTracks.indexOf(title)]}. Removing!`);
                                        if (track.TrackType !== 'Music')
                                            Songs.pending.push(track.ID);
                                        await sails.helpers.rest.cmd('RemovePlaylistTrack', index - 1);
                                        theTracks = [];
                                        queue = await sails.helpers.rest.getQueue();
                                        change.queueLength = 0;
                                        await queueCheck();
                                        return resolve2(true);
                                    } else {
                                        theTracks.push(title);
                                        change.queueLength += (track.Duration - track.Elapsed);
                                        return resolve2(false);
                                    }
                                });
                            });
                        } catch (e) {
                            sails.log.error(e);
                            Meta.changeMeta({time: moment().toISOString()});
                            return null;
                        }
                    }
                    await queueCheck();
                    sails.log.silly(`Proceeding after queueCheck.`);

                    // If the currently playing track was a request, mark as played
                    if (Requests.pending.indexOf(queue[0].ID) > -1)
                    {
                        await Requests.update({songID: queue[0].ID}, {played: 1})
                                .tolerate((err) => {
                                });
                        delete Requests.pending[Requests.pending.indexOf(queue[0].ID)];
                    }

                    await sails.helpers.error.reset('queueFail');

                    // Error checks
                    await sails.helpers.error.count('stationID', true);
                } catch (e) {
                    await sails.helpers.error.count('queueFail');
                    sails.log.error(e);
                    Meta.changeMeta({time: moment().toISOString()});
                    return resolve(e);
                }

                /* Every now and then, querying now playing queue happens when RadioDJ is in the process of queuing a track, resulting in an inaccurate reported queue length.
                 * This results in false transitions in system state. Run a check to detect if the queuelength deviated by more than 2 seconds since last run.
                 * If so, we assume this was an error, so do not treat it as accurate, and trigger a 5 second error resolution wait.
                 */
                if (change.queueLength > (Status.errorCheck.prevQueueLength - 3) || Status.errorCheck.trueZero > 0)
                {
                    // If the detected queueLength gets bigger, assume the issue resolved itself and immediately mark the queuelength as accurate
                    if (change.queueLength > (Status.errorCheck.prevQueueLength))
                    {
                        Status.errorCheck.trueZero = 0;
                        Status.errorCheck.prevQueueLength = change.queueLength;
                    } else if (Status.errorCheck.trueZero > 0)
                    {
                        Status.errorCheck.trueZero -= 1;
                        if (Status.errorCheck.trueZero < 1)
                        {
                            Status.errorCheck.trueZero = 0;
                            Status.errorCheck.prevQueueLength = change.queueLength;
                        } else {
                            //Statemeta.final.queueLength = (Statesystem.errors.prevqueuelength - 1);
                            Status.errorCheck.prevQueueLength = change.queueLength;
                        }
                        if (change.queueLength < 0)
                            change.queueLength = 0;
                    } else { // No error wait time [remaining]? Use actual detected queue time.
                        Status.errorCheck.prevQueueLength = change.queueLength;
                    }
                } else {
                    Status.errorCheck.trueZero = 5; // Wait up to 5 seconds before considering the queue accurate
                    // Instead of using the actually recorded queueLength, use the previously detected length minus 1 second.
                    //Statemeta.final.queueLength = (Statesystem.errors.prevqueuelength - 1);
                    Status.errorCheck.prevQueueLength = change.queueLength;
                    if (change.queueLength < 0)
                        change.queueLength = 0;
                }

                Status.errorCheck.prevQueueLength = change.queueLength;

                // If we do not know current state, we may need to populate the info from the database.
                if (Meta['A'].state === '' || Meta['A'].state === 'unknown')
                {
                    try {
                        var meta = await Meta.find().limit(1)
                                .tolerate((err) => {
                                    sails.log.error(err);
                                    Meta.changeMeta({time: moment().toISOString()});
                                    return resolve(err);
                                });
                        meta = meta[0];
                        meta.time = moment().toISOString();
                        sails.log.silly(meta);
                        await Meta.changeMeta(meta);
                    } catch (e) {
                        Meta.changeMeta({time: moment().toISOString()});
                        return resolve(e);
                    }
                }

                // If we do not know active playlist, we need to populate the info
                if (Playlists.active.ID === -1 && (Meta['A'].state === 'automation_playlist' || Meta['A'].state === 'live_prerecord'))
                {
                    try {
                        var theplaylist = await Playlists.findOne({name: Meta['A'].playlist})
                                .tolerate((err) => {
                                    Playlists.active.ID = 0;
                                });
                        if (typeof theplaylist === 'undefined')
                        {
                            Playlists.active.ID = 0;
                        } else {
                            Playlists.active.ID = theplaylist.ID;
                            var playlistTracks = await Playlists_list.find({pID: Playlists.active.ID})
                                    .tolerate((err) => {
                                    });
                            Playlists.active.tracks = [];
                            if (typeof playlistTracks !== 'undefined')
                            {
                                playlistTracks.forEach(function (playlistTrack) {
                                    Playlists.active.tracks.push(playlistTrack.sID);
                                });
                            }
                        }
                    } catch (e) {
                        sails.log.error(e);
                    }
                }

                // Clear manual metadata if it is old
                if (moment().isAfter(moment(Meta['A'].trackstamp).add(sails.config.custom.meta.clearTime, 'minutes')) && !Meta['A'].state.startsWith("automation_") && !Meta['A'].state === 'live_prerecord' && Meta['A'].track !== '')
                    change.track = '';

                // Playlist maintenance
                var thePosition = -1;
                var playlistTrackPlaying = false;
                if ((Meta['A'].state === 'automation_playlist' || Meta['A'].state === 'automation_prerecord' || Meta['A'].state === 'live_prerecord'))
                {
                    // Go through each track in the queue and see if it is a track from our playlist. If so, log the lowest number as the position in our playlist
                    await sails.helpers.asyncForEach(queue, function (autoTrack, index) {
                        return new Promise(async (resolve2, reject2) => {
                            try {
                                for (var i = 0; i < Playlists.active.tracks.length; i++) {
                                    var name = Playlists.active.tracks[i];
                                    if (name === autoTrack.ID) {
                                        // Waiting for the playlist to begin, and it has begun? Switch states.
                                        if (Meta['A'].state === 'automation_prerecord' && index === 0 && !Playlists.queuing)
                                        {
                                            await Meta.changeMeta({state: 'live_prerecord'});
                                        }
                                        if (index === 0)
                                            playlistTrackPlaying = true;
                                        if (thePosition === -1 || i < thePosition)
                                        {
                                            thePosition = i;
                                        }
                                        break;
                                    }
                                }
                                return resolve2(false);
                            } catch (e) {
                                sails.log.error(e);
                                return resolve2(false);
                            }
                        });
                    });

                    try {
                        // Finished the playlist? Go back to automation.
                        if (thePosition === -1 && Status.errorCheck.trueZero <= 0 && !Playlists.queuing)
                        {
                            await Statelogs.create({logtype: 'operation', loglevel: 'info', logsubtype: '', event: 'Playlist has finished and we went to automation.'})
                                    .tolerate((err) => {
                                    });
                            await sails.helpers.rest.cmd('EnableAssisted', 0);
                            Meta.changeMeta({state: 'automation_on', dj: '', topic: '', playlist: null, playlist_position: 0});
                            Playlists.active.name = null;
                            Playlists.active.position = 0;
                            // Did not finish the playlist? Ensure the position is updated in meta.
                        } else if (thePosition !== -1) {
                            if (thePosition !== Meta['A'].playlist_position)
                            {
                                Playlists.active.position = thePosition;
                                change.playlist_position = thePosition;
                            }
                        }
                    } catch (e) {
                        sails.log.error(e);
                    }
                }

                try {

                    // Manage the metadata for when there is one or more tracks in the queue (RadioDJ should always return at least 1 "dummy" track, even if there are none in the queue)
                    if (queue.length > 0)
                    {
                        if (queue[0].Duration > 0)
                            change.percent = (queue[0].Elapsed / queue[0].Duration);

                        // In automation and something is currently playing
                        if (Meta['A'].state.startsWith("automation_") && queue[0].ID !== 0 && Meta['A'].state !== 'automation_playlist' && Meta['A'].state !== 'automation_genre')
                        {
                            change.webchat = true;
                            var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                            if (Meta['A'].track !== newmeta)
                                await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: 'automation', event: 'Automation played a track', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                        .tolerate((err) => {
                                        });
                            change.track = newmeta;
                            // We do not want to display metadata for tracks that are not of type music, or have Unknown Artist as the artist
                            if (queue[0].TrackType !== 'Music' || queue[0].Artist.includes("Unknown Artist"))
                            {
                                change.line1 = sails.config.custom.meta.alt.automation;
                                change.line2 = '';
                                change.current = `WWSU 106.9FM - ${sails.config.custom.meta.alt.automation}`;
                                change.percent = 0;
                            } else {
                                change.line1 = `Now playing: ${change.track}`;
                                change.line2 = '';
                                change.stream = change.track;
                            }
                            // Someone is about to go live
                            if (Meta['A'].state === 'automation_live')
                            {
                                change.line2 = `About to go live: ${Meta['A'].dj}`;
                                // Prerecord about to begin
                            } else if (Meta['A'].state === 'automation_prerecord')
                            {
                                change.line2 = `Prerecord about to start: ${Meta['A'].dj}`;
                            }

                            // If we are playing a playlist
                        } else if (queue[0].ID !== 0 && Meta['A'].state === 'automation_playlist')
                        {
                            change.webchat = true;
                            var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                            if (Meta['A'].track !== newmeta)
                                await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: 'playlist', event: 'Automation playlist played a track', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                        .tolerate((err) => {
                                        });

                            change.track = newmeta;
                            // Do not display track meta for Non-music tracks or tracks with an unknown artist
                            if (queue[0].TrackType !== 'Music' || queue[0].Artist.includes("Unknown Artist"))
                            {
                                change.line1 = sails.config.custom.meta.alt.playlist;
                                change.line2 = `Playlist: ${Meta['A'].playlist}`;
                                change.stream = `WWSU 106.9FM - ${sails.config.custom.meta.alt.playlist}`;
                                change.percent = 0;
                            } else {
                                change.line1 = `Now playing: ${change.track}`;
                                change.line2 = `Playlist: ${Meta['A'].playlist}`;
                                change.stream = change.track;
                            }
                            // We are in genre automation
                        } else if (queue[0].ID !== 0 && Meta['A'].state === 'automation_genre')
                        {
                            change.webchat = true;
                            var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                            if (Meta['A'].track !== newmeta)
                                await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: 'automation', event: 'Genre automation played a track', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                        .tolerate((err) => {
                                        });
                            change.track = newmeta;
                            // Do not display track meta if the track is not type Music or the artist is unknown
                            if (queue[0].TrackType !== 'Music' || queue[0].Artist.includes("Unknown Artist"))
                            {
                                change.line1 = sails.config.custom.meta.alt.genre;
                                change.line2 = `Genre: ${Meta['A'].genre}`;
                                change.stream = `WWSU 106.9FM - ${sails.config.custom.meta.alt.genre}`;
                                change.percent = 0;
                            } else {
                                change.line1 = `Now playing: ${change.track}`;
                                change.line2 = `Genre: ${Meta['A'].genre}`;
                                change.stream = change.track;
                            }
                            // Live shows that are not prerecords
                        } else if (Meta['A'].state.startsWith("live_") && Meta['A'].state !== 'live_prerecord')
                        {
                            // Something is playing in RadioDJ
                            if (queue[0].ID !== 0)
                            {
                                var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                                if (Meta['A'].track !== newmeta)
                                    await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: Meta['A'].dj, event: 'DJ played a track in automation', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                            .tolerate((err) => {
                                            });
                                change.track = newmeta;
                                // Do not display meta for tracks that are not type Music or have an unknown artist
                                if (queue[0].TrackType !== 'Music' || queue[0].Artist.includes("Unknown Artist"))
                                {
                                    change.line1 = `On the Air: ${Meta['A'].dj}`;
                                    change.line2 = sails.config.custom.meta.alt.live;
                                    change.stream = `${Meta['A'].dj} (${sails.config.custom.meta.alt.live})`;
                                    change.percent = 0;
                                } else {
                                    change.line1 = `On the Air: ${Meta['A'].dj}`;
                                    change.line2 = `Playing: ${change.track}`;
                                    change.stream = change.track;
                                }
                                // Not playing anything in RadioDJ
                            } else {
                                // A track was manually logged
                                if (Meta['A'].track !== '')
                                {
                                    change.line1 = `On the Air: ${Meta['A'].dj}`;
                                    change.line2 = `Playing: ${Meta['A'].track}`;
                                    change.percent = 0;
                                    change.stream = Meta['A'].track;
                                    // No tracks playing
                                } else {
                                    change.track = '';
                                    change.line1 = `On the Air: ${Meta['A'].dj}`;
                                    change.line2 = '';
                                    change.percent = 0;
                                    change.stream = `${Meta['A'].dj} (LIVE)`;
                                }
                            }
                            // Playing a prerecorded show
                        } else if (queue[0].ID !== 0 && Meta['A'].state === 'live_prerecord')
                        {
                            change.webchat = true;
                            var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                            change.dj = Meta['A'].playlist;
                            if (Meta['A'].track !== newmeta)
                                await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: Meta['A'].playlist, event: 'Prerecorded show playlist played a track', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                        .tolerate((err) => {
                                        });
                            change.track = newmeta;
                            // If the currently playing track is not a track that exists in the prerecord playlist, do not display meta for it
                            if (!playlistTrackPlaying)
                            {
                                change.line1 = `Prerecorded Show: ${Meta['A'].playlist}`;
                                change.line2 = sails.config.custom.meta.alt.prerecord;
                                change.stream = `WWSU 106.9FM - ${sails.config.custom.meta.alt.prerecord}`;
                                change.percent = 0;
                            } else {
                                change.line1 = `Prerecorded Show: ${Meta['A'].playlist}`;
                                change.line2 = `Playing: ${change.track}`;
                                change.stream = change.track;
                            }
                            // Remote broadcasts
                        } else if (Meta['A'].state.startsWith("remote_"))
                        {
                            // The currently playing track is not an Internet Stream track
                            if (queue[0].ID !== 0 && queue[0].TrackType !== 'InternetStream')
                            {
                                var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                                if (Meta['A'].track !== newmeta)
                                    await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: Meta['A'].dj, event: 'Remote producer played a track in automation', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                            .tolerate((err) => {
                                            });
                                change.track = newmeta;
                                // If the currently playing track is a non-Music track, or if we are in disconnected remote mode, show alternative metadata
                                if (queue[0].TrackType !== 'Music' || queue[0].Artist.includes("Unknown Artist") || Meta['A'].state.includes("disconnected"))
                                {
                                    change.line1 = `Broadcasting: ${Meta['A'].dj}`;
                                    change.line2 = sails.config.custom.meta.alt.remote;
                                    change.percent = 0;
                                    change.stream = `${Meta['A'].dj} (${sails.config.custom.meta.alt.remote})`;
                                } else {
                                    change.line1 = `Broadcasting: ${Meta['A'].dj}`;
                                    change.line2 = `Playing: ${change.track}`;
                                    change.stream = change.track;
                                }
                            } else {
                                // A manual track was logged
                                if (Meta['A'].track !== '')
                                {
                                    change.line1 = `Broadcasting: ${Meta['A'].dj}`;
                                    change.line2 = `Playing: ${Meta['A'].track}`;
                                    change.percent = 0;
                                    change.stream = Meta['A'].track;
                                } else {
                                    change.track = '';
                                    change.line1 = `Broadcasting: ${Meta['A'].dj}`;
                                    change.line2 = "";
                                    change.percent = 0;
                                    change.stream = `${Meta['A'].dj} (REMOTE)`;
                                }
                            }
                            // Sports broadcast
                        } else if (Meta['A'].state.startsWith("sports_") || Meta['A'].state.startsWith("sportsremote_"))
                        {
                            // Something is playing in automation
                            if (queue[0].Duration > 0)
                            {
                                var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                                if (Meta['A'].track !== newmeta)
                                    await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: Meta['A'].dj, event: 'Producer played a track in automation', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                            .tolerate((err) => {
                                            });
                                change.track = newmeta;
                                change.line1 = `Raider Sports: ${Meta['A'].dj}`;
                                change.line2 = sails.config.custom.meta.alt.sports;
                                change.percent = 0;
                                change.stream = `Raider Sports - ${Meta['A'].dj} (${sails.config.custom.meta.alt.sports})`;
                            } else {
                                // Manual track playing
                                if (Meta['A'].track !== '')
                                {
                                    change.line1 = `Raider Sports: ${Meta['A'].dj}`;
                                    change.line2 = sails.config.custom.meta.alt.sports;
                                    change.percent = 0;
                                    change.stream = `Raider Sports - ${Meta['A'].dj} (${sails.config.custom.meta.alt.sports})`;
                                } else {
                                    change.track = '';
                                    change.line1 = `Raider Sports: ${Meta['A'].dj}`;
                                    change.line2 = "";
                                    change.percent = 0;
                                    change.stream = `Raider Sports - ${Meta['A'].dj}`;
                                }
                            }
                        }

                        // Clean up profanity in metadata
                        if (typeof change.line1 !== 'undefined')
                            change.line1 = await sails.helpers.filterProfane(change.line1);
                        if (typeof change.line2 !== 'undefined')
                            change.line2 = await sails.helpers.filterProfane(change.line2);
                        if (typeof change.stream !== 'undefined')
                            change.stream = await sails.helpers.filterProfane(change.stream);

                        // parse metadata
                        if (typeof change.stream !== 'undefined' && change.stream !== Meta['A'].stream)
                        {
                            var thearray = [];
                            thearray = change.stream.split(' - ');
                            if (thearray.length < 1)
                                thearray[0] = '';
                            if (thearray.length < 2)
                                thearray[1] = '';
                            var theartist = thearray[0];
                            var thetitle = thearray[1];
                            change.artist = theartist;
                            change.title = thetitle;

                            Meta.history.unshift(`${theartist} - ${thetitle}`);
                            if (Meta.history.length > 5)
                                delete Meta.history[5];

                            // WORK ON THIS: publishing stream changes to Shoutcast/Icecast
                        }


                        // If we are preparing for live, so some stuff if queue is done
                        if (Meta['A'].state === 'automation_live' && change.queueLength <= 0 && Status.errorCheck.trueZero <= 0)
                        {
                            change.line2 = '';
                            change.track = '';
                            await Meta.changeMeta({state: 'live_on'});
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                        }
                        if (Meta['A'].state === 'automation_sports' && change.queueLength <= 0 && Status.errorCheck.trueZero <= 0)
                        {
                            change.line2 = '';
                            change.track = '';
                            await Meta.changeMeta({state: 'sports_on'});
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                        }
                        // If we are preparing for remote, so some stuff if we are playing the stream track
                        if (Meta['A'].state === 'automation_remote' && change.queueLength <= 0 && Status.errorCheck.trueZero <= 0)
                        {
                            change.line2 = '';
                            change.track = '';
                            await Meta.changeMeta({state: 'remote_on'});
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                            await sails.helpers.songs.queue(sails.config.custom.subcats.remote, 'Bottom', 1);
                            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 0);
                        }
                        if (Meta['A'].state === 'automation_sportsremote' && change.queueLength <= 0 && Status.errorCheck.trueZero <= 0)
                        {
                            change.line2 = '';
                            change.track = '';
                            await Meta.changeMeta({state: 'sportsremote_on'});
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                            await sails.helpers.songs.queue(sails.config.custom.subcats.remote, 'Bottom', 1);
                            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 0);
                        }
                        // If returning from break, do stuff once queue is empty
                        if (Meta['A'].state.includes('_returning') && change.queueLength <= 0 && Status.errorCheck.trueZero <= 0)
                        {
                            switch (Meta['A'].state)
                            {
                                case 'live_returning':
                                    change.line2 = '';
                                    change.track = '';
                                    await Meta.changeMeta({state: 'live_on'});
                                    await sails.helpers.rest.cmd('EnableAssisted', 1);
                                    break;
                                case 'remote_returning':
                                    change.line2 = '';
                                    change.track = '';
                                    await Meta.changeMeta({state: 'remote_on'});
                                    await sails.helpers.rest.cmd('EnableAssisted', 1);
                                    await sails.helpers.songs.queue(sails.config.custom.subcats.remote, 'Bottom', 1);
                                    await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                                    await sails.helpers.rest.cmd('EnableAssisted', 0);
                                    break;
                                case 'sports_returning':
                                    change.line2 = '';
                                    change.track = '';
                                    await Meta.changeMeta({state: 'sports_on'});
                                    await sails.helpers.rest.cmd('EnableAssisted', 1);
                                    break;
                                case 'sportsremote_returning':
                                    change.line2 = '';
                                    change.track = '';
                                    await Meta.changeMeta({state: 'sportsremote_on'});
                                    await sails.helpers.rest.cmd('EnableAssisted', 1);
                                    await sails.helpers.songs.queue(sails.config.custom.subcats.remote, 'Bottom', 1);
                                    await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                                    await sails.helpers.rest.cmd('EnableAssisted', 0);
                                    break;
                            }
                        }

                        // If we are in break, queue something if the queue is under 2 items to keep the break going
                        if ((Meta['A'].state === 'sports_halftime' || Meta['A'].state === 'sportsremote_halftime' || Meta['A'].state === 'sportsremote_halftime_disconnected') && queue.length < 2)
                        {
                            await sails.helpers.songs.queue(sails.config.custom.subcats.halftime, 'Bottom', 1);
                        }
                        if (Meta['A'].state.includes('_break') && queue.length < 2)
                        {
                            await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Bottom', 1, true);
                        }

                        // If we are in a sports break, switch it to returning mode because it should not be an indefinite break
                        // WE HAVE the system go to break mode for this to switch to returning. This avoids a bug where being immediately in returning causes switch to on because queue is initially 0.
                        var d = new Date();
                        var n = d.getMinutes();
                        if (Meta['A'].state === 'sports_break')
                        {
                            await Meta.changeMeta({state: 'sports_returning'});

                            // Begin error check for sports Return
                            await sails.helpers.error.count('sportsReturn');

                            // Do a station ID
                            if (n >= 50 || n <= 10)
                            {
                                // Begin error check for legal ID
                                await sails.helpers.error.count('stationID');
                                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                                Status.errorCheck.prevID = moment();
                                if (typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                                    await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Liners"]], 'Bottom', 1);
                            } else {
                                if (typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                                    await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Liners"]], 'Bottom', 1);
                            }
                        }
                        if (Meta['A'].state === 'sportsremote_break')
                        {
                            await Meta.changeMeta({state: 'sportsremote_returning'});

                            // Begin error check for sports Return
                            await sails.helpers.error.count('sportsReturn');

                            // Do a station ID
                            if (n >= 50 || n <= 10)
                            {
                                // Begin error check for legal ID
                                await sails.helpers.error.count('stationID');
                                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                                Status.errorCheck.prevID = moment();
                                if (typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                                    await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Liners"]], 'Bottom', 1);
                            } else {
                                if (typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                                    await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Liners"]], 'Bottom', 1);
                            }
                        }


                        // Do automation system error checking and handling
                        if (queue.length > 0 && queue[0].Duration === Status.errorCheck.prevDuration && queue[0].Elapsed === Status.errorCheck.prevElapsed && (Meta['A'].state.startsWith("automation_") || Meta['A'].state.endsWith("_break") || Meta['A'].state.endsWith("_disconnected") || Meta['A'].state === 'live_prerecord'))
                        {
                            await sails.helpers.error.count('frozen');
                        } else if ((Meta['A'].state === 'remote_on' || Meta['A'].state === 'sportsremote_on') && ((queue[0].TrackType !== 'InternetStream' && queue.length < 2) || queue[0].Elapsed === Status.errorCheck.prevElapsed))
                        {
                            await sails.helpers.error.count('frozenRemote');
                        } else {
                            Status.errorCheck.prevDuration = queue[0].Duration;
                            Status.errorCheck.prevElapsed = queue[0].Elapsed;
                            await sails.helpers.error.reset('frozen');
                            await sails.helpers.error.reset('frozenRemote');
                        }

                        // Manage PSAs and IDs intelligently using track queue length. This gets complicated, so comments explain the process.

                        // Do not run this process if we cannot get a duration for the currently playing track, or if we suspect the current queue duration to be inaccurate
                        if (Status.errorCheck.trueZero <= 0 && typeof queue[0] !== 'undefined' && typeof queue[0].Duration !== 'undefined' && typeof queue[0].Elapsed !== 'undefined')
                        {

                            // First, get a moment instance for 20 past the current hour, 40 past the current hour, and the top of the next hour
                            var psabreak20 = moment().minutes(20);
                            var psabreak40 = moment().minutes(40);
                            var idbreak = moment().minutes(0).add(1, 'hours');

                            // Also get a moment instance for the estimated time when the currently playing track will finish
                            var endtime = moment().add((queue[0].Duration - queue[0].Elapsed), 'seconds');



                            // Determine if we should queue a PSA break. Start off with no by default.
                            var doPSAbreak = false;

                            // Consider queuing if the current time is before :20 and, after adding the remaining time from the current track, it passes :20 after
                            if (moment().isBefore(moment(psabreak20)) && moment(endtime).isAfter(moment(psabreak20)))
                                doPSAbreak = true;

                            // Consider queuing if the current time is between :20 and :40, and, adding the remaining time from the current track passes :40
                            if (moment().isAfter(moment(psabreak20)) && moment().isBefore(moment(psabreak40)) && moment(endtime).isAfter(moment(psabreak40)))
                                doPSAbreak = true;

                            // If the currently playing track will not end after :20,
                            // but the following track will end further after :20 than the current track would finish before :20,
                            // queue the PSA break early.
                            if (moment().isBefore(moment(psabreak20)) && typeof queue[1] !== 'undefined' && typeof queue[1].Duration !== 'undefined')
                            {
                                var distancebefore = moment(psabreak20).diff(moment(endtime));
                                var endtime2 = moment(endtime).add(queue[1].Duration, 'seconds');
                                var distanceafter = endtime2.diff(psabreak20);
                                if (moment(endtime2).isAfter(moment(psabreak20)) && distanceafter > distancebefore)
                                    doPSAbreak = true;
                            }

                            // Do the same thing for :40 after
                            if (moment().isAfter(moment(psabreak20)) && moment().isBefore(moment(psabreak40)) && typeof queue[1] !== 'undefined' && typeof queue[1].Duration !== 'undefined')
                            {
                                var distancebefore = moment(psabreak40).diff(moment(endtime));
                                var endtime2 = moment(endtime).add(queue[1].Duration, 'seconds');
                                var distanceafter = endtime2.diff(psabreak40);
                                if (moment(endtime2).isAfter(moment(psabreak40)) && distanceafter > distancebefore)
                                    doPSAbreak = true;
                            }

                            // Do not queue if we are not in automation, playlist, or prerecord states
                            if (Meta['A'].state !== 'automation_on' && Meta['A'].state !== 'automation_playlist' && Meta['A'].state !== 'automation_genre' && Meta['A'].state !== 'live_prerecord')
                                doPSAbreak = false;

                            // Do not queue if we queued a break less than 10 minutes ago
                            if (Status.errorCheck.prevBreak !== null && moment(Status.errorCheck.prevBreak).isAfter(moment().subtract(10, 'minutes')))
                                doPSAbreak = false;

                            // Do not queue anything yet if the current track has 10 or more minutes left (resolves a discrepancy with the previous logic)
                            if ((queue[0].Duration - queue[0].Elapsed) >= (60 * 10))
                                doPSAbreak = false;

                            // Finally, if we are to queue a PSA break, queue it and make note we queued it so we don't queue another one too soon.
                            if (doPSAbreak)
                            {
                                Status.errorCheck.prevBreak = moment();
                                await Logs.create({logtype: 'system', loglevel: 'info', logsubtype: 'automation', event: 'Queued :20 / :40 PSA break'})
                                        .tolerate((err) => {
                                        });
                                await sails.helpers.requests.queue(3, true, true);

                                // Load in any duplicate non-music tracks that were removed prior, to ensure underwritings etc get proper play counts.
                                if (Songs.pending.length > 0)
                                {
                                    await sails.helpers.asyncForEach(Songs.pending, function (track, index) {
                                        return new Promise(async (resolve2, reject2) => {
                                            await sails.helpers.rest.cmd('LoadTrackToTop', track.ID);
                                            delete Songs.pending[index];
                                            return resolve2(false);
                                        });
                                    });
                                }

                                await sails.helpers.songs.queue(sails.config.custom.subcats.sweepers, 'Top', 1);
                                await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 2, true);
                            }

                            // Determine if we are to queue a station ID break

                            // Determine false by default
                            var doIDbreak = false;

                            // If, adding the remaining time of the current track to the current time, passes the time we are to queue an ID break, then consider queuing it
                            if (moment(endtime).isAfter(moment(idbreak)))
                                doIDbreak = true;

                            // If the currently playing track will not end after :00,
                            // but the following track will end further after :00 than the current track would finish before :00,
                            // queue the station ID early.
                            if (typeof queue[1] !== 'undefined' && typeof queue[1].Duration !== 'undefined')
                            {
                                var distancebefore = moment(idbreak).diff(moment(endtime));
                                var endtime2 = moment(endtime).add(queue[1].Duration, 'seconds');
                                var distanceafter = endtime2.diff(idbreak);
                                if (moment(endtime2).isAfter(moment(idbreak)) && distanceafter > distancebefore)
                                    doIDbreak = true;
                            }

                            // If the last time we queued a station ID break was less than 20 minutes ago, it's too soon!
                            if (Status.errorCheck.prevID !== null && moment(Status.errorCheck.prevID).isAfter(moment().subtract(20, 'minutes')))
                                doIDbreak = false;

                            // Do not queue anything yet if the current time is before :40 after (resolves a discrepancy with the previous logic)
                            if (moment().isBefore(moment(idbreak).subtract(20, 'minutes')))
                                doIDbreak = false;

                            // Do not queue if we are not in automation, playlist, or prerecord states
                            if (Meta['A'].state !== 'automation_on' && Meta['A'].state !== 'automation_playlist' && Meta['A'].state !== 'automation_genre' && Meta['A'].state !== 'live_prerecord')
                                doIDbreak = false;

                            // If we are to queue an ID, queue it
                            if (doIDbreak)
                            {
                                Status.errorCheck.prevID = moment();
                                Status.errorCheck.prevBreak = moment();
                                await sails.helpers.error.count('stationID');
                                await Logs.create({logtype: 'system', loglevel: 'info', logsubtype: 'automation', event: 'Queued :00 Station ID Break'})
                                        .tolerate((err) => {
                                        });
                                await sails.helpers.requests.queue(3, true, true);

                                // Load in any duplicate non-music tracks that were removed prior, to ensure underwritings etc get proper play counts.
                                if (Songs.pending.length > 0)
                                {
                                    await sails.helpers.asyncForEach(Songs.pending, function (track, index) {
                                        return new Promise(async (resolve2, reject2) => {
                                            await sails.helpers.rest.cmd('LoadTrackToTop', track.ID);
                                            delete Songs.pending[index];
                                            return resolve2(false);
                                        });
                                    });
                                }

                                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1);
                                await sails.helpers.songs.queue(sails.config.custom.subcats.promos, 'Top', 1);
                                await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 2, true);
                            }
                        }
                    } else {
                        // We have no queue... which should never happen because RadioDJ always returns a dummy track in position 0. This is an error.
                        if (Meta['A'].state.startsWith("automation_") || Meta['A'].state.endsWith("_break") || Meta['A'].state.endsWith("_disconnected") || Meta['A'].state === 'live_prerecord')
                        {
                            await sails.helpers.error.count('frozen');
                        } else if (Meta['A'].state === 'remote_on' || Meta['A'].state === 'sportsremote_on')
                        {
                            await sails.helpers.error.count('frozenRemote');
                        }
                    }

                    // Change applicable meta
                    await Meta.changeMeta(change);

                    // All done
                    return resolve();
                } catch (e) {
                    // Uncomment once we confirmed this CRON is fully operational
                    //  await sails.helpers.error.count('frozen');
                    sails.log.error(e);
                    Meta.changeMeta({time: moment().toISOString()});
                    return resolve(e);
                }
            });
        },
        start: true
    },

    // Every 5 minutes at second 00, update work orders. This is only done every 5 minutes because it puts a lot of load on OpenProject.
    workOrders: {
        schedule: '0 */5 * * * *',
        onTick: async function () {
            sails.log.debug(`CRON workOrders triggered.`);
            try {
                await Tasks.updateTasks();
            } catch (e) {
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },

    // Every minute on second 01, check for changes in directors on OpenProject.
    updateDirectors: {
        schedule: '1 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON updateDirectors triggered.`);
            try {
                await Directors.updateDirectors();
            } catch (e) {
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },

    // Every minute on second 02, update Calendar.
    updateCalendar: {
        schedule: '2 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON updateCalendar triggered.`);
            try {
                await Calendar.preLoadEvents();
            } catch (e) {
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },

    // Twice per minute, at 03 and 33, check the online status of the radio streams
    checkRadioStreams: {
        schedule: '3,33 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON checkRadioStreams triggered.`);
            try {
                needle('get', sails.config.custom.stream)
                        .then(async function (resp) {
                            if (resp.body.includes("Mount Point /public"))
                            {
                                Status.changeStatus([{name: 'stream-public', label: 'Radio Stream', data: 'Public internet radio stream is operational.', status: 5}]);
                            } else {
                                Status.changeStatus([{name: 'stream-public', label: 'Radio Stream', data: 'Public internet radio stream appears to be offline.', status: 2}]);
                            }
                            if (resp.body.includes("Mount Point /remote"))
                            {
                                Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Remote internet radio stream is operational.', status: 5}]);
                            } else {
                                if (Meta['A'].state.includes("remote"))
                                {
                                    Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Remote internet stream appears offline.', status: 2}]);
                                } else { // If we are not doing a remote broadcast, remote stream being offline is a non-issue
                                    Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Remote internet stream appears offline, but that is not an issue at this time as a remote broadcast is not active.', status: 4}]);
                                }
                            }
                        })
                        .catch(function (err) {
                            Status.changeStatus([{name: 'stream-public', label: 'Radio Stream', data: 'Error trying to connect to internet stream server.', status: 2}]);
                            if (Meta['A'].state.includes("remote"))
                            {
                                Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Error trying to connect to internet stream server.', status: 2}]);
                            } else { // If we are not doing a remote broadcast, remote stream being offline is a non-issue
                                Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Error trying to connect to internet stream server.', status: 4}]);
                            }
                        });
            } catch (e) {
                Status.changeStatus([{name: 'stream-public', label: 'Radio Stream', data: 'Error trying to connect to internet stream server.', status: 2}]);
                if (Meta['A'].state.includes("remote"))
                {
                    Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Error trying to connect to internet stream server.', status: 2}]);
                } else { // If we are not doing a remote broadcast, remote stream being offline is a non-issue
                    Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Error trying to connect to internet stream server.', status: 4}]);
                }
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },

    // Twice per minute at 04 and 34 seconds, check all RadioDJs for connectivity.
    checkRadioDJs: {
        schedule: '4,34 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON checkRadioDJs triggered.`);

            try {
                await sails.helpers.asyncForEach(sails.config.custom.radiodjs, function (radiodj) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            needle('get', `${radiodj.rest}/p?auth=${sails.config.custom.rest.auth}`)
                                    .then(async function (resp) {
                                        if (typeof resp.body !== 'undefined' && typeof resp.body.children !== 'undefined')
                                        {
                                            Status.changeStatus([{name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: 'This RadioDJ reports operational.', status: 5}]);
                                        } else {
                                            if (Meta['A'].radiodj === radiodj.rest)
                                            {
                                                Status.changeStatus([{name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: 'This RadioDJ is not reporting operational.', status: 2}]);
                                            } else {
                                                Status.changeStatus([{name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: 'This RadioDJ is not reporting operational.', status: 3}]);
                                            }
                                        }
                                        return resolve(false);
                                    })
                                    .catch(function (err) {
                                        if (Meta['A'].radiodj === radiodj.rest)
                                        {
                                            Status.changeStatus([{name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: 'This RadioDJ is not reporting operational.', status: 2}]);
                                        } else {
                                            Status.changeStatus([{name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: 'This RadioDJ is not reporting operational.', status: 3}]);
                                        }
                                        return resolve(false);
                                    });
                        } catch (e) {
                            if (Meta['A'].radiodj === radiodj.rest)
                            {
                                Status.changeStatus([{name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: 'This RadioDJ is not reporting operational.', status: 2}]);
                            } else {
                                Status.changeStatus([{name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: 'This RadioDJ is not reporting operational.', status: 3}]);
                            }
                            return resolve(false);
                        }
                    });
                });
            } catch (e) {
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },

    // Twice per minute at 05 and 35 seconds, check for connectivity to the website.
    checkWebsite: {
        schedule: '5,35 * * * * *',
        onTick: function () {
            sails.log.debug(`CRON checkWebsite triggered.`);
            try {
                needle('get', sails.config.custom.website)
                        .then(async function (resp) {
                            if (typeof resp.body !== 'undefined')
                            {
                                Status.changeStatus([{name: `website`, label: `Website`, data: 'WWSU website appears online', status: 5}]);
                            } else {
                                Status.changeStatus([{name: `website`, label: `Website`, data: 'WWSU website appears to have an issue; expected body data was not returned.', status: 2}]);
                            }
                        })
                        .catch(function (err) {
                            Status.changeStatus([{name: `website`, label: `Website`, data: 'There was an error connecting to the WWSU website.', status: 2}]);
                        });
            } catch (e) {
                Status.changeStatus([{name: `website`, label: `Website`, data: 'There was an error connecting to the WWSU website.', status: 2}]);
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },

    // Every minute on second 06, get NWS alerts for configured counties.
    EAS: {
        schedule: '6 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON EAS triggered.`);

            try {
                // Initial procedure
                await sails.helpers.eas.preParse();

                // Iterate through every configured county and get their weather alerts
                var complete = 0;
                await sails.helpers.asyncForEach(sails.config.custom.EAS.NWSX, function (county, index) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            sails.log.verbose(`Trying ${county.name}-${county.code}`);
                            needle('get', `https://alerts.weather.gov/cap/wwaatmget.php?x=${county.code}&y=0&t=${moment().valueOf()}`, {}, {headers: {'Content-Type': 'application/json'}})
                                    .then(async function (resp) {
                                        await sails.helpers.eas.parseCaps(county.name, resp.body);
                                        complete++;
                                        return resolve(false);
                                    })
                                    .catch(function (err) {
                                        // Do not reject on error; just go to the next county
                                        sails.log.error(err);
                                        return resolve(false);
                                    });
                        } catch (e) {
                            // Do not reject on error; just go to the next county
                            sails.log.error(e);
                            return resolve(false);
                        }
                    });
                });

                // If all counties succeeded, mark EAS-internal as operational
                if (complete >= sails.config.custom.EAS.NWSX.length)
                {
                    Status.changeStatus([{name: 'EAS-internal', label: 'Internal EAS', data: 'All EAS NWS CAPS are operational.', status: 5}]);
                } else {
                    Status.changeStatus([{name: 'EAS-internal', label: 'Internal EAS', data: `${complete} out of ${sails.config.custom.EAS.NWSX.length} EAS NWS CAPS are operational.`, status: 3}]);
                }

                // Finish up
                await sails.helpers.eas.postParse();
            } catch (e) {
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },
    // Every minute at second 07, check to see if our databases are active and functional
    checkDB: {
        schedule: '7 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON checkDB called`);
            try {
                // Make sure all models have a record at ID 1, even if it's a dummy.
                var checksMemory = [Calendar, Directors, Recipients, Status, Tasks];
                var checksRadioDJ = [Category, Events, Genre, History, Playlists, Playlists_list, Requests, Settings, Subcategory];
                var checksNodebase = [Discipline, Eas, Hosts, Logs, Messages, Meta, Nodeusers, Timesheet];

                // Memory checks
                var checkStatus = {data: ``, status: 5};
                sails.log.debug(`CHECK: DB Memory`);
                await sails.helpers.asyncForEach(checksMemory, function (check, index) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            var record = await check.findOne({ID: 1})
                                    .tolerate((err) => {
                                        checkStatus.status = 1;
                                        checkStatus.data += `Model failure (query error): ${index}. `;
                                    });
                            if (typeof record.ID === 'undefined')
                            {
                                if (checkStatus.status > 3)
                                    checkStatus.status = 3;
                                checkStatus.data += `Model failure (record ID 1 not returned): ${index}. `;
                            }
                            return resolve(false);
                        } catch (e) {
                            checkStatus.status = 1;
                            checkStatus.data += `Model failure (internal error): ${index}. `;
                            return resolve(false);
                        }
                    });
                });
                if (checkStatus.status === 5)
                    checkStatus.data = `This datastore is fully operational.`;
                Status.changeStatus([{name: 'db-memory', label: 'DB Memory', data: checkStatus.data, status: checkStatus.status}]);

                // RadioDJ checks
                sails.log.debug(`CHECK: DB RadioDJ`);
                var checkStatus = {data: ``, status: 5};
                await sails.helpers.asyncForEach(checksRadioDJ, function (check, index) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            var record = await check.findOne({ID: 1})
                                    .tolerate((err) => {
                                        checkStatus.status = 1;
                                        checkStatus.data += `Model failure (query error): ${index}. `;
                                    });
                            if (typeof record.ID === 'undefined')
                            {
                                if (checkStatus.status > 3)
                                    checkStatus.status = 3;
                                checkStatus.data += `Model failure (record ID 1 not returned): ${index}. `;
                            }
                            return resolve(false);
                        } catch (e) {
                            checkStatus.status = 1;
                            checkStatus.data += `Model failure (internal error): ${index}. `;
                            return resolve(false);
                        }
                    });
                });
                if (checkStatus.status === 5)
                    checkStatus.data = `This datastore is fully operational.`;
                Status.changeStatus([{name: 'db-radiodj', label: 'DB RadioDJ', data: checkStatus.data, status: checkStatus.status}]);

                // Nodebase checks
                sails.log.debug(`CHECK: DB Nodebase`);
                var checkStatus = {data: ``, status: 5};
                await sails.helpers.asyncForEach(checksNodebase, function (check, index) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            var record = await check.findOne({ID: 1})
                                    .tolerate((err) => {
                                        checkStatus.status = 1;
                                        checkStatus.data += `Model failure (query error): ${index}. `;
                                    });
                            if (typeof record.ID === 'undefined')
                            {
                                if (checkStatus.status > 3)
                                    checkStatus.status = 3;
                                checkStatus.data += `Model failure (record ID 1 not returned): ${index}. `;
                            }
                            return resolve(false);
                        } catch (e) {
                            checkStatus.status = 1;
                            checkStatus.data += `Model failure (internal error): ${index}. `;
                            return resolve(false);
                        }
                    });
                });
                if (checkStatus.status === 5)
                    checkStatus.data = `This datastore is fully operational.`;
                Status.changeStatus([{name: 'db-nodebase', label: 'DB Nodebase', data: checkStatus.data, status: checkStatus.status}]);
            } catch (e) {
                Status.changeStatus([{name: 'db-memory', label: 'DB Memory', data: 'The CRON checkDB failed.', status: 1}]);
                Status.changeStatus([{name: 'db-radiodj', label: 'DB RadioDJ', data: 'The CRON checkDB failed.', status: 1}]);
                Status.changeStatus([{name: 'db-nodebase', label: 'DB Nodebase', data: 'The CRON checkDB failed.', status: 1}]);
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },

    // Every 5 minutes at second 08, reload the subcategory IDs in configuration, in case changes were made in RadioDJ
    reloadSubcats: {
        schedule: '8 */5 * * * *',
        onTick: async function () {
            sails.log.debug(`CRON reloadSubcats called.`);

            try {
                // Load subcats IDs for each consigured categories
                sails.config.custom.subcats = {};

                for (var config in sails.config.custom.categories)
                {
                    if (sails.config.custom.categories.hasOwnProperty(config))
                    {
                        for (var cat in sails.config.custom.categories[config])
                        {
                            if (sails.config.custom.categories[config].hasOwnProperty(cat))
                            {
                                sails.config.custom.subcats[config] = [];
                                var thecategory = await Category.findOne({name: cat})
                                        .tolerate((err) => {
                                        });
                                if (!thecategory || thecategory === null)
                                    continue;

                                if (sails.config.custom.categories[config][cat].length <= 0)
                                {
                                    var thesubcategories = await Subcategory.find({parentid: thecategory.ID})
                                            .tolerate((err) => {
                                            });
                                } else {
                                    var thesubcategories = await Subcategory.find({parentid: thecategory.ID, name: sails.config.custom.categories[config][cat]})
                                            .tolerate((err) => {
                                            });
                                }
                                if (!thesubcategories || thesubcategories.length <= 0)
                                    continue;

                                thesubcategories.forEach(function (thesubcategory) {
                                    sails.config.custom.subcats[config].push(thesubcategory.ID);
                                });

                                sails.log.silly(`Subcategories for ${config}: ${sails.config.custom.subcats[config]}`);
                            }
                        }
                    }
                }

                // Load subcats IDs for each consigured sport
                sails.config.custom.sportscats = {};
                for (var config in sails.config.custom.sports)
                {
                    if (sails.config.custom.sports.hasOwnProperty(config))
                    {
                        sails.config.custom.sportscats[config] = {"Sports Openers": null, "Sports Liners": null, "Sports Closers": null};
                    }
                }

                var categories = await Category.find({name: ["Sports Openers", "Sports Liners", "Sports Closers"]})
                        .tolerate((err) => {
                        });

                var catIDs = [];
                var cats = {};

                if (categories.length > 0)
                {
                    categories.forEach(function (category) {
                        catIDs.push(category.ID);
                        cats[category.ID] = category.name;
                    });
                }

                var subcategories = await Subcategory.find({parentid: catIDs})
                        .tolerate((err) => {
                        });

                if (subcategories.length > 0)
                {
                    subcategories.forEach(function (subcategory) {
                        if (typeof sails.config.custom.sportscats[subcategory.name] !== 'undefined')
                            sails.config.custom.sportscats[subcategory.name][cats[subcategory.parentID]] = subcategory.ID;
                    });
                }
            } catch (e) {
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },

    // Every minute at second 9, count the number of tracks disabled because they are invalid / corrupt / not accessible, and update Music Library status.
    disabledTracks: {
        schedule: '9 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON disabledTracks called.`);

            try {
                // Count the number of -1 enabled tracks

                var found = await Songs.count({enabled: -1})
                        .tolerate((err) => {
                        });

                if (found && found >= sails.config.custom.status.musicLibrary.verify.error)
                {
                    Status.changeStatus([{name: `music-library`, status: 2, label: `Music Library`, data: `There were ${found} detected bad tracks in the RadioDJ music library.`}]);
                } else if (found && found >= sails.config.custom.status.musicLibrary.verify.warn)
                {
                    Status.changeStatus([{name: `music-library`, status: 3, label: `Music Library`, data: `There were ${found} detected bad tracks in the RadioDJ music library.`}]);
                } else if (found)
                {
                    Status.changeStatus([{name: `music-library`, status: 5, label: `Music Library`, data: `There were ${found} detected bad tracks in the RadioDJ music library.`}]);
                }
            } catch (e) {
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },

    // Every minute at second 10, check server memory and CPU use
    serverCheck: {
        schedule: '10 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON serverCheck called.`);
            try {
                var os = require("os");

                // Get CPU load and free memory
                var load = os.loadavg();
                var mem = os.freemem();

                if (load[0] >= sails.config.custom.status.server.load1.critical || load[1] >= sails.config.custom.status.server.load5.critical || load[2] >= sails.config.custom.status.server.load15.critical || mem <= sails.config.custom.status.server.memory.critical)
                {
                    Status.changeStatus([{name: `server`, label: `Server`, status: 1, data: `Server CPU: 1-min ${load[0]}, 5-min: ${load[1]}, 15-min: ${load[2]}. Free memory: ${mem}`}]);
                } else if (load[0] >= sails.config.custom.status.server.load1.error || load[1] >= sails.config.custom.status.server.load5.error || load[2] >= sails.config.custom.status.server.load15.error || mem <= sails.config.custom.status.server.memory.error)
                {
                    Status.changeStatus([{name: `server`, label: `Server`, status: 2, data: `Server CPU: 1-min ${load[0]}, 5-min: ${load[1]}, 15-min: ${load[2]}. Free memory: ${mem}`}]);
                } else if (load[0] >= sails.config.custom.status.server.load1.warn || load[1] >= sails.config.custom.status.server.load5.warn || load[2] >= sails.config.custom.status.server.load15.warn || mem <= sails.config.custom.status.server.memory.warn)
                {
                    Status.changeStatus([{name: `server`, label: `Server`, status: 3, data: `Server CPU: 1-min ${load[0]}, 5-min: ${load[1]}, 15-min: ${load[2]}. Free memory: ${mem}`}]);
                } else {
                    Status.changeStatus([{name: `server`, label: `Server`, status: 5, data: `Server CPU: 1-min ${load[0]}, 5-min: ${load[1]}, 15-min: ${load[2]}. Free memory: ${mem}`}]);
                }
            } catch (e) {
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },

    // Every day at 11:59:50pm, clock out any directors still clocked in
    clockOutDirectors: {
        schedule: '50 59 23 * * *',
        onTick: async function () {
            sails.log.debug(`CRON clockOutDirectors called`);
            try {
                await Timesheet.update({time_out: null}, {time_out: moment().toISOString(), approved: false})
                        .tolerate((err) => {
                        });
                // Force reload all directors based on timesheets
                await Directors.updateDirectors(true);
            } catch (e) {
                sails.log.error(e);
                return null;
            }
        },
        start: true
    }
};


