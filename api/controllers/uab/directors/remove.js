/* global sails, Directors */

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

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller uab/directors/remove called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            await Uabdirectors.destroy({ID: inputs.ID}).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
