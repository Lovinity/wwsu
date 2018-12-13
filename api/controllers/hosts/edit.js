/* global Hosts, sails */

module.exports = {

    friendlyName: 'hosts / edit',

    description: 'Edit a host.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the host to edit.'
        },

        friendlyname: {
            type: 'string',
            description: 'If provided, the friendly name of the host will be changed to this.'
        },

        authorized: {
            type: 'boolean',
            description: 'If provided, the authorized setting for the host will be changed to this (false = the host cannot receive tokens for restricted endpoints). If changing to false, and no other authorized admin exists, an error will be thrown to prevent accidental lockout.'
        },

        admin: {
            type: 'boolean',
            description: 'If provided, the admin setting for the host will be changed to this. If changing to false, and no other authorized admin exists, an error will be thrown to prevent accidental lockout.'
        },

        requests: {
            type: 'boolean',
            description: 'If provided, whether or not this host should receive track request notifications will be changed to this.'
        },

        emergencies: {
            type: 'boolean',
            description: 'If provided, whether or not this host should receive emergency / status notifications will be changed to this.'
        },

        webmessages: {
            type: 'boolean',
            description: 'If provided, whether or not this host should receive web/client message notifications will be changed to this.'
        }
    },
    
    exits: {
        conflict: {
            statusCode: 409
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller hosts/edit called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {
            // First, determine if we need to lock out of editing authorized and admin
            var lockout = await Hosts.count({authorized: true, admin: true});

            // Block requests to change admin or authorized to false if there are 1 or less authorized admin hosts.
            if (lockout <= 1 && ((typeof inputs.admin !== 'undefined' && !inputs.admin) || (typeof inputs.authorized !== 'undefined' && !inputs.authorized)))
                return exits.conflict("To prevent accidental lockout, this request was denied because there are 1 or less authorized admin hosts. Make another host an authorized admin first before removing authorized admin status from this host.");

            // Determine what needs updating
            var criteria = {};
            if (typeof inputs.friendlyname !== 'undefined' && inputs.friendlyname !== null)
                criteria.friendlyname = inputs.friendlyname;
            if (typeof inputs.authorized !== 'undefined' && inputs.authorized !== null)
                criteria.authorized = inputs.authorized;
            if (typeof inputs.admin !== 'undefined' && inputs.admin !== null)
                criteria.admin = inputs.admin;
            if (typeof inputs.requests !== 'undefined' && inputs.requests !== null)
                criteria.requests = inputs.requests;
            if (typeof inputs.emergencies !== 'undefined' && inputs.emergencies !== null)
                criteria.emergencies = inputs.emergencies;
            if (typeof inputs.webmessages !== 'undefined' && inputs.webmessages !== null)
                criteria.webmessages = inputs.webmessages;

            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
            var criteriaB = _.cloneDeep(criteria);

            // Edit it
            await Hosts.update({ID: inputs.ID}, criteriaB).fetch();

            // All done.
            return exits.success();

        } catch (e) {
            return sails.error(e);
        }

    }


};
