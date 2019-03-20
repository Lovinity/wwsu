/* global Calendar, sails, moment, Attendance, Meta, Listeners, Logs */

/**
 * Attendance.js
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

        showTime: {
            type: 'number',
            allowNull: true
        },

        listenerMinutes: {
            type: 'number',
            allowNull: true
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
        },

    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`attendance socket: ${data}`);
        sails.sockets.broadcast('attendance', 'attendance', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.log.silly(`attendance socket: ${data}`);
        sails.sockets.broadcast('attendance', 'attendance', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`attendance socket: ${data}`);
        sails.sockets.broadcast('attendance', 'attendance', data);
        return proceed();
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
    // Automatically add current time as actualEnd in the previous Attendance record being used.
    // Use Google Calendar info if an event matches.
    createRecord: function (event) {
        return new Promise(async (resolve, reject) => {
            try {
                sails.log.debug(`Attendance.createRecord called.`);
                var returnData = {newID: null, unique: null};

                // Store the current ID in a variable; we want to start a new record before processing the old one
                var currentID = Meta['A'].attendanceID;

                // Find a calendar record with the provided event name. Allow up to 10 grace minutes before start time
                var record = await Calendar.find({title: event, active: 1, start: {"<=": moment().add(10, 'minutes').toISOString(true)}, end: {">=": moment().toISOString(true)}}).limit(1);
                sails.log.debug(`Calendar records found: ${record.length || 0}`);

                // Create the new attendance record
                var created = null;

                if (record.length > 0)
                {
                    returnData.unique = record[0].unique;
                    created = await Attendance.create({unique: record[0].unique, dj: Meta['A'].dj, event: record[0].title, scheduledStart: moment(record[0].start).toISOString(true), scheduledEnd: moment(record[0].end).toISOString(true), actualStart: moment().toISOString(true)}).fetch();
                } else {
                    created = await Attendance.create({dj: Meta['A'].dj, event: event, actualStart: moment().toISOString(true)}).fetch();
                    
                    // Broadcasts without a calendar ID are unauthorized. Log them!
                    if (event.startsWith("Show: ") || event.startsWith("Remote: ") || event.startsWith("Sports: "))
                    {
                        await Logs.create({attendanceID: created.ID, logtype: 'unauthorized', loglevel: 'warning', logsubtype: event.replace("Show: ", "").replace("Remote: ", "").replace("Sports: ", ""), event: `An unauthorized / unscheduled broadcast started!<br />Broadcast: ${event}`, createdAt: moment().toISOString(true)}).fetch()
                                .tolerate((err) => {
                                    sails.log.error(err);
                                });
                    }
                }
                
                returnData.newID = created.ID;

                // Switch to the new record in the system
                await Meta.changeMeta({attendanceID: created.ID});

                // Add actualEnd to the previous attendance record, calculate showTime, calculate listenerMinutes, and calculate new weekly DJ stats to broadcast
                if (currentID !== null)
                {
                    // Get Attendance record
                    var currentRecord = await Attendance.findOne({ID: currentID});

                    if (currentRecord)
                    {
                        // Pre-load update data
                        var updateData = {showTime: moment().diff(moment(currentRecord.actualStart), 'minutes'), listenerMinutes: 0, actualEnd: moment().toISOString(true)};

                        // Fetch listenerRecords since beginning of Attendance, as well as the listener count prior to start of attendance record.
                        var listenerRecords = await Listeners.find({createdAt: {'>=': currentRecord.actualStart}}).sort("createdAt ASC");
                        var prevListeners = await Listeners.find({'createdAt': {'<=': currentRecord.actualStart}}).sort('createdAt DESC').limit(1) || 0;
                        if (prevListeners[0])
                            prevListeners = prevListeners[0].listeners || 0;

                        // Calculate listener minutes
                        var prevTime = moment(currentRecord.actualStart);
                        var listenerMinutes = 0;

                        if (listenerRecords && listenerRecords.length > 0)
                        {
                            listenerRecords.map(listener => {
                                listenerMinutes += (moment(listener.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
                                prevListeners = listener.listeners;
                                prevTime = moment(listener.createdAt);
                            });
                        }

                        // This is to ensure listener minutes from the most recent entry up until the current time is also accounted for
                        listenerMinutes += (moment().diff(moment(prevTime), 'seconds') / 60) * prevListeners;

                        listenerMinutes = Math.round(listenerMinutes);
                        updateData.listenerMinutes = listenerMinutes;

                        // Update the attendance record with the data
                        await Attendance.update({ID: currentID}, updateData).fetch();

                        // Recalculate weekly analytics
                        await sails.helpers.attendance.calculateStats();
                    }
                }

                return resolve(returnData);
            } catch (e) {
                return reject(e);
            }
        });
    }

};

