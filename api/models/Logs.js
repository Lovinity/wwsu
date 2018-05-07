/**
 * Logs.js
 *
 * @description :: Operation logs are stored here
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'nodebase',
   attributes: {
        ID: {
            type: 'number',
            autoIncrement: true
        },

        logtype: {
            type: 'string'
        },
        loglevel: {
            type: 'string'
        },

        logsubtype: {
            type: 'string',
            allowNull: true,
            defaultsTo: null
        },

        event: {
            type: 'string'
        },

        trackArtist: {
            type: 'string',
            allowNull: true,
            defaultsTo: null
        },

        trackTitle: {
            type: 'string',
            allowNull: true,
            defaultsTo: null
        },

        trackAlbum: {
            type: 'string',
            allowNull: true,
            defaultsTo: null
        },

        trackLabel: {
            type: 'string',
            allowNull: true,
            defaultsTo: null
        }
    }
};

