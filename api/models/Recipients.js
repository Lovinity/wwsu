/**
 * Recipients.js
 *
 * @description :: This model contains a collection of recipients that can receive messages.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  datastore: 'ram',
  attributes: {

    ID: {
      type: 'number',
      autoIncrement: true
    },

    hostID: {
      type: 'number',
      allowNull: true
    },

    host: {
      type: 'string'
    },

    device: {
      type: 'string',
      allowNull: true
    },

    group: {
      type: 'string',
      isIn: ['system', 'website', 'display', 'computers']
    },

    label: {
      type: 'string'
    },

    status: {
      type: 'number',
      min: 0,
      max: 5
    },

    peer: {
      type: 'string',
      allowNull: true
    },

    makeCalls: {
      type: 'boolean',
      defaultsTo: false
    },

    answerCalls: {
      type: 'boolean',
      defaultsTo: false
    },

    time: {
      type: 'ref',
      columnType: 'datetime',
      defaultsTo: new Date()
    }
  },

  // Template are initial records created in the Recipients model upon execution of bootstrap.
  template: [
    {
      host: 'website',
      group: 'website',
      label: 'Web Public',
      status: 0
    }
  ],

  sockets: {}, // For recipients connecting via sockets, we will pair the sockets with the Recipients.ID in the format: sockets[Recipients.ID] = [array, of, socket, IDs]

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`recipients socket: ${data}`)
    sails.sockets.broadcast('recipients', 'recipients', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`recipients socket: ${data}`)
    sails.sockets.broadcast('recipients', 'recipients', data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`recipients socket: ${data}`)
    sails.sockets.broadcast('recipients', 'recipients', data)
    return proceed()
  }

}
