/* global moment, later, TAFFY, iziToast */

// Require libraries if necessary
if (!TAFFY) {
    require('./taffy-min.js');
}

if (!later) {
    require('./later.min.js');
}

if (!moment) {
    require('./moment.min.js');
}

later.date.localTime()

// Class to manage calendar events for WWSU
class CalendarDb {

    // Constructor stores initial calendar and calendarexceptions DB row arrays into TAFFYDB.
    constructor(calendar = [], exceptions = []) {
        this.calendar = TAFFY();
        this.exceptions = TAFFY();
        this.calendar.insert(calendar);
        this.exceptions.insert(exceptions);
    }

    // Websocket function call for changes to Calendar
    processCalendar (data, replace = false) {
        try {
            if (replace) {
                // Replace with the new data
                this.calendar = TAFFY()
                this.calendar.insert(data)
            } else {
                for (var key in data) {
                    if (Object.prototype.hasOwnProperty.call(data, key)) {
                        switch (key) {
                            case 'insert':
                                this.calendar.insert(data[ key ])
                                break
                            case 'update':
                                this.calendar({ ID: data[ key ].ID }).update(data[ key ])
                                break
                            case 'remove':
                                this.calendar({ ID: data[ key ] }).remove()
                                break
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e)
            if (iziToast) {
                iziToast.show({
                    title: 'An error occurred - Please check the logs',
                    message: 'Error occurred during the processCalendar function in class CalendarDb.'
                })
            }
        }
    }

    // Websocket function call for changes to CalendarExceptions
    processExceptions (data, replace = false) {
        try {
            if (replace) {
                // Replace with the new data
                this.exceptions = TAFFY()
                this.exceptions.insert(data)
            } else {
                for (var key in data) {
                    if (Object.prototype.hasOwnProperty.call(data, key)) {
                        switch (key) {
                            case 'insert':
                                this.exceptions.insert(data[ key ])
                                break
                            case 'update':
                                this.exceptions({ ID: data[ key ].ID }).update(data[ key ])
                                break
                            case 'remove':
                                this.exceptions({ ID: data[ key ] }).remove()
                                break
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e)
            if (iziToast) {
                iziToast.show({
                    title: 'An error occurred - Please check the logs',
                    message: 'Error occurred during the processExceptions function in class CalendarDb.'
                })
            }
        }
    }

    // Get an array of upcoming events based on provided criteria
    getEvents (start = moment().startOf('day').toISOString(true), end = moment().add(1, 'days').startOf('day').toISOString(true), query = {}) {
        var events = [];

        // Function to process a single occurrence of an event with an exception if it exists
        var processRecord = (calendar, exception, eventStart) => {
            var criteria = {
                calendarID: calendar.ID,
                exceptionType: exception.exceptionType || null,
                exceptionID: exception.ID || null,
                exceptionReason: exception.exceptionReason || null,
                exceptionTime: exception.exceptionTime || null,
                type: exception.type && exception.type !== null ? exception.type : calendar.type,
                priority: exception.priority && exception.priority !== null ? exception.priority : (calendar.priority !== null ? calendar.priority : this.getDefaultPriority(calendar)),
                active: calendar.active,
                hostDJ: exception.hostDJ && exception.hostDJ !== null ? exception.hostDJ : calendar.hostDJ,
                cohostDJ1: exception.cohostDJ1 && exception.cohostDJ1 !== null ? exception.cohostDJ1 : calendar.cohostDJ1,
                cohostDJ2: exception.cohostDJ2 && exception.cohostDJ2 !== null ? exception.cohostDJ2 : calendar.cohostDJ2,
                cohostDJ3: exception.cohostDJ3 && exception.cohostDJ3 !== null ? exception.cohostDJ3 : calendar.cohostDJ3,
                name: exception.name && exception.name !== null ? exception.name : calendar.name,
                description: exception.description && exception.description !== null ? exception.description : calendar.description,
                logo: exception.logo && exception.logo !== null ? exception.logo : calendar.logo,
                banner: exception.banner && exception.banner !== null ? exception.banner : calendar.banner,
                start: exception.newTime && exception.newTime !== null ? moment(exception.newTime).toISOString(true) : moment(eventStart).toISOString(true),
            }

            // Calculate end time after forming the object because we must refer to criteria.start
            criteria.end = exception.duration && exception.duration !== null ? moment(criteria.start).add(exception.duration, 'minutes').toISOString(true) : moment(criteria.start).add(calendar.duration, 'minutes').toISOString(true);

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

        var results = this.calendar(query).get();

        results.map((calendar, index) => {

            var beginAt = start;
            var exceptionIDs = [];

            var exceptionCompare = (a, b) => {
                if (a.exceptionType === 'cancel' && b.exceptionType !== 'cancel') return -1;
                if (b.exceptionType === 'cancel' && a.exceptionType !== 'cancel') return 1;
                if (a.exceptionType === 'cancel-system' && b.exceptionType !== 'cancel-system') return -1;
                if (b.exceptionType === 'cancel-system' && a.exceptionType !== 'cancel-system') return 1;
                if (a.exceptionType === 'updated' && b.exceptionType !== 'updated') return -1;
                if (b.exceptionType === 'updated' && a.exceptionType !== 'updated') return 1;
                if (a.exceptionType === 'updated-system' && b.exceptionType !== 'updated-system') return -1;
                if (b.exceptionType === 'updated-system' && a.exceptionType !== 'updated-system') return 1;
                return 0;
            }

            // Recurring calendar events
            if (calendar.schedule.schedules) {
                var scheduledObj = calendar.schedule;

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
                        var exceptions = this.exceptions(function () {
                            return this.calendarID === calendar.ID && this.exceptionType !== 'additional' && this.exceptionTime !== null && moment(this.exceptionTime).isSame(moment(eventStart), 'minute');
                        }).get() || [];
                        if (exceptions.length > 0) {
                            exceptions.map((exc) => {
                                exceptionIDs.push(exc.ID);
                                tempExceptions.push(exc);
                            })
                        }
                    } catch (e) {
                        console.error(e);
                        var tempExceptions = [];
                    }

                    if (tempExceptions.length > 0) {
                        tempExceptions.sort(exceptionCompare);
                        console.log(`Standard exception`);
                        console.dir(tempExceptions[ 0 ])
                        processRecord(calendar, tempExceptions[ 0 ], eventStart);
                    } else {
                        processRecord(calendar, {}, eventStart);
                    }
                }

                // Process additional exceptions
                var calendarb = this.exceptions({ calendarID: calendar.ID, exceptionType: 'additional' }).get();
                if (calendarb.length > 0) {
                    // Loop through each additional exception
                    calendarb.map((cal) => {
                        var tempExceptions = [];
                        var eventStart = moment(cal.newTime || cal.exceptionTime).toISOString(true);

                        // Get exceptions to the additional exception if they exist
                        try {
                            var exceptions = this.exceptions(function () {
                                return this.calendarID === calendar.ID && this.exceptionType !== 'additional' && this.exceptionTime !== null && moment(this.exceptionTime).isSame(moment(eventStart), 'minute');
                            }).get() || [];
                            if (exceptions.length > 0) {
                                exceptions.map((exc) => {
                                    exceptionIDs.push(exc.ID);
                                    tempExceptions.push(exc);
                                })
                            }
                        } catch (e) {
                            var tempExceptions = [];
                        }

                        // TODO: This is still returning the additional exception in addition to its cancellation; it should only return its cancellation
                        var tempCal = Object.assign({}, calendar);
                        Object.assign(tempCal, cal);
                        Object.assign(tempCal, {
                            ID: calendar.ID,
                            start: eventStart,
                            schedule: {
                                oneTime: eventStart
                            }
                        });
                        if (tempExceptions.length > 0) {
                            tempExceptions.sort(exceptionCompare);
                            console.log(`Additional exception`)
                            console.dir(tempCal);
                            console.dir(tempExceptions[ 0 ])
                            processRecord(tempCal, tempExceptions[ 0 ], eventStart);
                        } else {
                            processRecord(tempCal, {}, eventStart);
                        }
                    });
                }

                // Now, go through other exceptions which may have been ignored by baseline calendar times
                var exceptions = this.exceptions(function () {
                    return this.calendarID === calendar.ID && exceptionIDs.indexOf(this.ID) === -1 && this.newTime !== null;
                }).get() || [];
                exceptions
                    .map((exception) => {
                        processRecord(calendar, exception, exception.newTime);
                    })

            } else if (calendar.schedule.oneTime) { // One-time events
                // Get exception if it exists
                try {
                    var tempExceptions = [];
                    var exceptionIDs = [];
                    var exception = this.exceptions(function () {
                        return this.calendarID === calendar.ID && this.exceptionType !== 'additional' && this.exceptionTime !== null && moment(this.exceptionTime).isSame(moment(calendar.schedule.oneTime), 'minute');
                    }).get() || [];
                    if (exceptions.length > 0) {
                        exceptions.map((exc) => {
                            exceptionIDs.push(exc.ID);
                            tempExceptions.push(exc);
                        })
                    }
                } catch (e) {
                    var tempExceptions = [];
                }

                if (tempExceptions.length > 0) {
                    tempExceptions.sort(exceptionCompare);
                    processRecord(calendar, tempExceptions[ 0 ], calendar.schedule.oneTime);
                } else {
                    processRecord(calendar, {}, calendar.schedule.oneTime);
                }

                // Process additional exceptions
                var calendarb = this.exceptions({ calendarID: calendar.ID, exceptionType: 'additional' }).get();
                if (calendarb.length > 0) {
                    // Loop through each additional exception
                    calendarb.map((cal) => {
                        var tempExceptions = [];
                        var eventStart = moment(cal.newTime || cal.exceptionTime).toISOString(true);

                        // Get exceptions to the additional exception if they exist
                        try {
                            var exceptions = this.exceptions(function () {
                                return this.calendarID === calendar.ID && this.exceptionType !== 'additional' && this.exceptionTime !== null && moment(this.exceptionTime).isSame(moment(eventStart), 'minute');
                            }).get() || [];
                            if (exceptions.length > 0) {
                                exceptions.map((exc) => {
                                    exceptionIDs.push(exc.ID);
                                    tempExceptions.push(exc);
                                })
                            }
                        } catch (e) {
                            console.error(e);
                            var tempExceptions = [];
                        }

                        if (tempExceptions.length > 0) {
                            tempExceptions.sort(exceptionCompare);
                            processRecord(calendar, tempExceptions[ 0 ], calendar.schedule.oneTime);
                        }
                    });
                }

                // Now, go through other exceptions which may have been ignored by baseline calendar times
                var exceptions = this.exceptions(function () {
                    return this.calendarID === calendar.ID && exceptionIDs.indexOf(this.ID) === -1 && this.newTime !== null;
                }).get() || [];
                exceptions
                    .map((exception) => {
                        processRecord(calendar, exception, exception.newTime);
                    })
            }
        })
        return events;
    }

    whatShouldBePlaying (automationOnly = false) {
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

            var returnData
            events = events
                .filter((event) => {

                    if (event.exceptionType === 'canceled' || event.exceptionType === 'canceled-system') return false;

                    if (automationOnly) {
                        return (event.type === 'prerecord' || event.type === 'genre' || event.type === 'playlist') && moment().isSameOrAfter(moment(event.start)) && moment().isBefore(moment(event.end)) && event.active;
                    } else {
                        // Allow 5 minutes early for non-automation shows. TODO: Configure this threshold.
                        return ((event.type === 'prerecord' || event.type === 'genre' || event.type === 'playlist') && moment().isSameOrAfter(moment(event.start))) || ((event.type === 'show' || event.type === 'sports' || event.type === 'remote') && moment().add(5, 'minutes').isSameOrAfter(moment(event.start))) && moment().add(5, 'minutes').isBefore(moment(event.end)) && event.active;
                    }
                })
                .map((event) => {
                    if ((!returnData || returnData.priority < event.priority))
                        returnData = event;
                });

            return returnData;
        }
    }

    // Check if an event will override other events or get overridden by other events.
    // This should ALWAYS be run before adding calendar or exceptions to the database, AFTER first running verify on the event object.
    checkConflicts (event) {
        var eventPriority = event.priority && event.priority !== null ? event.priority : this.getDefaultPriority(event)
        var error;
        var end = event.end && event.end !== null ? moment(event.end).toISOString(true) : moment(event.newTime || (event.schedule && event.schedule.oneTime ? event.schedule.oneTime : undefined) || event.start).add(event.duration, 'minutes').toISOString(true);

        // No conflict check if the priority is less than 0.
        if (eventPriority < 0) return { overridden: [], overriding: [] };

        // No conflict check if this event is a canceled type exception
        if (event.exceptionType === 'canceled' || event.exceptionType === 'canceled-system') return { overridden: [], overriding: [] };

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
                    if ((event.exceptionType === 'additional' || event.exceptionType === null) && event.calendarID === eventsb.calendarID)
                        throw new Error("ALREADY_SCHEDULED");
                    return eventStart;
                }
            }
            return false;
        }

        var events = this.getEvents(moment(event.newTime || event.schedule.oneTime || event.start).toISOString(true), end, { active: true });

        // Start with events that will get overridden by this event
        var eventsOverridden = events
            .filter((eventb) => {
                // Ignore events that are already canceled or no longer active
                if (eventb.exceptionType === 'canceled' || eventb.exceptionType === 'canceled-system') return false;

                // Ignore events that will get updated by this one
                if ((event.exceptionType === 'updated' || event.exceptionType === 'updated-system') && event.calendarID === eventb.calendarID && moment(event.exceptionTime).isSame(eventb.start, 'minute')) return false;

                var eventbPriority = eventb.priority !== null ? eventb.priority : this.getDefaultPriority(eventb);
                if (eventbPriority < 0) return false;
                if (eventPriority === 0 && eventbPriority === 0) return true;
                if (eventbPriority > 0 && eventbPriority < eventPriority) return true;
                return false;
            });

        if (event.newTime || event.schedule.oneTime) {
            var startb = moment(event.newTime || event.schedule.oneTime);
            var endb = moment(event.newTime || event.schedule.oneTime).add(event.duration, 'minutes');

            eventsOverridden = eventsOverridden
                .filter((eventb) => moment(eventb.end).isAfter(moment(startb)) && moment(eventb.end).isSameOrBefore(moment(endb))) || (moment(eventb.start).isSameOrAfter(startb) && moment(eventb.start).isBefore(endb)) || (moment(eventb.start).isBefore(startb) && moment(eventb.end).isAfter(endb));
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
                if (eventb.exceptionType === 'canceled' || eventb.exceptionType === 'canceled-system') return false;

                // Ignore events that will get updated by this one
                if ((event.exceptionType === 'updated' || event.exceptionType === 'updated-system') && event.calendarID === eventb.calendarID && moment(event.exceptionTime).isSame(eventb.start, 'minute')) return false;

                var eventbPriority = eventb.priority !== null ? eventb.priority : this.getDefaultPriority(eventb);
                if (eventbPriority < 0) return false;
                if (eventPriority === 0 && eventbPriority === 0) return false;
                if (eventbPriority > 0 && eventbPriority >= eventPriority) return true;
                return false;
            });

        if (event.newTime || event.schedule.oneTime) {
            var startb = moment(event.newTime || event.schedule.oneTime);
            var endb = moment(event.newTime || event.schedule.oneTime).add(event.duration, 'minutes');

            eventsOverriding = eventsOverriding
                .filter((eventb) => moment(eventb.end).isAfter(moment(startb)) && moment(eventb.end).isSameOrBefore(moment(endb))) || (moment(eventb.start).isSameOrAfter(startb) && moment(eventb.start).isBefore(endb)) || (moment(eventb.start).isBefore(startb) && moment(eventb.end).isAfter(endb))
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

    // Check for validity of an event object. 
    // This should ALWAYS be run before adding calendar or exceptions to the database.
    verify (event) {

        // If calendarID is provided, we expect it to be a valid calendar ID.
        if (event.calendarID) {
            var calendar = this.calendar({ ID: event.calendarID }).first();
            if (!calendar)
                return false;
        }

        if (event.exceptionType) {
            // If no exceptionTime is provided to indicate the date/time this exception overrides, and type is not additional, this is an invalid event.
            if (!event.exceptionTime && event.exceptionType !== 'additional') return false;

            // If exception type is additional and no newTime and/or duration provided, this is an invalid event.
            if ((!event.newTime || !event.duration) && event.exceptionType === 'additional') return false;
        } else {
            // If this is a main calendar event, it must have event.schedule and it either must have a schedules or a oneTime property in event.schedule.
            if (!event.schedule || (!event.schedule.schedules && !event.schedule.oneTime)) return false;

            // If no duration is specified for a main calendar event, this is an invalid event.
            if (!event.duration) return false;

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
}