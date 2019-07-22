module.exports = {

  friendlyName: 'hosts / get',

  description: 'Retrieve data about a specified host. Also provides an array of otherHosts, and subscribes to the hosts socket, if the host parameter is an admin host.',

  inputs: {
    host: {
      type: 'string',
      required: true,
      description: 'The host name to search for or authorize.'
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
    sails.log.debug('Controller hosts/get called.')

    try {
      // Find the hosts record
      var record = await sails.models.hosts.findOne({ host: inputs.host })
      sails.log.silly(record)

      if (!record) { return exits.notFound() }

      // Subscribe to websockets if applicable
      if (record.authorized && this.req.isSocket && record.admin) {
        sails.sockets.join(this.req, 'hosts')
        sails.log.verbose('Request was a socket on an authorized admin. Joined hosts.')

        // Push the current hosts through the output
        var records = await sails.models.hosts.find()
        record.otherHosts = records
      }

      return exits.success(record)
    } catch (e) {
      return exits.error(e)
    }
  }

}
