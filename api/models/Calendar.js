/**
 * Calendar.js
 *
 * @description :: Container containing Google Calendar events.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'nodebase',
  attributes: {

    ID: {
      type: 'number',
      autoIncrement: true
    },

    unique: {
      type: 'string'
    },

    active: {
      type: 'number',
      min: -1,
      max: 2,
      defaultsTo: 1
    },

    title: {
      type: 'string',
      defaultsTo: 'Unnamed Event'
    },

    description: {
      type: 'string',
      defaultsTo: ''
    },

    color: {
      type: 'string',
      defaultsTo: '#D50000'
    },

    allDay: {
      type: 'boolean',
      defaultsTo: false
    },

    start: {
      type: 'ref',
      columnType: 'datetime'
    },

    originalStart: {
      type: 'ref',
      columnType: 'datetime'
    },

    end: {
      type: 'ref',
      columnType: 'datetime'
    },

    originalEnd: {
      type: 'ref',
      columnType: 'datetime'
    },

    verify: {
      type: 'string'
    },

    verifyMessage: {
      type: 'string'
    },

    verifyTitleHTML: {
      type: 'string'
    }
  },

  calendar: [],

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`calendar socket: ${data}`)
    sails.sockets.broadcast('calendar', 'calendar', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`calendar socket: ${data}`)
    sails.sockets.broadcast('calendar', 'calendar', data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`calendar socket: ${data}`)
    sails.sockets.broadcast('calendar', 'calendar', data)
    return proceed()
  }

}
