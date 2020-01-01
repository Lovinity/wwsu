/**
 * Calendarexceptions.js
 *
 * @description :: One-off calendar event exceptions.
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

        exceptionType: {
            type: 'string',
            isIn: ['additional','updated','canceled','updated-system','canceled-system'],
            defaultsTo: 'updated'
        },

        exceptionReason: {
            type: 'string',
            defaultsTo: 'Unspecified reason'
        },

        exceptionTime: {
            type: 'ref',
            defaultsTo: 'datetime'
        },

        type: {
            type: 'string',
            isIn: [ 'show', 'sports', 'remote', 'prerecord', 'genre', 'playlist', 'event', 'onair-booking', 'prod-booking', 'office-hours' ],
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
            allowNull: true
        },

        duration: {
            type: 'number',
            min: 0,
            allowNull: true
        }

    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = { insert: newlyCreatedRecord }
        sails.models.calendar7.calendardb.query('calendarexceptions', data);
        sails.log.silly(`calendarexceptions socket: ${data}`)
        sails.sockets.broadcast('calendarexceptions', 'calendarexceptions', data)
        return proceed()
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = { update: updatedRecord }
        sails.models.calendar7.calendardb.query('calendarexceptions', data);
        sails.log.silly(`calendarexceptions socket: ${data}`)
        sails.sockets.broadcast('calendarexceptions', 'calendarexceptions', data)

        // TODO: subscription notifications of changes


        return proceed()
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = { remove: destroyedRecord.ID }
        sails.models.calendar7.calendardb.query('calendarexceptions', data);
        sails.log.silly(`calendarexceptions socket: ${data}`)
        sails.sockets.broadcast('calendarexceptions', 'calendarexceptions', data)

        // TODO: subscription notifications of changes

        
        return proceed()
    }

}
