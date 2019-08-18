module.exports = {

  friendlyName: 'Messages / Send',

  description: 'Send messages from WWSU internal clients.',

  inputs: {
    to: {
      type: 'string',
      required: true
    },

    toFriendly: {
      type: 'string',
      required: true
    },

    message: {
      type: 'string',
      required: true
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller messages/send called.')

    try {
      // Prevent sending messages to the display signs if host is lockToDJ and the specified lockToDJ is not on the air
      if (inputs.to.startsWith('display-') && this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta['A'].dj) { return exits.error(new Error('You are not authorized to send a message to the display signs because you are not on the air.')) }

      // Prevent sending messages to any website visitors if host is lockToDJ and the specified lockToDJ is not on the air
      if (inputs.to.startsWith('website') && this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta['A'].dj) { return exits.error(new Error('You are not authorized to send a message to website visitors because you are not on the air.')) }

      // Send the message
      await sails.helpers.messages.send(this.req.payload.host, inputs.to, inputs.toFriendly, inputs.message)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
