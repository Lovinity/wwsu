/* global sails */

module.exports = {

    friendlyName: 'Discipline / banIndefinite',

    description: 'Issues a ban against a user indefinitely.',

    inputs: {
        host: {
            description: 'The unique ID of the user to ban.',
            type: 'string',
            required: true
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller discipline/ban-indefinite called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            await sails.helpers.discipline.banIndefinite(inputs.host);
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};
