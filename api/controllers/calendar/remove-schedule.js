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
                await sails.models.schedule.destroy({ ID: inputs.ID }).fetch();

                // Remove records which should be removed first
                if (conflicts.removals.length > 0) {
                    await sails.models.schedule.destroy({ ID: conflicts.removals.map((removal) => removal.scheduleID) }).fetch();
                }

                // Now, add overrides
                if (conflicts.additions.length > 0) {
                    sails.sockets.broadcast('schedule', 'upbeat', `Additions`);
                    conflicts.additions.map((override) => {
                        sails.sockets.broadcast('schedule', 'upbeat', override);
                        (async (override2) => {
                            sails.sockets.broadcast('schedule', 'upbeat', override2);
                            try {
                                await sails.models.schedule.create(override2).fetch();
                            } catch (e) {
                                sails.sockets.broadcast('schedule', 'upbeat', e.message);
                            }
                        })(override);
                    })
                }
            }, [ { remove: inputs.ID } ]);

            return exits.success();
        } catch (e) {
            return exits.error(e)
        }
    }

}
