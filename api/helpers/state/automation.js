// TODO: Make stats apply to co-hosts

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
      // Log the request
      await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'sign-off', loglevel: 'primary', logsubtype: sails.models.meta.memory.show, logIcon: `fas fa-stop`, title: `Broadcast ended ${inputs.transition ? ` and went into break.` : ` and went into automation.`}`, event: '' }).fetch()
        .tolerate((err) => {
          // Do not throw for error, but log it
          sails.log.error(err)
        })

      // Close off the current attendance record and calculate statistics.
      var attendance = await sails.helpers.attendance.createRecord()

      // What to return for DJ Controls show stats, if applicable
      var returnData = { showTime: 0 }

      // Prepare RadioDJ; we want to get something playing before we begin the intensive processes in order to avoid a long silence period.
      await sails.helpers.rest.cmd('EnableAssisted', 1)

      // If coming out of a sports broadcast, queue a closer if exists.
      if (sails.models.meta.memory.state.startsWith('sports')) {
        if (typeof sails.config.custom.sportscats[ sails.models.meta.memory.show ] !== 'undefined') {
          await sails.helpers.songs.queue([ sails.config.custom.sportscats[ sails.models.meta.memory.show ][ 'Sports Closers' ] ], 'Bottom', 1)
        }
      } else {
        if (typeof sails.config.custom.showcats[ sails.models.meta.memory.show ] !== 'undefined') { await sails.helpers.songs.queue([ sails.config.custom.showcats[ sails.models.meta.memory.show ][ 'Show Closers' ] ], 'Bottom', 1) }
      }

      // Queue a station ID and a PSA
      await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1)
      await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 1)

      // Start playing something
      await sails.helpers.rest.cmd('PlayPlaylistTrack', 0)
      sails.models.status.errorCheck.prevID = moment()
      await sails.helpers.error.count('stationID')

      // Queue ending stuff
      if (sails.models.meta.memory.state.startsWith('live_')) { await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.live.end) }

      if (sails.models.meta.memory.state.startsWith('remote_')) { await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.end) }

      if (sails.models.meta.memory.state.startsWith('sports_') || sails.models.meta.memory.state.startsWith('sportsremote_')) { await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.end) }

      // We are going to automation
      if (!inputs.transition) {
        await sails.helpers.meta.change.with({ host: null, dj: null, cohostDJ1: null, cohostDJ2: null, cohostDJ3: null, genre: '', state: 'automation_on', show: '', track: '', topic: '', webchat: true, playlist: null, lastID: moment().toISOString(true), playlistPosition: -1, playlistPlayed: moment('2002-01-01').toISOString() })
        await sails.helpers.error.reset('automationBreak')

        // Add up to 3 track requests if any are pending
        await sails.helpers.requests.queue(3, true, true)

        // Re-check and trigger any programs that should begin.
        try {
          await sails.helpers.calendar.check(true)
        } catch (unusedE2) {
          // Couldn't load calendar? Fall back to Default automation
          await sails.helpers.genre.start(null, true)
        }

        // Enable Auto DJ
        await sails.helpers.rest.cmd('EnableAutoDJ', 1)

        // We are going to break
      } else {
        await sails.helpers.meta.change.with({ host: null, dj: null, cohostDJ1: null, cohostDJ2: null, cohostDJ3: null, genre: '', state: 'automation_break', show: '', showLogo: null, track: '', topic: '', webchat: true, playlist: null, lastID: moment().toISOString(true), playlistPosition: -1, playlistPlayed: moment('2002-01-01').toISOString() })
        attendance = await sails.helpers.attendance.createRecord(null)
      }

      // Finish up
      await sails.helpers.songs.queuePending()
      await sails.helpers.rest.cmd('EnableAssisted', 0)

      await sails.helpers.meta.change.with({ changingState: null })

      // While the parallel is running, grab show time and listener minutes from attendance record.
      attendance = attendance.updatedRecord || undefined
      if (typeof attendance !== `undefined`) {
        returnData.showTime = attendance.showTime || 0
        returnData.listenerMinutes = attendance.listenerMinutes || 0
      }

      returnData.messagesWeb = await sails.models.messages.count({ to: { startsWith: 'website' }, createdAt: { '>=': moment(attendance.actualStart).toISOString(true) } })
        .tolerate((err) => {
          // Do not throw for error, but log it
          sails.log.error(err)
        })

      // Gather updated DJ stats
      if (attendance.dj !== null) { returnData = Object.assign(returnData, await sails.helpers.analytics.showtime(attendance.dj)) }

      // Get listener analytics
      returnData.listeners = await sails.helpers.analytics.listeners(attendance.actualStart, attendance.actualEnd)

      // Return our stats
      return exits.success(returnData)
    } catch (e) {
      await sails.helpers.meta.change.with({ changingState: null })
      return exits.error(e)
    }
  }

}
