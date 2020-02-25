/**
 * calendar.js
 *
 * @description :: Calendar events.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        type: {
            type: 'string',
            isIn: [ 'show', 'sports', 'remote', 'prerecord', 'genre', 'playlist', 'event', 'onair-booking', 'prod-booking', 'office-hours' ],
            defaultsTo: 'event'
        },

        active: {
            type: 'boolean',
            defaultsTo: true,
        },

        priority: {
            type: 'number',
            allowNull: true,
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

        startDate: {
            type: 'ref',
            columnType: 'date',
        },

        endDate: {
            type: 'ref',
            columnType: 'date',
        }
    },

    calendardb: undefined,

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = { insert: newlyCreatedRecord }
        sails.models.calendar.calendardb.query('calendar', data);
        sails.log.silly(`calendar socket: ${data}`)
        sails.sockets.broadcast('calendar', 'calendar', data)
        return proceed()
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = { update: updatedRecord }
        var temp;

        // If setting active to false, treat as deletion in web sockets and delete all schedules and notify subscribers of a discontinued show
        if (!updatedRecord.active) {
            var data = { remove: updatedRecord.ID }
            sails.models.calendar.calendardb.query('calendar', data);
            sails.log.silly(`calendar socket: ${data}`)
            sails.sockets.broadcast('calendar', 'calendar', data)
            temp = (async () => {
                await sails.helpers.schedule.destroy({ calendarID: updatedRecord.ID }).fetch();
                var event = sails.models.calendar.calendardb.processRecord(updatedRecord, {}, moment().toISOString(true));
                await sails.helpers.onesignal.sendEvent(event, false, false)
            })()
        } else {
            var data = { update: updatedRecord }
            sails.models.calendar.calendardb.query('calendar', data);
            sails.log.silly(`calendar socket: ${data}`)
            sails.sockets.broadcast('calendar', 'calendar', data)
        }

        return proceed()
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = { remove: destroyedRecord.ID }
        sails.models.calendar.calendardb.query('calendar', data);
        sails.log.silly(`calendar socket: ${data}`)
        sails.sockets.broadcast('calendar', 'calendar', data)
        var temp;

        // Remove all calendar schedules
        temp = (async () => {
            await sails.helpers.schedule.destroy({ calendarID: destroyedRecord.ID }).fetch();
            var event = sails.models.calendar.calendardb.processRecord(destroyedRecord, {}, moment().toISOString(true));
            await sails.helpers.onesignal.sendEvent(event, false, false)
        })()
        
        return proceed()
    }

}
