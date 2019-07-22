module.exports = {

  friendlyName: 'config / nws / caps / remove',

  description: 'Stop monitoring for severe weather alerts for the specified NWS county or zone code.',

  inputs: {
    code: {
      type: 'string',
      required: true,
      description: `The county or zone code to remove from the EAS.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/nws/caps/remove called.')

    try {
      sails.config.custom.EAS.NWSX
        .filter((caps) => caps.code === inputs.code)
        .map((caps, index) => delete sails.config.custom.EAS.NWSX[index])

      // broadcast changes over websockets
      sails.sockets.broadcast('config', 'config', { update: { EAS: sails.config.custom.EAS } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
