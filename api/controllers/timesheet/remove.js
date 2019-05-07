/* global sails, Directors, Timesheet, moment, Directorhours */

module.exports = {

    friendlyName: 'Timesheet / Remove',

    description: 'Remove a timesheet entry. Also removes directorhours if applicable.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID number of the Timesheet to remove.'
        },
    },

    exits: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller timesheet/remove called.');

        try {

            // Update the timesheet record
            var records = await Timesheet.destroy({ID: inputs.ID}).fetch();
            var IDs = [];
            records.map((record) => IDs.push(record.unique));
            if (IDs.length > 0)
                await Directorhours.destroy({unique: IDs}).fetch();

            // Force a re-load of all directors to update any possible changes in presence
            await Directors.updateDirectors();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


