/* global sails, Recipients */

module.exports = {

    friendlyName: 'call / send',

    description: 'Send a chunk of audio data to other DJ Controls',

    inputs: {
        data: {
            type: 'ref',
            required: true
        }
    },

    fn: async function (inputs, exits) {
        try {
            sails.sockets.broadcast(`call`, 'call', inputs.data);
        } catch (e) {
            return exits.error(e);
        }
    }
};


