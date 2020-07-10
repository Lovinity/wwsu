module.exports = {

  friendlyName: 'Climacell / get',

  description: 'Get the current climacell weather information and subscribe to sockets',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller climacell/get called.')

    try {
      // Get records
      var records = await sails.models.climacell.find()

      // Subscribe to sockets, if applicable
      if (this.req.isSocket) {
        sails.sockets.join(this.req, 'climacell')
        sails.log.verbose('Request was a socket. Joining climacell.')
      }

      return exits.success(records)
    } catch (e) {
      return exits.error(e)
    }
  }

}
