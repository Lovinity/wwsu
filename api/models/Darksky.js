/**
 * Darksky.js
 *
 * @description :: Darksky weather information
 */

module.exports = {
  datastore: `nodebase`,
  attributes: {
    ID: {
      type: `number`,
      required: true
    },

    currently: {
      type: `json`
    },

    minutely: {
      type: `json`
    },

    hourly: {
      type: `json`
    },

    daily: {
      type: `json`
    }
  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`darksky socket: ${data}`)
    sails.sockets.broadcast(`darksky`, `darksky`, data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`darksky socket: ${data}`)
    sails.sockets.broadcast(`darksky`, `darksky`, data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`darksky socket: ${data}`)
    sails.sockets.broadcast(`darksky`, `darksky`, data)
    return proceed()
  }
}
