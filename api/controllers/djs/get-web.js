module.exports = {

  friendlyName: 'djs / get-web',

  description: 'Get information about a DJ for the DJ web panel.',

  inputs: {
  },

  exits: {
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller djs/get-web called.')

    try {
      var returnData = { ID: this.req.payload.ID, name: this.req.payload.name }
      returnData.XP = await sails.models.xp.find({ dj: this.req.payload.ID })
      returnData.attendance = await sails.models.attendance.find({
        or: [
          { dj: this.req.payload.ID },
          { cohostDJ1: this.req.payload.ID },
          { cohostDJ2: this.req.payload.ID },
          { cohostDJ3: this.req.payload.ID },
        ]
      })
      returnData.stats = await sails.helpers.analytics.showtime(this.req.payload.ID)

      return exits.success(returnData)
    } catch (e) {
      return exits.error(e)
    }
  }

}
