module.exports = {

  friendlyName: 'config / status / music / set-verify',

  description: 'Set thresholds which certain status alarms are triggered depending on the number of bad tracks in the RadioDJ library.',

  inputs: {
    warn: {
      type: 'number',
      description: `When the number of bad music tracks in RadioDJ exceeds the specified number, status 3 (minor) will be triggered for the music library.`
    },
    error: {
      type: `number`,
      description: `When the number of bad music tracks in RadioDJ exceeds the specified number, status 2 (significant) will be triggered for the music library.`
    },
    critical: {
      type: `number`,
      description: `When the number of bad music tracks in RadioDJ exceeds the specified number, status 1 (critical) will be triggered for the music library.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/status/music/set-verify called.')

    try {
      // Set the new configuration of any and all values provided as input
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          sails.config.custom.status.musicLibrary.verify[key] = inputs[key]
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
