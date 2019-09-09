var sh = require('shorthash')

module.exports = {

  friendlyName: 'subscribers / Add-directors',

  description: 'Add a push notification subscription to director-related matters.',

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
    sails.log.debug('Controller subscribers/add-directors called.')

    try {
      // Get the client IP address
      var fromIP = await sails.helpers.getIp(this.req)
      var host = sh.unique(fromIP + sails.config.custom.hostSecret)

      // Use find or create so that duplicate subscriptions do not happen (ignore host when checking for duplicates).
      await sails.models.subscribers.findOrCreate(inputs, { host: `website-${host}`, device: inputs.device, type: inputs.type, subtype: this.req.payload.ID })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
