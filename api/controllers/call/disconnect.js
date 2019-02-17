/* global sails, Recipients */

module.exports = {

    friendlyName: 'call / disconnect',

    description: 'Tell the provided host that once all packets are finished transmitting, it is safe to assume the disconnection was intentional and not an error.',

    inputs: {
        host: {
            type: 'string',
            required: true
        }
    },

    fn: async function (inputs, exits) {
        try {
            sails.sockets.broadcast(`calls-${inputs.host}`, `call-disconnect`, {});
        } catch (e) {
            return exits.error(e);
        }
    }
};


