/* global Directors, sails, Status, Calendar, Meta, Tasks, Playlists, Playlists_list, moment, Timesheet, needle, Statelogs, Logs */

module.exports.cron = {

    // Run checks every second
    checks: {
        schedule: '* * * * * *',
        onTick: function () {
            return new Promise(async (resolve, reject) => {
                sails.log.debug(`CRON checks triggered.`);

                var change = {queueLength: 0, percent: 0}; // Instead of doing a bunch of changeMetas, put all non-immediate changes into this object and changeMeta at the end of this operation.

                // Skip all checks and use default meta template if sails.config.custom.lofi = true
                if (sails.config.custom.lofi)
                {
                    try {
                        Meta.changeMeta(Meta.template);
                    } catch (e) {
                        return reject(e);
                    }
                    return resolve();
                }

                // Try to get the current RadioDJ queue. Add an error count if we fail.
                try {
                    var queue = await sails.helpers.rest.getQueue();
                    // Calculate the length of the current queue
                    queue.forEach(function (track) {
                        change.queueLength += (track.Duration - track.Elapsed);
                    });
                } catch (e) {
                    await sails.helpers.error.count('queueFail');
                    return reject(e);
                }

                /* Every now and then, querying now playing queue happens when RadioDJ is in the process of queuing a track, resulting in an inaccurate reported queue length.
                 * This results in false transitions in system state. Run a check to detect if the queuelength deviated by more than 2 seconds since last run.
                 * If so, we assume this was an error, so do not treat it as accurate, and trigger a 5 second error resolution wait.
                 */
                // WORK ON THIS
                if (Statemeta.final.queueLength > (Statesystem.errors.prevqueuelength - 3) || Statesystem.errorCheck.trueZero > 0)
                {
                    // If the detected queueLength gets bigger, assume the issue resolved itself and immediately mark the queuelength as accurate
                    if (Statemeta.final.queueLength > (Statesystem.errors.prevqueuelength))
                    {
                        Statesystem.errorCheck.trueZero = 0;
                        Statesystem.errors.prevqueuelength = Statemeta.final.queueLength;
                    } else if (Statesystem.errorCheck.trueZero > 0)
                    {
                        Statesystem.errorCheck.trueZero -= 1;
                        if (Statesystem.errorCheck.trueZero < 1)
                        {
                            Statesystem.errorCheck.trueZero = 0;
                            Statesystem.errors.prevqueuelength = Statemeta.final.queueLength;
                        } else {
                            //Statemeta.final.queueLength = (Statesystem.errors.prevqueuelength - 1);
                            Statesystem.errors.prevqueuelength = Statemeta.final.queueLength;
                        }
                        if (Statemeta.final.queueLength < 0)
                            Statemeta.final.queueLength = 0;
                    } else { // No error wait time [remaining]? Use actual detected queue time.
                        Statesystem.errors.prevqueuelength = Statemeta.final.queueLength;
                    }
                } else {
                    Statesystem.errorCheck.trueZero = 5; // Wait up to 5 seconds before considering the queue accurate
                    // Instead of using the actually recorded queueLength, use the previously detected length minus 1 second.
                    //Statemeta.final.queueLength = (Statesystem.errors.prevqueuelength - 1);
                    Statesystem.errors.prevqueuelength = Statemeta.final.queueLength;
                    if (Statemeta.final.queueLength < 0)
                        Statemeta.final.queueLength = 0;
                }

                Statesystem.errors.prevqueuelength = Statemeta.final.queueLength;

                // If we do not know current state, we may need to populate the info from the database.
                if (Meta['A'].state === '' || Meta['A'].state === 'unknown')
                {
                    try {
                        var meta = await Meta.findOne()
                                .intercept((err) => {
                                    return reject(err);
                                });
                        sails.log.silly(meta);
                        await Meta.changeMeta(meta);
                    } catch (e) {
                        return reject(e);
                    }
                }

                // If we do not know active playlist, we need to populate the info
                if (Playlists.active.ID === -1 && (Meta['A'].state === 'automation_playlist' || Meta['A'].state === 'live_prerecord'))
                {
                    try {
                        var theplaylist = await Playlists.findOne({name: Meta['A'].playlist})
                                .intercept((err) => {
                                    Playlists.active.ID = 0;
                                });
                        if (typeof theplaylist === 'undefined')
                        {
                            Playlists.active.ID = 0;
                        } else {
                            Playlists.active.ID = theplaylist.ID;
                            var playlistTracks = await Playlists_list.find({pID: Playlists.active.ID})
                                    .intercept((err) => {
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
                                    .intercept((err) => {
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
                                    .intercept((err) => {
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
                                    .intercept((err) => {
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
                                    .intercept((err) => {
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
                                        .intercept((err) => {
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
                                    .intercept((err) => {
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
                                        .intercept((err) => {
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
                                        .intercept((err) => {
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

                    // WORK ON THIS

                    // Clean up profanity in metadata
                    Statemeta.final.display.line1 = profanity.purify(Statemeta.final.display.line1);
                    Statemeta.final.display.line1 = Statemeta.final.display.line1[0];
                    Statemeta.final.display.line2 = profanity.purify(Statemeta.final.display.line2);
                    Statemeta.final.display.line2 = Statemeta.final.display.line2[0];
                    Statemeta.stream.current = profanity.purify(Statemeta.stream.current);
                    Statemeta.stream.current = Statemeta.stream.current[0];

                    // parse metadata
                    if (Statemeta.stream.previous != Statemeta.stream.current)
                    {
                        Statemeta.stream.previous = Statemeta.stream.current;
                        var thearray = [];
                        thearray = Statemeta.stream.current.split(' - ');
                        if (thearray.length < 1)
                            thearray[0] = '';
                        if (thearray.length < 2)
                            thearray[1] = '';
                        var theartist = thearray[0];
                        var thetitle = thearray[1];
                        Statemeta.final.artist = theartist;
                        Statemeta.final.title = thetitle;

                        Statemeta.history.unshift(`${theartist} - ${thetitle}`);
                        if (Statemeta.history.length > 5)
                            delete Statemeta.history[5];
                    }


                    // If we are preparing for live, so some stuff if queue is done
                    if (Statemeta.final.state == 'automation_live' && Statemeta.final.queueLength == 0 && Statesystem.errorCheck.trueZero <= 0)
                    {
                        Statemeta.final.display.line2 = '';
                        Statemeta.final.track = '';
                        Statesystem.update({ID: 1}, {state: 'live_on'}).exec(function (err2, updated) {
                            Statemeta.final.state = 'live_on';
                        });
                        Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err5, succ) {});
                    }
                    if (Statemeta.final.state == 'automation_sports' && Statemeta.final.queueLength == 0 && Statesystem.errorCheck.trueZero <= 0)
                    {
                        Statemeta.final.display.line2 = '';
                        Statemeta.final.track = '';
                        Statesystem.update({ID: 1}, {state: 'sports_on'}).exec(function (err2, updated) {
                            Statemeta.final.state = 'sports_on';
                        });
                        Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err5, succ) {});
                    }
                    // If we are preparing for remote, so some stuff if we are playing the stream track
                    if (Statemeta.final.state == 'automation_remote' && Statemeta.final.queueLength == 0 && Statesystem.errorCheck.trueZero <= 0)
                    {
                        Statemeta.final.display.line2 = '';
                        Statemeta.final.track = '';
                        Statesystem.update({ID: 1}, {state: 'remote_on'}).exec(function (err2, updated) {
                            Statemeta.final.state = 'remote_on';
                        });
                        Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err5, succ) {
                            Songs.queueFromSubcategory({name: 'WWSU Remote', parent: 'Radio Streams', position: 'Bottom', number: 1}, function (err5, succ) {
                                Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err5, succ) {
                                    Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err5, succ) {});
                                });
                            });
                        });
                    }
                    if (Statemeta.final.state == 'automation_sportsremote' && Statemeta.final.queueLength == 0 && Statesystem.errorCheck.trueZero <= 0)
                    {
                        Statemeta.final.display.line2 = '';
                        Statemeta.final.track = '';
                        Statesystem.update({ID: 1}, {state: 'sportsremote_on'}).exec(function (err2, updated) {
                            Statemeta.final.state = 'sportsremote_on';
                        });
                        Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err5, succ) {
                            Songs.queueFromSubcategory({name: 'WWSU Remote', parent: 'Radio Streams', position: 'Bottom', number: 1}, function (err5, succ) {
                                Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err5, succ) {
                                    Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err5, succ) {});
                                });
                            });
                        });
                    }
                    // If returning from break, do stuff once queue is empty
                    if (Statemeta.final.state.includes('_returning') && Statemeta.final.queueLength <= 0 && Statesystem.errorCheck.trueZero <= 0)
                    {
                        switch (Statemeta.final.state)
                        {
                            case 'live_returning':
                                Statemeta.final.display.line2 = '';
                                Statemeta.final.track = '';
                                Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err5, succ) {});
                                Statesystem.update({ID: 1}, {state: 'live_on'}).exec(function (err2, updated) {
                                    Statemeta.final.state = 'live_on';
                                });
                                break;
                            case 'remote_returning':
                                Statemeta.final.display.line2 = '';
                                Statemeta.final.track = '';
                                Statesystem.update({ID: 1}, {state: 'remote_on'}).exec(function (err2, updated) {
                                    Statemeta.final.state = 'remote_on';
                                });
                                Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err5, succ) {
                                    Songs.queueFromSubcategory({name: 'WWSU Remote', parent: 'Radio Streams', position: 'Bottom', number: 1}, function (err5, succ) {
                                        Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err5, succ) {
                                            Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err5, succ) {});
                                        });
                                    });
                                });
                                break;
                            case 'sports_returning':
                                Statemeta.final.display.line2 = '';
                                Statemeta.final.track = '';
                                Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err5, succ) {});
                                Statesystem.update({ID: 1}, {state: 'sports_on'}).exec(function (err2, updated) {
                                    Statemeta.final.state = 'sports_on';
                                });
                                break;
                            case 'sportsremote_returning':
                                Statemeta.final.display.line2 = '';
                                Statemeta.final.track = '';
                                Statesystem.update({ID: 1}, {state: 'sportsremote_on'}).exec(function (err2, updated) {
                                    Statemeta.final.state = 'sportsremote_on';
                                });
                                Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err5, succ) {
                                    Songs.queueFromSubcategory({name: 'WWSU Remote', parent: 'Radio Streams', position: 'Bottom', number: 1}, function (err5, succ) {
                                        Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err5, succ) {
                                            Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err5, succ) {});
                                        });
                                    });
                                });
                                break;
                        }
                    }
                    // If we are in break, queue something if the queue is under 2 items to keep the break going
                    if ((Statemeta.final.state == 'sports_halftime' || Statemeta.final.state == 'sportsremote_halftime' || Statemeta.final.state == 'sportsremote_halftime_disconnected') && Statemeta.automation.length < 2)
                    {
                        Songs.queueFromSubcategory({name: 'Halftime and Break Music', parent: 'Sports Music', position: 'Bottom', number: 1}, function (err5, succ) {});
                    }
                    if (Statemeta.final.state.includes('_break') && Statemeta.automation.length < 2)
                    {
                        Songs.queueFromCategory({name: 'PSAs', position: 'Bottom', number: 1, artist: 15, track: 60}, function (err3, succ) {});
                    }

                    // If we are in a sports break, switch it to returning mode because it should not be an indefinite break
                    // WE HAVE the system go to break mode for this to switch to returning. This avoids a bug where being immediately in returning causes switch to on because queue is initially 0.
                    var d = new Date();
                    var n = d.getMinutes();
                    if (Statemeta.final.state == 'sports_break')
                    {
                        Statesystem.update({ID: 1}, {state: 'sports_returning'}).exec(function (err2, updated) {
                            Statemeta.final.state = 'sports_returning';
                        });
                        Statesystem.errorCheck.sportsReturn = 3;
                        if (n >= 50 || n <= 10)
                        {
                            Statesystem.errorCheck.legalID = 3;
                            Songs.queueFromCategory({name: 'Station IDs', position: 'Bottom', number: 1}, function (err3, succ) {
                                Statesystem.lastStationID = moment();
                                Songs.queueFromCategory({name: 'Sports Liners', position: 'Bottom', number: 1}, function (err3, succ) {});
                            });
                        } else {
                            Songs.queueFromCategory({name: 'Sports Liners', position: 'Bottom', number: 1}, function (err3, succ) {});
                        }
                    }
                    if (Statemeta.final.state == 'sportsremote_break')
                    {
                        Statesystem.errorCheck.sportsReturn = 3;
                        Statesystem.update({ID: 1}, {state: 'sportsremote_returning'}).exec(function (err2, updated) {
                            Statemeta.final.state = 'sportsremote_returning';
                        });
                        if (n >= 50 || n <= 10)
                        {
                            Statesystem.lastStationID = moment();
                            Statesystem.errorCheck.legalID = 3;
                            Songs.queueFromCategory({name: 'Station IDs', position: 'Bottom', number: 1}, function (err3, succ) {
                                Songs.queueFromCategory({name: 'Sports Liners', position: 'Bottom', number: 1}, function (err3, succ) {});
                            });
                        } else {
                            Songs.queueFromCategory({name: 'Sports Liners', position: 'Bottom', number: 1}, function (err3, succ) {});
                        }
                    }


                    // Do automation system error checking and handling
                    if (Statemeta.automation.length > 0 && Statemeta.automation[0].Duration == Statesystem.errors.prevduration && Statemeta.automation[0].Elapsed == Statesystem.errors.prevelapsed && (Statemeta.final.state.startsWith("automation_") || Statemeta.final.state.endsWith("_break") || Statemeta.final.state.endsWith("_disconnected")))
                    {
                        Statesystem.errors.any = true;
                        Statesystem.errors.count += 1;
                        if (Statesystem.errors.count >= 15 && Statesystem.errors.switcher < 2)
                        {
                            Statesystem.errors.switcher += 1;
                            Statesystem.errors.count = 0;
                            Statesystem.newError();
                            Statesystem.errors.preverror = moment();
                            if (moment(Statesystem.errors.preverror).isBefore(moment().subtract(1, 'minutes')))
                                requester.post({method: 'POST', url: 'https://api.groupme.com/v3/bots/post', timeout: 5000, form: {'bot_id': '980ef58e373596c1209975020f', 'text': 'WARN RadioDJ reports to have an empty queue in automation. Attempted to fix that.'}}, function (err, response, body) {});
                            if (Statemeta.final.state != 'automation_playlist' && Statemeta.final.state != 'automation_genre' && Statemeta.final.state.startsWith("automation_"))
                            {
                                Statelogs.create({logtype: 'system', loglevel: 'warn', logsubtype: '', event: 'Automation mode is active, but RadioDJ reports either having an empty queue or have crashed. Attempting recovery via clearing playlist and queuing and playing 5 random music tracks.'}).exec(function (err, record) {});
                                Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err2, succ) {
                                    Statesystem.REST({command: 'ClearPlaylist', arg: 1}, function (err3, succ) {});
                                    Songs.queueFromCategory({name: 'Music', position: 'Top', number: 5}, function (err3, succ) {
                                        Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err4, succ) {});
                                        Statesystem.REST({command: 'EnableAutoDJ', arg: 1}, function (err4, succ) {});
                                        Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err4, succ) {});
                                    });
                                });
                            } else if (Statemeta.final.state == 'automation_playlist' || Statemeta.final.state == 'automation_genre' || Statemeta.final.state == 'live_prerecord') {
                                Statelogs.create({logtype: 'system', loglevel: 'warn', logsubtype: '', event: 'Automation playlist, or prerecorded show, mode is active, but RadioDJ reports either having an empty queue or have crashed. Attempting recovery via re-queuing the playlist track in our current playlist.'}).exec(function (err, record) {});
                                Statesystem.REST({command: 'EnableAutoDJ', arg: 0}, function (err4, succ) {
                                    Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err2, succ) {
                                        Statesystem.REST({command: 'ClearPlaylist', arg: 1}, function (err3, succ) {
                                            Songs.queueFromCategory({name: 'Station IDs', position: 'Top', number: 1}, function (err3, succ) {
                                                Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err4, succ) {});
                                                Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err4, succ) {});
                                            });
                                            Playlists.startPlaylist(Playlists.active.name, true);
                                        });
                                    });
                                });
                            } else {
                                Statelogs.create({logtype: 'system', loglevel: 'warn', logsubtype: '', event: 'A break is active, but RadioDJ reports either having an empty queue or have crashed. Attempting recovery via queuing 2 PSAs.'}).exec(function (err, record) {});
                                Statesystem.REST({command: 'EnableAutoDJ', arg: 0}, function (err4, succ) {
                                    Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err2, succ) {
                                        Statesystem.REST({command: 'ClearPlaylist', arg: 1}, function (err3, succ) {
                                            Songs.queueFromCategory({name: 'PSAs', position: 'Bottom', number: 2, artist: 15, track: 60}, function (err3, succ) {
                                                Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err4, succ) {});
                                            });
                                            Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err4, succ) {});
                                        });
                                    });
                                });
                            }
                        }
                        if (Statesystem.errors.count >= 15 && Statesystem.errors.switcher >= 2)
                        {
                            Statesystem.errors.switcher = 0;
                            Statesystem.errors.count = 0;
                            Statesystem.newError();
                            Statesystem.errors.preverror = moment();
                            sails.sockets.broadcast('system-error', 'system-error', true);
                            if (moment(Statesystem.errors.preverror).isBefore(moment().subtract(1, 'minutes')))
                                requester.post({method: 'POST', url: 'https://api.groupme.com/v3/bots/post', timeout: 5000, form: {'bot_id': '980ef58e373596c1209975020f', 'text': 'ERROR NODE tried recovering a dead RadioDJ but failed. Switched to another RadioDJ.'}}, function (err, response, body) {});
                            if (Statemeta.final.state != 'automation_playlist' && Statemeta.final.state != 'automation_genre' && Statemeta.final.state.startsWith("automation_"))
                            {
                                Statelogs.create({logtype: 'system', loglevel: 'warn', logsubtype: '', event: 'We tried twice to recover RadioDJ, but could not. Going to try using another RadioDJ instance.'}).exec(function (err, record) {});
                                Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err4, succ) {});
                                Statesystem.REST({command: 'EnableAutoDJ', arg: 0}, function (err4, succ) {});
                                Statesystem.REST({command: 'StopPlayer', arg: 0}, function (err4, succ) {
                                    Statesystem.changeRadioDJ({}, function () {
                                        Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err2, succ) {
                                            Statesystem.REST({command: 'ClearPlaylist', arg: 1}, function (err3, succ) {});
                                            Songs.queueFromCategory({name: 'Music', position: 'Top', number: 5}, function (err3, succ) {
                                                Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err4, succ) {});
                                                Statesystem.REST({command: 'EnableAutoDJ', arg: 1}, function (err4, succ) {});
                                                Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err4, succ) {});
                                            });
                                        });
                                    });
                                });
                            } else if (Statemeta.final.state == 'automation_playlist' || Statemeta.final.state == 'automation_genre' || Statemeta.final.state == 'live_prerecord') {
                                Statelogs.create({logtype: 'system', loglevel: 'warn', logsubtype: '', event: 'We tried twice to recover RadioDJ, but could not. Going to try using another RadioDJ instance.'}).exec(function (err, record) {});
                                Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err4, succ) {});
                                Statesystem.REST({command: 'EnableAutoDJ', arg: 0}, function (err4, succ) {});
                                Statesystem.REST({command: 'StopPlayer', arg: 0}, function (err4, succ) {
                                    Statesystem.changeRadioDJ({}, function () {
                                        Statesystem.REST({command: 'EnableAutoDJ', arg: 0}, function (err4, succ) {
                                            Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err2, succ) {
                                                Statesystem.REST({command: 'ClearPlaylist', arg: 1}, function (err3, succ) {
                                                    Songs.queueFromCategory({name: 'Station IDs', position: 'Top', number: 1}, function (err3, succ) {
                                                        Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err4, succ) {});
                                                        Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err4, succ) {});
                                                    });
                                                    Playlists.startPlaylist(Playlists.active.name, true);
                                                });
                                            });
                                        });
                                    });
                                });
                            } else {
                                Statelogs.create({logtype: 'system', loglevel: 'warn', logsubtype: '', event: 'We tried twice to recover RadioDJ, but could not. Going to try using another RadioDJ instance.'}).exec(function (err, record) {});
                                Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err4, succ) {});
                                Statesystem.REST({command: 'EnableAutoDJ', arg: 0}, function (err4, succ) {});
                                Statesystem.REST({command: 'StopPlayer', arg: 0}, function (err4, succ) {
                                    Statesystem.changeRadioDJ({}, function () {
                                        Statesystem.REST({command: 'EnableAutoDJ', arg: 0}, function (err4, succ) {
                                            Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err2, succ) {
                                                Statesystem.REST({command: 'ClearPlaylist', arg: 1}, function (err3, succ) {
                                                    Songs.queueFromCategory({name: 'PSAs', position: 'Bottom', number: 2, artist: 15, track: 60}, function (err3, succ) {
                                                        Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err4, succ) {});
                                                    });
                                                    Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err4, succ) {});
                                                });
                                            });
                                        });
                                    });
                                });
                            }
                        }
                    } else if ((Statemeta.final.state == 'remote_on' || Statemeta.final.state == 'sportsremote_on') && ((Statemeta.automation[0].TrackType != 'InternetStream' && Statemeta.automation.length < 2) || Statemeta.automation[0].Elapsed == Statesystem.errors.prevelapsed))
                    {
                        Statesystem.errors.any = true;
                        Statesystem.errors.count += 1;
                        if (Statesystem.errors.count >= 15 && Statesystem.errors.switcher < 2)
                        {
                            Statesystem.errors.switcher += 1;
                            Statesystem.errors.count = 0;
                            Statesystem.newError();
                            Statesystem.errors.preverror = moment();
                            Statelogs.create({logtype: 'system', loglevel: 'warn', logsubtype: '', event: 'We are in remote mode but system does not seem to be playing the remote stream. Attempting recovery.'}).exec(function (err, record) {});
                            if (moment(Statesystem.errors.preverror).isBefore(moment().subtract(1, 'minutes')))
                                requester.post({method: 'POST', url: 'https://api.groupme.com/v3/bots/post', timeout: 5000, form: {'bot_id': '980ef58e373596c1209975020f', 'text': 'WARN The remote stream was not airing when it should have been. Attempted to reload the stream..'}}, function (err, response, body) {});
                            Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err2, succ) {
                                Statesystem.REST({command: 'ClearPlaylist', arg: 1}, function (err3, succ) {
                                    Songs.queueFromSubcategory({name: 'WWSU Remote', parent: 'Radio Streams', position: 'Bottom', number: 1}, function (err5, succ) {
                                        Statesystem.REST({command: 'EnableAutoDJ', arg: 0}, function (err4, succ) {});
                                        Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err5, succ) {});
                                        Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err2, succ) {});
                                    });
                                });
                            });
                        }
                        if (Statesystem.errors.count >= 15 && Statesystem.errors.switcher >= 2)
                        {
                            Statesystem.errors.switcher = 0;
                            Statesystem.errors.count = 0;
                            Statesystem.newError();
                            Statesystem.errors.preverror = moment();
                            sails.sockets.broadcast('system-error', 'system-error', true);
                            Statelogs.create({logtype: 'system', loglevel: 'warn', logsubtype: '', event: 'We tried twice to recover RadioDJ, but could not. Going to try using another RadioDJ instance.'}).exec(function (err, record) {});
                            if (moment(Statesystem.errors.preverror).isBefore(moment().subtract(1, 'minutes')))
                                requester.post({method: 'POST', url: 'https://api.groupme.com/v3/bots/post', timeout: 5000, form: {'bot_id': '980ef58e373596c1209975020f', 'text': 'ERROR NODE tried recovering a dead RadioDJ but failed. Switched to another RadioDJ.'}}, function (err, response, body) {});
                            Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err4, succ) {});
                            Statesystem.REST({command: 'EnableAutoDJ', arg: 0}, function (err4, succ) {});
                            Statesystem.REST({command: 'StopPlayer', arg: 0}, function (err4, succ) {
                                Statesystem.changeRadioDJ({}, function () {
                                    Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err2, succ) {
                                        Statesystem.REST({command: 'ClearPlaylist', arg: 1}, function (err3, succ) {
                                            Songs.queueFromSubcategory({name: 'WWSU Remote', parent: 'Radio Streams', position: 'Bottom', number: 1}, function (err5, succ) {
                                                Statesystem.REST({command: 'EnableAutoDJ', arg: 0}, function (err4, succ) {});
                                                Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err5, succ) {});
                                                Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err2, succ) {});
                                            });
                                        });
                                    });
                                });
                            });
                        }
                    } else {
                        Statesystem.errors.any = false;
                        if (moment(Statesystem.errors.preverror).isBefore(moment().subtract(1, 'minutes')))
                            Statesystem.errors.switcher = 0;
                        Statesystem.errors.count = 0;
                        Statesystem.errors.prevduration = Statemeta.automation[0].Duration;
                        Statesystem.errors.prevelapsed = Statemeta.automation[0].Elapsed;
                    }

                    // Manage PSAs and IDs intelligently using track queue length. This gets complicated, so comments explain the process.

                    // Do not run this process if we cannot get a duration for the currently playing track
                    if (typeof Statemeta.automation[0] != 'undefined' && typeof Statemeta.automation[0].Duration != 'undefined' && Statemeta.automation[0].Elapsed != 'undefined')
                    {

                        // First, get a moment instance for 20 past the current hour, 40 past the current hour, and the top of the next hour
                        var psabreak20 = moment().minutes(20);
                        var psabreak40 = moment().minutes(40);
                        var idbreak = moment().minutes(0).add(1, 'hours');

                        // Also get a moment instance for the estimated time when the currently playing track will finish
                        var endtime = moment().add((Statemeta.automation[0].Duration - Statemeta.automation[0].Elapsed), 'seconds');

                        // Determine if we should queue a PSA break. Start off with no by default.
                        var doPSAbreak = false;

                        // Consider queuing if the current time is before :20 and, after adding the remaining time from the current track, it passes :20 after
                        if (moment().isBefore(moment(psabreak20)) && moment(endtime).isAfter(moment(psabreak20)))
                            doPSAbreak = true;

                        // Consider queuing if the current time is between :20 and :40, and, adding the remaining time from the current track passes :40
                        if (moment().isAfter(moment(psabreak20)) && moment().isBefore(moment(psabreak40)) && moment(endtime).isAfter(moment(psabreak40)))
                            doPSAbreak = true;

                        // If, after adding the remaining time, we do not pass :20, but if the next track in queue will go way beyond :20, have the PSAs play early instead so they are closer to on time.
                        if (moment().isBefore(moment(psabreak20)) && typeof Statemeta.automation[1] != 'undefined' && typeof Statemeta.automation[1].Duration != 'undefined')
                        {
                            var distancebefore = moment(psabreak20).diff(moment(endtime));
                            var endtime2 = moment(endtime).add(Statemeta.automation[1].Duration, 'seconds');
                            var distanceafter = endtime2.diff(psabreak20);
                            if (moment(endtime2).isAfter(moment(psabreak20)) && distanceafter > distancebefore)
                                doPSAbreak = true;
                        }

                        // If, after adding the remaining time, we do not pass :40, but if the next track in queue will go way beyond :40, have the PSAs play early instead so they are closer to on time.
                        if (moment().isAfter(moment(psabreak20)) && moment().isBefore(moment(psabreak40)) && typeof Statemeta.automation[1] != 'undefined' && typeof Statemeta.automation[1].Duration != 'undefined')
                        {
                            var distancebefore = moment(psabreak40).diff(moment(endtime));
                            var endtime2 = moment(endtime).add(Statemeta.automation[1].Duration, 'seconds');
                            var distanceafter = endtime2.diff(psabreak40);
                            if (moment(endtime2).isAfter(moment(psabreak40)) && distanceafter > distancebefore)
                                doPSAbreak = true;
                        }

                        // Do not queue if we are not in automation, playlist, or prerecord states
                        if (Statemeta.final.state !== 'automation_on' && Statemeta.final.state !== 'automation_playlist' && Statemeta.final.state !== 'automation_genre' && Statemeta.final.state !== 'live_prerecord')
                            doPSAbreak = false;

                        // Do not queue if we queued a break less than 10 minutes ago
                        if (Statesystem.lastBreak !== null && Statesystem.lastBreak.isAfter(moment().subtract(10, 'minutes')))
                            doPSAbreak = false;

                        // Do not queue anything yet if the current track has 10 or more minutes left (resolves a discrepancy with the previous logic)
                        if ((Statemeta.automation[0].Duration - Statemeta.automation[0].Elapsed) >= (60 * 10))
                            doPSAbreak = false;

                        // Finally, if we are to queue a PSA break, queue it and make note we queued it so we don't queue another one too soon.
                        if (doPSAbreak)
                        {
                            Statesystem.lastBreak = moment();
                            Statelogs.create({logtype: 'system', loglevel: 'info', logsubtype: 'automation', event: 'Queued :20 / :40 PSA break'}).exec(function (err, record) {});
                            Requests.queueRequests({consider_playlist: true, quantity: 3, liner_first: true}, function (result) {
                                Songs.queueFromSubcategory({name: 'Break Sweepers', parent: 'Sweepers', position: 'Top', number: 1}, function (err3, succ) {
                                    Songs.queueFromCategory({name: 'PSAs', position: 'Top', number: 2, artist: 15, track: 60}, function (err4, succ) {});
                                });
                            });
                        }

                        // Determine if we are to queue a station ID break

                        // Determine false by default
                        var doIDbreak = false;

                        // If, adding the remaining time of the current track to the current time, passes the time we are to queue an ID break, then consider queuing it
                        if (moment(endtime).isAfter(moment(idbreak)))
                            doIDbreak = true;

                        // If, after adding the remaining time, we do not pass :00, but if the next track in queue will go way beyond :00, have the ID play early instead so it's closer to on time.
                        if (typeof Statemeta.automation[1] != 'undefined' && typeof Statemeta.automation[1].Duration != 'undefined')
                        {
                            var distancebefore = moment(idbreak).diff(moment(endtime));
                            var endtime2 = moment(endtime).add(Statemeta.automation[1].Duration, 'seconds');
                            var distanceafter = endtime2.diff(idbreak);
                            if (moment(endtime2).isAfter(moment(idbreak)) && distanceafter > distancebefore)
                                doIDbreak = true;
                        }

                        // If the last time we queued a station ID break was less than 20 minutes ago, it's too soon!
                        if (Statesystem.lastStationID !== null && Statesystem.lastStationID.isAfter(moment().subtract(20, 'minutes')))
                            doIDbreak = false;

                        // Do not queue anything yet if the current time is before :40 after (resolves a discrepancy with the previous logic)
                        if (moment().isBefore(moment(idbreak).subtract(20, 'minutes')))
                            doIDbreak = false;

                        // Do not queue if we are not in automation, playlist, or prerecord states
                        if (Statemeta.final.state !== 'automation_on' && Statemeta.final.state !== 'automation_playlist' && Statemeta.final.state !== 'automation_genre' && Statemeta.final.state !== 'live_prerecord')
                            doIDbreak = false;

                        if (doIDbreak)
                        {
                            Statesystem.lastStationID = moment();
                            Statesystem.lastBreak = moment();
                            Statelogs.create({logtype: 'system', loglevel: 'info', logsubtype: 'automation', event: 'Queued :00 Station ID Break'}).exec(function (err, record) {});
                            Statesystem.errorCheck.legalID = 5;
                            Requests.queueRequests({consider_playlist: true, quantity: 3, liner_first: true}, function (result) {
                                Songs.queueFromCategory({name: 'Station IDs', position: 'Top', number: 1}, function (err3, succ) {
                                    Songs.queueFromCategory({name: 'Promos', position: 'Top', number: 1}, function (err4, succ) {});
                                    Songs.queueFromCategory({name: 'PSAs', position: 'Top', number: 2, artist: 15, track: 60}, function (err4, succ) {});
                                });
                            });
                        }
                    }
                } else {
                    Statesystem.errors.any = true;
                    Statesystem.errors.count += 1;
                    if (Statesystem.errors.count > 15)
                    {
                        Statesystem.errors.switcher = 0;
                        Statesystem.errors.count = 0;
                        Statesystem.errors.any = false;
                        Statesystem.newError();
                        Statesystem.errors.preverror = moment();
                        sails.sockets.broadcast('system-error', 'system-error', true);
                        Statelogs.create({logtype: 'system', loglevel: 'warn', logsubtype: '', event: 'We could not connect to RadioDJ. Switching to another instance.'}).exec(function (err, record) {});
                        if (moment(Statesystem.errors.preverror).isBefore(moment().subtract(1, 'minutes')))
                            requester.post({method: 'POST', url: 'https://api.groupme.com/v3/bots/post', timeout: 5000, form: {'bot_id': '980ef58e373596c1209975020f', 'text': 'There was a problem connecting to RadioDJ. Switched to another instance.'}}, function (err, response, body) {});
                        Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err4, succ) {});
                        Statesystem.REST({command: 'EnableAutoDJ', arg: 0}, function (err4, succ) {});
                        Statesystem.REST({command: 'StopPlayer', arg: 0}, function (err4, succ) {
                            Statesystem.changeRadioDJ({}, function () {
                                if (Statemeta.final.state.startsWith("automation_") && Statemeta.final.state != 'automation_playlist' && Statemeta.final.state != 'automation_genre' && Statemeta.final.state != 'live_prerecord')
                                {
                                    Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err2, succ) {
                                        Statesystem.REST({command: 'ClearPlaylist', arg: 1}, function (err3, succ) {});
                                        Songs.queueFromCategory({name: 'Music', position: 'Top', number: 5}, function (err3, succ) {
                                            Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err4, succ) {});
                                            Statesystem.REST({command: 'EnableAutoDJ', arg: 1}, function (err4, succ) {});
                                            Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err4, succ) {});
                                        });
                                    });
                                } else if (Statemeta.final.state == 'automation_playlist' || Statemeta.final.state == 'automation_genre' || Statemeta.final.state == 'live_prerecord')
                                {
                                    Statesystem.REST({command: 'EnableAutoDJ', arg: 0}, function (err4, succ) {
                                        Statesystem.REST({command: 'EnableAssisted', arg: 1}, function (err2, succ) {
                                            Statesystem.REST({command: 'ClearPlaylist', arg: 1}, function (err3, succ) {
                                                Songs.queueFromCategory({name: 'Station IDs', position: 'Top', number: 1}, function (err3, succ) {
                                                    Statesystem.REST({command: 'PlayPlaylistTrack', arg: 0}, function (err4, succ) {});
                                                    Statesystem.REST({command: 'EnableAssisted', arg: 0}, function (err4, succ) {});
                                                });
                                                Playlists.startPlaylist(Playlists.active.name, true);
                                            });
                                        });
                                    });
                                }
                            });
                        });
                    }
                }



            });
        },
        start: true
    },

    // Every minute at second 00, update work orders.
    workOrders: {
        schedule: '0 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON workOrders triggered.`);
            await Tasks.updateTasks();
        },
        start: true
    },

    // Every minute on second 01, check for changes in directors on OpenProject.
    updateDirectors: {
        schedule: '1 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON updateDirectors triggered.`);
            await Directors.updateDirectors();
        },
        start: true
    },

    // Every minute on second 02, update Calendar.
    updateCalendar: {
        schedule: '2 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON updateCalendar triggered.`);
            await Calendar.preLoadEvents();
        },
        start: true
    },

    // Twice per minute, at 03 and 33, check the online status of the radio streams
    checkRadioStreams: {
        schedule: '3,33 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON checkRadioStreams triggered.`);

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
        },
        start: true
    },

    // Twice per minute at 04 and 34 seconds, check all RadioDJs for connectivity.
    checkRadioDJs: {
        schedule: '4,34 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON checkRadioDJs triggered.`);

            await sails.helpers.asyncForEach(sails.config.custom.radiodjs, function (radiodj) {
                return new Promise(async (resolve, reject) => {
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
                });
            });
        },
        start: true
    },

    // Twice per minute at 05 and 35 seconds, check for connectivity to the website.
    checkWebsite: {
        schedule: '5,35 * * * * *',
        onTick: function () {
            sails.log.debug(`CRON checkWebsite triggered.`);
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
        },
        start: true
    },

    // Every minute on second 06, get NWS alerts for configured counties.
    EAS: {
        schedule: '6 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON EAS triggered.`);

            // Initial procedure
            await sails.helpers.eas.preParse();

            // Iterate through every configured county and get their weather alerts
            var complete = 0;
            await sails.helpers.asyncForEach(sails.config.custom.EAS.NWSX, function (county, index) {
                return new Promise(async (resolve, reject) => {
                    try {
                        sails.log.verbose(`Trying ${county.name}-${county.code}`);
                        needle('get', `https://alerts.weather.gov/cap/wwaatmget.php?x=${county.code}&y=0&t=${moment().valueOf()}`)
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
        },
        start: true
    },
    // Every day at 11:59pm, clock out any directors still clocked in
    // WORK ON THIS
    clockOutDirectors: {
        schedule: '59 23 * * *',
        onTick: function () {
            var d = new Date();
            Timesheet.update({time_out: null}, {time_out: d, approved: 0}).exec(function (error, records) {
                Directors.loadDirectors(true, function () {});
            });
        },
        start: true
    }
};


