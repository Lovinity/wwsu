/* global Messages */

module.exports = {

    friendlyName: 'messages / remove',

    description: 'Delete a single message.',

    inputs: {
        id: {
            type: 'number',
            required: true,
            description: 'The ID number of the message to delete.'
        }
    },

    fn: async function (inputs, exits) {
        var records = await Messages.update({ID: inputs.id}, {status: 'deleted'})
                .intercept((err) => {
                    return exits.error(err);
                })
                .fetch();
        if (!records || records.length === 0)
        {
            return exits.error(new Error(`The message does not exist.`));
        } else {
            var type = 'message';
            if (records[0].to === 'emergency')
                type = 'emergency';
            return exits.success();
        }
    }


};

