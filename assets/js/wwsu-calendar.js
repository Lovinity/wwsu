/* global moment, later, WWSUdb, TAFFY, iziToast, $ */

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
            iziToast.show({
                title: 'An error occurred - Please check the logs',
                message: 'Error occurred during the processCalendar function in class CalendarDb.'
            })
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
            iziToast.show({
                title: 'An error occurred - Please check the logs',
                message: 'Error occurred during the processExceptions function in class CalendarDb.'
            })
        }
    }

    // Get an array of upcoming events based on provided criteria
    getEvents (start = moment().startOf('day').toISOString(true), days = 1, query = {}) {
        var events = [];
        var end = moment(start).add(days, 'days').toISOString(true);

        // Function to process a single occurrence of an event with an exception if it exists
        var processRecord = (calendar, exception, eventStart) => {
            var criteria = {
                calendarID: calendar.ID,
                exceptionType: exception.exceptionType || null,
                overrideCalendarID: exception.overrideCalendarID || null,
                exceptionReason: exception.exceptionReason || null,
                exceptionTime: exception.exceptionTime || null,
                type: exception.type !== null ? exception.type : calendar.type,
                active: calendar.active,
                hostDJ: exception.hostDJ !== null ? exception.hostDJ : calendar.hostDJ,
                cohostDJ1: exception.cohostDJ1 !== null ? exception.cohostDJ1 : calendar.cohostDJ1,
                cohostDJ2: exception.cohostDJ2 !== null ? exception.cohostDJ2 : calendar.cohostDJ2,
                cohostDJ3: exception.cohostDJ3 !== null ? exception.cohostDJ3 : calendar.cohostDJ3,
                name: exception.name !== null ? exception.name : calendar.name,
                description: exception.description !== null ? exception.description : calendar.description,
                logo: exception.logo !== null ? exception.logo : calendar.logo,
                banner: exception.banner !== null ? exception.banner : calendar.banner,
                start: exception.newTime !== null ? moment(exception.newTime).toISOString(true) : eventStart,
            }

            // Calculate end time after forming the object because we must refer to criteria.start
            criteria.end = exception.duration !== null ? moment(criteria.start).add(exception.duration, 'minutes') : moment(criteria.start).add(calendar.duration, 'minutes');

            // Determine if this event falls within our time range, and if so, include it in the output.
            if (moment(criteria.end).isAfter(moment(start)) && moment(criteria.start).isBefore(moment(end))) {
                events.push(criteria);
            }
        }

        var results = this.calendar(query);

        results.map((calendar) => {
            var beginAt = start;
            var exceptionIDs = [];

            // Recurring calendar events
            if (calendar.schedule.schedules) {
                var scheduledObj = calendar.schedule;

                // No dice if there is no schedules parameter or if there is no record at index 0
                if (!calendar.schedule.schedules[ 0 ]) return null;

                // Set defaults in schedule if they don't exist for hour, minute, and second
                calendar.schedule.schedules.map((schedule, index) => {
                    if (!schedule.h)
                        calendar.schedule.schedules[ index ].h = 0;
                    if (!schedule.m)
                        calendar.schedule.schedules[ index ].m = 0;
                    if (!schedule.s)
                        calendar.schedule.schedules[ index ].s = 0;
                })

                // Generate later schedule
                var schedule = later.schedule(calendar.schedule);

                // Keep going until we have reached the end date/time
                while (moment(beginAt).isBefore(moment(end))) {
                    var eventStart = moment(schedule.next(1, beginAt)).toISOString(true);
                    if (!eventStart || eventStart === null) break;
                    beginAt = eventStart;

                    // Get exception if it exists
                    try {
                        var exception = this.exceptions(function () {
                            return this.calendarID === calendarID && this.exceptionType !== 'additional' && this.exceptionTime !== null && moment(this.exceptionTime).isSame(moment(eventStart), 'minute');
                        }).last() || {};
                        exceptionIDs.push(exception.ID);
                    } catch (e) {
                        var exception = {};
                    }

                    // Process the record
                    processRecord(calendar, exception, eventStart);
                }

                // Now, go through other exceptions which may have been ignored by baseline calendar times
                exceptions = this.exceptions({ calendarID: calendar.ID })
                exceptions
                    .filter((exception) => {
                        return exceptionIDs.indexOf(exception.ID) === -1 && exception.newTime !== null;
                    })
                    .map((exception) => {
                        processRecord(calendar, exception, exception.newTime);
                    })

            } else if (calendar.schedule.oneTime) { // One-time events
                // Get exception if it exists
                try {
                    var exception = this.exceptions(function () {
                        return this.calendarID === calendarID && this.exceptionType !== 'additional' && this.exceptionTime !== null && moment(this.exceptionTime).isSame(moment(calendar.schedule.oneTime), 'minute');
                    }).last() || {};
                    exceptionIDs.push(exception.ID);
                } catch (e) {
                    var exception = {};
                }

                processRecord(calendar, exception, calendar.schedule.oneTime);

                // Now, go through other exceptions which may have been ignored by baseline calendar times
                exceptions = this.exceptions({ calendarID: calendar.ID })
                exceptions
                    .filter((exception) => {
                        return exceptionIDs.indexOf(exception.ID) === -1 && exception.newTime !== null;
                    })
                    .map((exception) => {
                        processRecord(calendar, exception, exception.newTime);
                    })
            }
        })
        return events;
    }
}