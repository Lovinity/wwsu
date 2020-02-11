// Require libraries if necessary. Because this script runs both in browser and in node, we need to cover both methods of including scripts.

// Node require
if (typeof require !== 'undefined') {
    if (typeof TAFFY === 'undefined') {
        var TAFFY = require('./taffy-min.js').taffy;
    }

    if (typeof WWSUdb === 'undefined') {
        var WWSUdb = require('./wwsu.js').WWSUdb;
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
        $.loadScript('./taffy-min.js');
    }

    if (typeof WWSUdb === 'undefined') {
        $.loadScript('./wwsu.js');
    }

    if (typeof later === 'undefined') {
        $.loadScript('./later.min.js');
    }

    if (typeof moment === 'undefined') {
        $.loadScript('./moment.min.js');
    }
} else if (typeof TAFFY === 'undefined' || typeof WWSUdb === 'undefined' || typeof later === 'undefined' || typeof moment === 'undefined') {
    console.error(new Error('wwsu-calendar requires TAFFY, WWSUdb, later, and moment. However, neither node.js require() nor JQuery were available to require the scripts.'));
}

// Use local time instead of UTC for scheduling
later.date.localTime()

// Class to manage calendar events for WWSU
class CalendarDb {

    // Constructor stores initial calendar and calendarexceptions DB row arrays into TAFFYDB.
    constructor(calendar = [], calendarexceptions = []) {
        this.calendar = new WWSUdb(TAFFY());
        this.calendarexceptions = new WWSUdb(TAFFY());
        this.calendar.db.insert(calendar);
        this.calendarexceptions.db.insert(calendarexceptions);
    }

    // Change the data in the in-memory database
    query (db, data, replace = false) {
        switch (db) {
            case 'calendar':
                this.calendar.query(data, replace);
                break;
            case 'calendarexceptions':
                this.calendarexceptions.query(data, replace);
                break;
        }
    }

    // Get an array of upcoming events based on provided criteria
    getEvents (start = moment().subtract(1, 'days').toISOString(true), end = moment().add(1, 'days').toISOString(true), query = {}) {
        var events = [];

        // Extension of this.processRecord to also determine if the event falls within the start and end times.
        var _processRecord = (calendar, exception, eventStart) => {
            var criteria = this.processRecord(calendar, exception, eventStart);

            // This event is within our time range if one or more of the following is true:
            // A. Calendar event start is same or before generated event start.
            // B. Calendar event end is same or after generated event start.
            // C. The event end time is between start and end.
            // D. The event start time is between start and end.
            // E. The event start time is before start, and the event end time is after end.
            if ((calendar.start !== null && moment(calendar.start).isAfter(moment(criteria.start))) || (calendar.end !== null && moment(calendar.end).isBefore(moment(criteria.start)))) {

            } else {
                if ((moment(criteria.end).isAfter(moment(start)) && moment(criteria.end).isSameOrBefore(moment(end))) || (moment(criteria.start).isSameOrAfter(start) && moment(criteria.start).isBefore(end)) || (moment(criteria.start).isBefore(start) && moment(criteria.end).isAfter(end))) {
                    events.push(criteria);
                }
            }
        }

        var results = this.calendar.db(query).get();

        results.map((calendar, index) => {

            var beginAt = start;
            var exceptionIDs = [];

            var exceptionCompare = (a, b) => {
                if (a.exceptionType === 'canceled' && b.exceptionType !== 'canceled') return -1;
                if (b.exceptionType === 'canceled' && a.exceptionType !== 'canceled') return 1;
                if (a.exceptionType === 'canceled-system' && b.exceptionType !== 'canceled-system') return -1;
                if (b.exceptionType === 'canceled-system' && a.exceptionType !== 'canceled-system') return 1;
                if (a.exceptionType === 'updated' && b.exceptionType !== 'updated') return -1;
                if (b.exceptionType === 'updated' && a.exceptionType !== 'updated') return 1;
                if (a.exceptionType === 'updated-system' && b.exceptionType !== 'updated-system') return -1;
                if (b.exceptionType === 'updated-system' && a.exceptionType !== 'updated-system') return 1;
                if (a.exceptionType === 'canceled-changed' && b.exceptionType !== 'canceled-changed') return -1;
                if (b.exceptionType === 'canceled-changed' && a.exceptionType !== 'canceled-changed') return 1;
                return 0;
            }

            // Recurring calendar events

            // For events with null schedule or duration of 0, we only want to process "additional" exceptions and any exceptions to the additional exceptions; ignore the main event.
            if (calendar.schedule === null || calendar.duration <= 0) {
                var tempExceptions = [];
                var exceptionIDs = [];
                calendar.duration = 0; // Force no duration for empty schedule events.

                // Process additional exceptions
                var calendarb = this.calendarexceptions.db({ calendarID: calendar.ID, exceptionType: [ 'additional', 'additional-unscheduled' ] }).get();
                if (calendarb.length > 0) {
                    // Loop through each additional exception
                    calendarb.map((cal, ind) => {
                        var tempExceptions = [];

                        // Get exceptions to the additional exception if they exist
                        try {
                            var exceptions = this.calendarexceptions.db(function () {
                                return this.calendarID === calendar.ID && this.exceptionType !== 'additional' && this.exceptionType !== 'additional-unscheduled';
                            }).get() || [];
                            if (exceptions.length > 0) {
                                exceptions.map((exc) => {
                                    exceptionIDs.push(cal.ID);
                                    exceptionIDs.push(exc.ID);

                                    // For updated records, add a canceled-changed record into the events so people know the original time was changed.
                                    if (["updated", "updated-system"].indexOf(exc.exceptionType) !== -1 && exc.newTime !== null) {
                                        _processRecord(cal, {calendarID: calendar.ID, exceptionID: cal.ID, exceptionType: 'canceled-changed', exceptionReason: `Rescheduled to ${moment(exc.newTime).format("lll")}`}, exc.exceptionTime);
                                    }

                                    tempExceptions.push(Object.assign(exc, { exceptionID: cal.ID }));
                                })
                            }
                        } catch (e) {
                            var tempExceptions = [];
                        }

                        var tempCal = Object.assign({}, calendar);
                        for (var stuff in cal) {
                            if (Object.prototype.hasOwnProperty.call(cal, stuff)) {
                                if (cal[ stuff ] !== null)
                                    tempCal[ stuff ] = cal[ stuff ];
                            }
                        }
                        Object.assign(tempCal, {
                            ID: calendar.ID,
                            start: calendar.start || calendar.createdAt,
                            schedule: {
                                oneTime: calendar.start || calendar.createdAt
                            }
                        });
                        if (tempExceptions.length > 0) {
                            tempExceptions.sort(exceptionCompare);
                            _processRecord(tempCal, tempExceptions[ 0 ], calendar.start || calendar.createdAt);
                        } else {
                            _processRecord(tempCal, {
                                exceptionType: cal.exceptionType,
                                ID: cal.ID,
                                calendarID: cal.calendarID,
                                exceptionReason: cal.exceptionReason,
                                exceptionTime: cal.exceptionTime,
                                newTime: cal.newTime
                            }, calendar.start || calendar.createdAt);
                        }
                    });
                }
            } else if (calendar.schedule.schedules) {
                // No dice if there is no schedules parameter or if there is no record at index 0
                if (!calendar.schedule.schedules[ 0 ]) return null;

                // Set defaults in schedule if they don't exist for hour, minute, and second
                calendar.schedule.schedules.map((schedule, index) => {
                    if (!schedule.h)
                        calendar.schedule.schedules[ index ].h = [ 0 ];
                    if (!schedule.m)
                        calendar.schedule.schedules[ index ].m = [ 0 ];
                    if (!schedule.s)
                        calendar.schedule.schedules[ index ].s = [ 0 ];
                })


                // Generate later schedule
                var schedule = later.schedule(calendar.schedule);

                // Loop through each schedule
                while (moment(beginAt).isBefore(moment(end))) {
                    var tempExceptions = [];
                    var eventStart = moment(schedule.next(1, beginAt)).toISOString(true);
                    if (!eventStart || eventStart === null) break;
                    beginAt = moment(eventStart).add(1, 'minute').toISOString(true);


                    // Get exceptions if they exist
                    try {
                        var exceptions = this.calendarexceptions.db(function () {
                            return this.calendarID === calendar.ID && this.exceptionType !== 'additional' && this.exceptionType !== 'additional-unscheduled' && this.exceptionTime !== null && moment(this.exceptionTime).isSame(moment(eventStart), 'minute');
                        }).get() || [];
                        if (exceptions.length > 0) {
                            exceptions.map((exc) => {
                                exceptionIDs.push(exc.ID);
                                tempExceptions.push(exc);

                                // For updated records, add a canceled-changed record into the events so people know the original time was changed.
                                if (["updated", "updated-system"].indexOf(exc.exceptionType) !== -1 && exc.newTime !== null) {
                                    _processRecord(calendar, {calendarID: calendar.ID, exceptionType: 'canceled-changed', exceptionReason: `Rescheduled to ${moment(exc.newTime).format("lll")}`}, exc.exceptionTime);
                                }
                            })
                        }
                    } catch (e) {
                        console.error(e);
                    }

                    if (tempExceptions.length > 0) {
                        tempExceptions.sort(exceptionCompare);
                        _processRecord(calendar, tempExceptions[ 0 ], eventStart);
                    } else {
                        _processRecord(calendar, {}, eventStart);
                    }
                }

                // Process additional exceptions
                var calendarb = this.calendarexceptions.db({ calendarID: calendar.ID, exceptionType: [ 'additional', 'additional-unscheduled' ] }).get();
                if (calendarb.length > 0) {
                    // Loop through each additional exception
                    calendarb.map((cal, ind) => {
                        var tempExceptions = [];
                        var eventStart = moment(cal.newTime || cal.exceptionTime).toISOString(true);

                        // Get exceptions to the additional exception if they exist
                        try {
                            var exceptions = this.calendarexceptions.db(function () {
                                return this.calendarID === calendar.ID && this.exceptionType !== 'additional' && this.exceptionType !== 'additional-unscheduled' && this.exceptionTime !== null && moment(this.exceptionTime).isSame(moment(eventStart), 'minute');
                            }).get() || [];
                            if (exceptions.length > 0) {
                                exceptions.map((exc) => {
                                    exceptionIDs.push(cal.ID);
                                    exceptionIDs.push(exc.ID);

                                    // For updated records, add a canceled-changed record into the events so people know the original time was changed.
                                    if (["updated", "updated-system"].indexOf(exc.exceptionType) !== -1 && exc.newTime !== null) {
                                        _processRecord(cal, {calendarID: calendar.ID, exceptionID: cal.ID, exceptionType: 'canceled-changed', exceptionReason: `Rescheduled to ${moment(exc.newTime).format("lll")}`}, exc.exceptionTime);
                                    }

                                    tempExceptions.push(Object.assign(exc, { exceptionID: cal.ID }));
                                })
                            }
                        } catch (e) {
                            var tempExceptions = [];
                        }

                        var tempCal = Object.assign({}, calendar);
                        for (var stuff in cal) {
                            if (Object.prototype.hasOwnProperty.call(cal, stuff)) {
                                if (cal[ stuff ] !== null)
                                    tempCal[ stuff ] = cal[ stuff ];
                            }
                        }
                        Object.assign(tempCal, {
                            ID: calendar.ID,
                            start: eventStart,
                            schedule: {
                                oneTime: eventStart
                            }
                        });
                        if (tempExceptions.length > 0) {
                            tempExceptions.sort(exceptionCompare);
                            _processRecord(tempCal, tempExceptions[ 0 ], eventStart);
                        } else {
                            _processRecord(tempCal, {
                                exceptionType: cal.exceptionType,
                                ID: cal.ID,
                                calendarID: cal.calendarID,
                                exceptionReason: cal.exceptionReason,
                                exceptionTime: cal.exceptionTime,
                                newTime: cal.newTime
                            }, eventStart);
                        }
                    });
                }

            } else if (calendar.schedule.oneTime) { // One-time events
                // Get exception if it exists
                try {
                    var tempExceptions = [];
                    var exceptionIDs = [];
                    // Get exceptions if they exist
                    var exceptions = this.calendarexceptions.db(function () {
                        return this.calendarID === calendar.ID && this.exceptionType !== 'additional' && this.exceptionType !== 'additional-unscheduled' && this.exceptionTime !== null && moment(this.exceptionTime).isSame(moment(calendar.schedule.oneTime), 'minute');
                    }).get() || [];
                    if (exceptions.length > 0) {
                        exceptions.map((exc) => {
                            exceptionIDs.push(exc.ID);
                            tempExceptions.push(exc);

                            // For updated records, add a canceled-changed record into the events so people know the original time was changed.
                            if (["updated", "updated-system"].indexOf(exc.exceptionType) !== -1 && exc.newTime !== null) {
                                _processRecord(calendar, {calendarID: calendar.ID, exceptionType: 'canceled-changed', exceptionReason: `Rescheduled to ${moment(exc.newTime).format("lll")}`}, exc.exceptionTime);
                            }
                        })
                    }
                } catch (e) {
                    console.error(e);
                }

                if (tempExceptions.length > 0) {
                    tempExceptions.sort(exceptionCompare);
                    _processRecord(calendar, tempExceptions[ 0 ], calendar.schedule.oneTime);
                } else {
                    _processRecord(calendar, {}, calendar.schedule.oneTime);
                }

                // Process additional exceptions
                var calendarb = this.calendarexceptions.db({ calendarID: calendar.ID, exceptionType: [ 'additional', 'additional-unscheduled' ] }).get();
                if (calendarb.length > 0) {
                    // Loop through each additional exception
                    calendarb.map((cal, ind) => {
                        var tempExceptions = [];

                        // Get exceptions to the additional exception if they exist
                        try {
                            var exceptions = this.calendarexceptions.db(function () {
                                return this.calendarID === calendar.ID && this.exceptionType !== 'additional' && this.exceptionType !== 'additional-unscheduled' && this.exceptionTime !== null && moment(this.exceptionTime).isSame(moment(calendar.schedule.oneTime), 'minute');
                            }).get() || [];
                            if (exceptions.length > 0) {
                                exceptions.map((exc) => {
                                    exceptionIDs.push(cal.ID);
                                    exceptionIDs.push(exc.ID);

                                    // For updated records, add a canceled-changed record into the events so people know the original time was changed.
                                    if (["updated", "updated-system"].indexOf(exc.exceptionType) !== -1 && exc.newTime !== null) {
                                        _processRecord(cal, {calendarID: calendar.ID, exceptionID: cal.ID, exceptionType: 'canceled-changed', exceptionReason: `Rescheduled to ${moment(exc.newTime).format("lll")}`}, exc.exceptionTime);
                                    }

                                    tempExceptions.push(Object.assign(exc, { exceptionID: cal.ID }));
                                })
                            }
                        } catch (e) {
                            var tempExceptions = [];
                        }

                        var tempCal = Object.assign({}, calendar);
                        for (var stuff in cal) {
                            if (Object.prototype.hasOwnProperty.call(cal, stuff)) {
                                if (cal[ stuff ] !== null)
                                    tempCal[ stuff ] = cal[ stuff ];
                            }
                        }
                        Object.assign(tempCal, {
                            ID: calendar.ID,
                            start: calendar.schedule.oneTime,
                            schedule: {
                                oneTime: calendar.schedule.oneTime
                            }
                        });
                        if (tempExceptions.length > 0) {
                            tempExceptions.sort(exceptionCompare);
                            _processRecord(tempCal, tempExceptions[ 0 ], calendar.schedule.oneTime);
                        } else {
                            _processRecord(tempCal, {
                                exceptionType: cal.exceptionType,
                                ID: cal.ID,
                                calendarID: cal.calendarID,
                                exceptionReason: cal.exceptionReason,
                                exceptionTime: cal.exceptionTime,
                                newTime: cal.newTime
                            }, calendar.schedule.oneTime);
                        }
                    });
                }
            }
        })

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

                    if (event.exceptionType === 'canceled' || event.exceptionType === 'canceled-system' || event.exceptionType === 'canceled-changed') return false;

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

        // TODO: account for "updated" event exception types

        // No conflict check necessary of schedule is null and newTime is not provided
        if ((!event.schedule || event.schedule === null) && !event.newTime) return { overridden: [], overriding: [] };

        if (event.calendarID) {
            var calendar = this.calendar.db({ ID: event.calendarID }).first();
            if (!calendar)
                return false;
            var _event = this.processRecord(calendar, event, event.newTime !== null ? event.newTime : event.exceptionTime);
        } else {
            var _event = this.processRecord(event, { calendarID: null }, moment().toISOString(true));
        }

        var eventPriority = _event.priority;
        var error;
        var end = event.end && event.end !== null ? moment(event.end).toISOString(true) : moment(event.newTime || (event.schedule && event.schedule.oneTime ? event.schedule.oneTime : undefined) || event.start).add(_event.duration, 'minutes').toISOString(true);

        // No conflict check if the priority is less than 0.
        if (eventPriority < 0) return { overridden: [], overriding: [] };

        // No conflict check if this event is a canceled type exception
        if (event.exceptionType === 'canceled' || event.exceptionType === 'canceled-system' || event.exceptionType === 'canceled-changed') return { overridden: [], overriding: [] };

        var checkConflictingTime = (start, eventsb) => {
            var beginAt = start;

            if (!event.schedule.schedules[ 0 ]) return false;

            event.schedule.schedules.map((schedule, index) => {
                if (!schedule.h)
                    event.schedule.schedules[ index ].h = [ 0 ];
                if (!schedule.m)
                    event.schedule.schedules[ index ].m = [ 0 ];
                if (!schedule.s)
                    event.schedule.schedules[ index ].s = [ 0 ];
            });

            var schedule = later.schedule(event.schedule);

            while (moment(beginAt).isBefore(moment(end).add(1, 'days').startOf('day'))) {
                var eventStart = moment(schedule.next(1, beginAt)).toISOString(true);
                if (!eventStart || eventStart === null) break;
                beginAt = moment(eventStart).add(1, 'minutes');

                var eventEnd = moment(eventStart).add(event.duration, 'minutes');

                if ((moment(eventEnd).isAfter(moment(eventsb.start)) && moment(eventEnd).isSameOrBefore(moment(eventsb.end))) || (moment(eventStart).isSameOrAfter(eventsb.start) && moment(eventStart).isBefore(eventsb.end)) || (moment(eventStart).isBefore(eventsb.start) && moment(eventEnd).isAfter(eventsb.end))) {
                    if ((event.exceptionType === 'additional' || event.exceptionType === 'additional-unscheduled' || event.exceptionType === null) && event.calendarID === eventsb.calendarID)
                        throw new Error("ALREADY_SCHEDULED");
                    return eventStart;
                }
            }
            return false;
        }

        var events = this.getEvents(moment(event.newTime || event.exceptionTime || event.schedule.oneTime || event.start).subtract(1, 'days').toISOString(true), end, { active: true });

        // Start with events that will get overridden by this event
        var eventsOverridden = events
            .filter((eventb) => {
                // Ignore events that are already canceled or no longer active
                if (eventb.exceptionType === 'canceled' || eventb.exceptionType === 'canceled-system' || eventb.exceptionType === 'canceled-changed') return false;

                // Ignore events that will get updated by this one
                if ((event.exceptionType === 'updated' || event.exceptionType === 'updated-system') && event.calendarID === eventb.calendarID && moment(event.exceptionTime).isSame(eventb.start, 'minute')) return false;

                var eventbPriority = eventb.priority !== null ? eventb.priority : this.getDefaultPriority(eventb);

                if (eventbPriority < 0) return false; // Will not get overridden if other event priority is less than 0
                if (eventPriority === 0) return false; // Will not get overridden if this event's priority is 0.
                if (eventbPriority > 0 && eventbPriority < eventPriority) return true; // WILL get overridden if other event's priority is less than this one.
                return false;
            });

        if (event.newTime || event.schedule.oneTime) {
            var startb = moment(event.newTime || event.schedule.oneTime);
            var endb = moment(event.newTime || event.schedule.oneTime).add(_event.duration, 'minutes');

            eventsOverridden = eventsOverridden
                .filter((eventb) => (moment(eventb.end).isAfter(moment(startb)) && moment(eventb.end).isSameOrBefore(moment(endb))) || (moment(eventb.start).isSameOrAfter(startb) && moment(eventb.start).isBefore(endb)) || (moment(eventb.start).isBefore(startb) && moment(eventb.end).isAfter(endb)));
        } else if (event.schedule.schedules) {
            var startb = moment(event.start);

            eventsOverridden = eventsOverridden
                .reduce((newArray = [], eventsb) => {
                    try {
                        var val = checkConflictingTime(startb, eventsb)
                        if (val) {
                            eventsb.overrideTime = val;
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
                }, [])
        }

        // Now, check for events that will override this one
        var eventsOverriding = events
            .filter((eventb) => {

                // Ignore events that are already canceled or no longer active
                if (eventb.exceptionType === 'canceled' || eventb.exceptionType === 'canceled-system' || eventb.exceptionType === 'canceled-changed') return false;

                // Ignore events that will get updated by this one
                if ((event.exceptionType === 'updated' || event.exceptionType === 'updated-system') && event.calendarID === eventb.calendarID && moment(event.exceptionTime).isSame(eventb.start, 'minute')) return false;

                var eventbPriority = eventb.priority !== null ? eventb.priority : this.getDefaultPriority(eventb);

                if (eventbPriority < 0) return false; // Will not override if the other event's priority is less than 0.
                if (eventPriority === 0 && eventbPriority === 0) return true; // WILL override if both this event and the other event's priority is 0.
                if (eventPriority === 0 && eventbPriority !== 0) return false // Will NOT override if this event's priority is 0 but the other event is not priority 0.
                if (eventbPriority > 0 && eventbPriority >= eventPriority) return true; // WILL override if the other event's priority is greater than or equal to this one.
                return false;
            });

        if (event.newTime || event.schedule.oneTime) {
            var startb = moment(event.newTime || event.schedule.oneTime);
            var endb = moment(event.newTime || event.schedule.oneTime).add(event.duration, 'minutes');

            eventsOverriding = eventsOverriding
                .filter((eventb) => (moment(eventb.end).isAfter(moment(startb)) && moment(eventb.end).isSameOrBefore(moment(endb))) || (moment(eventb.start).isSameOrAfter(startb) && moment(eventb.start).isBefore(endb)) || (moment(eventb.start).isBefore(startb) && moment(eventb.end).isAfter(endb)))
                .map((eventb) => {
                    eventb.overrideTime = moment(startb).toISOString(true);
                    return eventb;
                })
        } else if (event.schedule.schedules) {
            var startb = moment(event.start);

            eventsOverriding = eventsOverriding
                .reduce((newArray = [], eventsb) => {
                    try {
                        var val = checkConflictingTime(startb, eventsb)
                        if (val) {
                            eventsb.overrideTime = val;
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
                }, [])
        }

        return { overridden: eventsOverridden, overriding: eventsOverriding, error };
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

                    if (event.exceptionType === 'canceled' || event.exceptionType === 'canceled-system' || event.exceptionType === 'canceled-changed') return false;

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

        // If calendarID is provided, we expect it to be a valid calendar ID.
        if (event.calendarID) {
            var calendar = this.calendar.db({ ID: event.calendarID }).first();
            if (!calendar)
                return false;
        }

        if (event.exceptionType) {
            // If no exceptionTime is provided to indicate the date/time this exception overrides, and type is not additional, this is an invalid event.
            if (!event.exceptionTime && event.exceptionType !== 'additional' && event.exceptionType !== 'additional-unscheduled') return false;

            // If exception type is additional and no newTime and/or duration provided, this is an invalid event.
            if ((!event.newTime || !event.duration) && (event.exceptionType === 'additional' || event.exceptionType === 'additional-unscheduled')) return false;
        } else {
            // If this is a main calendar event, it must have a schedules or a oneTime property in event.schedule if event.schedule is not null.
            if (event.schedule !== null && !event.schedule.schedules && !event.schedule.oneTime) return false;

            // If no duration is specified for a main calendar event, default to 0 (unscheduled).
            if (!event.duration) event.duration = 0;

            // If later.js schedules provided but no end time, this is an invalid event (will result in infinite loops when doing checks).
            if (event.schedule.schedules && (!event.end)) return false;

            // If later.js schedules provided but no start time, polyfill to the current time.
            if (event.schedule.schedules && (!event.start)) event.start = moment().toISOString(true);
        }

        return event;
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

    processRecord (calendar, exception, eventStart) {
        var criteria = {
            calendarID: calendar.ID || exception.calendarID, // ID of the main calendar event
            exceptionID: exception.ID || null, // ID of the exception record, if an exception was applied
            exceptionExceptionID: exception.exceptionID || null, // If this exception overrides an 'additional' type exception, this is the ID of the exception this exception overrides.
            exceptionType: exception.exceptionType || null, // If an exception is applied, this is the type (additional, additional-unscheduled, updated, updated-system, canceled, canceled-system)
            exceptionReason: exception.exceptionReason || null, // If an exception is applied, this is the provided reason for it.
            exceptionTime: exception.exceptionTime && exception.exceptionTime !== null ? moment(exception.exceptionTime).toISOString(true) : null, // If an exception is applied that overrides an event's start time, this is the event's original start time.
            type: exception.type && exception.type !== null ? exception.type : calendar.type, // Event type (show, remote, sports, prerecord, genre, playlist, event, onair-booking, prod-booking, office-hours)
            priority: exception.priority && exception.priority !== null ? exception.priority : (calendar.priority !== null ? calendar.priority : this.getDefaultPriority(calendar)), // Priority of the event. -1 = no conflict detection. 0 and up = overridden by any events scheduled that have the same or higher priority.
            active: calendar.active, // True if the event is active, false if it is not.
            eventID: exception.eventID && exception.eventID !== null ? exception.eventID : calendar.eventID, // ID of the radioDJ manual event to fire, for genre events
            playlistID: exception.playlistID && exception.playlistID !== null ? exception.playlistID : calendar.playlistID, // ID of the playlist to queue, for playlist and prerecord events.
            director: exception.director && exception.director !== null ? exception.director : calendar.director, // ID of the director, for office-hours events.
            hosts: exception.hosts && exception.hosts !== null ? exception.hosts : calendar.hosts || "Unknown Hosts", // String of host names based on director and/or DJ IDs.
            name: exception.name && exception.name !== null ? exception.name : calendar.name || "Unknown Event", // Name of event
            description: exception.description && exception.description !== null ? exception.description : calendar.description, // Description of event
            logo: exception.logo && exception.logo !== null ? exception.logo : calendar.logo, // URL to the event logo
            banner: exception.banner && exception.banner !== null ? exception.banner : calendar.banner, // URL to the event banner
            newTime: exception.newTime && exception.newTime !== null ? moment(exception.newTime).toISOString(true) : null, // If an exception is applied that overrides an event's start time, this is the event's new start time.
            start: exception.newTime && exception.newTime !== null ? moment(exception.newTime).toISOString(true) : moment(eventStart).toISOString(true), // Start time of the event
        }

        // Determine event color
        criteria.color = this.getColor(criteria);

        // Generate a unique string for this specific event time so we can differentiate recurring events easily.
        // Note: The start time in unique strings should be UTC to avoid Daylight Savings complications.
        // Format: calendarID_originalEventStartTime[_additionalExceptionID]. additionalExceptionID is only provided if we have an additional exception, or an exception of an additional exception, because additional exceptions should be treated as separate events.
        if (criteria.exceptionType === 'additional' || criteria.exceptionType === 'additional-unscheduled') {
            criteria.unique = `${criteria.calendarID}-${moment.utc(criteria.start).valueOf()}-${criteria.exceptionID}`;
        } else if (criteria.exceptionExceptionID !== null && criteria.exceptionTime !== null) {
            criteria.unique = `${criteria.calendarID}-${moment.utc(criteria.exceptionTime).valueOf()}-${criteria.exceptionExceptionID}`;
        } else if (criteria.exceptionTime === null) {
            criteria.unique = `${criteria.calendarID}-${moment.utc(criteria.start).valueOf()}`;
        } else {
            criteria.unique = `${criteria.calendarID}-${moment.utc(criteria.exceptionTime).valueOf()}`;
        }

        // If the host DJ for the exception is set, use the entire set of DJ hosts for the exception. Otherwise, use the set from the main calendar event.
        if (exception.hostDJ && exception.hostDJ !== null) {
            criteria.hostDJ = exception.hostDJ || null;
            criteria.cohostDJ1 = exception.cohostDJ1 || null;
            criteria.cohostDJ2 = exception.cohostDJ2 || null;
            criteria.cohostDJ3 = exception.cohostDJ3 || null;
        } else {
            criteria.hostDJ = calendar.hostDJ || null;
            criteria.cohostDJ1 = calendar.cohostDJ1 || null;
            criteria.cohostDJ2 = calendar.cohostDJ2 || null;
            criteria.cohostDJ3 = calendar.cohostDJ3 || null;
        }

        // Calculate end time after forming the object because we must refer to criteria.start
        criteria.end = exception.duration && exception.duration !== null ? moment(criteria.start).add(exception.duration, 'minutes').toISOString(true) : moment(criteria.start).add(calendar.duration, 'minutes').toISOString(true);

        // Calculate duration
        criteria.duration = moment(criteria.end).diff(moment(criteria.start), 'minutes');

        return criteria;
    }
}

// If using Node.js, export as a module
if (typeof require !== 'undefined')
    module.exports = CalendarDb;