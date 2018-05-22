/* global sails, Meta, Discipline */

module.exports = {

    friendlyName: 'discipline.banShow',

    description: 'Issue a ban on a specified host, expiring when the current show ends.',

    inputs: {
        host: {
            required: true,
            type: 'string',
            description: 'The unique ID assigned to the host that we are banning.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper discipline.banShow called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            // Remove all messages by the client
            await sails.helpers.messages.removeMass(inputs.host);

            // Add the show ban to the database
            var reference = await Discipline.create({active: 1, IP: inputs.host, action: 'showban', message: `The website user was show-banned by ${Meta['A'].dj}`}).fetch()
                    .intercept((err) => {
                        return exits.error(err);
                    });

            // Broadcast the ban to the client
            sails.sockets.broadcast(`discipline-${inputs.host}`, `discipline`, {"discipline": `Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${reference.ID}`});
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

