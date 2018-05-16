module.exports = {

    friendlyName: 'Messages / Read',

    description: 'A WWSU client, such as DJ Controls, will use this endpoint to read messages, including reported emergencies.',

    inputs: {
        host: {
            type: 'string',
            required: true,
            description: 'The host ID of the client connecting for messages.'
        },
    },

    fn: async function (inputs, exits) {
        var from_IP = this.req.isSocket ? (typeof this.req.socket.handshake.headers['x-forwarded-for'] != 'undefined' ? this.req.socket.handshake.headers['x-forwarded-for'] : this.req.socket.conn.remoteAddress) : this.req.ip;
        if (this.req.isSocket)
        {
            sails.sockets.join(this.req, 'messages');
        }
        try {
            var records = await sails.helpers.messages.read(inputs.host, from_IP, this.req.isSocket ? sails.sockets.getId(this.req) : null);
            return exits.success(records);
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }
    }


};
