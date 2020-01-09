module.exports = {

  friendlyName: 'attendance.createRecord',

  description: 'Create a new attendance record, or end the current one. Also manages stats / XP awarding when applicable.',

  inputs: {
    event: {
      type: 'json',
      allowNull: true,
      description: 'Event object triggering the new attendance record. If undefined, the current attendance will be closed, but a new one will not be created. If null, an attendance record for default genre rotation will be started.'
    },
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
          returnData.unique = record[ 0 ].unique
          created = await sails.models.attendance.create({ calendarID: inputs.event.calendarID, unique: inputs.event.unique, dj: inputs.event.hostDJ, cohostDJ1: inputs.event.cohostDJ1, cohostDJ2: inputs.event.cohostDJ2, cohostDJ3: inputs.event.cohostDJ3, event: `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}`, scheduledStart: moment(inputs.event.start).toISOString(true), scheduledEnd: moment(inputs.event.end).toISOString(true), actualStart: moment().toISOString(true) }).fetch()
        } else {
          created = await sails.models.attendance.create({ unique: "", dj: inputs.event.hostDJ, cohostDJ1: inputs.event.cohostDJ1, cohostDJ2: inputs.event.cohostDJ2, cohostDJ3: inputs.event.cohostDJ3, event: `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}`, actualStart: moment().toISOString(true) }).fetch()

          // Broadcasts without a calendar ID are unauthorized. Log them!
          if (['show', 'sports', 'remote'].indexOf(inputs.event.type) !== -1) {
            await sails.models.logs.create({ attendanceID: created.ID, logtype: 'unauthorized', loglevel: 'warning', logsubtype: `${inputs.event.hosts} - ${inputs.event.name}`, event: `<strong>An unauthorized / unscheduled broadcast started!</strong><br />Broadcast: ${inputs.event.hosts} - ${inputs.event.name}`, createdAt: moment().toISOString(true) }).fetch()
              .tolerate((err) => {
                sails.log.error(err)
              })
            await sails.helpers.onesignal.sendMass('accountability-shows', 'Un-scheduled Broadcast Started', `${inputs.event.hosts} - ${inputs.event.name} went on the air at ${moment().format('llll')}; this show was not scheduled to go on the air!`)
          }
        }

        returnData.newID = created.ID

        // Switch to the new record in the system
        await sails.helpers.meta.change.with({ attendanceID: created.ID, calendarUnique: inputs.event.unique || null, calendarID: inputs.event.calendarID || null })
      } else {
        await sails.helpers.meta.change.with({ attendanceID: null, calendarUnique: null, calendarID: null })
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

          // Calculate web messages
          updateData.webMessages = await sails.models.messages.count({ status: 'active', or: [ { to: { startsWith: 'website-' } }, { to: 'DJ' }, { to: 'DJ-private' } ], createdAt: { '>=': moment(currentRecord.actualStart).toISOString(true) } })

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
