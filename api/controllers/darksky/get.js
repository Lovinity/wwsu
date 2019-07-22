module.exports = {

  friendlyName: 'Darksky / get',

  description: 'Get the current darksky weather information and subscribe to sockets',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller darksky/get called.')

    try {
      // Get records
      var records = await sails.models.darksky.find()
      sails.log.verbose(`Retrieved Darksky records: ${records.length}`)

      // Subscribe to sockets, if applicable
      if (this.req.isSocket) {
        sails.sockets.join(this.req, 'darksky')
        sails.log.verbose('Request was a socket. Joining darksky.')
      }

      return exits.success(records)
    } catch (e) {
      return exits.error(e)
    }
  }

}
