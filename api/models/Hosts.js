/**
 * Hosts.js
 *
 * @description :: Hosts contains the computers that use DJ Controls, their friendly name, and which kinds of messages they should receive.
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
      required: true,
      unique: true
    },

    friendlyname: {
      type: 'string',
      defaultsTo: 'Unknown Host'
    },

    authorized: {
      type: 'boolean',
      defaultsTo: false
    },

    admin: {
      type: 'boolean',
      defaultsTo: false
    },

    lockToDJ: {
      type: 'number',
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

    silenceDetection: {
      type: 'boolean',
      defaultsTo: false
    },

    recordAudio: {
      type: 'boolean',
      defaultsTo: false
    },

    delaySystem: {
      type: 'boolean',
      defaultsTo: false
    },

    EAS: {
      type: 'boolean',
      defaultsTo: false
    },

    requests: {
      type: 'boolean',
      defaultsTo: false
    },

    emergencies: {
      type: 'boolean',
      defaultsTo: false
    },

    accountability: {
      type: 'boolean',
      defaultsTo: false
    },

    webmessages: {
      type: 'boolean',
      defaultsTo: false
    }

  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`hosts socket: ${data}`)
    sails.sockets.broadcast('hosts', 'hosts', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`hosts socket: ${data}`)
    sails.sockets.broadcast('hosts', 'hosts', data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`hosts socket: ${data}`)
    sails.sockets.broadcast('hosts', 'hosts', data)
    return proceed()
  }

}
