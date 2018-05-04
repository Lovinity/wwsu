module.exports = {

    friendlyName: 'Messages / Delete',

    description: 'Delete a message by ID.',

    inputs: {
        ID: {
            type: 'number',
            required: true
        }
    },

    fn: async function (inputs, exits) {
        try {
            await Messages.delete(inputs.ID);
        } catch (e)
        {
            sails.log.error(e);
            return exits.error();
        }
        return exits.success();
    }


};
