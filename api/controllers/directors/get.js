module.exports = {

  friendlyName: 'Directors / Get',

  description: 'Retrieve directors from memory.',

  inputs: {
    name: {
      description: 'Director to search for.',
      type: 'string',
      allowNull: true
    }
  },

  exits: {
    success: {
      statusCode: 200
    },
    notFound: {
      statusCode: 404
    },
    error: {
      statusCode: 500
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller directors/get called.')

    try {
      // If a username was specified, find only that director. Otherwise, get all directors.
      var query = {}
      if (inputs.username !== null) { query = { name: inputs.name } }

      // Subscribe to websockets if applicable
      if (this.req.isSocket) {
        sails.sockets.join(this.req, 'directors')
        sails.log.verbose('Request was a socket. Joined directors.')
      }

      // Get records
      var records = await sails.models.directors.find(query)

      // Remove the login parameter
      records = records.map(record => {
        delete record.login
        return record
      })

      sails.log.verbose(`Director records retrieved: ${records.length}`)

      // Return records
      if (!records || records.length < 1) {
        return exits.success([])
      } else {
        return exits.success(records)
      }
    } catch (e) {
      return exits.error(e)
    }
  }

}
