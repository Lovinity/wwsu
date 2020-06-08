/**
 * Schedule.js
 *
 * @description :: Schedule for calendar events.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        calendarID: {
            type: 'number',
            required: true
        },

        scheduleID: {
            type: 'number',
            allowNull: true
        },

        overriddenID: {
            type: 'number',
            allowNull: true
        },

        scheduleType: {
            type: 'string',
            isIn: [ 'unscheduled', 'updated', 'canceled', 'updated-system', 'canceled-system' ],
            allowNull: true
        },

        scheduleReason: {
            type: 'string',
            allowNull: true
        },

        originalTime: {
            type: 'ref',
            columnType: 'datetime'
        },

        type: {
            type: 'string',
            isIn: [ 'show', 'sports', 'remote', 'prerecord', 'genre', 'playlist', 'event', 'onair-booking', 'prod-booking', 'office-hours', 'task' ],
            allowNull: true,
        },

        priority: {
            type: 'number',
            allowNull: true
        },

        hostDJ: {
            type: 'number',
            allowNull: true,
        },

        cohostDJ1: {
            type: 'number',
            allowNull: true
        },

        cohostDJ2: {
            type: 'number',
            allowNull: true
        },

        cohostDJ3: {
            type: 'number',
            allowNull: true
        },

        eventID: {
            type: 'number',
            allowNull: true
        },

        playlistID: {
            type: 'number',
            allowNull: true
        },

        director: {
            type: 'number',
            allowNull: true
        },

        hosts: {
            type: 'string',
            allowNull: true
        },

        name: {
            type: 'string',
            allowNull: true
        },

        description: {
            type: 'string',
            allowNull: true
        },

        logo: {
            type: 'string',
            allowNull: true
        },

        banner: {
            type: 'string',
            allowNull: true
        },

        newTime: {
            type: 'ref',
            columnType: 'datetime',
        },

        oneTime: {
            type: 'json'
        },

        startDate: {
            type: 'ref',
            columnType: 'date',
        },

        endDate: {
            type: 'ref',
            columnType: 'date',
        },

        recurDM: {
            type: 'json'
        },

        // 0 = last week of month for the day of week specified, whether 4th or 5th week.
        recurWM: {
            type: 'json'
        },

        recurDW: {
            type: 'json'
        },

        recurH: {
            type: 'json'
        },

        recurM: {
            type: 'number',
            allowNull: true,
            min: 0,
            max: 59
        },

        recurEvery: {
            type: 'number',
            min: 1,
            defaultsTo: 1
        },

        duration: {
            type: 'number',
            min: 0,
            max: (60 * 24),
            allowNull: true
        }

    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = { insert: newlyCreatedRecord }
        sails.models.calendar.calendardb.query('schedule', data);
        sails.log.silly(`schedule socket: ${data}`)
        sails.sockets.broadcast('schedule', 'schedule', data)
        var temp;

        // Process notifications
        temp = (async (event) => {
            if ((event.scheduleType === 'updated' || event.scheduleType === 'updated-system') && event.newTime !== null) {
                var _event = sails.models.calendar.calendardb.scheduleToEvent(event);
                await sails.helpers.onesignal.sendEvent(_event, false, false);
                await sails.helpers.emails.queueEvent(_event, false, false);
            }

            if ((event.scheduleType === 'canceled' || event.scheduleType === 'canceled-system')) {
                var _event = sails.models.calendar.calendardb.scheduleToEvent(event);
                await sails.helpers.onesignal.sendEvent(_event, false, false);
                await sails.helpers.emails.queueEvent(_event, false, false);

                // Create cancellation logs
                if ([ 'show', 'remote', 'sports', 'prerecord', 'genre', 'playlist' ].indexOf(_event.type) !== -1) {
                    sails.models.attendance.findOrCreate({ unique: _event.unique }, { calendarID: _event.calendarID, unique: _event.unique, dj: _event.hostDJ, cohostDJ1: _event.cohostDJ1, cohostDJ2: _event.cohostDJ2, cohostDJ3: _event.cohostDJ3, happened: -1, event: `${_event.type}: ${_event.hosts} - ${_event.name}`, scheduledStart: moment(_event.start).toISOString(true), scheduledEnd: moment(_event.end).toISOString(true), actualStart: null, actualEnd: null })
                        .exec(async (err, created, wasCreated) => {
                            if (err || created.happened === 1) return;

                            if (!wasCreated)
                                await sails.models.attendance.updateOne({ ID: created.ID }, { happened: -1 });

                            await sails.models.logs.create({ attendanceID: created.ID, logtype: 'cancellation', loglevel: 'warning', logsubtype: `${_event.hosts} - ${_event.name}`, logIcon: sails.models.calendar.calendardb.getIconClass(_event), title: `The event was marked canceled.`, event: `${_event.type}: ${_event.hosts} - ${_event.name} was canceled for ${moment(_event.start).format("LLLL")}.`, createdAt: moment().toISOString(true) }).fetch()
                                .tolerate((err) => {
                                    sails.log.error(err)
                                })
                        });
                } else if (_event.type === 'office-hours') {
                    sails.models.timesheet.findOrCreate({ unique: _event.unique }, { calendarID: _event.calendarID, unique: _event.unique, name: _event.hosts, approved: -1, scheduledIn: moment(_event.start).toISOString(true), scheduledOut: moment(_event.end).toISOString(true) })
                        .exec(async (err, created, wasCreated) => {
                            if (err || created.approved === 1) { return false }

                            if (!wasCreated)
                                await sails.models.timesheet.updateOne({ ID: created.ID }, { approved: -1 });

                            await sails.models.logs.create({ attendanceID: null, logtype: 'director-cancellation', loglevel: 'info', logsubtype: _event.hosts, logIcon: `fas fa-user-times`, title: `A director cancelled their office hours!`, event: `Director: ${_event.hosts}<br />Scheduled time: ${moment(_event.start).format('llll')} - ${moment(_event.end).format('llll')}`, createdAt: moment().toISOString(true) }).fetch()
                                .tolerate((err) => {
                                    sails.log.error(err)
                                })
                        });
                }
            }
        })(newlyCreatedRecord);

        return proceed()
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = { update: updatedRecord }
        sails.models.calendar.calendardb.query('schedule', data);
        sails.log.silly(`schedule socket: ${data}`)
        sails.sockets.broadcast('schedule', 'schedule', data)
        var temp;

        // API note: updated/canceled schedule.type records should NEVER be updated; delete the old one and create a new one.

        // Process notifications
        temp = (async (event) => {
            if ((event.scheduleType === 'updated' || event.scheduleType === 'updated-system') && (event.newTime !== null || event.duration !== null)) {
                var _event = sails.models.calendar.calendardb.scheduleToEvent(event);
                await sails.helpers.onesignal.sendEvent(_event, false, false);
                await sails.helpers.emails.queueEvent(_event, false, false);
            }

            if ((event.scheduleType === 'canceled' || event.scheduleType === 'canceled-system')) {
                var _event = sails.models.calendar.calendardb.scheduleToEvent(event);
                await sails.helpers.onesignal.sendEvent(_event, false, false);
                await sails.helpers.emails.queueEvent(_event, false, false);

                // Create cancellation logs
                if ([ 'show', 'remote', 'sports', 'prerecord', 'genre', 'playlist' ].indexOf(_event.type) !== -1) {
                    sails.models.attendance.findOrCreate({ unique: _event.unique }, { calendarID: _event.calendarID, unique: _event.unique, dj: _event.hostDJ, cohostDJ1: _event.cohostDJ1, cohostDJ2: _event.cohostDJ2, cohostDJ3: _event.cohostDJ3, happened: -1, event: `${_event.type}: ${_event.hosts} - ${_event.name}`, scheduledStart: moment(_event.start).toISOString(true), scheduledEnd: moment(_event.end).toISOString(true), actualStart: null, actualEnd: null })
                        .exec(async (err, created, wasCreated) => {
                            if (err || created.happened === 1) return;

                            if (!wasCreated)
                                await sails.models.attendance.updateOne({ ID: created.ID }, { happened: -1 });

                            await sails.models.logs.create({ attendanceID: created.ID, logtype: 'cancellation', loglevel: 'warning', logsubtype: `${_event.hosts} - ${_event.name}`, logIcon: sails.models.calendar.calendardb.getIconClass(_event), title: `The event was marked canceled.`, event: `${_event.type}: ${_event.hosts} - ${_event.name} was canceled for ${moment(_event.start).format("LLLL")}.`, createdAt: moment().toISOString(true) }).fetch()
                                .tolerate((err) => {
                                    sails.log.error(err)
                                })
                        });
                } else if (_event.type === 'office-hours') {
                    sails.models.timesheet.findOrCreate({ unique: _event.unique }, { calendarID: _event.calendarID, unique: _event.unique, name: _event.hosts, approved: -1, scheduledIn: moment(_event.start).toISOString(true), scheduledOut: moment(_event.end).toISOString(true) })
                        .exec(async (err, created, wasCreated) => {
                            if (err || created.approved === 1) { return false }

                            if (!wasCreated)
                                await sails.models.timesheet.updateOne({ ID: created.ID }, { approved: -1 });

                            await sails.models.logs.create({ attendanceID: null, logtype: 'director-cancellation', loglevel: 'info', logsubtype: _event.hosts, logIcon: `fas fa-user-times`, title: `A director cancelled their office hours!`, event: `Director: ${_event.hosts}<br />Scheduled time: ${moment(_event.start).format('llll')} - ${moment(_event.end).format('llll')}`, createdAt: moment().toISOString(true) }).fetch()
                                .tolerate((err) => {
                                    sails.log.error(err)
                                })
                        });
                }
            }
        })(updatedRecord);

        return proceed()
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = { remove: destroyedRecord.ID }
        sails.models.calendar.calendardb.query('schedule', data);
        sails.log.silly(`schedule socket: ${data}`)
        sails.sockets.broadcast('schedule', 'schedule', data)
        var temp;

        // Process notifications
        temp = (async (event) => {
            if ((event.scheduleType === 'updated' || event.scheduleType === 'updated-system') && (event.newTime !== null || event.duration !== null)) {
                var _event = sails.models.calendar.calendardb.scheduleToEvent(event);
                await sails.helpers.onesignal.sendEvent(_event, false, false, true);
                await sails.helpers.emails.queueEvent(_event, false, false, true);
            }

            if ((event.scheduleType === 'canceled' || event.scheduleType === 'canceled-system')) {
                var _event = sails.models.calendar.calendardb.scheduleToEvent(event);
                await sails.helpers.onesignal.sendEvent(_event, false, false, true);
                await sails.helpers.emails.queueEvent(_event, false, false, true);

                // Destroy cancellation records (but only if the main calendar event is still active)
                if (_event.active) {
                    if ([ 'show', 'remote', 'sports', 'prerecord', 'genre', 'playlist' ].indexOf(_event.type) !== -1) {
                        var destroyed = await sails.models.attendance.destroy({ unique: _event.unique, happened: -1 }).fetch();
                        if (destroyed && destroyed.length > 0) {
                            var IDs = destroyed.map((record) => record.ID);
                            await sails.models.logs.destroy({ attendanceID: IDs }).fetch();
                        }
                    } else if (_event.type === 'office-hours') {
                        await sails.models.timesheet.destroy({ unique: _event.unique, approved: -1 }).fetch();
                        await sails.models.logs.destroy({ logtype: `director-cancellation`, event: `Director: ${_event.hosts}<br />Scheduled time: ${moment(_event.start).format('llll')} - ${moment(_event.end).format('llll')}` }).fetch();
                    }
                }
            }

            // Remove any schedules that were created as an override for the deleted schedule.
            //await sails.models.schedule.destroy({ overriddenID: event.ID }).fetch();

            // Remove any schedules that were created to override this schedule
            //await sails.models.schedule.destroy({ scheduleID: event.ID }).fetch();

            // Remove any clockwheels created for this schedule
            await sails.models.clockwheels.destroy({ scheduleID: event.ID }).fetch();

        })(destroyedRecord);

        return proceed();
    }

}