
/**
 * Playlists.js
 *
 * @description :: Container for RadioDJ Playlists. Also contains playlist functions.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
module.exports = {
    datastore: 'radiodj',
    attributes: {
        ID: {
            type: 'number',
            autoIncrement: true
        },
        name: {
            type: 'string'
        }
    },
    active: {tracks: []},
    queuing: false
};

