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
      // Prevent removing messages if host is lockToDJ and the specified lockToDJ is not on the air
      if (sails.models.meta.memory.host && this.req.payload.ID !== sails.models.meta.memory.host && this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ1 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ2 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ3)
        throw 'forbidden';

      // Remove the message
      await sails.helpers.messages.remove(inputs.ID)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
