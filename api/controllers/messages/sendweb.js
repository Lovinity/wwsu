module.exports = {

    friendlyName: 'Messages / Sendweb',

    description: 'Web and mobile clients use this endpoint to send messages.',

    inputs: {
        nickname: {
            type: 'string',
            description: 'Nickname of the client sending the message.'
        },

        private: {
            type: 'boolean',
            required: true,
            description: 'If this message is only for the DJ, then private will be true, otherwise false.'
        },

        message: {
            type: 'string',
            required: true
        },
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        var sh = require("shorthash");
        var from_IP = this.req.isSocket ? (typeof this.req.socket.handshake.headers['x-forwarded-for'] != 'undefined' ? this.req.socket.handshake.headers['x-forwarded-for'] : this.req.socket.conn.remoteAddress) : this.req.ip;
        var opts = {message: inputs.message, from_IP: from_IP, nickname: inputs.nickname || null, private: inputs.private};
        opts.host = sh.unique(from_IP + sails.tokenSecret);
        try {
            Messages.sendWeb(opts);
            return exits.success();
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }

    }


};
