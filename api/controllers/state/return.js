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
            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'return', loglevel: 'info', logsubtype: Meta['A'].show, event: 'Return from break requested.'})
                    .tolerate((err) => {
                        // Don't throw errors, but log them
                        sails.log.error(err);
                    });

            await sails.helpers.rest.cmd('EnableAssisted', 1);

            // Remove clearBreak tracks to speed up the return
            await sails.helpers.songs.remove(false, sails.config.custom.subcats.clearBreak, false, false);


            // Perform the break

            // If returning from a halftime break...
            if (Meta['A'].state.includes('halftime'))
            {
                // Queue a legal ID
                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                Status.errorCheck.prevID = moment();
                Status.errorCheck.prevBreak = moment();
                await sails.helpers.error.count('stationID');

                // Queue a sports liner
                if (typeof sails.config.custom.sportscats[Meta['A'].show] !== 'undefined')
                    await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].show]["Sports Liners"]], 'Bottom', 1);

                var queueLength = await sails.helpers.songs.calculateQueueLength();

                if (queueLength >= sails.config.custom.queueCorrection.sportsReturn)
                {
                    await sails.helpers.rest.cmd('EnableAutoDJ', 0); // Try to Disable autoDJ again in case it was mistakenly still active
                    //await sails.helpers.songs.remove(false, sails.config.custom.subcats.clearBreak, false, false);
                    if ((sails.config.custom.subcats.clearBreak && sails.config.custom.subcats.clearBreak.indexOf(Meta['A'].trackIDSubcat) !== -1))
                        await sails.helpers.rest.cmd('PlayPlaylistTrack', 0); // Skip currently playing track if it is not a noClearShow track
                    
                    queueLength = await sails.helpers.songs.calculateQueueLength();
                }

                //await sails.helpers.error.count('sportsReturnQueue');

                // Change state
                if (Meta['A'].state === 'sportsremote_halftime' || Meta['A'].state === 'sportsremote_halftime_disconnected')
                {
                    await Meta.changeMeta({queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'sportsremote_returning', lastID: moment().toISOString(true)});
                } else {
                    await Meta.changeMeta({queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'sports_returning', lastID: moment().toISOString(true)});
                }


            } else {
                var d = new Date();
                var num = d.getMinutes();

                // Queue stuff if after :55 and before :05, or if it's been 50 or more minutes since the last station ID.
                if (num >= 55 || num < 5 || Status.errorCheck.prevID === null || moment().diff(moment(Status.errorCheck.prevID)) > (60 * 50 * 1000))
                {
                    // Liners for sports broadcasts, promos for others.
                    if (Meta['A'].state.startsWith("sports") && typeof sails.config.custom.sportscats[Meta['A'].show] !== 'undefined')
                    {
                        await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].show]["Sports Liners"]], 'Bottom', 1);
                    } else {
                        await sails.helpers.songs.queue(sails.config.custom.subcats.promos, 'Bottom', 1);
                        await sails.helpers.songs.queue(sails.config.custom.subcats.strikeIntro, 'Bottom', 1);
                        await sails.helpers.songs.queue(sails.config.custom.subcats.strikeTestimonials, 'Bottom', 1);
                        await sails.helpers.songs.queue(sails.config.custom.subcats.strikeOuttro, 'Bottom', 1);
                        await sails.helpers.songs.queue(sails.config.custom.subcats.sweepers, 'Bottom', 1);
                    }

                } else {
                    // Liners for sports broadcasts
                    if (Meta['A'].state.startsWith("sports") && typeof sails.config.custom.sportscats[Meta['A'].show] !== 'undefined')
                    {
                        await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].show]["Sports Liners"]], 'Bottom', 1);
                    } else {
                        await sails.helpers.songs.queue(sails.config.custom.subcats.strikeIntro, 'Bottom', 1);
                        await sails.helpers.songs.queue(sails.config.custom.subcats.strikeTestimonials, 'Bottom', 1);
                        await sails.helpers.songs.queue(sails.config.custom.subcats.strikeOuttro, 'Bottom', 1);
                        await sails.helpers.songs.queue(sails.config.custom.subcats.sweepers, 'Bottom', 1);
                    }
                }
                
                Status.errorCheck.prevBreak = moment();

                // Do stuff depending on the state
                switch (Meta['A'].state)
                {
                    case 'live_break':

                        // Queue a show return if there is one
                        if (typeof sails.config.custom.showcats[Meta['A'].show] !== 'undefined')
                        {
                            await sails.helpers.songs.queue([sails.config.custom.showcats[Meta['A'].show]["Show Returns"]], 'Bottom', 1);
                        } else {
                            await sails.helpers.songs.queue([sails.config.custom.showcats["Default"]["Show Returns"]], 'Bottom', 1);
                        }

                        await Meta.changeMeta({queueFinish: moment().add(await sails.helpers.songs.calculateQueueLength(), 'seconds').toISOString(true), state: 'live_returning'});
                        break;
                    case 'sports_break':
                        var queueLength = await sails.helpers.songs.calculateQueueLength();

                        if (queueLength >= sails.config.custom.queueCorrection.sportsReturn)
                        {
                            await sails.helpers.rest.cmd('EnableAutoDJ', 0); // Try to Disable autoDJ again in case it was mistakenly still active
                            //await sails.helpers.songs.remove(false, sails.config.custom.subcats.clearBreak, false, false);
                            if ((sails.config.custom.subcats.clearBreak && sails.config.custom.subcats.clearBreak.indexOf(Meta['A'].trackIDSubcat) !== -1))
                                await sails.helpers.rest.cmd('PlayPlaylistTrack', 0); // Skip currently playing track if it is not a noClearShow track
                            
                            queueLength = await sails.helpers.songs.calculateQueueLength();
                        }

                        //await sails.helpers.error.count('sportsReturnQueue');
                        await Meta.changeMeta({queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'sports_returning'});
                        break;
                    case 'remote_break':
                    case 'remote_break_disconnected':
                        // Queue a show return if there is one
                        if (typeof sails.config.custom.showcats[Meta['A'].show] !== 'undefined')
                        {
                            await sails.helpers.songs.queue([sails.config.custom.showcats[Meta['A'].show]["Show Returns"]], 'Bottom', 1);
                        } else {
                            await sails.helpers.songs.queue([sails.config.custom.showcats["Default"]["Show Returns"]], 'Bottom', 1);
                        }
                        await Meta.changeMeta({queueFinish: moment().add(await sails.helpers.songs.calculateQueueLength(), 'seconds').toISOString(true), state: 'remote_returning'});
                        break;
                    case 'sportsremote_break':
                    case 'sportsremote_break_disconnected':
                        var queueLength = await sails.helpers.songs.calculateQueueLength();

                        if (queueLength >= sails.config.custom.queueCorrection.sportsReturn)
                        {
                            await sails.helpers.rest.cmd('EnableAutoDJ', 0); // Try to Disable autoDJ again in case it was mistakenly still active
                            //await sails.helpers.songs.remove(false, sails.config.custom.subcats.clearBreak, false, false);
                            if ((sails.config.custom.subcats.clearBreak && sails.config.custom.subcats.clearBreak.indexOf(Meta['A'].trackIDSubcat) !== -1))
                                await sails.helpers.rest.cmd('PlayPlaylistTrack', 0); // Skip currently playing track if it is not a noClearShow track
                            
                            queueLength = await sails.helpers.songs.calculateQueueLength();
                        }

                        //await sails.helpers.error.count('sportsReturnQueue');
                        await Meta.changeMeta({queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'sportsremote_returning'});
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
