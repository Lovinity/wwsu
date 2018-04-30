/**
 * Status.js
 *
 * @description :: Model contains information about the status of certain systems.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    'A': {
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
    'B': {},

    changeStatus: async function (key, theStatus, good = false, label = null) {
        var moment = require('moment');
        if (!(key in Status['A']))
        {
            Status['A'][key] = {label: label || key, status: theStatus, time: moment().toISOString()};
        } else {
            Status['A'][key].status = theStatus;
            if (good)
                Status['A'][key].time = moment().toISOString();
            var changes = await sails.helpers.difference(Status['B'], Status['A']);
            if (Object.keys(changes).length > 0)
                sails.sockets.broadcast('status', 'status', changes);
            Status['B'] = _.cloneDeep(Status['A']);
        }
    }
};

