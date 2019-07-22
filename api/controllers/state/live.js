module.exports = {

  friendlyName: 'state / live',

  description: 'Request to go live.',

  inputs: {
    topic: {
      type: 'string',
      defaultsTo: '',
      description: 'A string containing a short blurb about this live broadcast.'
    },

    showname: {
      type: 'string',
      required: true,
      custom: function (value) {
        var temp2 = value.split(' - ')
        if (temp2.length === 2) { return true }
        return false
      },
      description: 'Name of the show beginning. It must follow the format "DJ name/handle - show name".'
    },

    webchat: {
      type: 'boolean',
      defaultsTo: true,
      description: 'Should the web chat be enabled during this show? Defaults to true.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller state/live called.')
    sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`)

    try {
      // Do not continue if not in live or automation mode; client should request automation before requesting live
      if (!sails.models.meta['A'].state.startsWith('live_') && !sails.models.meta['A'].state.startsWith('automation_')) { return exits.error(new Error(`Cannot execute state/live unless in automation or live mode. Please go to automation first.`)) }

      // Block the request if we are changing states right now
      if (sails.models.meta['A'].changingState !== null) { return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`)) }

      // Lock so other state changing requests get blocked until we are done
      await sails.models.meta.changeMeta({ changingState: `Switching to live` })

      // Filter profanity and sanitize
      if (inputs.topic !== '') {
        inputs.topic = await sails.helpers.filterProfane(inputs.topic)
        inputs.topic = await sails.helpers.sanitize(inputs.topic)
        inputs.topic = await sails.helpers.truncateText(inputs.topic, 256)
      }
      if (inputs.showname !== '') {
        inputs.showname = await sails.helpers.filterProfane(inputs.showname)
        inputs.showname = await sails.helpers.sanitize(inputs.showname)
      }

      // Send meta early so that DJ Controls does not think this person is interfering with another show
      await sails.models.meta.changeMeta({ show: inputs.showname, topic: inputs.topic, trackStamp: null })

      // If we are not already in live mode, prepare to go live in RadioDJ
      if (!sails.models.meta['A'].state.startsWith('live_') || sails.models.meta['A'].state === 'live_prerecord') {
        // await sails.helpers.error.count('goLive');

        // Operation: Remove all music tracks, queue a station ID, and disable auto DJ.
        await sails.helpers.rest.cmd('EnableAutoDJ', 0)
        await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, false)
        await sails.helpers.rest.cmd('EnableAssisted', 1)
        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1)
        sails.models.status.errorCheck.prevID = moment()
        await sails.helpers.error.count('stationID')
        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.live.start)

        // Queue a show opener if applicable
        if (typeof sails.config.custom.showcats[sails.models.meta['A'].show] !== 'undefined') {
          await sails.helpers.songs.queue([sails.config.custom.showcats[sails.models.meta['A'].show]['Show Openers']], 'Bottom', 1)
        } else {
          await sails.helpers.songs.queue([sails.config.custom.showcats['Default']['Show Openers']], 'Bottom', 1)
        }

        var queueLength = await sails.helpers.songs.calculateQueueLength()

        // If our queue length in RadioDJ is unacceptably long, try to reduce it further.
        if (queueLength >= sails.config.custom.queueCorrection.live) {
          await sails.helpers.rest.cmd('EnableAutoDJ', 0) // Try to Disable autoDJ again in case it was mistakenly still active
          // await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, false);

          // Add a PSA to give the DJ a little more time
          await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 1)

          if ((sails.config.custom.subcats.noClearShow && sails.config.custom.subcats.noClearShow.indexOf(sails.models.meta['A'].trackIDSubcat) === -1)) { await sails.helpers.rest.cmd('PlayPlaylistTrack', 0) } // Skip currently playing track if it is not a noClearShow track

          queueLength = await sails.helpers.songs.calculateQueueLength()
        }

        await sails.helpers.rest.cmd('EnableAssisted', 0)
        await sails.models.meta.changeMeta({ queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'automation_live', show: inputs.showname, topic: inputs.topic, trackStamp: null, lastID: moment().toISOString(true), webchat: inputs.webchat, djcontrols: this.req.payload.host })
      } else {
        // Otherwise, just update metadata but do not do anything else
        await sails.models.meta.changeMeta({ show: inputs.showname, topic: inputs.topic, trackStamp: null, webchat: inputs.webchat, djcontrols: this.req.payload.host })
      }

      await sails.helpers.error.reset('automationBreak')
      await sails.models.meta.changeMeta({ changingState: null })
      return exits.success()
    } catch (e) {
      await sails.models.meta.changeMeta({ changingState: null })
      return exits.error(e)
    }
  }

}
