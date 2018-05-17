/* global sails, Meta */

module.exports = {

    friendlyName: 'Meta / Get',

    description: 'Get the current Meta. If the request is a socket, subscribe to meta changes.',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        if (this.req.isSocket)
            sails.sockets.join(this.req, 'meta');
        return exits.success(Meta['A']);
    }


};
