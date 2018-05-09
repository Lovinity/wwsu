/**
 * Settings.js
 *
 * @description :: Container of settings saved by RadioDJ.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'radiodj',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        source: {
            type: 'string'
        },

        setting: {
            type: 'string'
        },

        value: {
            type: 'string'
        },

    }

};

