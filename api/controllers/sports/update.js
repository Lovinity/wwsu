module.exports = {

    friendlyName: 'Update',

    description: 'Update sports.',

    inputs: {
        name: {
            type: 'string',
            required: true,
            description: 'the name of the sports variable / data to change.'
        },

        value: {
            type: 'string',
            allowNull: true,
            description: 'the new value for the data variable.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        try {

            await Sports.update({name: inputs.name}, {value: inputs.value}).fetch();

            // All done.
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
