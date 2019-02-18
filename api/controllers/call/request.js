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
            
            // Add a pending call record to keep track
            Recipients.pendingCalls.push[{host: inputs.host, cb: exits.success}];
            
            // Send a request to the appropriate DJ Control to connect and then call call/connected when connected.
            sails.sockets.broadcast(`calls-${inputs.host}`, `call-connect`, {});

            // Fail after 10 seconds
            setTimeout(() => {
                Recipients.pendingCalls
                        .filter((obj) => obj.host === inputs.host)
                        .map((obj, index) => {
                            delete Recipients.pendingCalls[index];
                            obj.cb(`CALL FAIL`);
                        });
            }, 10000);
            
            // Prevent this script from concluding until the pending calls record is deleted
            while (Recipients.pendingCalls.filter((obj) => obj.host === inputs.host).length > 0) {
            }
            
        } catch (e) {
            return exits.error(e);
        }
    }
};


