module.exports = {

  friendlyName: 'sails.models.announcements / Get',

  description: 'Get announcements for the specified type. Subscribe to receive websockets for announcements event.',

  inputs: {
    // TODO: remove "type" property when migrated fully to types array
    type: {
      type: 'string',
      description: 'Subscribe to only this announcement type; ensure websockets only include announcements of this type. Use "all" to return all announcements.'
    },
    types: {
      type: 'json',
      description: 'Subscribe to the array of announcement types; ensure websockets only include announcements of this type. Use "all" to return all announcements.'
    },
    ID: {
      type: 'number',
      allowNull: true,
      description: 'If provided, will only return the announcement matching this ID. If provided, type is ignored (but still required, so use all), and websockets is not subscribed.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller announcements/get called.')

    try {
      // If no types nor IDs provided, exit immediately with an empty array.
      if (!inputs.type && !inputs.types && !inputs.ID) {
        return exits.success([]);
      }

      // Determine which announcements to return based on type or ID.
      var records = [];
      if (inputs.ID) {
        records = await sails.models.announcements.findOne({ ID: inputs.ID })
      } else if ((inputs.types && inputs.types.indexOf('all') !== -1) || inputs.type === 'all') {
        records = await sails.models.announcements.find()
        // Subscribe to websockets
        if (this.req.isSocket) {
          sails.sockets.join(this.req, `announcements-all`)
          sails.log.verbose(`Request was a socket. Joined announcements-all.`)
        }
      } else if (inputs.type) {
        var temp = await sails.models.announcements.find({ type: inputs.type });
        temp.map((rec) => records.push(rec));

        sails.log.verbose(`${records.length} records retrieved.`)

        // Subscribe to websockets
        if (this.req.isSocket) {
          sails.sockets.join(this.req, `announcements-${inputs.type}`)
          sails.log.verbose(`Request was a socket. Joined announcements-${inputs.type}.`)
        }
      } else {
        var maps = inputs.types.map(async (type) => {
          var temp = await sails.models.announcements.find({ type: type });
          temp.map((rec) => records.push(rec));

          sails.log.verbose(`${records.length} records retrieved.`)

          // Subscribe to websockets
          if (this.req.isSocket) {
            sails.sockets.join(this.req, `announcements-${type}`)
            sails.log.verbose(`Request was a socket. Joined announcements-${type}.`)
          }
        });
        await Promise.all(maps);
      }

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
