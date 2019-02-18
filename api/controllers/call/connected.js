/* global sails, Recipients */

module.exports = {

    friendlyName: 'call / connected',

    description: 'Indicate to a call / request that the client has connected to the call',

    inputs: {
    },

    fn: async function (inputs, exits) {
        try {
            Recipients.pendingCalls
                    .filter((obj) => obj.host === this.req.payload.host)
                    .map((obj, index) => {
                        delete Recipients.pendingCalls[index];
                        obj.cb(`OK`);
                    });
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }
};


