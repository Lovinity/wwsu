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

        recurDM: {
            type: 'json'
        },

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
                var _event = sails.models.calendar.calendardb.scheduleToEvent(event);
                await sails.helpers.onesignal.sendEvent(_event, false, false);
                await sails.helpers.emails.queueEvent(_event, false, false);
            }

            if ((event.scheduleType === 'canceled' || event.scheduleType === 'canceled-system')) {
                var _event = sails.models.calendar.calendardb.scheduleToEvent(event);
                await sails.helpers.onesignal.sendEvent(_event, false, false);
                await sails.helpers.emails.queueEvent(_event, false, false);
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
                var _event = sails.models.calendar.calendardb.scheduleToEvent(event);
                await sails.helpers.onesignal.sendEvent(_event, false, false);
                await sails.helpers.emails.queueEvent(_event, false, false);
            }

            if ((event.scheduleType === 'canceled' || event.scheduleType === 'canceled-system')) {
                var _event = sails.models.calendar.calendardb.scheduleToEvent(event);
                await sails.helpers.onesignal.sendEvent(_event, false, false);
                await sails.helpers.emails.queueEvent(_event, false, false);
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
                var _event = sails.models.calendar.calendardb.scheduleToEvent(event);
                await sails.helpers.onesignal.sendEvent(_event, false, false, true);
                await sails.helpers.emails.queueEvent(_event, false, false, true);
            }

            if ((event.scheduleType === 'canceled' || event.scheduleType === 'canceled-system')) {
                var _event = sails.models.calendar.calendardb.scheduleToEvent(event);
                await sails.helpers.onesignal.sendEvent(_event, false, false, true);
                await sails.helpers.emails.queueEvent(_event, false, false, true);
            }

            // Remove any schedules that were created as an override for the deleted schedule.
            //await sails.models.schedule.destroy({ overriddenID: event.ID }).fetch();

            // Remove any schedules that were created to override this schedule
            //await sails.models.schedule.destroy({ scheduleID: event.ID }).fetch();

            // Remove any clockwheels created for this schedule
            await sails.models.clockwheels.destroy({ scheduleID: event.ID }).fetch();

        })(destroyedRecord);

        return proceed();
    }

}