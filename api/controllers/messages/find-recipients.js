/* global Recipients, sails */

module.exports = {

    friendlyName: 'Messages / Findclients',

    description: 'Get a list of recipients for messages.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller messages/find-recipients called.');
        try {
            var records = await Recipients.find({})
                    .intercept((err) => {
                        sails.log.error(err);
                        exits.error();
                    });
                    sails.log.verbose(`Recipients records retrieved: ${records.length}`);
                    sails.log.silly(records);
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'recipients');
                sails.log.verbose('Request was a socket. Joining recipients.')
            }
            return exits.success(records);
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }
    }


};
