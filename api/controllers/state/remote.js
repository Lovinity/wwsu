module.exports = {

  friendlyName: 'State / Remote',

  description: 'Request to begin a remote broadcast.',

  inputs: {
    topic: {
      type: 'string',
      defaultsTo: '',
      description: 'A string containing a short blurb about this remote broadcast.'
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
      description: 'Name of the broadcast beginning. It must follow the format "DJ names/handles (each separated with "; ", maximum 4) - show name".'
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
      if (!sails.models.meta.memory.state.startsWith('automation_') && !sails.models.meta.memory.state.startsWith('prerecord_')) {
        throw 'forbidden';
      }

      // Block this request if we are changing states right now
      if (sails.models.meta.memory.changingState !== null) { return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`)) }

      // Disallow starting a remote broadcast if the host has lockToDJ and the provided DJ either does not match lockToDJ or is not scheduled to start a remote broadcast
      if (this.req.payload.lockToDJ !== null) {
        var dj = inputs.showname.split(' - ')
        var show = dj[ 1 ];
        var djs = dj[ 0 ];
        dj = dj[ 0 ].split("; ");
        var query = { name: [], active: true };
        if (dj && dj[ 0 ])
          query.name.push(dj[ 0 ])
        if (dj && dj[ 1 ])
          query.name.push(dj[ 1 ])
        if (dj && dj[ 2 ])
          query.name.push(dj[ 2 ])
        if (dj && dj[ 3 ])
          query.name.push(dj[ 3 ])
        var djRecord;
        if (query.name.length > 0)
          djRecord = await sails.models.djs.find(query)
        if (!djRecord || djRecord.length === 0) {
          throw 'forbidden';
        } else {
          var authorized = false;
          for (var i = 0; i < djRecord.length; i++) {
            if (djRecord[ i ] && djRecord[ i ].ID === this.req.payload.lockToDJ)
              authorized = true;
          }
          if (!authorized)
            throw 'forbidden';
        }

        var record = sails.models.calendar.calendardb.whatShouldBePlaying(null, false);
        record = record.filter((event) => event.type === 'remote' && event.hosts === djs && event.name === show);
        if (record.length < 1) {
          throw 'forbidden';
        }
      }

      // Lock so that other state changing requests get blocked until we are done.
      await sails.helpers.meta.change.with({ changingState: `Switching to remote` })

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
      await sails.helpers.meta.change.with({ host: this.req.payload.ID, show: inputs.showname, topic: inputs.topic, trackStamp: null })

      // If we are not already in remote mode, prepare to go live in RadioDJ
      if (!sails.models.meta.memory.state.startsWith('remote_')) {
        // await sails.helpers.error.count('goRemote');

        // Operation: Remove all music tracks, queue a station ID, and disable auto DJ. CRON will queue and play the remote stream track once queue is empty.
        await sails.helpers.rest.cmd('EnableAutoDJ', 0)
        await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, true)
        await sails.helpers.rest.cmd('EnableAssisted', 1)
        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1)
        sails.models.status.errorCheck.prevID = moment().toISOString(true);
        await sails.helpers.error.count('stationID')
        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.start)

        // Queue a show opener if there is one
        if (typeof sails.config.custom.showcats[ sails.models.meta.memory.show ] !== 'undefined') {
          await sails.helpers.songs.queue([ sails.config.custom.showcats[ sails.models.meta.memory.show ][ 'Show Openers' ] ], 'Bottom', 1)
        } else {
          await sails.helpers.songs.queue([ sails.config.custom.showcats[ 'Default' ][ 'Show Openers' ] ], 'Bottom', 1)
        }

        await sails.helpers.rest.cmd('EnableAssisted', 0)

        var queueLength = await sails.helpers.songs.calculateQueueLength()

        // If radioDJ queue is unacceptably long, try to make it shorter.
        if (queueLength >= sails.config.custom.queueCorrection.remote) {
          await sails.helpers.rest.cmd('EnableAutoDJ', 0) // Try to Disable autoDJ again in case it was mistakenly still active
          // await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, false);

          // Add a PSA to give the DJ a little more time
          await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 1)

          if ((sails.config.custom.subcats.noClearShow && sails.config.custom.subcats.noClearShow.indexOf(sails.models.meta.memory.trackIDSubcat) === -1)) { await sails.helpers.rest.cmd('PlayPlaylistTrack', 0) } // Skip currently playing track if it is not a noClearShow track

          queueLength = await sails.helpers.songs.calculateQueueLength()
        }
        await sails.helpers.meta.changeDjs(inputs.showname);
        await sails.helpers.meta.change.with({ queueFinish: moment().add(queueLength, 'seconds').toISOString(true), state: 'automation_remote', show: inputs.showname, topic: inputs.topic, trackStamp: null, webchat: inputs.webchat })
      } else {
        // Otherwise, just update metadata but do not do anything else
        await sails.helpers.meta.changeDjs(inputs.showname);
        await sails.helpers.meta.change.with({ show: inputs.showname, topic: inputs.topic, trackStamp: null, webchat: inputs.webchat })
      }

      await sails.helpers.error.reset('automationBreak')
      await sails.helpers.meta.change.with({ changingState: null })
      return exits.success()
    } catch (e) {
      await sails.helpers.meta.change.with({ host: null, show: '', topic: '', trackStamp: null, changingState: null })
      return exits.error(e)
    }
  }

}
