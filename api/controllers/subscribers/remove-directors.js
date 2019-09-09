module.exports = {

  friendlyName: 'Subscribers / Remove-directors',

  description: 'Remove push notification subscriptions.',

  inputs: {
    device: {
      type: 'string',
      required: true,
      description: 'The OneSignal device ID of the subscriber.'
    },

    type: {
      type: 'string',
      required: true,
      isIn: ['accountability-shows', 'accountability-directors', 'emergencies'],
      description: 'The main type of the subscription'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller subscribers/remove-directors called.')

    try {
      await sails.models.subscribers.destroy({ device: inputs.device, type: inputs.type, subtype: this.req.payload.ID }).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }
}
