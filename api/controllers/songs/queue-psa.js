/* global sails */

module.exports = {

    friendlyName: 'songs / queue-psa',

    description: 'Queue a PSA into RadioDJ... often used during sports broadcasts.',

    inputs: {
        duration: {
            type: 'number',
            defaultsTo: 30,
            description: 'The number of seconds the PSA should be, +/- 5 seconds. Defaults to 30.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller songs/queue-psa called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 1, true, inputs.duration);
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
