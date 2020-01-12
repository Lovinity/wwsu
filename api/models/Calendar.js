/**
 * calendar.js
 *
 * @description :: Calendar events.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',
    tableName: 'calendar7', // Temporary; remove when working and other calendar table was deleted.
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

        start: {
            type: 'ref',
            columnType: 'date',
        },

        end: {
            type: 'ref',
            columnType: 'date',
        },

        duration: {
            type: 'number',
            min: 0,
            defaultsTo: 60
        },

        schedule: {
            type: 'json',
        },

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
        sails.models.calendar.calendardb.query('calendar', data);
        sails.log.silly(`calendar socket: ${data}`)
        sails.sockets.broadcast('calendar', 'calendar', data)
        var temp;

        // If setting active to false, delete all exceptions and notify subscribers of a discontinued show
        if (!updatedRecord.active) {
            temp = (async () => {
                await sails.helpers.calendarexceptions.destroy({ calendarID: updatedRecord.ID }).fetch();
                var event = sails.models.calendar.calendardb.processRecord(updatedRecord, {}, moment().toISOString(true));
                await sails.helpers.onesignal.sendEvent(event, false, false)
            })()
        }

        return proceed()
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = { remove: destroyedRecord.ID }
        sails.models.calendar.calendardb.query('calendar', data);
        sails.log.silly(`calendar socket: ${data}`)
        sails.sockets.broadcast('calendar', 'calendar', data)
        var temp;

        // Remove all calendar exceptions
        temp = (async () => {
            await sails.helpers.calendarexceptions.destroy({ calendarID: destroyedRecord.ID }).fetch();
            var event = sails.models.calendar.calendardb.processRecord(destroyedRecord, {}, moment().toISOString(true));
            await sails.helpers.onesignal.sendEvent(event, false, false)
        })()
        
        return proceed()
    }

}
