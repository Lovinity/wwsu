module.exports = {

  friendlyName: 'attendance.createRecord',

  description: 'Create a new attendance record, or end the current one. Also manages stats / XP awarding when applicable.',

  inputs: {
    event: {
      type: 'string',
      description: 'A string specifying the event. Should correlate to the same prefix formatting as used in the calendar. If undefined, the current attendance record will be closed, but a new one will not be created.'
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
        // Find a calendar record with the provided event name. Allow up to 10 grace minutes before start time
        var queryTitle = inputs.event
        // For sports broadcasts, ignore anything after the sport in case the calendar event contains a " vs.".
        if (queryTitle.startsWith('Sports: ')) {
          queryTitle = { startsWith: inputs.event }
        }
        var record = await sails.models.calendar.find({ title: queryTitle, active: { '>=': 1 }, start: { '<=': moment().add(10, 'minutes').toISOString(true) }, end: { '>=': moment().toISOString(true) } }).limit(1)
        sails.log.debug(`sails.models.calendar records found: ${record.length || 0}`)

        // Create the new attendance record
        var created = null

        if (record.length > 0) {
          returnData.unique = record[ 0 ].unique
          created = await sails.models.attendance.create({ unique: record[ 0 ].unique, dj: sails.models.meta.memory.dj, event: record[ 0 ].title, scheduledStart: moment(record[ 0 ].start).toISOString(true), scheduledEnd: moment(record[ 0 ].end).toISOString(true), actualStart: moment().toISOString(true) }).fetch()
        } else {
          created = await sails.models.attendance.create({ dj: sails.models.meta.memory.dj, event: inputs.event, actualStart: moment().toISOString(true) }).fetch()

          // Broadcasts without a calendar ID are unauthorized. Log them!
          if (inputs.event.startsWith('Show: ') || inputs.event.startsWith('Remote: ') || inputs.event.startsWith('Sports: ')) {
            await sails.models.logs.create({ attendanceID: created.ID, logtype: 'unauthorized', loglevel: 'warning', logsubtype: inputs.event.replace('Show: ', '').replace('Remote: ', '').replace('Sports: ', ''), event: `<strong>An unauthorized / unscheduled broadcast started!</strong><br />Broadcast: ${inputs.event}`, createdAt: moment().toISOString(true) }).fetch()
              .tolerate((err) => {
                sails.log.error(err)
              })
            await sails.helpers.onesignal.sendMass('accountability-shows', 'Un-scheduled Broadcast Started', `${inputs.event} went on the air at ${moment().format('LLL')}; this show was not scheduled to go on the air!`)
          }
        }

        returnData.newID = created.ID

        // Switch to the new record in the system
        await sails.helpers.meta.change.with({ attendanceID: created.ID, calendarUnique: returnData.unique || null })
      } else {
        await sails.helpers.meta.change.with({ attendanceID: null, calendarUnique: null })
      }

      // Add actualEnd to the previous attendance record, calculate showTime, calculate listenerMinutes, and calculate new weekly DJ stats to broadcast
      if (currentID !== null) {
        // Get sails.models.attendance record
        var currentRecord = await sails.models.attendance.findOne({ ID: currentID })

        if (currentRecord) {
          // Pre-load update data
          var updateData = { showTime: moment().diff(moment(currentRecord.actualStart), 'minutes'), listenerMinutes: 0, actualEnd: moment().toISOString(true) }

          // Fetch listenerRecords since beginning of sails.models.attendance, as well as the listener count prior to start of attendance record.
          var listenerRecords = await sails.models.listeners.find({ createdAt: { '>=': currentRecord.actualStart } }).sort('createdAt ASC')
          var prevListeners = await sails.models.listeners.find({ createdAt: { '<=': currentRecord.actualStart } }).sort('createdAt DESC').limit(1) || 0
          if (prevListeners[ 0 ]) { prevListeners = prevListeners[ 0 ].listeners || 0 }

          // Calculate listener minutes and listener tune-ins
          var prevTime = moment(currentRecord.actualStart)
          var listenerMinutes = 0
          var tuneIns = 0

          if (listenerRecords && listenerRecords.length > 0) {
            listenerRecords.map(listener => {
              listenerMinutes += (moment(listener.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners
              if (listener.listeners > prevListeners) { tuneIns += (listener.listeners - prevListeners) }
              prevListeners = listener.listeners
              prevTime = moment(listener.createdAt)
            })
          }

          // This is to ensure listener minutes from the most recent entry up until the current time is also accounted for
          listenerMinutes += (moment().diff(moment(prevTime), 'seconds') / 60) * prevListeners

          listenerMinutes = Math.round(listenerMinutes)
          updateData.listenerMinutes = listenerMinutes
          updateData.tuneIns = tuneIns

          // Update the attendance record with the data
          returnData.updatedRecord = await sails.models.attendance.updateOne({ ID: currentID }, updateData)

          // Recalculate weekly analytics
          await sails.helpers.attendance.calculateStats()
        }
      }

      return exits.success(returnData)
    } catch (e) {
      return exits.error(e)
    }
  }

}
