/* global sails, Meta, Logs */

module.exports = {

    friendlyName: 'songs / queue-liner',

    description: 'Queue and play a Sports Liner.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller songs/queue-liner called.');
        sails.log.silly(`Parameters passed: ${inputs}`);

        try {

            // Error if we are not in a sports state
            if (Meta['A'].state.startsWith("sports"))
                return exits.error(new Error(`A Liner cannot be queued when not in a sports broadcast.`));

            // Log it
            await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: Meta['A'].dj, event: 'DJ/Producer requested a Sports Liner.'})
                    .catch((err) => {
                    });

            // Queue it
            if (typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Liners"]], 'Top', 1);
            await sails.helpers.rest.cmd('EnableAssisted', 0);
            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);

            // If necessary, change to the returning state so clients get a queue countdown. Also, start the Top Add if necessary.
            switch (Meta['A'].state)
            {
                case 'sports_on':
                    await Meta.changeMeta({state: 'sports_returning'});
                    break;
                case 'sportsremote_on':
                    await Meta.changeMeta({state: 'sportsremote_returning'});
                    break;
            }

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
