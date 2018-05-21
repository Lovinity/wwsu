/* global Meta, Playlists, Playlists_list, sails, Logs, Statemeta, _ */

var moment = require("moment");

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
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper playlists.start called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            if (!Playlists.queuing && ((Meta['A'].state === 'automation_on' || Meta['A'].state === 'automation_playlist' || Meta['A'].state === 'automation_genre') || inputs.resume))
            {
                sails.log.verbose(`Processing helper.`);
                Playlists.queuing = true;
                var theplaylist = await Playlists.findOne({name: inputs.name})
                        .intercept((err) => {
                            return exits.error(err);
                        });
                sails.log.silly(`Playlist: ${theplaylist}`);
                if (!theplaylist)
                    return exits.error();
                Playlists.active.name = theplaylist.name;
                Playlists.active.ID = theplaylist.ID;
                if (!inputs.resume)
                    Playlists.active.position = 0;
                Playlists.played = moment();
                await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                await sails.helpers.rest.removeMusic();
                await sails.helpers.rest.cmd('EnableAssisted', 0);

                // This private function will load the playlist from the variable theplaylist, gather playlist tracks in memory, wait until deemed queued, then resolve.
                var loadPlaylist = function () {
                    return new Promise(async (resolve2, reject2) => {
                        try {
                            await sails.helpers.rest.cmd('LoadPlaylist', theplaylist.ID);
                            var playlistTracks = await Playlists_list.find({pID: theplaylist.ID})
                                    .intercept((err) => {
                                        return reject2(err);
                                    });
                            sails.log.verbose(`Playlists_list records retrieved: ${playlistTracks.length}`);
                            sails.log.silly(playlistTracks);
                            if (!playlistTracks)
                                return reject2();
                            Playlists.active.tracks = [];
                            playlistTracks.forEach(function (playlistTrack) {
                                Playlists.active.tracks.push(playlistTrack.sID);
                            });
                            var slot = 10;
                            var prevLength = 0;
                            sails.log.verbose(`Waiting for playlist queue...`);
                            var theFunction = function () {
                                try {
                                    var tracks = Meta.automation;

                                    // If the number of tracks detected in queue is less than or equal to the previous check, count down on the slot counter.
                                    if (tracks.length <= prevLength)
                                    {
                                        slot -= 1;
                                        // Consider playlist as finished queuing if counter reaches zero.
                                        if (slot <= 0)
                                        {
                                            Playlists.queuing = false;
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
                if (inputs.resume)
                {
                    await loadPlaylist();
                    await sails.helpers.rest.cmd('EnableAutoDJ', 1);

                    // If we are resuming, we need to remove tracks that already played;
                    var toRemove = [];
                    var i = Playlists.active.position;
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
                                    var theFunction = async function () {
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
                                                    setTimeout(function () {
                                                        theFunction();
                                                    }, 100);
                                                }
                                                loopposition += 1;
                                            }
                                            if (!terminateloop)
                                                return resolve2();
                                        } catch (e) {
                                            return reject2(e);
                                        }
                                    }
                                    theFunction();
                                } catch (e) {
                                    return reject2(e);
                                }
                            });
                        };
                        await removetracks();
                    }
                } else if (inputs.type === 0)
                {
                    await Meta.changeMeta({state: 'automation_playlist', playlist: theplaylist.name, playlist_position: -1, playlist_played: moment().toISOString()});
                    await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: 'playlist - ' + theplaylist.name, event: 'A playlist was scheduled to start.' + "\n" + 'Playlist: ' + inputs.name})
                            .intercept((err) => {
                                sails.log.error(err);
                            });
                    await loadPlaylist();
                    await sails.helpers.rest.cmd('EnableAutoDJ', 1);
                } else if (inputs.type === 1) {
                    await Meta.changeMeta({state: 'automation_prerecord', playlist: theplaylist.name, playlist_position: -1, playlist_played: moment().toISOString(), live: theplaylist.name, topic: await sails.helpers.truncateText(inputs.topic, 140)});
                    await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: theplaylist.name, event: 'A prerecorded show was scheduled to start.' + "\n" + 'Show: ' + inputs.name})
                            .intercept((err) => {
                                sails.log.error(err);
                            });
                    await loadPlaylist();
                    await sails.helpers.rest.cmd('EnableAutoDJ', 1);
                    /* DEPRECATED
                     } else if (inputs.type === 2) {
                     // We shuffle genre playlist tracks by shuffling the orders
                     var ordersa = [];
                     await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: 'automation', event: 'A genre playlist was scheduled to start.' + "\n" + 'Playlist: ' + inputs.name})
                     .intercept((err) => {
                     sails.log.error(err);
                     });
                     ordersa = await sails.helpers.shuffle(playlistTracks);
                     sails.log.silly(`Tracks shuffled. New order: ${ordersa}`);
                     var countsleft = playlistTracks.length;
                     var afterFunction = function () {
                     return new Promise(async (resolve2, reject2) => {
                     try {
                     countsleft -= 1;
                     sails.log.silly(`afterFunction called. countsleft: ${countsleft}`);
                     //sails.log.error(new Error(`${countsleft} processes remaining`));
                     if (countsleft < 1)
                     {
                     finishIt = async function () {
                     sails.log.verbose(`finishIt called.`);
                     await sails.helpers.rest.cmd('EnableAutoDJ', 1);
                     };
                     await Meta.changeMeta({state: 'automation_genre', playlist: theplaylist.name, playlist_position: -1, playlist_played: moment().toISOString()});
                     loopArray(Playlists.active.tracks);
                     }
                     } catch (e2) {
                     return reject2(e2);
                     }
                     return resolve2();
                     });
                     };
                     Playlists.active.tracks = [];
                     await sails.helpers.asyncForEach(ordersa, function (playlistTrack, index) {
                     return new Promise(async (resolve2, reject2) => {
                     try {
                     Playlists.active.tracks.push(playlistTrack.sID);
                     await Playlists_list.update({ID: playlistTrack.ID}, {ord: index})
                     .intercept((err) => {
                     return reject2(err);
                     });
                     await afterFunction();
                     } catch (e2) {
                     return reject2(e2);
                     }
                     return resolve2(false);
                     });
                     });
                     */
                }
                exits.success();
            } else {
                sails.log.verbose('Helper SKIPPED.');
                exits.success();
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};

