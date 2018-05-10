/**
 * Discipline.js
 *
 * @description :: Discipline manages bans on website and mobile app users.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        active: {
            type: 'number',
            min: 0,
            max: 1
        },

        IP: {
            type: 'string'
        },

        action: {
            type: 'string'
        },

        message: {
            type: 'string'
        }
    },
};

