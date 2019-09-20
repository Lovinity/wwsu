module.exports = {

  friendlyName: 'Logs / get-dj',

  description: 'Retrieve a list of log entries using DJ authorization.',

  inputs: {
    attendanceID: {
      type: 'number',
      allowNull: true,
      description: 'If provided, logs pertaining to this attendance record ID will be returned. This overwrites start, end, and date.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller logs/get-dj called.')

    try {
      // Get records
      var records = await sails.models.logs.find({ attendanceID: inputs.attendance, dj: this.req.payload.ID }).sort('createdAt ASC')

      sails.log.verbose(`Retrieved Logs records: ${records.length}`)

      return exits.success(records)
    } catch (e) {
      return exits.error(e)
    }
  }

}
