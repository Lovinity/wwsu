/* global sails, Meta, Logs */

module.exports = {

    friendlyName: 'songs / queue-liner',

    description: 'Queue and play a Sports Liner.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller songs/queue-liner called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {

            // Error if we are not in a sports state
            if (Meta['A'].state.startsWith("sports"))
                return exits.error(new Error(`A Liner cannot be queued when not in a sports broadcast.`));

            // Log it
            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'liner', loglevel: 'info', logsubtype: Meta['A'].dj, event: 'Sports Liner requested.'})
                    .tolerate((err) => {
                        // Do not throw for errors, but log it
                        sails.log.error(err);
                    });

            // Queue it
            if (typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Liners"]], 'Top', 1);

            await sails.helpers.rest.cmd('EnableAssisted', 0);
            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
