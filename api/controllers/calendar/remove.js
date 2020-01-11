module.exports = {

    friendlyName: 'Calendar / Remove',

    description: 'Deactivate an event in the main calendar',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID number of the calendar event to remove.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/remove called.')
        try {
            // Destroy the event
            await sails.models.calendar.update({ ID: inputs.ID }, { active: false }).fetch()
            return exits.success()
        } catch (e) {
            return exits.error(e)
        }
    }

}
