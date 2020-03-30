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
            allowNull: true
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
            custom: function (value) {
                return moment(value).isValid();
            },
        },

        endDate: {
            type: 'ref',
            custom: function (value) {
                return moment(value).isValid();
            }
        },

        recurDM: {
            type: 'json',
            custom: function (value) {
                var valid = true;
                if (value.length > 0) {
                    value.map((val) => {
                        if (isNaN(val) || val < 1 || val > 31)
                            valid = false;
                    })
                }
                return valid;
            }
        },

        recurWM: {
            type: 'json',
            custom: function (value) {
                var valid = true;
                if (value.length > 0) {
                    value.map((val) => {
                        if (isNaN(val) || val < 0 || val > 5)
                            valid = false;
                    })
                }
                return valid;
            }
        },

        recurDW: {
            type: 'json',
            custom: function (value) {
                var valid = true;
                if (value.length > 0) {
                    value.map((val) => {
                        if (isNaN(val) || val < 1 || val > 7)
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
                        if (isNaN(val) || val < 0 || val > 23)
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

        recurEvery: {
            type: 'number',
            min: 1,
            defaultsTo: 1
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
                recurDM: inputs.recurDM,
                recurWM: inputs.recurWM,
                recurDW: inputs.recurDW,
                recurH: inputs.recurH,
                recurM: inputs.recurM,
                recurFrequency: inputs.recurFrequency,
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

            var postConflicts = async (conflicts) => {
                // Add the initial event into the calendar
                var record = await sails.models.schedule.create(event).fetch();

                // Remove records which should be removed first
                if (conflicts.removals.length > 0) {
                    sails.models.schedule.destroy({ ID: conflicts.removals.map((removal) => removal.scheduleID) }).fetch().exec((err, records) => {
                        sails.sockets.broadcast('schedule', 'debug', [ 'conflict destroy', err, records ]);
                    });
                }

                // Now, add overrides
                if (conflicts.additions.length > 0) {
                    conflicts.additions.map((override) => {
                        override.overriddenID = !override.overriddenID ? record.ID : override.overriddenID; // overrideID should be set to the newly created schedule since the new one is overriding this one.
                        sails.models.schedule.create(override).fetch().exec((err, records) => {
                            sails.sockets.broadcast('schedule', 'debug', [ 'conflict create', err, records ]);
                        });
                    })
                }
            }

            // Check for event conflicts
            sails.models.calendar.calendardb.checkConflicts(async (conflicts) => { postConflicts(conflicts) }, [ { insert: event } ]);

            // Success
            return exits.success();

        } catch (e) {
            return exits.error(e)
        }
    }

}