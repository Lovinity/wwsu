/* global sails */

module.exports = {

    friendlyName: 'Messages / Send',

    description: 'Send messages from WWSU internal clients.',

    inputs: {
        from: {
            type: 'string',
            required: true
        },

        to: {
            type: 'string',
            required: true
        },

        to_friendly: {
            type: 'string',
            required: true
        },

        message: {
            type: 'string',
            required: true
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller messages/send called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {
            // Send the message
            await sails.helpers.messages.send(inputs.from, inputs.to, inputs.to_friendly, inputs.message);
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
