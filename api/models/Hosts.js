/**
 * Hosts.js
 *
 * @description :: Hosts contains the computers that use DJ Controls, their friendly name, and which kinds of messages they should receive.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        host: {
            type: 'string',
            required: true
        },

        friendlyname: {
            type: 'string'
        },

        requests: {
            type: 'boolean',
            defaultsTo: true
        },

        emergencies: {
            type: 'boolean',
            defaultsTo: false
        },

        webmessages: {
            type: 'boolean',
            defaultsTo: true
        }

    }

};

