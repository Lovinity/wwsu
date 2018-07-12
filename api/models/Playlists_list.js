/**
 * Playlists_list.js
 *
 * @description :: A list of tracks mapped to playlists.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
datastore: 'radiodj',
    attributes: {
        ID: {
            type: 'number',
            autoIncrement: true
        },

        pID: {
            type: 'number'
        },
        sID: {
            type: 'number'
        },
        cstart: {
            type: 'number'
        },
        cnext: {
            type: 'number'
        },
        cend: {
            type: 'number'
        },
        fin: {
            type: 'number'
        },
        fout: {
            type: 'number'
        },
        swID: {
            type: 'number'
        },
        swplay: {
            type: 'number'
        },
        vtID: {
            type: 'number'
        },
        vtplay: {
            type: 'number'
        },
        swfirst: {
            type: 'string'
        },
        ord: {
            type: 'number'
        }

    }

};

