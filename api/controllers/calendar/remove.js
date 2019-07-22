module.exports = {

  friendlyName: 'Calendar / Remove',

  description: 'Remove an event for the calendar; should only be used to remove cancellations.',

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
      await sails.models.calendar.destroy({ ID: inputs.ID }).fetch()
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
