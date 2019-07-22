module.exports = {

  friendlyName: 'config / status / server / set-load5',

  description: 'Set thresholds which certain status alarms are triggered depending on the 5-minute CPU load of the server.',

  inputs: {
    warn: {
      type: 'number',
      description: `When the 5-minute CPU load exceeds this value, status 3 (minor) will be triggered for the server. Generally, this number should be the number of CPU cores * 3.`
    },
    error: {
      type: `number`,
      description: `When the 5-minute CPU load exceeds this value, status 2 (significant) will be triggered for the server. Generally, this number should be the number of CPU cores * 6.`
    },
    critical: {
      type: `number`,
      description: `When the 5-minute CPU load exceeds this value, status 1 (critical) will be triggered for the server. Generally, this number should be the number of CPU cores * 12.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/status/server/set-load5 called.')

    try {
      // Set the new configuration of any and all values provided as input
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          sails.config.custom.status.server.load5[key] = inputs[key]
        }
      }

      // broadcast changes over websockets
      sails.sockets.broadcast('config', 'config', { update: { status: sails.config.custom.status } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
