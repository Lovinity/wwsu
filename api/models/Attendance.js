/* global Calendar, sails, moment, Attendance, Meta */

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

        DJ: {
            type: 'string',
            allowNull: true
        },

        event: {
            type: 'string'
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

    // Create a new record in the attendance table. 
    // Switch to that record for logging / operations. 
    // Automatically add current time as actualStart. 
    // Automatically add current time as actualEnd in the previous Attendance record being used.
    // Use Google Calendar info if an event matches.
    createRecord: function (event) {
        return new Promise(async (resolve, reject) => {
            try {
                sails.log.debug(`Attendance.createRecord called.`);

                // Strip DJ if it exists
                var dj = event;
                if (dj.includes(" - "))
                {
                    dj = dj.split(" - ")[0];
                    dj = dj.substring(dj.indexOf(": ") + 2);
                } else {
                    dj = null;
                }

                // Find a calendar record with the provided event name. Allow up to 10 grace minutes before start time
                var record = await Calendar.find({title: event, start: {"<=": moment().add(10, 'minutes').toISOString(true)}, end: {">=": moment().toISOString(true)}}).limit(1);
                sails.log.debug(`Calendar records found: ${record.length || 0}`);

                // Add actualEnd to the previous attendance record
                if (Meta['A'].attendanceID !== null)
                    await Attendance.update({ID: Meta['A'].attendanceID}, {actualEnd: moment().toISOString(true)});

                // Create the new attendance record
                var created = null;

                if (record.length > 0)
                {
                    created = await Attendance.create({unique: record[0].unique, DJ: dj, event: record[0].title, scheduledStart: moment(record[0].start).toISOString(true), scheduledEnd: moment(record[0].end).toISOString(true), actualStart: moment().toISOString(true)}).fetch();
                } else {
                    created = await Attendance.create({DJ: dj, event: event, actualStart: moment().toISOString(true)}).fetch();
                }

                // Switch to the new record in the system
                await Meta.changeMeta({attendanceID: created.ID});

                return resolve();
            } catch (e) {
                return reject(e);
            }
        });
    }

};

