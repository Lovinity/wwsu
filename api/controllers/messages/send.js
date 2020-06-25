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
      if (inputs.to.startsWith('display-') && sails.models.meta.memory.host && this.req.payload.ID !== sails.models.meta.memory.host && this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ1 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ2 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ3)
        throw 'forbidden';
        
      // Prevent sending messages to any website visitors if host is lockToDJ and the specified lockToDJ is not on the air
      if (inputs.to.startsWith('website') && sails.models.meta.memory.host && this.req.payload.ID !== sails.models.meta.memory.host && this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ1 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ2 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ3)
        throw 'forbidden';

      // Send the message
      await sails.helpers.messages.send(this.req.payload.host, inputs.to, inputs.toFriendly, inputs.message)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
