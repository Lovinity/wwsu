/* global sails */

/**
 * Discipline.js
 *
 * @description :: Discipline manages bans on website and mobile app users.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        active: {
            type: 'boolean',
            defaultsTo: true,
        },

        IP: {
            type: 'string'
        },

        action: {
            type: 'string'
        },

        message: {
            type: 'string'
        }
    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`discipline socket: ${data}`);
        sails.sockets.broadcast('discipline', 'discipline', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.log.silly(`discipline socket: ${data}`);
        sails.sockets.broadcast('discipline', 'discipline', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`discipline socket: ${data}`);
        sails.sockets.broadcast('discipline', 'discipline', data);
        return proceed();
    }
};

