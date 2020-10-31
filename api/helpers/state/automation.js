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

      // Close off the current attendance record.
      await sails.helpers.attendance.createRecord(inputs.transition ? null : undefined)

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

      // Queue ending stuff
      if (sails.models.meta.memory.state.startsWith('live_')) { await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.live.end) }

      if (sails.models.meta.memory.state.startsWith('remote_')) { await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.end) }

      if (sails.models.meta.memory.state.startsWith('sports_') || sails.models.meta.memory.state.startsWith('sportsremote_')) { await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.end) }

      // Queue a station ID and two PSAs
      await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1)
      await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Bottom', 2)

      // Start playing something
      await sails.helpers.rest.cmd('PlayPlaylistTrack', 0)
      sails.models.status.errorCheck.prevID = moment()
      await sails.helpers.error.count('stationID')

      // We are going to automation
      if (!inputs.transition) {
        await sails.helpers.meta.change.with({ host: null, dj: null, cohostDJ1: null, cohostDJ2: null, cohostDJ3: null, genre: '', state: 'automation_on', show: '', track: '', topic: '', webchat: true, playlist: null, playlistPosition: -1, playlistPlayed: moment('2002-01-01').toISOString(), hostCalling: null, hostCalled: null })
        await sails.helpers.error.reset('automationBreak')

        // Add up to 3 track requests if any are pending
        await sails.helpers.requests.queue(3, true, true)

        // Re-check and trigger any programs that should begin.
        try {
          await sails.helpers.calendar.check(true)
        } catch (e2) {
          // Couldn't load calendar? Fall back to Default automation
          sails.log.error(e2);
          await sails.helpers.genre.start(null, true)
        }

        // Enable Auto DJ
        await sails.helpers.rest.cmd('EnableAutoDJ', 1)

        // We are going to break
      } else {
        await sails.helpers.meta.change.with({ host: null, dj: null, cohostDJ1: null, cohostDJ2: null, cohostDJ3: null, genre: '', state: 'automation_break', show: '', showLogo: null, track: '', topic: '', webchat: true, playlist: null, playlistPosition: -1, playlistPlayed: moment('2002-01-01').toISOString(), hostCalling: null, hostCalled: null })
      }

      await sails.helpers.songs.queuePending()
      await sails.helpers.rest.cmd('EnableAssisted', 0)

      await sails.helpers.meta.change.with({ changingState: null })

      return exits.success()
    } catch (e) {
      await sails.helpers.meta.change.with({ changingState: null })
      return exits.error(e)
    }
  }

}
