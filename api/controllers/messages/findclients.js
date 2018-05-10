module.exports = {

    friendlyName: 'Messages / Findclients',

    description: 'Get a list of recipients for messages.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        if (this.req.isSocket)
            sails.sockets.join(req, 'message-user');
        try {
            var records = await sails.helpers.messahes.findRecipients();
            return exits.success(records);
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }
    }


};
