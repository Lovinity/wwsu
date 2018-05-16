/**
 * Recipients.js
 *
 * @description :: This model contains a collection of recipients that can receive messages.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'memory',
  attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },
        
        group: {
            type: 'string',
            isIn: ['system', 'website', 'display', 'computers']
        },
        
        name: {
            type: 'string'
        },
        
        label: {
            type: 'string'
        },
        
        status: {
            type: 'number',
            min: 0,
            max: 5
        },
        
        time: {
            type: 'ref',
            columnType: 'datetime'
        }
  },

};

