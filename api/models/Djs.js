/**
 * Djs.js
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

        name: {
            type: 'string',
            required: true
        },
        
        login: {
            type: 'string',
            allowNull: true
        }
  },
  
      // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`djs socket: ${data}`);
        sails.sockets.broadcast('djs', 'djs', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.log.silly(`djs socket: ${data}`);
        sails.sockets.broadcast('djs', 'djs', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`djs socket: ${data}`);
        sails.sockets.broadcast('djs', 'djs', data);
        return proceed();
    }

};

