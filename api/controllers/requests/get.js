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
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            var response = await sails.helpers.requests.get(inputs.offset);
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'requests');
                sails.log.verbose('Request was a socket. Joining requests.')
            }
            return exits.success(response);
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }

    }


};
