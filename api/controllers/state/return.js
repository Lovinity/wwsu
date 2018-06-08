/* global sails, Meta, Logs, moment, Status */

module.exports = {

    friendlyName: 'State / Return',

    description: 'Return from a break.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller state/return called.');

        try {

            // log it
            await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: Meta['A'].dj, event: 'DJ/Producer requested to return from break.'})
                    .tolerate((err) => {
                        // Don't throw errors, but log them
                        sails.log.error(err);
                    });

            await sails.helpers.rest.cmd('EnableAssisted', 1);

            // Perform the break
            if (Meta['A'].state.includes('halftime'))
            {
                await sails.helpers.rest.removeMusic();
                // Sports liners for sports halftime
                if (typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                    await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Liners"]], 'Bottom', 1);

                if (Meta['A'].state === 'sportsremote_halftime' || Meta['A'].state === 'sportsremote_halftime_disconnected')
                {
                    await Meta.changeMeta({state: 'sportsremote_returning'});
                } else {
                    await Meta.changeMeta({state: 'sports_returning'});
                }
            } else {

                var n = moment().minute();
                // Queue station IDs if after :50 and before :10, or if it's been an hour or more since the last station ID.
                if ((n > 50 && n < 10) || moment().diff(moment(Status.errorCheck.prevID)) > (60 * 60 * 1000))
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
                    Status.errorCheck.prevID = moment();
                    Status.errorCheck.prevBreak = moment();
                    await sails.helpers.error.count('stationID');
                } else {
                    // Liners for sports broadcasts
                    await sails.helpers.songs.queue(sails.config.custom.subcats.sweepers, 'Bottom', 1);
                    if (Meta['A'].state.startsWith("sports") && typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                        await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Liners"]], 'Bottom', 1);
                    Status.errorCheck.prevBreak = moment();
                }

                switch (Meta['A'].state)
                {
                    case 'live_break':
                        await Meta.changeMeta({state: 'live_returning'});
                        break;
                    case 'sports_break':
                        await Meta.changeMeta({state: 'sports_returning'});
                        break;
                    case 'remote_break':
                    case 'remote_break_disconnected':
                        await Meta.changeMeta({state: 'remote_returning'});
                        break;
                    case 'sportsremote_break':
                    case 'sportsremote_break_disconnected':
                        await Meta.changeMeta({state: 'sportsremote_returning'});
                        break;
                }
            }

            await sails.helpers.rest.cmd('EnableAssisted', 0);

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
