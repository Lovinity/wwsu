module.exports = {

  friendlyName: 'Recipients / Add-display',

  description: 'Registers a display sign recipient as online. This is to be used with internal recipients; web/mobile public recipients should use recipients / add-web.',

  inputs: {
    host: {
      type: 'string',
      required: true,
      description: 'Name of the host being registered.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller recipients/add-display called.')
    try {
      // Request must be a socket
      if (!this.req.isSocket) { return exits.error(new Error('This controller requires a websocket.')) }

      var label = await sails.helpers.recipients.add(sails.sockets.getId(this.req), inputs.host, 'display', inputs.host)

      // Join display-refresh to receive requests to refresh the display signs
      sails.sockets.join(this.req, 'display-refresh')

      // Join a messages socket to receive messages sent to this display sign
      sails.sockets.join(this.req, `messages-${inputs.host}`)

      sails.log.verbose('Request was a display host. Joined display-refresh and messages-(host).')

      // Return the nickname for this host as a label object
      return exits.success({ label: label })
    } catch (e) {
      return exits.error(e)
    }
  }

}
