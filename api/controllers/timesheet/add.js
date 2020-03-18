module.exports = {

  friendlyName: 'sails.models.timesheet / Add',

  description: 'Add a timesheet entry for a director.',

  inputs: {
    timestamp: {
      type: 'string',
      required: true,
      custom: function (value) {
        return DateTime.fromISO(value).isValid
      },
      description: 'An ISO string for the timesheet entry.'
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
        thetime = DateTime.fromISO(inputs.timestamp);

        // If the entry is less than 30 minutes off from the current time, approve automatically
        if (thetime > DateTime.local().minus({minutes: 30}) && thetime < DateTime.local().plus({minutes: 30})) { toapprove = 1 }

        // Edge case example: It is 5PM. A director clocks in for 1PM. Director has scheduled hours for 1-3PM and 4-6PM. Ensure there's a record for all in-between hours.
        var records = await sails.models.timesheet.find({ name: record.name, approved: { '>=': 0 }, timeIn: null, timeOut: null, scheduledIn: { '<': thetime.toISO() }, scheduledOut: { '>=': DateTime.fromISO(record.since).toISO() } }).sort('scheduledIn ASC')
        if (records.length > 0) {
          var theStart
          var theEnd

          // Sequential async
          records.reduce(async (prevReturn, record) => {
            return await (async (recordB) => {
              if (!theEnd) {
                theStart = recordB.scheduledIn
              } else {
                theStart = theEnd
              }
              theEnd = recordB.scheduledOut
              recordsX = recordsX.concat(await sails.models.timesheet.update({ ID: recordB.ID }, { timeIn: DateTime.fromISO(theStart).toISO(), timeOut: DateTime.fromISO(theEnd).toISO(), approved: 0 }).fetch())
            })(record)
          }, null)

          // Add special clock-out entry
          await sails.models.timesheet.update({ timeIn: { '!=': null }, timeOut: null, name: record.name, approved: { '>=': 1 } }, { timeIn: DateTime.fromISO(theEnd).toISO(), timeOut: thetime.toISO(), approved: toapprove }).fetch()
          await sails.models.timesheet.update({ timeIn: { '!=': null }, timeOut: null, name: record.name, approved: { '<': 1 } }, { timeIn: DateTime.fromISO(theEnd).toISO(), timeOut: thetime.toISO() }).fetch()
        } else {
          // Add normal clock-out entry
          await sails.models.timesheet.update({ timeIn: { '!=': null }, timeOut: null, name: record.name, approved: { '>=': 1 } }, { timeOut: thetime.toISO(), approved: toapprove }).fetch()
          await sails.models.timesheet.update({ timeIn: { '!=': null }, timeOut: null, name: record.name, approved: { '<': 1 } }, { timeOut: thetime.toISO() }).fetch()
        }

        // Update the director presence
        await sails.models.directors.update({ ID: record.ID }, { present: false, since: thetime.toISO() })
          .fetch()

        if (toapprove === 0) { await sails.helpers.onesignal.sendMass('accountability-directors', 'Timesheet Needs Approved in DJ Controls', `${record.name}'s timesheet ending on ${thetime.toLocaleString(DateTime.DATETIME_FULL)} has been flagged and needs reviewed/approved because the director set their clock-out time more than 30 minutes from the current time.`) }
      } else { // If the director is not present, this is a clock-in entry.
        toapprove = 0
        thetime = DateTime.fromISO(inputs.timestamp);

        // Check if an office hours record exists.
        var calendar = sails.models.calendar.calendardb.whoShouldBeIn();
        if (calendar.length > 0)
          calendar = calendar.filter((cal) => cal.director === record.ID);


        // If the entry is less than 30 minutes off from the current time, approve automatically
        if (thetime > DateTime.local().minus({minutes: 30}) && thetime < DateTime.local().plus({minutes: 30})) { toapprove = 1 }

        // Clock-ins need a new entry
        await sails.models.timesheet.create({ name: record.name, unique: calendar[ 0 ] ? calendar[ 0 ].unique : null, scheduledIn: calendar[ 0 ] ? calendar[ 0 ].start : null, scheduledOut: calendar[ 0 ] ? calendar[ 0 ].end : null, timeIn: thetime.toISO(), approved: toapprove }).fetch()

        // Update the director presence
        await sails.models.directors.update({ ID: record.ID }, { present: true, since: thetime.toISO() })
          .fetch()

        if (toapprove === 0) { await sails.helpers.onesignal.sendMass('accountability-directors', 'Timesheet Needs Approved in DJ Controls', `${record.name}'s timesheet, beginning on ${thetime.toLocaleString(DateTime.DATETIME_FULL)}, has been flagged and needs reviewed/approved because the director set their clock-in time more than 30 minutes from the current time.`) }
      }
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
