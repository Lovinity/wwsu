/* global sails */

module.exports = {

    friendlyName: 'Requests / Place',

    description: 'Place a request.',

    inputs: {
        ID: {
            required: true,
            type: 'number',
            description: 'ID number of the song to request.'
        },

        name: {
            type: 'string',
            defaultsTo: 'anonymous',
            description: 'Name provided of the person making the request.'
        },

        message: {
            type: 'string',
            defaultsTo: '',
            description: 'Message provided regarding the request.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller requests/place called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        // Get the client IP address
        var from_IP = this.req.isSocket ? (typeof this.req.socket.handshake.headers['x-forwarded-for'] !== 'undefined' ? this.req.socket.handshake.headers['x-forwarded-for'] : this.req.socket.conn.remoteAddress) : this.req.ip;
        try {
            var response = await sails.helpers.requests.place(inputs.ID, from_IP, inputs.name, inputs.message);
            return exits.success(response.HTML);
        } catch (e) {
            return exits.error(e);
        }
    }


};
