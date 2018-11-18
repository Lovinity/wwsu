/* global sails, Meta */

module.exports = {

    friendlyName: 'Meta / Get',

    description: 'Get the current Meta. If the request is a socket, subscribe to meta changes.',

    inputs: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller meta/get called.');
        
        // Subscribe to socket if applicable
        if (this.req.isSocket)
        {
            sails.sockets.join(this.req, 'meta');
            sails.log.verbose('Request was a socket. Joining meta.');
        }
        
        // Return current meta
        return exits.success(Meta['A']);
    }


};
