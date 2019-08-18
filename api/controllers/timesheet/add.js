module.exports = {

  friendlyName: 'sails.models.timesheet / Add',

  description: 'Add a timesheet entry for a director.',

  inputs: {
    timestamp: {
      type: 'string',
      required: true,
      custom: function (value) {
        return moment(value).isValid()
      },
      description: 'A moment.js compatible timestamp for the timesheet entry.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller timesheet/add called.')

    try {
      var toapprove = 0
      // Get the director
      var record = await sails.models.directors.findOne({ name: this.req.payload.name })
      var thetime
      sails.log.silly(record)

      // No director? return not found.
      if (typeof record === 'undefined' || record.length <= 0) { return exits.notFound() }

      // If the director is present, this is a clock-out entry.
      if (record.present) {
        toapprove = 0
        thetime = moment(inputs.timestamp)

        // If the entry is less than 30 minutes off from the current time, approve automatically
        if (thetime.isAfter(moment().subtract(30, 'minutes')) && thetime.isBefore(moment().add(30, 'minutes'))) { toapprove = 1 }

        // Add the timeOut entry
        await sails.models.timesheet.update({ timeIn: { '!=': null }, timeOut: null, name: record.name }, { timeOut: thetime.toISOString(true), approved: toapprove }).fetch()

        // Update the director presence
        await sails.models.directors.update({ ID: record.ID }, { present: false, since: thetime.toISOString(true) })
          .fetch()
      } else { // If the director is not present, this is a clock-in entry.
        toapprove = 0
        thetime = moment(inputs.timestamp)

        // Check if an office hours record exists.
        var calendar = await sails.models.directorhours.find({ director: record.name, active: { '>=': 1 }, start: { '<=': moment().toISOString(true) }, end: { '>=': moment().toISOString(true) } }).limit(1)

        // If the entry is less than 30 minutes off from the current time, approve automatically
        if (thetime.isAfter(moment().subtract(30, 'minutes')) && thetime.isBefore(moment().add(30, 'minutes'))) { toapprove = 1 }

        // Clock-ins need a new entry
        if (calendar.length > 0) {
          var records = await sails.models.timesheet.update({ unique: calendar[0].unique, timeIn: null }, { name: record.name, unique: calendar[0].unique, timeIn: thetime.toISOString(true), approved: toapprove }).fetch()
          if (records.length === 0) { await sails.models.timesheet.create({ name: record.name, unique: calendar[0].unique, scheduledIn: moment(calendar[0].start).toISOString(true), scheduledOut: moment(calendar[0].end).toISOString(true), timeIn: thetime.toISOString(true), approved: toapprove }).fetch() }
        } else {
          await sails.models.timesheet.create({ name: record.name, unique: null, scheduledIn: null, scheduledOut: null, timeIn: thetime.toISOString(true), approved: toapprove }).fetch()
        }

        // Update the director presence
        await sails.models.directors.update({ ID: record.ID }, { present: true, since: thetime.toISOString(true) })
          .fetch()
      }
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
