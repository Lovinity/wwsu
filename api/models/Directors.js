/* global sails, Directors, Status, Timesheet, moment, needle */

/**
 * Directors.js
 *
 * @description :: A model containing all of the station directors.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    // This model is only a container for temporary data. It should not persist. Use memory instead of SQL.
    datastore: 'timesheets',
    attributes: {
        ID: {
            type: 'number',
            autoIncrement: true
        },

        login: {
            type: 'string',
            required: true
        },

        name: {
            type: 'string',
            required: true
        },

        admin: {
            type: 'boolean',
            defaultsTo: false
        },

        avatar: {// HTML path relative to assets/images/avatars/
            type: 'string',
            defaultsTo: 'default.png'
        },

        position: {
            type: 'string',
            defaultsTo: 'Unknown'
        },

        present: {
            type: 'boolean',
            defaultsTo: false
        },

        since: {
            type: 'ref',
            columnType: 'datetime'
        }
    },

    /**
     * Re-updates director presence
     */
    updateDirectors: function () {
        return new Promise(async (resolve, reject) => {
            sails.log.debug(`updateDirectors called.`);
            var names = {};

            // Determine presence by analyzing timesheet records up to 14 days ago
            var records = await Timesheet.find({
                where: {
                    or: [
                        {time_out: {'>=': moment().subtract(14, 'days').toDate()}},
                        {time_out: null}
                    ]
                },
                sort: 'time_in DESC'});
            if (records.length > 0)
            {
                records.forEach(async function (record) {
                    if (typeof names[record.name] === 'undefined')
                    {
                        names[record.name] = true;
                        // If there's an entry with a null time_out, then consider the director clocked in
                        if (record.time_out === null)
                        {
                            await Directors.update({name: record.name}, {present: true, since: moment(record.time_in).toISOString(true)})
                                    .tolerate((err) => {
                                    })
                                    .fetch();
                        } else {
                            await Directors.update({name: record.name}, {present: false, since: moment(record.time_out).toISOString(true)})
                                    .tolerate((err) => {
                                    })
                                    .fetch();
                        }
                    }
                });
            }
            return resolve();
        });
    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`directors socket: ${data}`);
        sails.sockets.broadcast('directors', 'directors', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.log.silly(`directors socket: ${data}`);
        sails.sockets.broadcast('directors', 'directors', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`directors socket: ${data}`);
        sails.sockets.broadcast('directors', 'directors', data);
        return proceed();
    }
};

