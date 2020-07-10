/**
 * Climacell.js
 *
 * @description :: Climacell weather information
 */

module.exports = {
  datastore: 'nodebase',
  attributes: {
    ID: {
      type: 'number',
      required: true
    },

    dataClass: {
      type: 'string',
      required: true,
      unique: true,
      description: "The class identifier of the data"
    },

    data: {
      type: 'string',
      allowNull: true
    }
  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`climacell socket: ${data}`)
    sails.sockets.broadcast('climacell', 'climacell', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`climacell socket: ${data}`)
    sails.sockets.broadcast('climacell', 'climacell', data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`climacell socket: ${data}`)
    sails.sockets.broadcast('climacell', 'climacell', data)
    return proceed()
  }
}
