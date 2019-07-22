module.exports = {

  friendlyName: 'Status / Get',

  description: 'Get the current status of all subsystems. If socket request, subscribe to receiving status changes.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller status/get called.')
    try {
      // Get status records
      var records = await sails.models.status.find()
      sails.log.verbose(`Status records retrieved: ${records.length}.`)
      sails.log.silly(records)

      // Subscribe to websocket if applicable
      if (this.req.isSocket) {
        sails.sockets.join(this.req, 'status')
        sails.log.verbose('Request was a socket. Joining status.')
      }

      return exits.success(records)
    } catch (e) {
      return exits.error(e)
    }
  }

}
