module.exports = {

  friendlyName: 'Meta / Get',

  description: 'Get the current Meta. If the request is a socket, subscribe to meta changes.',

  inputs: {
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller meta/get called.')

    // Subscribe to socket if applicable
    if (this.req.isSocket) {
      sails.sockets.join(this.req, 'meta')
      sails.log.verbose('Request was a socket. Joining meta.')
    }

    // Return current meta, but update time to current time since it's not auto-updated automatically by changeMeta.
    var returnData = sails.models.meta.memory
    returnData.time = moment().toISOString(true)
    return exits.success(returnData)
  }

}
