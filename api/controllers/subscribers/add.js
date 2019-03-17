/* global sails, Subscribers */
var sh = require("shorthash");

module.exports = {

    friendlyName: 'subscribers / Add',

    description: 'Add a push notification subscription.',

    inputs: {

        device: {
            type: 'string',
            required: true,
            description: 'The OneSignal device ID of the subscriber.'
        },

        type: {
            type: 'string',
            required: true,
            description: "The main type of the subscription"
        },

        subtype: {
            type: 'string',
            required: true,
            description: "The subtype of the subscription"
        },
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller subscribers/add called.');

        try {
            // Get the client IP address
            var from_IP = sails.helpers.getIP(this.req);
            var host = sh.unique(from_IP + sails.config.custom.hostSecret);
            
            // Use find or create so that duplicate subscriptions do not happen (ignore host when checking for duplicates).
            await Subscribers.findOrCreate(inputs, {host: `website-${host}`, device: inputs.device, type: inputs.type, subtype: inputs.subtype});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
