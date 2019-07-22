module.exports = {

  friendlyName: 'State / Return',

  description: 'Return from a break.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller state/return called.')

    try {
      // Block this request if we are already changing states
      if (sails.models.meta['A'].changingState !== null) { return exits.error(new Error('The system is in the process of changing states. The request was blocked to prevent clashes.')) }

      // Lock so that other state changing requests get blocked until we are done
      await sails.models.meta.changeMeta({ changingState: 'Returning from break' });

      // log it
      (async () => {
        await sails.models.logs.create({ attendanceID: sails.models.meta['A'].attendanceID, logtype: 'return', loglevel: 'info', logsubtype: sails.models.meta['A'].show, event: '<strong>Return from break requested.</strong>' }).fetch()
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
      if (sails.models.meta['A'].state.includes('halftime')) {
        // Queue a legal ID
        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1)
        sails.models.status.errorCheck.prevID = moment()
        sails.models.status.errorCheck.prevBreak = moment()
        await sails.helpers.error.count('stationID')

        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.after)

        // Queue a sports liner
        if (typeof sails.config.custom.sportscats[sails.models.meta['A'].show] !== 'undefined') { await sails.helpers.songs.queue([sails.config.custom.sportscats[sails.models.meta['A'].show]['Sports Liners']], 'Bottom', 1) }

        var queueLength = await sails.helpers.songs.calculateQueueLength()

        // If queue is unacceptably long, try to speed the process up.
        if (queueLength >= sails.config.custom.queueCorrection.sportsReturn) {
          await sails.helpers.rest.cmd('EnableAutoDJ', 0) // Try to Disable autoDJ again in case it was mistakenly still active
          // await sails.helpers.songs.remove(false, sails.config.custom.subcats.clearBreak, false, false);
          if ((sails.config.custom.subcats.clearBreak && sails.config.custom.subcats.clearBreak.indexOf(sails.models.meta['A'].trackIDSubcat) !== -1)) { await sails.helpers.rest.cmd('PlayPlaylistTrack', 0) } // Skip currently playing track if it is not a noClearShow track

          queueLength = await sails.helpers.songs.calculateQueueLength()
        }

        // await sails.helpers.error.count('sportsReturnQueue');

        // Change state
        if (sails.models.meta['A'].state === 'sportsremote_halftime' || sails.models.meta['A'].state === 'sportsremote_halftime_disconnected') {
          await sails.models.meta.changeMeta({ queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'sportsremote_returning', lastID: moment().toISOString(true) })
        } else {
          await sails.models.meta.changeMeta({ queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'sports_returning', lastID: moment().toISOString(true) })
        }
      } else {
        sails.models.status.errorCheck.prevBreak = moment()

        // Do stuff depending on the state
        switch (sails.models.meta['A'].state) {
          case 'live_break':
            // Queue after break
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.live.after)

            // Queue a show return if there is one
            if (typeof sails.config.custom.showcats[sails.models.meta['A'].show] !== 'undefined') {
              await sails.helpers.songs.queue([sails.config.custom.showcats[sails.models.meta['A'].show]['Show Returns']], 'Bottom', 1)
            } else {
              await sails.helpers.songs.queue([sails.config.custom.showcats['Default']['Show Returns']], 'Bottom', 1)
            }

            await sails.models.meta.changeMeta({ queueFinish: moment().add(await sails.helpers.songs.calculateQueueLength(), 'seconds').toISOString(true), state: 'live_returning' })
            break
          case 'sports_break':
            // Queue after break
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.after)

            queueLength = await sails.helpers.songs.calculateQueueLength()

            if (queueLength >= sails.config.custom.queueCorrection.sportsReturn) {
              await sails.helpers.rest.cmd('EnableAutoDJ', 0) // Try to Disable autoDJ again in case it was mistakenly still active
              // await sails.helpers.songs.remove(false, sails.config.custom.subcats.clearBreak, false, false);
              if ((sails.config.custom.subcats.clearBreak && sails.config.custom.subcats.clearBreak.indexOf(sails.models.meta['A'].trackIDSubcat) !== -1)) { await sails.helpers.rest.cmd('PlayPlaylistTrack', 0) } // Skip currently playing track if it is not a noClearShow track

              queueLength = await sails.helpers.songs.calculateQueueLength()
            }

            // await sails.helpers.error.count('sportsReturnQueue');
            await sails.models.meta.changeMeta({ queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'sports_returning' })
            break
          case 'remote_break':
          case 'remote_break_disconnected':
            // Queue after break
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.after)
            // Queue a show return if there is one
            if (typeof sails.config.custom.showcats[sails.models.meta['A'].show] !== 'undefined') {
              await sails.helpers.songs.queue([sails.config.custom.showcats[sails.models.meta['A'].show]['Show Returns']], 'Bottom', 1)
            } else {
              await sails.helpers.songs.queue([sails.config.custom.showcats['Default']['Show Returns']], 'Bottom', 1)
            }
            await sails.models.meta.changeMeta({ queueFinish: moment().add(await sails.helpers.songs.calculateQueueLength(), 'seconds').toISOString(true), state: 'remote_returning' })
            break
          case 'sportsremote_break':
          case 'sportsremote_break_disconnected':
            // Queue after break
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.after)
            queueLength = await sails.helpers.songs.calculateQueueLength()

            if (queueLength >= sails.config.custom.queueCorrection.sportsReturn) {
              await sails.helpers.rest.cmd('EnableAutoDJ', 0) // Try to Disable autoDJ again in case it was mistakenly still active
              // await sails.helpers.songs.remove(false, sails.config.custom.subcats.clearBreak, false, false);
              if ((sails.config.custom.subcats.clearBreak && sails.config.custom.subcats.clearBreak.indexOf(sails.models.meta['A'].trackIDSubcat) !== -1)) { await sails.helpers.rest.cmd('PlayPlaylistTrack', 0) } // Skip currently playing track if it is not a noClearShow track

              queueLength = await sails.helpers.songs.calculateQueueLength()
            }

            // await sails.helpers.error.count('sportsReturnQueue');
            await sails.models.meta.changeMeta({ queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'sportsremote_returning' })
            break
        }
      }

      await sails.helpers.rest.cmd('EnableAssisted', 0)

      await sails.models.meta.changeMeta({ changingState: null })
      return exits.success()
    } catch (e) {
      await sails.models.meta.changeMeta({ changingState: null })
      return exits.error(e)
    }
  }

}
