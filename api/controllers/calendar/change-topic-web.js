module.exports = {

    friendlyName: 'Calendar / change-topic-web',

    description: 'Change the topic for an upcoming show.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the calendar event to cancel.'
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

            var cEvent = await sails.models.calendar.updateOne({ ID: inputs.ID, or: [ { title: { 'startsWith': `Show: ${this.req.payload.name} - ` } }, { title: { 'startsWith': `Remote: ${this.req.payload.name} - ` } }, { title: { 'startsWith': `Prerecord: ${this.req.payload.name} - ` } } ] }, { description: inputs.topic, isDescriptionCustom: true })

            if (cEvent) {
                return exits.success()
            } else {
                return exits.error(new Error('No events with the provided ID and authorized DJ were found.'))
            }
        } catch (e) {
            return exits.error(e)
        }
    }

}