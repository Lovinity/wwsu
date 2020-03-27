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
            // Load the event
            var record = await sails.models.schedule.findOne({ ID: inputs.ID });

            // Check for event conflicts
            var conflicts = sails.models.calendar.calendardb.checkConflicts([ { remove: inputs.ID } ]);

            // If there were errors, exit on the error
            if (conflicts.errors && conflicts.errors.length > 0)
                return exits.success(conflicts.errors);

            // Destroy the schedule event
            await sails.models.schedule.destroy({ ID: inputs.ID }).fetch();

            // Remove records which should be removed first
            if (conflicts.removals.length > 0) {
                await sails.models.schedule.destroy({ID: conflicts.removals.map((removal) => removal.scheduleID)}).fetch();
            }

            // Now, add overrides
            if (conflicts.additions.length > 0) {
                conflicts.additions.map((override) => {
                    (async (override2) => {
                        await sails.models.schedule.create(override2).fetch();
                    })(override);
                })
            }

            return exits.success();
        } catch (e) {
            return exits.error(e)
        }
    }

}
