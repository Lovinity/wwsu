// TODO: Modify for new calendar system

module.exports = {

    friendlyName: 'clockwheels / edit-web',

    description: 'Edit a clockwheel segment via the DJ web panel.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'ID of the clockwheel to edit'
        },

        calendarID: {
            type: 'number',
            description: 'The ID of the calendar event this clockwheel pertains to. Must be a calendar event matching the name of the authorized DJ.'
        },

        relativeStart: {
            type: 'number',
            min: 0,
            description: 'The number of minutes since the start of the event that this segment starts at.'
        },

        relativeEnd: {
            type: 'number',
            min: 0,
            description: 'The number of minutes since the start of the event that this segment ends at.'
        },

        segmentName: {
            type: 'string',
            maxLength: 255,
            description: 'The name of the segment'
        },

        segmentColor: {
            type: 'string',
            defaultsTo: '#D50000',
            description: 'The hex color to shade on the clockwheel for this segment.'
        }
    },

    exits: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller clockwheels/edit-web called.')

        try {
            var minutes = {}

            var clockwheel = await sails.models.clockwheels.findOne({ ID: inputs.ID })
            if (!clockwheel)
                return exits.error(new Error('No valid clockwheel matches the provided ID'))

            var event = await sails.models.calendar.findOne({ ID: inputs.calendarID, or: [ { hostDJ: this.req.payload.ID, cohostDJ1: this.req.payload.ID, cohostDJ2: this.req.payload.ID, cohostDJ3: this.req.payload.ID } ], active: { '>=': 0 } })

            if (!event)
                return exits.error(new Error('No valid calendar events match the provided calendarID and authorized DJ.'))

            if ((typeof inputs.relativeEnd !== 'undefined' ? inputs.relativeEnd : clockwheel.relativeEnd) <= (typeof inputs.relativeStart !== 'undefined' ? inputs.relativeStart : clockwheel.relativeStart))
                return exits.error(new Error('clockwheel relativeEnd must be greater than clockwheel relativeStart.'))

            var clockwheels = await sails.models.clockwheels.find({ calendarID: event.ID })
            if (clockwheels && clockwheels.length > 0) {
                clockwheels.map((clockwheelsb) => {
                    for (var i = clockwheelsb.relativeStart; i < clockwheelsb.relativeEnd; i++) {
                        if (clockwheelsb.ID !== inputs.ID)
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

            var criteria = {}

            if (typeof inputs.calendarID !== "undefined")
                criteria.calendarID = inputs.calendarID
            if (typeof inputs.relativeStart !== "undefined")
                criteria.relativeStart = inputs.relativeStart
            if (typeof inputs.relativeEnd !== "undefined")
                criteria.relativeEnd = inputs.relativeEnd
            if (typeof inputs.segmentName !== "undefined")
                criteria.segmentName = inputs.segmentName
            if (typeof inputs.segmentColor !== "undefined")
                criteria.segmentColor = inputs.segmentColor

            var criteriaB = _.cloneDeep(criteria)

            await sails.models.clockwheels.update({ ID: inputs.ID }, criteriaB).fetch()

            return exits.success()
        } catch (e) {
            return exits.error(e)
        }
    }

}
