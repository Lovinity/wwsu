module.exports = {

  friendlyName: 'call / finalize',

  description: 'Incoming DJ Controls should call this after answering an incoming call.',

  inputs: {
    success: {
      type: 'boolean',
      required: true,
      description: 'Success = true if audio was detected, false if no audio after 1 second.'
    }
  },

  exits: {
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller call/finalize called.')

    try {
      sails.sockets.broadcast('finalize-call', 'finalize-call', inputs.success)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
