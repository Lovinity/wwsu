var sh = require('shorthash')

module.exports = {

  friendlyName: 'recipients.remove',

  description: 'Remove a recipient socket from memory, and set recipient to offline if no sockets no longer active. Certain recipients should be actually removed after one hour of offline via cron.',

  inputs: {
    socket: {
      type: 'string',
      required: true,
      description: 'The socket ID of the recipient that was removed / disconnected.'
    },

    host: {
      type: 'string',
      description: 'The alphanumeric host / name of the recipient.',
      allowNull: true
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper recipients.remove called.')
    var where = {}
    try {
      // No host name? Try to find it based on provided socket.
      if (typeof inputs.host === 'undefined' || inputs.host === null) {
        sails.log.verbose(`No host specified. Trying to find recipient ID instead.`)
        for (var key in sails.models.recipients.sockets) {
          if (Object.prototype.hasOwnProperty.call(sails.models.recipients.sockets, key)) {
            if (_.includes(sails.models.recipients.sockets[key], inputs.socket)) {
              where.ID = key
              sails.log.verbose(`ID found: ${key}.`)
              break
            }
          }
        }
      } else {
        where.host = inputs.host
      }

      // If we could not find the recipient, exit the helper.
      if (typeof where.ID === 'undefined' && typeof where.host === 'undefined') {
        sails.log.verbose(`Could not find recipient. Assuming they do not exist. Terminating helper.`)
        return exits.success()
      }

      // Get the recipient entry
      var recipient = await sails.models.recipients.findOne(where)
        .tolerate((err) => {
          sails.log.error(err)
        })

      if (typeof recipient !== 'undefined' && typeof sails.models.recipients.sockets[recipient.ID] !== 'undefined') {
        // Remove the socket ID from the array of sockets in memory
        _.remove(sails.models.recipients.sockets[recipient.ID], (e) => {
          return e === inputs.socket
        })

        // If there are no socket IDs left, that means the recipient is offline. Update accordingly.
        if (sails.models.recipients.sockets[recipient.ID].length <= 0) {
          sails.log.verbose(`Recipient is no longer connected. Setting to offline.`)
          await sails.models.recipients.update({ host: recipient.host }, { host: recipient.host, status: 0, peer: null, time: moment().toISOString(true) }).fetch()

          var hostRecord = await sails.models.hosts.findOne({ host: recipient.host })
          if (hostRecord) {
            var offStatus = 4
            var additionalData = ``
            if (hostRecord.silenceDetection || hostRecord.recordAudio || hostRecord.answerCalls) {
              if (hostRecord.silenceDetection || hostRecord.recordAudio) {
                offStatus = 2
                if (hostRecord.silenceDetection) {
                  additionalData += ` Host is responsible for silence detection; you will not be alerted of silence until this host is back online.`
                }
                if (hostRecord.recordAudio) {
                  additionalData += ` Host is responsible for recording on-air programming; until this host is back online, programming is not being recorded.`
                }
              } else {
                offStatus = 3
              }
              await sails.helpers.status.change.with({ name: `host-${sh.unique(recipient.host + sails.config.custom.hostSecret)}`, label: `Host ${recipient.label}`, status: offStatus, data: `Host is offline.${additionalData}` })
            }
          }
        }

        // If the recipient name is found in display sign config, reflect status if there are insufficient number of connections.
        var maps = sails.config.custom.displaysigns
          .filter(display => recipient.host === `display-${display.name}` && sails.models.recipients.sockets[recipient.ID].length < display.instances)
          .map(async display => {
            await sails.helpers.status.change.with({ name: `display-${display.name}`, label: `Display ${display.label}`, status: display.level, data: `${sails.models.recipients.sockets[recipient.ID].length} out of ${display.instances} displays are operational.` })
            return true
          })
        await Promise.all(maps)
      } else {
        sails.log.verbose(`Recipient not found in database. Assuming already removed.`)
      }

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }
}
