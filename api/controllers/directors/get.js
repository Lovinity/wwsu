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
        sails.log.debug('Controller directors/get called.');
        sails.log.silly(`Parameters passed: ${inputs}`);

        try {
            // If a username was specified, find only that director. Otherwise, get all directors.
            var query = {};
            if (inputs.username !== null)
                query = {login: inputs.username};

            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'directors');
                sails.log.verbose('Request was a socket. Joined directors.');
            }

            // See if the specified director is in memory. If not, return 404 not found.
            var records = await Directors.find(query);

            sails.log.verbose(`Director records retrieved: ${records.length}`);
            sails.log.silly(records);
            if (!records || records.length < 1)
            {
                return exits.success([]);
            } else {
                return exits.success(records);
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};
