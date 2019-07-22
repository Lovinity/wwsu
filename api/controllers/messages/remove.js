module.exports = {

  friendlyName: 'Messages / Remove',

  description: 'Delete a message by ID.',

  inputs: {
    ID: {
      type: 'number',
      required: true
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller messages/remove called.')

    try {
      // Remove the message
      await sails.helpers.messages.remove(inputs.ID)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
