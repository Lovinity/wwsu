/* global sails, Xp */

module.exports = {

    friendlyName: 'xp / Remove',

    description: 'Remove xp entry.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the record to remove.'
        },
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller xp/edit called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            await Xp.destroy({ID: inputs.ID});
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
