module.exports = {

    friendlyName: 'planner / remove',

    description: 'Remove a record from the schedule planner.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the dj to edit.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller planner/remove called.');

        try {

            // Edit it
            await Planner.destroy({ID: inputs.ID}).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};



