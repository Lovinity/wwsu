module.exports = {

  friendlyName: `config / onesignal / set`,

  description: `Set onesignal configuration`,

  inputs: {
    rest: {
      type: `string`,
      description: `Specify the new OneSignal REST API to use for this application.`
    },
    app: {
      type: `string`,
      description: `Specify the App ID of the app used in OneSignal for push notifications.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller config/onesignal/set called.`)

    try {
      // Set the new configuration of any and all values provided as input
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          if (key === `rest` && inputs.rest === ``) { continue }
          sails.config.custom.onesignal[key] = inputs[key]

          if (key === `app`) { sails.sockets.broadcast(`config`, `config`, { update: { onesignal: { app: sails.config.custom.onesignal.app } } }) }
        }
      }

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
