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
      var dj = await sails.models.attendance.findOne({ ID: inputs.attendanceID })
      if (!dj || dj.ID !== this.req.payload.ID) {
        return exits.success([])
      }

      var records = await sails.models.logs.find({ attendanceID: inputs.attendanceID }).sort('createdAt ASC')
      sails.log.verbose(`Retrieved Logs records: ${records.length}`)

      return exits.success(records)
    } catch (e) {
      return exits.error(e)
    }
  }

}
