module.exports = {

    friendlyName: 'Calendar / Remove',

    description: 'Deactivate an event in the main calendar',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID number of the calendar event to remove.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/remove called.')
        try {
            
            // Check for event conflicts
            sails.models.calendar.calendardb.checkConflicts(async (conflicts) => {

                // Mark the calendar as inactive
                sails.models.calendar.update({ ID: inputs.ID }, { active: false }).fetch().exec(() => { });

                // Remove records which should be removed first
                if (conflicts.removals.length > 0) {
                    sails.models.schedule.destroy({ ID: conflicts.removals.map((removal) => removal.scheduleID) }).fetch().exec(() => { });
                }

                // Now, add overrides
                if (conflicts.additions.length > 0) {
                    conflicts.additions.map((override) => {
                        sails.models.schedule.create(override).fetch().exec(() => { });
                    })
                }

            }, [ { removeCalendar: inputs.ID } ]);

            return exits.success()
        } catch (e) {
            return exits.error(e)
        }
    }

}
