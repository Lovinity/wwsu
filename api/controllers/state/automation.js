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

        try {
            // Block if we are in the process of changing states
            if (Meta['A'].changingState !== null)
                return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`));

            // Lock system from any other state changing requests until we are done.
            await Meta.changeMeta({changingState: `Changing to automation / calculating show stats`});

            // What to return for DJ Controls show stats, if applicable
            var returnData = {showTime: 0};

            // Log the request
            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'sign-off', loglevel: 'primary', logsubtype: Meta['A'].show, event: '<strong>Show ended.</strong>'}).fetch()
                    .tolerate((err) => {
                        // Do not throw for error, but log it
                        sails.log.error(err);
                    });

            // Duplicate current meta dj since it's about to change; we need it for stats calculations
            var dj = Meta['A'].dj;
            var attendanceID = Meta['A'].attendanceID;
            var djcontrols = Meta['A'].djcontrols;
            var showStamp = Meta['A'].showStamp;

            // Prepare RadioDJ; we want to get something playing before we begin the intensive processes in order to avoid a long silence period.
            await sails.helpers.rest.cmd('EnableAssisted', 1);

            // If coming out of a sports broadcast, queue a closer if exists.
            if (Meta['A'].state.startsWith("sports"))
            {
                if (typeof sails.config.custom.sportscats[Meta['A'].show] !== 'undefined')
                {
                    await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].show]["Sports Closers"]], 'Bottom', 1);
                }
            } else {
                if (typeof sails.config.custom.showcats[Meta['A'].show] !== 'undefined')
                    await sails.helpers.songs.queue([sails.config.custom.showcats[Meta['A'].show]["Show Closers"]], 'Bottom', 1);
            }

            // Queue a station ID
            await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);

            // Start playing something
            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
            Status.errorCheck.prevID = moment();
            await sails.helpers.error.count('stationID');

            // Queue ending stuff
            if (Meta['A'].state.startsWith("live_"))
                await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.live.end);

            if (Meta['A'].state.startsWith("remote_"))
                await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.end);

            if (Meta['A'].state.startsWith("sports_") || Meta['A'].state.startsWith("sportsremote_"))
                await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.end);

            // Queue a random PSA in case Google Calendar takes a while
            await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Bottom', 1);

            // We are going to automation
            if (!inputs.transition)
            {
                await Meta.changeMeta({genre: '', state: 'automation_on', show: '', track: '', djcontrols: '', topic: '', webchat: true, playlist: null, lastID: moment().toISOString(true), playlist_position: -1, playlist_played: moment('2002-01-01').toISOString()});
                await sails.helpers.error.reset('automationBreak');

                // Add up to 3 track requests if any are pending
                await sails.helpers.requests.queue(3, true, true);

                // Re-load google calendar events to check for, and execute, any playlists/genres/etc that are scheduled.
                try {
                    await Calendar.preLoadEvents(true);
                } catch (e2) {
                    // Couldn't load calendar? Fall back to Default automation
                    await sails.helpers.genre.start('Default', true);
                }

                // Enable Auto DJ
                await sails.helpers.rest.cmd('EnableAutoDJ', 1);

                // We are going to break
            } else {
                await Meta.changeMeta({genre: '', state: 'automation_break', show: '', track: '', djcontrols: '', topic: '', webchat: true, playlist: null, lastID: moment().toISOString(true), playlist_position: -1, playlist_played: moment('2002-01-01').toISOString()});
                await Attendance.createRecord(`Genre: Default`);
            }

            // Finish up
            await sails.helpers.songs.queuePending();
            await sails.helpers.rest.cmd('EnableAssisted', 0);




            // Calculate XP and other stats
            var attendance = await Attendance.findOne({ID: attendanceID});

            if (dj !== null)
                returnData.subtotalXP = 0;

            // Award XP based on time on the air
            returnData.showTime = moment().diff(moment(showStamp), 'minutes');

            if (dj !== null)
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

            // Grab listener minutes from attendance record, and award XP as necessary
            returnData.listenerMinutes = attendance.listenerMinutes || 0;

            if (dj !== null)
            {
                returnData.listenerXP = Math.round(returnData.listenerMinutes / sails.config.custom.XP.listenerMinutes);
                returnData.subtotalXP += returnData.listenerXP;
                await Xp.create({dj: dj, type: 'xp', subtype: 'listeners', amount: returnData.listenerXP, description: `DJ had ${returnData.listenerMinutes} online listener minutes during their show.`})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                            returnData.subtotalXP -= returnData.listenerXP;
                            delete returnData.listenerXP;
                        });
            }

            // Earn XP for sending messages to website visitors
            returnData.messagesWeb = await Messages.count({from: djcontrols, to: {startsWith: 'website'}, createdAt: {'>=': moment(showStamp).toISOString(true)}})
                    .tolerate((err) => {
                        // Do not throw for error, but log it
                        sails.log.error(err);
                    });
            if (returnData.messagesWeb)
            {
                if (dj !== null)
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
            if (dj !== null)
            {
                returnData.topAdds = await Xp.count({dj: dj, type: 'xp', subtype: 'topadd', createdAt: {'>=': moment(showStamp).toISOString(true)}})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });
            }

            if (dj !== null)
            {
                returnData.topAddsXP = await Xp.sum('amount', {dj: dj, type: 'xp', subtype: 'topadd', createdAt: {'>=': moment(showStamp).toISOString(true)}})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });
                returnData.subtotalXP += returnData.topAddsXP || 0;
            }

            // Calculate XP earned this show from doing the mandatory Legal IDs
            if (dj !== null)
            {
                returnData.IDsXP = await Xp.sum('amount', {dj: dj, type: 'xp', subtype: 'id', createdAt: {'>=': moment(showStamp).toISOString(true)}})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });
                returnData.subtotalXP += returnData.IDsXP || 0;
            }

            // Calculate a DJ's total XP earned ever
            if (dj !== null)
            {
                returnData.totalXP = await Xp.sum('amount', {dj: dj, type: {'!=': 'remote'}})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });
            }

            if (dj !== null)
            {
                // Add to total XP for remote credits
                returnData.totalXP += (sails.config.custom.XP.remoteCredit * await Xp.sum('amount', {dj: dj, type: 'remote'})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        }) || 0);
            }

            if (dj !== null)
            {
                // Calculate a DJ's remote credits for the semester
                returnData.remoteCredits = await Xp.sum('amount', {dj: dj, type: 'remote', createdAt: {'>=': moment(sails.config.custom.startOfSemester).toISOString(true)}})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });
            }

            // Calculate a DJ's total OnAir time ever
            if (dj !== null)
            {
                returnData.totalShowTime = await Attendance.sum('showTime', {dj: dj})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });
            }

            // Calculate a DJ's total listener time
            if (dj !== null)
            {
                returnData.totalListenerMinutes = await Attendance.sum('listenerMinutes', {dj: dj})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });
            }

            await Meta.changeMeta({changingState: null});
            return exits.success(returnData);

        } catch (e) {
            await Meta.changeMeta({changingState: null});
            return exits.error(e);
        }

    }


};
