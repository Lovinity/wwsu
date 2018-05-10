module.exports = {

    friendlyName: 'messages / delete',

    description: 'Delete a single message.',

    inputs: {
        id: {
            type: 'number',
            required: true,
            description: 'The ID number of the message to delete.'
        }
    },

    fn: async function (inputs, exits) {
        var records = await Messages.update({ID: inputs.id}, {status: 'deleted'}).fetch()
                .intercept((err) => {
                    return exits.error(err);
                });
        if (!records || records.length == 0)
        {
            return exits.error(new Error(`The message does not exist.`));
        } else {
            var type = 'message';
            if (records[0].to == 'emergency')
                type = 'emergency';
            sails.sockets.broadcast('message-delete', 'message-delete', {type: type, id: inputs.id});
            return exits.success();
        }
    }


};

