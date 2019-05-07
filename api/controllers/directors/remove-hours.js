/* global Calendar, sails, Directorhours, Timesheet */

module.exports = {

    friendlyName: 'Directors / remove-hours',

    description: 'Remove an event for the director hours calendar; should only be used to remove cancellations.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID number of the calendar event to remove.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller directors/remove-hours called.');
        try {
            
            // Delete records from director calendar
            var records = await Directorhours.destroy({ID: inputs.ID}).fetch();
            
            // Also delete records from timesheets
            var IDs = [];
            records.map((record) => IDs.push(record.unique));
            await Timesheet.destroy({unique: IDs}).fetch();
            
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};

