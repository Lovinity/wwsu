module.exports = {

  friendlyName: 'config / darksky / set',

  description: 'Set darksky configuration',

  inputs: {
    api: {
      type: 'string',
      description: 'Specify the new Darksky API to use for this application.'
    },
    latitude: {
      type: 'number',
      description: 'Specify the latitude coordinate to use when getting Darksky weather.'
    },
    longitude: {
      type: 'number',
      description: 'Specify the longitude coordinate to use when getting Darksky weather.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/darksky/set called.')

    try {
      // Set the new configuration of any and all values provided as input
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          if (key === 'api' && inputs.api === '') { continue }
          if (key === 'latitude' || key === 'longitude') {
            sails.config.custom.darksky.position[key] = inputs[key]
          } else {
            sails.config.custom.darksky[key] = inputs[key]
          }
        }
      }

      sails.sockets.broadcast('config', 'config', { update: { darksky: { position: sails.config.custom.darksky.position } } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
