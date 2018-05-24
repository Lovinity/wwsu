/* global sails */

/**
 * Eas.js
 *
 * @description :: Internal Emergency Alert System.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    // Eas data should persist. However, all data is temporary and not client heavy. Use disk instead of SQL.
    datastore: 'disk',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        source: {
            type: 'string'
        },

        reference: {
            type: 'string'
        },

        alert: {
            type: 'string'
        },

        information: {
            type: 'string'
        },

        severity: {
            type: 'string'
        },

        color: {
            type: 'string'
        },

        counties: {
            type: 'string'
        },

        starts: {
            type: 'ref',
            columnType: 'datetime'
        },

        expires: {
            type: 'ref',
            columnType: 'datetime'
        }
    },

    activeCAPS: [], // Array of active NWS alerts, cleared at each check, to help determine maintenance / cleaning up of NWS alerts.

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`eas socket: ${data}`);
        sails.sockets.broadcast('eas', 'eas', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.log.silly(`eas socket: ${data}`);
        sails.sockets.broadcast('eas', 'eas', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`eas socket: ${data}`);
        sails.sockets.broadcast('eas', 'eas', data);
        return proceed();
    }
};

