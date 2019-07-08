/**
 * Subscribers.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',

    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        host: {
            type: 'string',
            required: true
        },

        device: {
            type: 'string',
            required: true
        },

        type: {
            type: 'string',
            required: true
        },

        subtype: {
            type: 'string',
            required: true
        },

    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`subscribers socket: ${data}`);
        sails.sockets.broadcast('subscribers', 'subscribers', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.log.silly(`subscribers socket: ${data}`);
        sails.sockets.broadcast('subscribers', 'subscribers', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`subscribers socket: ${data}`);
        sails.sockets.broadcast('subscribers', 'subscribers', data);
        return proceed();
    }

};

