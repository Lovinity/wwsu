/* global sails */
var sh = require("shorthash");

module.exports = {

    friendlyName: 'Recipients / Add-web',

    description: 'Registers a public recipient in the recipients database.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller recipients/add-web called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            if (!this.req.isSocket)
                return exits.error(new Error('This controller requires a websocket.'));

            var from_IP = this.req.isSocket ? (typeof this.req.socket.handshake.headers['x-forwarded-for'] !== 'undefined' ? this.req.socket.handshake.headers['x-forwarded-for'] : this.req.socket.conn.remoteAddress) : this.req.ip;
            var host = sh.unique(from_IP + sails.tokenSecret);

            // Mark the client as online; have Node announce the recipient on applicable web sockets.
            var label = await sails.helpers.recipients.add(sails.sockets.getId(this.req), `website-${host}`, 'website', `Web (${host})`);
            return exits.success({label: label});
        } catch (e) {
            return exits.error(e);
        }

    }


};
