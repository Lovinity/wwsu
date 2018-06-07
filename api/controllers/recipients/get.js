/* global Recipients, sails */

module.exports = {

    friendlyName: 'Recipients / get',

    description: 'Get a list of recipients for messages.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller recipients/get called.');
        try {
            var records = await Recipients.find({})
                    .tolerate((err) => {
                        return exits.error(err);
                    });
                    sails.log.verbose(`Recipients records retrieved: ${records.length}`);
                    sails.log.silly(records);
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'recipients');
                sails.log.verbose('Request was a socket. Joining recipients.');
            }
            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }
    }


};
