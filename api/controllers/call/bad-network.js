/* global sails, Recipients */

module.exports = {

    friendlyName: 'call / bad-network',

    description: 'Tell all DJ Controls that the current network connection is poor. This should trigger a call re-connect with a lower bitrate.',

    inputs: {
    },

    fn: async function (inputs, exits) {
        try {
            sails.sockets.broadcast(`call`, `bad-network`, {});
        } catch (e) {
            return exits.error(e);
        }
    }
};



