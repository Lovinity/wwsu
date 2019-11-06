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
      required: true,
      unique: true
    },

    login: {
      type: 'string',
      allowNull: true
    },

    lastSeen: {
      type: 'ref',
      columnType: 'datetime'
    }

  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    newlyCreatedRecord.login = newlyCreatedRecord.login === null ? false : true
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`djs socket: ${data}`)
    sails.sockets.broadcast('djs', 'djs', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    updatedRecord.login = updatedRecord.login === null ? false : true
    var data = { update: updatedRecord }
    sails.log.silly(`djs socket: ${data}`)
    sails.sockets.broadcast('djs', 'djs', data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`djs socket: ${data}`)
    sails.sockets.broadcast('djs', 'djs', data)
    return proceed()
  }

}
