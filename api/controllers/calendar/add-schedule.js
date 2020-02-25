module.exports = {

    friendlyName: 'Calendar / Add-schedule',

    description: 'Add a schedule to a calendar.',

    inputs: {
        calendarID: {
            type: 'number',
            required: true
        },
        scheduleID: {
            type: 'number',
            allowNull: true
        },
        scheduleType: {
            type: 'string',
            isIn: [ 'unscheduled', 'updated', 'canceled', 'updated-system', 'canceled-system' ],
            required: true
        },
        scheduleReason: {
            type: 'string',
            defaultsTo: ''
        },
        originalTime: {
            type: 'ref',
            columnType: 'datetime',
        },
        type: {
            type: 'string',
            isIn: [ 'show', 'sports', 'remote', 'prerecord', 'genre', 'playlist', 'event', 'onair-booking', 'prod-booking', 'office-hours', 'task' ],
            allowNull: true
        },

        priority: {
            type: 'number',
            allowNull: true,
        },

        hostDJ: {
            type: 'number',
            allowNull: true,
        },

        cohostDJ1: {
            type: 'number',
            allowNull: true
        },

        cohostDJ2: {
            type: 'number',
            allowNull: true
        },

        cohostDJ3: {
            type: 'number',
            allowNull: true
        },

        eventID: {
            type: 'number',
            allowNull: true
        },

        playlistID: {
            type: 'number',
            allowNull: true
        },

        director: {
            type: 'number',
            allowNull: true
        },

        name: {
            type: 'string',
            allowNull: true
        },

        description: {
            type: 'string',
            allowNull: true
        },

        logo: {
            type: 'string',
            allowNull: true
        },

        banner: {
            type: 'string',
            allowNull: true
        },

        newTime: {
            type: 'ref',
            columnType: 'datetime',
        },

        oneTime: {
            type: 'json',
            custom: function (value) {
                var valid = true;
                if (value.length > 0) {
                    value.map((val) => {
                        if (!moment(val).isValid())
                            valid = false;
                    })
                }
                return valid;
            },
        },

        startDate: {
            type: 'ref',
            columnType: 'date',
        },

        endDate: {
            type: 'ref',
            columnType: 'date',
        },

        recurDW: {
            type: 'json',
            custom: function (value) {
                var valid = true;
                if (value.length > 0) {
                    value.map((val) => {
                        if (isNaN(value) || value < 1 || value > 7)
                            valid = false;
                    })
                }
                return valid;
            }
        },

        recurH: {
            type: 'json',
            custom: function (value) {
                var valid = true;
                if (value.length > 0) {
                    value.map((val) => {
                        if (isNaN(value) || value < 0 || value > 23)
                            valid = false;
                    })
                }
                return valid;
            }
        },

        recurM: {
            type: 'number',
            allowNull: true,
            min: 0,
            max: 59
        },

        duration: {
            type: 'number',
            min: 0,
            max: (60 * 24),
            allowNull: true
        }

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/add-schedule called.')
        try {

            // Verify the event
            var event = {
                calendarID: inputs.calendarID,
                scheduleID: inputs.scheduleID,
                scheduleType: inputs.scheduleType,
                scheduleReason: inputs.scheduleReason,
                originalTime: inputs.originalTime,
                type: inputs.type,
                priority: inputs.priority,
                hostDJ: inputs.hostDJ,
                cohostDJ1: inputs.cohostDJ1,
                cohostDJ2: inputs.cohostDJ2,
                cohostDJ3: inputs.cohostDJ3,
                eventID: inputs.eventID,
                playlistID: inputs.playlistID,
                director: inputs.director,
                name: inputs.name,
                description: inputs.description,
                logo: inputs.logo,
                banner: inputs.banner,
                newTime: inputs.newTime,
                oneTime: inputs.oneTime,
                startDate: inputs.startDate,
                endDate: inputs.endDate,
                recurDW: inputs.recurDW,
                recurH: inputs.recurH,
                recurM: inputs.recurM,
                duration: inputs.duration
            }

            try {
                event = await sails.helpers.calendar.verify(event);
            } catch (e) {
                return exits.success(e.message);
            }

            // Erase like records
            if (inputs.originalTime && inputs.calendarID) {
                var query = {};
                query.originalTime = inputs.originalTime;
                query.calendarID = inputs.calendarID;
                if (inputs.scheduleID)
                    query.scheduleID = inputs.scheduleID;

                await sails.models.schedule.destroy(query).fetch();
            }

            // Check for event conflicts
            var conflicts = sails.models.calendar.calendardb.checkConflicts(event);

            // If there were errors, exit on the error
            if (conflicts.error)
                return exits.success(conflicts.error);

            // Add the initial event into the calendar
            var record = await sails.models.schedule.create(event).fetch();

            // Add overrides for shows this one will override
            if (conflicts.overridden.length > 0) {
                conflicts.overridden.map((override) => {
                    (async (override2) => {
                        override2.overriddenID = record.ID; // overrideID should be set to the newly created schedule since the new one is overriding this one.
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

            // Success
            return exits.success();

        } catch (e) {
            return exits.error(e)
        }
    }

}