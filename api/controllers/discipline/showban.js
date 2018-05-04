module.exports = {

    friendlyName: 'Discipline / showban',

    description: 'Issues a ban against a user until the currently live DJ signs off of the air.',

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
        Discipline.showban(inputs.host)
                .then(() => {
                    return exits.success();
                })
                .catch(err => {
                    sails.log.error(err);
                    return exits.error();
                });
    }


};
