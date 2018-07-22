/* global sails */

module.exports = {

    friendlyName: 'Discipline / banDay',

    description: 'Issues a ban against a user for 24 hours.',

    inputs: {
        host: {
            description: 'The unique ID of the user to ban.',
            type: 'string',
            required: true
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller discipline/ban-day called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {
            await sails.helpers.discipline.banDay(inputs.host);
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};
