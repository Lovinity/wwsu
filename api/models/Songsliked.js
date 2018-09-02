/**
 * Songsliked.js
 *
 * @description :: This model contains a collection of all the liked tracks.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',
    attributes: {
        ID: {
            type: 'number',
            autoIncrement: true
        },
        
        IP: {
            type: 'string'
        },
        
        trackID: {
            type: 'number'
        }
    }

};

