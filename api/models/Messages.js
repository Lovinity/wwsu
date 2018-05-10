/**
 * Messages.js
 *
 * @description :: Messages is a collection of all the messages sent through the DJ Controls messaging system.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        status: {
            type: 'string',
            defaultsTo: 'active'
        },

        from: {
            type: 'string'
        },

        from_friendly: {
            type: 'string'
        },
        from_IP: {
            type: 'string',
            defaultsTo: 'Not Specified'
        },
        to: {
            type: 'string'
        },

        to_friendly: {
            type: 'string'
        },

        message: {
            type: 'string'
        },

    },

    visitors: {}, // Used to track which people are online for messaging

};

