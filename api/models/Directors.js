/* global sails, Directors, Status, Timesheet, moment, needle */

/**
 * Directors.js
 *
 * @description :: A model containing all of the station directors.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    // This model is only a container for temporary data. It should not persist. Use memory instead of SQL.
    datastore: 'ram',
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
    directors: {}, // Object of OpenProject director users
    directorKeys: 0, // Number of directors in memory

    /**
     * Re-updates directors in database from OpenProject
     * @constructor
     * @param {boolean} forced - true if we are to re-determine the presence of all directors from the Timesheet database
     */
    updateDirectors: function (forced = false) {
        return new Promise(async (resolve, reject) => {
            sails.log.debug(`updateDirectors called.`);
            var directorNames = [];
            // Get users from OpenProject via API
            var req = {
                headers: {
                    Authorization: 'Basic ' + sails.config.custom.pm.auth,
                    'Content-Type': 'application/json'
                }
            };
            try {
                needle('get', sails.config.custom.pm.host + sails.config.custom.pm.path + 'users', {}, req)
                        .then(async function (resp) {
                            // Because this code is used twice, condense it into a variable
                            var endFunction = async function () {
                                sails.log.verbose(`endFunction called.`);

                                // Remove directors which no longer exist in OpenProject
                                var removed = await Directors.destroy({name: {'!=': directorNames}})
                                        .tolerate((err) => {
                                            return reject(err);
                                        })
                                        .fetch();

                                sails.log.verbose(`Removed ${removed.length} directors.`);
                                sails.log.silly(removed);

                                // Remove deleted directors from memory
                                removed.forEach(function (record) {
                                    delete Directors.directors[record.login];
                                });

                                Directors.directorKeys = Object.keys(Directors.directors).length;
                                return resolve();
                            };
                            var body = resp.body;
                            if (!body)
                            {
                                Status.changeStatus([{name: `openproject`, status: 2, data: 'OpenProject API did not return any data.', label: `OpenProject`}]);
                                return resolve();
                            }
                            try {
                                body = JSON.parse(body);
                                var stuff = body._embedded.elements;
                                sails.log.silly(stuff);
                                if (forced || Object.keys(Directors.directors).length !== Directors.directorKeys)
                                    Directors.directors = {};
                                stuff.forEach(function (director) {
                                    // Skip non-active or non-invited users
                                    if (director.status === 'active' || director.status === 'invited')
                                    {
                                        directorNames.push(director.name);

                                        // If user does not exist in the database, create it
                                        if (typeof Directors.directors[director.login] === 'undefined')
                                        {
                                            Directors.directors[director.login] = director;
                                        }

                                        Directors.findOrCreate({name: director.name}, {login: director.login, name: director.name, admin: director.admin, position: '', present: false, since: moment().toISOString()})
                                                .exec((err, user, wasCreated) => {

                                                    // Update director if anything changed.
                                                    if (!wasCreated && (director.login !== user.login || director.name !== user.name || director.admin !== user.admin || director.position !== user.position))
                                                    {
                                                        Directors.update({name: director.name}, {login: director.login, name: director.name, admin: director.admin, position: ''}).fetch().exec(function (err2, user2) {});
                                                    }
                                                });
                                    }
                                });

                                // If there was a change in the number of users, or we are forcing a reload, then reload all directors' presence.
                                if (forced || Object.keys(Directors.directors).length !== Directors.directorKeys)
                                {
                                    sails.log.verbose(`Re-calculating directors and presence.`);
                                    var names = {};
                                    // Determine presence by analyzing timesheet records up to 14 days ago
                                    var records = await Timesheet.find({
                                        where: {
                                            name: directorNames,
                                            or: [
                                                {time_out: {'>=': moment().subtract(14, 'days').toDate()}},
                                                {time_out: null}
                                            ]
                                        },
                                        sort: 'time_in DESC'})
                                            .tolerate((err) => {
                                                Status.changeStatus([{name: `openproject`, status: 3, data: 'Error with Timesheet.', label: `OpenProject`}]);
                                                return reject(err);
                                            });
                                    if (records)
                                    {
                                        records.forEach(async function (record) {
                                            if (typeof names[record.name] === 'undefined')
                                            {
                                                names[record.name] = true; // This director is to be listed
                                                // If there's an entry with a null time_out, then consider the director clocked in
                                                var record = null;
                                                if (record.time_out === null)
                                                {
                                                    record = await Directors.update({name: record.name}, {present: true, since: record.time_in.toISOString()})
                                                            .tolerate((err) => {
                                                            })
                                                            .fetch();
                                                } else {
                                                    record = await Directors.update({name: record.name}, {present: false, since: record.time_out.toISOString()})
                                                            .tolerate((err) => {
                                                            })
                                                            .fetch();
                                                }
                                            }
                                        });
                                    }
                                    // Report OpenProject as good, since parsing of API response has happened earlier.
                                    Status.changeStatus([{name: `openproject`, status: 5, data: 'OpenProject API is operational.', label: `OpenProject`}]);
                                    endFunction();
                                } else {
                                    // Report OpenProject as good, since parsing of API response has happened earlier.
                                    Status.changeStatus([{name: `openproject`, status: 5, data: 'OpenProject API is operational.', label: `OpenProject`}]);
                                    endFunction();
                                }
                            } catch (e) {
                                Status.changeStatus([{name: `openproject`, status: 2, data: 'Encountered an error with loading directors. Please check OpenProject.', label: `OpenProject`}]);
                                sails.log.error(e);
                                return resolve();
                            }
                        })
                        .catch(function (err) {
                            return reject(err);
                        });
            } catch (e) {
                return reject(e);
            }
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

