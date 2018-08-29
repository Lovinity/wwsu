/**
 * Guardian.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'ram',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        date: {
            type: 'string'
        },

        title: {
            type: 'string'
        },

        link: {
            type: 'string'
        },

        author: {
            type: 'string'
        },

        description: {
            type: 'string'
        }

    },

};

