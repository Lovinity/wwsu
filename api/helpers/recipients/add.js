var sh = require('shorthash')

module.exports = {

  friendlyName: 'recipients.add',

  description: 'Called when there is a new recipient.',

  inputs: {

    socket: {
      type: 'string',
      required: true,
      description: 'The socket ID of the recipient.'
    },

    host: {
      type: 'string',
      required: true,
      description: 'The alphanumeric host / name of the recipient.'
    },

    group: {
      type: 'string',
      required: true,
      isIn: ['system', 'website', 'display', 'computers'],
      description: 'The group that the recipient belogs.'
    },

    label: {
      type: 'string',
      required: true,
      description: 'A human friendly name of the recipient'
    },

    device: {
      type: 'string',
      allowNull: true,
      description: `If this recipient comes from the WWSU mobile app, provide their OneSignal ID here.`
    }

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper recipients.add called.')
    try {
      // Determine the status color based off of the group and recipient
      var status = 5
      switch (inputs.group) {
        case 'website':
          status = 5
          break
        case 'display':
        case 'computers':
          status = 2
          break
        default:
          status = 5
      }

      sails.log.silly(`sails.models.status: ${status}`)
      var answerCalls = false
      var makeCalls = false
      var find = inputs.host
      var alreadyConnected = false

      // If this is a computers recipient, see if it's in the Hosts table. If so, use that as the label instead of the provided label.
      // Also, use generic `computer-uniqueString` as host instead of actual host for security purposes.
      // Also, determine if this recipient is allowed to answer calls.
      if (inputs.group === 'computers') {
        var host = await sails.models.hosts.find({ host: inputs.host }).limit(1)
          .tolerate((err) => {
            sails.log.error(err)
          })
        if (host && typeof host[0] !== 'undefined') {
          inputs.label = host[0].friendlyname
          answerCalls = host[0].answerCalls && host[0].authorized
          makeCalls = host[0].makeCalls && host[0].authorized
          find = `computer-${sh.unique(inputs.host + sails.config.custom.hostSecret)}`
        }
      }

      // Get or create the recipient entry
      var recipient = await sails.models.recipients.findOrCreate({ host: find }, { host: find, device: inputs.device, group: inputs.group, label: inputs.label, status: status, answerCalls: answerCalls, makeCalls: makeCalls, time: moment().toISOString(true) })

      sails.log.silly(`sails.models.recipients record: ${recipient}`)

      // Search to see if any changes are made to the recipient; we only want to update if there is a change.
      var criteria = { host: find, group: inputs.group, status: status, device: inputs.device, answerCalls: answerCalls, makeCalls: makeCalls }
      var updateIt = false
      for (var key in criteria) {
        if (Object.prototype.hasOwnProperty.call(criteria, key)) {
          if (criteria[key] !== recipient[key]) {
            // Do not update label changes. This should be done via recipients/edit or recipients/edit-web.
            if (key !== 'label') {
              updateIt = true
              break
            }
          }
        }
      }
      if (updateIt) {
        sails.log.verbose(`Updating recipient as it has changed.`)
        await sails.models.recipients.update({ host: find }, { host: find, group: inputs.group, device: inputs.device, status: status, answerCalls: answerCalls, makeCalls: makeCalls, time: moment().toISOString(true) }).fetch()
      }

      // Put the socket ID in memory
      if (typeof sails.models.recipients.sockets[recipient.ID] === 'undefined') { sails.models.recipients.sockets[recipient.ID] = [] }

      // Check to see if we are already connected
      var connections = sails.models.recipients.sockets[recipient.ID].length
      if (_.includes(sails.models.recipients.sockets[recipient.ID], inputs.socket)) { connections -= 1 }
      if (connections > 0) { alreadyConnected = true }

      // Make sure we do not add the same socket more than once
      if (!_.includes(sails.models.recipients.sockets[recipient.ID], inputs.socket)) {
        sails.models.recipients.sockets[recipient.ID].push(inputs.socket)
      }

      // If the recipient group is computers, update sails.models.status
      if (inputs.group === 'computers' && host && typeof host[0] !== `undefined` && (host[0].silenceDetection || host[0].recordAudio || host[0].answerCalls)) {
        await sails.helpers.status.change.with({ name: `host-${sh.unique(inputs.host + sails.config.custom.hostSecret)}`, label: `Host ${host && typeof host[0] !== 'undefined' ? inputs.label : 'Unknown'}`, status: 5, data: `Host / DJ Controls is online.` })
      }

      // If the recipient group is display, update sails.models.status if there are at least instances connections.
      if (inputs.group === 'display') {
        var maps = sails.config.custom.displaysigns
          .filter(display => inputs.host === `display-${display.name}` && sails.models.recipients.sockets[recipient.ID].length >= display.instances)
          .map(async display => {
            await sails.helpers.status.change.with({ name: `display-${display.name}`, label: `Display ${display.label}`, status: 5, data: 'Display sign is online.' })
            return true
          })
        await Promise.all(maps)
      }

      return exits.success({ label: recipient.label, alreadyConnected: alreadyConnected })
    } catch (e) {
      return exits.error(e)
    }
  }

}
