module.exports = {

    friendlyName: 'config / darksky / set-position',

    description: 'Set darksky position',

    inputs: {
        latitude: {
            type: 'number',
            description: `Specify the latitude coordinate to use when getting Darksky weather.`
        },
        longitude: {
            type: 'number',
            description: `Specify the longitude coordinate to use when getting Darksky weather.`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/darksky/set-position called.');

        try {

            // Set the new configuration of any and all values provided as input
            for (var key in inputs)
            {
                if (inputs.hasOwnProperty(key))
                {
                    sails.config.custom.onesignal.position[key] = inputs[key];
                }
            }

            // broadcast changes over websockets
            sails.sockets.broadcast('config', 'config', {update: {darksky: {position: sails.config.custom.darksky.position}}});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
