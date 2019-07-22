module.exports = {

  friendlyName: 'Subscribers / Remove',

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
      description: 'The main type of the subscription'
    },

    subtype: {
      type: 'string',
      required: true,
      description: 'The subtype of the subscription'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller subscribers/remove called.')

    try {
      // Use find or create so that duplicate subscriptions do not happen (ignore host when checking for duplicates).
      await sails.models.subscribers.destroy({ device: inputs.device, type: inputs.type, subtype: inputs.subtype })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
