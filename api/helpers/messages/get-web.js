module.exports = {

  friendlyName: 'messages.getWeb',

  description: 'Get messages for a specified web client.',

  inputs: {
    host: {
      type: 'string',
      required: true,
      description: 'The unique ID of the client retrieving messages.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper messages.getWeb called.')
    try {
      var searchto = moment().subtract(1, 'hours').toDate() // Do not return messages more than 1 hour old

      // get records
      var records = await sails.models.messages.find(
        {
          status: 'active',
          createdAt: { '>': searchto },
          or: [
            { to: ['website', `website-${inputs.host}`] },
            { from: { startsWith: 'website' }, to: 'DJ' },
            { from: `website-${inputs.host}`, to: 'DJ-private' }
          ]
        })
      sails.log.verbose(`Messages records retrieved: ${records.length}`)

      // Return an empty array if no records were returned.
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
