module.exports = {

  friendlyName: 'songs / queue-liner',

  description: 'Queue and play a Sports Liner.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller songs/queue-liner called.')

    try {
      // Prevent adding tracks if host is lockToDJ and the specified lockToDJ is not on the air
      if (this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta['A'].dj) { return exits.error(new Error('You are not authorized to queue a sports liner because you are not on the air.')) }

      // Error if we are not in a sports state
      if (sails.models.meta['A'].state.startsWith('sports')) { return exits.error(new Error(`A Liner cannot be queued when not in a sports broadcast.`)) }

      // Log it
      await sails.models.logs.create({ attendanceID: sails.models.meta['A'].attendanceID, logtype: 'liner', loglevel: 'info', logsubtype: sails.models.meta['A'].show, event: '<strong>Sports Liner requested.</strong>' }).fetch()
        .tolerate((err) => {
          // Do not throw for errors, but log it
          sails.log.error(err)
        })

      // Queue it
      if (typeof sails.config.custom.sportscats[sails.models.meta['A'].show] !== 'undefined') { await sails.helpers.songs.queue([sails.config.custom.sportscats[sails.models.meta['A'].show]['Sports Liners']], 'Top', 1) }

      // Play it
      await sails.helpers.rest.cmd('EnableAssisted', 0)
      await sails.helpers.rest.cmd('PlayPlaylistTrack', 0)

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
