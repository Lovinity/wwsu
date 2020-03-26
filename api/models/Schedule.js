/**
 * Schedule.js
 *
 * @description :: Schedule for calendar events.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        calendarID: {
            type: 'number',
            required: true
        },

        scheduleID: {
            type: 'number',
            allowNull: true
        },

        overriddenID: {
            type: 'number',
            allowNull: true
        },

        scheduleType: {
            type: 'string',
            isIn: [ 'unscheduled', 'updated', 'canceled', 'updated-system', 'canceled-system' ],
            allowNull: true
        },

        scheduleReason: {
            type: 'string',
            allowNull: true
        },

        originalTime: {
            type: 'ref',
            columnType: 'datetime'
        },

        type: {
            type: 'string',
            isIn: [ 'show', 'sports', 'remote', 'prerecord', 'genre', 'playlist', 'event', 'onair-booking', 'prod-booking', 'office-hours', 'task' ],
            allowNull: true,
        },

        priority: {
            type: 'number',
            allowNull: true
        },

        hostDJ: {
            type: 'number',
            allowNull: true,
        },

        cohostDJ1: {
            type: 'number',
            allowNull: true
        },

        cohostDJ2: {
            type: 'number',
            allowNull: true
        },

        cohostDJ3: {
            type: 'number',
            allowNull: true
        },

        eventID: {
            type: 'number',
            allowNull: true
        },

        playlistID: {
            type: 'number',
            allowNull: true
        },

        director: {
            type: 'number',
            allowNull: true
        },

        hosts: {
            type: 'string',
            allowNull: true
        },

        name: {
            type: 'string',
            allowNull: true
        },

        description: {
            type: 'string',
            allowNull: true
        },

        logo: {
            type: 'string',
            allowNull: true
        },

        banner: {
            type: 'string',
            allowNull: true
        },

        newTime: {
            type: 'ref',
            columnType: 'datetime',
        },

        oneTime: {
            type: 'json'
        },

        startDate: {
            type: 'ref',
            columnType: 'date',
        },

        endDate: {
            type: 'ref',
            columnType: 'date',
        },

        // TODO: add to schema
        recurDM: {
            type: 'json'
        },

        // TODO: add to schema
        // 0 = last week of month for the day of week specified, whether 4th or 5th week.
        recurWM: {
            type: 'json'
        },

        recurDW: {
            type: 'json'
        },

        recurH: {
            type: 'json'
        },

        recurM: {
            type: 'number',
            allowNull: true,
            min: 0,
            max: 59
        },

        // TODO: add to schema
        recurEvery: {
            type: 'number',
            min: 1,
            defaultsTo: 1
        },

        duration: {
            type: 'number',
            min: 0,
            max: (60 * 24),
            allowNull: true
        }

    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = { insert: newlyCreatedRecord }
        sails.models.calendar.calendardb.query('schedule', data);
        sails.log.silly(`schedule socket: ${data}`)
        sails.sockets.broadcast('schedule', 'schedule', data)
        var temp;

        // Process notifications
        temp = (async (event) => {
            if ((event.scheduleType === 'updated' || event.scheduleType === 'updated-system') && event.newTime !== null) {
                if (event.scheduleID !== null) {
                    var calendar = await sails.models.calendar.findOne({ ID: event.calendarID });
                    var exception = await sails.models.schedule.findOne({ ID: event.scheduleID });
                    if (calendar && exception) {
                        var tempCal = Object.assign({}, calendar);
                        Object.assign(tempCal, exception);
                        Object.assign(tempCal, {
                            ID: calendar.ID,
                            start: exception.newTime,
                            oneTime: [ exception.newTime ]
                        });
                        var _event = sails.models.calendar.calendardb.processRecord(tempCal, event, exception.newTime);
                        await sails.helpers.onesignal.sendEvent(_event, false, false);
                    }
                } else {
                    var calendar = await sails.models.calendar.findOne({ ID: event.calendarID });
                    if (calendar) {
                        var _event = sails.models.calendar.calendardb.processRecord(calendar, event, event.newTime);
                        await sails.helpers.onesignal.sendEvent(_event, false, false);
                    }
                }
            }

            if ((event.scheduleType === 'canceled' || event.scheduleType === 'canceled-system')) {
                if (event.scheduleID !== null) {
                    var calendar = await sails.models.calendar.findOne({ ID: event.calendarID });
                    var exception = await sails.models.schedule.findOne({ ID: event.scheduleID });
                    if (calendar && exception) {
                        var tempCal = Object.assign({}, calendar);
                        Object.assign(tempCal, exception);
                        Object.assign(tempCal, {
                            ID: calendar.ID,
                            start: exception.newTime,
                            oneTime: [ exception.newTime ]
                        });
                        var _event = sails.models.calendar.calendardb.processRecord(tempCal, event, exception.originalTime);
                        await sails.helpers.onesignal.sendEvent(_event, false, false);
                    }
                } else {
                    var calendar = await sails.models.calendar.findOne({ ID: event.calendarID });
                    if (calendar) {
                        var _event = sails.models.calendar.calendardb.processRecord(calendar, event, event.originalTime);
                        await sails.helpers.onesignal.sendEvent(_event, false, false);
                    }
                }
            }
        })(newlyCreatedRecord);

        return proceed()
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = { update: updatedRecord }
        sails.models.calendar.calendardb.query('schedule', data);
        sails.log.silly(`schedule socket: ${data}`)
        sails.sockets.broadcast('schedule', 'schedule', data)
        var temp;

        // Process notifications
        temp = (async (event) => {
            if ((event.scheduleType === 'updated' || event.scheduleType === 'updated-system') && (event.newTime !== null || event.duration !== null)) {
                if (event.scheduleID !== null) {
                    var calendar = await sails.models.calendar.findOne({ ID: event.calendarID });
                    var exception = await sails.models.schedule.findOne({ ID: event.scheduleID });
                    if (calendar && exception) {
                        var tempCal = Object.assign({}, calendar);
                        Object.assign(tempCal, exception);
                        Object.assign(tempCal, {
                            ID: calendar.ID,
                            start: exception.newTime,
                            oneTime: [ exception.newTime ]
                        });
                        var _event = sails.models.calendar.calendardb.processRecord(tempCal, event, exception.newTime);
                        await sails.helpers.onesignal.sendEvent(_event, false, false);
                    }
                } else {
                    var calendar = await sails.models.calendar.findOne({ ID: event.calendarID });
                    if (calendar) {
                        var _event = sails.models.calendar.calendardb.processRecord(calendar, event, event.newTime);
                        await sails.helpers.onesignal.sendEvent(_event, false, false);
                    }
                }

                // TODO: Conflict resolution on overriddenIDs
            }

            if ((event.scheduleType === 'canceled' || event.scheduleType === 'canceled-system')) {
                if (event.scheduleID !== null) {
                    var calendar = await sails.models.calendar.findOne({ ID: event.calendarID });
                    var exception = await sails.models.schedule.findOne({ ID: event.scheduleID });
                    if (calendar && exception) {
                        var tempCal = Object.assign({}, calendar);
                        Object.assign(tempCal, exception);
                        Object.assign(tempCal, {
                            ID: calendar.ID,
                            start: exception.newTime,
                            oneTime: [ exception.newTime ]
                        });
                        var _event = sails.models.calendar.calendardb.processRecord(tempCal, event, exception.originalTime);
                        await sails.helpers.onesignal.sendEvent(_event, false, false);
                    }
                } else {
                    var calendar = await sails.models.calendar.findOne({ ID: event.calendarID });
                    if (calendar) {
                        var _event = sails.models.calendar.calendardb.processRecord(calendar, event, event.originalTime);
                        await sails.helpers.onesignal.sendEvent(_event, false, false);
                    }
                }

                // Remove any schedules that were created as an override for the canceled schedule.
                await sails.models.schedule.destroy({ overriddenID: event.ID }).fetch();
            }
        })(updatedRecord);

        return proceed()
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = { remove: destroyedRecord.ID }
        sails.models.calendar.calendardb.query('schedule', data);
        sails.log.silly(`schedule socket: ${data}`)
        sails.sockets.broadcast('schedule', 'schedule', data)
        var temp;

        // Process notifications
        temp = (async (event) => {
            if ((event.scheduleType === 'updated' || event.scheduleType === 'updated-system') && (event.newTime !== null || event.duration !== null)) {
                if (event.scheduleID !== null) {
                    var calendar = await sails.models.calendar.findOne({ ID: event.calendarID });
                    var exception = await sails.models.schedule.findOne({ ID: event.scheduleID });
                    if (calendar && exception) {
                        var tempCal = Object.assign({}, calendar);
                        Object.assign(tempCal, exception);
                        Object.assign(tempCal, {
                            ID: calendar.ID,
                            start: exception.newTime,
                            oneTime: [ exception.newTime ]
                        });
                        var event2 = sails.models.calendar.calendardb.processRecord(tempCal, event, exception.newTime);
                        await sails.helpers.onesignal.sendEvent(event2, false, false, true);
                    }
                } else {
                    var calendar = await sails.models.calendar.findOne({ ID: event.calendarID });
                    if (calendar) {
                        var event2 = sails.models.calendar.calendardb.processRecord(calendar, event, event.newTime);
                        await sails.helpers.onesignal.sendEvent(event2, false, false, true);
                    }
                }
            }

            if ((event.scheduleType === 'canceled' || event.scheduleType === 'canceled-system')) {
                if (event.scheduleID !== null) {
                    var calendar = await sails.models.calendar.findOne({ ID: event.calendarID });
                    var exception = await sails.models.schedule.findOne({ ID: event.scheduleID });
                    if (calendar && exception) {
                        var tempCal = Object.assign({}, calendar);
                        Object.assign(tempCal, exception);
                        Object.assign(tempCal, {
                            ID: calendar.ID,
                            start: exception.newTime,
                            oneTime: [ exception.newTime ]
                        });
                        var event2 = sails.models.calendar.calendardb.processRecord(tempCal, event, exception.originalTime);
                        await sails.helpers.onesignal.sendEvent(event2, false, false, true);
                    }
                } else {
                    var calendar = await sails.models.calendar.findOne({ ID: event.calendarID });
                    if (calendar) {
                        var event2 = sails.models.calendar.calendardb.processRecord(calendar, event, event.originalTime);
                        await sails.helpers.onesignal.sendEvent(event2, false, false, true);
                    }
                }
            }

            // Remove any schedules that were created as an override for the deleted schedule.
            await sails.models.schedule.destroy({ overriddenID: event.ID }).fetch();

            // Remove any schedules that were created to override this schedule
            await sails.models.schedule.destroy({ scheduleID: event.ID }).fetch();

        })(destroyedRecord);

        return proceed()
    }

}