/* global sails, Hosts */

module.exports = {

    friendlyName: 'hosts / remove',

    description: 'Remove a host from the database.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the director to edit.'
        }
    },
    
    exits: {
        conflict: {
            statusCode: 409
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller hosts/remove called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // First, determine if we need to lock out of editing authorized and admin
            var lockout = await Hosts.count({authorized: true, admin: true});

            var toDestroy = await Hosts.find({ID: inputs.ID});

            // Block requests to remove this host if there are 1 or less authorized admin hosts and this host is an authorized admin.
            if (lockout <= 1 && toDestroy.authorized && toDestroy.admin)
                return exits.conflict("To prevent accidental lockout, this request was denied because there are 1 or less authorized admin hosts. Make another host an authorized admin first before removing this host.");

            // Destroy it
            await Hosts.destroy({ID: inputs.ID}).fetch();

            // All done.
            return exits.success();

        } catch (e) {
            return sails.error(e);
        }
    }


};
