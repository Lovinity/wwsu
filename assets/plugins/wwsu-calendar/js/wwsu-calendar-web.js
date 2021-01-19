"use strict";

if (
	typeof TAFFY === "undefined" ||
	typeof WWSUdb === "undefined" ||
	typeof WWSUqueue === "undefined" ||
	typeof moment === "undefined" ||
	typeof moment.tz === "undefined" ||
	typeof moment.recur === "undefined" ||
	typeof moment.duration === "undefined" ||
	typeof _ === "undefined"
) {
	throw new Error(
		"wwsu-calendar requires TAFFY, WWSUdb, WWSUqueue, lodash, and moment (moment-timezone + moment-recur-ts + moment-duration-format). However, neither node.js require() nor JQuery were available to require the scripts."
	);
}

/**
 * Class to manage calendar events for WWSU.
 * Note: We do not extend WWSUdb here because CalendarDb has 3 separate databases to maintain.
 *
 * @requires TAFFY TAFFYDB
 * @requires WWSUdb Wrapper for TAFFYDB
 * @requires WWSUqueue Event queue
 * @requires moment moment.js date/time management
 * @requires moment.tz moment-timezone for timezone converting
 * @requires moment.recur moment-recur-ts plugin, modified for WWSU
 * @requires moment.duration moment-duration-format plugin
 * @requires _ lodash utilities
 */
class CalendarDb {
	/**
	 * Construct the calendar database.
	 *
	 * @param {array} calendar Array of calendar entries to initialize with.
	 * @param {array} schedule Array of schedule entries to initialize with.
	 * @param {array} clockwheels Array of clockwheel records to initialize with.
	 * @param {WWSUMeta} meta If provided, will use meta.time instead of current time, and meta.timezone instead of user timezone.
	 */
	constructor(calendar = [], schedule = [], clockwheels = [], meta) {
		this.meta = meta;

		// Initialize the databases
		this.calendar = new WWSUdb(TAFFY());
		this.schedule = new WWSUdb(TAFFY());
		this.clockwheels = new WWSUdb(TAFFY());
		this.calendar.query(calendar, true);
		this.schedule.query(schedule, true);
		this.clockwheels.query(clockwheels, true);

		this.queue = new WWSUqueue();
	}

	/**
	 * Change data in the database via WWSUdb query.
	 *
	 * @param {string} db Database to query: either calendar, schedule, or clockwheels.
	 * @param {object|array} data Array of records to replace with if replace is true, otherwise WWSU standard query object.
	 * @param {boolean} replace Replace all data in the database with what was provided in data.
	 */
	query(db, data, replace = false) {
		switch (db) {
			case "calendar":
				this.calendar.query(data, replace);
				break;
			case "schedule":
				this.schedule.query(data, replace);
				break;
			case "clockwheels":
				this.clockwheels.query(data, replace);
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
	 * @param {WWSUdb} calendardb If provided, will use the calendardb provided. Otherwise, will use this.calendar.
	 * @param {WWSUdb} scheduledb If provided, will use the scheduledb provided. Otherwise, will use the this.schedule.
	 * @param {function} progressCallback Function fired after every task. Contains two number paramaters: Number of tasks completed, and total number of tasks.
	 * @returns {?array} If callback not provided, function will return events.
	 */
	getEvents(
		callback = null,
		start = moment
			.parseZone(this.meta ? this.meta.meta.time : undefined)
			.subtract(1, "days")
			.toISOString(true),
		end = moment
			.parseZone(this.meta ? this.meta.meta.time : undefined)
			.add(1, "days")
			.toISOString(true),
		query = {},
		calendardb = this.calendar,
		scheduledb = this.schedule,
		progressCallback = () => {}
	) {
		// Event loop
		let tasks = 0;
		let tasksCompleted = 0;

		let events = [];

		/**
		 * Extends this.processRecord by filtering out events that do not fall within start and end.
		 *
		 * @param {object} calendar Main calendar record
		 * @param {object} schedule Schedule record
		 * @param {string} eventStart Start date/time of the event
		 */
		const _processRecord = (calendar, schedule, eventStart) => {
			let criteria = this.processRecord(calendar, schedule, eventStart);

			// This event is within our time range if one or more of the following is true:
			// A. Calendar event start is same or before generated event start.
			// B. Calendar event end is same or after generated event start.
			// C. The event end time is after start, and the event start time is same or before end.
			if (
				moment(criteria.startDate).isAfter(moment(criteria.start)) ||
				!criteria.endDate ||
				moment(criteria.endDate).isBefore(moment(criteria.start))
			) {
			} else {
				if (
					moment(criteria.end).isAfter(moment(start)) &&
					moment(criteria.start).isSameOrBefore(moment(end))
				) {
					events.push(criteria);
				}
			}
		};

		// Define a sort function for schedule types that prioritizes certain types above others in the event of multiple overrides.
		const scheduleCompare = (a, b) => {
			if (a.scheduleType === "canceled" && b.scheduleType !== "canceled")
				return -1;
			if (b.scheduleType === "canceled" && a.scheduleType !== "canceled")
				return 1;
			if (
				a.scheduleType === "canceled-system" &&
				b.scheduleType !== "canceled-system"
			)
				return -1;
			if (
				b.scheduleType === "canceled-system" &&
				a.scheduleType !== "canceled-system"
			)
				return 1;
			if (
				a.scheduleType === "updated-system" &&
				b.scheduleType !== "updated-system"
			)
				return -1;
			if (
				b.scheduleType === "updated-system" &&
				a.scheduleType !== "updated-system"
			)
				return 1;
			if (a.scheduleType === "updated" && b.scheduleType !== "updated")
				return -1;
			if (b.scheduleType === "updated" && a.scheduleType !== "updated")
				return 1;
			if (
				a.scheduleType === "canceled-changed" &&
				b.scheduleType !== "canceled-changed"
			)
				return -1;
			if (
				b.scheduleType === "canceled-changed" &&
				a.scheduleType !== "canceled-changed"
			)
				return 1;
			if (a.ID < b.ID) return -1;
			if (b.ID < a.ID) return 1;
			return 0;
		};

		// Define a comparison function that will order calendar events by start time when we run the iteration
		const compare = function (a, b) {
			try {
				if (moment(a.start).valueOf() < moment(b.start).valueOf()) {
					return -1;
				}
				if (moment(a.start).valueOf() > moment(b.start).valueOf()) {
					return 1;
				}
				if (a.priority < b.priority) {
					return 1;
				}
				if (a.priority > b.priority) {
					return -1;
				}
				return 0;
			} catch (e) {
				console.error(e);
			}
		};

		// Called when a task has been completed, and fires progressCallback and eventually callback when all tasks are done.
		const taskComplete = () => {
			tasksCompleted++;
			progressCallback(tasksCompleted, tasks);
			if (tasksCompleted === tasks && callback) {
				callback(events.sort(compare));
			}
		};

		/**
		 * Process a schedule entry.
		 *
		 * @param {object} calendar Calendar event the schedule belongs to.
		 * @param {object} schedule Schedule record.
		 */
		const processScheduleEntry = (calendar, schedule) => {
			// Polyfill any schedule overridden information with the main calendar event for use with schedule overrides
			let tempCal = Object.assign({}, calendar);
			for (let stuff in schedule) {
				if (Object.prototype.hasOwnProperty.call(schedule, stuff)) {
					if (
						typeof schedule[stuff] !== "undefined" &&
						schedule[stuff] !== null
					)
						tempCal[stuff] = schedule[stuff];
				}
			}

			// First, process one-time dates/times
			if (schedule.oneTime && schedule.oneTime.length > 0) {
				schedule.oneTime.map((oneTime) => {
					let tempSchedules = [];
					let scheduleIDs = [];
					try {
						// Get schedule overrides if they exist
						let scheduleOverrides =
							scheduledb.find(function () {
								return (
									this.calendarID === calendar.ID &&
									this.scheduleID === schedule.ID &&
									this.scheduleType &&
									this.scheduleType !== "unscheduled" &&
									this.originalTime &&
									moment(this.originalTime).isSame(moment(oneTime), "minute")
								);
							}) || [];
						if (scheduleOverrides.length > 0) {
							scheduleOverrides.map((exc) => {
								scheduleIDs.push(exc.ID);
								tempSchedules.push(exc);

								// For updated records, add a canceled-changed record into the events so people know the original time was changed.
								if (
									["updated", "updated-system"].indexOf(exc.scheduleType) !==
										-1 &&
									exc.newTime
								) {
									_processRecord(
										tempCal,
										{
											calendarID: calendar.ID,
											ID: schedule.ID,
											scheduleType: "canceled-changed",
											scheduleReason: `[SYSTEM] Event was rescheduled to ${moment(
												exc.newTime
											).format("llll Z")}`,
										},
										exc.originalTime
									);
								}
							});
						}
					} catch (e) {
						console.error(e);
					}

					// Merge all schedule overrides into one according to scheduleCompare priorities
					if (tempSchedules.length > 0) {
						let tempEvent = {};
						tempSchedules.sort(scheduleCompare).reverse();
						tempSchedules.map((ts) => {
							for (let stuff in ts) {
								if (Object.prototype.hasOwnProperty.call(ts, stuff)) {
									if (typeof ts[stuff] !== "undefined" && ts[stuff] !== null)
										tempEvent[stuff] = ts[stuff];
								}
							}
						});
						_processRecord(tempCal, tempEvent, oneTime);
					} else {
						_processRecord(calendar, schedule, oneTime);
					}
				});
			}

			// Next, process recurring schedules if startTime is not null (we will never process filters if startTime is null)
			if (schedule.startTime && moment(end).isSameOrAfter(moment(start))) {
				// Construct the moment recurrence
				let recur = moment.recur({
					start: start,
					end: end,
					rules: schedule.recurrenceRules
						? schedule.recurrenceRules
						: undefined,
				});

				// get all the matching dates
				let allDates = recur.all("YYYY-MM-DD");

				// loop through all dates
				if (allDates && allDates.length > 0) {
					allDates.map((eventStart) => {
						// If a recurrence interval is specified, skip applicable dates.
						// NOTE: Combining intervals and calendar rules with moment-recur does not work, so we only use calendar rules for moment-recur.
						if (
							schedule.recurrenceInterval &&
							schedule.recurrenceInterval.measure &&
							schedule.recurrenceInterval.unit &&
							schedule.recurrenceInterval.unit > 1
						) {
							let startInterval;
							switch (schedule.recurrenceInterval.measure) {
								case "days":
									startInterval = moment(schedule.startDate).startOf("day");
									if (
										moment(eventStart)
											.startOf("day")
											.diff(startInterval, "days", true) %
											parseInt(schedule.recurrenceInterval.unit) !==
										0
									)
										return;
									break;
								case "weeks":
									startInterval = moment(schedule.startDate).startOf("week");
									if (
										moment(eventStart).diff(startInterval, "weeks") %
											parseInt(schedule.recurrenceInterval.unit) !==
										0
									)
										return;
									break;
								case "months":
									startInterval = moment(schedule.startDate).startOf("month");
									if (
										moment(eventStart)
											.startOf("month")
											.diff(startInterval, "months") %
											parseInt(schedule.recurrenceInterval.unit) !==
										0
									)
										return;
									break;
								case "years":
									startInterval = moment(schedule.startDate).startOf("year");
									if (
										moment(eventStart)
											.startOf("year")
											.diff(startInterval, "years") %
											parseInt(schedule.recurrenceInterval.unit) !==
										0
									)
										return;
									break;
							}
						}

						let tempSchedules = [];
						let scheduleIDs = [];

						// Get schedule overrides if they exist
						try {
							let tempMeta = this.meta; // this.meta scope is not available in scheduledb.find; we must create a temp letiable for it.
							let scheduleOverrides =
								scheduledb.find(function () {
									return (
										this.calendarID === calendar.ID &&
										this.scheduleID === schedule.ID &&
										this.scheduleType &&
										this.scheduleType !== "unscheduled" &&
										this.originalTime &&
										moment(this.originalTime).isSame(
											moment(
												`${eventStart}T${schedule.startTime}${moment(eventStart)
													.tz(
														tempMeta
															? tempMeta.meta.timezone
															: moment.tz.guess()
													)
													.format("Z")}`
											),
											"minute"
										)
									);
								}) || [];
							if (scheduleOverrides.length > 0) {
								scheduleOverrides.map((exc) => {
									scheduleIDs.push(exc.ID);
									tempSchedules.push(exc);

									// For updated records, add a canceled-changed record into the events so people know the original time was changed.
									if (
										["updated", "updated-system"].indexOf(exc.scheduleType) !==
											-1 &&
										exc.newTime
									) {
										_processRecord(
											calendar,
											{
												calendarID: calendar.ID,
												ID: schedule.ID,
												scheduleType: "canceled-changed",
												scheduleReason: `[SYSTEM] Event was rescheduled to ${moment
													.parseZone(exc.newTime)
													.format("llll Z")}`,
											},
											exc.originalTime
										);
									}
								});
							}
						} catch (e) {
							console.error(e);
						}

						// Merge all schedule overrides into one according to scheduleCompare priorities
						if (tempSchedules.length > 0) {
							let tempEvent = {};
							tempSchedules.sort(scheduleCompare).reverse();
							tempSchedules.map((ts) => {
								for (let stuff in ts) {
									if (Object.prototype.hasOwnProperty.call(ts, stuff)) {
										if (typeof ts[stuff] !== "undefined" && ts[stuff] !== null)
											tempEvent[stuff] = ts[stuff];
									}
								}
							});
							_processRecord(
								tempCal,
								tempEvent,
								`${eventStart}T${schedule.startTime}${moment(eventStart)
									.tz(this.meta ? this.meta.meta.timezone : moment.tz.guess())
									.format("Z")}`
							);
						} else {
							_processRecord(
								calendar,
								schedule,
								`${eventStart}T${schedule.startTime}${moment(eventStart)
									.tz(this.meta ? this.meta.meta.timezone : moment.tz.guess())
									.format("Z")}`
							);
						}
					});
				}
			}
			taskComplete();
		};

		/**
		 * Process a main calendar entry by getting and processing its schedules.
		 *
		 * @param {object} calendar The calendar record.
		 */
		const processCalendarEntry = (calendar) => {
			// Get regular and unscheduled events
			let regularEvents = scheduledb.find({
				calendarID: calendar.ID,
				scheduleType: [null, "unscheduled", undefined],
			});
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
		};

		// Get all calendar events and process their schedules
		let results = calendardb.find(query);
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

		// Return the events if not using a callback.
		if (!callback) return events;
	}

	/**
	 * Return an array of events scheduled to be on the air, or permitted to go on the air right now.
	 *
	 * @param {?function} callback If provided, will be executed in a queue and callback fired on completion. If not provided, will return array.
	 * @param {boolean} automationOnly If true, only prerecords, genres, and playlists will be returned.
	 * @param {function} progressCallback Function called after every task is completed. Parameters are tasks completed, and total tasks.
	 * @returns {?array} If callback not provided, will return array of events scheduled.
	 */
	whatShouldBePlaying(
		callback = null,
		automationOnly = false,
		progressCallback = () => {}
	) {
		/**
		 * Function called after getting events via getEvents to filter what actually should be playing.
		 *
		 * @param {array} events Array of events
		 */
		const afterFunction = (events) => {
			if (events.length > 0) {
				// Order events by priority (priority value, then start time, then ID)
				const compare = function (a, b) {
					try {
						if (a.priority > b.priority) {
							return -1;
						}
						if (a.priority < b.priority) {
							return 1;
						}
						if (moment(a.start).valueOf() < moment(b.start).valueOf()) {
							return -1;
						}
						if (moment(a.start).valueOf() > moment(b.start).valueOf()) {
							return 1;
						}
						if (a.ID < b.ID) {
							return -1;
						}
						if (a.ID > b.ID) {
							return 1;
						}
						return 0;
					} catch (e) {
						console.error(e);
					}
				};
				events = events.sort(compare);

				let returnData = [];

				events
					.filter((event) => {
						// Canceled events should not be playing
						if (
							event.scheduleType === "canceled" ||
							event.scheduleType === "canceled-system" ||
							event.scheduleType === "canceled-changed"
						)
							return false;

						// Return events depending on whether or not we want only automation events
						if (automationOnly) {
							return (
								(event.type === "prerecord" ||
									event.type === "genre" ||
									event.type === "playlist") &&
								moment(
									this.meta ? this.meta.meta.time : undefined
								).isSameOrAfter(moment(event.start)) &&
								moment(this.meta ? this.meta.meta.time : undefined).isBefore(
									moment(event.end)
								)
							);
						} else {
							// Allow 5 minutes early for non-automation shows.
							return (
								(((event.type === "prerecord" ||
									event.type === "genre" ||
									event.type === "playlist") &&
									moment(
										this.meta ? this.meta.meta.time : undefined
									).isSameOrAfter(moment(event.start)) &&
									moment(this.meta ? this.meta.meta.time : undefined).isBefore(
										moment(event.end)
									)) ||
									((event.type === "show" ||
										event.type === "sports" ||
										event.type === "remote") &&
										moment(this.meta ? this.meta.meta.time : undefined)
											.add(5, "minutes")
											.isSameOrAfter(moment(event.start)) &&
										moment(this.meta ? this.meta.meta.time : undefined)
											.add(5, "minutes")
											.isBefore(moment(event.end)))) &&
								event.active
							);
						}
					})
					.map((event) => {
						if (event && event.unique) returnData.push(event);
					});

				// Return either in a callback or as a return if no callback provided.
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
		};

		// Get events and then process in the afterFunction.
		if (callback) {
			this.getEvents(
				afterFunction,
				undefined,
				undefined,
				{ active: true },
				undefined,
				undefined,
				progressCallback
			);
		} else {
			return afterFunction(
				this.getEvents(null, undefined, undefined, { active: true })
			);
		}
	}

	/**
	 * Check for conflicts that would arise if we performed the provided schedule queries. Do this BEFORE adding/editing/deleting records!
	 *
	 * @param {?function} callback If provided, will run in queue and function fired when all tasks completed. Otherwise, will return conflicts.
	 * @param {array} _queries Array of WWSUdb queries we want to perform on schedule (insert, update, remove) or the main calendar event (updateCalendar or removeCalendar). Each item should be an object with key as operation and value as the new/updated data or the ID of the record to remove.
	 * @param {function} progressCallback Function fired on every task completion. Contains a single parameter with a descriptive string explaining the progress.
	 * @returns {?object} If callback not provided, returns conflicts object {additions: [schedule records that should also be added], removals: [schedule records that should also be removed], errors: [strings of error messages for queries that cannot be performed]}
	 */
	checkConflicts(callback = null, _queries = [], progressCallback = () => {}) {
		// We have to clone the queries or we accidentally modify mutable objects
		let queries = _.cloneDeep(_queries);

		let tasks = 0;
		let tasksCompleted = 0;

		// Prepare a copy of the current calendar
		let vcalendar = new WWSUdb(TAFFY());
		vcalendar.query(this.calendar.find(), true);

		// Prepare a copy of the current schedule
		let vschedule = new WWSUdb(TAFFY());
		vschedule.query(this.schedule.find(), true);

		// Unfiltered events
		let unfilteredEvents = [];

		// prepare start and end detection
		let start = null;
		let end = null;
		let timePeriods = [];

		// Return data letiables
		let removals = [];
		let additions = [];
		let errors = [];

		/**
		 * When we want to check if two events conflict, we call this function on them.
		 *
		 * @param {object} eventa First event
		 * @param {object} eventb Second event
		 * @returns {number} -1 = eventb overrides eventa. 0 = no conflict. 1 = eventa overrides eventb.
		 */
		const conflicts = (eventa, eventb) => {
			// If either event is a cancellation, there is no conflict
			if (
				(eventa.scheduleType && eventa.scheduleType.startsWith("canceled")) ||
				(eventb.scheduleType && eventb.scheduleType.startsWith("canceled"))
			)
				return 0;

			// If either event has a priority of -1, there is no conflict (-1 events ignore conflict detection)
			if (eventa.priority === -1 || eventb.priority === -1) return 0;

			// If one event is priority 0 and the other is not, there is no conflict (0 events only conflict with other 0 events).
			if (
				(eventa.priority === 0 && eventb.priority !== 0) ||
				(eventb.priority === 0 && eventa.priority !== 0)
			)
				return 0;

			// If the times overlap, there is a conflict, but we need to determine which event conflicts with the other
			if (
				(moment(eventa.end).isAfter(moment(eventb.start)) &&
					moment(eventa.end).isSameOrBefore(moment(eventb.end))) ||
				(moment(eventa.start).isSameOrAfter(eventb.start) &&
					moment(eventa.start).isBefore(eventb.end)) ||
				(moment(eventa.start).isBefore(eventb.start) &&
					moment(eventa.end).isAfter(eventb.end))
			) {
				// If eventb priority is greater than eventa, then eventa is at conflict
				if (eventb.priority > eventa.priority) {
					return -1;
					// If eventa priority is greater than eventb, then eventb is at conflict
				} else if (eventa.priority > eventb.priority) {
					return 1;
					// If both priorities are the same, whichever event has the oldest createdAt time gets priority
				} else if (
					moment(eventb.createdAt).isBefore(moment(eventa.createdAt))
				) {
					return -1;
				} else if (
					moment(eventa.createdAt).isBefore(moment(eventb.createdAt))
				) {
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
		};

		/**
		 * Check if two events conflict, and if so, push to one of our return data letiables what should be done to resolve it.
		 *
		 * @param {object} eventa First event
		 * @param {object} eventb Second event
		 */
		const checkAndResolveConflicts = (eventa, eventb) => {
			// Determine which event overrides the other
			let overrides; // This event overrides the overridden event.
			let overridden;
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

			// Initialize our conflict resolving schedule record with some defaults.
			let newRecord = {
				calendarID: overridden.calendarID,
				scheduleID: overridden.scheduleID,
				overriddenID: overrides.scheduleID || null,
				type: overridden.type,
				hosts: overridden.hosts,
				name: overridden.name,
			};

			let startdiff = moment(overrides.start).diff(
				moment(overridden.start),
				"minutes"
			);
			let enddiff = moment(overridden.end).diff(
				moment(overrides.end),
				"minutes"
			);

			// The higher priority event starts 30 or more minutes after the event being checked and the differential is greater than the end time.
			// Instead of a cancellation, just decrease show duration.
			if (startdiff >= 30 && startdiff >= enddiff) {
				newRecord.scheduleType = "updated-system";
				newRecord.scheduleReason = `[SYSTEM] An event with a higher priority (${overrides.type}: ${overrides.hosts} - ${overrides.name}) has a start date/time within this event's original time block; this event's end time was adjusted.`;
				newRecord.originalTime = overridden.start;
				newRecord.originalDuration = overridden.duration;
				newRecord.duration = startdiff;
			}
			// The event being checked ends 30 or more minutes after the higher priority event and the differential is greater than the start time.
			// Instead of a cancellation, just update show start time.
			else if (enddiff >= 30 && enddiff >= startdiff) {
				newRecord.scheduleType = "updated-system";
				newRecord.scheduleReason = `[SYSTEM] An event with a higher priority (${overrides.type}: ${overrides.hosts} - ${overrides.name}) will run past this event's original start time; this event's start time was adjusted.`;
				newRecord.originalTime = overridden.start;
				newRecord.originalDuration = overridden.duration;
				newRecord.duration = enddiff;
				newRecord.newTime = moment(overrides.end).toISOString(true);
			}
			// If neither of the above conditions apply, the event being checked should be canceled.
			else {
				newRecord.scheduleType = "canceled-system";
				newRecord.scheduleReason = `[SYSTEM] An event with a higher priority (${overrides.type}: ${overrides.hosts} - ${overrides.name}) will run through this event's original time block and leave less than 30 minutes of available air time. This event has been canceled.`;
				newRecord.originalTime = overridden.start;
				newRecord.originalDuration = overridden.duration;
			}

			// Duplicate schedule for the same event? That's a problem! Throw an error.
			if (overridden.calendarID === overrides.calendarID) {
				throw new Error(
					`There is a schedule for calendar ID ${overridden.calendarID} that would overlap another schedule for the same calendar ID. This is not allowed.`
				);
			} else {
				additions.push(newRecord);
			}
		};

		/**
		 * Called when a task in intelligent filtewring is completed.
		 *
		 * @param {function} cb Callback fired when all tasks in this stage are complete.
		 */
		const taskComplete3 = (cb) => {
			tasksCompleted++;
			let newprogress = tasksCompleted > 0 ? tasksCompleted / tasks : 0;
			progressCallback(
				`Stage 3 of 4: Intelligently filtering events (${parseInt(
					newprogress * 100
				)}%)`
			);
			if (tasksCompleted === tasks && cb) {
				cb();
			}
		};

		/**
		 * Called when a task in query processing is completed.
		 *
		 * @param {function} cb Callback fired when all tasks in this stage are complete.
		 */
		const taskComplete = (cb) => {
			tasksCompleted++;
			let newprogress = tasksCompleted > 0 ? tasksCompleted / tasks : 0;
			progressCallback(
				`Stage 1 of 4: Processing Queries (${parseInt(newprogress * 100)}%)`
			);
			if (tasksCompleted === tasks && cb) {
				cb();
			}
		};

		/**
		 * Called when a task in event conflict checking is completed. Fires main function callback when all tasks are done.
		 */
		const taskComplete2 = () => {
			tasksCompleted++;
			let newprogress = tasksCompleted > 0 ? tasksCompleted / tasks : 0;
			progressCallback(
				`Stage 4 of 4: Checking event conflicts (${parseInt(
					newprogress * 100
				)}%)`
			);
			if (tasksCompleted === tasks && callback) {
				callback({ removals, additions, errors });
			}
		};

		/**
		 * Process one of the provided schedule queries (after having converted updateCalendar and removeCalendar into schedule queries).
		 *
		 * @param {object} query Query to process
		 */
		const processQuery = (query) => {
			// Run the query in our copied schedule db
			if (typeof query.remove !== "undefined") {
				query.remove = vschedule.find({ ID: query.remove }, true);
				vschedule.query({ remove: query.remove.ID });
			} else {
				vschedule.query(query);
			}

			// Determine start and end times for conflict checking
			for (let key in query) {
				if (Object.prototype.hasOwnProperty.call(query, key)) {
					// Polyfill calendar and schedule information
					let event = this.scheduleToEvent(query[key], vcalendar, vschedule);

					// Determine start and end times for conflict checking.
					if (query[key].originalTime) {
						if (
							!start ||
							moment(query[key].originalTime)
								.startOf("minute")
								.isBefore(moment(start))
						) {
							start = moment(query[key].originalTime).startOf("minute");
						}
						if (
							!end ||
							moment(query[key].originalTime)
								.startOf("minute")
								.isAfter(moment(end))
						) {
							end = moment(query[key].originalTime)
								.startOf("minute")
								.add(event.duration, "minutes");
						}
						timePeriods.push({
							start: moment(query[key].originalTime)
								.startOf("minute")
								.toISOString(true),
							end: moment(query[key].originalTime)
								.startOf("minute")
								.add(event.duration, "minutes")
								.toISOString(true),
						});
					}
					if (query[key].newTime) {
						if (
							!start ||
							moment(query[key].newTime)
								.startOf("minute")
								.isBefore(moment(start))
						) {
							start = moment(query[key].newTime).startOf("minute");
						}
						if (
							!end ||
							moment(query[key].newTime).startOf("minute").isAfter(moment(end))
						) {
							end = moment(query[key].newTime)
								.startOf("minute")
								.add(event.duration, "minutes");
						}
						timePeriods.push({
							start: moment(query[key].newTime)
								.startOf("minute")
								.toISOString(true),
							end: moment(query[key].newTime)
								.startOf("minute")
								.add(event.duration, "minutes")
								.toISOString(true),
						});
					}
					if (query[key].oneTime && query[key].oneTime.length > 0) {
						query[key].oneTime.map((ot) => {
							if (
								!start ||
								moment(ot).startOf("minute").isBefore(moment(start))
							) {
								start = moment(ot).startOf("minute");
							}
							if (!end || moment(ot).startOf("minute").isAfter(moment(end))) {
								end = moment(ot)
									.startOf("minute")
									.add(event.duration, "minutes");
							}
							timePeriods.push({
								start: moment(ot).startOf("minute").toISOString(true),
								end: moment(ot)
									.startOf("minute")
									.add(event.duration, "minutes")
									.toISOString(true),
							});
						});
					}
					if (
						query[key].startTime ||
						query[key].recurrenceRules ||
						query[key].recurrenceInterval
					) {
						if (
							!start ||
							moment(event.startDate).startOf("minute").isBefore(moment(start))
						) {
							start = moment(event.startDate).startOf("minute");
						}
						if (
							!end ||
							moment(event.endDate).startOf("minute").isAfter(moment(end))
						) {
							end = moment(event.endDate)
								.startOf("minute")
								.add(event.duration, "minutes");
						}

						// Determine time periods to check

						if (moment(end).isSameOrAfter(moment(start))) {
							// Construct the moment recurrence
							let recur = moment.recur({
								start: start,
								end: end,
								rules: event.recurrenceRules
									? event.recurrenceRules
									: undefined,
							});

							// get all the matching dates
							let allDates = recur.all("YYYY-MM-DD");

							// Loop through each schedule between start and end
							if (allDates && allDates.length > 0) {
								allDates.map((eventStart) => {
									// Skip dates that fail recurrence intervals
									if (
										event.recurrenceInterval &&
										event.recurrenceInterval.measure &&
										event.recurrenceInterval.unit &&
										event.recurrenceInterval.unit > 1
									) {
										let startInterval;
										switch (event.recurrenceInterval.measure) {
											case "days":
												startInterval = moment(start).startOf("day");
												if (
													moment(eventStart)
														.startOf("day")
														.diff(startInterval, "days") %
														event.recurrenceInterval.unit !==
													0
												)
													return;
												break;
											case "weeks":
												startInterval = moment(start).startOf("week");
												if (
													moment(eventStart)
														.startOf("week")
														.diff(startInterval, "weeks") %
														event.recurrenceInterval.unit !==
													0
												)
													return;
												break;
											case "months":
												startInterval = moment(start).startOf("month");
												if (
													moment(eventStart)
														.startOf("month")
														.diff(startInterval, "months") %
														event.recurrenceInterval.unit !==
													0
												)
													return;
												break;
											case "years":
												startInterval = moment(start).startOf("year");
												if (
													moment(eventStart)
														.startOf("year")
														.diff(startInterval, "years") %
														event.recurrenceInterval.unit !==
													0
												)
													return;
												break;
										}
									}

									timePeriods.push({
										start: moment
											.tz(
												`${eventStart} ${event.startTime}`,
												this.meta ? this.meta.meta.timezone : moment.tz.guess()
											)
											.toISOString(true),
										end: moment
											.tz(
												`${eventStart} ${event.startTime}`,
												this.meta ? this.meta.meta.timezone : moment.tz.guess()
											)
											.add(event.duration, "minutes")
											.toISOString(true),
									});
								});
							}
						}
					}
				}
			}
		};

		/**
		 * Process conflict checking on an event.
		 *
		 * @param {array} events Array of events to conflict check event against.
		 * @param {object} event Event to check for conflicts.
		 * @param {number} index Start checking at this events index.
		 */
		const processEvent = (events, event, index) => {
			// If this schedule was created as an override, we need to check to see if the override is still valid
			if (event.overriddenID) {
				// Find the original event via the unfiltered events
				let record = unfilteredEvents.find(
					(eventb) => eventb.scheduleID === event.overriddenID
				);

				// If we could not find it, the override is invalid, so we can remove it and not continue beyond this point for the event.
				if (!record) {
					removals.push(event);
					taskComplete2();
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

			taskComplete2();
		};

		if (queries.length > 0) {
			// Process updateCalendar or removeCalendar before we continue with anything else
			queries
				.filter(
					(query) =>
						typeof query.updateCalendar !== "undefined" ||
						typeof query.removeCalendar !== "undefined"
				)
				.map((query, index) => {
					// Process the calendar update
					if (typeof query.updateCalendar !== "undefined") {
						vcalendar.query({ update: query.updateCalendar });

						// Now, we need to remove updateCalendar from the query and replace it with all of its schedules as update queries.
						// That way, we can check all of its schedules for changes in conflicts resulting from changes in calendar defaults.
						let schedules = vschedule.find({
							calendarID: query.updateCalendar.ID,
						});
						queries.splice(index, 1);
						schedules.map((schedule) => {
							queries.push({ update: schedule });
						});
					}
					if (typeof query.removeCalendar !== "undefined") {
						vcalendar.query({ remove: query.removeCalendar });

						// Remove the original removeCalendar query as we do not want to process it beyond this map.
						// We need to add all of the calendar's schedule records as remove queries since they will get removed too.
						let schedules = vschedule.find({
							calendarID: query.removeCalendar,
						});
						queries.splice(index, 1);
						schedules.map((schedule) => {
							queries.push({ remove: schedule.ID });
						});
					}
				});

			// It is possible we edited or removed a calendar without any schedules, thus the query is now empty. Exit if so; no more checks necessary.
			if (queries.length === 0) {
				if (callback) {
					callback({ removals: [], additions: [], errors: [] });
					return;
				} else {
					return { removals: [], additions: [], errors: [] };
				}
			}

			const eventsCall2 = (events) => {
				// Now, go through every event for conflict checking
				tasks = events.length;
				tasksCompleted = 0;

				// No events? exit this stage immediately
				if (events.length === 0) {
					if (callback) {
						callback({ additions, removals, errors });
						return;
					} else {
						return { additions, removals, errors };
					}
				}
				events.map((event, index) => {
					// Add to task queue
					if (callback) {
						this.queue.add(() => {
							processEvent(events, event, index);
						});
					} else {
						processEvent(events, event, index);
					}
				});
			};

			/**
			 * After getting events from this.getEvents, we call this function for intelligently filtering events by start/end times of queries.
			 *
			 * @param {array} events Array of events
			 */
			const eventsCall = (events) => {
				progressCallback(`Stage 3 of 4: Intelligently filtering events`);
				unfilteredEvents = _.cloneDeep(events); // Set unfiltered events to the variable; used for some conflict checks
				console.dir(unfilteredEvents);
				tasks = events.length;
				tasksCompleted = 0;
				let filteredEvents = [];

				// No events? we are done with conflict checking.
				if (events.length === 0) {
					if (callback) {
						callback({ additions, removals, errors });
						return;
					} else {
						return { additions, removals, errors };
					}
				}

				events.map((event) => {
					// Called on each event to determine of its start/end times fall within any of the query times.
					// This speeds up conflict checking by not checking events outside of the dates/times affected by the queries (unless the event overrides another event within the time frame; those are included too).
					const _determineFilter = (_event) => {
						let filter = timePeriods.find(
							(period) =>
								moment(_event.end).isAfter(moment(period.start)) &&
								moment(_event.start).isSameOrBefore(moment(period.end))
						);
						if (filter) {
							filteredEvents.push(_event);
						}
					};
					if (callback) {
						this.queue.add(() => {
							_determineFilter(event);
							taskComplete3(() => {
								eventsCall2(filteredEvents);
							});
						});
					} else {
						_determineFilter(event);
					}
				});
				if (!callback) {
					eventsCall2(filteredEvents);
				}
			};

			// Called after all queries have been processed.
			const postQuery = () => {
				// If no start detected, or start is before current time, then start should be current time.
				// (We are bypassing conflict detection on events that have a start date over 24 hours ago; no need to check conflicts on past events)
				if (
					!start ||
					moment
						.parseZone(this.meta ? this.meta.meta.time : undefined)
						.isAfter(moment(start))
				)
					start = moment.parseZone(this.meta ? this.meta.meta.time : undefined);

				// Make start 1 day sooner to account for any ongoing events
				start = moment(start).subtract(1, "days");

				// Make end 1 day later
				end = moment(end).add(1, "days");

				// Get events with virtual schedule
				if (callback) {
					this.getEvents(
						eventsCall,
						moment.parseZone(start).toISOString(true),
						moment.parseZone(end).toISOString(true),
						{},
						vcalendar,
						vschedule,
						(_tasksCompleted, _tasks) => {
							let newprogress =
								_tasksCompleted > 0 ? _tasksCompleted / _tasks : 0;
							progressCallback(
								`Stage 2 of 4: Finding events (${parseInt(newprogress * 100)}%)`
							);
						}
					);
				} else {
					eventsCall(
						this.getEvents(
							null,
							moment.parseZone(start).toISOString(true),
							moment.parseZone(end).toISOString(true),
							{},
							vcalendar,
							vschedule
						)
					);
				}
			};

			// Process virtual queries
			tasks = queries.length;
			tasksCompleted = 0;
			queries.forEach((query) => {
				if (callback) {
					this.queue.add(() => {
						processQuery(query);
						taskComplete(postQuery);
					});
				} else {
					processQuery(query);
				}
			});

			if (!callback) {
				postQuery();
			}
		} else {
			// No queries? We cannot do conflict checking. Fire callback and return.
			if (callback) {
				callback({
					removals: [],
					additions: [],
					errors: [
						"You must provide at least one query to do conflict checking",
					],
				});
				return;
			} else {
				return {
					removals: [],
					additions: [],
					errors: [
						"You must provide at least one query to do conflict checking",
					],
				};
			}
		}

		if (!callback) {
			return { removals, additions, errors };
		}
	}

	/**
	 * Check which directors are scheduled to be in the office at this time (Returns events up to 30 minutes before start time)
	 *
	 * @param {?function} callback If provided, function will run in queue and call this function with office-hours array when done.
	 * @param {function} progressCallback Function called after every task executed. Contains two parameters: tasks completed, and total tasks.
	 * @returns {?array} If callback not provided, will return array of office-hours on the schedule.
	 */
	whoShouldBeIn(callback = null, progressCallback = () => {}) {
		// Function called after running this.getEvents
		const afterFunction = (events) => {
			if (events.length > 0) {
				// Sort by start time
				const compare = function (a, b) {
					try {
						if (moment(a.start).valueOf() < moment(b.start).valueOf()) {
							return -1;
						}
						if (moment(a.start).valueOf() > moment(b.start).valueOf()) {
							return 1;
						}
						if (a.ID < b.ID) {
							return -1;
						}
						if (a.ID > b.ID) {
							return 1;
						}
						return 0;
					} catch (e) {
						console.error(e);
					}
				};
				events = events.sort(compare);

				events = events.filter((event) => {
					if (
						event.scheduleType === "canceled" ||
						event.scheduleType === "canceled-system" ||
						event.scheduleType === "canceled-changed"
					)
						return false;

					// Return directors who are expected to come in in the next 30 minutes as well
					return (
						event.type === "office-hours" &&
						moment
							.parseZone(this.meta ? this.meta.meta.time : undefined)
							.add(30, "minutes")
							.isSameOrAfter(moment(event.start)) &&
						moment
							.parseZone(this.meta ? this.meta.meta.time : undefined)
							.isBefore(moment(event.end)) &&
						event.active
					);
				});

				callback(events);
			} else {
				callback([]);
			}
		};
		if (callback) {
			this.getEvents(
				afterFunction,
				undefined,
				undefined,
				{ active: true },
				undefined,
				undefined,
				progressCallback
			);
		} else {
			return afterFunction(
				this.getEvents(null, undefined, undefined, { active: true })
			);
		}
	}

	/**
	 * Verify a provided event is valid and contains all required properties. MUST be run before adding anything to the calendar.
	 *
	 * @param {object} event Proposed event being added.
	 * @returns {object|string} Event object if valid with necessary modifications, or string with an error message if invalid.
	 */
	verify(event) {
		let tempCal = {};

		// If calendarID is provided, we expect it to be a valid calendar ID, otherwise the event is invalid.
		if (event.calendarID) {
			let calendar = this.calendar.find({ ID: event.calendarID }, true);
			if (!calendar) {
				return "The provided calendarID does not exist.";
			} else {
				// polyfill information
				for (let stuff in calendar) {
					if (Object.prototype.hasOwnProperty.call(calendar, stuff)) {
						if (
							typeof calendar[stuff] !== "undefined" &&
							calendar[stuff] !== null
						)
							tempCal[stuff] = calendar[stuff];
					}
				}
			}
		}

		// If scheduleID is provided, we expect it to be a valid schedule ID, otherwise the event is invalid.
		if (event.scheduleID) {
			let schedule = this.schedule.find({ ID: event.scheduleID }, true);
			if (!schedule) {
				return "The provided scheduleID does not exist.";
			} else {
				// polyfill information
				for (let stuff in schedule) {
					if (Object.prototype.hasOwnProperty.call(schedule, stuff)) {
						if (
							typeof schedule[stuff] !== "undefined" &&
							schedule[stuff] !== null
						)
							tempCal[stuff] = schedule[stuff];
					}
				}
			}
		}

		// Now, polyfill tempCal with the current event
		for (let stuff in event) {
			if (Object.prototype.hasOwnProperty.call(event, stuff)) {
				if (typeof event[stuff] !== "undefined" && event[stuff] !== null)
					tempCal[stuff] = event[stuff];
			}
		}

		// If scheduleType is not null and not unscheduled, we expect an originalTime value.
		if (tempCal.scheduleType && tempCal.scheduleType !== "unscheduled") {
			if (!tempCal.originalTime)
				return "originalTime is required when scheduleType is not null nor unscheduled.";
			// if scheduleType is null or unscheduled, we expect a duration and at least one oneTime or startTime if calendarID was provided.
		} else if (event.calendarID) {
			if (!tempCal.duration || tempCal.duration <= 0)
				return "duration is required for null or unscheduled scheduleTypes.";
			if (
				(!tempCal.oneTime || tempCal.oneTime.length === 0) &&
				!tempCal.startTime
			)
				return "oneTime or startTime is required for null or unscheduled scheduleTypes.";
		}

		// Make sure start time is in the correct format if provided
		if (tempCal.startTime) {
			let splits = tempCal.startTime.split(":");
			if (
				splits.length !== 2 ||
				splits[0].length !== 2 ||
				splits[1].length !== 2
			)
				return "startTime must be in the format HH:mm";
		}

		// Ensure at least 1 recurrence rule is defined
		if (
			tempCal.startTime &&
			(!tempCal.recurrenceRules || tempCal.recurrenceRules.length === 0)
		) {
			return "You must specify at least 1 recurrence rule when startTime is set.";
		}

		// We expect an event name for all events except office-hours or bookings.
		if (
			["office-hours", "onair-booking", "prod-booking"].indexOf(
				tempCal.type
			) === -1 &&
			(!tempCal.name || tempCal.name === "")
		)
			return "name is required for non-booking and non-office-hours events.";

		// If type is show, remote, or prerecord, we expect a hostDJ.
		if (
			["show", "remote", "prerecord"].indexOf(tempCal.type) !== -1 &&
			!tempCal.hostDJ
		)
			return "hostDJ is required for shows and prerecords.";

		// If type is a booking, we expect a hostDJ or director.
		if (
			["prod-booking", "onair-booking"].indexOf(tempCal.type) !== -1 &&
			!tempCal.hostDJ &&
			!tempCal.director
		)
			return "hostDJ or director is required for booking events.";

		// If type is prerecord or playlist, we expect playlistID.
		if (
			["prerecord", "playlist"].indexOf(tempCal.type) !== -1 &&
			!tempCal.playlistID
		)
			return "playlistID required for prerecords and playlists.";

		// If type is genre, we expect eventID.
		if (["genre"].indexOf(tempCal.type) !== -1 && !tempCal.eventID)
			return "eventID required for genres.";

		// If startTime is provided, we expect an end date.
		if (tempCal.startTime && !tempCal.endDate)
			return "endDate required for events with a recurring schedule.";

		// We expect a director for office-hours and tasks.
		if (
			["office-hours", "task"].indexOf(tempCal.type) !== -1 &&
			!tempCal.director
		)
			return "director required for office-hours and task.";

		// Default to a duration of 0 when it is null or not existing.
		if (!tempCal.duration || tempCal.duration <= 0) event.duration = 0;

		// If no startDate provided, default to current date.
		if (!tempCal.startDate)
			event.startDate = moment
				.parseZone(this.meta ? this.meta.meta.time : undefined)
				.startOf("day")
				.toISOString(true);

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
	getDefaultPriority(event) {
		switch (event.type) {
			case "show":
				return 5;
			case "sports":
				return 9;
			case "remote":
				return 7;
			case "prerecord":
				return 3;
			case "genre":
				return 0;
			case "playlist":
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
	getColor(event) {
		switch (event.type) {
			case "show":
				return "#9E0C1A";
			case "sports":
				return "#186429";
			case "remote":
				return "#6610f2";
			case "prerecord":
				return "#EE77AE";
			case "genre":
				return "#73C7D4";
			case "playlist":
				return "#0056B2";
			case "office-hours":
				return "#ffc107";
			case "task":
				return "#ff851b";
			case "onair-booking":
			case "prod-booking":
				return "#20c997";
			default:
				return "#495057";
		}
	}

	/**
	 * Get the color class this event should be displayed as based on its type.
	 *
	 * @param {object} event The event
	 * @returns {string} Color class
	 */
	getColorClass(event) {
		switch (event.type) {
			case "show":
				return "danger";
			case "sports":
				return "success";
			case "remote":
				return "indigo";
			case "prerecord":
				return "pink";
			case "genre":
				return "info";
			case "playlist":
				return "primary";
			case "office-hours":
				return "warning";
			case "task":
				return "orange";
			case "onair-booking":
			case "prod-booking":
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
	getIconClass(event) {
		switch (event.type) {
			case "genre":
				return "fas fa-music";
			case "playlist":
				return "fas fa-play";
			case "show":
				return "fas fa-microphone";
			case "sports":
				return "fas fa-basketball-ball";
			case "remote":
				return "fas fa-broadcast-tower";
			case "prerecord":
				return "fas fa-play-circle";
			case "office-hours":
				return "fas fa-user-clock";
			case "task":
				return "fas fa-tasks";
			case "onair-booking":
			case "prod-booking":
				return "fas fa-clock";
			default:
				return "fas fa-calendar";
		}
	}

	/**
	 * Combine a base calendar or schedule record with a modifying schedule record.
	 *
	 * Note 1: _schedule can provide the number 0 for any of the following properties to specify we should use null even if the main _calendar event has something set:
	 * hostDJ, cohostDJ1, cohostDJ2, cohostDJ3, eventID, playlistID, director
	 *
	 * Note 2: _schedule can provide {clearAll: true} for any of the following properties to specify we should use null even if the main _calendar event has something set:
	 * oneTime, recurDM, recurWM, recurDW, recurH
	 *
	 * @param {object} _calendar The base event or schedule
	 * @param {object} _schedule The schedule making modifications to calendar
	 * @param {string} eventStart ISO String of the start or original time for the event
	 * @returns {object} Modified event
	 */
	processRecord(_calendar, _schedule, eventStart) {
		// Clone these to avoid accidental modifications of mutable objects.
		let calendar = _.cloneDeep(_calendar);
		let schedule = _.cloneDeep(_schedule);

		// Define an initial event record
		let criteria = {
			calendarID: schedule.calendarID || calendar.ID, // ID of the main calendar event
			scheduleID: schedule.ID || null, // ID of the schedule record to process
			scheduleOverrideID: schedule.scheduleID || null, // If this schedule overrides another schedule, this is the ID of the schedule that this schedule overrides.
			overriddenID: schedule.overriddenID || null, // ID of the schedule which overrode this one (for -system schedules).
			scheduleType: schedule.scheduleType || null, // Schedule type (null [default schedule], unscheduled, updated, updated-system, canceled, canceled-system, canceled-changed)
			scheduleReason: schedule.scheduleReason || null, // A reason for this schedule or override, if applicable.
			originalTime: schedule.originalTime
				? moment
						.parseZone(schedule.originalTime)
						.startOf("minute")
						.toISOString(true)
				: null, // The specific time this schedule is applicable for... used for updates and cancelations.
			originalDuration:
				schedule.originalDuration || schedule.originalDuration === 0
					? schedule.originalDuration
					: null, // The original duration of the event. TODO: Add this everywhere, not just in conflict checking.
			type: schedule.type ? schedule.type : calendar.type, // Event type (show, remote, sports, prerecord, genre, playlist, event, onair-booking, prod-booking, office-hours, task)
			priority:
				schedule.priority || schedule.priority === 0
					? schedule.priority
					: calendar.priority || calendar.priority === 0
					? calendar.priority
					: schedule.type
					? this.getDefaultPriority(schedule)
					: this.getDefaultPriority(calendar), // Priority of the event. -1 = no conflict detection. 0 and up = overridden by any events scheduled that have the same or higher priority.
			hostDJ: schedule.hostDJ
				? schedule.hostDJ
				: schedule.hostDJ !== 0
				? calendar.hostDJ || null
				: null, // The ID of the DJ hosting the event
			cohostDJ1: schedule.cohostDJ1
				? schedule.cohostDJ1
				: schedule.cohostDJ1 !== 0
				? calendar.cohostDJ1 || null
				: null, // The ID of the first cohost DJ
			cohostDJ2: schedule.cohostDJ2
				? schedule.cohostDJ2
				: schedule.cohostDJ2 !== 0
				? calendar.cohostDJ2 || null
				: null, // The ID of the second cohost DJ
			cohostDJ3: schedule.cohostDJ3
				? schedule.cohostDJ3
				: schedule.cohostDJ3 !== 0
				? calendar.cohostDJ3 || null
				: null, // The ID of the third cohost DJ
			active: calendar.active, // True if the event is active, false if it is not.
			eventID: schedule.eventID
				? schedule.eventID
				: schedule.eventID !== 0
				? calendar.eventID || null
				: null, // ID of the radioDJ manual event to fire, for genre events
			playlistID: schedule.playlistID
				? schedule.playlistID
				: schedule.playlistID !== 0
				? calendar.playlistID || null
				: null, // ID of the playlist to queue, for playlist and prerecord events.
			director: schedule.director
				? schedule.director
				: schedule.director !== 0
				? calendar.director || null
				: null, // ID of the director, for office-hours and task events.
			hosts: schedule.hosts
				? schedule.hosts
				: calendar.hosts || "Unknown Hosts", // String of host names based on director and/or DJ IDs.
			name: schedule.name ? schedule.name : calendar.name || "Unknown Event", // Name of event
			description: schedule.description
				? schedule.description
				: calendar.description || null, // Description of event
			logo: schedule.logo ? schedule.logo : calendar.logo || null, // URL to the event logo
			banner: schedule.banner ? schedule.banner : calendar.banner || null, // URL to the event banner
			newTime: schedule.newTime
				? moment.parseZone(schedule.newTime).startOf("minute").toISOString(true)
				: null, // If an exception is applied that overrides an event's start time, this is the event's new start time.
			start: schedule.newTime
				? moment.parseZone(schedule.newTime).startOf("minute").toISOString(true)
				: moment.parseZone(eventStart).startOf("minute").toISOString(true), // Start time of the event
			duration:
				schedule.duration || schedule.duration === 0
					? schedule.duration
					: calendar.duration || calendar.duration === 0
					? calendar.duration
					: null, // The duration of the event in minutes
			oneTime:
				schedule.oneTime && !schedule.oneTime.clearAll
					? schedule.oneTime
					: (!schedule.oneTime || !schedule.oneTime.clearAll) &&
					  calendar.oneTime &&
					  !calendar.oneTime.clearAll
					? calendar.oneTime
					: null, // Array of oneTime ISO dates to execute the event
			startTime:
				schedule.startTime && schedule.startTime !== 0
					? schedule.startTime
					: (!schedule.startTime || schedule.startTime !== 0) &&
					  calendar.startTime &&
					  calendar.startTime !== 0
					? calendar.startTime
					: null, // The HH:mm this event should start when using recuurence
			recurrenceRules:
				schedule.recurrenceRules && !schedule.recurrenceRules.clearAll
					? schedule.recurrenceRules
					: (!schedule.recurrenceRules || !schedule.recurrenceRules.clearAll) &&
					  calendar.recurrenceRules &&
					  !calendar.recurrenceRules.clearAll
					? calendar.recurrenceRules
					: null, // Array of recurrence rules for moment-recur-ts
			recurrenceInterval:
				schedule.recurrenceInterval && !schedule.recurrenceInterval.clearAll
					? schedule.recurrenceInterval
					: (!schedule.recurrenceInterval ||
							!schedule.recurrenceInterval.clearAll) &&
					  calendar.recurrenceInterval &&
					  !calendar.recurrenceInterval.clearAll
					? calendar.recurrenceInterval
					: null, // recurrenceInterval object containing an interval the event should occur, if not every occurrence.
			startDate:
				schedule.startDate || calendar.startDate
					? moment
							.parseZone(schedule.startDate || calendar.startDate)
							.startOf("day")
							.toISOString(true)
					: null, // Date the event starts
			endDate:
				schedule.endDate || calendar.endDate
					? moment
							.parseZone(schedule.endDate || calendar.endDate)
							.startOf("day")
							.toISOString(true)
					: null, // Date the event ends (exclusive).
			timeChanged:
				schedule.scheduleID && (schedule.newTime || schedule.duration), // True if this event's time was changed from the original, else false
			createdAt: schedule.createdAt || calendar.createdAt, // createdAt used to determine which event gets priority in conflict checking if both have the same priority
			updatedAt: schedule.updatedAt || calendar.updatedAt,
		};

		// Determine event color
		criteria.color = this.getColor(criteria);

		// Generate a unique string for this specific event time so we can differentiate recurring events easily.
		// Note: The start time in unique strings should be UTC to avoid Daylight Savings complications.
		// Format: calendarID-originalEventStartTime[-originalScheduleID].
		if (criteria.scheduleOverrideID && criteria.originalTime) {
			criteria.unique = `${criteria.calendarID}-${moment
				.utc(criteria.originalTime)
				.valueOf()}-${criteria.scheduleOverrideID}`;
		} else if (criteria.scheduleID) {
			criteria.unique = `${criteria.calendarID}-${moment
				.utc(criteria.start)
				.valueOf()}-${criteria.scheduleID}`;
		} else if (!criteria.originalTime) {
			criteria.unique = `${criteria.calendarID}-${moment
				.utc(criteria.start)
				.valueOf()}`;
		} else {
			criteria.unique = `${criteria.calendarID}-${moment
				.utc(criteria.originalTime)
				.valueOf()}`;
		}

		// Attach array of clockwheel segments for this event if there are any
		criteria.clockwheels = this.clockwheels.find({ unique: criteria.unique });

		// Calculate end time after forming the object because we must refer to criteria.start
		criteria.end =
			schedule.duration || calendar.duration
				? moment
						.parseZone(criteria.start)
						.add(schedule.duration || calendar.duration, "minutes")
						.toISOString(true)
				: moment.parseZone(criteria.start).startOf("minute").toISOString(true);

		return criteria;
	}

	/**
	 * Date libraries do not support calculating week of the month; we have our own function for that.
	 *
	 * @param {string} input ISO string of the date
	 * @returns {number} Week of the month the date falls on
	 */
	weekOfMonth(input) {
		const firstDayOfMonth = moment(input).startOf("month");
		const firstDayOfWeek = moment(firstDayOfMonth).clone().startOf("week");

		const offset = firstDayOfMonth.diff(firstDayOfWeek, "days");

		return Math.ceil((moment(input).date() + offset) / 7);
	}

	/**
	 * Generate a human readable string for the schedule provided.
	 *
	 * @param {object} event The CalendarDb event or the schedule DB record.
	 * @returns {string} Human readable representation of the schedule.
	 */
	generateScheduleText(event) {
		let recurAt = [];
		let oneTime = [];
		let recurDayString = ``;

		// If this is an updated / rescheduled event, return the new date/time only.
		if (event.newTime) {
			return `On ${moment
				.parseZone(event.newTime)
				.format("LLLL Z")} for ${moment
				.duration(event.duration, "minutes")
				.format("h [hours], m [minutes]")}`;
		}

		// Add oneTime dates/times to the oneTime letiable.
		if (event.oneTime && event.oneTime.length > 0) {
			oneTime = event.oneTime.map((onetime) =>
				moment.parseZone(onetime).format("LLLL Z")
			);
		}

		// No oneTimes? Start with "Every", else start with each oneTime date/time, followed by "and every" if a recurring schedule was also provided.
		if (oneTime.length === 0) {
			recurDayString = ``;
		} else {
			recurDayString = `On ${oneTime.join(", ")}`;
		}

		if (
			event.startTime &&
			event.recurrenceRules &&
			event.recurrenceRules.length > 0
		) {
			if (oneTime.length > 0) {
				recurDayString += `... and `;
			}

			event.recurrenceRules.map((rule) => {
				let days;
				if (!rule.measure || !rule.units || rule.units.length === 0) return;
				switch (rule.measure) {
					case "days":
					case "weeks":
					case "months":
					case "years":
						recurDayString += `every ${rule.units
							.sort((a, b) => a - b)
							.join(", ")} ${rule.measure}, `;
						break;
					case "monthsOfYear":
						days = rule.units
							.sort((a, b) => a - b)
							.map((unit) => {
								switch (unit) {
									case 0:
										return "January";
									case 1:
										return "February";
									case 2:
										return "March";
									case 3:
										return "April";
									case 4:
										return "May";
									case 5:
										return "June";
									case 6:
										return "July";
									case 7:
										return "August";
									case 8:
										return "September";
									case 9:
										return "October";
									case 10:
										return "November";
									case 11:
										return "December";
								}
								return "Unknown month";
							});
						recurDayString += `in ${days.join(", ")}, `;
						break;
					case "daysOfWeek":
						days = rule.units
							.sort((a, b) => a - b)
							.map((unit) => {
								switch (unit) {
									case 0:
										return "Sunday";
									case 1:
										return "Monday";
									case 2:
										return "Tuesday";
									case 3:
										return "Wednesday";
									case 4:
										return "Thursday";
									case 5:
										return "Friday";
									case 6:
										return "Saturday";
								}
								return "Unknown day";
							});
						recurDayString += `on ${days.join(", ")}, `;
						break;
					case "weeksOfMonth":
					case "weeksOfMonthByDay":
						days = rule.units
							.sort((a, b) => a - b)
							.map((unit) => {
								switch (unit) {
									case 0:
										return "1st";
									case 1:
										return "2nd";
									case 2:
										return "3rd";
									case 3:
										return "4th";
									case 4:
										return "5th";
									case 5:
										return "last";
								}
							});
						recurDayString += `on the ${days.join(
							", "
						)} week(s) of the month, `;
						break;
					case "daysOfMonth":
						days = rule.units
							.sort((a, b) => a - b)
							.map((unit) => {
								switch (unit) {
									case 1:
									case 21:
									case 31:
										return `${unit}st`;
									case 2:
									case 22:
										return `${unit}nd`;
									case 3:
									case 23:
										return `${unit}rd`;
								}
								return `${unit}th`;
							});
						recurDayString += `on the ${days.join(", ")} day(s) of the month, `;
						break;
					case "weeksOfYear":
						days = rule.units
							.sort((a, b) => a - b)
							.map((unit) => {
								switch (unit) {
									case 1:
									case 21:
									case 31:
									case 41:
									case 51:
										return `${unit}st`;
									case 2:
									case 22:
									case 32:
									case 42:
									case 52:
										return `${unit}nd`;
									case 3:
									case 23:
									case 33:
									case 43:
									case 53:
										return `${unit}rd`;
								}
								return `${unit}th`;
							});
						recurDayString += `on the ${days.join(", ")} week(s) of the year, `;
						break;
				}
			});

			recurDayString += `... at ${event.startTime}${
				this.meta ? moment().tz(this.meta.meta.timezone).format(" z") : ``
			}`;
		}

		recurDayString += `... for ${moment
			.duration(event.duration, "minutes")
			.format("h [hours], m [minutes]")}`;

		if (event.startDate || event.endDate) {
			recurDayString += `... `;
		}
		if (event.startDate) {
			recurDayString += `starting ${moment
				.parseZone(event.startDate)
				.format("LL")} `;
		}
		if (event.endDate) {
			recurDayString += `until ${moment
				.parseZone(event.endDate)
				.format("LL")} `;
		}

		return recurDayString;
	}

	/**
	 * Polyfill missing information in a schedule record from its scheduleID (if applicable) and the calendar event's default properties.
	 *
	 * @param {object} _record The schedule database record
	 * @param {WWSUdb} calendardb If provided, will use this database of calendar events instead of the CalendarDb one.
	 * @param {WWSUdb} scheduledb If provided, will use this database of schedules instead of the CalendarDb one.
	 * @returns {object} Event, as structured in processRecord.
	 */
	scheduleToEvent(
		_record,
		calendardb = this.calendar,
		scheduledb = this.schedule
	) {
		let tempCal = {};
		let event;
		let schedule;
		let record = _.cloneDeep(_record); // Clone the record to avoid accidental mutable object editing.
		if (record.calendarID) {
			let calendar = calendardb.find({ ID: record.calendarID }, true);
			tempCal = calendar || {};
			if (record.scheduleID) {
				schedule = scheduledb.find({ ID: record.scheduleID }, true);
			}
			if (schedule) {
				for (let stuff in schedule) {
					if (Object.prototype.hasOwnProperty.call(schedule, stuff)) {
						if (
							typeof schedule[stuff] !== "undefined" &&
							schedule[stuff] !== null
						)
							tempCal[stuff] = schedule[stuff];
					}
				}
				event = this.processRecord(
					tempCal,
					record,
					record.newTime ? record.newTime : record.originalTime
				);
			} else {
				event = this.processRecord(
					calendar,
					record,
					record.newTime ? record.newTime : record.originalTime
				);
			}
		} else {
			event = this.processRecord(
				record,
				{ calendarID: null },
				moment
					.parseZone(this.meta ? this.meta.meta.time : undefined)
					.toISOString(true)
			);
		}

		return event;
	}
}
