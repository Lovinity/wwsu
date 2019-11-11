var running = false;

module.exports = {

  friendlyName: 'rest.getQueue',

  description: 'Get the current RadioDJ queue. Also, update it in the sails.models.meta.automation variable for local access.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper rest.getQueue called.')
    try {
      // Return queue in memory instead of checking for the current queue if we are waiting for a healthy RadioDJ to report, or if this helper is still running from another call.
      if (sails.models.status.errorCheck.waitForGoodRadioDJ || running) { return exits.success(sails.models.meta.automation) }

      running = true;
      // Query for the radioDJ queue and update sails.models.meta.automation with the queue.
      // LINT: Do not camel case; parameters are for needle.
      // eslint-disable-next-line camelcase
      var resp = await needle('get', sails.models.meta.memory.radiodj + '/p?auth=' + sails.config.custom.rest.auth, {}, { open_timeout: 3000, response_timeout: 3000, read_timeout: 3000, headers: { 'Content-Type': 'application/json' } });
      // No queue? Return empty array
      if (!resp || typeof resp.body === 'undefined' || typeof resp.body.name === 'undefined' || (resp.body.name !== 'ArrayOfSongData' && resp.body.name !== 'SongData')) {
        running = false;
        return exits.success([])
      }

      // RadioDJ will not return an array if there is only one song in the queue. But we ALWAYS want an array.
      if (resp.body.name === 'ArrayOfSongData') {
        sails.models.meta.automation = []
        resp.body.children.map(trackA => {
          var theTrack = {}
          trackA.children.map(track => { theTrack[ track.name ] = track.value })
          sails.models.meta.automation.push(theTrack)
        })
      } else {
        sails.models.meta.automation = []
        var theTrack = {}
        resp.body.children.map(track => { theTrack[ track.name ] = track.value })
        sails.models.meta.automation.push(theTrack)
      }

      // Run through sails.models.songs.queueCheck and resolve any songs detected as in the queue.
      var inQueue = []
      sails.models.meta.automation.map(track => inQueue.push(parseInt(track.ID)))
      sails.log.verbose(JSON.stringify(inQueue))
      sails.models.songs.queueCheck.map((check, index) => {
        sails.log.verbose(`queueCheck ${check.ID}`)
        if (inQueue.indexOf(check.ID) !== -1) {
          sails.log.verbose(`IN QUEUE. Resolving success.`)
          check.success()
          delete sails.models.songs.queueCheck[ index ]
        } else if (moment().diff(moment(check.time), 'seconds') >= 10) {
          check.error(new Error(`Did not find track ${check.ID} in the queue after 10 seconds.`))
          delete sails.models.songs.queueCheck[ index ]
        }
      })

      running = false;
      return exits.success(sails.models.meta.automation)
    } catch (e) {
      running = false;
      return exits.error(e)
    }
  }

}
