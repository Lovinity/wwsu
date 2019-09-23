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
      var returnData = { name: this.req.payload.name }
      returnData.XP = await sails.models.xp.find({ dj: this.req.payload.ID })
      returnData.attendance = await sails.models.attendance.find({ dj: this.req.payload.ID })
      returnData.stats = await sails.helpers.analytics.showtime(this.req.payload.ID)
      returnData.changes = await sails.helpers.calendar.find({ or: [ { title: { startsWith: `Show: ${this.req.payload.name} - ` } }, { title: { startsWith: `Remote: ${this.req.payload.name} - ` } }, { title: { startsWith: `Prerecord: ${this.req.payload.name} - ` } } ], active: 2 })
      returnData.cancellations = await sails.helpers.attendance.find({ dj: this.req.payload.ID, happened: -1, scheduledEnd: { '>=': moment().toISOString(true) } })

      return exits.success(returnData)
    } catch (e) {
      return exits.error(e)
    }
  }

}
