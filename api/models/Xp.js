/**
 * Xp.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: `nodebase`,
  attributes: {

    ID: {
      type: `number`,
      autoIncrement: true
    },

    dj: {
      type: `number`
    },

    type: {
      type: `string`
    },

    subtype: {
      type: `string`
    },

    description: {
      type: `string`,
      allowNull: true
    },

    amount: {
      type: `number`,
      defaultsTo: 0
    }

  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`xp socket: ${data}`)
    sails.sockets.broadcast(`xp`, `xp`, data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`xp socket: ${data}`)
    sails.sockets.broadcast(`xp`, `xp`, data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`xp socket: ${data}`)
    sails.sockets.broadcast(`xp`, `xp`, data)
    return proceed()
  }

}
