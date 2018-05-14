/**
 * Directors.js
 *
 * @description :: A model containing all of the station directors.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    // This model is only a container for temporary data. It should not persist. Use memory instead of SQL.
    datastore: 'memory',
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
            columnType: 'datetime',
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
            var moment = require('moment');
            var needle = require('needle');
            var directorNames = [];
            // Get users from OpenProject via API
            var req = {
                headers: {
                    Authorization: 'Basic ' + sails.config.custom.pmAuth,
                    'Content-Type': 'application/json'
                }
            };
            needle('get', sails.config.custom.pmHost + sails.config.custom.pmPath + 'users', {}, req)
                    .then(async function (resp) {
                        // Because this code is used twice, condense it into a variable
                        var endFunction = async function () {
                            // Remove directors which no longer exist in OpenProject
                            var deleted = await Directors.destroy({name: {'!=': directorNames}}).fetch()
                                    .intercept((err) => {
                                        return reject(err);
                                    });
                            deleted.forEach(function (director, index) {
                                sails.sockets.broadcast('directors', 'directors-remove', director.name);
                            });
                            Status.changeStatus([{name: `openproject`, status: 5, label: `OpenProject`}]);
                            Directors.directorKeys = Object.keys(Directors.directors).length;
                            return resolve();
                        }
                        var body = resp.body;
                        if (!body)
                        {
                            return resolve();
                        }
                        try {
                            body = JSON.parse(body);
                            var stuff = body._embedded.elements;
                            if (forced || Object.keys(Directors.directors).length != Directors.directorKeys)
                                Directors.directors = {};
                            stuff.forEach(function (director) {
                                // Skip non-active or non-invited users
                                if (director.status == 'active' || director.status == 'invited')
                                {
                                    directorNames.push(director.name);
                                    // If user does not exist in the database, create it
                                    if (typeof Directors.directors[director.login] == 'undefined')
                                    {
                                        Directors.directors[director.login] = director;
                                    }
                                    Directors.findOrCreate({name: director.name}, {login: director.login, name: director.name, position: '', present: false, since: moment().toISOString()})
                                            .exec((err, user, wasCreated) => {
                                                if (!err && wasCreated)
                                                {
                                                    sails.sockets.broadcast('directors', 'directors', [user]);
                                                }
                                            });
                                }
                            });
                            // If there was a change in the number of users, or we are forcing a reload, then reload all directors' presence.
                            if (forced || Object.keys(Directors.directors).length != Directors.directorKeys)
                            {
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
                                        .intercept((err) => {
                                            return reject(err);
                                        });
                                if (records)
                                {
                                    records.forEach(async function (record) {
                                        if (typeof names[record.name] == 'undefined')
                                        {
                                            names[record.name] = true; // This director is to be listed
                                            // If there's an entry with a null time_out, then consider the director clocked in
                                            var record = null;
                                            if (record.time_out === null)
                                            {
                                                record = await Directors.update({name: record.name}, {present: true, since: record.time_in.toISOString()}).fetch();
                                            } else {
                                                record = await Directors.update({name: record.name}, {present: false, since: record.time_out.toISOString()}).fetch();
                                            }
                                            sails.sockets.broadcast('directors', 'directors', record);
                                        }
                                    });
                                }
                                endFunction();
                            } else {
                                endFunction();
                            }
                        } catch (e) {
                            sails.log.error(e);
                            return resolve();
                        }
                    });
        });
    },
};

