module.exports = {

    friendlyName: 'Messages / Readweb',

    description: 'Web and mobile clients will use this endpoint to get messages.',

    inputs: {
        nickname: {
            type: 'string',
            description: 'A nickname provided by the client.'
        },
    },

    fn: async function (inputs, exits) {
        var moment = require("moment");
        var sh = require("shorthash");
        // Get the client IP address
        var from_IP = this.req.isSocket ? (typeof this.req.socket.handshake.headers['x-forwarded-for'] != 'undefined' ? this.req.socket.handshake.headers['x-forwarded-for'] : this.req.socket.conn.remoteAddress) : this.req.ip;
        var opts = {};
        opts = {ip: from_IP, host: inputs.host, nickname: inputs.nickname || null};
        if (this.req.isSocket)
        {
            // Generate a host name from the IP address and randomly generated secret
            opts.host = sh.unique(from_IP + sails.tokenSecret);
            if (opts.nickname === null || opts.nickname == '')
                opts.nickname = opts.host;
            // Subscribe the client to receiving web messages over websockets
            sails.sockets.join(req, 'website-' + opts.host);
            sails.sockets.join(req, 'website');
            sails.sockets.join(req, 'message-delete');
            // Mark client as online and broadcast client on websockets
            Messages.visitors[sails.sockets.getId(this.req)] = {group: 'website', name: `Web (${opts.nickname})`, ip: from_IP, time: moment(), type: 5, host: `website-${opts.host}`};
            var temp = {website: {}};
            temp.website[`website-${opts.host}`] = {label: `Web (${opts.nickname})`, status: 5};
            sails.sockets.broadcast('message-user', 'message-user', temp);
        } else {
            opts.host = sh.unique(from_IP + sails.tokenSecret);
        }
        if (opts.nickname === null || opts.nickname == '')
            opts.nickname = opts.host;
        try {
            // Get messages for this client
            var records = await Messages.readWeb(opts);
            return exits.success(records);
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }
    }


};
