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
        },
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        try {
            await Messages.send(inputs);
            return exits.success();
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }

    }


};
