module.exports = {

  friendlyName: `config / status / server / set-memory`,

  description: `Set thresholds which certain status alarms are triggered depending on how much free RAM memory there is on the server.`,

  inputs: {
    warn: {
      type: `number`,
      description: `When free memory drops below this value in bytes, status 3 (minor) will be triggered for the server.`
    },
    error: {
      type: `number`,
      description: `When free memory drops below this value in bytes, status 2 (significant) will be triggered for the server.`
    },
    critical: {
      type: `number`,
      description: `When free memory drops below this value in bytes, status 1 (critical) will be triggered for the server.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller config/status/server/set-memory called.`)

    try {
      // Set the new configuration of any and all values provided as input
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          sails.config.custom.status.server.memory[key] = inputs[key]
        }
      }

      // broadcast changes over websockets
      sails.sockets.broadcast(`config`, `config`, { update: { status: sails.config.custom.status } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
