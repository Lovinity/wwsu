/* global sails, Meta */

module.exports = {

    friendlyName: 'Meta / Get',

    description: 'Get the current Meta. If the request is a socket, subscribe to meta changes.',

    inputs: {
        display: {
            type: 'string',
            allowNull: true,
            description: 'Displays which we need to log their connection will pass a display input.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller meta/get called.');
        if (this.req.isSocket)
        {
            sails.sockets.join(this.req, 'meta');
            sails.log.verbose('Request was a socket. Joining meta.');
            
            // WORK ON THIS: find a better way to log display connections rather than in the meta controller
            if (inputs.display !== null)
            {
                var from_IP = this.req.isSocket ? (typeof this.req.socket.handshake.headers['x-forwarded-for'] !== 'undefined' ? this.req.socket.handshake.headers['x-forwarded-for'] : this.req.socket.conn.remoteAddress) : this.req.ip;
                await sails.helpers.recipients.add(sails.sockets.getId(this.req), inputs.display, 'display', inputs.display);
            }
        }
        return exits.success(Meta['A']);
    }


};
