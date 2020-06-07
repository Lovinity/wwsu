module.exports = {

  friendlyName: 'songs / queue-psa',

  description: 'Queue a PSA into RadioDJ... often used during sports broadcasts.',

  inputs: {
    duration: {
      type: 'number',
      defaultsTo: 30,
      description: 'The number of seconds the PSA should be, +/- 5 seconds. Defaults to 30.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller songs/queue-psa called.')
    try {
      // Prevent adding tracks if host is lockToDJ and the specified lockToDJ is not on the air
      if (this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ1 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ2 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ3)
      return exits.error(new Error('You are not authorized to queue/play a PSA because you are not on the air.'))

      // Queue applicable PSA
      await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 1, 'lenientRules', inputs.duration)

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
