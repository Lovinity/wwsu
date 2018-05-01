module.exports = {

    friendlyName: 'Discipline / permaban',

    description: 'Issues a ban against a user indefinitely.',

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
        Discipline.permaban(inputs.host)
                .then(() => {
                    return exits.success();
                })
                .catch(err => {
                    return exits.error(err);
                });
    }


};
