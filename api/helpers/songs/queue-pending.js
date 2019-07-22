module.exports = {

  friendlyName: `songs.queuePending`,

  description: `Queue songs that have been added to the pending list, such as duplicate underwritings.`,

  inputs: {
    queue: {
      type: `boolean`,
      defaultsTo: false,
      description: `If true, instead of executing right away, song tracks will be added to a queue where one song is queued every execution of the check CRON. In addition, this helper call will not resolve until all songs are queued.`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper songs.queuePending called.`)

    // Load in any duplicate non-music tracks that were removed prior, to ensure underwritings etc get proper play counts.
    if (sails.models.songs.pending.length > 0) {
      var maps = sails.models.songs.pending.map(async (track, index) => {
        await sails.helpers.rest.cmd(`LoadTrackToTop`, track, 10000)
        if (inputs.queue) { await sails.helpers.rest.checkQueue(track) }
        // wait.for.time(1);
        delete sails.models.songs.pending[index]
        return true
      })
      await Promise.all(maps)
    }
    // All done.
    return exits.success()
  }

}
