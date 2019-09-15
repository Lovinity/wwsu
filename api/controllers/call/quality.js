module.exports = {

  friendlyName: 'call / bad',

  description: 'Transmit socket event indicating the currently connected call is of bad quality.',

  inputs: {
    quality: {
      type: 'number',
      required: true,
      min: 0,
      max: 0,
      description: `The call quality %.`
    }
  },

  exits: {
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller call/quality called.')

    try {
      // Transmit bad-call event through sockets; DJ Controls will manage from there.
      sails.sockets.broadcast('call-quality', 'call-quality', inputs.quality)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
