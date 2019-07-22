/**
 * Genre.js
 *
 * @description :: Container of genres in RadioDJ.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'radiodj',
  attributes: {
    ID: {
      columnName: 'id',
      type: 'number',
      autoIncrement: true
    },

    name: {
      type: 'string',
      maxLength: 50
    }

  }
}
