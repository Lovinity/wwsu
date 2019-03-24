/* global Calendar, sails, Directorhours */

module.exports = {

    friendlyName: 'config / onesignal / set',

    description: 'Set onesignal configuration',

    inputs: {
        rest: {
            type: 'string',
            description: `Specify the new OneSignal REST API to use for this application.`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/onesignal/set called.');

        try {

            // Set the new configuration of any and all values provided as input
            for (var key in inputs)
            {
                if (inputs.hasOwnProperty(key))
                {
                    sails.config.custom.onesignal[key] = inputs[key];
                }
            }

            // Do NOT broadcast onesignal changes; this is a secret

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


