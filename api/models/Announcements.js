/* global sails */

/**
 * Announcements.js
 *
 * @description :: A container for announcements in various places of the WWSU system.
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
            type: 'string'
        },

        level: {
            type: 'string',
            isIn: ['danger', 'warning', 'info', 'success', 'primary', 'secondary']
        },

        announcement: {
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

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`announcements socket: ${data}`);
        sails.sockets.broadcast(`announcements-${newlyCreatedRecord.type}`, 'announcements', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.log.silly(`calendar socket: ${data}`);
        sails.sockets.broadcast(`announcements-${updatedRecord.type}`, 'announcements', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`calendar socket: ${data}`);
        sails.sockets.broadcast(`announcements-${destroyedRecord.type}`, 'announcements', data);
        return proceed();
    }

};

