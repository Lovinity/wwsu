module.exports = {

    friendlyName: 'Messages / reademergencies',

    description: 'Retrieve technical issues reported.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        if (this.req.isSocket)
            sails.sockets.join(req, 'message-emergency');
        try {
            var records = await Messages.readEmergencies();
            return exits.success(records);
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }
    }


};
