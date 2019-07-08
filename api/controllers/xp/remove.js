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

        try {

            // Remove this XP record
            await Xp.destroy({ID: inputs.ID}).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
