/**
 * version.js
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

        app: {
            type: 'string',
            required: true,
            unique: true
        },

        version: {
            type: 'string',
            required: true
        },

        downloadURL: {
            type: 'string',
            required: true,
            isURL: true
        },

    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = { insert: newlyCreatedRecord }
        sails.log.silly(`version socket: ${data}`)
        sails.sockets.broadcast(`version-${newlyCreatedRecord.app}`, 'version', data)
        return proceed()
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = { update: updatedRecord }
        sails.log.silly(`version socket: ${data}`)
        sails.sockets.broadcast(`version-${updatedRecord.app}`, 'version', data)
        return proceed()
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = { remove: destroyedRecord.ID }
        sails.log.silly(`version socket: ${data}`)
        sails.sockets.broadcast(`version-${destroyedRecord.app}`, 'version', data)
        return proceed()
    }

}
