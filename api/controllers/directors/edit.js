/* global moment, sails, Xp, Djs */

module.exports = {

    friendlyName: 'directors / edit',

    description: 'Edit one of the directors in the system.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the director to edit.'
        },

        name: {
            type: 'string',
            description: 'If provided, the director will be renamed to this.'
        },

        login: {
            type: 'string',
            description: 'If provided, the login for the director will be changed to this.'
        },

        admin: {
            type: 'boolean',
            description: 'If provided, the admin status of the director will be changed to this.'
        },

        assistant: {
            type: 'boolean',
            description: 'If provided, the assistant status of the director will be changed to this.'
        },

        position: {
            type: 'string',
            description: 'If provided, the director position will be changed to this.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller directors/edit called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {

            // Determine what needs updating
            var criteria = {};
            if (typeof inputs.name !== 'undefined' && inputs.name !== null)
                criteria.name = inputs.name;

            if (typeof inputs.login !== 'undefined' && inputs.login !== null)
                criteria.login = inputs.login;

            if (typeof inputs.admin !== 'undefined' && inputs.admin !== null)
                criteria.admin = inputs.admin;

            if (typeof inputs.assistant !== 'undefined' && inputs.assistant !== null)
                criteria.assistant = inputs.assistant;

            if (typeof inputs.position !== 'undefined' && inputs.position !== null)
                criteria.position = inputs.position;

            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
            var criteriaB = _.cloneDeep(criteria);

            // Edit it
            await Directors.update({ID: inputs.ID}, criteriaB).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};