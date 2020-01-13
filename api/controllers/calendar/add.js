module.exports = {

    friendlyName: 'Calendar / Add',

    description: 'Add a main calendar event.',

    inputs: {
        type: {
            type: 'string',
            isIn: [ 'show', 'sports', 'remote', 'prerecord', 'genre', 'playlist', 'event', 'onair-booking', 'prod-booking', 'office-hours' ],
            defaultsTo: 'event'
        },

        active: {
            type: 'boolean',
            defaultsTo: true,
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
            required: true
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

        start: {
            type: 'ref',
            columnType: 'date',
        },

        end: {
            type: 'ref',
            columnType: 'date',
        },

        duration: {
            type: 'number',
            min: 0,
            required: true
        },

        schedule: {
            type: 'json',
            required: true
        },

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/add called.')
        try {

            // Verify the event
            var event = {
                type: inputs.type,
                active: inputs.active,
                priority: inputs.priority && inputs.priority !== null ? inputs.priority : sails.models.calendar.calendardb.getDefaultPriority({type: inputs.type}),
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
                start: inputs.start,
                end: inputs.end,
                duration: inputs.duration,
                schedule: inputs.schedule
            }

            try {
                event = await sails.helpers.calendar.verify(event);
            } catch (e) {
                return exits.success(e.message);
            }


            // Check for event conflicts
            var conflicts = sails.models.calendar.calendardb.checkConflicts(event);

            // If there were errors, exit on the error
            if (conflicts.error)
                return exits.success(conflicts.error);

            // Add the event into the calendar
            await sails.models.calendar.create(event).fetch();

            // Add cancellations for shows this one will override
            if (conflicts.overridden.length > 0) {
                conflicts.overridden.map((override) => {
                    (async (override2) => {
                        var ovr = {
                            calendarID: override2.calendarID,
                            exceptionID: override2.exceptionID,
                            exceptionType: 'canceled-system',
                            exceptionReason: `${inputs.name} (${inputs.type}) was scheduled during this event's time and has a higher priority.`,
                            exceptionTime: override2.start,
                        }
                        await sails.models.calendarexceptions.create(ovr).fetch();
                    })(override);
                })
            }

            // Add cancellations for shows which override this one
            if (conflicts.overriding.length > 0) {
                conflicts.overriding.map((override) => {
                    (async (override2) => {
                        var ovr = {
                            calendarID: override2.calendarID,
                            exceptionID: override2.exceptionID,
                            exceptionType: 'canceled-system',
                            exceptionReason: `${override2.name} (${override2.type}) was scheduled during this event's time and has a higher priority.`,
                            exceptionTime: override2.overrideTime || override2.start,
                        }
                        await sails.models.calendarexceptions.create(ovr).fetch();
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