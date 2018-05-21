/**
 * Genre.js
 *
 * @description :: Container of genres in RadioDJ.
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
            type: 'string',
            maxLength: 50
        }

    },
    
    active: null, // Used for keeping track of genre rotations so that Node doesn't keep re-triggering rotation changes in RadioDJ.

};

