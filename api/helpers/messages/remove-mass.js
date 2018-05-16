module.exports = {

    friendlyName: 'Messages / removeMass',

    description: 'Mass delete all messages sent by a specified host.',

    inputs: {
        host: {
            required: true,
            type: 'string',
            description: 'The unique ID assigned to the host that we are deleting message.'
        }
    },

    fn: async function (inputs, exits) {

        try {
            var records = await Messages.update({from: inputs.host}, {status: 'deleted'}).fetch()
                    .intercept((err) => {
                        return exits.error(err);
                    });
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

