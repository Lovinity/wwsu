// Require libraries if necessary. Because this script runs both in browser and in node, we need to cover both methods of including scripts.

// Node require
if (typeof require !== 'undefined') {
    if (typeof TAFFY === 'undefined') {
        var TAFFY = require('../../taffy/js/taffy-min.js').taffy;
    }

    if (typeof WWSUdb === 'undefined') {
        var WWSUdb = require('../../wwsu-sails/js/wwsu.js').WWSUdb;
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

    if (typeof WWSUdb === 'undefined') {
        $.loadScript('../../wwsu-sails/js/wwsu.js');
    }

    if (typeof later === 'undefined') {
        $.loadScript('../../later/js/later.min.js');
    }

    if (typeof moment === 'undefined') {
        $.loadScript('../../moment/moment.min.js');
    }
} else if (typeof TAFFY === 'undefined' || typeof WWSUdb === 'undefined' || typeof later === 'undefined' || typeof moment === 'undefined') {
    console.error(new Error('wwsu-calendar requires TAFFY, WWSUdb, later, and moment. However, neither node.js require() nor JQuery were available to require the scripts.'));
}

// Use local time instead of UTC for scheduling
later.date.localTime()

// Class to manage calendar events for WWSU
class CalendarDb {

    // Constructor stores initial calendar and calendarexceptions DB row arrays into TAFFYDB.
    constructor(calendar = [], schedule = []) {
        this.calendar = new WWSUdb(TAFFY());
        this.schedule = new WWSUdb(TAFFY());
        this.calendar.db.insert(calendar);
        this.schedule.db.insert(schedule);
    }

    // Change the data in the in-memory database
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

    // Get an array of upcoming events based on provided criteria. 
    // Generally for start, you will want to fetch up to 24 hours before your desired start time; events past start will not be returned even if they have not yet finished.
    getEvents (start = moment().subtract(1, 'days').toISOString(true), end = moment().add(1, 'days').toISOString(true), query = {}) {
        var events = [];

        // Extension of this.processRecord to also determine if the event falls within the start and end times.
        var _processRecord = (calendar, schedule, eventStart) => {
            var criteria = this.processRecord(calendar, schedule, eventStart);

            // This event is within our time range if one or more of the following is true:
            // A. Calendar event start is same or before generated event start.
            // B. Calendar event end is same or after generated event start.
            // C. The event end time is between start and end.
            // D. The event start time is between start and end.
            // E. The event start time is before start, and the event end time is after end.
            if ((calendar.startDate && moment(calendar.startDate).isAfter(moment(criteria.start))) || (calendar.endDate && moment(calendar.endDate).isBefore(moment(criteria.start)))) {

            } else {
                if ((moment(criteria.end).isAfter(moment(start)) && moment(criteria.end).isSameOrBefore(moment(end))) || (moment(criteria.start).isSameOrAfter(start) && moment(criteria.start).isBefore(end)) || (moment(criteria.start).isBefore(start) && moment(criteria.end).isAfter(end))) {
                    events.push(criteria);
                }
            }
        }

        // Get all calendar events and process their schedules
        var results = this.calendar.db(query).get();
        results.map((calendar, index) => {

            // Define a sort function for schedule types that prioritizes certain types above others in the event of multiple overrides.
            var scheduleCompare = (a, b) => {
                if (a.scheduleType === 'canceled' && b.scheduleType !== 'canceled') return -1;
                if (b.scheduleType === 'canceled' && a.scheduleType !== 'canceled') return 1;
                if (a.scheduleType === 'canceled-system' && b.scheduleType !== 'canceled-system') return -1;
                if (b.scheduleType === 'canceled-system' && a.scheduleType !== 'canceled-system') return 1;
                if (a.scheduleType === 'updated' && b.scheduleType !== 'updated') return -1;
                if (b.scheduleType === 'updated' && a.scheduleType !== 'updated') return 1;
                if (a.scheduleType === 'updated-system' && b.scheduleType !== 'updated-system') return -1;
                if (b.scheduleType === 'updated-system' && a.scheduleType !== 'updated-system') return 1;
                if (a.scheduleType === 'canceled-changed' && b.scheduleType !== 'canceled-changed') return -1;
                if (b.scheduleType === 'canceled-changed' && a.scheduleType !== 'canceled-changed') return 1;
                return 0;
            }

            // First, get regular and unscheduled events
            var regularEvents = this.schedule.db({ calendarID: calendar.ID, scheduleType: [ null, 'unscheduled' ] }).get();
            regularEvents.map((schedule, ind) => {

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
                            var scheduleOverrides = this.schedule.db(function () {
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

                        // If there are schedule overrides, process schedule with highest priority schedule override according to scheduleCompare.
                        // Otherwise, process main calendar event with the main schedule.
                        if (tempSchedules.length > 0) {
                            tempSchedules.sort(scheduleCompare);
                            _processRecord(tempCal, tempSchedules[ 0 ], oneTime);
                        } else {
                            _processRecord(calendar, schedule, oneTime);
                        }
                    });
                }

                // Next, process recurring schedules if hours is not null (if hours is null, we should never process this even if DW or M is not null)
                if (schedule.recurH && schedule.recurH.length > 0) {
                    // Null value denote all values for Days of Week
                    if (!schedule.recurDW || schedule.recurDW.length === 0) schedule.recurDW = [ 1, 2, 3, 4, 5, 6, 7 ];

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
                        // Get schedule overrides if they exist
                        try {
                            var scheduleOverrides = this.schedule.db(function () {
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

                        // If there are schedule overrides, process schedule with highest priority schedule override according to scheduleCompare.
                        // Otherwise, process main calendar event with the main schedule.
                        if (tempSchedules.length > 0) {
                            tempSchedules.sort(scheduleCompare);
                            _processRecord(tempCal, tempSchedules[ 0 ], eventStart);
                        } else {
                            _processRecord(calendar, schedule, eventStart);
                        }
                    }
                }
            });
        });

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

        return events.sort(compare);
    }

    // Return an array of programming that is allowed to be on the air right now
    whatShouldBePlaying (automationOnly = false) {
        var events = this.getEvents(undefined, undefined, { active: true });
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

            return returnData;
        } else {
            return [];
        }
    }

    // Check if an event will override other events or get overridden by other events.
    // This should ALWAYS be run before adding calendar or exceptions to the database, AFTER first running verify on the event object.
    checkConflicts (event) {

        // No conflict check necessary if there is no schedules or duration defined
        if ((!event.oneTime && !event.recurH) || !event.duration || event.duration <= 0) return { overridden: [], overriding: [] };

        var schedule;
        var _event;

        // Get the original calendar event and schedule if applicable, and polyfill into event.
        if (event.calendarID) {

            var calendar = this.calendar.db({ ID: event.calendarID }).first();
            if (!calendar)
                return false;

            if (event.scheduleID) {
                schedule = this.schedule.db({ ID: event.scheduleID }).first();
                if (!schedule)
                    return false;
            }

            if (schedule) {
                var tempCal = Object.assign({}, calendar);
                for (var stuff in schedule) {
                    if (Object.prototype.hasOwnProperty.call(schedule, stuff)) {
                        if (typeof schedule[ stuff ] !== 'undefined' && schedule[ stuff ] !== null)
                            tempCal[ stuff ] = schedule[ stuff ];
                    }
                }
                _event = this.processRecord(tempCal, event, event.newTime ? event.newTime : event.originalTime);
            } else {
                _event = this.processRecord(calendar, event, event.newTime ? event.newTime : event.originalTime);
            }
        } else {
            _event = this.processRecord(event, { calendarID: null }, moment().toISOString(true));
        }

        var eventPriority = _event.priority;

        // No conflict check if the priority is less than 0.
        if (eventPriority < 0) return { overridden: [], overriding: [] };

        var error;

        // Define ordering functions to order by time.
        var compare = function (a, b) {
            try {
                if (moment(a).valueOf() < moment(b).valueOf()) { return -1 }
                if (moment(a).valueOf() > moment(b).valueOf()) { return 1 }
                return 0
            } catch (e) {
                console.error(e)
            }
        }
        var compareReverse = function (a, b) {
            try {
                if (moment(b).valueOf() < moment(a).valueOf()) { return -1 }
                if (moment(b).valueOf() > moment(a).valueOf()) { return 1 }
                return 0
            } catch (e) {
                console.error(e)
            }
        }
        var compareOriginalTime = function (a, b) {
            try {
                if (moment(a.originalTime).valueOf() < moment(b.originalTime).valueOf()) { return -1 }
                if (moment(a.originalTime).valueOf() > moment(b.originalTime).valueOf()) { return 1 }
                return 0
            } catch (e) {
                console.error(e)
            }
        }

        // Determine time to start searching for conflicts based on logic, which could include earliest oneTime time.
        if (_event.oneTime && _event.oneTime.length > 0)
            _event.oneTime = _event.oneTime.sort(compare);
        var _start = moment(_event.newTime || _event.originalTime || (_event.startDate && _event.recurH ? _event.startDate : undefined) || (_event.oneTime && _event.oneTime[ 0 ] ? _event.oneTime[ 0 ] : undefined) || _event.startDate).toISOString(true);

        // Now determine end time
        if (_event.oneTime && _event.oneTime.length > 0)
            _event.oneTime = _event.oneTime.sort(compareReverse);
        var end = _event.endDate ? moment(_event.endDate).toISOString(true) : moment(_event.newTime || (_event.oneTime && _event.oneTime[ 0 ] ? _event.oneTime[ 0 ] : undefined) || _event.start).add(_event.duration, 'minutes').toISOString(true);

        // No conflict check if this event is a canceled type
        if (event.scheduleType === 'canceled' || event.scheduleType === 'canceled-system' || event.scheduleType === 'canceled-changed') return { overridden: [], overriding: [] };

        // Function to run on recurring schedules to check for conflicts.
        var checkConflictingTime = (start, eventsb) => {
            var beginAt = start;

            // Null value denote all values for Days of Week
            if (!event.recurDW || event.recurDW.length === 0) event.recurDW = [ 1, 2, 3, 4, 5, 6, 7 ];

            // Format minute into an array for proper processing in later.js
            if (!event.recurM) event.recurM = 0;

            // Generate later schedule
            var laterSchedule = later.schedule({ schedules: [ { "dw": event.recurDW, "h": event.recurH, "m": [ event.recurM ] } ] });

            // Check for conflicting recurring schedule times. Return some data if a conflict is determined.
            while (moment(beginAt).isBefore(moment(end).add(1, 'days').startOf('day'))) {
                var eventStart = moment(laterSchedule.next(1, beginAt)).toISOString(true);
                if (!eventStart) break;
                beginAt = moment(eventStart).add(1, 'minutes');

                var eventEnd = moment(eventStart).add(event.duration, 'minutes');

                if ((moment(eventEnd).isAfter(moment(eventsb.start)) && moment(eventEnd).isSameOrBefore(moment(eventsb.end))) || (moment(eventStart).isSameOrAfter(eventsb.start) && moment(eventStart).isBefore(eventsb.end)) || (moment(eventStart).isBefore(eventsb.start) && moment(eventEnd).isAfter(eventsb.end))) {
                    if ((!event.scheduleType || event.scheduleType === 'unscheduled') && event.calendarID === eventsb.calendarID)
                        throw new Error("ALREADY_SCHEDULED");
                    return { originalTime: eventStart, scheduleID: eventsb.scheduleID };
                }
            }
            return false;
        }


        // Get events between start and end.
        var events = this.getEvents(moment(_start).subtract(1, 'days').toISOString(true), end, { active: true });

        // Start with events that will get overridden by this event
        var eventsOverridden = events
            .filter((eventb) => {
                if (eventb.scheduleOverrideID === event.scheduleID) return false; // Ignore events overriding this schedule; we are probably undoing later schedules

                // Ignore events that are already canceled or no longer active
                if (eventb.scheduleType === 'canceled' || eventb.scheduleType === 'canceled-system' || eventb.scheduleType === 'canceled-changed') return false;

                // Ignore events that will get updated by this one
                if ((event.scheduleType === 'updated' || event.scheduleType === 'updated-system') && event.calendarID === eventb.calendarID && moment(event.originalTime).isSame(eventb.start, 'minute')) return false;

                var eventbPriority = eventb.priority || eventb.priority === 0 ? eventb.priority : this.getDefaultPriority(eventb);

                if (eventbPriority < 0) return false; // Will not get overridden if other event priority is less than 0
                if (eventPriority === 0) return false; // Will not get overridden if this event's priority is 0.
                if (eventbPriority > 0 && eventbPriority < eventPriority) return true; // WILL get overridden if other event's priority is less than this one.
                return false;
            });

        var conflicts = [];
        var temp;

        // If a newTime is specified, check for conflicts on that.
        if (event.newTime) {
            var startb = moment(event.newTime || event.oneTime);
            var endb = moment(event.newTime || event.oneTime).add(_event.duration, 'minutes');

            temp = eventsOverridden
                .filter((eventb) => (moment(eventb.end).isAfter(moment(startb)) && moment(eventb.end).isSameOrBefore(moment(endb))) || (moment(eventb.start).isSameOrAfter(startb) && moment(eventb.start).isBefore(endb)) || (moment(eventb.start).isBefore(startb) && moment(eventb.end).isAfter(endb)))
                .map((eventsb) => {
                    eventsb.originalTime = moment(startb).toISOString(true);
                    return eventsb;
                });

            if (temp.length > 0) {
                conflicts = conflicts.concat(temp);
            }
        }

        // If oneTime stamps are specified, check those.
        if (event.oneTime) {
            event.oneTime.map((time) => {
                var startb = moment(time);
                var endb = moment(time).add(_event.duration, 'minutes');

                temp = eventsOverridden
                    .filter((eventb) => (moment(eventb.end).isAfter(moment(startb)) && moment(eventb.end).isSameOrBefore(moment(endb))) || (moment(eventb.start).isSameOrAfter(startb) && moment(eventb.start).isBefore(endb)) || (moment(eventb.start).isBefore(startb) && moment(eventb.end).isAfter(endb)))
                    .map((eventsb) => {
                        eventsb.originalTime = moment(startb).toISOString(true);
                        return eventsb;
                    });

                if (temp.length > 0) {
                    conflicts = conflicts.concat(temp);
                }
            });

        }

        // If a recurring schedule is provided, check that.
        if (event.recurH && event.recurH.length > 0) {
            var startb = moment(event.startDate);

            temp = eventsOverridden
                .reduce((newArray = [], eventsb) => {
                    try {
                        var val = checkConflictingTime(startb, eventsb)
                        if (val) {
                            eventsb.originalTime = val.originalTime;
                            newArray.push(eventsb);
                        }
                        return newArray;
                    } catch (e) {
                        if (e.message === "ALREADY_SCHEDULED") {
                            error = "This event additional time slot cannot be scheduled; this event is already scheduled within the provided time slot."
                            return newArray;
                        } else {
                            throw e;
                        }
                    }
                }, []);

            if (temp.length > 0) {
                conflicts = conflicts.concat(temp);
            }
        }

        // Set new values
        eventsOverridden = conflicts;

        // Now, go through each event being overridden and determine cancellation versus show time update.
        eventsOverridden = eventsOverridden.map((eventb) => {
            var eventc = {
                calendarID: eventb.calendarID,
                scheduleID: eventb.scheduleID,
                overriddenID: null, // This should be set after adding initial schedule.
                type: eventb.type,
                hosts: eventb.hosts,
                name: eventb.name
            };
            var startdiff = moment(eventb.originalTime).diff(moment(eventb.start), 'minutes');
            var enddiff = moment(eventb.end).diff(moment(eventb.originalTime).add(_event.duration, 'minutes'), 'minutes');

            // The higher priority event starts 30 or more minutes after the event being checked and the differential is greater than the end time. 
            // Instead of a cancellation, just decrease show duration.
            if (startdiff >= 30 && startdiff >= enddiff) {
                eventc.scheduleType = "updated-system";
                eventc.scheduleReason = `An event with a higher priority (${_event.type}: ${_event.hosts} - ${_event.name}) was scheduled to start during this event's time block.`;
                eventc.originalTime = eventb.start;
                eventc.duration = startdiff;
            }
            // The event being checked ends 30 or more minutes after the higher priority event and the differential is greater than the start time.
            // Instead of a cancellation, just update show start time.
            else if (enddiff >= 30 && enddiff >= startdiff) {
                eventc.scheduleType = "updated-system";
                eventc.scheduleReason = `An event with a higher priority (${_event.type}: ${_event.hosts} - ${_event.name}) will run partially through this event's time block.`;
                eventc.originalTime = eventb.start;
                eventc.duration = enddiff;
                eventc.newTime = moment(eventb.originalTime).add(_event.duration, 'minutes').toISOString(true);
            }
            // If neither of the above conditions apply, the event being checked should be canceled.
            else {
                eventc.scheduleType = "canceled-system";
                eventc.scheduleReason = `An event with a higher priority (${_event.type}: ${_event.hosts} - ${_event.name}) is scheduled during this event's time block.`;
                eventc.originalTime = eventb.start;
            }
            return eventc;
        });

        // Now, check for events that will override this one
        var eventsOverriding = events
            .filter((eventb) => {
                if (eventb.scheduleOverrideID === event.scheduleID) return false; // Ignore events overriding this schedule; we are probably undoing later schedules
                
                // Ignore events that are already canceled or no longer active
                if (eventb.scheduleType === 'canceled' || eventb.scheduleType === 'canceled-system' || eventb.scheduleType === 'canceled-changed') return false;

                // Ignore events that will get updated by this one
                if ((event.scheduleType === 'updated' || event.scheduleType === 'updated-system') && event.calendarID === eventb.calendarID && moment(event.originalTime).isSame(eventb.start, 'minute')) return false;

                var eventbPriority = eventb.priority || eventb.priority === 0 ? eventb.priority : this.getDefaultPriority(eventb);

                if (eventbPriority < 0) return false; // Will not override if the other event's priority is less than 0.
                if (eventPriority === 0 && eventbPriority === 0) return true; // WILL override if both this event and the other event's priority is 0.
                if (eventPriority === 0 && eventbPriority !== 0) return false // Will NOT override if this event's priority is 0 but the other event is not priority 0.
                if (eventbPriority > 0 && eventbPriority >= eventPriority) return true; // WILL override if the other event's priority is greater than or equal to this one.
                return false;
            });

        var conflicts = [];
        var temp;

        // Check for newTime conflicts if specified
        if (event.newTime) {
            var startb = moment(event.newTime || event.oneTime);
            var endb = moment(event.newTime || event.oneTime).add(_event.duration, 'minutes');

            temp = eventsOverriding
                .filter((eventb) => (moment(eventb.end).isAfter(moment(startb)) && moment(eventb.end).isSameOrBefore(moment(endb))) || (moment(eventb.start).isSameOrAfter(startb) && moment(eventb.start).isBefore(endb)) || (moment(eventb.start).isBefore(startb) && moment(eventb.end).isAfter(endb)))
                .map((eventb) => {
                    eventb.originalTime = moment(startb).toISOString(true);
                    return eventb;
                })

            if (temp.length > 0)
                conflicts = conflicts.concat(temp);
        }

        // Check for oneTime times if specified
        if (event.oneTime) {
            event.oneTime.map((time) => {
                var startb = moment(time);
                var endb = moment(time).add(_event.duration, 'minutes');

                temp = eventsOverriding
                    .filter((eventb) => (moment(eventb.end).isAfter(moment(startb)) && moment(eventb.end).isSameOrBefore(moment(endb))) || (moment(eventb.start).isSameOrAfter(startb) && moment(eventb.start).isBefore(endb)) || (moment(eventb.start).isBefore(startb) && moment(eventb.end).isAfter(endb)))
                    .map((eventb) => {
                        eventb.originalTime = moment(startb).toISOString(true);
                        return eventb;
                    });

                if (temp.length > 0)
                    conflicts = conflicts.concat(temp);
            });
        }

        // Check for recurring schedule conflicts if specified
        if (event.recurH && event.recurH.length > 0) {
            temp = eventsOverriding
                .reduce((newArray = [], eventsb) => {
                    try {
                        var startb = moment(eventsb.startDate);
                        var val = checkConflictingTime(startb, eventsb)
                        if (val) {
                            eventsb.originalTime = val.originalTime;
                            newArray.push(eventsb);
                        }
                        return newArray;
                    } catch (e) {
                        if (e.message === "ALREADY_SCHEDULED") {
                            error = "This event additional time slot cannot be scheduled; this event is already scheduled within the provided time slot."
                            return newArray;
                        } else {
                            throw e;
                        }
                    }
                }, []);

            if (temp.length > 0)
                conflicts = conflicts.concat(temp);
        }

        // Set value
        eventsOverriding = conflicts;

        // Now, determine for each event override if we should cancel or update.
        // Also, this translates the overriding event objects into the current event with exceptions applied.
        eventsOverriding = eventsOverriding.map((eventb) => {
            var eventc = {
                calendarID: _event.calendarID,
                scheduleID: _event.scheduleID,
                overriddenID: eventb.scheduleID,
                type: _event.type,
                hosts: _event.hosts,
                name: _event.name
            };
            var startdiff = moment(eventb.start).diff(moment(eventb.originalTime), 'minutes');
            var enddiff = moment(eventb.originalTime).add(_event.duration, 'minutes').diff(moment(eventb.end), 'minutes');

            // The higher priority event starts 30 or more minutes after the event being checked and the differential is greater than the end time. 
            // Instead of a cancellation, just decrease show duration.
            if (startdiff >= 30 && startdiff >= enddiff) {
                eventc.scheduleType = "updated-system";
                eventc.scheduleReason = `An event with an equal or higher priority (${eventb.type}: ${eventb.hosts} - ${eventb.name}) was scheduled to start during this event's time block.`;
                eventc.originalTime = eventb.originalTime;
                eventc.duration = startdiff;
            }
            // The event being checked ends 30 or more minutes after the higher priority event and the differential is greater than the start time.
            // Instead of a cancellation, just update show start time.
            else if (enddiff >= 30 && enddiff >= startdiff) {
                eventc.scheduleType = "updated-system";
                eventc.scheduleReason = `An event with an equal or higher priority (${eventb.type}: ${eventb.hosts} - ${eventb.name}) will run partially through this event's time block.`;
                eventc.originalTime = eventb.originalTime;
                eventc.duration = enddiff;
                eventc.newTime = moment(eventb.end).toISOString(true);
            }
            // If neither of the above conditions apply, the event being checked should be canceled.
            else {
                eventc.scheduleType = "canceled-system";
                eventc.scheduleReason = `An event with an equal or higher priority (${eventb.type}: ${eventb.hosts} - ${eventb.name}) is scheduled during this event's time block.`;
                eventc.originalTime = eventb.originalTime;
            }
            return eventc;
        });

        return { overridden: eventsOverridden.sort(compareOriginalTime), overriding: eventsOverriding.sort(compareOriginalTime), error };
    }

    // Returns an array of office-hours for directors who should be in the office right now.
    whoShouldBeIn () {
        var events = this.getEvents(undefined, undefined, { active: true });
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

            return events;
        } else {
            return [];
        }
    }

    // Check for validity of an event object. 
    // This should ALWAYS be run before adding calendar or exceptions to the database.
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

        return { event, tempCal };
    }

    // Conflict detection: -1 = no conflict detection. 0 = no conflict detection except other 0 priorities. 1-10, conflict detection with priorities same or lower (except for -1 and 0).
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
            default:
                return "#6c757d";
        }
    }

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
            priority: schedule.priority || schedule.priority === 0 ? schedule.priority : (calendar.priority || calendar.priority === 0 ? calendar.priority : this.getDefaultPriority(calendar)), // Priority of the event. -1 = no conflict detection. 0 and up = overridden by any events scheduled that have the same or higher priority.
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
            recurDW: schedule.recurDW || calendar.recurDW, // Array of days of the week (1-7) to execute this event
            recurH: schedule.recurH || calendar.recurH, // Array of hours of the day to execute this event
            recurM: schedule.recurM || schedule.recurM === 0 ? schedule.recurM : (calendar.recurM || calendar.recurM === 0 ? calendar.recurM : null), // The minute of the hour at which to execute the event
            startDate: schedule.startDate || calendar.startDate ? moment(schedule.startDate || calendar.startDate).startOf('day').toISOString(true) : null, // Date the event starts
            endDate: schedule.endDate || calendar.endDate ? moment(schedule.endDate || calendar.endDate).startOf('day').toISOString(true) : null, // Date the event ends (exclusive).
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
}

// If using Node.js, export as a module
if (typeof require !== 'undefined')
    module.exports = CalendarDb;