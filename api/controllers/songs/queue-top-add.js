module.exports = {

  friendlyName: 'songs / queue-top-add',

  description: 'Queue a Top Add into RadioDJ, and play it if necessary.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller songs/queue-top-add called.')

    try {
      // Prevent adding tracks if host is lockToDJ and the specified lockToDJ is not on the air
      if (this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ1 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ2 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ3)
      return exits.error(new Error('You are not authorized to queue/play a Top Add because you are not on the air.'))

      // Log it
      await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'topadd', loglevel: 'info', logsubtype: sails.models.meta.memory.show, logIcon: `fas fa-headphones`, title: `Host requested to play a random top add.`, event: '' }).fetch()
        .tolerate((err) => {
          // Do not throw for an error, but log it.
          sails.log.error(err)
        })

      // Queue it
      await sails.helpers.songs.queue(sails.config.custom.subcats.adds, 'Top', 1, 'lenientRules')

      // Play it
      await sails.helpers.rest.cmd('EnableAssisted', 0)
      await sails.helpers.rest.cmd('PlayPlaylistTrack', 0)

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
