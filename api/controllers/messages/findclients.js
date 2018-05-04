module.exports = {

    friendlyName: 'Messages / Findclients',

    description: 'Get a list of recipients for messages.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        if (this.req.isSocket)
            sails.sockets.join(req, 'message-user');
        try {
            var records = await Messages.findClients()
            return exits.success(records);
        } catch (e) {
            return exits.error();
        }
    }


};
