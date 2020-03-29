// Require libraries if necessary. Because this script runs both in browser and in node, we need to cover both methods of including scripts.

// Node require
if (typeof require !== 'undefined') {
    if (typeof TAFFY === 'undefined') {
        var TAFFY = require('../../taffy/js/taffy-min.js').taffy;
    }

    if (typeof WWSUdb === 'undefined') {
        var WWSUdb = require('../../wwsu-sails/js/wwsu.js').WWSUdb;
    }

    if (typeof WWSUqueue === 'undefined') {
        var WWSUqueue = require('../../wwsu-sails/js/wwsu.js').WWSUqueue;
    }

    if (typeof later === 'undefined') {
        var later = require('later');
    }

    if (typeof moment === 'undefined') {
        var moment = require('moment');
    }

    // JQuery custom implementation with AJAX
} else if (typeof $ !== 'undefined' && typeof JQuery !== 'undefined') {

    // Jquery loadscript replacement for require for in-browser use
    jQuery.loadScript = function (url) {
        jQuery.ajax({
            url: url,
            dataType: 'script',
            async: false
        });
    }

    if (typeof TAFFY === 'undefined') {
        $.loadScript('../../taffy/js/taffy-min.js');
    }

    if (typeof WWSUdb === 'undefined' || typeof WWSUqueue === 'undefined') {
        $.loadScript('../../wwsu-sails/js/wwsu.js');
    }

    if (typeof later === 'undefined') {
        $.loadScript('../../later/js/later.min.js');
    }

    if (typeof moment === 'undefined') {
        $.loadScript('../../moment/moment.min.js');
    }
} else if (typeof TAFFY === 'undefined' || typeof WWSUdb === 'undefined' || typeof WWSUqueue === 'undefined' || typeof later === 'undefined' || typeof moment === 'undefined') {
    console.error(new Error('wwsu-calendar requires TAFFY, WWSUdb, WWSUqueue, later, and moment. However, neither node.js require() nor JQuery were available to require the scripts.'));
}

if (typeof TAFFY === 'undefined' || typeof WWSUdb === 'undefined' || typeof WWSUqueue === 'undefined' || typeof later === 'undefined' || typeof moment === 'undefined') {
    console.error(new Error('wwsu-calendar requires TAFFY, WWSUdb, WWSUqueue, later, and moment. However, neither node.js require() nor JQuery were available to require the scripts.'));
}

// Use local time instead of UTC for scheduling
later.date.localTime()

// Class to manage calendar events for WWSU
class CalendarDb {

    /**
     * Construct the calendar database
     * 
     * @param {array} calendar Array of calendar entries to initialize with.
     * @param {array} schedule Array of schedule entries to initialize with.
     */
    constructor(calendar = [], schedule = []) {
        this.calendar = new WWSUdb(TAFFY());
        this.schedule = new WWSUdb(TAFFY());
        this.calendar.db.insert(calendar);
        this.schedule.db.insert(schedule);

        this.queue = new WWSUqueue();
    }

    /**
     * Change data in the database via WWSUdb query.
     * 
     * @param {string} db Database to query: either calendar or schedule.
     * @param {object|array} data Array of records to replace with if replace is true, otherwise WWSU standard query object.
     * @param {boolean} replace Replace all data in the database with what was provided in data.
     */
    query (db, data, replace = false) {
        switch (db) {
            case 'calendar':
                this.calendar.query(data, replace);
                break;
            case 'schedule':
                this.schedule.query(data, replace);
                break;
        }
    }

    /**
     * Get an array of upcoming events taking place within the provided parameters. It's recommended to set a start date 1 day earlier.
     * 
     * @param {?function} callback If provided, will be processed in an event queue and fire this callback when done. If not provided, function will process without event queue and return events.
     * @param {string} start ISO String of the earliest date/time allowed for an event's start time
     * @param {string} end ISO string of the latest date/time allowed for an event's end time
     * @param {object} query Filter results by the provided TAFFY query
     * @param {WWSUdb} calendardb If provided, will use the calendardb provided. Otherwise, will use the CalendarDb one.
     * @param {WWSUdb} scheduledb If provided, will use the scheduledb provided. Otherwise, will use the CalendarDb one.
     * @param {function} progressCallback Function fired after every task. Contains two number paramaters: Number of tasks completed, and total number of tasks.
     * @returns {?array} If callback not provided, function will return events.
     */
    getEvents (callback = null, start = moment().subtract(1, 'days').toISOString(true), end = moment().add(1, 'days').toISOString(true), query = {}, calendardb = this.calendar, scheduledb = this.schedule, progressCallback = () => { }) {
        // Event loop
        var tasks = 0;
        var tasksCompleted = 0;

        var events = [];

        // Extension of this.processRecord to also determine if the event falls within the start and end times.
        var _processRecord = (calendar, schedule, eventStart) => {
            var criteria = this.processRecord(calendar, schedule, eventStart);

            // This event is within our time range if one or more of the following is true:
            // A. Calendar event start is same or before generated event start.
            // B. Calendar event end is same or after generated event start.
            // C. The event end time is after start, and the event start time is same or before end.
            if ((moment(criteria.startDate).isAfter(moment(criteria.start))) || (!criteria.endDate || moment(criteria.endDate).isBefore(moment(criteria.start)))) {

            } else {
                if ((moment(criteria.end).isAfter(moment(start)) && moment(criteria.start).isSameOrBefore(moment(end)))) {
                    events.push(criteria);
                }
            }
        }

        // Define a sort function for schedule types that prioritizes certain types above others in the event of multiple overrides.
        var scheduleCompare = (a, b) => {
            if (a.scheduleType === 'canceled' && b.scheduleType !== 'canceled') return -1;
            if (b.scheduleType === 'canceled' && a.scheduleType !== 'canceled') return 1;
            if (a.scheduleType === 'canceled-system' && b.scheduleType !== 'canceled-system') return -1;
            if (b.scheduleType === 'canceled-system' && a.scheduleType !== 'canceled-system') return 1;
            if (a.scheduleType === 'updated-system' && b.scheduleType !== 'updated-system') return -1;
            if (b.scheduleType === 'updated-system' && a.scheduleType !== 'updated-system') return 1;
            if (a.scheduleType === 'updated' && b.scheduleType !== 'updated') return -1;
            if (b.scheduleType === 'updated' && a.scheduleType !== 'updated') return 1;
            if (a.scheduleType === 'canceled-changed' && b.scheduleType !== 'canceled-changed') return -1;
            if (b.scheduleType === 'canceled-changed' && a.scheduleType !== 'canceled-changed') return 1;
            if (a.ID < b.ID) return -1;
            if (b.ID < a.ID) return 1;
            return 0;
        }

        // Define a comparison function that will order calendar events by start time when we run the iteration
        var compare = function (a, b) {
            try {
                if (moment(a.start).valueOf() < moment(b.start).valueOf()) { return -1 }
                if (moment(a.start).valueOf() > moment(b.start).valueOf()) { return 1 }
                if (a.priority < b.priority) { return 1 }
                if (a.priority > b.priority) { return -1 }
                return 0
            } catch (e) {
                console.error(e)
            }
        }

        var taskComplete = () => {
            tasksCompleted++;
            progressCallback(tasksCompleted, tasks);
            if (tasksCompleted === tasks && callback) {
                callback(events.sort(compare));
            }
        }

        // Schedule function
        var processScheduleEntry = (calendar, schedule) => {
            // Polyfill any schedule overridden information with the main calendar event for use with schedule overrides
            var tempCal = Object.assign({}, calendar);
            for (var stuff in schedule) {
                if (Object.prototype.hasOwnProperty.call(schedule, stuff)) {
                    if (typeof schedule[ stuff ] !== 'undefined' && schedule[ stuff ] !== null)
                        tempCal[ stuff ] = schedule[ stuff ];
                }
            }

            // First, process one-time dates/times
            if (schedule.oneTime && schedule.oneTime.length > 0) {
                schedule.oneTime.map((oneTime) => {
                    var tempSchedules = [];
                    var scheduleIDs = [];
                    try {
                        // Get schedule overrides if they exist
                        var scheduleOverrides = scheduledb.db(function () {
                            return this.calendarID === calendar.ID && this.scheduleID === schedule.ID && this.scheduleType && this.scheduleType !== 'unscheduled' && this.originalTime && moment(this.originalTime).isSame(moment(oneTime), 'minute');
                        }).get() || [];
                        if (scheduleOverrides.length > 0) {
                            scheduleOverrides.map((exc) => {
                                scheduleIDs.push(exc.ID);
                                tempSchedules.push(exc);

                                // For updated records, add a canceled-changed record into the events so people know the original time was changed.
                                if ([ "updated", "updated-system" ].indexOf(exc.scheduleType) !== -1 && exc.newTime) {
                                    _processRecord(tempCal, { calendarID: calendar.ID, ID: schedule.ID, scheduleType: 'canceled-changed', scheduleReason: `Rescheduled to ${moment(exc.newTime).format("lll")}` }, exc.originalTime);
                                }
                            })
                        }
                    } catch (e) {
                        console.error(e);
                    }

                    // Merge all schedule overrides into one according to scheduleCompare priorities
                    if (tempSchedules.length > 0) {
                        var tempEvent = {};
                        tempSchedules.sort(scheduleCompare).reverse();
                        tempSchedules.map((ts) => {
                            for (var stuff in ts) {
                                if (Object.prototype.hasOwnProperty.call(ts, stuff)) {
                                    if (typeof ts[ stuff ] !== 'undefined' && ts[ stuff ] !== null)
                                        tempEvent[ stuff ] = ts[ stuff ];
                                }
                            }
                        });
                        _processRecord(tempCal, tempEvent, oneTime);
                    } else {
                        _processRecord(calendar, schedule, oneTime);
                    }
                });
            }

            // Next, process recurring schedules if hours is not null (if hours is null, we should never process this even if DW or M is not null)
            if (schedule.recurH && schedule.recurH.length > 0) {
                // Null value denotes all values for Days of Week
                if (!schedule.recurDW || schedule.recurDW.length === 0) schedule.recurDW = [ 1, 2, 3, 4, 5, 6, 7 ];

                // later.js does not work correctly if DW or H is not in numeric order
                schedule.recurDW.sort((a, b) => a - b);
                schedule.recurH.sort((a, b) => a - b);

                // Format minute into an array for proper processing in later.js
                if (!schedule.recurM) schedule.recurM = 0;

                // Generate later schedule
                var laterSchedule = later.schedule({ schedules: [ { "dw": schedule.recurDW, "h": schedule.recurH, "m": [ schedule.recurM ] } ] });

                var beginAt = start;

                // Loop through each schedule between start and end
                while (moment(beginAt).isBefore(moment(end))) {
                    var tempSchedules = [];
                    var scheduleIDs = [];

                    // Determine next start date/time. Bail if there are no more. Set beginAt to the next minute so we avoid infinite loops.
                    var eventStart = moment(laterSchedule.next(1, beginAt)).toISOString(true);
                    if (!eventStart) break;
                    beginAt = moment(eventStart).add(1, 'minute').toISOString(true);

                    // RecurDM, recurWM, and recurEvery not supported by later.js; do it ourselves
                    // RecurDM
                    if (schedule.recurDM && schedule.recurDM.length > 0 && schedule.recurDM.indexOf(moment(eventStart).date()) === -1) {
                        continue;
                    }

                    // RecurWM
                    if (schedule.recurWM && schedule.recurWM.length > 0) {
                        var lastWeek = moment(eventStart).month() !== moment(eventStart).add(1, 'weeks').month();
                        // 0 = last week of the month
                        if (schedule.recurWM.indexOf(this.weekOfMonth(eventStart)) === -1 && (!lastWeek || schedule.recurWM.indexOf(0) === -1)) {
                            continue;
                        }
                    }

                    // RecurEvery
                    if (moment(eventStart).week() % (schedule.recurEvery || 1) !== 0) {
                        continue;
                    }

                    // Get schedule overrides if they exist
                    try {
                        var scheduleOverrides = scheduledb.db(function () {
                            return this.calendarID === calendar.ID && this.scheduleID === schedule.ID && this.scheduleType && this.scheduleType !== 'unscheduled' && this.originalTime && moment(this.originalTime).isSame(moment(eventStart), 'minute');
                        }).get() || [];
                        if (scheduleOverrides.length > 0) {
                            scheduleOverrides.map((exc) => {
                                scheduleIDs.push(exc.ID);
                                tempSchedules.push(exc);

                                // For updated records, add a canceled-changed record into the events so people know the original time was changed.
                                if ([ "updated", "updated-system" ].indexOf(exc.scheduleType) !== -1 && exc.newTime) {
                                    _processRecord(calendar, { calendarID: calendar.ID, ID: schedule.ID, scheduleType: 'canceled-changed', scheduleReason: `Rescheduled to ${moment(exc.newTime).format("lll")}` }, exc.originalTime);
                                }
                            })
                        }
                    } catch (e) {
                        console.error(e);
                    }

                    // Merge all schedule overrides into one according to scheduleCompare priorities
                    if (tempSchedules.length > 0) {
                        var tempEvent = {};
                        tempSchedules.sort(scheduleCompare).reverse();
                        tempSchedules.map((ts) => {
                            for (var stuff in ts) {
                                if (Object.prototype.hasOwnProperty.call(ts, stuff)) {
                                    if (typeof ts[ stuff ] !== 'undefined' && ts[ stuff ] !== null)
                                        tempEvent[ stuff ] = ts[ stuff ];
                                }
                            }
                        });
                        _processRecord(tempCal, tempEvent, eventStart);
                    } else {
                        _processRecord(calendar, schedule, eventStart);
                    }
                }
            }
            taskComplete();
        }

        // Calendar function
        var processCalendarEntry = (calendar) => {
            // Get regular and unscheduled events
            var regularEvents = scheduledb.db({ calendarID: calendar.ID, scheduleType: [ null, 'unscheduled', undefined ] }).get();
            regularEvents.map((schedule) => {
                // Add to task queue
                tasks++;
                if (callback) {
                    this.queue.add(() => {
                        processScheduleEntry(calendar, schedule);
                    });
                } else {
                    processScheduleEntry(calendar, schedule);
                }
            });
            taskComplete();
        }

        // Get all calendar events and process their schedules
        var results = calendardb.db(query).get();
        results.map((calendar) => {
            // Add to task queue
            tasks++;
            if (callback) {
                this.queue.add(() => {
                    processCalendarEntry(calendar);
                });
            } else {
                processCalendarEntry(calendar);
            }
        });

        if (!callback)
            return events;
    }

    /**
     * Return an array of events scheduled to be on the air, or permitted to go on the air right now.
     *
     * @param {?function} callback If provided, will be executed in a queue and callback fired on completion. If not provided, will return array.
     * @param {boolean} automationOnly If true, only prerecords, genres, and playlists will be returned.
     * @param {function} progressCallback Function called after every task is completed. Parameters are tasks completed, and total tasks.
     * @returns {?array} If callback not provided, will return array of events scheduled.
     */
    whatShouldBePlaying (callback = null, automationOnly = false, progressCallback = () => { }) {
        var afterFunction = (events) => {
            if (events.length > 0) {
                var compare = function (a, b) {
                    try {
                        if (a.priority > b.priority) { return -1 };
                        if (a.priority < b.priority) { return 1 };
                        if (moment(a.start).valueOf() < moment(b.start).valueOf()) { return -1 }
                        if (moment(a.start).valueOf() > moment(b.start).valueOf()) { return 1 }
                        if (a.ID < b.ID) { return -1 }
                        if (a.ID > b.ID) { return 1 }
                        return 0
                    } catch (e) {
                        console.error(e)
                    }
                }
                events = events.sort(compare);

                var returnData = [];

                events
                    .filter((event) => {

                        // Canceled events should not be playing
                        if (event.scheduleType === 'canceled' || event.scheduleType === 'canceled-system' || event.scheduleType === 'canceled-changed') return false;

                        // Return events depending on whether or not we want only automation events
                        if (automationOnly) {
                            return (event.type === 'prerecord' || event.type === 'genre' || event.type === 'playlist') && moment().isSameOrAfter(moment(event.start)) && moment().isBefore(moment(event.end));
                        } else {
                            // Allow 5 minutes early for non-automation shows.
                            return (((event.type === 'prerecord' || event.type === 'genre' || event.type === 'playlist') && moment().isSameOrAfter(moment(event.start)) && moment().isBefore(moment(event.end))) || ((event.type === 'show' || event.type === 'sports' || event.type === 'remote') && moment().add(5, 'minutes').isSameOrAfter(moment(event.start)) && moment().add(5, 'minutes').isBefore(moment(event.end)))) && event.active;
                        }
                    })
                    .map((event) => {
                        if (event && event.unique)
                            returnData.push(event);
                    })
                if (callback) {
                    callback(returnData);
                } else {
                    return returnData;
                }
            } else {
                if (callback) {
                    callback([]);
                } else {
                    return [];
                }
            }
        }

        if (callback) {
            this.getEvents(afterFunction, undefined, undefined, { active: true }, undefined, undefined, progressCallback);
        } else {
            return afterFunction(this.getEvents(null, undefined, undefined, { active: true }));
        }
    }

    /**
     * Check for conflicts that would arise if we performed the provided schedule queries. Do this BEFORE adding/editing/deleting records!
     * 
     * @param {?function} callback If provided, will run in queue and function fired when all tasks completed. Otherwise, will return conflicts.
     * @param {array} queries Array of WWSUdb queries we want to perform on schedule; (insert, update, remove, updateCalendar, or removeCalendar).
     * @param {function} progressCallback Function fired on every task completion. Contains two parameters: tasks completed, and total tasks.
     * @returns {?object} If callback not provided, returns conflicts object {additions: [schedule records that should also be added], removals: [schedule records that should also be removed], errors: [strings of error messages for queries that cannot be performed]}
     */
    checkConflicts (callback = null, queries = [], progressCallback = () => { }) {
        // Start with 1 task; initialization
        var tasks = 1;
        var tasksCompleted = 1;

        // Prepare a copy of the current calendar
        var vcalendar = new WWSUdb(TAFFY());
        vcalendar.query(this.calendar.db().get(), true);

        // Prepare a copy of the current schedule
        var vschedule = new WWSUdb(TAFFY());
        vschedule.query(this.schedule.db().get(), true);

        // prepare start and end detection
        var start = null;
        var end = null;

        // Return data
        var removals = [];
        var additions = [];
        var errors = [];

        // Check if eventa and eventb conflicts
        var conflicts = (eventa, eventb) => {
            // If either event is a cancellation, there is no conflict
            if ((eventa.scheduleType && eventa.scheduleType.startsWith('canceled')) || (eventb.scheduleType && eventb.scheduleType.startsWith('canceled'))) return 0;

            // If either event has a priority of -1, there is no conflict
            if (eventa.priority === -1 || eventb.priority === -1) return 0;

            // If one event is priority 0 and the other is not, there is no conflict
            if ((eventa.priority === 0 && eventb.priority !== 0) || (eventb.priority === 0 && eventa.priority !== 0)) return 0;

            // If the times overlap, there is a conflict, but we need to determine which event conflicts with the other
            if ((moment(eventa.end).isAfter(moment(eventb.start)) && moment(eventa.end).isSameOrBefore(moment(eventb.end))) || (moment(eventa.start).isSameOrAfter(eventb.start) && moment(eventa.start).isBefore(eventb.end)) || (moment(eventa.start).isBefore(eventb.start) && moment(eventa.end).isAfter(eventb.end))) {
                // If eventb priority is greater than eventa, then eventa is at conflict
                if (eventb.priority > eventa.priority) {
                    return -1;
                    // If eventa priority is greater than eventb, then eventb is at conflict
                } else if (eventa.priority > eventb.priority) {
                    return 1;
                    // If both priorities are the same, whichever event has the oldest createdAt time gets priority
                } else if (moment(eventb.createdAt).isBefore(moment(eventa.createdAt))) {
                    return -1;
                } else if (moment(eventa.createdAt).isBefore(moment(eventb.createdAt))) {
                    return 1;
                    // If by miracle, createdAt was also exactly the same, prioritize the event with the longest duration
                } else if (eventb.duration > eventa.duration) {
                    return -1;
                } else if (eventa.duration > eventb.duration) {
                    return 1;
                    // If durations were also the same, bail out by defaulting to eventb being at conflict
                } else {
                    return 1;
                }
            }
            return 0;
        }

        // Check is eventa and eventb conflicts. If so, push an updated or canceled record into our arrays.
        var checkAndResolveConflicts = (eventa, eventb) => {
            var overrides;
            var overridden;
            var newRecord;
            switch (conflicts(eventa, eventb)) {
                case -1:
                    overrides = eventb;
                    overridden = eventa;
                    break;
                case 1:
                    overrides = eventa;
                    overridden = eventb;
                    break;
                default:
                    return;
            }

            var newRecord = {
                calendarID: overridden.calendarID,
                scheduleID: overridden.scheduleID,
                overriddenID: overrides.scheduleID || null,
                type: overridden.type,
                hosts: overridden.hosts,
                name: overridden.name
            };

            var startdiff = moment(overrides.start).diff(moment(overridden.start), 'minutes');
            var enddiff = moment(overridden.end).diff(moment(overrides.end), 'minutes');

            // The higher priority event starts 30 or more minutes after the event being checked and the differential is greater than the end time. 
            // Instead of a cancellation, just decrease show duration.
            if (startdiff >= 30 && startdiff >= enddiff) {
                newRecord.scheduleType = "updated-system";
                newRecord.scheduleReason = `An event with a higher priority (${overrides.type}: ${overrides.hosts} - ${overrides.name}) was scheduled to start during this event's time block.`;
                newRecord.originalTime = overridden.start;
                newRecord.duration = startdiff;
            }
            // The event being checked ends 30 or more minutes after the higher priority event and the differential is greater than the start time.
            // Instead of a cancellation, just update show start time.
            else if (enddiff >= 30 && enddiff >= startdiff) {
                newRecord.scheduleType = "updated-system";
                newRecord.scheduleReason = `An event with a higher priority (${overrides.type}: ${overrides.hosts} - ${overrides.name}) will run partially through this event's time block.`;
                newRecord.originalTime = overridden.start;
                newRecord.duration = enddiff;
                newRecord.newTime = moment(overrides.end).toISOString(true);
            }
            // If neither of the above conditions apply, the event being checked should be canceled.
            else {
                newRecord.scheduleType = "canceled-system";
                newRecord.scheduleReason = `An event with a higher priority (${overrides.type}: ${overrides.hosts} - ${overrides.name}) is scheduled during this event's time block.`;
                newRecord.originalTime = overridden.start;
            }

            // Duplicate schedule for the same event? That's a problem! Throw an error.
            if (!overridden.scheduleType && overridden.calendarID === overrides.calendarID) {
                throw new Error(`There is a schedule for calendar ID ${overridden.calendarID} that would overlap another schedule for the same calendar ID. This is not allowed.`);
            } else {
                additions.push(newRecord);
            }
        }

        var taskComplete = () => {
            tasksCompleted++;
            progressCallback(tasksCompleted, tasks);
            if (tasksCompleted === tasks && callback) {
                callback({ removals, additions, errors });
            }
        }

        var processEvent = (events, event, index) => {
            // If this schedule was created as an override, we need to check to see if the override is still valid
            if (event.overriddenID) {
                // Find the original event
                var record = events.find((eventb) => eventb.ID === event.overriddenID);

                // If we could not find it, the override is invalid, so we can remove it and not continue beyond this point for the event.
                if (!record) {
                    removals.push(event);
                    taskComplete();
                    return;
                }
            }

            // Iterate conflict checking on every event after the index
            events
                .filter((ev, ind) => ind > index)
                .map((ev) => {
                    try {
                        checkAndResolveConflicts(event, ev);
                    } catch (e) {
                        errors.push(e.message);
                    }
                });

            taskComplete();
        }

        if (queries.length > 0) {

            // Process updateCalendar or removeCalendar before we continue with anything else
            queries
                .filter((_query) => typeof _query.updateCalendar !== 'undefined' || typeof _query.removeCalendar !== 'undefined')
                .map((_query, index) => {
                    var query = Object.assign({}, _query);
                    // Process the calendar update
                    if (typeof query.updateCalendar !== 'undefined') {
                        vcalendar.query({ update: query.updateCalendar });

                        // Now, we need to remove updateCalendar from the query and replace it with all of its schedules as update queries.
                        // That way, we can check all of its schedules for changes in conflicts resulting from changes in calendar defaults.
                        var schedules = vschedule.db({ calendarID: query.updateCalendar.ID }).get();
                        queries.splice(index, 1);
                        schedules.map((schedule) => {
                            queries.push({ update: schedule });
                        });
                    }
                    if (typeof query.removeCalendar !== 'undefined') {
                        vcalendar.query({ remove: query.removeCalendar });

                        // Remove the original removeCalendar query as we do not want to process it beyond this map.
                        // We need to add all of the calendar's schedule records as remove queries since they will get removed too.
                        var schedules = vschedule.db({ calendarID: query.removeCalendar }).get();
                        queries.splice(index, 1);
                        schedules.map((schedule) => {
                            queries.push({ remove: schedule.ID });
                        });
                    }
                })

            // It is possible we edited or removed a calendar without any schedules, this the query is now empty. Exit if so; no more checks necessary.
            if (queries.length === 0) {
                if (callback) {
                    callback({ removals: [], additions: [], errors: [] });
                    return;
                } else {
                    return { removals: [], additions: [], errors: [] };
                }
            }

            // Process virtual queries
            queries.forEach((_query) => {
                var query = Object.assign({}, _query);
                if (typeof query.remove !== 'undefined') {
                    query.remove = vschedule.db({ ID: query.remove }).first();
                    vschedule.query({ remove: query.remove.ID });
                } else {
                    vschedule.query(query);
                }

                // Determine start and end times for conflict checking
                for (var key in query) {
                    if (Object.prototype.hasOwnProperty.call(query, key)) {

                        // Polyfill calendar and schedule information
                        var event = this.scheduleToEvent(query[ key ], vschedule);

                        // Determine start and end times for conflict checking
                        if (query[ key ].originalTime) {
                            if (!start || moment(query[ key ].originalTime).isBefore(moment(start))) {
                                start = moment(query[ key ].originalTime);
                            }
                            if (!end || moment(query[ key ].originalTime).isAfter(moment(end))) {
                                end = moment(query[ key ].originalTime).add(event.duration, 'minutes');
                            }
                        }
                        if (query[ key ].newTime) {
                            if (!start || moment(query[ key ].newTime).isBefore(moment(start))) {
                                start = moment(query[ key ].newTime);
                            }
                            if (!end || moment(query[ key ].newTime).isAfter(moment(end))) {
                                end = moment(query[ key ].newTime).add(event.duration, 'minutes');
                            }
                        }
                        if (query[ key ].oneTime && query[ key ].oneTime.length > 0) {
                            query[ key ].oneTime.map((ot) => {
                                if (!start || moment(ot).isBefore(moment(start))) {
                                    start = moment(ot);
                                }
                                if (!end || moment(ot).isAfter(moment(end))) {
                                    end = moment(ot).add(event.duration, 'minutes');
                                }
                            });
                        }
                        if (query[ key ].recurH && query[ key ].recurH.length > 0) {
                            if (!start || moment(event.startDate).isBefore(moment(start))) {
                                start = moment(event.startDate);
                            }
                            if (!end || moment(event.endDate).isAfter(moment(end))) {
                                end = moment(event.endDate).add(event.duration, 'minutes');
                            }
                        }
                    }
                }
            });
        } else { // No queries? We cannot do conflict checking. Fire callback and return.
            if (callback) {
                callback({ removals: [], additions: [], errors: [ 'You must provide at least one query to do conflict checking' ] });
                return;
            } else {
                return { removals: [], additions: [], errors: [ 'You must provide at least one query to do conflict checking' ] };
            }
        }

        if (!start) start = moment();

        // Make start 1 day sooner to account for any ongoing events
        start = moment(start).subtract(1, 'days');

        // BEGIN actual conflict checking below

        // Function called when we get all events for checking
        var eventsCall = (events) => {
            // Now, go through every event for conflict checking
            events
                .map((event, index) => {
                    // Add to task queue
                    tasks++;
                    this.queue.add(() => {
                        processEvent(events, event, index);
                    });
                });
        }

        // Get events with virtual schedule
        if (callback) {
            this.getEvents(eventsCall, moment(start).toISOString(true), moment(end).toISOString(true), {}, vcalendar, vschedule, (_tasksCompleted, _tasks) => {
                tasks = _tasks * 2; // Double this because getEvents is only one of two major parts of the task queue.
                tasksCompleted = _tasksCompleted;
                taskComplete();

                // Reset number of tasks when getEvents is about to be done. This will be updated properly in the events callback.
                if (_tasksCompleted === _tasks) {
                    tasks = _tasks;
                }
            });
        } else {
            eventsCall(this.getEvents(null, moment(start).toISOString(true), moment(end).toISOString(true), {}, vcalendar, vschedule));
            return { removals, additions, errors };
        }
    }

    /**
     * Check which directors are scheduled to be in the office at this time +- 30 minutes.
     * 
     * @param {?function} callback If provided, function will run in queue and call this function with office-hours array when done.
     * @param {function} progressCallback Function called after every task executed. Contains two parameters: tasks completed, and total tasks.
     * @returns {?array} If callback not provided, will return array of office-hours on the schedule.
     */
    whoShouldBeIn (callback = null, progressCallback = () => { }) {
        var afterFunction = (events) => {
            if (events.length > 0) {
                var compare = function (a, b) {
                    try {
                        if (moment(a.start).valueOf() < moment(b.start).valueOf()) { return -1 }
                        if (moment(a.start).valueOf() > moment(b.start).valueOf()) { return 1 }
                        if (a.ID < b.ID) { return -1 }
                        if (a.ID > b.ID) { return 1 }
                        return 0
                    } catch (e) {
                        console.error(e)
                    }
                }
                events = events.sort(compare);

                events = events
                    .filter((event) => {

                        if (event.scheduleType === 'canceled' || event.scheduleType === 'canceled-system' || event.scheduleType === 'canceled-changed') return false;

                        // Return directors who are expected to come in in the next 30 minutes as well
                        return (event.type === 'office-hours' && moment().add(30, 'minutes').isSameOrAfter(moment(event.start))) && moment().isBefore(moment(event.end)) && event.active;
                    });

                callback(events);
            } else {
                callback([]);
            }
        }
        if (callback) {
            this.getEvents(afterFunction, undefined, undefined, { active: true }, undefined, undefined, progressCallback);
        } else {
            return afterFunction(this.getEvents(null, undefined, undefined, { active: true }));
        }
    }

    /**
     * Verify a provided event is valid and contains all required properties. MUST be run before adding anything to the calendar.
     * 
     * @param {object} event Proposed event being added.
     * @returns {object|string} Event object if valid with necessary modifications, or string with an error message if invalid.
     */
    verify (event) {

        var tempCal = {};

        // If calendarID is provided, we expect it to be a valid calendar ID, otherwise the event is invalid.
        if (event.calendarID) {
            var calendar = this.calendar.db({ ID: event.calendarID }).first();
            if (!calendar) {
                return 'The provided calendarID does not exist.';
            } else { // polyfill information
                for (var stuff in calendar) {
                    if (Object.prototype.hasOwnProperty.call(calendar, stuff)) {
                        if (typeof calendar[ stuff ] !== 'undefined' && calendar[ stuff ] !== null)
                            tempCal[ stuff ] = calendar[ stuff ];
                    }
                }
            }
        }

        // If scheduleID is provided, we expect it to be a valid schedule ID, otherwise the event is invalid.
        if (event.scheduleID) {
            var schedule = this.schedule.db({ ID: event.scheduleID }).first();
            if (!schedule) {
                return 'The provided scheduleID does not exist.';
            } else { // polyfill information
                for (var stuff in schedule) {
                    if (Object.prototype.hasOwnProperty.call(schedule, stuff)) {
                        if (typeof schedule[ stuff ] !== 'undefined' && schedule[ stuff ] !== null)
                            tempCal[ stuff ] = schedule[ stuff ];
                    }
                }
            }
        }

        // Now, polyfill tempCal with the current event
        for (var stuff in event) {
            if (Object.prototype.hasOwnProperty.call(event, stuff)) {
                if (typeof event[ stuff ] !== 'undefined' && event[ stuff ] !== null)
                    tempCal[ stuff ] = event[ stuff ];
            }
        }

        // If scheduleType is not null and not unscheduled, we expect an originalTime value.
        if (tempCal.scheduleType && tempCal.scheduleType !== 'unscheduled') {
            if (!tempCal.originalTime) return 'originalTime is required when scheduleType is not null nor unscheduled.';
            // if scheduleType is null or unscheduled, we expect a duration and at least one oneTime or recurH if calendarID was provided.
        } else if (event.calendarID) {
            if (!tempCal.duration || tempCal.duration <= 0) return 'duration is required for null or unscheduled scheduleTypes.';
            if ((!tempCal.oneTime || tempCal.oneTime.length === 0) && (!tempCal.recurH || tempCal.recurH.length === 0)) return 'oneTime or recurH is required for null or unscheduled scheduleTypes.';
        }

        // We expect an event name for all events except office-hours or bookings.
        if ([ 'office-hours', 'onair-booking', 'prod-booking' ].indexOf(tempCal.type) === -1 && (!tempCal.name || tempCal.name === '')) return 'name is required for non-booking and non-office-hours events.';

        // If type is show, remote, or prerecord, we expect a hostDJ.
        if ([ 'show', 'remote', 'prerecord' ].indexOf(tempCal.type) !== -1 && !tempCal.hostDJ) return 'hostDJ is required for shows and prerecords.';

        // If type is a booking, we expect a hostDJ or director.
        if ([ 'prod-booking', 'onair-booking' ].indexOf(tempCal.type) !== -1 && !tempCal.hostDJ && !tempCal.director) return 'hostDJ or director is required for booking events.';

        // If type is prerecord or playlist, we expect playlistID.
        if ([ 'prerecord', 'playlist' ].indexOf(tempCal.type) !== -1 && !tempCal.playlistID) return 'playlistID required for prerecords and playlists.';

        // If type is genre, we expect eventID.
        if ([ 'genre' ].indexOf(tempCal.type) !== -1 && !tempCal.eventID) return 'eventID required for genres.';

        // If recurH is provided, we expect an end date.
        if (tempCal.recurH && tempCal.recurH.length > 0 && !tempCal.endDate) return 'endDate required for events with a recurring schedule.';

        // We expect a director for office-hours and tasks.
        if ([ 'office-hours', 'task' ].indexOf(tempCal.type) !== -1 && !tempCal.director) return 'director required for office-hours and task.';

        // Default to a duration of 0 when it is null or not existing.
        if (!tempCal.duration || tempCal.duration <= 0) event.duration = 0;

        // If no startDate provided, default to current date.
        if (!tempCal.startDate) event.startDate = moment().toISOString(true);

        // Make sure there is always a scheduleType. Otherwise, TAFFYDB will not like us.
        if (!tempCal.scheduleType) event.scheduleType = null;

        return { event, tempCal };
    }

    /**
     * Get the default priority of an event by its type.
     * 
     * @param {object} event The event
     * @returns {number} Default priority
     */
    getDefaultPriority (event) {
        switch (event.type) {
            case 'show':
                return 5;
            case 'sports':
                return 9;
            case 'remote':
                return 7;
            case 'prerecord':
                return 3;
            case 'genre':
                return 0;
            case 'playlist':
                return 1;
            default:
                return -1;
        }
    }

    /**
    * Get the color this event should be displayed as based on its type.
    * 
    * @param {object} event The event
    * @returns {string} Hex color code
    */
    getColor (event) {
        switch (event.type) {
            case 'show':
                return "#dc3545";
            case 'sports':
                return "#28a745";
            case 'remote':
                return "#6f42c1";
            case 'prerecord':
                return "#e83e8c";
            case 'genre':
                return "#007bff";
            case 'playlist':
                return "#17a2b8";
            case 'office-hours':
                return "#ffc107";
            case 'task':
                return "#ff851b";
            case 'onair-booking':
            case 'prod-booking':
                return "#39cccc";
            default:
                return "#6c757d";
        }
    }

    /**
     * Get the color class this event should be displayed as based on its type.
     * 
     * @param {object} event The event
     * @returns {string} Color class
     */
    getColorClass (event) {
        switch (event.type) {
            case 'show':
                return "danger";
            case 'sports':
                return "success";
            case 'remote':
                return "indigo";
            case 'prerecord':
                return "pink";
            case 'genre':
                return "primary";
            case 'playlist':
                return "info";
            case 'office-hours':
                return "warning";
            case 'task':
                return "orange";
            case 'onair-booking':
            case 'prod-booking':
                return "teal";
            default:
                return "secondary";
        }
    }

    /**
     * Get the icon class this event should be displayed as based on its type.
     * 
     * @param {object} event The event
     * @returns {string} Icon class
     */
    getIconClass (event) {
        switch (event.type) {
            case 'genre':
                return 'fas fa-music';
            case 'playlist':
                return 'fas fa-play';
            case 'show':
                return 'fas fa-microphone';
            case 'sports':
                return 'fas fa-basketball-ball';
            case 'remote':
                return 'fas fa-broadcast-tower';
            case 'prerecord':
                return 'fas fa-play-circle';
            case 'office-hours':
                return 'fas fa-user-clock';
            case 'task':
                return 'fas fa-tasks';
            case 'onair-booking':
            case 'prod-booking':
                return 'fas fa-clock';
            default:
                return 'fas fa-calendar';
        }
    }

    /**
     * Combine a base calendar or schedule record with a modifying schedule record.
     * 
     * @param {object} calendar The base event or schedule
     * @param {object} schedule The schedule making modifications to calendar
     * @param {string} eventStart ISO String of the start or original time for the event
     * @returns {object} Modified event
     */
    processRecord (calendar, schedule, eventStart) {
        var criteria = {
            calendarID: schedule.calendarID || calendar.ID, // ID of the main calendar event
            scheduleID: schedule.ID || null, // ID of the schedule record to process
            scheduleOverrideID: schedule.scheduleID || null, // If this schedule overrides another schedule, this is the ID of the schedule that this schedule overrides.
            overriddenID: schedule.overriddenID || null, // ID of the schedule which overrode this one (for -system schedules).
            scheduleType: schedule.scheduleType || null, // Schedule type (null [default schedule], unscheduled, updated, updated-system, canceled, canceled-system, canceled-updated)
            scheduleReason: schedule.scheduleReason || null, // A reason for this schedule or override, if applicable.
            originalTime: schedule.originalTime ? moment(schedule.originalTime).toISOString(true) : null, // The specific time this schedule is applicable for... used for updates and cancelations.
            type: schedule.type ? schedule.type : calendar.type, // Event type (show, remote, sports, prerecord, genre, playlist, event, onair-booking, prod-booking, office-hours, task)
            priority: schedule.priority || schedule.priority === 0 ? schedule.priority : (calendar.priority || calendar.priority === 0 ? calendar.priority : (schedule.type ? this.getDefaultPriority(schedule) : this.getDefaultPriority(calendar))), // Priority of the event. -1 = no conflict detection. 0 and up = overridden by any events scheduled that have the same or higher priority.
            hostDJ: schedule.hostDJ ? schedule.hostDJ : calendar.hostDJ || null, // The ID of the DJ hosting the event
            cohostDJ1: schedule.cohostDJ1 ? schedule.cohostDJ1 : calendar.cohostDJ1 || null, // The ID of the first cohost DJ
            cohostDJ2: schedule.cohostDJ2 ? schedule.cohostDJ2 : calendar.cohostDJ2 || null, // The ID of the second cohost DJ
            cohostDJ3: schedule.cohostDJ3 ? schedule.cohostDJ3 : calendar.cohostDJ3 || null, // The ID of the third cohost DJ
            active: calendar.active, // True if the event is active, false if it is not.
            eventID: schedule.eventID ? schedule.eventID : calendar.eventID || null, // ID of the radioDJ manual event to fire, for genre events
            playlistID: schedule.playlistID ? schedule.playlistID : calendar.playlistID || null, // ID of the playlist to queue, for playlist and prerecord events.
            director: schedule.director ? schedule.director : calendar.director || null, // ID of the director, for office-hours and task events.
            hosts: schedule.hosts ? schedule.hosts : calendar.hosts || "Unknown Hosts", // String of host names based on director and/or DJ IDs.
            name: schedule.name ? schedule.name : calendar.name || "Unknown Event", // Name of event
            description: schedule.description ? schedule.description : calendar.description || null, // Description of event
            logo: schedule.logo ? schedule.logo : calendar.logo || null, // URL to the event logo
            banner: schedule.banner ? schedule.banner : calendar.banner || null, // URL to the event banner
            newTime: schedule.newTime ? moment(schedule.newTime).toISOString(true) : null, // If an exception is applied that overrides an event's start time, this is the event's new start time.
            start: schedule.newTime ? moment(schedule.newTime).toISOString(true) : moment(eventStart).toISOString(true), // Start time of the event
            duration: schedule.duration || schedule.duration === 0 ? schedule.duration : (calendar.duration || calendar.duration === 0 ? calendar.duration : null), // The duration of the event in minutes
            oneTime: schedule.oneTime || calendar.oneTime ? schedule.oneTime || calendar.oneTime : null, // Array of oneTime ISO dates to execute the event
            recurDM: schedule.recurDM || calendar.recurDM, // Array of days of the month to execute this event
            recurWM: schedule.recurWM || calendar.recurWM, // Array of weeks of the month to execute this event (0 = last week)
            recurDW: schedule.recurDW || calendar.recurDW, // Array of days of the week (1-7) to execute this event
            recurH: schedule.recurH || calendar.recurH, // Array of hours of the day to execute this event
            recurM: schedule.recurM || schedule.recurM === 0 ? schedule.recurM : (calendar.recurM || calendar.recurM === 0 ? calendar.recurM : null), // The minute of the hour at which to execute the event
            recurEvery: schedule.recurEvery || calendar.recurEvery || 1, // Only schedule when week of year % recurEvery = 0 (eg. recurEvery = 2 means every even week of the year, recurEvery = 3 means every week of the year divisible by 3)
            startDate: schedule.startDate || calendar.startDate ? moment(schedule.startDate || calendar.startDate).startOf('day').toISOString(true) : null, // Date the event starts
            endDate: schedule.endDate || calendar.endDate ? moment(schedule.endDate || calendar.endDate).startOf('day').toISOString(true) : null, // Date the event ends (exclusive).
            timeChanged: schedule.scheduleID && (schedule.newTime || schedule.duration), // True if this event's time was changed from the original, else false
            createdAt: schedule.createdAt || calendar.createdAt, // createdAt used to determine which event gets priority in conflict checking if both have the same priority
            updatedAt: schedule.updatedAt || calendar.updatedAt,
        }

        // Determine event color
        criteria.color = this.getColor(criteria);

        // Generate a unique string for this specific event time so we can differentiate recurring events easily.
        // Note: The start time in unique strings should be UTC to avoid Daylight Savings complications.
        // Format: calendarID_originalEventStartTime[_originalScheduleID].
        if (criteria.scheduleOverrideID && criteria.originalTime) {
            criteria.unique = `${criteria.calendarID}-${moment.utc(criteria.originalTime).valueOf()}-${criteria.scheduleOverrideID}`;
        } else if (criteria.scheduleID) {
            criteria.unique = `${criteria.calendarID}-${moment.utc(criteria.start).valueOf()}-${criteria.scheduleID}`;
        } else if (!criteria.originalTime) {
            criteria.unique = `${criteria.calendarID}-${moment.utc(criteria.start).valueOf()}`;
        } else {
            criteria.unique = `${criteria.calendarID}-${moment.utc(criteria.originalTime).valueOf()}`;
        }

        // Calculate end time after forming the object because we must refer to criteria.start
        criteria.end = schedule.duration || calendar.duration ? moment(criteria.start).add(schedule.duration || calendar.duration, 'minutes').toISOString(true) : moment(criteria.start).toISOString(true);

        return criteria;
    }

    /**
     * Date libraries do not support calculating week of the month; we have our own function for that.
     * 
     * @param {string} input ISO string of the date
     * @returns {number} Week of the month the date falls on
     */
    weekOfMonth (input) {
        const firstDayOfMonth = moment(input).startOf('month');
        const firstDayOfWeek = moment(firstDayOfMonth).clone().startOf('week');

        const offset = firstDayOfMonth.diff(firstDayOfWeek, 'days');

        return Math.ceil((moment(input).date() + offset) / 7);
    }

    /**
     * Generate a human readable string for the schedule provided.
     * 
     * @param {object} event The CalendarDb event or the schedule DB record.
     * @returns {string} Human readable representation of the schedule.
     */
    generateScheduleText (event) {
        var recurAt = [];
        var oneTime = [];
        var recurDayString = ``;

        if (event.newTime) {
            return `On ${moment(event.newTime).format("LLLL")} for ${moment.duration(event.duration, 'minutes').format("h [hours], m [minutes]")}`;
        }

        // Start with the easy one
        if (event.oneTime && event.oneTime.length > 0) {
            oneTime = event.oneTime.map((onetime) => moment(onetime).format("LLLL"));
        }

        if (oneTime.length === 0) {
            recurDayString = `Every `;
        } else {
            recurDayString = `On ${oneTime.join(", ")}`;
        }

        if (event.recurH && event.recurH.length > 0) {
            if (oneTime.length > 0) {
                recurDayString += `... and every `;
            }

            // Times
            recurAt = event.recurH.map((h) => `${h < 10 ? `0${h}` : h}:${event.recurM < 10 ? `0${event.recurM}` : event.recurM}`);

            if (event.recurDM && event.recurDM.length > 0 && event.recurDM.length < 31) {
                var ifit = false;
                recurDayString += `${event.recurDM.join(", ")} day(s) of the month`;

                if (event.recurWM && event.recurWM.length > 0 && event.recurWM.length < 5) {
                    if (!ifit) {
                        recurDayString += ` if`;
                        ifit = true;
                    } else {
                        recurDatString += `, and`;
                    }
                    recurDayString += ` it falls on ${event.recurWM.length > 1 ? `either` : ``} the ${event.recurWM.map((WM) => {
                        switch (WM) {
                            case 0:
                                return 'last';
                            case 1:
                                return 'first';
                            case 2:
                                return 'second';
                            case 3:
                                return 'third';
                            case 4:
                                return 'fourth';
                            case 5:
                                return 'fifth';
                        }
                    }).join(', ')} week of the month`
                }

                if (event.recurDW && event.recurDW.length > 0 && event.recurDW.length < 7) {
                    if (!ifit) {
                        recurDayString += ` if`;
                        ifit = true;
                    } else {
                        recurDatString += `, and`;
                    }
                    recurDayString += ` it falls on ${event.recurDW.length > 1 ? `either` : ``} a ${event.recurDW.map((DW) => {
                        switch (DW) {
                            case 1:
                                return 'Sunday';
                            case 2:
                                return 'Monday';
                            case 3:
                                return 'Tuesday';
                            case 4:
                                return 'Wednesday';
                            case 5:
                                return 'Thursday';
                            case 6:
                                return 'Friday';
                            case 7:
                                return 'Saturday';
                        }
                    }).join(', ')}`
                }
            } else if (event.recurWM && event.recurWM.length > 0 && event.recurWM.length < 5) {
                recurDayString += `${event.recurWM.map((WM) => {
                    switch (WM) {
                        case 0:
                            return 'last';
                        case 1:
                            return 'first';
                        case 2:
                            return 'second';
                        case 3:
                            return 'third';
                        case 4:
                            return 'fourth';
                        case 5:
                            return 'fifth';
                    }
                }).join(', ')} week(s) of the month`

                if (event.recurDW && event.recurDW.length > 0 && event.recurDW.length < 7) {
                    recurDayString += `, on ${event.recurDW.map((DW) => {
                        switch (DW) {
                            case 1:
                                return 'Sunday';
                            case 2:
                                return 'Monday';
                            case 3:
                                return 'Tuesday';
                            case 4:
                                return 'Wednesday';
                            case 5:
                                return 'Thursday';
                            case 6:
                                return 'Friday';
                            case 7:
                                return 'Saturday';
                        }
                    }).join(', ')}`
                } else {
                    recurDayString += `, every day`;
                }
            } else {
                if (event.recurDW && event.recurDW.length > 0 && event.recurDW.length < 7) {
                    recurDayString += `${event.recurDW.map((DW) => {
                        switch (DW) {
                            case 1:
                                return 'Sunday';
                            case 2:
                                return 'Monday';
                            case 3:
                                return 'Tuesday';
                            case 4:
                                return 'Wednesday';
                            case 5:
                                return 'Thursday';
                            case 6:
                                return 'Friday';
                            case 7:
                                return 'Saturday';
                        }
                    }).join(', ')}`
                } else {
                    recurDayString += `day`;
                }
            }

            if (event.recurEvery && event.recurEvery > 1) {
                recurDayString += `, but only every ${evenr.recurEvery} weeks of the year`
            }

            recurDayString += `... at ${recurAt}`;
        }

        recurDayString += `... for ${moment.duration(event.duration, 'minutes').format("h [hours], m [minutes]")}`;

        if (event.startDate || event.endDate) {
            recurDayString += `... `
        }
        if (event.startDate) {
            recurDayString += `starting ${moment(event.startDate).format("LL")} `;
        }
        if (event.endDate) {
            recurDayString += `until ${moment(event.endDate).format("LL")} `;
        }

        return recurDayString;
    }

    /**
     * Polyfill missing information in a schedule record from its scheduleID (if applicable) and the calendar event's default properties.
     * 
     * @param {object} record The schedule database record
     * @param {WWSUdb} scheduledb If provided, will use this database of schedules instead of the CalendarDb one.
     * @returns {object} Event, as structured in processRecord.
     */
    scheduleToEvent (record, scheduledb = this.schedule) {
        var tempCal = {};
        var event;
        if (record.calendarID) {
            var calendar = this.calendar.db({ ID: record.calendarID }).first();
            if (record.scheduleID) {
                var schedule = scheduledb.db({ ID: record.scheduleID }).first();
            }
            if (schedule) {
                var tempCal = Object.assign({}, calendar);
                for (var stuff in schedule) {
                    if (Object.prototype.hasOwnProperty.call(schedule, stuff)) {
                        if (typeof schedule[ stuff ] !== 'undefined' && schedule[ stuff ] !== null)
                            tempCal[ stuff ] = schedule[ stuff ];
                    }
                }
                event = this.processRecord(tempCal, record, record.newTime ? record.newTime : record.originalTime);
            } else {
                event = this.processRecord(calendar, record, record.newTime ? record.newTime : record.originalTime);
            }
        } else {
            event = this.processRecord(record, { calendarID: null }, moment().toISOString(true));
        }

        return event;
    }
}

// If using Node.js, export as a module
if (typeof require !== 'undefined')
    module.exports = CalendarDb;