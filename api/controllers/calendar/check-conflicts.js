module.exports = {

    friendlyName: 'Calendar / check-conflicts',

    description: 'Check for events this event will override, and events that will override this one.',

    inputs: {

        type: {
            type: 'string',
            isIn: [ 'show', 'sports', 'remote', 'prerecord', 'genre', 'playlist', 'event', 'onair-booking', 'prod-booking', 'office-hours' ],
            defaultsTo: 'event'
        },

        calendarID: {
            type: 'number'
        },

        exceptionType: {
            type: 'string',
            isIn: ['additional','additional-unscheduled','updated','canceled','updated-system','canceled-system']
        },

        exceptionTime: {
            type: 'ref',
            defaultsTo: 'datetime'
        },

        priority: {
            type: 'number'
        },

        start: {
            type: 'ref',
            columnType: 'date'
        },

        newTime: {
            type: 'ref',
            columnType: 'datetime'
        },

        end: {
            type: 'ref',
            columnType: 'date'
        },

        duration: {
            type: 'number',
            min: 0
        },

        schedule: {
            type: 'json'
        },
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/get called.')
        try {
            var event = {
                type: inputs.type, 
                calendarID: inputs.calendarID,
                exceptionType: inputs.exceptionType,
                exceptionTime: inputs.exceptionTime,
                priority: inputs.priority,
                start: inputs.start,
                newTime: inputs.newTime,
                end: inputs.end,
                duration: inputs.duration,
                schedule: inputs.schedule
            }

            event = sails.models.calendar.calendardb.verify(event);

            if (!event) {
                throw new Error("The event is invalid");
            }

            return sails.models.calendar.calendardb.checkConflicts(event);

        } catch (e) {
            return exits.error(e)
        }
    }

}