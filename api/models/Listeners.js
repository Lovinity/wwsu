/**
 * Listeners.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  datastore: `nodebase`,
  attributes: {

    ID: {
      type: `number`,
      autoIncrement: true
    },

    dj: {
      type: `number`,
      allowNull: true
    },

    listeners: {
      type: `number`
    }

  },

  memory: { dj: null, listeners: 0 } // Used to track when listener count or DJ changes; only adds entries in the database when things change, so that it doesn't get flooded with rows.

}
