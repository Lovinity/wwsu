module.exports = {

  friendlyName: 'Timesheet / Get',

  description: 'Get a week of timesheet entries.',

  inputs: {
    date: {
      type: 'string',
      custom: function (value) {
        return moment(value).isValid()
      },
      allowNull: true,
      description: `moment() parsable string of a date that falls within the week to get timesheet entries. Defaults to now.`
    },
    fourteenDays: {
      type: 'boolean',
      defaultsTo: false,
      description: `If true, will get timesheet records for the specified date, the past 7 days, and the next 7 days, instead of the week which the date falls in.`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller timesheet/get called.')

    try {
      if (!inputs.date || inputs.date === null) {
        // Join timesheet socket if applicable
        if (this.req.isSocket) {
          sails.sockets.join(this.req, 'timesheet')
          sails.log.verbose('Request was a socket. Joining timesheet.')
        }
      }

      // Get a range of one week
      var start = inputs.date !== null ? moment(inputs.date).startOf('week') : moment().startOf('week')
      var end = moment(start).add(1, 'weeks')

      // ...or a range of 14 days if fourteenDays is true
      if (inputs.fourteenDays) {
        start = moment(inputs.date).subtract(7, 'days')
        end = moment(inputs.date).add(7, 'days')
      }

      // Get timesheet records
      var records = await sails.models.timesheet.find({ or: [
        { timeIn: { '>=': start.toISOString(true), '<': end.toISOString(true) } },
        { timeOut: { '>=': start.toISOString(true), '<': end.toISOString(true) } },
        { timeIn: null, timeOut: null, scheduledIn: { '>=': start.toISOString(true), '<': end.toISOString(true) } },
        { timeIn: null, timeOut: null, scheduledOut: { '>=': start.toISOString(true), '<': end.toISOString(true) } }
      ] }).sort([{ timeIn: 'ASC' }, { scheduledIn: 'ASC' }])
      sails.log.verbose(`Returned Timesheet records: ${records.length}`)
      sails.log.silly(records)

      // return the records
      return exits.success(records)
    } catch (e) {
      return exits.error(e)
    }
  }

}
