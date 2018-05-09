var moment = require("moment");

// CHECK OVER
module.exports = {

    friendlyName: 'Rest / Start playlist',

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
        end: {
            type: 'string',
            allowNull: true,
            description: 'ISO string of when the playlist is to end (needed for genre playlist types).'
        },
        type: {
            type: 'number',
            defaultsTo: 0,
            min: 0,
            max: 2,
            description: '0 = standard playlist, 1 = prerecord, 2 = genre (randomized) playlist'
        },
        topic: {
            type: 'string',
            defaultsTo: '',
            description: 'Topic to set on the metadata when this playlist plays (prerecord).'
        }
    },

    fn: async function (inputs, exits) {
        try {
            if (!Playlists.queuing && ((Meta['A'].state == 'automation_on' || Meta['A'].state == 'automation_playlist' || Meta['A'].state == 'automation_genre') || inputs.resume))
            {
                Playlists.active.end = inputs.end;
                Playlists.queuing = true;
                var theplaylist = await Playlists.findOne({name: inputs.name})
                        .intercept((err) => {
                            return exits.error(err);
                        });
                if (!theplaylist)
                    return exits.error();
                Playlists.active.name = theplaylist.name;
                Playlists.active.ID = theplaylist.ID;
                if (!inputs.resume)
                    Playlists.active.position = 0;
                Playlists.played = moment();
                var playlistTracks = await Playlists_list.find({pID: theplaylist.ID})
                        .intercept((err) => {
                            return exits.error(err);
                        });
                if (!playlistTracks)
                    return exits.error();
                Playlists.active.tracks = [];
                playlistTracks.forEach(function (playlistTrack) {
                    Playlists.active.tracks.push(playlistTrack.sID);
                });
                await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                await sails.helpers.rest.removeMusic();
                await sails.helpers.rest.cmd('EnableAssisted', 0);
                var finishIt = function () {};
                var queueTrack = function (track) {
                    return new Promise(async (resolve2) => {
                        await sails.helpers.rest.cmd('LoadTrackToBottom', track);
                        return resolve2();
                    });
                };
                var x = Playlists.active.position;
                var loopArray = async function (arr) {
                    if (typeof arr[x] != 'undefined')
                    {
                        await queueTrack(arr[x]);
                        setTimeout(function () {
                            x++;

                            // any more items in array? continue loop
                            if (x < arr.length && ((inputs.type != 2 && Meta['A'].state != 'automation_genre') || inputs.end === null || moment(inputs.end).diff(moment(), 'minutes') > (x * 3))) {
                                loopArray(arr);
                            } else {
                                Playlists.queuing = false;
                                finishIt();
                            }
                        }, 500);
                    } else {
                        x++;

                        // any more items in array? continue loop
                        if (x < arr.length && ((inputs.type != 2 && Meta['A'].state != 'automation_genre') || inputs.end === null || moment(inputs.end).diff(moment(), 'minutes') > (x * 3))) {
                            loopArray(arr);
                        } else {
                            Playlists.queuing = false;
                            finishIt();
                        }
                    }
                }
                if (inputs.resume)
                {
                    finishIt = function () {
                        sails.helpers.rest.cmd('EnableAutoDJ', 1);
                    };
                    loopArray(Playlists.active.tracks);
                } else if (inputs.type == 0)
                {
                    finishIt = function () {
                        sails.helpers.rest.cmd('EnableAutoDJ', 1);
                    };
                    await Meta.changeMeta({state: 'automation_playlist', playlist: theplaylist.name, playlist_position: -1, playlist_played: moment().toISOString()})
                    await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: 'playlist - ' + theplaylist.name, event: 'A playlist was scheduled to start.' + "\n" + 'Playlist: ' + inputs.name})
                            .intercept((err) => {
                                sails.log.error(err);
                            });
                    loopArray(Playlists.active.tracks);
                } else if (inputs.type == 1) {
                    finishIt = function () {
                        sails.helpers.rest.cmd('EnableAutoDJ', 1);
                    };
                    Statemeta.final.state = 'automation_prerecord';
                    await Meta.changeMeta({state: 'automation_prerecord', playlist: theplaylist.name, playlist_position: -1, playlist_played: moment().toISOString(), live: theplaylist.name, topic: await sails.helpers.truncateText(inputs.topic, 140)})
                    await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: theplaylist.name, event: 'A prerecorded show was scheduled to start.' + "\n" + 'Show: ' + inputs.name})
                            .intercept((err) => {
                                sails.log.error(err);
                            });
                    loopArray(Playlists.active.tracks);
                } else if (inputs.type == 2) {
                    // We shuffle genre playlist tracks by shuffling the orders
                    var ordersa = [];
                    await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: 'automation', event: 'A genre playlist was scheduled to start.' + "\n" + 'Playlist: ' + inputs.name})
                            .intercept((err) => {
                                sails.log.error(err);
                            });
                    ordersa = await sails.helpers.shuffle(playlistTracks);
                    var countsleft = playlistTracks.length;
                    var afterFunction = function () {
                        return new Promise(async (resolve2, reject2) => {
                            try {
                                countsleft -= 1;
                                //sails.log.error(new Error(`${countsleft} processes remaining`));
                                if (countsleft < 1)
                                {
                                    finishIt = function () {
                                        sails.helpers.rest.cmd('EnableAutoDJ', 1);
                                    };
                                    await Meta.changeMeta({state: 'automation_genre', playlist: theplaylist.name, playlist_position: -1, playlist_played: moment().toISOString()});
                                    loopArray(Playlists.active.tracks);
                                }
                            } catch (e2) {
                                return reject2(e2);
                            }
                            return resolve2();
                        });
                    }
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
                            return resolve2();
                        });
                    });
                }
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};

