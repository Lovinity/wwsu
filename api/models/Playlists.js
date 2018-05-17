/**
 * Playlists.js
 *
 * @description :: Container for RadioDJ Playlists. Also contains playlist functions.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
var moment = require("moment");
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
    active: {name: null, ID: 0, position: 0, tracks: [], end: null},
    played: moment('2000-01-01').toDate(),
    queuing: false
};

