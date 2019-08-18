module.exports = {

  friendlyName: 'messages.get',

  description: 'Retrieve applicable messages sent within the last hour. Do not include emergency messages.',

  inputs: {
    host: {
      type: 'string',
      required: true,
      description: 'Host ID of the client retrieving messages.'
    },
    ip: {
      type: 'string',
      defaultsTo: '10.0.0.1',
      description: 'The IP address of the client'
    },
    socket: {
      type: 'string',
      allowNull: true,
      description: 'The ID of the websocket.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper messages.get called.')
    try {
      var searchto = moment().subtract(1, 'hours').toDate() // Get messages sent within the last hour
      //
      // First, grab data pertaining to the host that is retrieving messages (create the host record if it does not exist)
      var thehost = await sails.models.hosts.findOrCreate({ host: inputs.host }, { host: inputs.host, friendlyname: inputs.host })
      sails.log.silly(thehost)

      // Get messages
      var records = await sails.models.messages.find({ status: 'active', or: [{ createdAt: { '>': searchto } }, { to: 'emergency' }] })
      sails.log.verbose(`Messages records retrieved: ${records.length}`)
      sails.log.silly(records)

      // Return empty array if no messages were returned
      if (typeof records === 'undefined' || records.length === 0) {
        return exits.success([])
      } else {
        // Remove IP addresses from response!
        records
          .filter((record, index) => typeof records[index].fromIP !== 'undefined')
          .map((record, index) => delete records[index].fromIP)
        return exits.success(records)
      }
    } catch (e) {
      return exits.error(e)
    }
  }

}
