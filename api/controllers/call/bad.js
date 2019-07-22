module.exports = {

  friendlyName: 'call / bad',

  description: 'Transmit socket event indicating the currently connected call is of bad quality.',

  inputs: {
    bitRate: {
      type: 'number',
      required: false,
      description: `If provided, request a new bitrate to use in kbps.`
    }
  },

  exits: {
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller call/bad called.')

    try {
      // Transmit bad-call event through sockets; DJ Controls will manage from there.
      sails.sockets.broadcast('bad-call', 'bad-call', inputs.bitRate)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
