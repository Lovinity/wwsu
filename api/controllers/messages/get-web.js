/* global sails, Messages */
var sh = require("shorthash");

module.exports = {

    friendlyName: 'Messages / get-web',

    description: 'Web and mobile clients will use this endpoint to get messages.',

    inputs: {
        nickname: {
            type: 'string',
            description: 'A nickname provided by the client.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller messages/get-web called.');
        sails.log.silly(`Parameters passed: ${inputs}`);

        try {
            // Get the client IP address
            var from_IP = this.req.isSocket ? (typeof this.req.socket.handshake.headers['x-forwarded-for'] !== 'undefined' ? this.req.socket.handshake.headers['x-forwarded-for'] : this.req.socket.conn.remoteAddress) : this.req.ip;

            var opts = {};
            opts = {ip: from_IP, host: inputs.host, nickname: inputs.nickname || null};

            if (this.req.isSocket)
            {
                // Generate a host name from the IP address and randomly generated secret
                opts.host = sh.unique(from_IP + sails.tokenSecret);
                if (opts.nickname === null || opts.nickname === '')
                    opts.nickname = opts.host;
                sails.log.silly(`Host: ${opts.host}`);

                // Subscribe the client to receiving web messages over websockets
                sails.sockets.join(this.req, 'messages-website'); // Public website messages
                sails.sockets.join(this.req, `messages-website-${opts.host}`); // Private website messages
                sails.sockets.join(this.req, `discipline-${opts.host}`); // If a ban is issued for this client later on, it is sent through this
                sails.log.verbose(`Request was a socket. Joining messages-website and messages-website-${opts.host}.`);

                // Mark the client as online; have Node announce the recipient on applicable web sockets.
                await sails.helpers.recipients.add(sails.sockets.getId(this.req), `website-${opts.host}`, 'website', `Web (${opts.host})`);
            } else {
                opts.host = sh.unique(from_IP + sails.tokenSecret);
            }
            if (opts.nickname === null || opts.nickname === '')
                opts.nickname = opts.host;

            // Get messages for this client
            var records = await sails.helpers.messages.getWeb(opts.host);
            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }
    }


};
