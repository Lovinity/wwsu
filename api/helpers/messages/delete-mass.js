module.exports = {

    friendlyName: 'Messages / deleteMass',

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
            if (records.constructor == Array)
            {
                records.forEach(function (record) {
                    sails.sockets.broadcast('message-delete', 'message-delete', {type: 'message', id: record.ID});
                });
            } else {
                sails.sockets.broadcast('message-delete', 'message-delete', {type: 'message', id: records.ID});
            }
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

