// TODO: rename to queue-top-add

module.exports = {

  friendlyName: 'songs / queue-add',

  description: 'Queue a Top Add into RadioDJ, and play it if necessary.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller songs/get called.')

    try {
      // Prevent adding tracks if host is lockToDJ and the specified lockToDJ is not on the air
      if (this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta['A'].dj) { return exits.error(new Error('You are not authorized to queue a Top Add because you are not on the air.')) }

      // Log it
      await sails.models.logs.create({ attendanceID: sails.models.meta['A'].attendanceID, logtype: 'topadd', loglevel: 'info', logsubtype: sails.models.meta['A'].show, event: '<strong>Top Add requested.</strong>' }).fetch()
        .tolerate((err) => {
          // Do not throw for an error, but log it.
          sails.log.error(err)
        })

      // Queue it
      await sails.helpers.songs.queue(sails.config.custom.subcats.adds, 'Top', 1, 'lenientRules')

      // Play it
      await sails.helpers.rest.cmd('EnableAssisted', 0)
      await sails.helpers.rest.cmd('PlayPlaylistTrack', 0)

      // Earn XP for playing a Top Add, if the show is live
      if (sails.models.meta['A'].state.startsWith('live_')) {
        await sails.models.xp.create({ dj: sails.models.meta['A'].dj, type: 'xp', subtype: 'topadd', amount: sails.config.custom.XP.topAdd, description: 'DJ played a Top Add.' })
          .tolerate((err) => {
            // Do not throw for error, but log it
            sails.log.error(err)
          })
      }

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
