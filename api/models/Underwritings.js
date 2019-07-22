/**
 * Underwritings.js
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
      maxLength: 255,
      required: true
    },

    trackID: {
      type: 'number',
      required: true
    },

    mode: {
      type: 'json',
      required: true
    }

  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`underwritings socket: ${data}`)
    sails.sockets.broadcast('underwritings', 'underwritings', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`underwritings socket: ${data}`)
    sails.sockets.broadcast('underwritings', 'underwritings', data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`underwritings socket: ${data}`)
    sails.sockets.broadcast('underwritings', 'underwritings', data)
    return proceed()
  }

}
