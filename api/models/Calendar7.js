/**
 * Calendar7.js
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
            isIn: [ 'show', 'sports', 'remote', 'prerecord', 'genre', 'playlist', 'event', 'onair-booking', 'prod-booking' ],
            defaultsTo: 'event'
        },

        active: {
            type: 'boolean',
            defaultsTo: true,
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

        name: {
            type: 'string'
        },

        description: {
            type: 'string'
        },

        logo: {
            type: 'string'
        },

        banner: {
            type: 'string'
        },

        start: {
            type: 'ref',
            columnType: 'date'
        },

        end: {
            type: 'ref',
            columnType: 'date'
        },

        duration: {
            type: 'number',
            min: 0,
            defaultsTo: 60
        },

        schedule: {
            type: 'json'
        },

    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = { insert: newlyCreatedRecord }
        sails.log.silly(`calendar socket: ${data}`)
        sails.sockets.broadcast('calendar', 'calendar', data)
        return proceed()
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = { update: updatedRecord }
        sails.log.silly(`calendar socket: ${data}`)
        sails.sockets.broadcast('calendar', 'calendar', data)
        return proceed()
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = { remove: destroyedRecord.ID }
        sails.log.silly(`calendar socket: ${data}`)
        sails.sockets.broadcast('calendar', 'calendar', data)
        return proceed()
    }

}
