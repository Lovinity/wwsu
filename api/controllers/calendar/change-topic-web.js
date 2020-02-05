module.exports = {

    friendlyName: 'Calendar / change-topic-web',

    description: 'Change the topic for an upcoming show.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'ID of the calendar event if additionalException = false, or ID of the additional exception if additionalException = true.'
        },
        start: {
            type: 'string',
            required: true,
            custom: (value) => moment(value).isValid(),
            description: 'The ISO string date of the show to change the topic for'
        },
        additionalException: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, ID refers to an ID of an exception rather than an ID of a calendar event.'
        },
        topic: {
            type: 'string',
            required: true,
            maxLength: 256,
            description: 'New topic'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/change-topic-web called.')
        try {

            // Generate a calendardb event
            var cEvent;
            var cRecord;
            var cException;
            if (!inputs.additionalException) {
                cRecord = await sails.models.calendar.findOne({ ID: inputs.ID });
                if (!cRecord) return exits.error('The provided ID was not found in calendar events.');
                cException = await sails.models.calendarexceptions.findOne({ calendarID: inputs.ID, exceptionTime: inputs.start });
                cEvent = sails.models.calendar.calendardb.processRecord(cRecord, cException || {}, inputs.start);
            } else {
                cException = await sails.models.calendarexceptions.findOne({ type: 'additional', ID: inputs.ID });
                if (!cException) return exits.error('The provided ID was not found in calendar exceptions of type additional.');
                cRecord = await sails.models.calendar.findOne({ ID: cExceptions.calendarID });
                if (!cRecord) return exits.error('The provided ID was not found in calendar events.');
                cEvent = sails.models.calendar.calendardb.processRecord(cRecord, cException, inputs.start);
            }

            // Create or update an updated type calendar exception with the new description if authorized and event was not already canceled.
            if (cEvent && cEvent.type !== 'canceled' && cEvent.type !== 'canceled-system' && cEvent.type !== 'canceled-changed' && cEvent.hostDJ === this.req.payload.ID) {
                sails.models.calendarexceptions.findOrCreate({calendarID: cEvent.calendarID, exceptionTime: cEvent.start}, {
                    calendarID: inputs.ID,
                    exceptionType: 'updated',
                    exceptionReason: `Changed by DJ in DJ web panel`,
                    exceptionTime: cEvent.start,
                    description: inputs.topic
                }).exec(async (err2, record2, wasCreated2) => {
                    if (!err2 && !wasCreated2) {
                        await sails.models.calendarexceptions.update({ID: record2.ID}, {
                            exceptionType: 'updated',
                            exceptionReason: `Changed by DJ in DJ web panel`,
                            description: inputs.topic
                        }).fetch();
                    }
                });

                return exits.success()
            } else {
                return exits.error(new Error('No events with the provided ID and authorized DJ were found.'))
            }
        } catch (e) {
            return exits.error(e)
        }
    }

}