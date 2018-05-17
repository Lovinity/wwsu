/* global Directors, sails */

module.exports = {

    friendlyName: 'Directors / Get',

    description: 'Retrieve directors from memory.',

    inputs: {
        username: {
            description: 'Director to search for; this is an OpenProject username.',
            type: 'string',
            allowNull: true
        }
    },

    exits: {
        success: {
            statusCode: 200
        },
        notFound: {
            statusCode: 404
        },
        error: {
            statusCode: 500
        }
    },

    fn: async function (inputs, exits) {
        var query = {};
        if (inputs.username !== null)
            query = {login: inputs.username};
        // See if the specified director is in memory. If not, return 404 not found.
        var records = await Directors.find(query)
                .intercept((err) => {
                    sails.log.error(err);
                    return exits.error();
                });
        if (!records || records.length < 1)
        {
            return exits.notFound();
        } else {
            if (this.req.isSocket)
                sails.sockets.join(this.req, 'directors');
            return exits.success(records);
        }
    }


};
