/* global sails */

module.exports = {

    friendlyName: 'config / breaks / set',

    description: 'Set basic break configuration',

    inputs: {
        breakCheck: {
            type: 'number',
            description: `When considering when to queue breaks, if a break was queued less than this many minutes ago, hold off on queuing any other breaks until this many minutes have passed since. You MUST NOT have any intervals between breaks that are less than this. For example, if this is 10, and you have a break at 25 and another at 30 (5 minute difference), this will cause problems. The "0" break ignores this setting since it is required by the FCC. It has its own hard-coded check of 10 minutes that cannot be configured.`
        },
        
        linerTime: {
            type: `number`,
            description: `A track from the defined "liners" categories will be queued during automation between music tracks during non-breaks. Do not play a liner more often than once every defined number of minutes. NOTE: This clock is reset when a break is played so as to avoid playing a liner too close to a break.`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/breaks/set called.');

        try {
            var returnData = {};
            // Set the new configuration of any and all values provided as input
            for (var key in inputs)
            {
                if (inputs.hasOwnProperty(key))
                {
                    sails.config.custom[key] = inputs[key];
                }
            }

            // broadcast changes over websockets
            sails.sockets.broadcast('config', 'config', {update: inputs});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};




