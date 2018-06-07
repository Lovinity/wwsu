/* global Messages, sails */

module.exports = {

    friendlyName: 'messages.removeMass',

    description: 'Mass delete all messages sent by a specified host.',

    inputs: {
        host: {
            required: true,
            type: 'string',
            description: 'The unique ID assigned to the host that we are deleting message.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper messages.removeMass called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            await Messages.update({from: inputs.host}, {status: 'deleted'}).fetch()
                    .tolerate((err) => {
                        return exits.error(err);
                    });
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

