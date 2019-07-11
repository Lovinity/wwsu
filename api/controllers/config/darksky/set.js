module.exports = {

    friendlyName: 'config / darksky / set',

    description: 'Set darksky configuration',

    inputs: {
        api: {
            type: 'string',
            description: `Specify the new Darksky API to use for this application.`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/darksky/set called.');

        try {

            // Set the new configuration of any and all values provided as input
            for (var key in inputs)
            {
                if (inputs.hasOwnProperty(key))
                {
                    sails.config.custom.darksky[key] = inputs[key];
                }
            }

            // Do NOT broadcast darksky changes; this is a secret

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
