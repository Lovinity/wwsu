module.exports = {

    friendlyName: 'Discipline / banIndefinite',

    description: 'Ban a specified host indefinitely, until the ban is manually removed.',

    inputs: {
        host: {
            required: true,
            type: 'string',
            description: 'The unique ID assigned to the host that we are banning.'
        }
    },

    fn: async function (inputs, exits) {

        try {
            await sails.helpers.messages.removeMass(inputs.host);
            var record = await Discipline.create({active: 1, IP: inputs.host, action: 'permaban', message: `The website user was banned indefinitely by ${Meta['A'].dj}`}).fetch()
                    .intercept((err) => {
                        return exits.error(err);
                    });
            sails.sockets.broadcast(host, 'webmessage', {status: 'denied', response: `Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${record.ID}`});
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

