/* global Messages */

module.exports = {

    friendlyName: 'messages.remove',

    description: 'Delete a single message.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID number of the message to delete.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper messages.remove called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        var records = await Messages.update({ID: inputs.ID}, {status: 'deleted'})
                .intercept((err) => {
                    return exits.error(err);
                })
                .fetch();
        if (!records || records.length === 0)
        {
            return exits.error(new Error(`The message does not exist.`));
        } else {
            return exits.success();
        }
    }


};

