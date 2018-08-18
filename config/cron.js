/* global Directors, sails, Status, Calendar, Meta, Tasks, Playlists, Playlists_list, moment, Timesheet, needle, Statelogs, Logs, Recipients, Category, History, Requests, Events, Subcategory, Genre, Settings, Hosts, Nodeusers, Discipline, Messages, Eas, Songs, Announcements, _, Listeners */

module.exports.cron = {

    // Run checks every second
    checks: {
        schedule: '* * * * * *',
        onTick: function () {
            return new Promise(async (resolve, reject) => {
                sails.log.debug(`CRON checks triggered.`);

                var change = {queueLength: 0, percent: 0, time: moment().toISOString(true)}; // Instead of doing a bunch of changeMetas, put all non-immediate changes into this object and changeMeta at the end of this operation.
                //
                // Skip all checks and use default meta template if sails.config.custom.lofi = true
                if (sails.config.custom.lofi)
                {
                    try {
                        change = Meta.template;
                        change.time = moment().toISOString(true);
                        await Meta.changeMeta(change);
                    } catch (e) {
                        Meta.changeMeta({time: moment().toISOString(true)});
                        sails.log.error(e);
                        return resolve(e);
                    }
                    return resolve();
                }

                // If we do not know current state, we may need to populate the info from the database.
                if (Meta['A'].state === '' || Meta['A'].state === 'unknown')
                {
                    try {
                        sails.log.verbose(`Unknown meta. Retrieving from database.`);
                        var meta = await Meta.find().limit(1)
                                .tolerate((err) => {
                                    sails.log.error(err);
                                    Meta.changeMeta({time: moment().toISOString(true)});
                                    return resolve(err);
                                });
                        meta = meta[0];
                        meta.time = moment().toISOString(true);
                        sails.log.silly(meta);
                        await Meta.changeMeta(meta);
                        Playlists.active.name = meta.playlist;
                        if (meta.playlist !== null && meta.playlist !== '')
                        {
                            var theplaylist = await Playlists.findOne({name: meta.playlist});
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
                        } else {
                            Playlists.active.ID = 0;
                        }
                        Playlists.active.position = meta.playlist_position;
                        Playlists.played = moment(meta.playlist_played);
                    } catch (e) {
                        Meta.changeMeta({time: moment().toISOString(true)});
                        return resolve(e);
                    }
                }

                // Try to get the current RadioDJ queue. Add an error count if we fail.
                try {
                    var queue = await sails.helpers.rest.getQueue();

                    // Remove duplicate tracks (ONLY remove one since cron goes every second; so one is removed each second). 
                    // Also, calculate length of the queue, and determine if something is playing in RadioDJ right now
                    try {
                        sails.log.silly(`queueCheck executed.`);
                        var theTracks = [];
                        await sails.helpers.asyncForEach(queue, function (track, index) {
                            return new Promise(async (resolve2, reject2) => {
                                var title = `${track.Artist} - ${track.Title}`;
                                
                                // Determine if something is currently playing via whether or not track 0 has ID of 0.
                                if (index === 0)
                                {
                                    if (parseInt(track.ID) === 0)
                                    {
                                        change.playing = false;
                                    } else {
                                        change.playing = true;
                                    }
                                } 
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
                        Meta.changeMeta({time: moment().toISOString(true)});
                        return null;
                    }
                    sails.log.silly(`Proceeding after queueCheck.`);



                    // If the currently playing track was a request, mark as played
                    if (_.includes(Requests.pending, parseInt(queue[0].ID)))
                    {
                        await Requests.update({songID: queue[0].ID}, {played: 1})
                                .tolerate((err) => {
                                });
                        delete Requests.pending[Requests.pending.indexOf(parseInt(queue[0].ID))];
                    }

                    // If any of the tracks in queue are in the Requests.pendingQueue, move to Requests.pending


                    await sails.helpers.error.reset('queueFail');

                    // Error checks
                    await sails.helpers.error.count('stationID', true);
                } catch (e) {
                    await sails.helpers.error.count('queueFail');
                    sails.log.error(e);
                    Meta.changeMeta({time: moment().toISOString(true)});
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
                    } else if (Status.errorCheck.trueZero > 0)
                    {
                        Status.errorCheck.trueZero -= 1;
                        if (Status.errorCheck.trueZero < 1)
                        {
                            Status.errorCheck.trueZero = 0;
                        } else {
                            //Statemeta.final.queueLength = (Statesystem.errors.prevqueuelength - 1);
                        }
                        if (change.queueLength < 0)
                            change.queueLength = 0;
                    } else { // No error wait time [remaining]? Use actual detected queue time.
                    }
                } else {
                    Status.errorCheck.trueZero = 5; // Wait up to 5 seconds before considering the queue accurate
                    // Instead of using the actually recorded queueLength, use the previously detected length minus 1 second.
                    //Statemeta.final.queueLength = (Statesystem.errors.prevqueuelength - 1);
                    if (change.queueLength < 0)
                        change.queueLength = 0;
                }

                // For remotes, when playing a liner etc, we need to know when to re-queue the remote stream
                if ((Meta['A'].state === 'remote_on' || Meta['A'].state === 'sportsremote_on') && Status.errorCheck.prevQueueLength > 0 && change.queueLength <= 0 && Status.errorCheck.trueZero <= 0)
                {
                    await sails.helpers.rest.cmd('EnableAssisted', 1);
                    await sails.helpers.songs.queue(sails.config.custom.subcats.remote, 'Bottom', 1);
                    await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                    await sails.helpers.rest.cmd('EnableAssisted', 0);
                }
                Status.errorCheck.prevQueueLength = change.queueLength;

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
                if (Meta['A'].trackstamp === null || (moment().isAfter(moment(Meta['A'].trackstamp).add(sails.config.custom.meta.clearTime, 'minutes')) && !Meta['A'].state.startsWith("automation_") && !Meta['A'].state === 'live_prerecord' && Meta['A'].track !== ''))
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
                                    if (name === parseInt(autoTrack.ID)) {
                                        // Waiting for the playlist to begin, and it has begun? Switch states.
                                        if (Meta['A'].state === 'automation_prerecord' && index === 0 && !Playlists.queuing && !Meta.changingState)
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
                        if (thePosition === -1 && Status.errorCheck.trueZero <= 0 && !Playlists.queuing && !Meta.changingState)
                        {
                            await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: '', event: 'Playlist has finished and we went to automation.'})
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
                        if (Meta['A'].state.startsWith("automation_") && parseInt(queue[0].ID) !== 0 && Meta['A'].state !== 'automation_playlist' && Meta['A'].state !== 'automation_genre')
                        {
                            change.webchat = true;
                            var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                            if (Meta['A'].track !== newmeta)
                                await Logs.create({logtype: 'operation', loglevel: 'secondary', logsubtype: 'automation', event: 'Automation played a track', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                        .tolerate((err) => {
                                        });
                            Meta.changeMeta({track: newmeta});
                            change.track = newmeta;
                            // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
                            if (sails.config.custom.subcats.noMeta.indexOf(parseInt(queue[0].IDSubcat)) > -1 || queue[0].Artist.includes("Unknown Artist"))
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
                        } else if (parseInt(queue[0].ID) !== 0 && Meta['A'].state === 'automation_playlist')
                        {
                            change.webchat = true;
                            var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                            if (Meta['A'].track !== newmeta)
                                await Logs.create({logtype: 'operation', loglevel: 'secondary', logsubtype: `playlist - ${Meta['A'].playlist}`, event: 'Automation playlist played a track', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                        .tolerate((err) => {
                                        });

                            Meta.changeMeta({track: newmeta});
                            change.track = newmeta;
                            // Do not display track meta for tracks in config.custom.categories.noMeta or tracks with an unknown artist
                            if (sails.config.custom.subcats.noMeta.indexOf(parseInt(queue[0].IDSubcat)) > -1 || queue[0].Artist.includes("Unknown Artist"))
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
                        } else if (parseInt(queue[0].ID) !== 0 && Meta['A'].state === 'automation_genre')
                        {
                            change.webchat = true;
                            var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                            if (Meta['A'].track !== newmeta)
                                await Logs.create({logtype: 'operation', loglevel: 'secondary', logsubtype: 'automation', event: 'Genre automation played a track', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                        .tolerate((err) => {
                                        });
                            Meta.changeMeta({track: newmeta});
                            change.track = newmeta;
                            // Do not display track meta if the track is in config.custom.categories.noMeta or the artist is unknown
                            if (sails.config.custom.subcats.noMeta.indexOf(parseInt(queue[0].IDSubcat)) > -1 || queue[0].Artist.includes("Unknown Artist"))
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
                            if (parseInt(queue[0].ID) !== 0)
                            {
                                var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                                if (Meta['A'].track !== newmeta)
                                    await Logs.create({logtype: 'operation', loglevel: 'secondary', logsubtype: Meta['A'].dj, event: 'DJ played a track in automation', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                            .tolerate((err) => {
                                            });
                                Meta.changeMeta({track: newmeta});
                                change.track = newmeta;
                                // Do not display meta for tracks that are in config.custom.categories.noMeta or have an unknown artist
                                if (sails.config.custom.subcats.noMeta.indexOf(parseInt(queue[0].IDSubcat)) > -1 || queue[0].Artist.includes("Unknown Artist"))
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
                        } else if (parseInt(queue[0].ID) !== 0 && Meta['A'].state === 'live_prerecord')
                        {
                            change.webchat = true;
                            var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                            change.dj = Meta['A'].playlist;
                            if (Meta['A'].track !== newmeta)
                                await Logs.create({logtype: 'operation', loglevel: 'secondary', logsubtype: Meta['A'].playlist, event: 'Prerecorded show playlist played a track', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                        .tolerate((err) => {
                                        });
                            Meta.changeMeta({track: newmeta});
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
                            if (parseInt(queue[0].ID) !== 0 && queue[0].TrackType !== 'InternetStream')
                            {
                                var newmeta = queue[0].Artist + ' - ' + queue[0].Title;
                                if (Meta['A'].track !== newmeta)
                                    await Logs.create({logtype: 'operation', loglevel: 'secondary', logsubtype: Meta['A'].dj, event: 'Remote producer played a track in automation', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                            .tolerate((err) => {
                                            });
                                change.track = newmeta;
                                // If the currently playing track is in config.custom.categories.noMeta, or artist is unknown, or if we are in disconnected remote mode, show alternative metadata
                                if (sails.config.custom.subcats.noMeta.indexOf(parseInt(queue[0].IDSubcat)) > -1 || queue[0].Artist.includes("Unknown Artist") || Meta['A'].state.includes("disconnected"))
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
                                    await Logs.create({logtype: 'operation', loglevel: 'secondary', logsubtype: Meta['A'].dj, event: 'Producer played a track in automation', trackArtist: queue[0].Artist, trackTitle: queue[0].Title})
                                            .tolerate((err) => {
                                            });
                                Meta.changeMeta({track: newmeta});
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
                        if (typeof change.line1 !== 'undefined' && change.line1 !== '')
                            change.line1 = await sails.helpers.filterProfane(change.line1);
                        if (typeof change.line2 !== 'undefined' && change.line2 !== '')
                            change.line2 = await sails.helpers.filterProfane(change.line2);
                        if (typeof change.stream !== 'undefined' && change.stream !== '')
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
                            await Meta.changeMeta({state: 'live_on', showstamp: moment().toISOString(true)});
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                        }
                        if (Meta['A'].state === 'automation_sports' && change.queueLength <= 0 && Status.errorCheck.trueZero <= 0)
                        {
                            change.line2 = '';
                            change.track = '';
                            await Meta.changeMeta({state: 'sports_on', showstamp: moment().toISOString(true)});
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                        }
                        // If we are preparing for remote, so some stuff if we are playing the stream track
                        if (Meta['A'].state === 'automation_remote' && change.queueLength <= 0 && Status.errorCheck.trueZero <= 0)
                        {
                            change.line2 = '';
                            change.track = '';
                            await Meta.changeMeta({state: 'remote_on', showstamp: moment().toISOString(true)});
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                            await sails.helpers.songs.queue(sails.config.custom.subcats.remote, 'Bottom', 1);
                            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 0);
                        }
                        if (Meta['A'].state === 'automation_sportsremote' && change.queueLength <= 0 && Status.errorCheck.trueZero <= 0)
                        {
                            change.line2 = '';
                            change.track = '';
                            await Meta.changeMeta({state: 'sportsremote_on', showstamp: moment().toISOString(true)});
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
                            if (Meta['A'].state === 'automation_break')
                                await sails.helpers.error.count('automationBreak');
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

                        // Check if a break is needed
                        var d = new Date();
                        var n = d.getMinutes();
                        if (!Meta['A'].state.includes("automation_") && !Meta['A'].state.includes("_break") && !Meta['A'].state.includes("_returning") && Meta['A'].state !== 'live_prerecord' && Meta['A'].state !== 'unknown' && n < 10 && (Status.errorCheck.prevID === null || moment(Status.errorCheck.prevID).isBefore(moment().subtract(20, 'minutes'))))
                        {
                            change.breakneeded = true;
                        } else {
                            if (Meta['A'].breakneeded && n >= 10)
                            {
                                await Logs.create({logtype: 'operation', loglevel: 'warning', logsubtype: Meta['A'].dj, event: `${Meta['A'].dj} does not seem to have taken the required top of the hour ID break despite being asked to by the system.`})
                                        .tolerate((err) => {
                                            sails.log.error(err);
                                        });
                            }
                            change.breakneeded = false;
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

                            // Iterate through each configured break to see if it's time to do it
                            for (var key in sails.config.custom.breaks)
                            {
                                if (sails.config.custom.breaks.hasOwnProperty(key))
                                {
                                    // Helps determine if we are due for the break
                                    var breakTime = moment().minutes(key);
                                    var breakTime2 = moment().minutes(key).add(1, 'hours');

                                    // Determine when the current track in RadioDJ will finish.
                                    var endTime = moment().add((queue[0].Duration - queue[0].Elapsed), 'seconds');

                                    var doBreak = false;

                                    // If the current time is before scheduled break, but the currently playing track will finish after scheduled break, consider queuing the break.
                                    if ((moment().isBefore(moment(breakTime)) && moment(endTime).isAfter(moment(breakTime))) || (moment().isBefore(moment(breakTime2)) && moment(endTime).isAfter(moment(breakTime2))))
                                        doBreak = true;

                                    // If the currently playing track will not end after the scheduled break,
                                    // but the following track will end further after the scheduled break than the current track would,
                                    // queue the break early.
                                    if (typeof queue[1] !== 'undefined' && typeof queue[1].Duration !== 'undefined')
                                    {
                                        if (moment().isBefore(moment(breakTime)))
                                        {
                                            var distancebefore = moment(breakTime).diff(moment(endTime));
                                            var endtime2 = moment(endTime).add(queue[1].Duration, 'seconds');
                                            var distanceafter = endtime2.diff(breakTime);
                                            if (moment(endtime2).isAfter(moment(breakTime)) && distanceafter > distancebefore)
                                                doBreak = true;
                                        } else {
                                            var distancebefore = moment(breakTime2).diff(moment(endTime));
                                            var endtime2 = moment(endTime).add(queue[1].Duration, 'seconds');
                                            var distanceafter = endtime2.diff(breakTime2);
                                            if (moment(endtime2).isAfter(moment(breakTime2)) && distanceafter > distancebefore)
                                                doBreak = true;
                                        }
                                    }

                                    // Do not queue if we are not in automation, playlist, genre, or prerecord states
                                    if (Meta['A'].state !== 'automation_on' && Meta['A'].state !== 'automation_playlist' && Meta['A'].state !== 'automation_genre' && Meta['A'].state !== 'live_prerecord')
                                        doBreak = false;

                                    // Do not queue if we queued a break less than the configured failsafe time, and this isn't the 0 break
                                    if (key !== 0 && Status.errorCheck.prevBreak !== null && moment(Status.errorCheck.prevBreak).isAfter(moment().subtract(sails.config.custom.breakCheck, 'minutes')))
                                        doBreak = false;

                                    // The 0 break has its own hard coded failsafe of 10 minutes, separate from other breaks, since it's a FCC required break
                                    if (key === 0 && Status.errorCheck.prevID !== null && moment(Status.errorCheck.prevID).isAfter(moment().subtract(10, 'minutes')))
                                        doBreak = false;

                                    // Do not queue anything yet if the current track has breakCheck minutes or more left (resolves a discrepancy with the previous logic)
                                    if (key !== 0 && (queue[0].Duration - queue[0].Elapsed) >= (60 * sails.config.custom.breakCheck))
                                        doBreak = false;

                                    if (key === 0 && (queue[0].Duration - queue[0].Elapsed) >= (60 * 10))
                                        doBreak = false;

                                    // Do the break if we are supposed to
                                    if (doBreak)
                                    {
                                        Status.errorCheck.prevBreak = moment();
                                        // enforce station ID for top of the hour breaks
                                        if (key === 0)
                                        {
                                            Status.errorCheck.prevID = moment();
                                            await sails.helpers.error.count('stationID');
                                        }
                                        // Get the configured break tasks
                                        var breakOpts = sails.config.custom.breaks[key];
                                        // Reverse the order of execution so queued things are in the same order as configured.
                                        breakOpts.reverse();
                                        // Go through each task
                                        if (breakOpts.length > 0)
                                        {
                                            await sails.helpers.asyncForEach(breakOpts, function (task, index) {
                                                return new Promise(async (resolve2, reject2) => {
                                                    try {
                                                        switch (task.task)
                                                        {
                                                            // Log an entry
                                                            case "log":
                                                                await Logs.create({logtype: 'system', loglevel: 'info', logsubtype: 'automation', event: task.event})
                                                                        .tolerate((err) => {
                                                                        });
                                                                break;
                                                                // Add requested tracks
                                                            case "queueRequests":
                                                                await sails.helpers.requests.queue(task.quantity || 1, false, true);
                                                                break;
                                                                // Queue tracks from a configured categories.category
                                                            case "queue":
                                                                await sails.helpers.songs.queue(sails.config.custom.subcats[task.category], 'Top', task.quantity || 1);
                                                                break;
                                                                // Re-queue any underwritings etc that were removed due to duplicate track checking
                                                            case "queueDuplicates":
                                                                await sails.helpers.songs.queuePending();
                                                                break;
                                                        }
                                                        return resolve2(false);
                                                    } catch (e) {
                                                        sails.log.error(e);
                                                        return resolve2(false);
                                                    }
                                                });
                                            });
                                        }
                                    }

                                }
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

    // Every 5 minutes on second 01, check for changes in directors on OpenProject.
    updateDirectors: {
        schedule: '1 */5 * * * *',
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

    // Every 5 minutes on second 02, update Calendar.
    updateCalendar: {
        schedule: '2 */5 * * * *',
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

    // Twice per minute, at 03 and 33, check the online status of the radio streams, and log listener count
    checkRadioStreams: {
        schedule: '3,33 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON checkRadioStreams triggered.`);
            try {
                // Get the JSON status from Icecast
                needle('get', sails.config.custom.stream + `/status-json.xsl`, {}, {headers: {'Content-Type': 'application/json'}})
                        .then(async function (resp) {
                            var publicStream = false;
                            var remoteStream = false;
                            if (typeof resp.body.icestats.source !== 'undefined')
                            {
                                // Parse source data
                                var sources = [];
                                if (!_.isArray(resp.body.icestats.source))
                                {
                                    sources.push(resp.body.icestats.source);
                                } else {
                                    sources = resp.body.icestats.source;
                                }
                                // Go through each source
                                await sails.helpers.asyncForEach(sources, function (source, index) {
                                    return new Promise(async (resolve2, reject2) => {
                                        try {
                                            if (typeof source.listenurl !== 'undefined')
                                            {
                                                // Source is mountpoint /public?
                                                if (source.listenurl.endsWith("/public"))
                                                {
                                                    // Mark stream as good
                                                    Status.changeStatus([{name: 'stream-public', label: 'Radio Stream', data: 'Public internet radio stream is operational.', status: 5}]);
                                                    publicStream = true;

                                                    // Log listeners
                                                    if (typeof source.listeners !== 'undefined')
                                                    {
                                                        var dj = '';

                                                        // Do not tie DJ with listener count unless DJ is actually on the air
                                                        if (!Meta['A'].state.startsWith("automation_"))
                                                        {
                                                            dj = Meta['A'].dj;
                                                            if (dj.includes(" - "))
                                                            {
                                                                dj = dj.split(" - ")[0];
                                                            }
                                                        }
                                                        if (dj !== Listeners.memory.dj || source.listeners !== Listeners.memory.listeners)
                                                        {
                                                            await Listeners.create({dj: dj, listeners: source.listeners})
                                                                    .tolerate((err) => {
                                                                    });
                                                        }
                                                        Listeners.memory = {dj: dj, listeners: source.listeners};
                                                    }
                                                }

                                                // Source is mountpoint /remote?
                                                if (source.listenurl.endsWith("/remote"))
                                                {
                                                    Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Remote internet radio stream is operational.', status: 5}]);
                                                    remoteStream = true;
                                                }
                                            }
                                            return resolve2(false);
                                        } catch (e) {
                                            sails.log.error(e);
                                            return resolve2(false);
                                        }
                                    });
                                });
                            }
                            if (!publicStream)
                                Status.changeStatus([{name: 'stream-public', label: 'Radio Stream', data: 'Public internet radio stream appears to be offline.', status: 2}]);
                            if (!remoteStream)
                            {
                                if (Meta['A'].state.includes("remote_"))
                                {
                                    // TODO: send system into disconnected mode (if not already) if remote stream is disconnected
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
                            sails.log.error(err);
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
                            needle('get', `${radiodj.rest}/p?auth=${sails.config.custom.rest.auth}`, {}, {headers: {'Content-Type': 'application/json'}})
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
                needle('get', sails.config.custom.website, {}, {headers: {'Content-Type': 'application/json'}})
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
            // TODO: More accurate way to test database.
            sails.log.debug(`CRON checkDB called`);
            try {
                // Make sure all models have a record at ID 1, even if it's a dummy.
                // TODO: Find a way to auto-populate these arrays.
                var checksMemory = [Calendar, Directors, Recipients, Status, Tasks];
                var checksRadioDJ = [Category, Events, Genre, History, Playlists, Playlists_list, Requests, Settings, Subcategory];
                var checksNodebase = [Announcements, Discipline, Eas, Hosts, Logs, Messages, Meta, Nodeusers, Timesheet];

                // Memory checks
                var checkStatus = {data: ``, status: 5};
                sails.log.debug(`CHECK: DB Memory`);
                await sails.helpers.asyncForEach(checksMemory, function (check, index) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            var record = await check.find().limit(1)
                                    .tolerate((err) => {
                                        checkStatus.status = 1;
                                        checkStatus.data += `Model failure (query error): ${index}. `;
                                    });
                            if (typeof record[0] === 'undefined' || typeof record[0].ID === 'undefined')
                            {
                                if (checkStatus.status > 3)
                                    checkStatus.status = 3;
                                checkStatus.data += `Model failure (No records returned): ${index}. `;
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
                            var record = await check.find().limit(1)
                                    .tolerate((err) => {
                                        checkStatus.status = 1;
                                        checkStatus.data += `Model failure (query error): ${index}. `;
                                    });
                            if (typeof record[0] === 'undefined' || typeof record[0].ID === 'undefined')
                            {
                                if (checkStatus.status > 3)
                                    checkStatus.status = 3;
                                checkStatus.data += `Model failure (No records returned): ${index}. `;
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
                            var record = await check.find().limit(1)
                                    .tolerate((err) => {
                                        checkStatus.status = 1;
                                        checkStatus.data += `Model failure (query error): ${index}. `;
                                    });
                            if ((typeof record[0] === 'undefined' || typeof record[0].ID === 'undefined') && index > 2)
                            {
                                if (checkStatus.status > 3)
                                    checkStatus.status = 3;
                                checkStatus.data += `Model failure (No records returned): ${index}. `;
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
                        sails.config.custom.subcats[config] = [];
                        for (var cat in sails.config.custom.categories[config])
                        {
                            if (sails.config.custom.categories[config].hasOwnProperty(cat))
                            {
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

                // Re-load show categories
                var categories = await Category.find({name: ["Show Openers", "Show Returns", "Show Closers"]})
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
                    sails.config.custom.showcats = {};
                    subcategories.forEach(function (subcategory) {
                        if (typeof sails.config.custom.showcats[subcategory.name] === 'undefined')
                            sails.config.custom.showcats[subcategory.name] = {"Show Openers": null, "Show Returns": null, "Show Closers": null};
                        sails.config.custom.showcats[subcategory.name][cats[subcategory.parentid]] = subcategory.ID;
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
                } else
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

    // Every minute at second 10, prune out recipients that have been offline for 4 or more hours.
    recipientsCheck: {
        schedule: '10 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON recipientsCheck called.`);
            try {
                var records = await Recipients.find({host: {"!=": ["website"]}, status: 0});
                var destroyIt = [];
                var searchto = moment().subtract(4, 'hours');
                records.forEach(function (record) {
                    if (moment(record.time).isBefore(moment(searchto)))
                        destroyIt.push(record.ID);
                });
                if (destroyIt.length > 0)
                    await Recipients.destroy({ID: destroyIt}).fetch();
            } catch (e) {
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },

    // Every minute at second 12, check server memory and CPU use.
    // ADVICE: It is advised that serverCheck is the last cron executed at the top of the minute. That way, the 1-minute CPU load will more likely detect issues.
    serverCheck: {
        schedule: '11 * * * * *',
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
                await Timesheet.update({time_out: null}, {time_out: moment().toISOString(true), approved: false})
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
    },

    // Every night at midnight, update spin counts of all the songs.
    updateSpins: {
        schedule: '0 0 0 * * *',
        onTick: async function () {
            sails.log.debug(`CRON updateSpins called.`);
            try {
                /*
                 var year = {};
                 var ytd = {};
                 var month = {};
                 var week = {};
                 // get radioDJ history records from the past year
                 var history = await History.find({date_played: {'>=': moment().subtract(1, 'years')}});
                 if (history.length > 0)
                 {
                 history.forEach(function (record) {
                 if (typeof year[`${record.artist} - ${record.title}`] === 'undefined')
                 year[`${record.artist} - ${record.title}`] = 0;
                 if (typeof ytd[`${record.artist} - ${record.title}`] === 'undefined')
                 ytd[`${record.artist} - ${record.title}`] = 0;
                 if (typeof month[`${record.artist} - ${record.title}`] === 'undefined')
                 month[`${record.artist} - ${record.title}`] = 0;
                 if (typeof week[`${record.artist} - ${record.title}`] === 'undefined')
                 week[`${record.artist} - ${record.title}`] = 0;
                 year[`${record.artist} - ${record.title}`]++;
                 if (moment(record.date_played).isSameOrAfter(moment().startOf('year')))
                 ytd[`${record.artist} - ${record.title}`]++;
                 if (moment(record.date_played).isSameOrAfter(moment().subtract(30, 'days')))
                 month[`${record.artist} - ${record.title}`]++;
                 if (moment(record.date_played).isSameOrAfter(moment().subtract(7, 'days')))
                 week[`${record.artist} - ${record.title}`]++;
                 });
                 }
                 // Get history from manually logged track airs via DJs from the past year
                 var history2 = await Logs.find({event: {'contains': 'DJ/Producer'}, createdAt: {'>=': moment().subtract(1, 'years')}});
                 if (history2.length > 0)
                 {
                 history2.forEach(function (record) {
                 if (typeof year[`${record.trackArtist} - ${record.trackTitle}`] === 'undefined')
                 year[`${record.trackArtist} - ${record.trackTitle}`] = 0;
                 if (typeof ytd[`${record.trackArtist} - ${record.trackTitle}`] === 'undefined')
                 ytd[`${record.trackArtist} - ${record.trackTitle}`] = 0;
                 if (typeof month[`${record.trackArtist} - ${record.trackTitle}`] === 'undefined')
                 month[`${record.trackArtist} - ${record.trackTitle}`] = 0;
                 if (typeof week[`${record.trackArtist} - ${record.trackTitle}`] === 'undefined')
                 week[`${record.trackArtist} - ${record.trackTitle}`] = 0;
                 year[`${record.trackArtist} - ${record.trackTitle}`]++;
                 if (moment(record.createdAt).isSameOrAfter(moment().startOf('year')))
                 ytd[`${record.trackArtist} - ${record.trackTitle}`]++;
                 if (moment(record.createdAt).isSameOrAfter(moment().subtract(30, 'days')))
                 month[`${record.trackArtist} - ${record.trackTitle}`]++;
                 if (moment(record.createdAt).isSameOrAfter(moment().subtract(7, 'days')))
                 week[`${record.trackArtist} - ${record.trackTitle}`]++;
                 });
                 }
                 // Get all song records
                 var songs = await Songs.find({});
                 if (songs.length > 0)
                 {
                 await sails.helpers.asyncForEach(songs, function (record) {
                 return new Promise(async (resolve2, reject2) => {
                 try {
                 await Songs.update({ID: record.ID}, {spins_7: week[`${record.artist} - ${record.title}`] || 0, spins_30: month[`${record.artist} - ${record.title}`] || 0, spins_ytd: ytd[`${record.artist} - ${record.title}`] || 0, spins_year: year[`${record.artist} - ${record.title}`] || 0});
                 return resolve2(false);
                 } catch (e) {
                 sails.log.error(e);
                 return resolve2(false);
                 }
                 });
                 });
                 }
                 */
            } catch (e) {
                sails.log.error(e);
                return null;
            }
        },
        start: true
    },
};


