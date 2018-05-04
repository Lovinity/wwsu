module.exports = {

    friendlyName: 'Directors / Get',

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
        },
        error: {
            statusCode: 500
        }
    },

    fn: async function (inputs, exits) {
        // See if the specified director is in memory. If not, return 404 not found.
        var records = await Directors.find({login: inputs.username})
                .intercept((err) => {
                    sails.log.error(err);
                    return exits.error();
                });
        if (!records || records.length < 1)
        {
            return exits.notFound();
        } else {
            return exits.success(records);
        }
    }


};
