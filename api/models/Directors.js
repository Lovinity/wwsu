/**
 * Directors.js
 *
 * @description :: A model containing all of the station directors.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    directors: {},
    directorKeys: 0,
    presence: {},
    presenceB: {},
    loadDirectors: async function (forced) {
        var moment = require('moment');
        var request = require('request');
        var directorNames = [];
        var req = {
            uri: Statesystem.pmHost + Statesystem.pmPath + 'users',
            method: 'GET',
            headers: {
                Authorization: 'Basic ' + Statesystem.pmAuth,
                'Content-Type': 'application/json'
            }
        };
        request(req, function (err, response, body) {
            if (err || !body)
            {
                cb();
                sails.log.error(err);
                return Directors.presence;
            }
            try {
                body = JSON.parse(body);
                var stuff = body._embedded.elements;
                if (forced || Object.keys(Directors.directors).length != Directors.directorKeys)
                    Directors.directors = {};
                stuff.forEach(function (director) {
                    if (director.status == 'active' || director.status == 'invited')
                    {
                        directorNames.push(director.name);
                        if (typeof Directors.directors[director.login] == 'undefined')
                        {
                            Directors.directors[director.login] = director;
                            if (typeof Directors.presence[director.name] == 'undefined')
                                Directors.presence[director.name] = {position: '', present: false, since: null};
                        }
                    }
                });
                if (forced || Object.keys(Directors.directors).length != Directors.directorKeys)
                {
                    var names = {};
                    Timesheet.find({
                        where: {
                            name: directorNames,
                            or: [
                                {time_out: {'>=': moment().subtract(14, 'days').toDate()}},
                                {time_out: null}
                            ]
                        },
                        sort: 'time_in DESC'}).exec(function (err2, records) {
                        if (err2)
                        {
                            cb();
                            sails.log.error(err2);
                            return Directors.presence;
                        }
                        records.forEach(function (record) {
                            if (typeof names[record.name] == 'undefined')
                            {
                                names[record.name] = true;
                                if (record.time_out === null)
                                {
                                    Directors.presence[record.name] = {position: '', present: true, since: record.time_in.toISOString()};
                                } else {
                                    Directors.presence[record.name] = {position: '', present: false, since: record.time_out.toISOString()};
                                }
                            }
                        });
                        for (var key in Directors.presence)
                        {
                            if (Directors.presence.hasOwnProperty(key))
                            {
                                if (directorNames.indexOf(key) <= -1)
                                    delete Directors.presence[key];
                            }
                        }
                        cb();
                        Directors.directorKeys = Object.keys(Directors.directors).length;
                        var changes = difference(Directors.presenceB, Directors.presence);
                        if (Object.keys(changes).length > 0)
                            sails.sockets.broadcast('directors', 'directors', changes);
                        Directors.presenceB = _.cloneDeep(Directors.presence);
                        return Directors.presence;
                    });
                } else {
                    for (var key in Directors.presence)
                    {
                        if (Directors.presence.hasOwnProperty(key))
                        {
                            if (directorNames.indexOf(key) <= -1)
                                delete Directors.presence[key];
                        }
                    }
                    cb();
                    Statesystem.changeStatus(`openproject`, 5, true, `OpenProject`);
                    Directors.directorKeys = Object.keys(Directors.directors).length;
                    var changes = difference(Directors.presenceB, Directors.presence);
                    if (Object.keys(changes).length > 0)
                        sails.sockets.broadcast('directors', 'directors', changes);
                    Directors.presenceB = _.cloneDeep(Directors.presence);
                    return Directors.presence;
                }
            } catch (e) {
                cb();
                sails.log.error(e);
                return Directors.presence;
            }
        });
    },
};

