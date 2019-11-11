module.exports = {

    friendlyName: 'clockwheels / get-web',

    description: 'Get the scheduled clockwheels for the authorized DJ.',

    inputs: {
    },

    exits: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller clockwheels/get-web called.')

        try {

            var events = await sails.models.calendar.find({ or: [ { title: { 'startsWith': `Show: ${this.req.payload.name} - ` } }, { title: { 'startsWith': `Remote: ${this.req.payload.name} - ` } }, { title: { 'startsWith': `Prerecord: ${this.req.payload.name} - ` } } ], active: { '>=': 0 } }).sort('start ASC')

            if (!events || events.length < 1)
                return exits.success([])

            var eventIDs = []

            events.map((event) => eventIDs.push(event.ID))

            var clockwheels = await sails.models.clockwheels.find({ calendarID: eventIDs })

            return exits.success(clockwheels)
        } catch (e) {
            return exits.error(e)
        }
    }

}
