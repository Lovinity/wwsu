/**
 * sails.models.attendance.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  datastore: 'nodebase',
  attributes: {
    ID: {
      type: 'number',
      autoIncrement: true
    },

    calendarID: {
      type: 'number',
      allowNull: true
    },

    unique: {
      type: 'string'
    },

    dj: {
      type: 'number',
      allowNull: true
    },

    cohostDJ1: {
      type: 'number',
      allowNull: true
    },

    cohostDJ2: {
      type: 'number',
      allowNull: true
    },

    cohostDJ3: {
      type: 'number',
      allowNull: true
    },

    event: {
      type: 'string'
    },

    happened: {
      type: 'number',
      defaultsTo: 1,
      min: -1,
      max: 1
    },

    happenedReason: {
      type: 'string',
      allowNull: true
    },

    ignore: {
      type: 'number',
      defaultsTo: 0,
      min: 0,
      max: 2
    },

    showTime: {
      type: 'number',
      allowNull: true
    },

    tuneIns: {
      type: 'number',
      allowNull: true
    },

    listenerMinutes: {
      type: 'number',
      allowNull: true
    },

    webMessages: {
      type: 'number',
      allowNull: true
    },

    missedIDs: {
      type: 'number',
      defaultsTo: 0
    },

    breaks: {
      type: 'number',
      defaultsTo: 0
    },

    scheduledStart: {
      type: 'ref',
      columnType: 'datetime'
    },

    scheduledEnd: {
      type: 'ref',
      columnType: 'datetime'
    },

    actualStart: {
      type: 'ref',
      columnType: 'datetime'
    },

    actualEnd: {
      type: 'ref',
      columnType: 'datetime'
    }

  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`attendance socket: ${data}`)
    sails.sockets.broadcast('attendance', 'attendance', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`attendance socket: ${data}`)
    sails.sockets.broadcast('attendance', 'attendance', data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`attendance socket: ${data}`)
    sails.sockets.broadcast('attendance', 'attendance', data)
    return proceed()
  },

  weeklyAnalytics: {
    topShows: [],
    topGenre: 'None',
    topPlaylist: 'None',
    onAir: 0,
    onAirListeners: 0,
    tracksLiked: 0,
    tracksRequested: 0,
    webMessagesExchanged: 0
  }
}
