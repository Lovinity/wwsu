/**
 * sails.models.status.js
 *
 * @description :: Model contains information about the status of certain systems.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

// API NOTE: Do not use sails.models.status.update() to update statuses; use sails.helpers.status.change instead. This helper has additional functionality.

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
    { name: 'calendar', label: 'Calendar', data: 'Calendar has not been loaded since initialization.', status: 4, time: null },
    { name: 'underwritings', label: 'Underwritings', data: 'Underwritings were not yet checked since initialization.', status: 4, time: null },
    { name: 'delay-system', label: 'Delay System', data: 'Status of Delay System has not been checked since initialization', status: 4, time: moment().toISOString(true) },
    { name: 'reported', label: 'Reported Problems', status: 4, data: 'System has not yet checked reported problems since initialization.', time: null },
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

    // This is used for determining the last time the silence detection was activated. 
    prevSilence: null,

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
    prevTrackLength: 0,
    prevCountdown: 0,

    // Used for determining when to re-fetch RadioDJ queue
    queueWait: 0,

    // Used for determining if RadioDJ froze.
    prevDuration: 0,
    prevElapsed: 0,
    prevFetchedDuration: 0,
    prevFetchedElapsed: 0,

    // Used for telling the system we are waiting for a good RadioDJ to switch to
    waitForGoodRadioDJ: false,

    // Triggered when CRON checks fails to getQueue.
    queueFail: {
      count: 0,
      trigger: 30,
      active: false,
      fn: function () {
        // LINT: async required because of sails.js await.
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
          try {
            // Do not continue if we are in the process of waiting for a status 5 RadioDJ
            if (sails.models.status.errorCheck.waitForGoodRadioDJ) { return resolve(0) }

            await sails.helpers.meta.change.with({ changingState: `Switching radioDJ instances due to queueFail` })
            sails.sockets.broadcast('system-error', 'system-error', true)
            await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'system-queuefail', loglevel: 'danger', logsubtype: '', logIcon: `fas fa-exclamation-triangle`, title: `Switched RadioDJs: Failed repeatedly to return queue data.`, event: `Please check to make sure all RadioDJs are functional and did not freeze. Sometimes, this error may also be thrown when a track in the queue contains special characters that cannot be processed.` }).fetch()
              .tolerate((err) => {
                sails.log.error(err)
              })
            await sails.helpers.onesignal.sendMass('emergencies', 'RadioDJ Queue Failure', `On ${moment().format('LLLL')}, the system switched RadioDJs because the active one was not returning queue data. It might have crashed or there is a problem connecting to it on the network. Please see DJ Controls.`)
            var maps = sails.config.custom.radiodjs
              .filter((instance) => instance.rest === sails.models.meta.memory.radiodj)
              .map(async (instance) => {
                var status = await sails.models.status.findOne({ name: `radiodj-${instance.name}` })
                if (status && status.status !== 1) { await sails.helpers.status.change.with({ name: `radiodj-${instance.name}`, label: `RadioDJ ${instance.label}`, status: 2, data: `RadioDJ triggered queueFail for failing to report queue data. Please ensure this RadioDJ is not frozen and the REST server is online, configured correctly, and accessible on the network. You might have to play a track after opening RadioDJ before REST begins to work.` }) }
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
            await sails.helpers.meta.change.with({ changingState: null })
            return resolve(0)
          } catch (e) {
            await sails.helpers.meta.change.with({ changingState: null })
            sails.log.error(e)
            return reject(e)
          }
        })
      }
    },

    // Triggered when RadioDJ appears to be frozen
    frozen: {
      count: 0,
      trigger: 30,
      active: false,
      fn: function () {
        // LINT: async required because of sails.js await
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
          try {
            // If the previous error was over a minute ago, attempt standard recovery. Otherwise, switch RadioDJs.
            if (!moment().isBefore(moment(sails.models.status.errorCheck.prevError).add(1, 'minutes'))) {
              sails.log.verbose(`No recent error; attempting standard recovery.`)
              await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'system-frozen', loglevel: 'warning', logsubtype: '', logIcon: `fas fa-exclamation-triangle`, title: `Attempted to re-load RadioDJ queue: RadioDJ was frozen.`, event: `Please make sure all RadioDJs are functioning correctly and not freezing up. This could be caused by a corrupted track.` }).fetch()
                .tolerate((err) => {
                  sails.log.error(err)
                })
              await sails.helpers.error.post()
            } else {
              // Do not continue if we are in the process of waiting for a status 5 RadioDJ
              if (sails.models.status.errorCheck.waitForGoodRadioDJ) { return resolve(0) }

              await sails.helpers.meta.change.with({ changingState: `Switching automation instances due to frozen` })
              sails.log.verbose(`Recent error; switching RadioDJs.`)
              await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'system-frozen', loglevel: 'danger', logsubtype: '', logIcon: `fas fa-exclamation-triangle`, title: `Switched active RadioDJs: RadioDJ froze multiple times.`, event: `The queue froze multiple times in a short period. Please check to ensure all RadioDJs are functional and not frozen. This could be caused by an audio device issue (check the RadioDJ sound card settings), corrupt track (make sure most recently played audio tracks are okay), or a problem loading the track audio (make sure the storage device is healthy and, for networked drives, that they are connected and accessible by RadioDJ).` }).fetch()
                .tolerate((err) => {
                  sails.log.error(err)
                })
              await sails.helpers.onesignal.sendMass('emergencies', 'RadioDJ stopped playing / froze', `On ${moment().format('LLLL')}, the system switched RadioDJs because the active one froze or stopped playing. There might be an audio device issue, corrupt track, or problem reading audio files. Please see DJ Controls.`)
              var maps = sails.config.custom.radiodjs
                .filter((instance) => instance.rest === sails.models.meta.memory.radiodj)
                .map(async (instance) => {
                  var status = await sails.models.status.findOne({ name: `radiodj-${instance.name}` })
                  if (status && status.status !== 1) { await sails.helpers.status.change.with({ name: `radiodj-${instance.name}`, label: `RadioDJ ${instance.label}`, status: 2, data: `RadioDJ triggered queueFrozen multiple times; it has probably crashed. Please ensure this RadioDJ is not frozen and the REST server is online, configured correctly, and accessible on the network. You might have to play a track after opening RadioDJ before REST begins to work.` }) }
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
              await sails.helpers.meta.change.with({ changingState: null })
            }
            return resolve(0)
          } catch (e) {
            await sails.helpers.meta.change.with({ changingState: null })
            sails.log.error(e)
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
            if (sails.models.meta.memory.changingState !== null) { return resolve(295) }

            await sails.helpers.meta.change.with({ changingState: `Switching to automation via automationBreak` })
            await sails.helpers.meta.change.with({ state: 'automation_on', genre: '', show: '', trackStamp: null, topic: '', webchat: true, playlist: null, playlistPosition: -1, playlistPlayed: moment('2002-01-01').toISOString() })

            // Add up to 3 track requests if any are pending
            await sails.helpers.requests.queue(3, true, true)

            // Re-check and trigger any programs that should begin
            try {
              await sails.helpers.calendar.check(true)
            } catch (unusedE2) {
              // Couldn't load calendar? Fall back to Default automation
              await sails.helpers.genre.start(null, true)
            }

            await sails.helpers.meta.change.with({ changingState: null })
            return resolve(0)
          } catch (e) {
            await sails.helpers.meta.change.with({ changingState: null })
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
            await sails.helpers.meta.change.with({ changingState: `Switching to automation via genreEmpty` })
            await sails.helpers.genre.start(null, true)
            await sails.helpers.meta.change.with({ changingState: null })
            return resolve(0)
          } catch (e) {
            await sails.helpers.meta.change.with({ changingState: null })
            return reject(e)
          }
        })
      }
    },

    changingStateTookTooLong: {
      count: 0,
      trigger: 60,
      active: false,
      fn: function () {
        // LINT: async required because of sails.js lint
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
          try {
            await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'system-changingstate', loglevel: 'danger', logsubtype: '', logIcon: `fas fa-exclamation-triangle`, title: `changingState took too long to finish; Node server was terminated.`, event: `An error might have occurred in the node server that resulted in the state changing to not complete. Node was terminated as a precaution (if using a process manager such as pm2, it will reboot Node automatically).` }).fetch()
              .tolerate((err) => {
                sails.log.error(err)
              })
            await sails.helpers.onesignal.sendMass('emergencies', 'Node terminated due to ChangingState timeout', `On ${moment().format('LLLL')}, the system terminated Node (and hopefully was rebooted by process manager) because ChangingState took more than 60 seconds (application likely froze/hung). Please see DJ Controls.`)
            await sails.helpers.meta.change.with({ changingState: null })
            process.exit(1);
          } catch (e) {
            process.exit(1);
          }
        })
      }
    }

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
