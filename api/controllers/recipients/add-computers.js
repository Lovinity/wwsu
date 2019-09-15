module.exports = {

  friendlyName: 'Recipients / Add-computers',

  description: 'Registers a DJ Controls recipient as online. This is to be used with internal recipients; web/mobile public recipients should use recipients / add-web.',

  inputs: {
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller recipients/add-computers called.')
    try {
      // Must be a websocket request
      if (!this.req.isSocket) { return exits.error(new Error('This controller requires a websocket.')) }

      // Add the recipient
      var response = await sails.helpers.recipients.add(sails.sockets.getId(this.req), this.req.payload.host, 'computers', this.req.payload.host)

      // Subscribe to websockets dealing with remote audio calls for DJ Controls
      if (this.req.isSocket) {
        sails.sockets.join(this.req, 'bad-call')
        sails.sockets.join(this.req, 'very-bad-call')
        sails.sockets.join(this.req, 'silent-call')
        sails.sockets.join(this.req, 'finalize-call')
        sails.sockets.join(this.req, 'call-quality')
        sails.log.verbose('Request was a socket. Joining bad-call and very-bad-call.')
      }

      // Return the host label object
      return exits.success(response)
    } catch (e) {
      return exits.error(e)
    }
  }

}
