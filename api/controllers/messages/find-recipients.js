module.exports = {

    friendlyName: 'Messages / Findclients',

    description: 'Get a list of recipients for messages.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        try {
            var records = await sails.helpers.messages.findRecipients();
            return exits.success(records);
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }
    }


};
