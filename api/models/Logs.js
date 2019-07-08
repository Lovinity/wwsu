/**
 * Logs.js
 *
 * @description :: Operation logs are stored here
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',
    attributes: {
        ID: {
            type: 'number',
            autoIncrement: true
        },

        attendanceID: {
            type: 'number',
            allowNull: true
        },

        logtype: {
            type: 'string'
        },
        loglevel: {
            type: 'string',
            isIn: ['danger', 'urgent', 'warning', 'info', 'success', 'primary', 'secondary']
        },

        logsubtype: {
            type: 'string',
            allowNull: true
        },

        event: {
            type: 'string'
        },

        trackArtist: {
            type: 'string',
            allowNull: true
        },

        trackTitle: {
            type: 'string',
            allowNull: true
        },

        trackAlbum: {
            type: 'string',
            allowNull: true
        },

        trackLabel: {
            type: 'string',
            allowNull: true
        }
    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`status socket: ${data}`);
        sails.sockets.broadcast('logs', 'logs', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.log.silly(`status socket: ${data}`);
        sails.sockets.broadcast('logs', 'logs', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`status socket: ${data}`);
        sails.sockets.broadcast('logs', 'logs', data);
        return proceed();
    }
};

