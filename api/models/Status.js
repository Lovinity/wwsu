/**
 * Status.js
 *
 * @description :: Model contains information about the status of certain systems.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    // This model's data is only temporary and should not persist. Use memory instead of SQL.
    datastore: 'memory',
    attributes: {
        
        ID: {
            type: 'number',
            autoIncrement: true
        },

        name: {
            type: 'string'
        },

        label: {
            type: 'string'
        },

        status: {
            type: 'number',
            min: 1,
            max: 5,
            defaultsTo: 4
        },

        time: {
            type: 'ref',
            columnType: 'datetime'
        }
    },

    // API note: Please do not modify any of these variables in any code; use the changeStatus function instead. That way, websocket clients get updates pushed.
    'A': {// Current statuses
        'database': {label: 'Database', status: 1, time: null},
        'display-public': {label: 'Display Public', status: 3, time: null},
        'display-internal': {label: 'Display Internal', status: 3, time: null},
        'website': {label: 'Website', status: 2, time: null},
        'stream-public': {label: 'Radio Stream', status: 2, time: null},
        'stream-remote': {label: 'Remote Stream', status: 4, time: null},
        'silence': {label: 'Audio Level', status: 5, time: null},
        'EAS-internal': {label: 'EAS Internal', status: 3, time: null},
        'openproject': {label: 'OpenProject', status: 2, time: null},
        'server': {label: 'Server', status: 2, time: null}
    },

    /**
     * Change statuses
     * @constructor
     * @param {Array} array - Object containing objects of statuses to change {name: 'key', label: 'friendly name', status: 5}.
     */

    changeStatus: function (array) {
        return new Promise(async (resolve, reject) => {
            var moment = require('moment');
            try {
                var push = [];
                await sails.helpers.asyncForEach(array, function (status, index) {
                    return new Promise(async (resolve2, reject2) => {
                        var criteria = {name: status.name, status: status.status};
                        if (status.status == 5)
                            criteria.time = moment().toISOString();
                        var records = await Status.findOrCreate({name: status.name}, criteria)
                                .intercept((err) => {
                                    return resolve2();
                                });
                        if (records.status == status.status)
                            return resolve2();
                        var records2 = await Status.update({name: status.name}, criteria).fetch()
                                .intercept((err) => {
                                    return reject(err);
                                });
                        push.push(records2[0]);
                        return resolve2();
                    });
                });
                return resolve();
            } catch (e) {
                return reject(e);
            }
        });
    }
};

