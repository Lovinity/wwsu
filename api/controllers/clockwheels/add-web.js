// TODO: Modify for new calendar system

module.exports = {

    friendlyName: 'clockwheels / add-web',

    description: 'Add a clockwheel segment via the DJ web panel.',

    inputs: {
        calendarID: {
            type: 'number',
            required: true,
            description: 'The ID of the calendar event this clockwheel pertains to. Must be a calendar event matching the name of the authorized DJ.'
        },

        relativeStart: {
            type: 'number',
            required: true,
            min: 0,
            description: 'The number of minutes since the start of the event that this segment starts at.'
        },

        relativeEnd: {
            type: 'number',
            required: true,
            min: 0,
            description: 'The number of minutes since the start of the event that this segment ends at.'
        },

        segmentName: {
            type: 'string',
            required: true,
            maxLength: 255,
            description: 'The name of the segment'
        },

        segmentColor: {
            type: 'string',
            defaultsTo: '#D50000',
            isHexColor: true,
            description: 'The hex color to shade on the clockwheel for this segment.'
        }
    },

    exits: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller clockwheels/add-web called.')

        try {
            var minutes = {}
            var event = await sails.models.calendar.findOne({ ID: inputs.calendarID, or: [ { hostDJ: this.req.payload.ID, cohostDJ1: this.req.payload.ID, cohostDJ2: this.req.payload.ID, cohostDJ3: this.req.payload.ID } ], active: { '>=': 0 } })

            if (!event)
                return exits.error(new Error('No valid calendar events match the provided calendarID and authorized DJ.'))

            if (inputs.relativeEnd <= inputs.relativeStart)
                return exits.error(new Error('relativeEnd must be greater than relativeStart.'))

            var clockwheels = await sails.models.clockwheels.find({ calendarID: event.ID })
            if (clockwheels && clockwheels.length > 0) {
                clockwheels.map((clockwheel) => {
                    for (var i = clockwheel.relativeStart; i < clockwheel.relativeEnd; i++) {
                        minutes[ i ] = true
                    }
                })
            }

            var invalidTime = false
            for (var i = inputs.relativeStart; i < inputs.relativeEnd; i++) {
                if (minutes[ i ]) { invalidTime = true }
            }

            if (invalidTime) {
                return exits.error(new Error('The provided relativeStart - relativeEnd time range conflicts with another clockwheel already saved.'))
            }

            await sails.models.clockwheels.create({ calendarID: inputs.calendarID, relativeStart: inputs.relativeStart, relativeEnd: inputs.relativeEnd, segmentName: inputs.segmentName, segmentColor: inputs.segmentColor }).fetch()

            return exits.success()
        } catch (e) {
            return exits.error(e)
        }
    }

}
