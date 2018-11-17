/* global sails, Status, _, Logs, moment, Meta, inputs, Announcements, Calendar */

/**
 * Status.js
 *
 * @description :: Model contains information about the status of certain systems.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

// API NOTE: Do not use Status.update() to update statuses; use Status.changeStatus instead. Otherwise, websockets may get flooded with updates.

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
        {name: 'db-nodebase', label: 'DB Nodebase', status: 4, data: 'Successful database test has not been run yet since initialization.', time: null},
        {name: 'db-radiodj', label: 'DB RadioDJ', status: 4, data: 'Successful database test has not been run yet since initialization.', time: null},
        {name: 'db-memory', label: 'DB Memory', status: 4, data: 'Successful database test has not been run yet since initialization.', time: null},
        {name: 'website', label: 'Website', data: 'No connection to wwsu1069.org could be made yet since initialization.', status: 4, time: null},
        {name: 'stream-public', label: 'Radio Stream', data: 'Public radio stream has not reported online since initialization.', status: 4, time: null},
        {name: 'stream-remote', label: 'Remote Stream', data: 'Internet stream for remote broadcasts has not reported online since initialization.', status: 4, time: null},
        {name: 'silence', label: 'Silence', data: 'The silence detection system has not reported silence since initialization.', status: 5, time: null},
        {name: 'EAS-internal', label: 'EAS NWS CAPS', data: 'No successful connection to all EAS NWS CAPS has been made yet since initialization.', status: 4, time: null},
        {name: 'server', label: 'Server', data: 'No server data has been returned yet since initialization.', status: 4, time: null},
        {name: 'music-library', label: 'Music Library', data: 'Music library tests have not yet executed since initialization.', status: 4, time: null},
        {name: 'google-calendar', label: 'Google Calendar', data: 'Google Calendar has not been loaded since initialization.', status: 4, time: null}
    ],

    /* Object used internally to check for errors.
     * Items in the object which are to be used by sails.helpers.error.count and sails.helpers.error.reset are formatted as the following:
     * key: {
     *     count: 0, // Used by the helper to count the number of times that error occurred.
     *     trigger: 15, // If count reaches this number, then fn() is executed
     *     active: false, // Set to false by default; used to make sure error checks do not run on top of each other.
     *     condition: function() {}, // If this function returns true, then count is automatically reset to 0 in the count helper.
     *     fn: function() {}, // This function is executed when count reaches trigger. The function should return a number to which the count should be changed to (such as 0).
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

        // Triggered when CRON checks fails to getQueue. 
        queueFail: {
            count: 0,
            trigger: 15,
            active: false,
            fn: function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        await Meta.changeMeta({changingState: `Switching radioDJ instances due to queueFail`});
                        sails.sockets.broadcast('system-error', 'system-error', true);
                        await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'system', loglevel: 'danger', logsubtype: '', event: `Switched automation instances; active RadioDJ was failing to return queue data.`})
                                .tolerate((err) => {
                                    sails.log.error(err);
                                });
                        await Announcements.findOrCreate({type: 'djcontrols', title: `queueFail (system)`, announcement: "System recently had switched automation instances because automation was failing to return what was in the queue. Please check the logs for more info."}, {type: 'djcontrols', level: 'urgent', title: `queueFail (system)`, announcement: "System recently had switched automation instances because automation was failing to return what was in the queue. Please check the logs for more info.", starts: moment().toISOString(true), expires: moment({year: 3000}).toISOString(true)})
                                .tolerate((err) => {
                                    sails.log.error(err);
                                });
                        await sails.helpers.rest.cmd('EnableAssisted', 1, 0);
                        await sails.helpers.rest.cmd('EnableAutoDJ', 1, 0);
                        await sails.helpers.rest.cmd('StopPlayer', 1, 0);
                        await sails.helpers.rest.changeRadioDj();
                        await sails.helpers.error.post();
                        await Meta.changeMeta({changingState: null});
                        return resolve(0);
                    } catch (e) {
                        await Meta.changeMeta({changingState: null});
                        return reject(e);
                    }
                });
            }
        },

        // Triggered when RadioDJ appears to be frozen
        frozen: {
            count: 0,
            trigger: 15,
            active: false,
            fn: function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        // If the previous error was over a minute ago, attempt standard recovery. Otherwise, switch RadioDJs.
                        if (moment().isAfter(moment(Status.errorCheck.prevError).add(1, 'minutes')))
                        {
                            sails.log.verbose(`No recent error; attempting standard recovery.`);
                            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'system', loglevel: 'danger', logsubtype: '', event: `Queue recovery attempted; queue was frozen.`})
                                    .tolerate((err) => {
                                        sails.log.error(err);
                                    });
                            await sails.helpers.error.post();
                        } else {
                            await Meta.changeMeta({changingState: `Switching automation instances due to frozen`});
                            sails.log.verbose(`Recent error; switching RadioDJs.`);
                            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'system', loglevel: 'danger', logsubtype: '', event: `Switched automation instances; queue was frozen.`})
                                    .tolerate((err) => {
                                        sails.log.error(err);
                                    });
                            await Announcements.findOrCreate({type: 'djcontrols', title: `frozen (system)`, announcement: "System recently had switched automation instances because the queue seems to have frozen. Please check the logs for more info."}, {type: 'djcontrols', level: 'urgent', title: `frozen (system)`, announcement: "System recently had switched automation instances because the queue seems to have frozen. Please check the logs for more info.", starts: moment().toISOString(true), expires: moment({year: 3000}).toISOString(true)})
                                    .tolerate((err) => {
                                        sails.log.error(err);
                                    });
                            sails.sockets.broadcast('system-error', 'system-error', true);
                            await sails.helpers.rest.cmd('EnableAutoDJ', 0, 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 1, 0);
                            await sails.helpers.rest.cmd('StopPlayer', 0, 0);
                            await sails.helpers.rest.changeRadioDj();
                            await sails.helpers.rest.cmd('ClearPlaylist', 1);
                            await sails.helpers.error.post();
                            await Meta.changeMeta({changingState: null});
                        }
                        return resolve(0);
                    } catch (e) {
                        await Meta.changeMeta({changingState: null});
                        return reject(e);
                    }
                });
            }
        },

        // Triggered when RadioDJ appears to be frozen, and we are in the middle of a remote broadcast
        frozenRemote: {
            count: 0,
            trigger: 15,
            active: false,
            fn: function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        // If the previous error was over a minute ago, attempt standard recovery. Otherwise, switch RadioDJs.
                        if (moment().isAfter(moment(Status.errorCheck.prevError).add(1, 'minutes')))
                        {
                            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'system', loglevel: 'urgent', logsubtype: '', event: `Remote stream not playing; attempting to re-queue it.`})
                                    .tolerate((err) => {
                                        sails.log.error(err);
                                    });
                            sails.log.verbose(`No recent error; attempting standard recovery.`);
                            await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                            await sails.helpers.songs.queue(sails.config.custom.subcats.remote, 'Bottom', 1);
                            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 0);

                        } else {
                            await Meta.changeMeta({changingState: `Switching radioDJ instances due to frozenRemote`});
                            sails.log.verbose(`Recent error; switching RadioDJs.`);
                            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'system', loglevel: 'danger', logsubtype: '', event: `Switched automation instances; remote stream was not playing.`})
                                    .tolerate((err) => {
                                        sails.log.error(err);
                                    });
                            await Announcements.findOrCreate({type: 'djcontrols', title: `frozenRemote (system)`, announcement: "System recently had switched automation instances because automation was failing to broadcast a remote stream. Please check the logs for more info."}, {type: 'djcontrols', level: 'urgent', title: `frozenRemote (system)`, announcement: "System recently had switched RadioDJ instances because RadioDJ was failing to broadcast a remote stream. Please check the logs for more info.", starts: moment().toISOString(true), expires: moment({year: 3000}).toISOString(true)})
                                    .tolerate((err) => {
                                        sails.log.error(err);
                                    });
                            sails.sockets.broadcast('system-error', 'system-error', true);
                            await sails.helpers.rest.cmd('EnableAutoDJ', 0, 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 1, 0);
                            await sails.helpers.rest.cmd('StopPlayer', 0, 0);
                            await sails.helpers.rest.changeRadioDj();
                            await sails.helpers.rest.cmd('ClearPlaylist', 1);
                            await sails.helpers.songs.queue(sails.config.custom.subcats.remote, 'Bottom', 1);
                            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 0);
                            await Meta.changeMeta({changingState: null});
                        }
                        return resolve(0);
                    } catch (e) {
                        await Meta.changeMeta({changingState: null});
                        return reject(e);
                    }
                });
            }
        },

        // Check to see if we successfully queued what we needed to in order to return to the sports broadcast
        sportsReturn: {
            count: 0,
            trigger: 6,
            active: false,
            condition: function () {
                var inQueue = false;
                Meta.automation.forEach(function (track) {
                    // WORK ON THIS
                });
            },
            fn: function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        // WORK ON THIS
                        return resolve(0);
                    } catch (e) {
                        return reject(e);
                    }
                });
            }
        },

        // Check to see if we successfully queued a station ID. If not, try again.
        stationID: {
            count: 0,
            trigger: 6,
            active: false,
            condition: function () {
                var inQueue = false;
                Meta.automation.forEach(function (track) {
                    if (sails.config.custom.subcats.IDs.indexOf(parseInt(track.IDSubcat)) > -1)
                    {
                        inQueue = true;
                        return true;
                    }
                });
                return inQueue;
            },
            fn: function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1);
                    } catch (e) {
                        return reject(e);
                    }
                    return resolve(1);
                });
            }
        },

        // do not allow automation break to continue for more than 5 minutes.
        automationBreak: {
            count: 0,
            trigger: 300,
            active: false,
            fn: function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        if (Meta['A'].changingState !== null)
                            return resolve(295);

                        await Meta.changeMeta({changingState: `Switching to automation via automationBreak`});
                        await Meta.changeMeta({state: 'automation_on', genre: '', dj: '', trackStamp: null, djcontrols: '', topic: '', webchat: true, playlist: null, playlist_position: -1, playlist_played: moment('2002-01-01').toISOString()});

                        // Add up to 3 track requests if any are pending
                        await sails.helpers.requests.queue(3, true, true);

                        // Re-load google calendar events to check for, and execute, any playlists/genres/etc that are scheduled.
                        await Calendar.preLoadEvents(true);

                        await Meta.changeMeta({changingState: null});
                        return resolve(0);
                    } catch (e) {
                        await Meta.changeMeta({changingState: null});
                        return reject(e);
                    }
                });
            }
        },

        // Check to see if we are in genre rotation and the queue is empty (usually mean no more tracks can play)
        genreEmpty: {
            count: 0,
            trigger: 10,
            active: false,
            fn: function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        await Meta.changeMeta({changingState: `Switching to automation via genreEmpty`});
                        await sails.helpers.genre.start('Default', true);
                        await Meta.changeMeta({changingState: null});
                        return resolve(0);
                    } catch (e) {
                        await Meta.changeMeta({changingState: null});
                        return reject(e);
                    }
                });
            }
        },

    },

    /**
     * Change statuses
     * @constructor
     * @param {Array} array - Object containing objects of statuses to change {name: 'key', label: 'friendly name', status: 5, data: 'String of data regarding this subsystem.'}.
     */

    changeStatus: function (array) {
        return new Promise(async (resolve, reject) => {
            sails.log.debug(`Status.changeStatus called.`);
            try {
                sails.log.debug(`Calling asyncForEach in Status.changeStatus for each status to be changed`);
                await sails.helpers.asyncForEach(array, function (status, index) {
                    return new Promise(async (resolve2, reject2) => {
                        var criteria = {name: status.name, status: status.status, data: status.data || '', label: status.label || status.name};
                        if (status.status === 5)
                            criteria.time = moment().toISOString(true);

                        // Find or create the status record

                        // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
                        var criteriaB = _.cloneDeep(criteria);

                        var record = await Status.findOrCreate({name: status.name}, criteriaB)
                                .tolerate((err) => {
                                    return resolve2();
                                });

                        // Search to see if any changes are made to the status; we only want to update if there is a change.
                        var updateIt = false;
                        for (var key in criteria)
                        {
                            if (criteria.hasOwnProperty(key))
                            {
                                if (criteria[key] !== record[key])
                                {
                                    // We don't want to fetch() on time-only updates; this will flood websockets
                                    if (!updateIt && key === 'time')
                                    {
                                        updateIt = 2;
                                    } else {
                                        updateIt = 1;
                                    }
                                }
                            }
                        }
                        if (updateIt === 1 && typeof criteria.status !== 'undefined' && criteria.status <= 3 && (!record.status || (record.status !== criteria.status)))
                        {
                            var loglevel = `warning`;
                            if (criteria.status < 2)
                            {
                                loglevel = `danger`;
                            } else if (criteria.status < 3)
                            {
                                loglevel = `urgent`;
                            }
                            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'status', loglevel: loglevel, logsubtype: Meta['A'].dj, event: `${criteria.label || record.label || criteria.name || record.name || `Unknown System`} - ${criteria.data ? criteria.data : `Unknown Issue`}`})
                                    .tolerate((err) => {
                                        // Don't throw errors, but log them
                                        sails.log.error(err);
                                    });
                        }
                        if (updateIt === 1 && record.status && criteria.status && record.status <= 3 && criteria.status > 3)
                        {
                            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'status', loglevel: 'success', logsubtype: Meta['A'].dj, event: `${criteria.label || record.label || criteria.name || record.name || `Unknown System`} is now good.`})
                                    .tolerate((err) => {
                                        // Don't throw errors, but log them
                                        sails.log.error(err);
                                    });
                        }
                        if (updateIt === 1)
                        {
                            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
                            var criteriaB = _.cloneDeep(criteria);
                            sails.log.verbose(`Updating status ${status.name} and pushing to sockets via fetch.`);
                            await Status.update({name: status.name}, criteriaB)
                                    .tolerate((err) => {
                                        return reject(err);
                                    })
                                    .fetch();
                        } else if (updateIt === 2) {
                            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
                            var criteriaB = _.cloneDeep(criteria);
                            sails.log.verbose(`Updating status ${status.name} without using fetch / pushing to sockets.`);
                            await Status.update({name: status.name}, criteriaB)
                                    .tolerate((err) => {
                                        return reject(err);
                                    });
                        }
                        return resolve2();
                    });
                });
                return resolve();
            } catch (e) {
                return reject(e);
            }
        });
    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`status socket: ${data}`);
        sails.sockets.broadcast('status', 'status', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.log.silly(`status socket: ${data}`);
        sails.sockets.broadcast('status', 'status', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`status socket: ${data}`);
        sails.sockets.broadcast('status', 'status', data);
        return proceed();
    }
};

