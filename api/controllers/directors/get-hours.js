module.exports = {

  friendlyName: 'Directors / get-hours',

  description: 'Retrieve an array of scheduled director hours for the next week.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller directors/get-hours called.')
    try {
      // Get director hours records
      var records = await sails.models.directorhours.find()
      sails.log.verbose(`Directorhours records retrieved: ${records.length}`)
      sails.log.silly(records)

      // Subscribe to socket if applicable
      if (this.req.isSocket) {
        sails.sockets.join(this.req, 'directorhours')
        sails.log.verbose('Request was a socket. Joining directorhours.')
      }

      return exits.success(records)
    } catch (e) {
      return exits.error(e)
    }
  }
}
