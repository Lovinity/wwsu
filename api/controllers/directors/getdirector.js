// WORK ON THIS
module.exports = {

    friendlyName: 'Getdirector',

    description: 'Retrieve a specific director from memory',

    inputs: {
        username: {
            description: 'Director to search for; this is an OpenProject username.',
            type: 'string',
            required: true
        },
    },

    exits: {
        success: {
            statusCode: 200,
        },
        notFound: {
            statusCode: 404
        }
    },

    fn: async function (inputs, exits) {

        return exits.success();

    }


};
