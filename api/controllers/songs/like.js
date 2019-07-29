module.exports = {

  friendlyName: 'songs/like',

  description: 'Registers a like for the song ID. This in-turn bumps its priority in RadioDJ.',

  inputs: {
    trackID: {
      type: 'number',
      required: true,
      description: 'The ID of the track being liked.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller songs/like called.')

    try {
      // Get the hosts's IP address first
      var fromIP = await sails.helpers.getIp(this.req)

      // First, get the track record from the database (and reject if it does not exist)
      var track = await sails.models.songs.findOne({ ID: inputs.trackID })
      if (!track) { return exits.error(new Error(`The track ID provided does not exist.`)) }

      var query = { IP: fromIP, ID: inputs.trackID }

      // If config specifies users can like tracks multiple times, add a date condition.
      if (sails.config.custom.songsliked.limit > 0) { query.createdAt = { '>=': moment().subtract(sails.config.custom.songsliked.limit, 'days').toISOString(true) } }

      // First, check if the client already liked the track recently. Error if it cannot be liked again at this time.
      var records = await sails.models.songsliked.count(query)
      if (records && records > 0) { return exits.error(new Error(`This track cannot be liked at this time; the client has already liked this track recently.`)) }

      // Next, check to see this track ID actually played recently. We will allow a 30-minute grace. Any tracks not played within the last 30 minutes cannot be liked.
      var canLike = false
      records = await sails.models.history.find({ createdAt: { '>=': moment().subtract(30, 'minutes').toISOString(true) } }).sort('createdAt DESC')
      if (records && records.length > 0) {
        records
          .filter(song => song.trackID === inputs.trackID)
          .map(() => { canLike = true })
      }
      if (!canLike) { return exits.error(new Error(`This track has not recently been played. It cannot be liked at this time.`)) }

      // At this point, the track can be liked, so like it
      await sails.models.songsliked.create({ IP: fromIP, trackID: inputs.trackID })

      // Update track weight if applicable / configured to change weight on a track like
      if (sails.config.custom.songsliked.priorityBump !== 0) { await sails.models.songs.update({ ID: inputs.trackID }, { weight: track.weight + sails.config.custom.songsliked.priorityBump }) }

      // Log the request
      await sails.models.logs.create({ attendanceID: null, logtype: 'website', loglevel: 'info', logsubtype: `track-like`, event: `<strong>A track was liked!</strong><br />Track: ${track.artist} - ${track.title} (ID ${inputs.trackID})`, createdAt: moment().toISOString(true) }).fetch()
        .tolerate((err) => {
          sails.log.error(err)
        })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
