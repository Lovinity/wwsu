/* global sails, Messages */
var sh = require("shorthash");

module.exports = {

    friendlyName: 'Messages / get-web',

    description: 'Web and mobile clients will use this endpoint to get messages.',

    inputs: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller messages/get-web called.');

        try {
            // Get the client IP address
            var from_IP = sails.helpers.getIP(this.req);
            var host = sh.unique(from_IP + sails.config.custom.hostSecret);

            if (this.req.isSocket)
            {
                // Generate a host name from the IP address and randomly generated secret
                sails.log.silly(`Host: ${host}`);

                // Subscribe the client to receiving web messages over websockets
                sails.sockets.join(this.req, 'messages-website'); // Public website messages
                sails.sockets.join(this.req, `messages-website-${host}`); // Private website messages
                sails.log.verbose(`Request was a socket. Joining messages-website and messages-website-${host}.`);
            }

            // Get messages for this client and return them
            var records = await sails.helpers.messages.getWeb(host);
            
            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }
    }


};
