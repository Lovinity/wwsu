/* global Recipients, sails */

module.exports = {

    friendlyName: 'Messages / Findclients',

    description: 'Get a list of recipients for messages.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        try {
            var records = await Recipients.find({})
                    .intercept((err) => {
                        sails.log.error(err);
                        exits.error();
                    });
            if (this.req.isSocket)
                sails.sockets.join(this.req, 'recipients');
            return exits.success(records);
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }
    }


};
