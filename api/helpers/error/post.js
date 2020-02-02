module.exports = {

  friendlyName: 'error.post helper',

  description: 'Used after switching RadioDJ instances; resets the queue on the new RadioDJ instance if necessary.',

  inputs: {
    oldQueue: {
      type: 'ref',
      description: 'Array of sails.models.meta.automation before radioDJs were switched. This will be re-queued in the new RadioDJ.',
      required: false
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper error.post called.')
    try {
      var reQueue = []
      var maps
      if (inputs.oldQueue && inputs.oldQueue.length > 1) {
        try {
          inputs.oldQueue
            .filter((queueItem, index) => index > 0)
            .map(queueItem => reQueue.push(queueItem.ID))
        } catch (unusedE2) {
          // Do nothing on error
        }
      }
      // When in automation, but not playlist, queue an ID and re-queue oldQueue
      if (sails.models.meta.memory.state.startsWith('automation_') && sails.models.meta.memory.state !== 'automation_playlist') {
        sails.log.verbose(`Automation recovery triggered.`)
        await sails.helpers.rest.cmd('EnableAssisted', 1)
        await sails.helpers.rest.cmd('ClearPlaylist', 1)
        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1)
        await sails.helpers.rest.cmd('EnableAssisted', 0)
        await sails.helpers.rest.cmd('PlayPlaylistTrack', 0)
        // LINT: await is required by Sails.js
        // eslint-disable-next-line no-return-await
        maps = reQueue.map(async (queueItem) => await sails.helpers.rest.cmd('LoadTrackToBottom', queueItem))
        await Promise.all(maps)
        await sails.helpers.calendar.check(true);

        await sails.helpers.rest.cmd('EnableAutoDJ', 1)
        // When in playlist or prerecord, queue an ID and restart the playlist/prerecord
      } else if (sails.models.meta.memory.state === 'automation_playlist' || sails.models.meta.memory.state.startsWith('prerecord_')) {
        sails.log.verbose(`Playlist recovery triggered.`)
        await sails.helpers.rest.cmd('EnableAutoDJ', 0)
        await sails.helpers.rest.cmd('EnableAssisted', 1)
        await sails.helpers.rest.cmd('ClearPlaylist', 1)
        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1)
        await sails.helpers.rest.cmd('EnableAssisted', 0)
        await sails.helpers.rest.cmd('PlayPlaylistTrack', 0)
        // LINT: await is required by Sails.js
        // eslint-disable-next-line no-return-await
        maps = reQueue.map(async (queueItem) => await sails.helpers.rest.cmd('LoadTrackToBottom', queueItem))
        await Promise.all(maps)
        // When in break, queue PSAs
      } else if (sails.models.meta.memory.state.includes('_break') || sails.models.meta.memory.state.includes('_returning') || sails.models.meta.memory.state.includes('_disconnected')) {
        sails.log.verbose(`Break recovery triggered.`)
        await sails.helpers.rest.cmd('EnableAutoDJ', 0)
        await sails.helpers.rest.cmd('EnableAssisted', 1)
        await sails.helpers.rest.cmd('ClearPlaylist', 1)
        await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 1)
        await sails.helpers.rest.cmd('EnableAssisted', 0)
        await sails.helpers.rest.cmd('PlayPlaylistTrack', 0)
        // LINT: await is required by Sails.js
        // eslint-disable-next-line no-return-await
        maps = reQueue.map(async (queueItem) => await sails.helpers.rest.cmd('LoadTrackToBottom', queueItem))
        await Promise.all(maps)
      }

      // All done.
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
