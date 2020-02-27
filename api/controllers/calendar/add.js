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

        startDate: {
            type: 'ref',
            columnType: 'date',
        },

        endDate: {
            type: 'ref',
            columnType: 'date',
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
                startDate: inputs.start,
                endDate: inputs.end,
            }

            try {
                event = await sails.helpers.calendar.verify(event);
            } catch (e) {
                return exits.success(e.message);
            }

            // Add the event into the calendar
            await sails.models.calendar.create(event.event).fetch();

            // Success
            return exits.success();

        } catch (e) {
            return exits.error(e)
        }
    }

}