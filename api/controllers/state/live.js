module.exports = {

  friendlyName: 'state / live',

  description: 'Request to go live.',

  inputs: {
    topic: {
      type: 'string',
      defaultsTo: '',
      description: 'A string containing a short blurb about this live broadcast.'
    },

    // TODO: Deprecate this and change to DJ / show name fields in v8
    showname: {
      type: 'string',
      required: true,
      custom: function (value) {
        var temp2 = value.split(' - ')
        if (temp2.length !== 2) { return false }
        var temp3 = temp2[ 0 ].split("; ");
        if (temp3.length > 4) { return false }
        return true
      },
      description: 'Name of the show beginning. It must follow the format "DJ names/handles (each separated with "; ", maximum 4) - show name".'
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
      // Do not continue if not in prerecord or automation mode; client should request automation before requesting live
      if (!sails.models.meta.memory.state.startsWith('automation_') && !sails.models.meta.memory.state.startsWith('prerecord_')) {
        throw 'forbidden';
      }

      // Block the request if we are changing states right now
      if (sails.models.meta.memory.changingState !== null) { return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`)) }

      // If the specified host has lockToDJ, deny going live because going live should only happen inside WWSU studios
      if (this.req.payload.lockToDJ !== null) {
        throw 'forbidden';
      }

      // Lock so other state changing requests get blocked until we are done
      await sails.helpers.meta.change.with({ changingState: `Switching to live` })

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
      await sails.helpers.meta.change.with({ host: this.req.payload.ID, show: inputs.showname, topic: inputs.topic, trackStamp: null })

      // If we are not already in live mode, prepare to go live in RadioDJ
      if (!sails.models.meta.memory.state.startsWith('live_')) {
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
        if (typeof sails.config.custom.showcats[ sails.models.meta.memory.show ] !== 'undefined') {
          await sails.helpers.songs.queue([ sails.config.custom.showcats[ sails.models.meta.memory.show ][ 'Show Openers' ] ], 'Bottom', 1)
        } else {
          await sails.helpers.songs.queue([ sails.config.custom.showcats[ 'Default' ][ 'Show Openers' ] ], 'Bottom', 1)
        }

        var queueLength = await sails.helpers.songs.calculateQueueLength()

        // If our queue length in RadioDJ is unacceptably long, try to reduce it further.
        if (queueLength >= sails.config.custom.queueCorrection.live) {
          await sails.helpers.rest.cmd('EnableAutoDJ', 0) // Try to Disable autoDJ again in case it was mistakenly still active
          // await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, false);

          // Add a PSA to give the DJ a little more time
          await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 1)

          if ((sails.config.custom.subcats.noClearShow && sails.config.custom.subcats.noClearShow.indexOf(sails.models.meta.memory.trackIDSubcat) === -1)) { await sails.helpers.rest.cmd('PlayPlaylistTrack', 0) } // Skip currently playing track if it is not a noClearShow track

          queueLength = await sails.helpers.songs.calculateQueueLength()
        }

        await sails.helpers.rest.cmd('EnableAssisted', 0)
        await sails.helpers.meta.changeDjs(inputs.showname);
        await sails.helpers.meta.change.with({ queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'automation_live', show: inputs.showname, topic: inputs.topic, trackStamp: null, lastID: moment().toISOString(true), webchat: inputs.webchat })
      } else {
        // Otherwise, just update metadata but do not do anything else
        await sails.helpers.meta.changeDjs(inputs.showname);
        await sails.helpers.meta.change.with({ show: inputs.showname, topic: inputs.topic, trackStamp: null, webchat: inputs.webchat })
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
