/**
 * Directorhours.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    // We do not want this data to be persistent as it is being grabbed from Google Calendar
    datastore: 'timesheets',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        unique: {
            type: 'string'
        },

        active: {
            type: 'number',
            min: -1,
            max: 2,
            defaultsTo: 1
        },

        director: {
            type: 'string',
            defaultsTo: 'Unknown Director'
        },

        start: {
            type: 'ref',
            columnType: 'datetime'
        },

        end: {
            type: 'ref',
            columnType: 'datetime'
        }
    },

    calendar: [],

    // NOTE: loading of Director hour events happens in Calendar.loadEvents.

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`directorhours socket: ${data}`);
        sails.sockets.broadcast('directorhours', 'directorhours', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.log.silly(`directorhours socket: ${data}`);
        sails.sockets.broadcast('directorhours', 'directorhours', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`directorhours socket: ${data}`);
        sails.sockets.broadcast('directorhours', 'directorhours', data);
        return proceed();
    }
};

