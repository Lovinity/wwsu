module.exports = {

  friendlyName: 'djs / get',

  description: 'Retrieve a list of DJs in the system, or get information about a single DJ.',

  inputs: {
    dj: {
      type: 'number',
      description: `If provided, instead of returning an array of DJs, will return information about the specified DJ.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller djs/get called.')

    try {
      if (!inputs.dj) {
        // Grab DJs
        var records = await sails.models.djs.find()

        // Return only true or false for login if a login was set for the DJ
        records = records.map((record, index) => {
          records[ index ].login = records[ index ].login === null ? false : true
          return record
        })

        sails.log.verbose(`DJ records retrieved: ${records.length}`)

        // Subscribe to sockets if applicable
        if (this.req.isSocket) {
          sails.sockets.join(this.req, 'djs')
          sails.log.verbose('Request was a socket. Joining djs.')
        }

        // Return records
        if (!records || records.length < 1) {
          return exits.success([])
        } else {
          return exits.success(records)
        }
      } else {
        var record = await sails.models.djs.findOne({ ID: inputs.dj })
        var returnData = { startOfSemester: moment(sails.config.custom.startOfSemester).toISOString(true) }

        if (!record || record === null) { return exits.success({}) }

        record.login = record.login === null ? false : true

        returnData.DJ = record
        returnData.XP = await sails.models.xp.find({ dj: inputs.dj })
        returnData.attendance = await sails.models.attendance.find({
          or: [
            { dj: inputs.dj },
            { cohostDJ1: inputs.dj },
            { cohostDJ2: inputs.dj },
            { cohostDJ3: inputs.dj },
          ]
        })
        var stats = await sails.helpers.analytics.showtime(inputs.dj);
        returnData.statsDJ = stats[ 0 ][ inputs.dj ];
        returnData.statsShows = stats[ 1 ];

        return exits.success(returnData)
      }
    } catch (e) {
      return exits.error(e)
    }
  }

}
