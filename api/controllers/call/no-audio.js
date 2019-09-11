module.exports = {

  friendlyName: 'call / no-audio',

  description: 'Incoming DJ Controls should call this if an incoming audio call has no audio after the first second of answering.',

  inputs: {
  },

  exits: {
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller call/give-up called.')

    try {
      // Transmit very-bad-call event to DJ Controls
      sails.sockets.broadcast('no-audio-call', 'no-audio-call', true)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
