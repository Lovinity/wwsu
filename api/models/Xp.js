/**
 * Xp.js
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

        dj: {
            type: 'string'
        },

        type: {
            type: 'string'
        },

        subtype: {
            type: 'string'
        },

        amount: {
            type: 'number',
            defaultsTo: 0
        }

    },

};
