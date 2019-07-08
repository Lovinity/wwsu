var sh = require('shorthash');

module.exports = {

    friendlyName: 'Recipients / Add-web',

    description: 'Registers a public recipient in the recipients database.',

    inputs: {
        device: {
            type: 'string',
            allowNull: true,
            description: `If this recipient comes from the WWSU mobile app, provide their OneSignal ID here.`
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller recipients/add-web called.');

        try {
            // Request must be a socket
            if (!this.req.isSocket)
                {return exits.error(new Error('This controller requires a websocket.'));}

            // Get client IP address and form a host hash from it
            var fromIP = this.req.isSocket ? (typeof this.req.socket.handshake.headers['x-forwarded-for'] !== 'undefined' ? this.req.socket.handshake.headers['x-forwarded-for'] : this.req.socket.conn.remoteAddress) : this.req.ip;
            var host = sh.unique(fromIP + sails.config.custom.hostSecret);

            // If a ban is issued for this client later on, it is sent through this socket
            sails.sockets.join(this.req, `discipline-${host}`);

            // Mark the client as online and retrieve their nickname
            var label = await sails.helpers.recipients.add(sails.sockets.getId(this.req), `website-${host}`, 'website', `Web (${await sails.helpers.recipients.generateNick()})`, inputs.device);

            // Return the nickname of this client as a label object
            return exits.success({label: label});
        } catch (e) {
            return exits.error(e);
        }

    }


};
