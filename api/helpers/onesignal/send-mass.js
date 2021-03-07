var breakdance = require('breakdance')
module.exports = {

  friendlyName: 'sails.helpers.onesignal.sendMass',

  description: 'Send push notifications out for director-related matters.',

  inputs: {
    type: {
      type: 'string',
      required: true,
      description: `Send this to everyone subscribed to the provided subscription type.`
    },

    title: {
      type: `string`,
      required: true,
      description: `Title of the notification`
    },

    content: {
      type: 'string',
      required: true,
      description: `Additional information / content.`
    }
  },

  fn: async function (inputs, exits) {
    return exits.success(true); // Skip OneSignal
    
    try {
      var devices = []

      // Find any recurring subscriptions to the event.
      var records = await sails.models.subscribers.find({ type: inputs.type })
      records.map((record) => devices.push(record.device))

      // If we have at least 1 person to receive a push notification, continue
      if (devices.length > 0) {
        await sails.helpers.onesignal.send(devices, `message`, inputs.title, breakdance(inputs.content), (60 * 60 * 24 * 7))
      }

      return exits.success(true)
    } catch (e) {
      // No erroring if there's an error; just ignore it
      sails.log.error(e)
      return exits.success(false)
    }
  }
}
