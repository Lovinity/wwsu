module.exports = {

  friendlyName: 'songs/get-liked',

  description: 'Retrieve an array of track IDs that the host has liked within the last sails.config.custom.songsliked.limit days.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller songs/get-liked called.')

    try {
      var returnArray = []

      // Get the hosts's IP address first
      var fromIP = await sails.helpers.getIp(this.req)
      var query = { IP: fromIP }

      // If config specifies users can like tracks multiple times, add a date condition to only return liked tracks within the configured days.
      if (sails.config.custom.songsliked.limit > 0) { query.createdAt = { '>=': moment().subtract(sails.config.custom.songsliked.limit, 'days').toISOString(true) } }

      // Retrieve track IDs liked by this IP
      var records = await sails.models.songsliked.find(query)
      if (records.length > 0) { records.map(record => returnArray.push(record.trackID)) }

      return exits.success(returnArray)
    } catch (e) {
      return exits.error(e)
    }
  }

}
