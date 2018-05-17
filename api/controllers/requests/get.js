/* global sails */

module.exports = {

    friendlyName: 'Requests / Get',

    description: 'Get requests.',

    inputs: {
        offset: {
            type: 'number',
            defaultsTo: 0
        }
    },

    fn: async function (inputs, exits) {
        try {
            var response = await sails.helpers.requests.get(inputs.offset);
            if (this.req.isSocket)
                sails.sockets.join(this.req, 'requests');
            return exits.success(response);
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }

    }


};
