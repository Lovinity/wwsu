module.exports = {

  friendlyName: 'Logs / get-dj',

  description: 'Retrieve a list of log entries using DJ authorization.',

  inputs: {
    attendanceID: {
      type: 'number',
      allowNull: true,
      description: 'If provided, logs pertaining to this attendance record ID will be returned if the authorized DJ is associated with the provided attendance ID.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller logs/get-dj called.')

    try {
      // Get records
      var returnData = {logs: [], listeners: []}
      var dj = await sails.models.attendance.findOne({ ID: inputs.attendanceID })
      if (!dj || (dj.dj !== this.req.payload.ID && dj.cohostDJ1 !== this.req.payload.ID && dj.cohostDJ2 !== this.req.payload.ID && dj.cohostDJ3 !== this.req.payload.ID)) {
        return exits.success(returnData)
      }

      returnData.logs = await sails.models.logs.find({ attendanceID: inputs.attendanceID }).sort('createdAt ASC')

      returnData.listeners = await sails.helpers.analytics.listeners(dj.actualStart, dj.actualEnd)

      return exits.success(returnData)
    } catch (e) {
      return exits.error(e)
    }
  }

}
