module.exports = {

    friendlyName: 'Calendar / Remove-schedule',

    description: 'Remove a schedule record from the calendar.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID number of the schedule event to remove.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/remove-schedule called.')
        try {
            // Destroy the event
            await sails.models.schedule.destroy({ ID: inputs.ID }).fetch();
            return exits.success();
        } catch (e) {
            return exits.error(e)
        }
    }

}
