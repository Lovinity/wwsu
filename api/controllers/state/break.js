module.exports = {

  friendlyName: 'State / Break',

  description: 'Go to a break.',

  inputs: {
    halftime: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Halftime is true if this is an extended or halftime sports break, rather than a standard one.'
    },

    problem: {
      type: 'boolean',
      defaultsTo: false,
      description: 'If true, will play a configured technicalIssue liner as the break begins, such as if the break was triggered because of an issue. Defaults to false.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller state/break called.')
    try {
      // Block this request if we are already trying to change states
      if (sails.models.meta.memory.changingState !== null) { return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`)) }

      // Prevent state changing if host is lockToDJ and the specified lockToDJ is not on the air.
      // EXCEPTION: We are doing a remote broadcast, the host has answerCalls or MakeCalls = true, and inputs.problem = true
      if (this.req.payload.ID !== sails.models.meta.memory.host && this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ1 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ2 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ3) {
        if (!inputs.problem || ((!sails.models.meta.memory.state.startsWith('remote') && !sails.models.meta.memory.state.startsWith('sportsremote')) || (!this.req.payload.makeCalls && !this.req.payload.answerCalls))) {
          throw 'forbidden';
        }
      }

      // Lock so that other state changing requests get blocked until we are done
      await sails.helpers.meta.change.with({ changingState: `Going into break` })

      // Do not allow a halftime break if not in a sports broadcast
      if (!sails.models.meta.memory.state.startsWith('sports') && inputs.halftime) { inputs.halftime = false }

      // Log it in a separate self-calling async function that we do not await so it does not block the rest of the call.
      // Also, increment break number in attendance record.
      (async () => {
        await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'break', loglevel: 'info', logsubtype: sails.models.meta.memory.show, logIcon: `fas fa-coffee`, title: `Host requested to take a break.`, event: '' }).fetch()
          .tolerate((err) => {
            // Do not throw for errors, but log it.
            sails.log.error(err)
          })
      })()

      // If this break was triggered because of a technical problem, play a technical problem liner
      if (inputs.problem) {
        await sails.helpers.songs.queue(sails.config.custom.subcats.technicalIssues, 'Top', 1, 'noRules')
        if (sails.models.meta.memory.state.startsWith('sportsremote_') || sails.models.meta.memory.state.startsWith('remote_')) {
          await sails.sockets.broadcast('silent-call', 'silent-call', true)
        }
      }

      // halftime break? Play a station ID and then begin halftime music
      if (inputs.halftime) {
        // Queue and play tracks
        await sails.helpers.rest.cmd('EnableAssisted', 1)
        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1)
        await sails.helpers.rest.cmd('PlayPlaylistTrack', 0)
        await sails.helpers.rest.cmd('EnableAssisted', 0)
        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.before)
        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.duringHalftime)

        sails.models.status.errorCheck.prevID = moment()
        sails.models.status.errorCheck.prevBreak = moment()
        await sails.helpers.error.count('stationID')

        // Change state to halftime mode
        if (sails.models.meta.memory.state.startsWith('sportsremote')) {
          await sails.helpers.meta.change.with({ state: 'sportsremote_halftime', lastID: moment().toISOString(true) })
        } else {
          await sails.helpers.meta.change.with({ state: 'sports_halftime', lastID: moment().toISOString(true) })
        }

        // Standard break
      } else {
        sails.models.status.errorCheck.prevBreak = moment()

        // Queue and play tracks
        await sails.helpers.rest.cmd('EnableAssisted', 1)
        var d = new Date()
        var num = d.getMinutes()
        // Queue station ID if between :55 and :05, or if it's been more than 50 minutes since the last ID break.
        if (num >= 55 || num < 5 || sails.models.status.errorCheck.prevID === null || moment().diff(moment(sails.models.status.errorCheck.prevID)) > (60 * 50 * 1000)) {
          await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1)
          sails.models.status.errorCheck.prevID = moment()
          await sails.helpers.error.count('stationID')
          await sails.helpers.meta.change.with({ lastID: moment().toISOString(true) })
        }

        // Execute appropriate breaks, and switch state to break
        switch (sails.models.meta.memory.state) {
          case 'live_on':
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.live.before)
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.live.during)
            await sails.helpers.meta.change.with({ state: 'live_break' })
            break
          case 'remote_on':
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.before)
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.during)
            await sails.helpers.meta.change.with({ state: 'remote_break' })
            break
          case 'sports_on':
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.before)
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.during)
            await sails.helpers.meta.change.with({ state: 'sports_break' })
            break
          case 'sportsremote_on':
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.before)
            await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.during)
            await sails.helpers.meta.change.with({ state: 'sportsremote_break' })
            break
        }

        await sails.helpers.rest.cmd('PlayPlaylistTrack', 0)
        await sails.helpers.rest.cmd('EnableAssisted', 0)
      }

      await sails.helpers.meta.change.with({ changingState: null })
      return exits.success()
    } catch (e) {
      await sails.helpers.meta.change.with({ changingState: null })
      return exits.error(e)
    }
  }

}
