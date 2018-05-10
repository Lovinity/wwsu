module.exports = {

    friendlyName: 'Discipline / banDay',

    description: 'Issues a ban against a user for 24 hours.',

    inputs: {
        host: {
            description: 'The unique ID of the user to ban.',
            type: 'string',
            required: true
        },
    },

    fn: async function (inputs, exits) {
        try {
            await sails.helpers.discipline.banDay(inputs.host);
            return exits.success();
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }
    }


};
