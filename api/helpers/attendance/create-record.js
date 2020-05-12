module.exports = {

  friendlyName: 'attendance.createRecord',

  description: 'Create a new attendance record, or end the current one. Also manages stats / XP awarding when applicable.',

  inputs: {
    event: {
      type: 'json',
      description: 'Event object triggering the new attendance record. If undefined, the current attendance will be closed, but a new one will not be created. If null, an attendance record for default genre rotation will be started.'
    },
    unscheduled: {
      type: 'boolean',
      defaultsTo: false,
      description: 'If true, this is an unscheduled show.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper attendance.createRecord called.')

    try {
      var returnData = { newID: null, unique: null }

      // Store the current ID in a variable; we want to start a new record before processing the old one
      var currentID = sails.models.meta.memory.attendanceID

      // Add a new attendance record if event is specified.
      if (inputs.event) {

        if (inputs.event === null) {
          inputs.event = {
            type: 'genre',
            hosts: "Unknown Hosts",
            name: "Default Rotation",
            hostDJ: null,
            cohostDJ1: null,
            cohostDJ2: null,
            cohostDJ3: null,
          }
        }

        // Create the new attendance record
        var created = null

        if (inputs.event.unique && inputs.event.calendarID) {
          returnData.unique = inputs.event.unique
          created = await sails.models.attendance.create({ calendarID: inputs.event.calendarID, unique: inputs.event.unique, dj: inputs.event.hostDJ, cohostDJ1: inputs.event.cohostDJ1, cohostDJ2: inputs.event.cohostDJ2, cohostDJ3: inputs.event.cohostDJ3, happened: inputs.unscheduled ? 2 : 1, event: `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}`, scheduledStart: moment(inputs.event.start).toISOString(true), scheduledEnd: moment(inputs.event.end).toISOString(true), actualStart: moment().toISOString(true) }).fetch()

          // Log if actualStart was 5 or more minutes before scheduledStart
          if (moment().add(5, 'minutes').isSameOrBefore(moment(inputs.event.start)) && [ 'show', 'sports', 'remote', 'prerecord', 'playlist' ].indexOf(inputs.event.type) !== -1) {
            await sails.models.logs.create({ attendanceID: created.ID, logtype: 'sign-on-early', loglevel: 'orange', logsubtype: `${inputs.event.hosts} - ${inputs.event.name}`, logIcon: sails.models.calendar.calendardb.getIconClass(inputs.event), title: `The broadcast started 5 or more minutes early.`, event: `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}`, createdAt: moment().toISOString(true) }).fetch()
              .tolerate((err) => {
                sails.log.error(err)
              })
          }

          // Log if actualStart was 10 or more minutes after scheduledStart
          if (moment().subtract(10, 'minutes').isSameOrAfter(moment(inputs.event.start)) && [ 'show', 'sports', 'remote', 'prerecord', 'playlist' ].indexOf(inputs.event.type) !== -1) {
            await sails.models.logs.create({ attendanceID: created.ID, logtype: 'sign-on-late', loglevel: 'warning', logsubtype: `${inputs.event.hosts} - ${inputs.event.name}`, logIcon: sails.models.calendar.calendardb.getIconClass(inputs.event), title: `The broadcast started 10 or more minutes late.`, event: `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}`, createdAt: moment().toISOString(true) }).fetch()
              .tolerate((err) => {
                sails.log.error(err)
              })
          }
        } else {
          created = await sails.models.attendance.create({ unique: "", dj: inputs.event.hostDJ, cohostDJ1: inputs.event.cohostDJ1, cohostDJ2: inputs.event.cohostDJ2, cohostDJ3: inputs.event.cohostDJ3, happened: inputs.unscheduled ? 2 : 1, event: `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}`, actualStart: moment().toISOString(true), scheduledStart: null, scheduledEnd: null }).fetch()
        }

        returnData.newID = created.ID

        // Switch to the new record in the system
        await sails.helpers.meta.change.with({ attendanceID: created.ID, calendarUnique: inputs.event.unique || null, calendarID: inputs.event.calendarID || null, scheduledStart: inputs.event.start || null, scheduledEnd: inputs.event.end || null })
      } else {
        var created = await sails.models.attendance.create({ unique: "", happened: 1, event: `genre: Unknown Hosts - Default Rotation`, actualStart: moment().toISOString(true) }).fetch()
        await sails.helpers.meta.change.with({ attendanceID: created.ID, calendarUnique: null, calendarID: null, scheduledStart: null, scheduledEnd: null })
      }

      // Add actualEnd to the previous attendance record, calculate showTime, calculate listenerMinutes, and calculate new weekly DJ stats to broadcast
      if (currentID !== null) {

        // Add actualEnd
        var currentRecord = await sails.models.attendance.updateOne({ ID: currentID }, { actualEnd: moment().toISOString(true) });

        if (currentRecord) {

          // Log if actualEnd was 10 or more minutes before scheduledEnd
          if (currentRecord && currentRecord.scheduledEnd && moment().add(10, 'minutes').isSameOrBefore(moment(currentRecord.scheduledEnd)) && (currentRecord.event.toLowerCase().startsWith("show:") || currentRecord.event.toLowerCase().startsWith("sports:") || currentRecord.event.toLowerCase().startsWith("remote:") || currentRecord.event.toLowerCase().startsWith("prerecord:") || currentRecord.event.toLowerCase().startsWith("playlist:"))) {
            var event = currentRecord.event.split(": ");
            await sails.models.logs.create({ attendanceID: currentRecord.ID, logtype: 'sign-off-early', loglevel: 'warning', logsubtype: `${event[ 1 ]}`, logIcon: sails.models.calendar.calendardb.getIconClass({ type: event[ 0 ] }), title: `The broadcast signed off 10 or more minutes early.`, event: `${currentRecord.event}`, createdAt: moment().toISOString(true) }).fetch()
              .tolerate((err) => {
                sails.log.error(err)
              })
          }

          // Log if actualEnd was 5 or more minutes after scheduledEnd
          if (currentRecord && currentRecord.scheduledEnd && moment().subtract(5, 'minutes').isSameOrAfter(moment(currentRecord.scheduledEnd)) && (currentRecord.event.toLowerCase().startsWith("show:") || currentRecord.event.toLowerCase().startsWith("sports:") || currentRecord.event.toLowerCase().startsWith("remote:") || currentRecord.event.toLowerCase().startsWith("prerecord:") || currentRecord.event.toLowerCase().startsWith("playlist:"))) {
            var event = currentRecord.event.split(": ");
            await sails.models.logs.create({ attendanceID: currentRecord.ID, logtype: 'sign-off-late', loglevel: 'orange', logsubtype: `${event[ 1 ]}`, logIcon: sails.models.calendar.calendardb.getIconClass({ type: event[ 0 ] }), title: `The broadcast signed off 5 or more minutes late.`, event: `${currentRecord.event}`, createdAt: moment().toISOString(true) }).fetch()
              .tolerate((err) => {
                sails.log.error(err)
              })
          }

          // Recalculate stats
          await sails.helpers.attendance.recalculate(currentID);
          // Calculate weekly analytics in the background; this takes several seconds
          var temp = (async () => {
            await sails.helpers.attendance.calculateStats()
          })();
        }
      }

      return exits.success(returnData)
    } catch (e) {
      sails.log.error(e);
      return exits.error(e)
    }
  }

}
