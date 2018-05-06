/**
 * Timesheet.js
 *
 * @description :: Timesheet manages all the internal clock ins and clock outs of WWSU directors.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

// WORK ON THIS
module.exports = {
    datastore: 'timesheet',
    attributes: {
        ID: {
            type: 'number',
            autoIncrement: true
        },

        name: {
            type: 'string'
        },

        time_in: {
            type: 'ref',
            columnType: 'datetime'
        },

        time_out: {
            type: 'ref',
            columnType: 'datetime'
        },
        
        approved: {
            type: 'number',
            max: 1,
            min: 0
        },

    }

};

