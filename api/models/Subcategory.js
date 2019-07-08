/**
 * Subcategory.js
 *
 * @description :: A container of subcategories from RadioDJ.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    datastore: 'radiodj',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        parentid: {
            type: 'number'
        },

        name: {
            type: 'string'
        }

  },

};

