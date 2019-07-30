module.exports = {

  friendlyName: 'state.automation',

  description: 'Request to go into automation mode.',

  inputs: {
    transition: {
      type: 'boolean',
      defaultsTo: false,
      description: 'If true, system will go into break mode instead of automation to allow for quick transitioning between radio shows.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper state.automation called.')

    try {
      // What to return for DJ Controls show stats, if applicable
      var returnData = { showTime: 0, subtotalXP: 0 }

      // Duplicate current meta dj since it's about to change; we need it for stats calculations
      var dj = sails.models.meta['A'].dj
      var showStamp = sails.models.meta['A'].showStamp
      var attendance

      if (dj === null) {
        delete returnData.subtotalXP
      }

      // Log the request
      await sails.models.logs.create({ attendanceID: sails.models.meta['A'].attendanceID, logtype: 'sign-off', loglevel: 'primary', logsubtype: sails.models.meta['A'].show, event: '<strong>Show ended.</strong>' }).fetch()
        .tolerate((err) => {
          // Do not throw for error, but log it
          sails.log.error(err)
        })

      // Close off the current attendance record and calculate statistics.
      attendance = await sails.models.attendance.createRecord();

      // Begin parallel function for sending the system into automation
      (async () => {
        // Prepare RadioDJ; we want to get something playing before we begin the intensive processes in order to avoid a long silence period.
        await sails.helpers.rest.cmd('EnableAssisted', 1)

        // If coming out of a sports broadcast, queue a closer if exists.
        if (sails.models.meta['A'].state.startsWith('sports')) {
          if (typeof sails.config.custom.sportscats[sails.models.meta['A'].show] !== 'undefined') {
            await sails.helpers.songs.queue([sails.config.custom.sportscats[sails.models.meta['A'].show]['Sports Closers']], 'Bottom', 1)
          }
        } else {
          if (typeof sails.config.custom.showcats[sails.models.meta['A'].show] !== 'undefined') { await sails.helpers.songs.queue([sails.config.custom.showcats[sails.models.meta['A'].show]['Show Closers']], 'Bottom', 1) }
        }

        // Queue a station ID and a PSA
        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1)
        await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 1)

        // Start playing something
        await sails.helpers.rest.cmd('PlayPlaylistTrack', 0)
        sails.models.status.errorCheck.prevID = moment()
        await sails.helpers.error.count('stationID')

        // Queue ending stuff
        if (sails.models.meta['A'].state.startsWith('live_')) { await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.live.end) }

        if (sails.models.meta['A'].state.startsWith('remote_')) { await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.end) }

        if (sails.models.meta['A'].state.startsWith('sports_') || sails.models.meta['A'].state.startsWith('sportsremote_')) { await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.end) }

        // We are going to automation
        if (!inputs.transition) {
          await sails.models.meta.changeMeta({ genre: '', state: 'automation_on', show: '', track: '', djcontrols: '', topic: '', webchat: true, playlist: null, lastID: moment().toISOString(true), playlist_position: -1, playlist_played: moment('2002-01-01').toISOString() })
          await sails.helpers.error.reset('automationBreak')

          // Add up to 3 track requests if any are pending
          await sails.helpers.requests.queue(3, true, true)

          // Re-load google calendar events to check for, and execute, any playlists/genres/etc that are scheduled.
          try {
            await sails.models.calendar.preLoadEvents(true)
          } catch (unusedE2) {
            // Couldn't load calendar? Fall back to Default automation
            await sails.helpers.genre.start('Default', true)
          }

          // Enable Auto DJ
          await sails.helpers.rest.cmd('EnableAutoDJ', 1)

          // We are going to break
        } else {
          await sails.models.meta.changeMeta({ genre: '', state: 'automation_break', show: '', track: '', djcontrols: '', topic: '', webchat: true, playlist: null, lastID: moment().toISOString(true), playlist_position: -1, playlist_played: moment('2002-01-01').toISOString() })
          attendance = await sails.models.attendance.createRecord(`Genre: Default`)
        }

        // Finish up
        await sails.helpers.songs.queuePending()
        await sails.helpers.rest.cmd('EnableAssisted', 0)

        await sails.models.meta.changeMeta({ changingState: null })

        return true
      })()

      // While the parallel is running, grab show time and listener minutes from attendance record and award XP.
      attendance = attendance.updatedRecord || undefined
      if (typeof attendance !== `undefined`) {
        returnData.showTime = attendance.showTime || 0
        returnData.listenerMinutes = attendance.listenerMinutes || 0
        if (dj !== null) {
          returnData.showXP = Math.round(returnData.showTime / sails.config.custom.XP.showMinutes)
          returnData.subtotalXP += returnData.showXP
          await sails.models.xp.create({ dj: dj, type: 'xp', subtype: 'showtime', amount: returnData.showXP, description: `DJ was on the air for ${returnData.showTime} minutes.` })
            .tolerate((err) => {
              // Do not throw for error, but log it
              sails.log.error(err)
              returnData.subtotalXP -= returnData.showXP
              delete returnData.showXP
            })

          returnData.listenerXP = Math.round(returnData.listenerMinutes / sails.config.custom.XP.listenerMinutes)
          returnData.subtotalXP += returnData.listenerXP
          await sails.models.xp.create({ dj: dj, type: 'xp', subtype: 'listeners', amount: returnData.listenerXP, description: `DJ had ${returnData.listenerMinutes} online listener minutes during their show.` })
            .tolerate((err) => {
              // Do not throw for error, but log it
              sails.log.error(err)
              returnData.subtotalXP -= returnData.listenerXP
              delete returnData.listenerXP
            })
        }
      }

      // Earn XP for sending messages to website visitors
      returnData.messagesWeb = await sails.models.messages.count({ from: this.req.payload.host, to: { startsWith: 'website' }, createdAt: { '>=': moment(showStamp).toISOString(true) } })
        .tolerate((err) => {
          // Do not throw for error, but log it
          sails.log.error(err)
        })

      if (returnData.messagesWeb) {
        if (dj !== null) {
          returnData.messagesXP = Math.round(returnData.messagesWeb * sails.config.custom.XP.web)
          returnData.subtotalXP += returnData.messagesXP
          await sails.models.xp.create({ dj: dj, type: 'xp', subtype: 'messages', amount: returnData.messagesXP, description: `DJ sent ${returnData.messagesWeb} messages to web visitors during their show.` })
            .tolerate((err) => {
              // Do not throw for error, but log it
              sails.log.error(err)
              returnData.subtotalXP -= returnData.messagesXP
              delete returnData.messagesXP
            })
        }
      }

      // Gather updated DJ stats
      if (dj !== null) { returnData = Object.assign(returnData, await sails.helpers.analytics.showtime(dj)) }

      // Return our stats
      return exits.success(returnData)
    } catch (e) {
      await sails.models.meta.changeMeta({ changingState: null })
      return exits.error(e)
    }
  }

}
