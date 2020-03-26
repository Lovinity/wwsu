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

            // For canceled and updated events, we need to run conflict resolution
            if (record.scheduleID !== null) {

                // Get the schedule this schedule overrides
                var record2 = await sails.models.schedule.findOne({ ID: record.scheduleID });

                // Verify event and polyfill default information
                try {
                    var event = await sails.helpers.calendar.verify(record2);
                    return exits.success(event);
                } catch (e) {
                    return exits.success(e.message);
                }

                // Check for event conflicts
                var conflicts = sails.models.calendar.calendardb.checkConflicts(event);

                // If there were errors, exit on the error
                if (conflicts.error)
                    return exits.success(conflicts.error);

                // Add overrides for shows this one will override
                if (conflicts.overridden.length > 0) {
                    conflicts.overridden.map((override) => {
                        (async (override2) => {
                            override2.overriddenID = record.scheduleID; // overrideID should be set to the previous schedule ID since the new one is overriding this one.
                            await sails.models.schedule.create(override2).fetch();
                        })(override);
                    })
                }

                // Add overrides for shows which override this one
                if (conflicts.overriding.length > 0) {
                    conflicts.overriding.map((override) => {
                        (async (override2) => {
                            await sails.models.schedule.create(override2).fetch();
                        })(override);
                    })
                }
            }

            // Destroy the schedule event
            await sails.models.schedule.destroy({ ID: inputs.ID }).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e)
        }
    }

}
