/* global sails, Tasks, _ */

/**
 * Tasks.js
 *
 * @description :: This model contains in memory the open tasks from OpenProject.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    // Do not persist the data, as this is only a collection held in memory.
    datastore: 'memory',
    attributes: {
        ID: {
            type: 'number',
            autoIncrement: true
        },
        unique: {
            type: 'number'
        },
        subject: {
            type: 'string',
            defaultsTo: ''
        },
        category: {
            type: 'string',
            defaultsTo: 'Unknown'
        },
        project: {
            type: 'string',
            defaultsTo: 'Unknown'
        },
        type: {
            type: 'string',
            defaultsTo: 'Unknown'
        },
        priority: {
            type: 'string',
            defaultsTo: 'Unknown'
        },
        status: {
            type: 'string',
            defaultsTo: 'Unknown'
        },
        start: {
            type: 'string',
        },
        due: {
            type: 'string',
        },
        percent: {
            type: 'number',
            min: 0,
            max: 100,
            defaultsTo: 0
        },
        assignee: {
            type: 'string',
            defaultsTo: 'Unknown'
        },
        responsible: {
            type: 'string',
            defaultsTo: 'Unknown'
        }
    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`tasks socket: ${data}`);
        sails.sockets.broadcast('tasks', 'tasks', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.log.silly(`tasks socket: ${data}`);
        sails.sockets.broadcast('tasks', 'tasks', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`tasks socket: ${data}`);
        sails.sockets.broadcast('tasks', 'tasks', data);
        return proceed();
    },

    // Update the tasks by pulling from the OpenProject API
    updateTasks: function () {
        return new Promise(async (resolve, reject) => {
            sails.log.debug(`Tasks.update called.`);
            var needle = require("needle");

            // Get the tasks from OpenProject
            needle('get', sails.config.custom.pm.host + sails.config.custom.pm.path + 'work_packages', {headers: {Authorization: 'Basic ' + sails.config.custom.pm.auth, 'Content-Type': 'application/json'}})
                    .then(async function (resp) {
                        try {
                            resp.body = JSON.parse(resp.body.toString());
                            sails.log.silly(`OpenProject response`);
                            sails.log.silly(resp.body);

                            var elements = resp.body._embedded.elements;
                            var tasks = []; // Push task IDs into this array so we can detect deleted tasks

                            // Iterate over each task
                            await sails.helpers.asyncForEach(elements, function (element, index) {
                                return new Promise(async (resolve2, reject2) => {
                                    try {
                                        // Prepare task information
                                        tasks.push(element.id);
                                        var criteria = {
                                            unique: element.id,
                                            subject: element.subject || 'Unknown',
                                            category: element._links.category.title || 'Unknown',
                                            project: element._links.project.title || 'Unknown',
                                            type: element._links.type.title || 'Unknown',
                                            priority: element._links.priority.title || 'Unknown',
                                            status: element._links.status.title || 'Unknown',
                                            start: element.startDate,
                                            due: element.dueDate,
                                            percent: element.percentageDone,
                                            assignee: element._links.assignee.title || 'Unknown',
                                            responsible: element._links.responsible.title || 'Unknown'
                                        };

                                        // SAILS BUG WORKAROUND
                                        var criteriaB = _.cloneDeep(criteria);

                                        var record = await Tasks.findOrCreate({unique: criteriaB.unique}, criteriaB)
                                                .intercept((err) => {
                                                    // No error throw, just skip this task
                                                    return resolve2(false);
                                                });
                                        sails.log.silly(`Task returned:`);
                                        sails.log.silly(record);

                                        // Detect any changes in the task. If a change is detected, we will do a database update.
                                        var updateIt = false;
                                        for (var key in criteria)
                                        {
                                            if (criteria.hasOwnProperty(key))
                                            {
                                                if (criteria[key] !== record[key])
                                                {
                                                    updateIt = true;
                                                }
                                            }
                                        }

                                        if (updateIt)
                                        {
                                            await Tasks.update({unique: criteria.unique}, criteria).fetch()
                                                    .intercept((err) => {
                                                        // No error throw, just skip this task
                                                        return resolve2(false);
                                                    });
                                        }

                                        // Delete tasks that no longer exist
                                        var removed = await Tasks.destroy({unique: {'!=': tasks}})
                                                .intercept((err) => {
                                                    return resolve2(false);
                                                })
                                                .fetch();

                                        sails.log.silly(`Deleted tasks:`);
                                        sails.log.silly(removed);

                                        return resolve2(false);

                                    } catch (e) {
                                        // Don't throw an error, just skip this task
                                        return resolve2(false);
                                    }

                                });
                            });
                            return resolve();
                        } catch (e) {
                            return reject(e);
                        }
                    })
                    .catch(function (err) {
                        return reject(err);
                    });
        });
    }

};

