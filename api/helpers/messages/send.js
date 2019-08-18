module.exports = {

  friendlyName: 'messages.send',

  description: 'Send out client messages',

  inputs: {
    from: {
      type: 'string',
      required: true,
      description: 'ID of the client sending the message.'
    },
    to: {
      type: 'string',
      required: true,
      description: 'ID of the client to receive the message.'
    },

    toFriendly: {
      type: 'string',
      required: true,
      description: 'Friendly name of the client to receive the message.'
    },

    message: {
      type: 'string',
      required: true,
      description: 'The message.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper messages.send called.')
    sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`)
    try {
      // Filter disallowed HTML
      inputs.message = await sails.helpers.sanitize(inputs.message)

      // Filter profanity
      inputs.message = await sails.helpers.filterProfane(inputs.message)

      // Grab data pertaining to the host that is retrieving messages. Create if not exists.
      var stuff = await sails.models.hosts.findOrCreate({ host: inputs.from }, { host: inputs.from, friendlyname: inputs.from })
      sails.log.silly(`Host: ${stuff}`)
      inputs.fromFriendly = stuff.friendlyname

      // Create the message
      var records = await sails.models.messages.create(inputs).fetch()
      if (!records) {
        return exits.error(new Error('Internal error: Could not save message in database.'))
      } else {
        // Broadcast the message over web sockets
        return exits.success()
      }
    } catch (e) {
      return exits.error(e)
    }
  }

}
