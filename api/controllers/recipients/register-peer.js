var sh = require('shorthash')

module.exports = {

  friendlyName: 'Recipients / register-peer',

  description: 'Registers a peerJS ID to a recipient',

  inputs: {
    peer: {
      type: 'string',
      allowNull: true,
      description: `The PeerJS ID assigned to this recipient. Use null if a peer was removed.`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller recipients/register-peer called.')
    try {
      // Must be a websocket request
      if (!this.req.isSocket) { return exits.error(new Error('This controller requires a websocket.')) }

      // Update the recipient peer ID
      await sails.models.recipients.update({ host: `computer-${sh.unique(this.req.payload.host + sails.config.custom.hostSecret)}` }, { peer: inputs.peer || null }).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
