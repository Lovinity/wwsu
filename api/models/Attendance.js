/**
 * sails.models.attendance.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  datastore: 'nodebase',
  attributes: {
    ID: {
      type: 'number',
      autoIncrement: true
    },

    unique: {
      type: 'string'
    },

    dj: {
      type: 'number',
      allowNull: true
    },

    event: {
      type: 'string'
    },

    happened: {
      type: 'number',
      defaultsTo: 1,
      min: -1,
      max: 1
    },

    happenedReason: {
      type: 'string',
      allowNull: true
    },

    ignore: {
      type: 'number',
      defaultsTo: 0,
      min: 0,
      max: 2
    },

    showTime: {
      type: 'number',
      allowNull: true
    },

    listenerMinutes: {
      type: 'number',
      allowNull: true
    },

    missedIDs: {
      type: 'number',
      defaultsTo: 0
    },

    scheduledStart: {
      type: 'ref',
      columnType: 'datetime'
    },

    scheduledEnd: {
      type: 'ref',
      columnType: 'datetime'
    },

    actualStart: {
      type: 'ref',
      columnType: 'datetime'
    },

    actualEnd: {
      type: 'ref',
      columnType: 'datetime'
    }

  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`attendance socket: ${data}`)
    sails.sockets.broadcast('attendance', 'attendance', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`attendance socket: ${data}`)
    sails.sockets.broadcast('attendance', 'attendance', data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`attendance socket: ${data}`)
    sails.sockets.broadcast('attendance', 'attendance', data)
    return proceed()
  },

  weeklyAnalytics: {
    topShows: [],
    topGenre: 'None',
    topPlaylist: 'None',
    onAir: 0,
    onAirListeners: 0,
    tracksLiked: 0,
    tracksRequested: 0,
    webMessagesExchanged: 0
  },

  // Create a new record in the attendance table.
  // Switch to that record for logging / operations.
  // Automatically add current time as actualStart.
  // Automatically add current time as actualEnd in the previous sails.models.attendance record being used.
  // Use Google sails.models.calendar info if an event matches.
  createRecord: function (event) {
    // LINT: async required because await necessary for Sails.js
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        sails.log.debug(`sails.models.attendance.createRecord called.`)
        var returnData = { newID: null, unique: null }

        // Store the current ID in a variable; we want to start a new record before processing the old one
        var currentID = sails.models.meta['A'].attendanceID

        // Add a new attendance record if event is specified.
        if (event) {
          // Find a calendar record with the provided event name. Allow up to 10 grace minutes before start time
          var queryTitle = event
          // For sports broadcasts, ignore anything after the sport in case the calendar event contains a " vs.".
          if (queryTitle.startsWith('Sports: ')) {
            queryTitle = { startsWith: event }
          }
          var record = await sails.models.calendar.find({ title: queryTitle, active: { '>=': 1 }, start: { '<=': moment().add(10, 'minutes').toISOString(true) }, end: { '>=': moment().toISOString(true) } }).limit(1)
          sails.log.debug(`sails.models.calendar records found: ${record.length || 0}`)

          // Create the new attendance record
          var created = null

          if (record.length > 0) {
            returnData.unique = record[0].unique
            created = await sails.models.attendance.create({ unique: record[0].unique, dj: sails.models.meta['A'].dj, event: record[0].title, scheduledStart: moment(record[0].start).toISOString(true), scheduledEnd: moment(record[0].end).toISOString(true), actualStart: moment().toISOString(true) }).fetch()
          } else {
            created = await sails.models.attendance.create({ dj: sails.models.meta['A'].dj, event: event, actualStart: moment().toISOString(true) }).fetch()

            // Broadcasts without a calendar ID are unauthorized. Log them!
            if (event.startsWith('Show: ') || event.startsWith('Remote: ') || event.startsWith('Sports: ')) {
              await sails.models.logs.create({ attendanceID: created.ID, logtype: 'unauthorized', loglevel: 'warning', logsubtype: event.replace('Show: ', '').replace('Remote: ', '').replace('Sports: ', ''), event: `<strong>An unauthorized / unscheduled broadcast started!</strong><br />Broadcast: ${event}`, createdAt: moment().toISOString(true) }).fetch()
                .tolerate((err) => {
                  sails.log.error(err)
                })
            }
          }

          returnData.newID = created.ID

          // Switch to the new record in the system
          await sails.models.meta.changeMeta({ attendanceID: created.ID })
        } else {
          await sails.models.meta.changeMeta({ attendanceID: null })
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
            if (prevListeners[0]) { prevListeners = prevListeners[0].listeners || 0 }

            // Calculate listener minutes
            var prevTime = moment(currentRecord.actualStart)
            var listenerMinutes = 0

            if (listenerRecords && listenerRecords.length > 0) {
              listenerRecords.map(listener => {
                listenerMinutes += (moment(listener.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners
                prevListeners = listener.listeners
                prevTime = moment(listener.createdAt)
              })
            }

            // This is to ensure listener minutes from the most recent entry up until the current time is also accounted for
            listenerMinutes += (moment().diff(moment(prevTime), 'seconds') / 60) * prevListeners

            listenerMinutes = Math.round(listenerMinutes)
            updateData.listenerMinutes = listenerMinutes

            // Update the attendance record with the data
            returnData.updatedRecord = await sails.models.attendance.updateOne({ ID: currentID }, updateData)

            // Recalculate weekly analytics
            await sails.helpers.attendance.calculateStats()
          }
        }

        return resolve(returnData)
      } catch (e) {
        return reject(e)
      }
    })
  }

}
