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

            var records = await sails.models.schedule.destroy({ ID: inputs.ID }).fetch();
            sails.sockets.broadcast('schedule', 'removeSchedule', records);
            return exits.success();

            // Check for event conflicts
            var _inputs = Object.assign({}, inputs);
            var conflicts = sails.models.calendar.calendardb.checkConflicts(null, [ { remove: inputs.ID } ]);
            sails.sockets.broadcast('schedule', 'upbeat', conflicts);

            // Destroy the schedule event
            // Note: async does not seem to callback afterDestroy for this model.
            var records = await sails.models.schedule.destroy({ ID: _inputs.ID }).fetch();
            sails.sockets.broadcast('schedule', 'removeSchedule', records);

            // Remove records which should be removed first
            if (conflicts.removals.length > 0) {
                sails.sockets.broadcast('schedule', 'removeScheduleRemoveConflictsQuery', conflicts.removals.map((removal) => removal.scheduleID));
                var records2 = await sails.models.schedule.destroy({ ID: conflicts.removals.map((removal) => removal.scheduleID) }).fetch();
                sails.sockets.broadcast('schedule', 'removeScheduleRemoveConflicts', records2);
            }

            // Now, add overrides
            if (conflicts.additions.length > 0) {
                conflicts.additions.map((override) => {
                    (async (override2) => {
                        var records3 = await sails.models.schedule.create(override2).fetch();
                        sails.sockets.broadcast('schedule', 'removeScheduleAddConflicts', records3);
                    })(override);
                })
            }

            return exits.success();
        } catch (e) {
            return exits.error(e)
        }
    }

}
