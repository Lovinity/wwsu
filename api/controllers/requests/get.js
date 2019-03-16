/* global sails */

module.exports = {

    friendlyName: 'Requests / Get',

    description: 'Get requests.',

    inputs: {
        offset: {
            type: 'number',
            defaultsTo: 0
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller requests/get called.');

        try {
            // Get requests
            var response = await sails.helpers.requests.get(inputs.offset);
            
            // If applicable, subscribe to the requests socket
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'requests');
                sails.log.verbose('Request was a socket. Joining requests.');
            }
            
            return exits.success(response);
        } catch (e) {
            return exits.error(e);
        }

    }


};
