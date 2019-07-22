module.exports = {

  friendlyName: 'config / nws / caps / add',

  description: 'Add a new county or zone to check for severe weather alerts via the NWS CAPS website.',

  inputs: {
    code: {
      type: 'string',
      required: true,
      description: 'The NWS county or zone code.'
    },
    name: {
      type: 'string',
      required: true,
      description: 'The human-readable name of this location, such as the county.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/nws/caps/add called.')

    try {
      // Do not add duplicates
      var exists = false
      sails.config.custom.EAS.NWSX
        .filter((caps) => caps.code === inputs.code)
        .map(() => { exists = true })

      if (!exists) { sails.config.custom.EAS.NWSX.push(inputs) }

      // broadcast changes over websockets
      sails.sockets.broadcast('config', 'config', { update: { EAS: sails.config.custom.EAS } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
