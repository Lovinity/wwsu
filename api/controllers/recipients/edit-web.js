var sh = require('shorthash')

module.exports = {

  friendlyName: 'Recipients / Edit-web',

  description: 'Changes a label for a public recipient.',

  inputs: {
    label: {
      type: 'string',
      required: true,
      description: 'The new label or nickname for this recipient.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller recipients/edit-web called.')

    try {
      // Request must be a socket
      if (!this.req.isSocket) { return exits.error(new Error('This controller requires a websocket.')) }

      // Get the recipient host
      var fromIP = this.req.isSocket ? (typeof this.req.socket.handshake.headers['x-forwarded-for'] !== 'undefined' ? this.req.socket.handshake.headers['x-forwarded-for'] : this.req.socket.conn.remoteAddress) : this.req.ip
      var host = sh.unique(fromIP + sails.config.custom.hostSecret)

      // Filter disallowed HTML
      inputs.message = await sails.helpers.sanitize(inputs.message)

      // Do not allow profane labels
      inputs.label = await sails.helpers.filterProfane(inputs.label)

      // Truncate after 64 characters
      inputs.label = await sails.helpers.truncateText(inputs.label, 64)

      // Update the recipient
      var records = await sails.models.recipients.update({ host: `website-${host}` }, { label: `Web (${inputs.label})` }).fetch()
      sails.log.verbose(`Updated ${records.length} records of host ${host}.`)

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
