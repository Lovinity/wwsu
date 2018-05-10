module.exports = {

    friendlyName: 'Discipline / banShow',

    description: 'Issue a ban on a specified host, expiring when the current show ends.',

    inputs: {
        host: {
            required: true,
            type: 'string',
            description: 'The unique ID assigned to the host that we are banning.'
        }
    },

    fn: async function (inputs, exits) {
        try {
            sails.helpers.messages.deleteMass(inputs.host);
            var record = await Discipline.create({active: 1, IP: inputs.host, action: 'showban', message: `The website user was show-banned by ${Meta['A'].dj}`}).fetch()
                    .intercept((err) => {
                        return exits.error(err);
                    });
            sails.sockets.broadcast(inputs.host, 'webmessage', {status: 'denied', response: `Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${record.ID}`});
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

