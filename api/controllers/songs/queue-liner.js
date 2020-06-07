module.exports = {

  friendlyName: 'songs / queue-liner',

  description: 'Queue and play a Sports Liner.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller songs/queue-liner called.')

    try {
      // Prevent adding tracks if host is lockToDJ and the specified lockToDJ is not on the air
      if (this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ1 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ2 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ3)
      return exits.error(new Error('You are not authorized to queue/play a liner because you are not on the air.'))

      // Error if we are not in a sports state
      if (sails.models.meta.memory.state.startsWith('sports')) { return exits.error(new Error(`A Liner cannot be queued when not in a sports broadcast.`)) }

      // Log it
      await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'liner', loglevel: 'info', logsubtype: sails.models.meta.memory.show, logIcon: `fas fa-angle-double-right`, title: `Host requested to play a random liner.`, event: '' }).fetch()
        .tolerate((err) => {
          // Do not throw for errors, but log it
          sails.log.error(err)
        })

      // Queue it
      if (typeof sails.config.custom.sportscats[sails.models.meta.memory.show] !== 'undefined') { await sails.helpers.songs.queue([sails.config.custom.sportscats[sails.models.meta.memory.show]['Sports Liners']], 'Top', 1) }

      // Play it
      await sails.helpers.rest.cmd('EnableAssisted', 0)
      await sails.helpers.rest.cmd('PlayPlaylistTrack', 0)

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
