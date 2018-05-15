/**
 * Requests.js
 *
 * @description :: Track requests for RadioDJ.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'radiodj',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true,
        },

        songID: {
            type: 'number'
        },

        username: {
            type: 'string'
        },

        userIP: {
            type: 'string',
            maxLength: 50
        },

        message: {
            type: 'string'
        },

        requested: {
            type: 'ref',
            columnType: 'datetime'
        },

        played: {
            type: 'number',
            min: 0,
            max: 2
        }

    },
    
    pending: [], // Store track ID numbers in memory so that we don't need to query the Requests table every second and see if a request is being played.

};

