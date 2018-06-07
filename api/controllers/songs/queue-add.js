/* global sails, Meta, Logs */

module.exports = {

    friendlyName: 'songs / queue-add',

    description: 'Queue a Top Add into RadioDJ, and play it if necessary.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller songs/get called.');
        sails.log.silly(`Parameters passed: ${inputs}`);

        try {
            // Log it
            await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: Meta['A'].dj, event: 'DJ/Producer requested a single Top Add.'})
                    .tolerate((err) => {
                    });

            // Queue it
            await sails.helpers.songs.queue(sails.config.custom.subcats.adds, 'Top', 1, true);

            // If necessary, change to the returning state so clients get a queue countdown. Also, start the Top Add if necessary.
            switch (Meta['A'].state)
            {
                case 'live_on':
                    await sails.helpers.rest.cmd('EnableAssisted', 0);
                    await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                    await Meta.changeMeta({state: 'live_returning'});
                    break;
                case 'remote_on':
                    await sails.helpers.rest.cmd('EnableAssisted', 0);
                    await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                    await Meta.changeMeta({state: 'remote_returning'});
                    break;
                case 'sports_on':
                    await sails.helpers.rest.cmd('EnableAssisted', 0);
                    await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                    await Meta.changeMeta({state: 'sports_returning'});
                    break;
                case 'sportsremote_on':
                    await sails.helpers.rest.cmd('EnableAssisted', 0);
                    await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                    await Meta.changeMeta({state: 'sportsremote_returning'});
                    break;
            }

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
