/* global sails, Recipients */

module.exports = {

    friendlyName: 'call / connected',

    description: 'Indicate to a call / request that the client has connected to the call',

    inputs: {
    },

    fn: async function (inputs, exits) {
        try {
                        // Send a request to the appropriate DJ Control to connect and then call call/connected when connected.
            sails.sockets.broadcast(`call`, `call-connected`, {player: this.req.payload.host});
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }
};


