module.exports = {

  friendlyName: 'State / Remote',

  description: 'Request to begin a remote broadcast.',

  inputs: {
    topic: {
      type: 'string',
      defaultsTo: '',
      description: 'A string containing a short blurb about this remote broadcast.'
    },

    showname: {
      type: 'string',
      required: true,
      custom: function (value) {
        var temp2 = value.split(' - ')
        if (temp2.length === 2) { return true }
        return false
      },
      description: 'Name of the broadcast beginning. It must follow the format "Show host - show name".'
    },

    webchat: {
      type: 'boolean',
      defaultsTo: true,
      description: 'Should the web chat be enabled during this show? Defaults to true.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller state/remote called.')
    sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`)

    try {
      // Do not continue if not in automation mode; client should request automation before requesting remote
      if (!sails.models.meta['A'].state.startsWith('automation_') && !sails.models.meta['A'].state.startsWith('remote_')) { return exits.error(new Error('Cannot execute state/remote unless in automation or remote. Please go to automation first.')) }

      // Block this request if we are changing states right now
      if (sails.models.meta['A'].changingState !== null) { return exits.error(new Error('The system is in the process of changing states. The request was blocked to prevent clashes.')) }

      // Lock so that other state changing requests get blocked until we are done.
      await sails.models.meta.changeMeta({ changingState: 'Switching to remote' })

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

      // Send meta to prevent accidental interfering messages in Dj Controls
      await sails.models.meta.changeMeta({ show: inputs.showname, topic: inputs.topic, trackStamp: null })

      // If we are not already in remote mode, prepare to go live in RadioDJ
      if (!sails.models.meta['A'].state.startsWith('remote_')) {
        // await sails.helpers.error.count('goRemote');

        // Operation: Remove all music tracks, queue a station ID, and disable auto DJ. CRON will queue and play the remote stream track once queue is empty.
        await sails.helpers.rest.cmd('EnableAutoDJ', 0)
        await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, false)
        await sails.helpers.rest.cmd('EnableAssisted', 1)
        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1)
        sails.models.status.errorCheck.prevID = moment()
        await sails.helpers.error.count('stationID')
        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.start)

        // Queue a show opener if there is one
        if (typeof sails.config.custom.showcats[sails.models.meta['A'].show] !== 'undefined') {
          await sails.helpers.songs.queue([sails.config.custom.showcats[sails.models.meta['A'].show]['Show Openers']], 'Bottom', 1)
        } else {
          await sails.helpers.songs.queue([sails.config.custom.showcats['Default']['Show Openers']], 'Bottom', 1)
        }

        await sails.helpers.rest.cmd('EnableAssisted', 0)

        var queueLength = await sails.helpers.songs.calculateQueueLength()

        // If radioDJ queue is unacceptably long, try to make it shorter.
        if (queueLength >= sails.config.custom.queueCorrection.remote) {
          await sails.helpers.rest.cmd('EnableAutoDJ', 0) // Try to Disable autoDJ again in case it was mistakenly still active
          // await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, false);

          // Add a PSA to give the DJ a little more time
          await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 1)

          if ((sails.config.custom.subcats.noClearShow && sails.config.custom.subcats.noClearShow.indexOf(sails.models.meta['A'].trackIDSubcat) === -1)) { await sails.helpers.rest.cmd('PlayPlaylistTrack', 0) } // Skip currently playing track if it is not a noClearShow track

          queueLength = await sails.helpers.songs.calculateQueueLength()
        }

        await sails.models.meta.changeMeta({ queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'automation_remote', show: inputs.showname, topic: inputs.topic, trackStamp: null, lastID: moment().toISOString(true), webchat: inputs.webchat, djcontrols: this.req.payload.host })
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
