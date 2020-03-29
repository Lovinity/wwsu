module.exports = {

    friendlyName: 'Calendar / Remove-schedule',

    description: 'Remove a schedule record from the calendar.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID number of the schedule event to remove.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/remove-schedule called.')
        try {
            // Check for event conflicts
            sails.models.calendar.calendardb.checkConflicts(async (conflicts) => {
                sails.sockets.broadcast('schedule', 'upbeat', conflicts);

                // Destroy the schedule event
                // Note: async does not seem to callback afterDestroy for this model.
                sails.models.schedule.destroy({ ID: inputs.ID }).fetch().exec(() => { })

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
            }, [ { remove: inputs.ID } ]);

            return exits.success();
        } catch (e) {
            return exits.error(e)
        }
    }

}
