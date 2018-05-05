/**
 * Status.js
 *
 * @description :: Model contains information about the status of certain systems.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'memory',
    attributes: {
        ID: {
            type: 'number',
            autoIncrement: true
        },

        name: {
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
     * Change the status of a subsystem
     * @constructor
     * @param {string} name - The name of the subsystem to change
     * @param {number} theStatus - A number representing the new status of the subsystem.
     * @param {boolean} good - Set to true if we are reporting that the subsystem is in good standing.
     */

    changeStatus: function (name, theStatus, good = false) {
        return new Promise(async (resolve, reject) => {
            var moment = require('moment');
            try {
                var criteria = {name: name, status: theStatus};
                if (good)
                    criteria.time = moment().toISOString()
                var records = await Status.findOrCreate({name: name}, criteria)
                        .intercept((err) => {
                            sails.log.error(err);
                            reject();
                        });
                if (records.status == theStatus)
                    resolve();
                var records2 = await Status.update({name: name}, criteria).fetch()
                        .intercept((err) => {
                            sails.log.error(err);
                            reject();
                        });
                sails.sockets.broadcast('status', 'status', records2);
                resolve();
            } catch (e) {
                sails.log.error(e);
                reject();
            }
        });
    }
};

