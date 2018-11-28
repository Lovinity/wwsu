/* global Meta, sails, Logs, Status, Playlists, Calendar, moment, Listeners, Xp, Messages, Attendance */
const UrlSafeString = require('url-safe-string'),
        tagGenerator = new UrlSafeString();


module.exports = {

    friendlyName: 'State / Automation',

    description: 'Request to go into automation mode.',

    inputs: {
        transition: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, system will go into break mode instead of automation to allow for quick transitioning between radio shows.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller state/automation called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Block if we are in the process of changing states
            if (Meta['A'].changingState !== null)
                return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`));

            // Lock system from any other state changing requests until we are done.
            await Meta.changeMeta({changingState: `Changing to automation`});

            // What to return for DJ Controls show stats, if applicable
            var returnData = {showTime: 0};

            // Log the request
            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'sign-off', loglevel: 'primary', logsubtype: Meta['A'].dj, event: 'Show ended.'})
                    .tolerate((err) => {
                        // Do not throw for error, but log it
                        sails.log.error(err);
                    });

            // Prepare RadioDJ; we want to get something playing before we begin the intensive processes in order to avoid a long silence period.
            await sails.helpers.rest.cmd('EnableAssisted', 1);

            // If coming out of a sports broadcast, queue a closer if exists.
            if (Meta['A'].state.startsWith("sports"))
            {
                if (typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                {
                    await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Closers"]], 'Bottom', 1);
                }
            } else {
                if (typeof sails.config.custom.showcats[Meta['A'].dj] !== 'undefined')
                    await sails.helpers.songs.queue([sails.config.custom.showcats[Meta['A'].dj]["Show Closers"]], 'Bottom', 1);
            }

            // Queue a station ID
            await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);

            // Start playing something
            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
            Status.errorCheck.prevID = moment();
            await sails.helpers.error.count('stationID');

            // Queue a random music track in case Google Calendar takes a while
            if (!inputs.transition)
            {
                await sails.helpers.songs.queue(sails.config.custom.subcats.music, 'Bottom', 1);
            } else {
                await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Bottom', 1);
            }

            // Finish up
            await sails.helpers.songs.queuePending();
            await sails.helpers.rest.cmd('EnableAssisted', 0);

            // Calculate XP and other stats
            var dj = Meta['A'].dj;
            if (dj.includes(" - "))
            {
                dj = dj.split(" - ")[0];
            }

            if (Meta['A'].state.startsWith("live_"))
                returnData.subtotalXP = 0;

            // Award XP based on time on the air
            returnData.showTime = moment().diff(moment(Meta['A'].showStamp), 'minutes');

            if (Meta['A'].state.startsWith("live_"))
            {
                returnData.showXP = Math.round(returnData.showTime / sails.config.custom.XP.showMinutes);
                returnData.subtotalXP += returnData.showXP;
                await Xp.create({dj: dj, type: 'xp', subtype: 'showtime', amount: returnData.showXP, description: `DJ was on the air for ${returnData.showTime} minutes.`})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                            returnData.subtotalXP -= returnData.showXP;
                            delete returnData.showXP;
                        });
            }

            // Calculate number of listener minutes for the show, and award XP based on configured values.
            var listenerMinutes = 0;
            returnData.listeners = await Listeners.find({dj: dj, createdAt: {'>=': moment(Meta['A'].showStamp).toISOString(true)}}).sort("createdAt ASC")
                    .tolerate((err) => {
                        // Do not throw for error, but log it
                        sails.log.error(err);
                    });

            if (returnData.listeners && returnData.listeners.length > 0)
            {
                var prevTime = moment(Meta['A'].showStamp);
                var prevListeners = 0;
                returnData.listeners.map(listener => {
                    listenerMinutes += (moment(listener.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
                    prevListeners = listener.listeners;
                    prevTime = moment(listener.createdAt);
                });

                returnData.listeners.push({ID: null, listeners: prevListeners, createdAt: moment(Meta['A'].time).toISOString(), updatedAt: moment(Meta['A'].time).toISOString()})

                // This is to ensure listener minutes from the most recent entry up until the current time is also accounted for
                listenerMinutes += (moment().diff(moment(prevTime), 'seconds') / 60) * prevListeners;

                listenerMinutes = Math.round(listenerMinutes);
                returnData.listenerMinutes = listenerMinutes;

                if (Meta['A'].state.startsWith("live_"))
                {
                    returnData.listenerXP = Math.round(listenerMinutes / sails.config.custom.XP.listenerMinutes);
                    returnData.subtotalXP += returnData.listenerXP;
                    await Xp.create({dj: dj, type: 'xp', subtype: 'listeners', amount: returnData.listenerXP, description: `DJ had ${returnData.listenerMinutes} online listener minutes during their show.`})
                            .tolerate((err) => {
                                // Do not throw for error, but log it
                                sails.log.error(err);
                                returnData.subtotalXP -= returnData.listenerXP;
                                delete returnData.listenerXP;
                            });
                }
            }

            // Earn XP for sending messages to website visitors
            returnData.messagesWeb = await Messages.count({from: Meta['A'].djcontrols, to: {startsWith: 'website'}, createdAt: {'>=': moment(Meta['A'].showStamp).toISOString(true)}})
                    .tolerate((err) => {
                        // Do not throw for error, but log it
                        sails.log.error(err);
                    });
            if (returnData.messagesWeb)
            {
                if (Meta['A'].state.startsWith("live_"))
                {
                    returnData.messagesXP = Math.round(returnData.messagesWeb * sails.config.custom.XP.web);
                    returnData.subtotalXP += returnData.messagesXP;
                    await Xp.create({dj: dj, type: 'xp', subtype: 'messages', amount: returnData.messagesXP, description: `DJ sent ${returnData.messagesWeb} messages to web visitors during their show.`})
                            .tolerate((err) => {
                                // Do not throw for error, but log it
                                sails.log.error(err);
                                returnData.subtotalXP -= returnData.messagesXP;
                                delete returnData.messagesXP;
                            });
                }
            }


            // Calculate XP earned this show from Top Adds
            returnData.topAdds = await Xp.count({dj: dj, type: 'xp', subtype: 'topadd', createdAt: {'>=': moment(Meta['A'].showStamp).toISOString(true)}})
                    .tolerate((err) => {
                        // Do not throw for error, but log it
                        sails.log.error(err);
                    });

            if (Meta['A'].state.startsWith("live_"))
            {
                returnData.topAddsXP = await Xp.sum('amount', {dj: dj, type: 'xp', subtype: 'topadd', createdAt: {'>=': moment(Meta['A'].showStamp).toISOString(true)}})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });
                returnData.subtotalXP += returnData.topAddsXP || 0;
            }

            // Calculate XP earned this show from doing the mandatory Legal IDs
            if (Meta['A'].state.startsWith("live_"))
            {
                returnData.IDsXP = await Xp.sum('amount', {dj: dj, type: 'xp', subtype: 'id', createdAt: {'>=': moment(Meta['A'].showStamp).toISOString(true)}})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });
                returnData.subtotalXP += returnData.IDsXP || 0;
            }

            // Calculate a DJ's total XP earned ever
            if (Meta['A'].state.startsWith("live_"))
            {
                returnData.totalXP = await Xp.sum('amount', {dj: dj, type: {'!=': 'remote'}})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });
            }

            // Add to total XP for remote credits
            returnData.totalXP += (sails.config.custom.XP.remoteCredit * await Xp.sum('amount', {dj: dj, type: 'remote'})
                    .tolerate((err) => {
                        // Do not throw for error, but log it
                        sails.log.error(err);
                    }) || 0);

            // We are going to automation
            if (!inputs.transition)
            {
                await Meta.changeMeta({genre: '', state: 'automation_on', dj: '', track: '', djcontrols: '', topic: '', webchat: true, playlist: null, lastID: moment().toISOString(true), playlist_position: -1, playlist_played: moment('2002-01-01').toISOString()});
                await sails.helpers.error.reset('automationBreak');

                // Add up to 3 track requests if any are pending
                await sails.helpers.requests.queue(3, true, true);

                // Re-load google calendar events to check for, and execute, any playlists/genres/etc that are scheduled.
                await Calendar.preLoadEvents(true);

                // Enable Auto DJ
                await sails.helpers.rest.cmd('EnableAutoDJ', 1);

                // We are going to break
            } else {
                await Attendance.createRecord(`Genre: Default`);

                await Meta.changeMeta({genre: '', state: 'automation_break', dj: '', track: '', djcontrols: '', topic: '', webchat: true, playlist: null, lastID: moment().toISOString(true), playlist_position: -1, playlist_played: moment('2002-01-01').toISOString()});
            }

            await Meta.changeMeta({changingState: null});
            return exits.success(returnData);

        } catch (e) {
            await Meta.changeMeta({changingState: null});
            return exits.error(e);
        }

    }


};
