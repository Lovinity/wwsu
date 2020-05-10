/**
 * Logs.js
 *
 * @description :: Operation logs are stored here
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'nodebase',
  attributes: {
    ID: {
      type: 'number',
      autoIncrement: true
    },

    attendanceID: {
      type: 'number',
      allowNull: true
    },

    logtype: {
      type: 'string'
    },

    logsubtype: {
      type: 'string',
      allowNull: true
    },

    loglevel: {
      type: 'string',
      isIn: [ 'danger', 'orange', 'warning', 'info', 'success', 'primary', 'secondary' ]
    },

    logIcon: {
      type: 'string'
    },

    acknowledged: {
      type: 'boolean',
      defaultsTo: false
    },

    excused: {
      type: 'boolean',
      defaultsTo: false
    },

    title: {
      type: 'string'
    },

    event: {
      type: 'string',
      defaultsTo: ''
    },

    trackArtist: {
      type: 'string',
      allowNull: true
    },

    trackTitle: {
      type: 'string',
      allowNull: true
    },

    trackAlbum: {
      type: 'string',
      allowNull: true
    },

    trackLabel: {
      type: 'string',
      allowNull: true
    }
  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`status socket: ${data}`)
    sails.sockets.broadcast('logs', 'logs', data)

    if (newlyCreatedRecord.attendanceID && [ 'cancellation', 'silence', 'absent', 'unauthorized', 'id', 'sign-on-early', 'sign-on-late', 'sign-off-early', 'sign-off-late', 'break' ].indexOf(newlyCreatedRecord.logtype) !== -1) {
      (async (record) => {
        await sails.helpers.attendance.recalculate(record.attendanceID);
      })(newlyCreatedRecord)
    }

    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`status socket: ${data}`)
    sails.sockets.broadcast('logs', 'logs', data)

    if (updatedRecord.attendanceID && [ 'cancellation', 'silence', 'absent', 'unauthorized', 'id', 'sign-on-early', 'sign-on-late', 'sign-off-early', 'sign-off-late', 'break' ].indexOf(updatedRecord.logtype) !== -1) {
      (async (record) => {
        await sails.helpers.attendance.recalculate(record.attendanceID);
      })(updatedRecord)
    }

    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`status socket: ${data}`)
    sails.sockets.broadcast('logs', 'logs', data)

    if (destroyedRecord.attendanceID && [ 'cancellation', 'silence', 'absent', 'unauthorized', 'id', 'sign-on-early', 'sign-on-late', 'sign-off-early', 'sign-off-late', 'break' ].indexOf(destroyedRecord.logtype) !== -1) {
      (async (record) => {
        await sails.helpers.attendance.recalculate(record.attendanceID);
      })(destroyedRecord)
    }

    return proceed()
  }
}
