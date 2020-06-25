module.exports = {

  friendlyName: 'State / Return',

  description: 'Return from a break.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller state/return called.')

    try {
      // Block this request if we are already changing states
      if (sails.models.meta.memory.changingState !== null) { return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`)) }

      // Prevent state changing if host is lockToDJ and the specified lockToDJ is not on the air
      if (this.req.payload.ID !== sails.models.meta.memory.host && this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ1 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ2 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ3)
        throw 'forbidden';

      // Lock so that other state changing requests get blocked until we are done
      await sails.helpers.meta.change.with({ changingState: `Returning from break` });

      // log it
      (async () => {
        await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'return', loglevel: 'info', logsubtype: sails.models.meta.memory.show, logIcon: `fas fa-check`, title: `Host requested to resume the broadcast.`, event: '' }).fetch()
          .tolerate((err) => {
            // Don't throw errors, but log them
            sails.log.error(err)
          })
      })()

      await sails.helpers.rest.cmd('EnableAssisted', 1)

      // Remove clearBreak tracks to speed up the return
      await sails.helpers.songs.remove(false, sails.config.custom.subcats.clearBreak, false, false)

      // Perform the break

      // If returning from a halftime break...
      if (sails.models.meta.memory.state.includes('halftime')) {
        // Queue a legal ID
        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1)
        sails.models.status.errorCheck.prevID = moment()
        sails.models.status.errorCheck.prevBreak = moment()
        await sails.helpers.error.count('stationID')

        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.after)

        // Queue a sports liner
        if (typeof sails.config.custom.sportscats[ sails.models.meta.memory.show ] !== 'undefined') { await sails.helpers.songs.queue([ sails.config.custom.sportscats[ sails.models.meta.memory.show ][ 'Sports Liners' ] ], 'Bottom', 1) }

        var queueLength = await sails.helpers.songs.calculateQueueLength()

        // If queue is unacceptably long, try to speed the process up.
        if (queueLength >= sails.config.custom.queueCorrection.sportsReturn) {
          await sails.helpers.rest.cmd('EnableAutoDJ', 0) // Try to Disable autoDJ again in case it was mistakenly still active
          // await sails.helpers.songs.remove(false, sails.config.custom.subcats.clearBreak, false, false);
          if ((sails.config.custom.subcats.clearBreak && sails.config.custom.subcats.clearBreak.indexOf(sails.models.meta.memory.trackIDSubcat) !== -1)) { await sails.helpers.rest.cmd('PlayPlaylistTrack', 0) } // Skip currently playing track if it is not a noClearShow track

          queueLength = await sails.helpers.songs.calculateQueueLength()
        }

        // await sails.helpers.error.count('sportsReturnQueue');

        // Change state
        if (sails.models.meta.memory.state === 'sportsremote_halftime' || sails.models.meta.memory.state === 'sportsremote_halftime_disconnected') {
          await sails.helpers.meta.change.with({ queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'sportsremote_returning', lastID: moment().toISOString(true) })
        } else {
          await sails.helpers.meta.change.with({ queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'sports_returning', lastID: moment().toISOString(true) })
        }
      } else {
        sails.models.status.errorCheck.prevBreak = moment()

        // Do stuff depending on the state
        switch (sails.models.meta.memory.state) {
          case 'live_break':
            // Queue after break
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.live.after)

            // Queue a show return if there is one
            if (typeof sails.config.custom.showcats[ sails.models.meta.memory.show ] !== 'undefined') {
              await sails.helpers.songs.queue([ sails.config.custom.showcats[ sails.models.meta.memory.show ][ 'Show Returns' ] ], 'Bottom', 1)
            } else {
              await sails.helpers.songs.queue([ sails.config.custom.showcats[ 'Default' ][ 'Show Returns' ] ], 'Bottom', 1)
            }

            await sails.helpers.meta.change.with({ queueFinish: moment().add(await sails.helpers.songs.calculateQueueLength(), 'seconds').toISOString(true), state: 'live_returning' })
            break
          case 'sports_break':
            // Queue after break
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.after)
            // Queue a sports liner
            if (typeof sails.config.custom.sportscats[ sails.models.meta.memory.show ] !== 'undefined') { await sails.helpers.songs.queue([ sails.config.custom.sportscats[ sails.models.meta.memory.show ][ 'Sports Liners' ] ], 'Bottom', 1) }

            queueLength = await sails.helpers.songs.calculateQueueLength()

            if (queueLength >= sails.config.custom.queueCorrection.sportsReturn) {
              await sails.helpers.rest.cmd('EnableAutoDJ', 0) // Try to Disable autoDJ again in case it was mistakenly still active
              // await sails.helpers.songs.remove(false, sails.config.custom.subcats.clearBreak, false, false);
              if ((sails.config.custom.subcats.clearBreak && sails.config.custom.subcats.clearBreak.indexOf(sails.models.meta.memory.trackIDSubcat) !== -1)) { await sails.helpers.rest.cmd('PlayPlaylistTrack', 0) } // Skip currently playing track if it is not a noClearShow track

              queueLength = await sails.helpers.songs.calculateQueueLength()
            }

            // await sails.helpers.error.count('sportsReturnQueue');
            await sails.helpers.meta.change.with({ queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'sports_returning' })
            break
          case 'remote_break':
          case 'remote_break_disconnected':
            // Queue after break
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.after)
            // Queue a show return if there is one
            if (typeof sails.config.custom.showcats[ sails.models.meta.memory.show ] !== 'undefined') {
              await sails.helpers.songs.queue([ sails.config.custom.showcats[ sails.models.meta.memory.show ][ 'Show Returns' ] ], 'Bottom', 1)
            } else {
              await sails.helpers.songs.queue([ sails.config.custom.showcats[ 'Default' ][ 'Show Returns' ] ], 'Bottom', 1)
            }
            await sails.helpers.meta.change.with({ queueFinish: moment().add(await sails.helpers.songs.calculateQueueLength(), 'seconds').toISOString(true), state: 'remote_returning' })
            break
          case 'sportsremote_break':
          case 'sportsremote_break_disconnected':
            // Queue after break
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.after)
            // Queue a sports liner
            if (typeof sails.config.custom.sportscats[ sails.models.meta.memory.show ] !== 'undefined') { await sails.helpers.songs.queue([ sails.config.custom.sportscats[ sails.models.meta.memory.show ][ 'Sports Liners' ] ], 'Bottom', 1) }

            queueLength = await sails.helpers.songs.calculateQueueLength()

            if (queueLength >= sails.config.custom.queueCorrection.sportsReturn) {
              await sails.helpers.rest.cmd('EnableAutoDJ', 0) // Try to Disable autoDJ again in case it was mistakenly still active
              // await sails.helpers.songs.remove(false, sails.config.custom.subcats.clearBreak, false, false);
              if ((sails.config.custom.subcats.clearBreak && sails.config.custom.subcats.clearBreak.indexOf(sails.models.meta.memory.trackIDSubcat) !== -1)) { await sails.helpers.rest.cmd('PlayPlaylistTrack', 0) } // Skip currently playing track if it is not a noClearShow track

              queueLength = await sails.helpers.songs.calculateQueueLength()
            }

            // await sails.helpers.error.count('sportsReturnQueue');
            await sails.helpers.meta.change.with({ queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'sportsremote_returning' })
            break
        }
      }

      await sails.helpers.rest.cmd('EnableAssisted', 0)

      await sails.helpers.meta.change.with({ changingState: null })
      return exits.success()
    } catch (e) {
      await sails.helpers.meta.change.with({ changingState: null })
      return exits.error(e)
    }
  }

}
