module.exports = {

  friendlyName: 'State / Sports',

  description: 'Request to begin a sports broadcast.',

  inputs: {
    topic: {
      type: 'string',
      defaultsTo: '',
      description: 'A string containing a short blurb about this sports broadcast.'
    },

    sport: {
      type: 'string',
      required: true,
      isIn: sails.config.custom.sports,
      description: 'Name of the sport that is being broadcast.'
    },

    webchat: {
      type: 'boolean',
      defaultsTo: true,
      description: 'Should the web chat be enabled during this broadcast? Defaults to true.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller state/sports called.')

    try {
      // Do not continue if not in sports or automation mode; client should request automation before requesting sports
      if (!sails.models.meta.memory.state.startsWith('sports') && !sails.models.meta.memory.state.startsWith('automation_')) { return exits.error(new Error(`Cannot execute state/sports unless in automation or sports mode. Please go to automation first.`)) }

      // Block this request if we are already switching states
      if (sails.models.meta.memory.changingState !== null) { return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`)) }

      // If the specified host has lockToDJ, deny going sports because going sports live from the studio should only happen inside WWSU studios
      if (this.req.payload.lockToDJ !== null) {
        return exits.error(new Error('You are not authorized to start a non-remote sports broadcast.'))
      }

      // Lock so that any other state changing requests are blocked until we are done
      await sails.helpers.meta.change.with({ changingState: `Switching to sports` })

      // Filter profanity
      if (inputs.topic !== '') {
        inputs.topic = await sails.helpers.filterProfane(inputs.topic)
        inputs.topic = await sails.helpers.sanitize(inputs.topic)
        inputs.topic = await sails.helpers.truncateText(inputs.topic, 256)
      }

      // Set meta to prevent accidental messages in DJ Controls
      sails.helpers.meta.change.with({ show: inputs.sport, topic: inputs.topic, trackStamp: null })

      // Start the sports broadcast
      if (!sails.models.meta.memory.state.startsWith('sports')) {
        // await sails.helpers.error.count('goLive');

        // Operation: Remove all music tracks, queue a station ID, queue an opener if one exists for this sport, and start the next track if current track is music.
        await sails.helpers.rest.cmd('EnableAutoDJ', 0)
        await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, false)
        await sails.helpers.rest.cmd('EnableAssisted', 1)
        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1)
        sails.models.status.errorCheck.prevID = moment()
        await sails.helpers.error.count('stationID')
        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.start)

        // Queue a Sports opener if there is one
        if (typeof sails.config.custom.sportscats[inputs.sport] !== 'undefined') { await sails.helpers.songs.queue([sails.config.custom.sportscats[inputs.sport]['Sports Openers']], 'Bottom', 1) }

        await sails.helpers.rest.cmd('EnableAssisted', 0)

        var queueLength = await sails.helpers.songs.calculateQueueLength()

        // If the radioDJ queue is unacceptably long, try to reduce it.
        if (queueLength >= sails.config.custom.queueCorrection.sports) {
          await sails.helpers.rest.cmd('EnableAutoDJ', 0) // Try to Disable autoDJ again in case it was mistakenly still active
          // await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, false);
          if ((sails.config.custom.subcats.noClearShow && sails.config.custom.subcats.noClearShow.indexOf(sails.models.meta.memory.trackIDSubcat) === -1)) { await sails.helpers.rest.cmd('PlayPlaylistTrack', 0) } // Skip currently playing track if it is not a noClearShow track

          queueLength = await sails.helpers.songs.calculateQueueLength()
        }

        // Queue check
        // await sails.helpers.error.count('sportsQueue');

        // Change meta
        await sails.helpers.meta.change.with({ dj: null, cohostDJ1: null, cohostDJ2: null, cohostDJ3: null, queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'automation_sports', show: inputs.sport, topic: inputs.topic, trackStamp: null, lastID: moment().toISOString(true), webchat: inputs.webchat })
      } else {
        // Otherwise, just update metadata but do not do anything else
        await sails.helpers.meta.change.with({ dj: null, cohostDJ1: null, cohostDJ2: null, cohostDJ3: null, show: inputs.sport, topic: inputs.topic, trackStamp: null, webchat: inputs.webchat })
      }

      await sails.helpers.error.reset('automationBreak')
      await sails.helpers.meta.change.with({ changingState: null })
      return exits.success()
    } catch (e) {
      await sails.helpers.meta.change.with({ changingState: null })
      return exits.error(e)
    }
  }

}
