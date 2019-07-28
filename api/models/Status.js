/**
 * sails.models.status.js
 *
 * @description :: Model contains information about the status of certain systems.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

// API NOTE: Do not use sails.models.status.update() to update statuses; use sails.models.status.changeStatus instead. Otherwise, websockets may get flooded with updates.

module.exports = {

  // This model's data is only temporary and should not persist. Use memory instead of SQL.
  datastore: 'ram',
  attributes: {

    ID: {
      type: 'number',
      autoIncrement: true
    },

    name: {
      type: 'string'
    },

    label: {
      type: 'string'
    },

    status: {
      type: 'number',
      min: 1,
      max: 5,
      defaultsTo: 4
    },

    data: {
      type: 'string'
    },

    // websocket API note: Do not use time in client code; changes to time will not be pushed in sockets to avoid unnecessary data transfer.
    time: {
      type: 'ref',
      columnType: 'datetime'
    }
  },

  // The template are subsystems that should be added into memory upon lifting of the Sails app via bootstrap().
  template: [
    { name: 'db-nodebase', label: 'DB Nodebase', status: 4, data: 'Successful database test has not been run yet since initialization.', time: null },
    { name: 'db-radiodj', label: 'DB RadioDJ', status: 4, data: 'Successful database test has not been run yet since initialization.', time: null },
    { name: 'db-memory', label: 'DB Memory', status: 4, data: 'Successful database test has not been run yet since initialization.', time: null },
    { name: 'website', label: 'Website', data: 'No connection to wwsu1069.org could be made yet since initialization.', status: 4, time: null },
    { name: 'stream-public', label: 'Radio Stream', data: 'Public radio stream has not reported online since initialization.', status: 4, time: null },
    { name: 'silence', label: 'Silence', data: 'The silence detection system has not reported silence since initialization.', status: 5, time: null },
    { name: 'EAS-internal', label: 'EAS NWS CAPS', data: 'No successful connection to all EAS NWS CAPS has been made yet since initialization.', status: 4, time: null },
    { name: 'server', label: 'Server', data: 'No server data has been returned yet since initialization.', status: 4, time: null },
    { name: 'music-library', label: 'Music Library', data: 'Music library tests have not yet executed since initialization.', status: 4, time: null },
    { name: 'google-calendar', label: 'Google sails.models.calendar', data: 'Google sails.models.calendar has not been loaded since initialization.', status: 4, time: null },
    { name: 'underwritings', label: 'Underwritings', data: 'Underwritings were not yet checked since initialization.', status: 4, time: null }
  ],

  /* Object used internally to check for errors.
     * Items in the object which are to be used by sails.helpers.error.count and sails.helpers.error.reset are formatted as the following:
     * key: {
     *     count: 0, // Used by the helper to count the number of times that error occurred.
     *     trigger: 15, // If count reaches this number, then fn() is executed
     *     active: false, // Set to false by default; used to make sure error checks do not run on top of each other.
     *     condition: function() {}, // If this function returns true, then count is automatically reset to 0 in the count helper. Can be async.
     *     fn: function() {}, // This function is executed when count reaches trigger. The function should return a number to which the count should be changed to (such as 0). Can be async.
     * }
     */
  errorCheck: {

    // This contains a moment timestamp of when the previous triggered error happened.
    prevError: null,

    // Contains a moment timestamp of when the most recent station ID was queued.
    prevID: null,

    // moment stamp of when the most recent PSA break was queued.
    prevBreak: null,

    // moment stamp of when the most recent standard liner was queued.
    prevLiner: null,

    // Used for determining if we have a sudden jump in queue time in RadioDJ
    trueZero: 0,

    // Used for queue length error detecting and trueZero
    prevQueueLength: 0,

    // Used for determining if RadioDJ froze.
    prevDuration: 0,
    prevElapsed: 0,

    // Used for telling the system we are waiting for a good RadioDJ to switch to
    waitForGoodRadioDJ: false,

    // Triggered when CRON checks fails to getQueue.
    queueFail: {
      count: 0,
      trigger: 15,
      active: false,
      fn: function () {
        // LINT: async required because of sails.js await.
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
          try {
            // Do not continue if we are in the process of waiting for a status 5 RadioDJ
            if (sails.models.status.errorCheck.waitForGoodRadioDJ) { return resolve(0) }

            await sails.models.meta.changeMeta({ changingState: `Switching radioDJ instances due to queueFail` })
            sails.sockets.broadcast('system-error', 'system-error', true)
            await sails.models.logs.create({ attendanceID: sails.models.meta['A'].attendanceID, logtype: 'system', loglevel: 'danger', logsubtype: '', event: `<strong>Switched automation instances;</strong> active RadioDJ was failing to return queue data.` }).fetch()
              .tolerate((err) => {
                sails.log.error(err)
              })
            await sails.models.announcements.findOrCreate({ type: 'djcontrols', title: `queueFail (system)`, announcement: 'System recently had switched automation instances because automation was failing to return what was in the queue. Please check the logs for more info.' }, { type: 'djcontrols', level: 'urgent', title: `queueFail (system)`, announcement: 'System recently had switched automation instances because automation was failing to return what was in the queue. Please check the logs for more info.', starts: moment().toISOString(true), expires: moment({ year: 3000 }).toISOString(true) })
              .tolerate((err) => {
                sails.log.error(err)
              })
            var maps = sails.config.custom.radiodjs
              .filter((instance) => instance.rest === sails.models.meta['A'].radiodj)
              .map(async (instance) => {
                var status = await sails.models.status.findOne({ name: `radiodj-${instance.name}` })
                if (status && status.status !== 1) { await sails.models.status.changeStatus([{ name: `radiodj-${instance.name}`, label: `RadioDJ ${instance.label}`, status: 2, data: `RadioDJ triggered queueFail for failing to report queue data. Please ensure this RadioDJ is not frozen and the REST server is online, configured correctly, and accessible on the network. You might have to play a track after opening RadioDJ before REST begins to work.` }]) }
                return true
              })
            await Promise.all(maps)
            await sails.helpers.rest.cmd('EnableAssisted', 1, 0)
            await sails.helpers.rest.cmd('EnableAutoDJ', 1, 0)
            await sails.helpers.rest.cmd('StopPlayer', 1, 0)
            var queue = sails.models.meta.automation
            await sails.helpers.rest.changeRadioDj()
            await sails.helpers.rest.cmd('ClearPlaylist', 1)
            await sails.helpers.error.post(queue)
            await sails.models.meta.changeMeta({ changingState: null })
            return resolve(0)
          } catch (e) {
            await sails.models.meta.changeMeta({ changingState: null })
            return reject(e)
          }
        })
      }
    },

    // Triggered when RadioDJ appears to be frozen
    frozen: {
      count: 0,
      trigger: 15,
      active: false,
      fn: function () {
        // LINT: async required because of sails.js await
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
          try {
            // If the previous error was over a minute ago, attempt standard recovery. Otherwise, switch RadioDJs.
            if (!moment().isBefore(moment(sails.models.status.errorCheck.prevError).add(1, 'minutes'))) {
              sails.log.verbose(`No recent error; attempting standard recovery.`)
              await sails.models.logs.create({ attendanceID: sails.models.meta['A'].attendanceID, logtype: 'system', loglevel: 'danger', logsubtype: '', event: `<strong>Queue recovery attempted; queue was frozen.</strong>` }).fetch()
                .tolerate((err) => {
                  sails.log.error(err)
                })
              await sails.helpers.error.post()
            } else {
              // Do not continue if we are in the process of waiting for a status 5 RadioDJ
              if (sails.models.status.errorCheck.waitForGoodRadioDJ) { return resolve(0) }

              await sails.models.meta.changeMeta({ changingState: `Switching automation instances due to frozen` })
              sails.log.verbose(`Recent error; switching RadioDJs.`)
              await sails.models.logs.create({ attendanceID: sails.models.meta['A'].attendanceID, logtype: 'system', loglevel: 'danger', logsubtype: '', event: `<strong>Switched automation instances;</strong> queue was frozen.` }).fetch()
                .tolerate((err) => {
                  sails.log.error(err)
                })
              await sails.models.announcements.findOrCreate({ type: 'djcontrols', title: `frozen (system)`, announcement: 'System recently had switched automation instances because the queue seems to have frozen. Please check the logs for more info.' }, { type: 'djcontrols', level: 'urgent', title: `frozen (system)`, announcement: 'System recently had switched automation instances because the queue seems to have frozen. Please check the logs for more info.', starts: moment().toISOString(true), expires: moment({ year: 3000 }).toISOString(true) })
                .tolerate((err) => {
                  sails.log.error(err)
                })
              var maps = sails.config.custom.radiodjs
                .filter((instance) => instance.rest === sails.models.meta['A'].radiodj)
                .map(async (instance) => {
                  var status = await sails.models.status.findOne({ name: `radiodj-${instance.name}` })
                  if (status && status.status !== 1) { await sails.models.status.changeStatus([{ name: `radiodj-${instance.name}`, label: `RadioDJ ${instance.label}`, status: 2, data: `RadioDJ triggered queueFrozen multiple times; it has probably crashed. Please ensure this RadioDJ is not frozen and the REST server is online, configured correctly, and accessible on the network. You might have to play a track after opening RadioDJ before REST begins to work.` }]) }
                  return true
                })
              await Promise.all(maps)
              sails.sockets.broadcast('system-error', 'system-error', true)
              await sails.helpers.rest.cmd('EnableAutoDJ', 0, 0)
              await sails.helpers.rest.cmd('EnableAssisted', 1, 0)
              await sails.helpers.rest.cmd('StopPlayer', 0, 0)
              var queue = sails.models.meta.automation
              await sails.helpers.rest.changeRadioDj()
              await sails.helpers.rest.cmd('ClearPlaylist', 1)
              await sails.helpers.error.post(queue)
              await sails.models.meta.changeMeta({ changingState: null })
            }
            return resolve(0)
          } catch (e) {
            await sails.models.meta.changeMeta({ changingState: null })
            return reject(e)
          }
        })
      }
    },

    // Check to see if we successfully queued what we needed to in order to return to the sports broadcast
    sportsReturn: {
      count: 0,
      trigger: 6,
      active: false,
      condition: function () {
        sails.models.meta.automation.map(() => {
          // WORK ON THIS
        })
      },
      fn: function () {
        // LINT: async required because of sails.js lint
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
          try {
            // WORK ON THIS
            return resolve(0)
          } catch (e) {
            return reject(e)
          }
        })
      }
    },

    // Check to see if we successfully queued a station ID. If not, try again.
    stationID: {
      count: 0,
      trigger: 6,
      active: false,
      condition: function () {
        var inQueue = false
        sails.models.meta.automation
          .filter(track => sails.config.custom.subcats.IDs.indexOf(parseInt(track.IDSubcat)) > -1)
          .map(() => { inQueue = true })
        return inQueue
      },
      fn: function () {
        // LINT: async required because of sails.js lint
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
          try {
            await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1)
          } catch (e) {
            return reject(e)
          }
          return resolve(1)
        })
      }
    },

    // do not allow automation break to continue for more than 5 minutes.
    automationBreak: {
      count: 0,
      trigger: 300,
      active: false,
      fn: function () {
        // LINT: async required because of sails.js lint
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
          try {
            if (sails.models.meta['A'].changingState !== null) { return resolve(295) }

            await sails.models.meta.changeMeta({ changingState: `Switching to automation via automationBreak` })
            await sails.models.meta.changeMeta({ state: 'automation_on', genre: '', show: '', trackStamp: null, djcontrols: '', topic: '', webchat: true, playlist: null, playlist_position: -1, playlist_played: moment('2002-01-01').toISOString() })

            // Add up to 3 track requests if any are pending
            await sails.helpers.requests.queue(3, true, true)

            // Re-load google calendar events to check for, and execute, any playlists/genres/etc that are scheduled.
            try {
              await sails.models.calendar.preLoadEvents(true)
            } catch (unusedE2) {
              // Couldn't load calendar? Fall back to Default automation
              await sails.helpers.genre.start('Default', true)
            }

            await sails.models.meta.changeMeta({ changingState: null })
            return resolve(0)
          } catch (e) {
            await sails.models.meta.changeMeta({ changingState: null })
            return reject(e)
          }
        })
      }
    },

    // Check to see if we are in genre rotation and the queue is empty (usually mean no more tracks can play)
    genreEmpty: {
      count: 0,
      trigger: 10,
      active: false,
      fn: function () {
        // LINT: async required because of sails.js lint
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
          try {
            await sails.models.meta.changeMeta({ changingState: `Switching to automation via genreEmpty` })
            await sails.helpers.genre.start('Default', true)
            await sails.models.meta.changeMeta({ changingState: null })
            return resolve(0)
          } catch (e) {
            await sails.models.meta.changeMeta({ changingState: null })
            return reject(e)
          }
        })
      }
    }

  },

  /**
     * Change statuses
     * @constructor
     * @param {Array} array - Object containing objects of statuses to change {name: 'key', label: 'friendly name', status: 5, data: 'String of data regarding this subsystem.'}.
     */

  changeStatus: function (array) {
    // LINT: async required because of sails.js lint
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`sails.models.status.changeStatus called.`)
      try {
        var maps = array.map(async status => {
          var criteriaB
          var criteria = { name: status.name, status: status.status, data: status.data || '', label: status.label || status.name }
          if (status.status === 5) { criteria.time = moment().toISOString(true) }

          // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
          criteriaB = _.cloneDeep(criteria)

          // Find or create the status record
          var record = await sails.models.status.findOrCreate({ name: status.name }, criteriaB)
            .tolerate(() => {
              return true
            })

          // Search to see if any changes are made to the status; we only want to update if there is a change.
          var updateIt = false
          for (var key in criteria) {
            if (Object.prototype.hasOwnProperty.call(criteria, key)) {
              if (criteria[key] !== record[key]) {
                // We don't want to fetch() on time-only updates; this will flood websockets
                if (!updateIt && key === 'time') {
                  updateIt = 2
                } else {
                  updateIt = 1
                }
              }
            }
          }
          if (updateIt === 1 && typeof criteria.status !== 'undefined' && criteria.status <= 3 && (!record.status || (record.status !== criteria.status))) {
            var loglevel = `warning`
            if (criteria.status < 2) {
              loglevel = `danger`
            } else if (criteria.status < 3) {
              loglevel = `urgent`
            }

            // Log changes in status
            await sails.models.logs.create({ attendanceID: sails.models.meta['A'].attendanceID, logtype: 'status', loglevel: loglevel, logsubtype: sails.models.meta['A'].show, event: `<strong>${criteria.label || record.label || criteria.name || record.name || `Unknown System`}</strong>:<br />${criteria.data ? criteria.data : `Unknown Issue`}` }).fetch()
              .tolerate((err) => {
                // Don't throw errors, but log them
                sails.log.error(err)
              })
          }
          if (updateIt === 1 && record.status && criteria.status && record.status <= 3 && criteria.status > 3) {
            // Log when bad statuses are now good.
            await sails.models.logs.create({ attendanceID: sails.models.meta['A'].attendanceID, logtype: 'status', loglevel: 'success', logsubtype: sails.models.meta['A'].show, event: `<strong>${criteria.label || record.label || criteria.name || record.name || `Unknown System`}</strong>:<br />Now Operational.` }).fetch()
              .tolerate((err) => {
                // Don't throw errors, but log them
                sails.log.error(err)
              })
          }
          if (updateIt === 1) {
            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
            criteriaB = _.cloneDeep(criteria)
            sails.log.verbose(`Updating status ${status.name} and pushing to sockets via fetch.`)
            await sails.models.status.update({ name: status.name }, criteriaB)
              .tolerate((err) => {
                throw err
              })
              .fetch()
          } else if (updateIt === 2) {
            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
            criteriaB = _.cloneDeep(criteria)
            sails.log.verbose(`Updating status ${status.name} without using fetch / pushing to sockets.`)
            await sails.models.status.update({ name: status.name }, criteriaB)
              .tolerate((err) => {
                throw err
              })
          }
          return true
        })
        await Promise.all(maps)
        return resolve()
      } catch (e) {
        return reject(e)
      }
    })
  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`status socket: ${data}`)
    sails.sockets.broadcast('status', 'status', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`status socket: ${data}`)
    sails.sockets.broadcast('status', 'status', data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`status socket: ${data}`)
    sails.sockets.broadcast('status', 'status', data)
    return proceed()
  }
}
