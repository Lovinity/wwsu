module.exports = {

  friendlyName: 'messages.sendWeb',

  description: 'Used by a web/public client to send a message.',

  inputs: {
    host: {
      type: 'string',
      required: true,
      description: 'Unique ID of the host sending the message.'
    },
    message: {
      type: 'string',
      required: true,
      description: 'The message to be sent.'
    },
    fromIP: {
      type: 'string',
      required: true,
      description: 'IP address of the client sending the message.'
    },
    nickname: {
      type: 'string',
      allowNull: true,
      description: 'Nickname / friendly name of the client sending the message.'
    },
    private: {
      type: 'boolean',
      defaultsTo: false,
      description: 'If true, the message is to only be visible by the DJ. Otherwise, message will be visible to other web/public clients.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper messages.sendWeb called.')

    try {
      var theid = inputs.host
      // If no nickname provided, use host as the nickname
      if (inputs.nickname === null) {
        inputs.nickname = theid
      }
      var records = null

      // Check how many messages were sent by this host within the last minute. If more than configured limit are returned, the host is not allowed to send messages yet.
      var searchto = moment().subtract(1, 'minutes').toDate()
      var check = await sails.models.messages.find({ fromIP: inputs.from_IP, createdAt: { '>': searchto } })
      sails.log.verbose(`IP address sent ${check.length} messages within the last minute.`)
      if (check.length > 2) { return exits.error(new Error('Website visitors are only allowed to send 3 messages per minute.')) }

      // Filter disallowed HTML
      inputs.message = await sails.helpers.sanitize(inputs.message)

      // Filter profanity
      inputs.message = await sails.helpers.filterProfane(inputs.message)

      // Truncate after 1024 characters
      inputs.message = await sails.helpers.truncateText(inputs.message, 1024)

      // Create and broadcast the message, depending on whether or not it was private
      if (inputs.private) {
        sails.log.verbose('Sending private message.')
        records = await sails.models.messages.create({ status: 'active', from: `website-${theid}`, from_friendly: `Web (${inputs.nickname})`, from_IP: inputs.from_IP, to: 'DJ-private', to_friendly: 'DJ private', message: inputs.message }).fetch()
        if (!records) { return exits.error(new Error('Internal Error: Could not save message to the database.')) }
        delete records.from_IP // We do not want to broadcast IP addresses!
      } else {
        sails.log.verbose('Sending public message.')
        records = await sails.models.messages.create({ status: 'active', from: `website-${theid}`, from_friendly: `Web (${inputs.nickname})`, from_IP: inputs.from_IP, to: 'DJ', to_friendly: 'DJ', message: inputs.message }).fetch()
        if (!records) { return exits.error(new Error('Internal Error: Could not save message to the database')) }
        delete records.from_IP // We do not want to broadcast IP addresses!
      }
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
