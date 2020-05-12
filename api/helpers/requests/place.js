var sh = require('shorthash')

module.exports = {

  friendlyName: 'requests.place',

  description: 'Place a request.',

  inputs: {
    ID: {
      type: 'number',
      required: true,
      description: 'The ID of the song being requested.'
    },
    IP: {
      type: 'string',
      required: true,
      description: 'IP address of the client making the request.'
    },
    name: {
      type: 'string',
      defaultsTo: 'Anonymous',
      description: 'Name of the person making the request.'
    },
    message: {
      type: 'string',
      defaultsTo: '',
      description: 'A message to be included with the request.'
    },
    device: {
      type: 'string',
      allowNull: true,
      description: 'If requested from the mobile app, provide the device ID so they can receive a push notification when the request plays.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper requests.place called.')
    try {
      // First, confirm the track can actually be requested.
      var requestable = await sails.helpers.requests.checkRequestable(inputs.ID, inputs.IP)

      // If so, do stuff
      if (requestable.requestable) {
        var host = sh.unique(inputs.IP + sails.config.custom.hostSecret)

        // Filter disallowed HTML
        inputs.name = await sails.helpers.sanitize(inputs.name)
        inputs.message = await sails.helpers.sanitize(inputs.message)

        // Filter profanity
        inputs.name = await sails.helpers.filterProfane(inputs.name)
        inputs.message = await sails.helpers.filterProfane(inputs.message)

        // Truncate
        inputs.name = await sails.helpers.truncateText(inputs.name, 64)
        inputs.message = await sails.helpers.truncateText(inputs.message, 1024)

        // Get the song data
        var record2 = await sails.models.songs.findOne({ ID: inputs.ID })
        if (!record2) { return exits.error(new Error('The provided track ID does not exist.')) }
        sails.log.silly(`Song: ${record2}`)

        // Create the request
        var request = await sails.models.requests.create({ songID: inputs.ID, username: inputs.name, userIP: inputs.IP, message: inputs.message, requested: moment().toISOString(true), played: 0 }).fetch()
        sails.models.requests.pending.push(inputs.ID)

        // Bump priority if configured
        if (sails.config.custom.requests.priorityBump !== 0) { await sails.models.songs.update({ ID: inputs.ID }, { weight: record2.weight + sails.config.custom.requests.priorityBump }) }

        // Log the request
        await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'website-request', loglevel: 'info', logsubtype: `${sails.models.meta.memory.show}`, logIcon: `fas fa-record-vinyl`, title: `A track was requested online.`, event: `Track: ${record2.artist} - ${record2.title} (ID ${inputs.ID})<br />Requested By: ${inputs.name}<br />Message: ${inputs.message}`, createdAt: moment().toISOString(true) }).fetch()
          .tolerate((err) => {
            sails.log.error(err)
          })

        var returndata = { requested: true, message: `Request placed! Requests are queued at every break. If a show is live, it is up to the host's discretion.` }

        // Add a push notification subscription if a device was provided
        if (inputs.device && inputs.device !== null) {
          await sails.models.subscribers.findOrCreate({ device: inputs.device, type: `request`, subtype: request.ID }, { host: `website-${host}`, device: inputs.device, type: `request`, subtype: request.ID })
          returndata.message = `Request placed! Requests are queued at every break. If a show is live, it is up to the host's discretion.<br />
                                            <strong>You will receive a push notification when your request begins playing.</strong>`
        }

        // Finish it
        return exits.success(returndata)
        // If it cannot be requested, respond with the errors of why it cannot be requested.
      } else {
        return exits.success({ requested: false, message: requestable.message })
      }
    } catch (e) {
      return exits.error(e)
    }
  }

}
