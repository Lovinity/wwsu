/* global sails */

module.exports = {

    friendlyName: 'config / requests / set',

    description: 'Set configuration regarding the request system.',

    inputs: {
        dailyLimit: {
            type: 'number',
            description: `Each IP address is limited to making no more than the specified number of requests per day, reset at midnight. 0 disables the ability for anyone to request tracks.`
        },
        priorityBump: {
            type: 'number',
            description: `When a track is requested, by how much should the track's priority be bumped (or lowered, if a negative number) in RadioDJ?`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/requests/set called.');

        try {
            var returnData = {};
            // Set the new configuration of any and all values provided as input
            for (var key in inputs)
            {
                if (inputs.hasOwnProperty(key))
                {
                    sails.config.custom.requests[key] = inputs[key];
                }
            }

            // broadcast changes over websockets
            sails.sockets.broadcast('config', 'config', {update: {requests: sails.config.custom.requests}});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


