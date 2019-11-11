/**
 * Clockwheels.js
 *
 * @description :: Container containing scheduled clockwheels.
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
        type: 'number'
      },
  
      relativeStart: {
        type: 'number',
        min: 0
      },
  
      relativeEnd: {
        type: 'number',
        min: 0
      },
  
      segmentName: {
        type: 'string',
      },
  
      segmentColor: {
        type: 'string',
        defaultsTo: '#D50000'
      },
    },
  
  
    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
      var data = { insert: newlyCreatedRecord }
      sails.log.silly(`clockwheels socket: ${data}`)
      sails.sockets.broadcast('clockwheels', 'clockwheels', data)
      return proceed()
    },
  
    afterUpdate: function (updatedRecord, proceed) {
      var data = { update: updatedRecord }
      sails.log.silly(`Clockwheels socket: ${data}`)
      sails.sockets.broadcast('clockwheels', 'clockwheels', data)
      return proceed()
    },
  
    afterDestroy: function (destroyedRecord, proceed) {
      var data = { remove: destroyedRecord.ID }
      sails.log.silly(`clockwheels socket: ${data}`)
      sails.sockets.broadcast('clockwheels', 'clockwheels', data)
      return proceed()
    }
  
  }
  