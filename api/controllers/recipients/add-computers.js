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
      var host = await sails.models.hosts.findOne({ host: this.req.payload.host })

      if (!host) { return exits.error(new Error('No host found in the database')) }

      // Subscribe to websockets
      if (this.req.isSocket) {
        if (host.makeCalls) {
          sails.sockets.join(this.req, 'bad-call')
          sails.sockets.join(this.req, 'very-bad-call')
          sails.sockets.join(this.req, 'silent-call')
          sails.sockets.join(this.req, 'finalize-call')
        }
        if (host.makeCalls || host.answerCalls) {
          sails.sockets.join(this.req, 'call-quality')
        }
        if (host.delaySystem) {
          sails.sockets.join(this.req, 'delay-system-dump')
        }
      }

      // Return the host label object
      return exits.success(response)
    } catch (e) {
      return exits.error(e)
    }
  }

}
