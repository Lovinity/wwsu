module.exports = {

  friendlyName: 'config / meta / set',

  description: 'Set basic meta configuration',

  inputs: {
    clearTime: {
      type: 'number',
      description: 'When a live DJ logs a manual track, it will be displayed for this many minutes in metadata before cleared automatically.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/meta/set called.')

    try {
      var returnData = {}
      // Set the new configuration of any and all values provided as input
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          sails.config.custom.meta[key] = inputs[key]
          returnData[key] = inputs[key]
        }
      }

      // broadcast changes over websockets
      sails.sockets.broadcast('config', 'config', { update: { meta: sails.config.custom.meta } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
