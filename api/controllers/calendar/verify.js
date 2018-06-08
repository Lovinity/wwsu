/* global sails, Playlists, Events, Playlists_list, Songs, Calendar, moment */

module.exports = {

    friendlyName: 'Calendar / Verify',

    description: 'Returns a page listing if there are any issues for automatically-triggering calendar events',

    inputs: {

    },

    exits: {
        success: {
            responseType: 'view',
            viewTemplatePath: 'calendar/verify'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/verify called.');

        try {
            var playlists = {};
            var events = {};
            var retData = [];

            // Load all the playlists into memory
            var playlistsR = await Playlists.find();
            sails.log.verbose(`Retrieved Playlists records: ${playlistsR.length}`);
            sails.log.silly(playlistsR);

            // Determine duration of the tracks in every playlist
            await sails.helpers.asyncForEach(playlistsR, function (playlist, index) {
                return new Promise(async (resolve, reject) => {
                    try {
                        var pTracks = await Playlists_list.find({pID: playlist.ID});
                        sails.log.verbose(`Retrieved Playlists_list records: ${pTracks.length}`);
                        sails.log.silly(pTracks);

                        var temp = [];
                        pTracks.forEach(function (track) {
                            temp.push(track.sID);
                        });

                        var songs = await Songs.find({ID: temp});
                        sails.log.verbose(`Retrieved Songs records: ${songs.length}`);
                        sails.log.silly(songs);

                        var duration = 0;
                        songs.forEach(function (song) {
                            duration += song.duration;
                        });

                        playlists[playlist.name] = ({ID: playlist.ID, name: playlist.name, duration: duration});
                        return resolve(false);
                    } catch (e) {
                        return reject(e);
                    }
                });
            });

            // Load all manual RadioDJ events into memory
            var eventsR = await Events.find({type: 3});
            sails.log.verbose(`Retrieved Events records: ${eventsR.length}`);
            sails.log.silly(eventsR);

            eventsR.forEach(function (event) {
                events[event.name] = event;
            });

            // Load all the calendar events into memory
            var calendar = await Calendar.find().sort('start ASC');
            sails.log.verbose(`Retrieved Calendar records: ${calendar.length}`);
            sails.log.silly(calendar);

            // Now go through each calendar event and check for validity
            await sails.helpers.asyncForEach(calendar, function (event, index) {
                return new Promise(async (resolve, reject) => {
                    try {
                        retData[index] = {};
                        var type = 'Manual';
                        var message = 'This was not detected as an event dealing with OnAir programming. If this event was meant to trigger OnAir programming, <strong>please ensure the event title formatting is correct and that everything is spelled correctly</strong>.';

                        // Live shows
                        if (event.title.startsWith("Show: ")) {
                            var summary = event.title.replace('Show: ', '');
                            var temp2 = summary.split(" - ");

                            // Check proper formatting so system can determine show host from show name
                            if (temp2.length === 2)
                            {
                                retData[index].title = `<span style="background: rgba(0, 0, 255, 0.2);">Show</span>: <span style="background: rgba(255, 255, 0, 0.2);">${temp2[0]}</span> - <span style="background: rgba(0, 255, 0, 0.2);">${temp2[1]}</span>`;
                                type = 'Valid';
                                message = `This is a valid live show. Detected DJ handle in yellow, show name in green.`;
                            } else {
                                retData[index].title = `<span style="background: rgba(0, 0, 255, 0.2);">Show</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                                type = 'Invalid';
                                message = `Although this was detected as a show, system could not determine what the DJ handle is versus what the show name is. <strong>Ensure the event title separates DJ handle from show name with a space hyphen space (" - ")</strong>. There should only be one of these in the title.`;
                            }

                            // Remote broadcasts
                        } else if (event.title.startsWith("Remote: ")) {
                            var summary = event.title.replace('Remote: ', '');
                            var temp2 = summary.split(" - ");

                            // Check proper formatting so system can determine broadcast host from broadcastn name
                            if (temp2.length === 2)
                            {
                                retData[index].title = `<span style="background: rgba(0, 0, 255, 0.2);">Remote</span>: <span style="background: rgba(255, 255, 0, 0.2);">${temp2[0]}</span> - <span style="background: rgba(0, 255, 0, 0.2);">${temp2[1]}</span>`;
                                type = 'Valid';
                                message = `This is a valid remote broadcast. Detected host / organization in yellow, broadcast name in green.`;
                            } else {
                                retData[index].title = `<span style="background: rgba(0, 0, 255, 0.2);">Remote</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                                type = 'Invalid';
                                message = `Although this was detected as a remote broadcast, system could not determine what the host / organization is versus what the name of the broadcast is. <strong>Ensure the event title separates host / organization from broadcast name with a space hyphen space (" - ")</strong>. There should only be one of these in the title.`;
                            }

                            // Sports broadcast
                        } else if (event.title.startsWith("Sports: ")) {
                            var summary = event.title.replace('Sports: ', '');

                            // Ensure the name of the sport is one that is implemented in the system.
                            if (sails.config.custom.sports.indexOf(summary))
                            {
                                retData[index].title = `<span style="background: rgba(0, 0, 255, 0.2);">Sports</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`;
                                type = 'Valid';
                                message = `This is a valid sports broadcast. Sport in green.`;
                            } else {
                                retData[index].title = `<span style="background: rgba(0, 0, 255, 0.2);">Sports</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                                type = 'Invalid';
                                message = `Although this was detected as a sports broadcast, the sport provided was not detected as a valid sport in the system. <strong>Please ensure you spelled the sport correctly, began the gender and the sport each with a capital letter, and the sport exists in the system</strong>. Please contact the engineer if this is a sport we have not programmed into the system yet. If this is not fixed, appropriate openers, closers, and liners may not play during the broadcast!`;
                            }

                            // Prerecord (via RadioDJ Playlists)
                        } else if (event.title.startsWith("Prerecord: ")) {
                            var summary = event.title.replace('Prerecord: ', '');
                            var eventLength = (moment(event.end).diff(moment(event.start)) / 1000);
                            retData[index].title = `<span style="background: rgba(0, 0, 255, 0.2);">Prerecord</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                            type = 'Invalid';
                            message = `Although this was detected as a prerecord, the playlist name highlighted in red does not exist in RadioDJ. <strong>Please ensure the playlist exists and that you spelled it correctly</strong>. If this is not fixed, the prerecord probably will not air!`;

                            // Check to see a playlist exists
                            if (typeof playlists[summary] !== 'undefined')
                            {
                                retData[index].title = `<span style="background: rgba(0, 0, 255, 0.2);">Prerecord</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`;

                                // Check to see if the length of the playlists are over 15 minutes too short
                                if ((eventLength - 900) >= (playlists[summary].duration * 1.05)) // * 1.05 because this assumes 1 minute of break for every 20 minutes of programming
                                {
                                    type = 'Check';
                                    message = `This is a valid prerecord, and the playlist highlighted in green exists in RadioDJ. However, the duration of the tracks in the saved playlist is significantly short. To avoid this segment ending early, <strong>add about ${moment.duration((eventLength - (playlists[summary].duration * 1.05)), 'seconds').humanize()} more audio</strong> to the playlist.`;

                                    // Check to see if the playlist is over 5 minutes too long
                                } else if ((eventLength + 300) <= (playlists[summary].duration * 1.05))
                                {
                                    type = 'Check';
                                    message = `This is a valid prerecord, and the playlist highlighted in green exists in RadioDJ. However, the duration of the tracks in the saved playlist is too long. This could prevent other DJs from signing on the air, or other segments from playing. If this is not fixed, <strong>the prerecord could run over the end time by about ${moment.duration(((playlists[summary].duration * 1.05) - eventLength), 'seconds').humanize()}</strong>.`;
                                } else {
                                    type = 'Valid';
                                    message = `This is a valid prerecord, and the playlist highlighted in green exists in RadioDJ.`;
                                }
                            }

                            // Playlists (RadioDJ)
                        } else if (event.title.startsWith("Playlist: ")) {
                            var summary = event.title.replace('Playlist: ', '');
                            var eventLength = (moment(event.end).diff(moment(event.start)) / 1000);
                            retData[index].title = `<span style="background: rgba(0, 0, 255, 0.2);">Playlist</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                            type = 'Invalid';
                            message = `Although this was detected as a playlist, the playlist name highlighted in red does not exist in RadioDJ. <strong>Please ensure the playlist exists and that you spelled it correctly</strong>. If this is not fixed, the playlist probably will not air!`;

                            // Check to see that playlist exists
                            if (typeof playlists[summary] !== 'undefined')
                            {
                                retData[index].title = `<span style="background: rgba(0, 0, 255, 0.2);">Playlist</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`;

                                // Check to see if the playlist duration is shorter than the event duration
                                if (eventLength <= (playlists[summary].duration * 1.05))
                                {
                                    type = 'Valid';
                                    message = `This is a valid playlist, and the playlist highlighted in green exists in RadioDJ.`;
                                } else {
                                    type = 'Check';
                                    message = `This is a valid playlist, and the playlist highlighted in green exists in RadioDJ. However, the duration of the tracks in the saved playlist is less than the duration of this event. To avoid this segment ending early, <strong>add about ${moment.duration((eventLength - (playlists[summary].duration * 1.05)), 'seconds').humanize()} more audio</strong> to the playlist.`;
                                }
                            }

                            // Genre rotations (via manual events in RadioDJ)
                        } else if (event.title.startsWith("Genre: ")) {
                            var summary = event.title.replace('Genre: ', '');
                            retData[index].title = `<span style="background: rgba(0, 0, 255, 0.2);">Genre</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                            type = 'Invalid';
                            message = `Although this was detected as a genre, a manual event was not detected in RadioDJ matching the name of this genre. <strong>Please ensure the RadioDJ event exists.</strong>. The event should trigger a rotation change in RadioDJ when executed.`;

                            // Check to see if the manual event exists in RadioDJ
                            if (typeof events[summary] !== 'undefined')
                            {
                                retData[index].title = `<span style="background: rgba(0, 0, 255, 0.2);">Genre</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`;

                                // Check to see the event is active, and there is a "Load Rotation" action in the event
                                if (events[summary].data.includes("Load Rotation") && events[summary].enabled === "True")
                                {
                                    type = `Valid`;
                                    message = `This is a valid genre, and the manual RadioDJ event highlighted in green exists.`;

                                    // Event is enabled, but does not have a Load Rotation event
                                } else if (events[summary].enabled === "True") {
                                    type = 'Check';
                                    message = `This is a valid genre, and the manual RadioDJ event highlighted in green exists. However, a "Load Rotation" action was not defined in this event. No rotation changes will happen when this genre executes. <strong>To ensure rotation changes, make sure the RadioDJ event has a "Load Rotation" action.</strong>`;

                                    // Event is not enabled
                                } else {
                                    type = 'Invalid';
                                    message = `This is a valid genre, and the manual RadioDJ event highlighted in green exists. However, the manual event is disabled. <strong>Please enable the manual event in RadioDJ</strong>, or the rotation will not change.`;
                                }
                            }
                        } else {
                            retData[index].title = `<span style="background: rgba(128, 128, 128, 0.2);">${retData[index].title}</span>`;
                        }
                        retData[index].type = type;
                        retData[index].message = message;

                        sails.log.silly(`${index}: ${retData[index]}`);

                        return resolve(false);
                    } catch (e) {
                        return reject(e);
                    }
                });
            });

            return exits.success({data: retData});
        } catch (e) {
            return exits.error(e);
        }
    }


};
