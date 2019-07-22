module.exports = {

  friendlyName: `Recipients / get`,

  description: `Get a list of recipients for messages.`,

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller recipients/get called.`)
    try {
      // Get recipients
      var records = await sails.models.recipients.find()
      sails.log.verbose(`Recipients records retrieved: ${records.length}`)
      sails.log.silly(records)

      // Subscribe to web socket if applicable
      if (this.req.isSocket) {
        sails.sockets.join(this.req, `recipients`)
        sails.log.verbose(`Request was a socket. Joining recipients.`)
      }

      return exits.success(records)
    } catch (e) {
      return exits.error(e)
    }
  }

}
