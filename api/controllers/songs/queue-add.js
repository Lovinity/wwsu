/* global sails, Meta, Logs */

module.exports = {

    friendlyName: 'songs / queue-add',

    description: 'Queue a Top Add into RadioDJ, and play it if necessary.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller songs/get called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Log it
            await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: Meta['A'].dj, event: 'DJ/Producer requested a single Top Add.'})
                    .tolerate((err) => {
                        // Do not throw for an error, but log it.
                        sails.log.error(err);
                    });

            // Queue it
            await sails.helpers.songs.queue(sails.config.custom.subcats.adds, 'Top', 1, true);

            // Play it
            await sails.helpers.rest.cmd('EnableAssisted', 0);
            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
