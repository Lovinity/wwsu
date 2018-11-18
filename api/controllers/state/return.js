/* global sails, Meta, Logs, moment, Status, Xp */
const UrlSafeString = require('url-safe-string'),
        tagGenerator = new UrlSafeString();

module.exports = {

    friendlyName: 'State / Return',

    description: 'Return from a break.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller state/return called.');

        try {
            // Block this request if we are already changing states
            if (Meta['A'].changingState !== null)
                return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`));
            
            // Lock so that other state changing requests get blocked until we are done
            await Meta.changeMeta({changingState: `Returning from break`});

            // log it
            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'return', loglevel: 'info', logsubtype: Meta['A'].dj, event: 'Return from break requested.'})
                    .tolerate((err) => {
                        // Don't throw errors, but log them
                        sails.log.error(err);
                    });

            await sails.helpers.rest.cmd('EnableAssisted', 1);

            // Remove clearBreak tracks to speed up the return
            await sails.helpers.songs.remove(false, sails.config.custom.subcats.clearBreak, false, false, true);

            // Perform the break
            
            // If returning from a halftime break...
            if (Meta['A'].state.includes('halftime'))
            {
                // Queue a legal ID
                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                
                // Queue a sports liner
                if (typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                    await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Liners"]], 'Bottom', 1);

                // Change state
                if (Meta['A'].state === 'sportsremote_halftime' || Meta['A'].state === 'sportsremote_halftime_disconnected')
                {
                    await Meta.changeMeta({queueLength: await sails.helpers.songs.calculateQueueLength(), state: 'sportsremote_returning'});
                } else {
                    await Meta.changeMeta({queueLength: await sails.helpers.songs.calculateQueueLength(), state: 'sports_returning'});
                }
                
                
            } else {
                var d = new Date();
                var num = d.getMinutes();
                
                // Queue station IDs if after :50 and before :10, or if it's been an hour or more since the last station ID.
                if (num >= 50 || num < 10 || Status.errorCheck.prevID === null || moment().diff(moment(Status.errorCheck.prevID)) > (60 * 60 * 1000))
                {
                    // Liners for sports broadcasts, promos for others.
                    if (Meta['A'].state.startsWith("sports") && typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                    {
                        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                        await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Liners"]], 'Bottom', 1);
                    } else {
                        await sails.helpers.songs.queue(sails.config.custom.subcats.promos, 'Bottom', 1);
                        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                    }

                    // Earn XP for doing the top of the hour ID break, if the show is live
                    if (Meta['A'].state.startsWith("live_"))
                    {
                        var dj = Meta['A'].dj;
                        if (dj.includes(" - "))
                        {
                            dj = dj.split(" - ")[0];
                        }
                        await Xp.create({dj: dj, type: 'xp', subtype: 'id', amount: sails.config.custom.XP.ID, description: "DJ played an on-time Top of the Hour ID break."})
                                .tolerate((err) => {
                                    // Do not throw for error, but log it
                                    sails.log.error(err);
                                });
                    }

                    Status.errorCheck.prevID = moment();
                    Status.errorCheck.prevBreak = moment();
                    await sails.helpers.error.count('stationID');
                } else {
                    // Liners for sports broadcasts
                    if (Meta['A'].state.startsWith("sports") && typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                    {
                        await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Liners"]], 'Bottom', 1);
                    } else {
                        await sails.helpers.songs.queue(sails.config.custom.subcats.sweepers, 'Bottom', 1);
                    }
                    Status.errorCheck.prevBreak = moment();
                }

                // Do stuff depending on the state
                switch (Meta['A'].state)
                {
                    case 'live_break':
                        
                        // Queue a show return if there is one
                        if (typeof sails.config.custom.showcats[Meta['A'].dj] !== 'undefined')
                        {
                            await sails.helpers.songs.queue([sails.config.custom.showcats[Meta['A'].dj]["Show Returns"]], 'Bottom', 1);
                        } else {
                            await sails.helpers.songs.queue([sails.config.custom.showcats["Default"]["Show Returns"]], 'Bottom', 1);
                        }
                        
                        await Meta.changeMeta({queueLength: await sails.helpers.songs.calculateQueueLength(), state: 'live_returning'});
                        break;
                    case 'sports_break':
                        await Meta.changeMeta({queueLength: await sails.helpers.songs.calculateQueueLength(), state: 'sports_returning'});
                        break;
                    case 'remote_break':
                    case 'remote_break_disconnected':
                        // Queue a show return if there is one
                        if (typeof sails.config.custom.showcats[Meta['A'].dj] !== 'undefined')
                        {
                            await sails.helpers.songs.queue([sails.config.custom.showcats[Meta['A'].dj]["Show Returns"]], 'Bottom', 1);
                        } else {
                            await sails.helpers.songs.queue([sails.config.custom.showcats["Default"]["Show Returns"]], 'Bottom', 1);
                        }
                        
                        await Meta.changeMeta({queueLength: await sails.helpers.songs.calculateQueueLength(), state: 'remote_returning'});
                        break;
                    case 'sportsremote_break':
                    case 'sportsremote_break_disconnected':
                        await Meta.changeMeta({queueLength: await sails.helpers.songs.calculateQueueLength(), state: 'sportsremote_returning'});
                        break;
                }
            }

            await sails.helpers.rest.cmd('EnableAssisted', 0);

            await Meta.changeMeta({changingState: null});
            return exits.success();
        } catch (e) {
            await Meta.changeMeta({changingState: null});
            return exits.error(e);
        }

    }


};
