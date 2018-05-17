/* global sails */

module.exports = {

    friendlyName: 'Discipline / banShow',

    description: 'Issues a ban against a user until the currently live DJ signs off of the air.',

    inputs: {
        host: {
            description: 'The unique ID of the user to ban.',
            type: 'string',
            required: true
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller discipline/ban-show called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            await sails.helpers.discipline.banShow(inputs.host);
            return exits.success();
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }
    }


};
