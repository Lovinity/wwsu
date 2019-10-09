/* global sails, Directors, sails.models.uabdirectors */

module.exports = {

    friendlyName: 'uab / directors / remove',

    description: 'Remove a UAB director from the system.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The director ID to remove.'
        }
    },

    exits: {
        conflict: {
            statusCode: 409
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller uab/directors/remove called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // First, determine if we need to lock out of editing admin
            var lockout = await sails.models.uabdirectors.count({admin: true});

            var toDestroy = await sails.models.uabdirectors.find({ID: inputs.ID});

            // Block requests to remove this director if there are 1 or less admin directors and this director is an admin.
            if (lockout <= 1 && toDestroy.admin)
                return exits.conflict("To prevent accidental lockout, this request was denied because there are 1 or less admin directors. Make another director admin first before removing this director.");
            await sails.models.uabdirectors.destroy({ID: inputs.ID}).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
