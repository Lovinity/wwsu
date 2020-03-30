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

            var postConflicts = async (conflicts) => {
                sails.sockets.broadcast('schedule', 'upbeat', conflicts);

                // Destroy the schedule event
                // Note: async does not seem to callback afterDestroy for this model.
                sails.models.schedule.destroyOne({ ID: inputs.ID }).exec((err, record) => {
                    sails.sockets.broadcast('schedule', 'debug', ['schedule destroy', err, record]);
                })

                // Remove records which should be removed first
                if (conflicts.removals.length > 0) {
                    sails.models.schedule.destroy({ ID: conflicts.removals.map((removal) => removal.scheduleID) }).fetch().exec((err, record) => {
                        sails.sockets.broadcast('schedule', 'debug', ['conflicts destroy', err, record]);
                    });
                }

                // Now, add overrides
                if (conflicts.additions.length > 0) {
                    conflicts.additions.map((override) => {
                        sails.models.schedule.create(override).fetch().exec((err, record) => {
                            sails.sockets.broadcast('schedule', 'debug', ['conflicts create', err, record]);
                        });
                    })
                }
            }

            // Check for event conflicts
            sails.models.calendar.calendardb.checkConflicts(async (conflicts) => {
                sails.sockets.broadcast('schedule', 'upbeat', conflicts);

                // Destroy the schedule event
                // Note: async does not seem to callback afterDestroy for this model.
                sails.models.schedule.destroyOne({ ID: inputs.ID }).exec((err, record) => {
                    sails.sockets.broadcast('schedule', 'debug', ['schedule destroy', err, record]);
                })

                // Remove records which should be removed first
                if (conflicts.removals.length > 0) {
                    sails.models.schedule.destroy({ ID: conflicts.removals.map((removal) => removal.scheduleID) }).fetch().exec((err, record) => {
                        sails.sockets.broadcast('schedule', 'debug', ['conflicts destroy', err, record]);
                    });
                }

                // Now, add overrides
                if (conflicts.additions.length > 0) {
                    conflicts.additions.map((override) => {
                        sails.models.schedule.create(override).fetch().exec((err, record) => {
                            sails.sockets.broadcast('schedule', 'debug', ['conflicts create', err, record]);
                        });
                    })
                }
            }, [ { remove: inputs.ID } ]);

            return exits.success();
        } catch (e) {
            return exits.error(e)
        }
    }

}
