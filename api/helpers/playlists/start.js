/* global Meta, Playlists, Playlists_list, sails, Logs, Statemeta, _, moment, Attendance */

module.exports = {

    friendlyName: 'playlists.start',

    description: 'Begin a playlist in the active RadioDJ.',

    inputs: {
        name: {
            type: 'string',
            required: true,
            description: 'The name of the playlist to begin, as saved in RadioDJ.'
        },
        resume: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, we will resume where we left off instead of starting from the beginning of the playlist.'
        },
        type: {
            type: 'number',
            defaultsTo: 0,
            min: 0,
            max: 1,
            description: '0 = standard playlist, 1 = prerecord'
        },
        topic: {
            type: 'string',
            defaultsTo: '',
            description: 'Topic to set on the metadata when this playlist plays (prerecord).'
        },
        ignoreChangingState: {
            type: 'boolean',
            defaultsTo: false,
            description: 'Set to true if we should ignore the Meta.changingState conflict check.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper playlists.start called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {
            // Do not start the playlist if one is in the process of being queued, we're not in a proper automation state, we're in the middle of changing states and ignoreChangingState is false, and/or it was not specified we are resuming a playlist.
            if (!Playlists.queuing && (((Meta['A'].changingState === null || inputs.ignoreChangingState) && ((Meta['A'].state === 'automation_on' || Meta['A'].state === 'automation_playlist' || Meta['A'].state === 'automation_genre'))) || inputs.resume))
            {
                sails.log.verbose(`Processing helper.`);
                Playlists.queuing = true; // Mark that the playlist is being queued, to avoid app conflicts.

                // Lock state changes when necessary until we are done
                if (!inputs.resume && !inputs.ignoreChangingState)
                    await Meta.changeMeta({changingState: `Switching to playlist`});

                // Find the playlist
                var theplaylist = await Playlists.findOne({name: inputs.name});
                sails.log.silly(`Playlist: ${theplaylist}`);

                // Error if we cannot find the playlist
                if (!theplaylist)
                {
                    if (!inputs.resume && !inputs.ignoreChangingState)
                        await Meta.changeMeta({changingState: null});
                    Playlists.queuing = false;
                    return exits.error(new Error('Playlist not found!'));
                }


                // This private function will load the playlist from the variable theplaylist, gather playlist tracks in memory, wait until deemed queued, then resolve.
                var loadPlaylist = function () {
                    return new Promise(async (resolve2, reject2) => {
                        try {
                            await sails.helpers.rest.cmd('LoadPlaylist', theplaylist.ID); // Queue the playlist

                            // Load the playlist tracks into memory so CRON can check when the playlist has finished.
                            var playlistTracks = await Playlists_list.find({pID: theplaylist.ID}).sort('ord ASC');
                            sails.log.verbose(`Playlists_list records retrieved: ${playlistTracks.length}`);
                            sails.log.silly(playlistTracks);
                            if (!playlistTracks)
                            {
                                if (!inputs.resume && !inputs.ignoreChangingState)
                                    await Meta.changeMeta({changingState: null});
                                Playlists.queuing = false;
                                return reject2(new Error(`No playlist tracks were returned.`));
                            }
                            Playlists.active.tracks = [];
                            playlistTracks.forEach(function (playlistTrack) {
                                Playlists.active.tracks.push(playlistTrack.sID);
                            });

                            var slot = 10;
                            var prevLength = 0;
                            sails.log.verbose(`Waiting for playlist queue...`);
                            var bail = 60;
                            var theFunction = function () {
                                try {

                                    // Bail after waiting for a max of 60 seconds.
                                    bail -= 1;
                                    if (bail < 1)
                                    {
                                        Playlists.queuing = false;
                                        if (!inputs.resume && !inputs.ignoreChangingState)
                                            Meta.changeMeta({changingState: null});
                                        sails.log.verbose(`Failed to queue playlist after 60 seconds.`);
                                        return reject2(new Error("The playlist was not considered queued after 60 seconds."));
                                    }

                                    var tracks = Meta.automation;

                                    // If the number of tracks detected in queue is less than or equal to the previous check, count down on the slot counter.
                                    if (tracks.length <= prevLength)
                                    {
                                        slot -= 1;
                                        // Consider playlist as finished queuing if counter reaches zero.
                                        if (slot <= 0)
                                        {
                                            Playlists.queuing = false;
                                            if (!inputs.resume && !inputs.ignoreChangingState)
                                                Meta.changeMeta({changingState: null});
                                            sails.log.verbose(`Considered playlist as queued. Proceeding.`);
                                            return resolve2();
                                        } else {
                                            setTimeout(theFunction, 1000);
                                        }
                                        // Otherwise, reset the slot counter to 10 as we assume playlist is still queuing.
                                    } else {
                                        slot = 10;
                                        setTimeout(theFunction, 1000);
                                    }
                                    prevLength = tracks.length;
                                } catch (e) {
                                    setTimeout(theFunction, 1000);
                                }
                            };
                            theFunction();
                        } catch (e) {
                            return reject2(e);
                        }
                    });
                };
                if (inputs.resume) // Resuming a playlist that was already started, eg. if RadioDJ crashed in the middle of it.
                {
                    await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                    await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearGeneral, true);
                    await sails.helpers.rest.cmd('EnableAssisted', 0);
                    await loadPlaylist();
                    await sails.helpers.rest.cmd('EnableAutoDJ', 1);

                    // If we are resuming, we need to remove tracks that already played;
                    var toRemove = [];
                    var i = Meta['A'].playlist_position;
                    var x = 0;
                    while (i > 0)
                    {
                        toRemove.push(Playlists.active.tracks[x]);
                        x++;
                        i--;
                    }
                    sails.log.verbose(`We need to remove ${toRemove.length} tracks that already played.`);
                    sails.log.silly(toRemove);
                    if (toRemove.length > 0)
                    {
                        // Gotta go through each track that needs to be removed, careful to refresh the queue in memory after each removal.
                        var removetracks = function () {
                            return new Promise(async (resolve2, reject2) => {
                                try {
                                    var theFunction = function () {
                                        return new Promise(async (resolve3, reject3) => {
                                            try {
                                                var queue = await sails.helpers.rest.getQueue();
                                                var terminateloop = false;
                                                var loopposition = 1;

                                                // Loop through all the tracks in the queue
                                                while (!terminateloop && loopposition < queue.length)
                                                {
                                                    // If the track is a music track, remove it
                                                    if (toRemove.indexOf(queue[loopposition].ID) > -1)
                                                    {
                                                        terminateloop = true;
                                                        await sails.helpers.rest.cmd('RemovePlaylistTrack', loopposition - 1, 10000);
                                                        delete toRemove[toRemove.indexOf(queue[loopposition].ID)];

                                                        // We have to re-execute the entire function again after each time we remove something so we can load the new queue in memory and have correct position numbers.
                                                        setTimeout(async function () {
                                                            await theFunction();
                                                        }, 100);
                                                    }
                                                    loopposition += 1;
                                                }
                                                if (!terminateloop)
                                                    return resolve3();
                                            } catch (e) {
                                                return reject3(e);
                                            }
                                        });
                                    };
                                    await theFunction();
                                    return resolve2();
                                } catch (e) {
                                    return reject2(e);
                                }
                            });
                        };
                        await removetracks();
                    }
                    // Playlists
                } else if (inputs.type === 0)
                {
                    await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                    await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearGeneral, true); // Leave requests in the queue for standard playlists.
                    await sails.helpers.rest.cmd('EnableAssisted', 0);
                    await Attendance.createRecord(`Playlist: ${theplaylist.name}`);
                    await Meta.changeMeta({state: 'automation_playlist', playlist: theplaylist.name, playlist_position: -1, playlist_played: moment().toISOString(true)});
                    await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'primary', loglevel: 'success', logsubtype: 'playlist - ' + theplaylist.name, event: 'Playlist started.<br />Playlist: ' + inputs.name})
                            .tolerate((err) => {
                                sails.log.error(err);
                            });
                    await loadPlaylist();
                    await sails.helpers.rest.cmd('EnableAutoDJ', 1);

                    // Prerecords
                } else if (inputs.type === 1) {
                    await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                    await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, false, (Meta.automation[0] && (parseInt(Meta.automation[0].Duration) - parseInt(Meta.automation[0].Elapsed) > (sails.config.custom.liveSkip * 60))));
                    await sails.helpers.rest.cmd('EnableAssisted', 0);
                    await Meta.changeMeta({state: 'automation_prerecord', playlist: theplaylist.name, playlist_position: -1, playlist_played: moment().toISOString(true), dj: theplaylist.name, topic: await sails.helpers.truncateText(inputs.topic, 140)});
                    await loadPlaylist();
                    await sails.helpers.rest.cmd('EnableAutoDJ', 1);
                }
                if (!inputs.resume && !inputs.ignoreChangingState)
                    await Meta.changeMeta({changingState: null});
                return exits.success();
            } else {
                sails.log.verbose('Helper SKIPPED.');
                return exits.success();
            }
        } catch (e) {
            if (!inputs.resume && !inputs.ignoreChangingState)
                await Meta.changeMeta({changingState: null});
            Playlists.queuing = false;
            return exits.error(e);
        }
    }


};

