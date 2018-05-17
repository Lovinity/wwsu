/* global sails */

module.exports = {

    friendlyName: 'Messages / Remove',

    description: 'Delete a message by ID.',

    inputs: {
        ID: {
            type: 'number',
            required: true
        }
    },

    fn: async function (inputs, exits) {
        try {
            await sails.helpers.messages.remove(inputs.ID);
        } catch (e)
        {
            sails.log.error(e);
            return exits.error();
        }
        return exits.success();
    }


};
