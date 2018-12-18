/* global Meta, Discipline, sails */

module.exports = {

    friendlyName: 'discipline.banIndefinite',

    description: 'Ban a specified host indefinitely, until the ban is manually removed.',

    inputs: {
        host: {
            required: true,
            type: 'string',
            description: 'The unique ID assigned to the host that we are banning.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper discipline.banIndefinite called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {

            // Remove all messages by the client
            await sails.helpers.messages.removeMass(inputs.host);

            // Add the indefinite ban to the database
            var reference = await Discipline.create({active: 1, IP: inputs.host, action: 'permaban', message: `The website user was banned indefinitely by ${Meta['A'].show}`}).fetch();

            // Broadcast the ban to the client
            sails.sockets.broadcast(`discipline-${inputs.host.replace('website-', '')}`, `discipline`, {"discipline": `Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${reference.ID}`});
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

