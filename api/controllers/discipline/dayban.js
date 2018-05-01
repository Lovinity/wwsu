module.exports = {

    friendlyName: 'Discipline / dayban',

    description: 'Issues a ban against a user for 24 hours.',

    inputs: {
        host: {
            description: 'The unique ID of the user to ban.',
            type: 'string',
            required: true
        },
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        Discipline.dayban(inputs.host)
                .then(() => {
                    return exits.success();
                })
                .catch(err => {
                    return exits.error(err);
                });
    }


};
