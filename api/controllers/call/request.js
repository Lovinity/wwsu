/* global sails, Recipients */

module.exports = {

    friendlyName: 'call / request',

    description: 'Send a request to another DJ Controls to connect and receive audio data. Must be executed AFTER the requesting host has already started a call as a speaker.',

    inputs: {
        host: {
            type: 'string',
            required: true
        }
    },

    fn: async function (inputs, exits) {
        try {
            
            // Send a request to the appropriate DJ Control to connect and then call call/connected when connected.
            sails.sockets.broadcast(`calls-${inputs.host}`, `call-connect`, {streamer: this.req.payload.host, request: inputs.host});
            
            return exits.success();
            
        } catch (e) {
            return exits.error(e);
        }
    }
};


