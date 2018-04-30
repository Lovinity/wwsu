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
        }
    },

    fn: async function (inputs, exits) {
        // See if the specified director is in memory. If not, return 404 not found.
        if (typeof Directors.directors[inputs.username] == 'undefined' || (Directors.directors[inputs.username].status != 'active' && Directors.directors[inputs.username].status != 'invited'))
        {
            return exits.notFound();
        } else {
            var temp = {};
            temp[inputs.username] = Directors.directors[inputs.username];
            if (typeof Directors.presence[Directors.directors[inputs.username].name] != 'undefined' && Directors.presence[Directors.directors[inputs.username].name].present)
            {
                temp[inputs.username].present = true;
            } else {
                temp[inputs.username].present = false;
            }
            return exits.success(200, JSON.stringify(temp));
        }
        return exits.notFound();
    }


};
