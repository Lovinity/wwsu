module.exports = {

  friendlyName: 'Requests / Place',

  description: 'Place a request.',

  inputs: {
    ID: {
      required: true,
      type: 'number',
      description: 'ID number of the song to request.'
    },

    name: {
      type: 'string',
      defaultsTo: 'anonymous',
      description: 'Name provided of the person making the request.'
    },

    message: {
      type: 'string',
      defaultsTo: '',
      description: 'Message provided regarding the request.'
    },

    device: {
      type: 'string',
      allowNull: true,
      description: 'If requested from the mobile app, provide the device ID so they can receive a push notification when the request plays.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller requests/place called.')

    try {
      // Get the client IP address
      var fromIP = this.req.isSocket ? (typeof this.req.socket.handshake.headers['x-forwarded-for'] !== 'undefined' ? this.req.socket.handshake.headers['x-forwarded-for'] : this.req.socket.conn.remoteAddress) : this.req.ip

      // Place the request
      var response = await sails.helpers.requests.place(inputs.ID, fromIP, inputs.name, inputs.message, inputs.device)

      // Return the HTML message given by the helper
      return exits.success(response)
    } catch (e) {
      return exits.error(e)
    }
  }

}
