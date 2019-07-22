/**
 * Eas.js
 *
 * @description :: Internal Emergency Alert System.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  // Eas data should persist. Use MySQL.
  datastore: `nodebase`,
  attributes: {

    ID: {
      type: `number`,
      autoIncrement: true
    },

    source: {
      type: `string`
    },

    reference: {
      type: `string`
    },

    alert: {
      type: `string`
    },

    information: {
      type: `string`
    },

    severity: {
      type: `string`
    },

    color: {
      type: `string`
    },

    counties: {
      type: `string`
    },

    starts: {
      type: `ref`,
      columnType: `datetime`
    },

    expires: {
      type: `ref`,
      columnType: `datetime`
    }
  },

  activeCAPS: [], // Array of active NWS alerts, cleared at each check, to help determine maintenance / cleaning up of NWS alerts.

  pendingAlerts: {}, // An object of alerts pending to be processed, key is unique ID, value is an object of alert information (includes property _new, which is true if the record is to be inserted rather than updated)

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`eas socket: ${data}`)
    sails.sockets.broadcast(`eas`, `eas`, data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`eas socket: ${data}`)
    sails.sockets.broadcast(`eas`, `eas`, data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`eas socket: ${data}`)
    sails.sockets.broadcast(`eas`, `eas`, data)
    return proceed()
  }
}
