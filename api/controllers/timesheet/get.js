module.exports = {

  friendlyName: 'Timesheet / Get',

  description: 'Get a week of timesheet entries.',

  inputs: {
    date: {
      type: 'string',
      custom: function (value) {
        return DateTime.fromISO(value).isValid
      },
      allowNull: true,
      description: `ISO string of a date that falls within the week to get timesheet entries. Defaults to now.`
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
      var start = inputs.date !== null ? DateTime.fromISO(inputs.date).startOf('week') : DateTime.local().startOf('week');
      var end = start.plus({weeks: 1});

      // ...or a range of 14 days if fourteenDays is true
      if (inputs.fourteenDays) {
        start = inputs.date !== null ? DateTime.fromISO(inputs.date).minus({weeks: 1}) : DateTime.local().minus({weeks: 1});
        end = start.plus({weeks: 2});
      }

      // Get timesheet records
      var records = await sails.models.timesheet.find({ or: [
        { timeIn: { '>=': start.toISO(), '<': end.toISO() } },
        { timeOut: { '>=': start.toISO(), '<': end.toISO() } },
        { timeIn: null, timeOut: null, scheduledIn: { '>=': start.toISO(), '<': end.toISO() } },
        { timeIn: null, timeOut: null, scheduledOut: { '>=': start.toISO(), '<': end.toISO() } }
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
