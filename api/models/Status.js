/* global sails, Status, _, Logs, moment, Meta */

/**
 * Status.js
 *
 * @description :: Model contains information about the status of certain systems.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

// API NOTE: Do not use Status.update() to update statuses; use Status.changeStatus instead. Otherwise, websockets may get flooded with updates.

module.exports = {

    // This model's data is only temporary and should not persist. Use memory instead of SQL.
    datastore: 'memory',
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
        {name: 'db-nodebase', label: 'DB Nodebase', status: 1, data: 'Successful database test has not been run yet since initialization.', time: null},
        {name: 'db-radiodj', label: 'DB RadioDJ', status: 1, data: 'Successful database test has not been run yet since initialization.', time: null},
        {name: 'db-memory', label: 'DB Memory', status: 1, data: 'Successful database test has not been run yet since initialization.', time: null},
        {name: 'website', label: 'Website', data: 'No connection to wwsu1069.org could be made yet since initialization.', status: 2, time: null},
        {name: 'stream-public', label: 'Radio Stream', data: 'Public radio stream has not reported online since initialization.', status: 2, time: null},
        {name: 'stream-remote', label: 'Remote Stream', data: 'Internet stream for remote broadcasts has not reported online since initialization.', status: 4, time: null},
        {name: 'silence', label: 'Silence', data: 'The silence detection system has not reported silence since initialization.', status: 5, time: null},
        {name: 'EAS-internal', label: 'EAS NWS CAPS', data: 'No successful connection to all EAS NWS CAPS has been made yet since initialization.', status: 3, time: null},
        {name: 'openproject', label: 'OpenProject', data: 'No successful connection to OpenProject since initialization.', status: 2, time: null},
        {name: 'server', label: 'Server', data: 'No server data has been returned yet since initialization.', status: 2, time: null}
    ],

    /* Object used internally to check for errors.
     * Items in the object which are to be used by sails.helpers.error.count and sails.helpers.error.reset are formatted as the following:
     * key: {
     *     count: 0, // Used by the helper to count the number of times that error occurred.
     *     trigger: 15, // If count reaches this number, then fn() is executed
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
            fn: function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        sails.sockets.broadcast('system-error', 'system-error', true);
                        await sails.helpers.rest.cmd('EnableAssisted', 1);
                        await sails.helpers.rest.cmd('EnabledAutoDJ', 1);
                        await sails.helpers.rest.cmd('StopPlayer', 1);
                        await sails.helpers.rest.changeRadioDj();
                        await sails.helpers.error.post();
                    } catch (e) {
                        return reject(e);
                    }
                    return resolve(0);
                });
            }
        },

        // Triggered when RadioDJ appears to be frozen
        frozen: {
            count: 0,
            trigger: 15,
            fn: function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        // If the previous error was over a minute ago, attempt standard recovery. Otherwise, switch RadioDJs.
                        if (moment().isAfter(moment(Status.errorCheck.prevError).add(1, 'minutes')))
                        {
                            sails.log.verbose(`No recent error; attempting standard recovery.`);
                            await sails.helpers.error.post();
                        } else {
                            sails.log.verbose(`Recent error; switching RadioDJs.`);
                            sails.sockets.broadcast('system-error', 'system-error', true);
                            await sails.helpers.rest.cmd('EnableAutoDJ', 0, 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 1, 0);
                            await sails.helpers.rest.cmd('StopPlayer', 0, 0);
                            await sails.helpers.rest.changeRadioDj();
                            await sails.helpers.rest.cmd('ClearPlaylist', 1);
                            await sails.helpers.error.post();
                        }
                    } catch (e) {
                        return reject(e);
                    }
                    return resolve(0);
                });
            }
        },

        // Triggered when RadioDJ appears to be frozen, and we are in the middle of a remote broadcast
        frozenRemote: {
            count: 0,
            trigger: 15,
            fn: function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        // If the previous error was over a minute ago, attempt standard recovery. Otherwise, switch RadioDJs.
                        if (moment().isAfter(moment(Status.errorCheck.prevError).add(1, 'minutes')))
                        {
                            sails.log.verbose(`No recent error; attempting standard recovery.`);
                            await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                            await sails.helpers.songs.queue(sails.config.custom.subcats.remote, 'Bottom', 1);
                            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 0);

                        } else {
                            sails.log.verbose(`Recent error; switching RadioDJs.`);
                            sails.sockets.broadcast('system-error', 'system-error', true);
                            await sails.helpers.rest.cmd('EnableAutoDJ', 0, 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 1, 0);
                            await sails.helpers.rest.cmd('StopPlayer', 0, 0);
                            await sails.helpers.rest.changeRadioDj();
                            await sails.helpers.rest.cmd('ClearPlaylist', 1);
                            await sails.helpers.songs.queue(sails.config.custom.subcats.remote, 'Bottom', 1);
                            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 0);
                        }
                    } catch (e) {
                        return reject(e);
                    }
                    return resolve(0);
                });
            }
        },

        // Check to see if we successfully queued what we needed to in order to return to the sports broadcast
        sportsReturn: {
            count: 0,
            trigger: 6,
            condition: function () {
                // WORK ON THIS
            },
            fn: function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        // WORK ON THIS
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
            condition: function () {
                var inQueue = false;
                Meta.automation.forEach(function (track) {
                    if (sails.config.custom.subcats.IDs.indexOf(track.IDSubcat) > -1)
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

    },

    /**
     * Change statuses
     * @constructor
     * @param {Array} array - Object containing objects of statuses to change {name: 'key', label: 'friendly name', status: 5}.
     */

    changeStatus: function (array) {
        return new Promise(async (resolve, reject) => {
            sails.log.debug(`Status.changeStatus called.`);
            try {
                await sails.helpers.asyncForEach(array, function (status, index) {
                    return new Promise(async (resolve2, reject2) => {
                        var criteria = {name: status.name, status: status.status, data: status.data};
                        if (status.status === 5)
                            criteria.time = moment().toISOString();

                        // Find or create the status record

                        // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
                        var criteriaB = _.cloneDeep(criteria);

                        var record = await Status.findOrCreate({name: status.name}, criteriaB)
                                .intercept((err) => {
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
                        if (updateIt === 1)
                        {
                            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
                            var criteriaB = _.cloneDeep(criteria);
                            sails.log.verbose(`Updating status ${status.name} and pushing to sockets via fetch.`);
                            await Status.update({name: status.name}, criteriaB)
                                    .intercept((err) => {
                                        return reject(err);
                                    })
                                    .fetch();
                        } else if (updateIt === 2) {
                            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
                            var criteriaB = _.cloneDeep(criteria);
                            sails.log.verbose(`Updating status ${status.name} without using fetch / pushing to sockets.`);
                            await Status.update({name: status.name}, criteriaB)
                                    .intercept((err) => {
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

