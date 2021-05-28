"use strict";

/**
 * This class extends CalendarDb to use WWSU's calendar API and build the calendar interface.
 * @requires WWSUthis.manager.get("WWSUutil") WWSU this.manager.get("WWSUutil")ity class
 * @requires CalendarDb Base WWSU calendar class for processing data into calendar events
 * @requires WWSUmodal iziModal wrapper
 * @requires WWSUevents WWSU event emitter
 * @requires $ jQuery
 * @requires $.block jQuery blockUI
 * @requires $.DataTable DataTables.js
 * @requires $.alpaca Alpaca forms custom WWSU build
 */

// REQUIRES the following WWSUmodules: noReq (WWSUreq), directorReq (WWSUreq) (only if managing calendar), djReq (WWSUreq) (Only on DJ web panel), WWSUMeta, WWSUutil, WWSUdjs (only if editing/adding calendar events)
// WWSUMeta MUST be loaded before WWSUcalendar is loaded!
class WWSUcalendar extends CalendarDb {
	/**
	 * Create the calendar class.
	 *
	 * @param {WWSUmodules} manager The modules class which initiated this module
	 * @param {object} options Options to be passed to this module
	 */
	constructor(manager, options) {
		super([], [], [], manager.get("WWSUMeta")); // Create the db

		this.manager = manager;

		this.endpoints = {
			add: "/calendar/add",
			addSchedule: "/calendar/add-schedule",
			edit: "/calendar/edit",
			editSchedule: "/calendar/edit-schedule",
			get: "/calendar/get",
			getClockwheels: "/clockwheels/get",
			getEventsPlaylists: "/calendar/get-events-playlists",
			getSchedule: "/calendar/get-schedule",
			remove: "/calendar/remove",
			removeSchedule: "/calendar/remove-schedule",
			inactive: "/calendar/inactive",
			active: "/calendar/active"
		};
		this.data = {
			add: {},
			addSchedule: {},
			edit: {},
			editSchedule: {},
			get: {},
			getClockwheels: {},
			getEventsPlaylists: {},
			getSchedule: {},
			remove: {},
			removeSchedule: {},
			inactive: {},
			active: {}
		};

		this.events = new WWSUevents();

		// Assign socket events
		this.calendar.assignSocketEvent("calendar", this.manager.socket);
		this.schedule.assignSocketEvent("schedule", this.manager.socket);
		this.clockwheels.assignSocketEvent("clockwheels", this.manager.socket);

		// Emit calendarUpdated whenever a change is made to the calendar.
		this.calendar.on("change", "WWSUcalendar", () => {
			this.calendarUpdated();
		});
		this.schedule.on("change", "WWSUcalendar", () => {
			this.calendarUpdated();
		});
		this.clockwheels.on("change", "WWSUcalendar", () => {
			this.calendarUpdated();
		});

		// Generate a modal for displaying event conflicts
		this.conflictModal = new WWSUmodal(
			`Event Conflicts`,
			`bg-info`,
			``,
			false,
			{
				headerColor: "",
				overlayClose: false,
				zindex: 2000
			}
		);

		// Generate a modal for displaying help on how priorities work
		this.priorityInfoModal = new WWSUmodal(
			`Explanation of how Priorities Work`,
			null,
			`<p>Priorities determine how the system will resolve incidents where event schedules overlap each other.</p>
        <ul>
            <li><strong>-1</strong>: Schedule is always allowed to overlap any other schedule. Use this for events that do not deal with OnAir programming, such as meetings and office hours.</li>
            <li><strong>0</strong>: Schedule is not allowed to overlap any other schedules of the same type, but can overlap schedules of another type. For example, a priority 0 genre cannot overlap any other genre event, but it can co-exist with any other event such as live, remote, and sports broadcasts.</li>
            <li><strong>1 - 10</strong>: Schedule is not allowed to overlap other schedules with the same or higher priority regardless of event type. If it overlaps a schedule of the same or higher priority, this schedule for that date/time will either be auto-canceled or its time/duration updated to avoid the conflict. If it overlaps a schedule of lower priority, the lower-priority schedule will be auto-canceled or its time/duration updated to avoid the conflict.</li>
        </ul>
        <p>Example: A priority 5 show is scheduled Thursdays 7-9PM. Someone schedules a priority 9 sports broadcast for one of those Thursdays 7-9PM. Because sports takes priority, the show for that day will be auto-canceled.</p>
        <p>Example: A priority 5 show is scheduled Thursdays 8-10PM. Someone schedules a priority 9 sports broadcast for one of those Thursdays 7-9PM. Because sports takes priority, but there is at least 30 minutes of the show that would not be in conflict, the show's time for that day will be updated to 9-10PM instead of completely canceled.</p>
        <p>Example: A priority 9 sports broadcast is scheduled on a Thursday 7-9PM. Someone schedules a new show Thursdays 7-9PM. Because sports takes priority, the show for that Thursday will be marked as canceled automatically.</p>
        <p>Example: A priority 9 sports broadcast is scheduled on a Thursday 7-9PM. Someone schedules a new show Thursdays 5-8PM. Because sports takes priority, but the show for that Thursday has at least 30 minutes outside of the conflict, the show for that Thursday will instead be scheduled for 5-7PM.</p>
        <p>Example: A priority 5 show is scheduled for Fridays 7-9PM. A new priority 5 show is scheduled for Fridays 8-11PM. Both shows have the same priority, so the system prioritizes the show already scheduled. Therefore, the new show will only be allowed to be scheduled Fridays 9-11PM.</p>
        <p>Example: A priorty 5 show, scheduled Thursdays 7-9PM, was canceled on one Thursday by a priority 9 sports broadcast. But the sports broadcast was later canceled. The system will automatically un-cancel the show for that Thursday since the conflicting sports broadcast was canceled.</p>
        <p>Example: A priority 5 show, scheduled Thursdays 8-11PM, was rescheduled to 9-11PM on one Thursday by a priority 9 sports broadcast. But the sports broadcast was later canceled. The system will automatically reverse the show's re-scheduled time since the sports broadcast was canceled, therefore the show can air at its original time of 8-11PM.</p>`,
			true,
			{
				headerColor: "",
				zindex: 2000
			}
		);

		// Generate other modals
		this.occurrenceModal = new WWSUmodal(``, null, ``, true, {
			headerColor: "",
			zindex: 1100
			// openFullscreen: true,
		});
		this.newOccurrenceModal = new WWSUmodal(``, null, ``, true, {
			headerColor: "",
			zindex: 1100
			// openFullscreen: true,
		});
		this.occurrenceActionModal = new WWSUmodal(``, null, ``, true, {
			headerColor: "",
			zindex: 1110,
			overlayClose: false
			// openFullscreen: true,
		});
		this.eventsModal = new WWSUmodal(`Events`, null, ``, true, {
			headerColor: "",
			zindex: 1100
			// openFullscreen: true,
		});
		this.schedulesModal = new WWSUmodal(`Schedules`, null, ``, true, {
			headerColor: "",
			zindex: 1110
			// openFullscreen: true,
		});
		this.scheduleModal = new WWSUmodal(`Schedules`, null, ``, true, {
			headerColor: "",
			zindex: 1120,
			overlayClose: false
			// openFullscreen: true,
		});
		this.eventModal = new WWSUmodal(`New Event`, null, ``, true, {
			headerColor: "",
			zindex: 1120,
			overlayClose: false
			// openFullscreen: true,
		});
		this.definitionsModal = new WWSUmodal(
			`Calendar Definitions`,
			null,
			`<p><strong>Event</strong>: Something that can be scheduled on the calendar.
        (Example: "DJ test - The test show")</p>
      <p><strong>Schedule</strong>: Collection of dates/times and/or recurrence
        rules defining when the event takes place on the calendar. (Example:
        "Tuesdays and Thursdays 9 - 10PM")</p>
      <p><strong>Occurrence</strong>: A specific/single date/time the event takes
        place. (Example: "February 30, 2000, 9 - 10PM")</p>`,
			true,
			{
				headerColor: "",
				zindex: 1100
				// openFullscreen: true,
			}
		);

		this.prerequisitesModal = new WWSUmodal(
			`Calendar Prerequisites`,
			null,
			`<p><span class="badge bg-pink">Prerecord</span> and <span
        class="badge badge-info">Playlist</span>:
      Ensure audio files are
      split in such a way the top-of-hour ID break will air on time. Import
      tracks into RadioDJ, and then create and save a playlist in the playlist
      builder. Note the playlist name you save as.</p>
    <p><span class="badge badge-primary">Genre</span>: In RadioDJ, make a track
      rotation and create a Manual Event that triggers the rotation. Note the
      event name you save as.</p>
    <p><span class="badge badge-danger">Show</span>, <span class="badge bg-pink">Prerecord</span>, or
      <span class="badge bg-indigo">Remote</span>: Be sure to add all DJs hosting the broadcast via
      the
      "DJs" administration menu before adding the event.
    </p>
    <p><span class="badge badge-warning">Office Hours</span> and <span
        class="badge bg-orange">Tasks</span>: Add the director in the system
      via "Directors" administration menu if they have not already been added.</p>`,
			true,
			{
				headerColor: "",
				zindex: 1100
				// openFullscreen: true,
			}
		);
	}

	// Initialize the calendar. Call this on socket connect event.
	init() {
		this.calendar.replaceData(
			this.manager.get("noReq"),
			this.endpoints.get,
			this.data.get
		);
		this.schedule.replaceData(
			this.manager.get("noReq"),
			this.endpoints.getSchedule,
			this.data.getSchedule
		);
		this.clockwheels.replaceData(
			this.manager.get("noReq"),
			this.endpoints.getClockwheels,
			this.data.getClockwheels
		);
	}

	// Shortcuts for WWSUevents
	on(event, scope, fn) {
		this.events.on(event, scope, fn);
	}
	once(event, scope, fn) {
		this.events.once(event, scope, fn);
	}
	off(event, scope, fn) {
		this.events.off(event, scope);
	}
	emitEvent(event, args) {
		this.events.emitEvent(event, args);
	}

	// Emit calendarUpdated event when called.
	calendarUpdated() {
		this.emitEvent("calendarUpdated", []);
	}

	/**
	 * Generate a simple DataTables.js table of the events in the system and have edit/delete links
	 */
	showSimpleEvents() {
		// Initialize the table class
		this.eventsModal.body = `<table id="modal-${this.eventsModal.id}-table" class="table table-striped" style="min-width: 100%;"></table>`;
		this.eventsModal.iziModal("open");

		// Block the modal while we generate the table
		$(`#modal-${this.eventsModal.id}`).block({
			message: "<h1>Loading...</h1>",
			css: { border: "3px solid #a00" },
			timeout: 30000,
			onBlock: () => {
				// Generate the data table
				let table = $(`#modal-${this.eventsModal.id}-table`).DataTable({
					paging: true,
					data: [],
					columns: [
						{ title: "Type" },
						{ title: "Event Name" },
						{ title: "Active?" },
						{ title: "Actions" }
					],
					columnDefs: [{ responsivePriority: 1, targets: 3 }],
					order: [
						[0, "asc"],
						[1, "asc"]
					],
					pageLength: 25,
					drawCallback: () => {
						// Action button click events
						$(".btn-event-edit").unbind("click");
						$(".btn-event-editschedule").unbind("click");
						$(".btn-event-delete").unbind("click");
						$(".btn-event-inactive").unbind("click");
						$(".btn-event-active").unbind("click");

						// Edit event
						$(".btn-event-edit").click(e => {
							let event = this.calendar
								.find()
								.find(
									event =>
										event.ID === parseInt($(e.currentTarget).data("calendarid"))
								);
							this.showEventForm(event);
						});

						// Edit event's schedules
						$(".btn-event-editschedule").click(e => {
							this.showSchedules(
								parseInt($(e.currentTarget).data("calendarid"))
							);
						});

						// Confirm before deleting when someone wants to delete an event
						$(".btn-event-delete").click(e => {
							let event = this.calendar
								.find()
								.find(
									event =>
										event.ID === parseInt($(e.currentTarget).data("calendarid"))
								);
							this.manager.get("WWSUutil").confirmDialog(
								`<p>Are you sure you want to <b>permanently</b> remove ${
									event.name
								}?</p>
                            <ul>
							<li><strong>It is NOT recommended permanently removing an event unless the event was added out of error</strong>. Instead, mark an event as inactive (the event will then be deleted automatically a year after the last broadcast, or at midnight if not applicable).</li>
                                <li>Removes the event</li>
                                <li>Removes all schedules of the event from the calendar</li>
                                ${
																	[
																		"show",
																		"sports",
																		"remote",
																		"prerecord",
																		"genre",
																		"playlist"
																	].indexOf(event.type) !== -1
																		? `<li>If one or more schedules were active, notifies all notification subscribers the event has been discontinued</li><li>Removes all notification subscriptions</li>`
																		: ``
																}
                                ${
																	[
																		"show",
																		"sports",
																		"remote",
																		"prerecord",
																		"playlist"
																	].indexOf(event.type) !== -1
																		? `<li>Notifies host DJs via email that the event has been discontinued.</li>`
																		: ``
																}
                                ${
																	[
																		"show",
																		"sports",
																		"remote",
																		"prerecord",
																		"genre",
																		"playlist"
																	].indexOf(event.type) !== -1
																		? `<li>Does not remove logs; they can still be accessed from the "logs" page of DJ Controls.</li><li>Does not remove analytics, but cannot be accessed anymore from the "analytics" nor "DJs" pages of DJ Controls.</li>`
																		: ``
																}
                            </ul>`,
								event.name,
								() => {
									this.removeCalendar(
										this.eventsModal,
										{ ID: parseInt($(e.currentTarget).data("calendarid")) },
										success => {
											this.eventsModal.body = `<div class="alert alert-warning">
                                Event changes take several seconds to reflect in the system. Please close and re-open this window.
                                </div>`;
										}
									);
								}
							);
						});

						$(".btn-event-inactive").click(e => {
							let event = this.calendar
								.find()
								.find(
									event =>
										event.ID === parseInt($(e.currentTarget).data("calendarid"))
								);
							this.manager.get("WWSUutil").confirmDialog(
								`<p>Are you sure you want to mark ${event.name} as inactive?</p>
							<ul>
							<li><strong>Do not mark an event as inactive unless it will no longer air on WWSU for the forseeable future.</strong></li>
							<li><strong>Marking an event as inactive will remove all its schedules</strong>. This cannot be reversed!</li>
							<li>An inactive event will be permanently removed from the system after going one year without airing a broadcast (or at midnight if not applicable) if not re-activated. This means its analytics can no longer be viewed once permanently removed (but logs will still be available).</li>
							${
								[
									"show",
									"sports",
									"remote",
									"prerecord",
									"genre",
									"playlist"
								].indexOf(event.type) !== -1
									? `<li>If at least one active schedule was present, all notification subscribers will be notified the event has been discontinued</li><li>Removes all notification subscriptions</li>`
									: ``
							}
							${
								["show", "sports", "remote", "prerecord", "playlist"].indexOf(
									event.type
								) !== -1
									? `<li>Will also email the DJ hosts to inform them the event was marked inactive / discontinued.</li>`
									: ``
							}
							${
								[
									"show",
									"sports",
									"remote",
									"prerecord",
									"genre",
									"playlist"
								].indexOf(event.type) !== -1
									? `<li>Show logs and analytics for this broadcast will remain viewable in the system and in DJ Controls.</li>`
									: ``
							}
							</ul>`,
								event.name,
								() => {
									this.inactiveCalendar(
										this.occurrenceModal,
										{ ID: event.calendarID },
										success => {
											this.eventsModal.body = `<div class="alert alert-warning">
                                Event changes take several seconds to reflect in the system. Please close and re-open this window.
                                </div>`;
										}
									);
								}
							);
						});

						$(".btn-event-active").click(e => {
							let event = this.calendar
								.find()
								.find(
									event =>
										event.ID === parseInt($(e.currentTarget).data("calendarid"))
								);
							this.manager.get("WWSUutil").confirmDialog(
								`<p>Are you sure you want to mark ${event.name} as active?</p>
							<ul>
							<li>Re-activates the event and allows you to create schedules and occurrences.</li>
							<li>Does NOT recover old schedules from before the event was marked inactive.</li>
							<li>Does NOT inform host DJs nor subscribers that the event has been re-activated.</li>
							</ul>`,
								null,
								() => {
									this.activeCalendar(
										this.occurrenceModal,
										{ ID: event.ID },
										success => {
											this.eventsModal.body = `<div class="alert alert-warning">
                                Event changes take several seconds to reflect in the system. Please close and re-open this window.
                                </div>`;
										}
									);
								}
							);
						});
					}
				});

				// Populate the data table with data.
				let drawRows = () => {
					this.calendar.find().forEach(calendar => {
						table.rows.add([
							[
								`<span class="badge bg-${this.getColorClass(calendar)}">${
									calendar.type
								}</span>`,
								calendar.name,
								calendar.active
									? `<span class="badge badge-success" title="This event is active."><i class="fas fa-check-circle p-1"></i>Yes</span>`
									: `<span class="badge badge-danger" title="This event is inactive and will be deleted one year after the most recent broadcast date/time (or at midnight for non-broadcast events)."><i class="far fa-times-circle p-1"></i>No</span>`,
								calendar.active
									? `<div class="btn-group"><button class="btn btn-sm btn-primary btn-event-editschedule" data-calendarID="${
											calendar.ID
									  }" title="Edit Schedule"><i class="fas fa-calendar"></i></button>${
											[
												"office-hours",
												"sports",
												"prod-booking",
												"onair-booking"
											].indexOf(calendar.type) === -1
												? `<button class="btn btn-sm btn-warning btn-event-edit" data-calendarid="${calendar.ID}" title="Edit Event"><i class="fas fa-edit"></i></button><button class="btn btn-sm bg-orange btn-event-inactive" data-calendarID="${calendar.ID}" title="Mark event as inactive and delete all its schedules."><i class="fas fa-times-circle"></i></button>`
												: ``
									  }</div>`
									: `<div class="btn-group">
								<button class="btn btn-sm btn-success btn-event-active" data-calendarID="${calendar.ID}" title="Mark event as active."><i class="fas fa-check-circle"></i></button><button class="btn btn-sm btn-danger btn-event-delete" data-calendarID="${calendar.ID}" title="Permanently delete event and all its schedules."><i class="fas fa-trash"></i></button>
								</div>`
							]
						]);
					});
					table.draw();

					$(`#modal-${this.eventsModal.id}`).unblock();
				};

				drawRows();
			}
		});

		this.eventsModal.footer = `<button type="button" class="btn btn-outline-success" id="modal-${this.eventsModal.id}-new" data-dismiss="modal">New Event</button>`;
		$(`#modal-${this.eventsModal.id}-new`).unbind("click");
		$(`#modal-${this.eventsModal.id}-new`).click(() => {
			this.showEventForm(null);
		});
	}

	/**
	 * Open a dataTables.js modal with the schedules for the provided calendar event.
	 *
	 * @param {number} calendarID Calendar event ID
	 */
	showSchedules(calendarID) {
		// Initialize the table
		this.schedulesModal.body = `<table id="modal-${this.schedulesModal.id}-table" class="table table-striped" style="min-width: 100%;"></table>`;
		this.schedulesModal.iziModal("open");

		// Block the modal while we populate
		$(`#modal-${this.schedulesModal.id}`).block({
			message: "<h1>Loading...</h1>",
			css: { border: "3px solid #a00" },
			timeout: 30000,
			onBlock: () => {
				// Generate the table
				let table = $(`#modal-${this.schedulesModal.id}-table`).DataTable({
					scrollCollapse: true,
					paging: true,
					data: [],
					columns: [{ title: "Schedule" }, { title: "Actions" }],
					pageLength: 25,
					columnDefs: [{ responsivePriority: 1, targets: 1 }],
					drawCallback: () => {
						// Action button click events
						$(".btn-schedule-edit").unbind("click");
						$(".btn-schedule-delete").unbind("click");

						// Edit a schedule
						$(".btn-schedule-edit").click(e => {
							let schedule = this.schedule.find(
								{ ID: parseInt($(e.currentTarget).data("scheduleid")) },
								true
							);
							let calendarID = parseInt($(e.currentTarget).data("calendarid"));
							this.showScheduleForm(schedule, calendarID);
						});

						// Prompt before deleting a schedule
						$(".btn-schedule-delete").click(e => {
							let schedule = this.schedule.find(
								{ ID: parseInt($(e.currentTarget).data("scheduleid")) },
								true
							);
							let calendarID = parseInt($(e.currentTarget).data("calendarid"));
							let calendar = this.calendar.find({ ID: calendarID }, true);
							this.manager.get("WWSUutil").confirmDialog(
								`<p>Are you sure you want to delete that schedule?</p>
                        <ul>
                            <li>Please <strong>do not</strong> delete schedules to cancel a specific date/time; click the occurrence on the calendar and elect to cancel it.</li>
                            ${
															[
																"show",
																"sports",
																"remote",
																"prerecord",
																"genre",
																"playlist"
															].indexOf(schedule ? schedule.type : calendar.type) !== -1
																? `<li>Does NOT notify subscribers.</li>`
																: ``
														}
                            ${
															[
																"show",
																"sports",
																"remote",
																"prerecord",
																"playlist"
															].indexOf(schedule ? schedule.type : calendar.type) !== -1
																? `<li>Does NOT email DJs; you will need to let them know of the change.</li>`
																: ``
														}
                            <li>A conflict check will run, and you will be notified of occurrence changes that will be made to avoid conflicts</li>
                        </ul>`,
								null,
								() => {
									let scheduleID = parseInt(
										$(e.currentTarget).data("scheduleid")
									);
									this.removeSchedule(
										this.schedulesModal,
										{ ID: scheduleID },
										success => {
											if (success) {
												this.schedulesModal.body = `<div class="alert alert-warning">
                                    Schedule changes take several seconds to reflect in the system. Please close and re-open this window.
                                    </div>`;
											}
										}
									);
								}
							);
						});
					}
				});

				// Populate the table with data
				let drawRows = () => {
					this.schedule.find({ calendarID: calendarID }).forEach(schedule => {
						// Skip all schedule entries that are unauthorized or specify an update/cancellation; these should be managed via the calendar.
						if (schedule.scheduleType !== null) {
							return;
						}

						table.rows.add([
							[
								this.generateScheduleText(schedule),
								`${
									["canceled-system", "updated-system"].indexOf(
										schedule.scheduleType
									) === -1
										? `<div class="btn-group"><button class="btn btn-sm btn-warning btn-schedule-edit" data-scheduleid="${schedule.ID}" data-calendarid="${schedule.calendarID}" title="Edit Schedule"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-schedule-delete" data-scheduleid="${schedule.ID}" data-calendarid="${schedule.calendarID}" title="Delete Schedule"><i class="fas fa-trash"></i></button></div>`
										: ``
								}`
							]
						]);
					});
					table.draw();
					$(`#modal-${this.schedulesModal.id}`).unblock();
				};

				drawRows();
			}
		});

		this.schedulesModal.footer = `<button type="button" class="btn btn-outline-success" id="modal-${this.schedulesModal.id}-new" data-dismiss="modal">New Schedule</button>`;
		$(`#modal-${this.schedulesModal.id}-new`).unbind("click");
		$(`#modal-${this.schedulesModal.id}-new`).click(() => {
			this.showScheduleForm(null, calendarID);
		});
	}

	/**
	 * Get events and playlists from WWSU's API that can be selected in calendar and event forms.
	 *
	 * @param {function} cb Callback containing array of events first parameter, array of playlists second parameter (only holds ID and name properties)
	 */
	getEventsPlaylists(cb) {
		try {
			this.manager
				.get("noReq")
				.request(
					{ method: "post", url: this.endpoints.getEventsPlaylists, data: {} },
					response => {
						if (!response.playlists || !response.events) {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error loading events and playlists",
								body:
									"There was an error loading events and playlists. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg"
							});
							cb([], []);
						} else {
							cb(response.events, response.playlists);
						}
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error loading events and playlists",
				body:
					"There was an error loading events and playlists. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
			});
			cb([], []);
			console.error(e);
		}
	}

	/**
	 * Tell WWSU API to add a schedule.
	 *
	 * @param {WWSUmodal} modal Modal to get blocked by JQuery UI when prompting for authorization.
	 * @param {object} data Data to pass to the endpoint.
	 * @param {function} cb Function called after the request. True = success, false = failure.
	 */
	addSchedule(modal, data, cb) {
		this.doConflictCheck(modal, data, "insert", () => {
			try {
				this.manager.get("directorReq").request(
					{
						dom: `#modal-${modal.id}`,
						method: "post",
						url: this.endpoints.addSchedule,
						data: data
					},
					response => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error adding schedule",
								body:
									"There was an error adding the schedule. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg"
							});
							cb(false);
						} else {
							$(document).Toasts("create", {
								class: "bg-success",
								title: "Schedule added!",
								autohide: true,
								delay: 15000,
								body: `Schedule was added! However, it may take several seconds to register in the WWSU system.`
							});
							cb(true);
						}
					}
				);
			} catch (e) {
				$(document).Toasts("create", {
					class: "bg-danger",
					title: "Error adding schedule",
					body:
						"There was an error adding the schedule. Please report this to the engineer.",
					autohide: true,
					delay: 10000,
					icon: "fas fa-skull-crossbones fa-lg"
				});
				console.error(e);
				cb(false);
			}
		});
	}

	/**
	 * Tell WWSU API to edit a schedule.
	 *
	 * @param {WWSUmodal} modal Modal to get blocked by JQuery UI when prompting for authorization.
	 * @param {object} data Data to pass to the endpoint.
	 * @param {function} cb Function called after the request. True = success, false = failure.
	 */
	editSchedule(modal, data, cb) {
		this.doConflictCheck(modal, data, "update", () => {
			try {
				this.manager.get("directorReq").request(
					{
						dom: `#modal-${modal.id}`,
						method: "post",
						url: this.endpoints.editSchedule,
						data: data
					},
					response => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error editing schedule",
								body:
									"There was an error editing the schedule. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg"
							});
							cb(false);
						} else {
							$(document).Toasts("create", {
								class: "bg-success",
								title: "Schedule edited!",
								autohide: true,
								delay: 15000,
								body: `Schedule was edited! However, it may take several seconds to register in the WWSU system.`
							});
							cb(true);
						}
					}
				);
			} catch (e) {
				$(document).Toasts("create", {
					class: "bg-danger",
					title: "Error editing schedule",
					body:
						"There was an error editing the schedule. Please report this to the engineer.",
					autohide: true,
					delay: 10000,
					icon: "fas fa-skull-crossbones fa-lg"
				});
				console.error(e);
				cb(false);
			}
		});
	}

	/**
	 * Tell WWSU API to remove a schedule.
	 *
	 * @param {WWSUmodal} modal Modal to get blocked by JQuery UI when prompting for authorization.
	 * @param {object} data Data to pass to the endpoint.
	 * @param {function} cb Function called after the request. True = success, false = failure.
	 */
	removeSchedule(modal, data, cb) {
		let schedule;
		try {
			schedule = this.schedule.find({ ID: data.ID }, true);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error removing/reversing schedule",
				body:
					"There was an error removing/reversing the schedule. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
			});
			cb(false);
			return;
		}
		this.doConflictCheck(modal, schedule, "remove", () => {
			try {
				this.manager.get("directorReq").request(
					{
						dom: `#modal-${modal.id}`,
						method: "post",
						url: this.endpoints.removeSchedule,
						data: data
					},
					response => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error removing/reversing schedule",
								body:
									"There was an error removing/reversing the schedule. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg"
							});
							cb(false);
						} else {
							$(document).Toasts("create", {
								class: "bg-success",
								title: "Schedule removed/reversed",
								autohide: true,
								delay: 15000,
								body: `Schedule was removed/reversed! However, it may take several seconds to register in the WWSU system.`
							});
							cb(true);
						}
					}
				);
			} catch (e) {
				$(document).Toasts("create", {
					class: "bg-danger",
					title: "Error removing/reversing schedule",
					body:
						"There was an error removing/reversing the schedule. Please report this to the engineer.",
					autohide: true,
					delay: 10000,
					icon: "fas fa-skull-crossbones fa-lg"
				});
				console.error(e);
				cb(false);
			}
		});
	}

	/**
	 * Tell WWSU API to add a calendar event.
	 *
	 * @param {WWSUmodal} modal Modal to get blocked by JQuery UI when prompting for authorization.
	 * @param {object} data Data to pass to the endpoint.
	 * @param {function} cb Function called after the request. True = success, false = failure.
	 */
	addCalendar(modal, data, cb) {
		// No conflict check necessary because new calendar events will never have a schedule immediately on creation.
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${modal.id}`,
					method: "post",
					url: this.endpoints.add,
					data: data
				},
				response => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error adding event",
							body:
								"There was an error adding the event. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg"
						});
						cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Event added",
							autohide: true,
							delay: 10000,
							body: `Event was added!`
						});
						cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error adding event",
				body:
					"There was an error adding the event. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
			});
			console.error(e);
			cb(false);
		}
	}

	/**
	 * Tell WWSU API to edit a calendar event.
	 *
	 * @param {WWSUmodal} modal Modal to get blocked by JQuery UI when prompting for authorization.
	 * @param {object} data Data to pass to the endpoint.
	 * @param {function} cb Function called after the request. True = success, false = failure.
	 */
	editCalendar(modal, data, cb) {
		// Editing a calendar event requires conflict checking because it may affect the priority of its schedules using default values.
		this.doConflictCheck(modal, data, "updateCalendar", () => {
			try {
				this.manager.get("directorReq").request(
					{
						dom: `#modal-${modal.id}`,
						method: "post",
						url: this.endpoints.edit,
						data: data
					},
					response => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error editing event",
								body:
									"There was an error editing the event. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg"
							});
							cb(false);
						} else {
							$(document).Toasts("create", {
								class: "bg-success",
								title: "Event edited",
								autohide: true,
								delay: 15000,
								body: `Event was edited! It may take several seconds for it to reflect in the system.`
							});
							cb(true);
						}
					}
				);
			} catch (e) {
				$(document).Toasts("create", {
					class: "bg-danger",
					title: "Error editing event",
					body:
						"There was an error editing the event. Please report this to the engineer.",
					autohide: true,
					delay: 10000,
					icon: "fas fa-skull-crossbones fa-lg"
				});
				console.error(e);
				cb(false);
			}
		});
	}

	/**
	 * Tell WWSU API to remove an entire calendar event.
	 *
	 * @param {WWSUmodal} modal Modal to get blocked by JQuery UI when prompting for authorization.
	 * @param {object} data Data to pass to the endpoint.
	 * @param {function} cb Function called after the request. True = success, false = failure.
	 */
	removeCalendar(modal, data, cb) {
		// We need to determine if the removal of this calendar (and thus all its schedules) will affect other events
		let calendar = this.calendar.find({ ID: data.ID }, true);
		this.doConflictCheck(modal, calendar, "removeCalendar", () => {
			try {
				this.manager.get("directorReq").request(
					{
						dom: `#modal-${modal.id}`,
						method: "post",
						url: this.endpoints.remove,
						data: data
					},
					response => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error removing event",
								body:
									"There was an error removing the event. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg"
							});
							cb(false);
						} else {
							$(document).Toasts("create", {
								class: "bg-success",
								title: "Event remove",
								autohide: true,
								delay: 15000,
								body: `Event was permanently removed! However, it may take several seconds to register in the WWSU system.`
							});
							cb(true);
						}
					}
				);
			} catch (e) {
				$(document).Toasts("create", {
					class: "bg-danger",
					title: "Error removing event",
					body:
						"There was an error removing the event. Please report this to the engineer.",
					autohide: true,
					delay: 10000,
					icon: "fas fa-skull-crossbones fa-lg"
				});
				console.error(e);
				cb(false);
			}
		});
	}

	/**
	 * Tell WWSU API to mark a calendar event as inactive.
	 *
	 * @param {WWSUmodal} modal Modal to get blocked by JQuery UI when prompting for authorization.
	 * @param {object} data Data to pass to the endpoint.
	 * @param {function} cb Function called after the request. True = success, false = failure.
	 */
	inactiveCalendar(modal, data, cb) {
		// We need to determine if the removal of this calendar (and thus all its schedules) will affect other events
		console.dir(data);
		let calendar = this.calendar.find({ ID: data.ID }, true);
		this.doConflictCheck(modal, calendar, "removeCalendar", () => {
			try {
				this.manager.get("directorReq").request(
					{
						dom: `#modal-${modal.id}`,
						method: "post",
						url: this.endpoints.inactive,
						data: data
					},
					response => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error marking event inactive",
								body:
									"There was an error marking the event inactive. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg"
							});
							cb(false);
						} else {
							$(document).Toasts("create", {
								class: "bg-success",
								title: "Event marked inactive",
								autohide: true,
								delay: 15000,
								body: `Event was marked inactive and all schedules removed! However, it may take several seconds for the changes to reflect in the system.`
							});
							cb(true);
						}
					}
				);
			} catch (e) {
				$(document).Toasts("create", {
					class: "bg-danger",
					title: "Error marking event inactive",
					body:
						"There was an error marking the event inactive. Please report this to the engineer.",
					autohide: true,
					delay: 10000,
					icon: "fas fa-skull-crossbones fa-lg"
				});
				console.error(e);
				cb(false);
			}
		});
	}

	/**
	 * Tell WWSU API to mark a calendar event as active.
	 *
	 * @param {WWSUmodal} modal Modal to get blocked by JQuery UI when prompting for authorization.
	 * @param {object} data Data to pass to the endpoint.
	 * @param {function} cb Function called after the request. True = success, false = failure.
	 */
	activeCalendar(modal, data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${modal.id}`,
					method: "post",
					url: this.endpoints.active,
					data: data
				},
				response => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error marking event active",
							body:
								"There was an error marking the event active. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg"
						});
						cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Event marked active",
							autohide: true,
							delay: 15000,
							body: `Event was marked active! However, it may take several seconds for the changes to reflect in the system.`
						});
						cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error marking event active",
				body:
					"There was an error marking the event active. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
			});
			console.error(e);
			cb(false);
		}
	}

	/**
	 * Display a modal of a clicked event from the calendar.
	 *
	 * @param {object} event Calendardb event
	 */
	showClickedEvent(event) {
		console.dir(event);
		this.occurrenceModal.title = `${event.type}: ${event.hosts} - ${event.name}`;
		this.occurrenceModal.body = this.generateFullEventCard(event);

		// Initialize this.manager.get("WWSUutil")ities

		// Initialize choices / actions that can be performed on the event.
		let choices = ["Do Nothing"];

		// Determine what else can be done
		if (event.scheduleType === "updated") {
			choices.push(`Occurrence: Reverse / Discard this Update`);
		}
		if (event.scheduleType === "canceled") {
			choices.push(`Occurrence: Reverse Cancellation`);
		}
		if (
			[
				"canceled",
				"canceled-system",
				"canceled-changed",
				"unscheduled"
			].indexOf(event.scheduleType) === -1
		) {
			choices.push(`Occurrence: Cancel`);
		}
		if (
			[
				"canceled",
				"canceled-system",
				"canceled-changed",
				"unscheduled"
			].indexOf(event.scheduleType) === -1
		) {
			choices.push(`Occurrence: Update or Reschedule`);
		}
		choices.push(`Event Schedules: Add / Edit / Delete`);
		if (
			["sports", "office-hours", "prod-booking", "onair-booking"].indexOf(
				event.type
			) === -1
		) {
			choices.push(`Event: Edit Defaults`);
			choices.push(`Event: Mark Inactive (and Remove All Schedules)`);
		}

		// generate form
		this.occurrenceModal.footer = ``;
		$(this.occurrenceModal.footer).alpaca({
			schema: {
				type: "object",
				properties: {
					action: {
						type: "string",
						required: true,
						title: "Choose an action",
						enum: choices
					}
				}
			},
			options: {
				fields: {
					action: {
						select: true
					}
				},
				form: {
					buttons: {
						submit: {
							title: "Perform Action",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();

								// Determine what to do based on selected action
								switch (value.action) {
									// Confirm whether or not to reverse schedule changes
									case `Occurrence: Reverse / Discard this Update`:
										this.manager.get("WWSUutil").confirmDialog(
											`<p>Are you sure you want to reverse updates made for ${
												event.type
											}: ${event.name} on ${moment(event.start).format(
												"LLLL"
											)}?</p>
                                        <ul>
                                            <li>Discards updates applied to this date/time</li>
                                            <li>Reverts this back to event's regular scheduled time and options if changed</li>
                                            ${
																							value.newTime &&
																							value.newTime !== "" &&
																							[
																								"show",
																								"sports",
																								"remote",
																								"prerecord",
																								"genre",
																								"playlist"
																							].indexOf(event.type) !== -1
																								? `<li>Notifies subscribers that the broadcast will air at its original date/time.</li>`
																								: ``
																						}
                                            ${
																							value.newTime &&
																							value.newTime !== "" &&
																							[
																								"show",
																								"sports",
																								"remote",
																								"prerecord",
																								"playlist"
																							].indexOf(event.type) !== -1
																								? `<li>Emails DJs to let them know the broadcast is to air at its original date/time.</li>`
																								: ``
																						}
                                            <li>A conflict check will run, and you will be notified of occurrence changes that will be made to avoid conflicts</li>
                                        </ul>`,
											null,
											() => {
												this.removeSchedule(
													this.occurrenceModal,
													{ ID: event.scheduleID },
													success => {
														if (success) {
															this.occurrenceModal.iziModal("close");
														}
													}
												);
											}
										);
										break;

									// Confirm whether or not to reverse a cancellation
									case `Occurrence: Reverse Cancellation`:
										this.manager.get("WWSUutil").confirmDialog(
											`<p>Are you sure you want to reverse the cancellation of ${
												event.type
											}: ${event.name} on ${moment(event.start).format(
												"LLLL"
											)}?</p>
                                        <ul>
                                            <li>Occurrence will be on the schedule again</li>
                                            ${
																							value.newTime &&
																							value.newTime !== "" &&
																							[
																								"show",
																								"sports",
																								"remote",
																								"prerecord",
																								"genre",
																								"playlist"
																							].indexOf(event.type) !== -1
																								? `<li>Notifies subscribers that the broadcast will air at its original date/time.</li>`
																								: ``
																						}
                                            ${
																							value.newTime &&
																							value.newTime !== "" &&
																							[
																								"show",
																								"sports",
																								"remote",
																								"prerecord",
																								"playlist"
																							].indexOf(event.type) !== -1
																								? `<li>Emails DJs to let them know the broadcast is to air at its original date/time.</li>`
																								: ``
																						}
                                            <li>A conflict check will run, and you will be notified of occurrence changes that will be made to avoid conflicts</li>
                                        </ul>`,
											null,
											() => {
												this.removeSchedule(
													this.occurrenceModal,
													{ ID: event.scheduleID },
													success => {
														if (success) {
															this.occurrenceModal.iziModal("close");
														}
													}
												);
											}
										);
										break;

									// Confirm whether or not to mark an event inactive
									case `Event: Mark Inactive (and Remove All Schedules)`:
										/*
										this.manager.get("WWSUutil").confirmDialog(
											`<p>Are you sure you want to <b>permanently</b> remove ${
												event.type
											}: ${event.name}?</p>
                                        <ul>
                                        <li><strong>Do not permanently remove events until/unless</strong> you know the event will no longer occur/air (virtually ever again) and you no longer need its analytics in the "analytics" page of DJ Controls.</li>
                                        <li>Removes the event</li>
                                        <li>Removes all schedules of the event from the calendar</li>
                                        ${
																					[
																						"show",
																						"sports",
																						"remote",
																						"prerecord",
																						"genre",
																						"playlist",
																					].indexOf(event.type) !== -1
																						? `<li>Notifies all notification subscribers the event has been discontinued</li><li>Removes all notification subscriptions</li>`
																						: ``
																				}
                                        ${
																					[
																						"show",
																						"sports",
																						"remote",
																						"prerecord",
																						"playlist",
																					].indexOf(event.type) !== -1
																						? `<li>Does NOT email DJs; you will need to notify them of the broadcast being discontinued.</li>`
																						: ``
																				}
                                        ${
																					[
																						"show",
																						"sports",
																						"remote",
																						"prerecord",
																						"genre",
																						"playlist",
																					].indexOf(event.type) !== -1
																						? `<li>Does not remove logs; they can still be accessed from the "logs" page of DJ Controls.</li><li>Does not remove analytics, but cannot be accessed anymore from the "analytics" nor "DJs" pages of DJ Controls.</li>`
																						: ``
																				}
                                        </ul>`,
											event.name,
											() => {
												this.removeCalendar(
													this.occurrenceModal,
													{ ID: event.calendarID },
													(success) => {
														if (success) {
															this.occurrenceModal.iziModal("close");
														}
													}
												);
											}
										);
										*/

										this.manager.get("WWSUutil").confirmDialog(
											`<p>Are you sure you want to mark ${
												event.name
											} as inactive?</p>
                                        <ul>
                                        <li><strong>Do not mark an event as inactive unless it will no longer air on WWSU for the forseeable future.</strong></li>
                                        <li><strong>Marking an event as inactive will remove all its schedules</strong>. This cannot be reversed!</li>
										<li>An inactive event will be permanently removed from the system after going one year without airing a broadcast (or at midnight if not applicable) if not re-activated. This means its analytics can no longer be viewed once permanently removed (but logs will still be available).</li>
                                        ${
																					[
																						"show",
																						"sports",
																						"remote",
																						"prerecord",
																						"genre",
																						"playlist"
																					].indexOf(event.type) !== -1
																						? `<li>If at least one active schedule was present, all notification subscribers will be notified the event has been discontinued</li><li>Removes all notification subscriptions</li>`
																						: ``
																				}
                                        ${
																					[
																						"show",
																						"sports",
																						"remote",
																						"prerecord",
																						"playlist"
																					].indexOf(event.type) !== -1
																						? `<li>Will also email the DJ hosts to inform them the event was marked inactive / discontinued.</li>`
																						: ``
																				}
                                        ${
																					[
																						"show",
																						"sports",
																						"remote",
																						"prerecord",
																						"genre",
																						"playlist"
																					].indexOf(event.type) !== -1
																						? `<li>Show logs and analytics for this broadcast will remain viewable in the system and in DJ Controls.</li>`
																						: ``
																				}
                                        </ul>`,
											event.name,
											() => {
												this.inactiveCalendar(
													this.occurrenceModal,
													{ ID: event.calendarID },
													success => {
														if (success) {
															this.occurrenceModal.iziModal("close");
														}
													}
												);
											}
										);
										break;

									case `Occurrence: Cancel`:
										this.showCancelForm(event);
										break;

									case `Event: Edit Defaults`:
										let _calendar = this.calendar
											.find()
											.find(_event => _event.ID === event.calendarID);
										this.showEventForm(_calendar);
										break;

									case `Occurrence: Update or Reschedule`:
										this.showOccurrenceForm(event);
										break;

									case `Event Schedules: Add / Edit / Delete`:
										this.showSchedules(event.calendarID);
										break;
								}
							}
						}
					}
				}
			}
		});

		this.occurrenceModal.iziModal("open");
	}

	/**
	 * Generate HTML card to view a full event
	 *
	 * @param {object} event Event as generated from calendardb.processRecord
	 * @returns {string} HTML of the card
	 */
	generateFullEventCard(event) {
		// Get color and icon for the event
		let colorClass = this.getColorClass(event);
		let iconClass = this.getIconClass(event);

		// Use dark color instead if this event was canceled
		if (
			["canceled", "canceled-system", "canceled-changed"].indexOf(
				event.scheduleType
			) !== -1
		) {
			colorClass = "dark";
		}

		// Determine if we should show a ribbon indicating a changed status of the event
		let badgeInfo;
		if (["canceled-changed"].indexOf(event.scheduleType) !== -1) {
			badgeInfo = `<div class="ribbon-wrapper ribbon-lg">
			<div class="ribbon bg-orange" title="This event was re-scheduled to a different date/time for this instance.">
			  RE-SCHEDULED
			</div>
		  </div>`;
		}
		if (
			["updated", "updated-system"].indexOf(event.scheduleType) !== -1 &&
			event.timeChanged
		) {
			badgeInfo = `<div class="ribbon-wrapper ribbon-lg">
			<div class="ribbon bg-warning" title="This event was re-scheduled from its original date/time; this is the new temporary date/time.">
			  TEMP TIME
			</div>
		  </div>`;
		}
		if (["canceled", "canceled-system"].indexOf(event.scheduleType) !== -1) {
			badgeInfo = `<div class="ribbon-wrapper ribbon-lg">
			<div class="ribbon bg-danger" title="This event was canceled for this date/time.">
			  CANCELED
			</div>
		  </div>`;
		}

		return `<div class="p-2 card card-${colorClass} card-outline position-relative">
		<div class="ribbon-wrapper">
		<div class="ribbon bg-${colorClass}">
			${event.type}
		</div>
	</div>
	${badgeInfo || ``}
      <div class="card-body box-profile">
        <div class="text-center">
        ${
					event.logo !== null
						? `<img class="profile-user-img img-fluid img-circle" src="https://server.wwsu1069.org/uploads/calendar/logo/${event.logo}" alt="Show Logo">`
						: `<i class="profile-user-img img-fluid img-circle ${iconClass} bg-${colorClass}" style="font-size: 5rem;"></i>`
				}
        </div>

        <h3 class="profile-username text-center">${event.name}</h3>

        <p class="text-muted text-center">${event.hosts}</p>

        <ul class="list-group list-group-unbordered mb-3">
        ${
					event.scheduleReason !== null
						? `<li class="list-group-item text-center"><strong>${event.scheduleReason}</strong></li>`
						: ``
				}
        <li class="list-group-item text-center">
            <b>${
							["canceled", "canceled-system", "canceled-changed"].indexOf(
								event.scheduleType
							) !== -1
								? `Original Time: `
								: `Scheduled Time: `
						}${moment(event.start).format("lll")} - ${moment(event.end).format(
			"hh:mm A"
		)}</b>
        </li>
        <li class="list-group-item">
        ${
					event.banner !== null
						? `<img class="img-fluid" src="https://server.wwsu1069.org/uploads/calendar/banner/${event.banner}" alt="Show Banner">`
						: ``
				}
        </li>
        <li class="list-group-item">
            ${event.description !== null ? event.description : ``}
        </li>
        </ul>
      </div>
    </div>`;
	}

	/**
	 * Show a form to cancel an occurrence.
	 *
	 * @param {object} event CalendarDb event
	 */
	showCancelForm(event) {
		this.occurrenceActionModal.title = `Cancel ${event.type}: ${
			event.hosts
		} - ${event.name} on ${moment(event.start).format("LLLL")}`;
		this.occurrenceActionModal.footer = ``;
		this.occurrenceActionModal.body = ``;

		// Generate form
		$(this.occurrenceActionModal.body).alpaca({
			schema: {
				type: "object",
				properties: {
					scheduleReason: {
						type: "string",
						title: "Reason for cancellation",
						maxLength: 255
					}
				}
			},
			options: {
				fields: {
					scheduleReason: {
						type: "textarea",
						helper:
							"The reason will be displayed publicly on the website and will be saved in logs"
					}
				},
				form: {
					buttons: {
						submit: {
							title: "Cancel Event",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();

								// Confirm if we want to really cancel
								this.manager.get("WWSUutil").confirmDialog(
									`<p>Are you sure you want to cancel ${event.type}: ${
										event.hosts
									} - ${event.name} on ${moment(event.start).format(
										"LLLL"
									)}?</p>
                                        <ul>
                                            <li>Please <strong>do not</strong> cancel occurrences to make room to schedule other events; scheduling the other event will automatically make adjustments as necessary and reverse the changes should the other event get canceled.</li>
                                            <li>Marks this occurrence as canceled on calendar. <strong>After cancelling, go to an admin DJ Controls, and under "To-do", mark the cancellation as either excused (WWSU-prompted) or unexcused (DJ-prompted).</strong></li>
                                            ${
																							[
																								"show",
																								"sports",
																								"remote"
																							].indexOf(event.type) !== -1
																								? `<li>If the DJ tries to broadcast on this date/time, it will be flagged as an unauthorized / unscheduled broadcast.</li>`
																								: ``
																						}
                                            ${
																							["remote"].indexOf(event.type) !==
																							-1
																								? `<li>DJ Controls will deny the DJ's ability to start a remote broadcast on this date/time if their DJ Controls is DJ-locked.</li>`
																								: ``
																						}
                                            ${
																							["prerecord", "playlist"].indexOf(
																								event.type
																							) !== -1
																								? `<li>This prerecord or playlist will not be aired by the system on this date/time.</li>`
																								: ``
																						}
                                            ${
																							["genre"].indexOf(event.type) !==
																							-1
																								? `<li>This genre rotation will not start on this date/time; if no other genres are scheduled, the system will go to default rotation.</li>`
																								: ``
																						}
                                            ${
																							[
																								"show",
																								"sports",
																								"remote",
																								"prerecord",
																								"genre",
																								"playlist"
																							].indexOf(event.type) !== -1
																								? `<li>Subscribers will be notified the event was canceled on this date/time.</li>`
																								: ``
																						}
                                            ${
																							[
																								"show",
																								"sports",
																								"remote",
																								"prerecord",
																								"playlist"
																							].indexOf(event.type) !== -1
																								? `<li>DJs will be emailed informing them their broadcast was canceled on this date/time.</li>`
																								: ``
																						}
                                            <li>Any event occurrences canceled or changed via priorities because of this occurrence will have their cancellations / updates reversed; they will be back on the schedule with their original dates/times. Subscribers will be notified of this as well.</li>
                                        </ul>`,
									null,
									() => {
										this.addSchedule(
											this.occurrenceActionModal,
											{
												calendarID: event.calendarID,
												scheduleID: event.scheduleID,
												scheduleType: "canceled",
												scheduleReason: value.scheduleReason,
												originalTime: event.start
											},
											success => {
												if (success) {
													this.occurrenceActionModal.iziModal("close");
													this.occurrenceModal.iziModal("close");
												}
											}
										);
									}
								);
							}
						}
					}
				}
			}
		});

		this.occurrenceActionModal.iziModal("open");
	}

	/**
	 * Show form to add a new event or edit an existing one.
	 *
	 * @param {?object} event Original event data if editing an event, or null if making a new one
	 */
	showEventForm(event) {
		this.eventModal.title = `${
			event
				? `Edit event ${event.type}: ${event.hosts} - ${event.name}`
				: `New event`
		}`;
		this.eventModal.footer = ``;
		this.eventModal.body = ``;

		// We need to get the events and playlists we can choose from
		this.getEventsPlaylists((events, playlists) => {
			let _djs = this.manager.get("WWSUdjs").find({ active: true });

			let calendarEvents = this.calendar.find().map(_event => _event.name);

			// Generate the form
			$(this.eventModal.body).alpaca({
				schema: {
					title: "Default Event Properties",
					type: "object",
					properties: {
						type: {
							type: "string",
							required: true,
							title: "Event Type",
							enum: [
								"show",
								"remote",
								"prerecord",
								"genre",
								"playlist",
								"event"
							]
						},
						name: {
							type: "string",
							required: true,
							title: "Event Name",
							maxLength: 255
						},
						description: {
							type: "string",
							title: "Event Description"
						},
						priority: {
							type: "number",
							title: "Event Priority",
							minimum: -1,
							maximum: 10
						},
						hostDJ: {
							type: "number",
							title: "Host DJ",
							enum: _djs.map(dj => dj.ID)
						},
						cohostDJ1: {
							type: "number",
							title: "Co-Host DJ (1)",
							enum: _djs.map(dj => dj.ID)
						},
						cohostDJ2: {
							type: "number",
							title: "Co-Host DJ (2)",
							enum: _djs.map(dj => dj.ID)
						},
						cohostDJ3: {
							type: "number",
							title: "Co-Host DJ (3)",
							enum: _djs.map(dj => dj.ID)
						},
						playlistID: {
							type: "number",
							title: "RadioDJ Playlist",
							enum: playlists.map(playlist => playlist.ID)
						},
						eventID: {
							type: "number",
							title: "RadioDJ Rotation-triggering Manual Event",
							enum: events.map(eventb => eventb.ID)
						}
					}
				},

				options: {
					fields: {
						type: {
							type: "select"
						},
						name: {
							helper: "Event may not share the name of another event",
							validator: function(callback) {
								let value = this.getValue();
								if (value.includes(" -")) {
									callback({
										status: false,
										message: `Invalid; event names may not contain " - " as this is a separation used by the system.`
									});
									return;
								}
								if (
									calendarEvents.indexOf(value) !== -1 &&
									(!event || !event.name || event.name !== value)
								) {
									callback({
										status: false,
										message:
											"Value in this field matches the name of another event. This is not allowed."
									});
									return;
								}
								callback({
									status: true
								});
							}
						},
						description: {
							type: "textarea"
						},
						priority: {
							type: "integer",
							helper: `Please see <button class="btn btn-sm btn-outline-info" data-izimodal-open="#modal-${this.priorityInfoModal.id}">This Modal</button> for information on how priorities work regarding schedule conflicts. If left blank, a default priority depending on event type will be used (sports = 9, remote = 7, show = 5, prerecord = 3, playlist = 1, genre = 0, everything else = -1).`
						},
						hostDJ: {
							type: "select",
							optionLabels: _djs.map(dj => dj.name),
							helper:
								"The DJ who signed up for this show, or the official WWSU producer for shows run by non-WWSU people. This field is required for show, remote, and prerecord events.",
							validator: function(callback) {
								let value = this.getValue();
								let type = this.getParent().childrenByPropertyId[
									"type"
								].getValue();
								if (
									["show", "remote", "prerecord"].indexOf(type) !== -1 &&
									(!value || value === "")
								) {
									callback({
										status: false,
										message:
											"Field is required for show, remote, and prerecord events."
									});
									return;
								}
								callback({
									status: true
								});
							}
						},
						cohostDJ1: {
							type: "select",
							optionLabels: _djs.map(dj => dj.name),
							helper:
								"If another DJ runs this show together with the host DJ, specify them here."
						},
						cohostDJ2: {
							type: "select",
							optionLabels: _djs.map(dj => dj.name),
							helper:
								"If there is a third DJ who runs this show, specify them here."
						},
						cohostDJ3: {
							type: "select",
							optionLabels: _djs.map(dj => dj.name),
							helper:
								"If there is a fourth DJ who runs this show, specify them here."
						},
						playlistID: {
							type: "select",
							optionLabels: playlists.map(playlist => playlist.name),
							helper: "Required for prerecords and playlists only.",
							validator: function(callback) {
								let value = this.getValue();
								let type = this.getParent().childrenByPropertyId[
									"type"
								].getValue();
								if (
									["prerecord", "playlist"].indexOf(type) !== -1 &&
									(!value || value === "")
								) {
									callback({
										status: false,
										message:
											"Field is required for prerecord and playlist events."
									});
									return;
								}
								callback({
									status: true
								});
							}
						},
						eventID: {
							type: "select",
							optionLabels: events.map(eventb => eventb.name),
							helper: "Required for genres only.",
							validator: function(callback) {
								let value = this.getValue();
								let type = this.getParent().childrenByPropertyId[
									"type"
								].getValue();
								if (
									["genre"].indexOf(type) !== -1 &&
									(!value || value === "")
								) {
									callback({
										status: false,
										message: "Field is required for genre events."
									});
									return;
								}
								callback({
									status: true
								});
							}
						}
					},

					form: {
						buttons: {
							submit: {
								title: `${event ? `Edit` : `Add`} Event`,
								click: (form, e) => {
									form.refreshValidationState(true);
									if (!form.isValid(true)) {
										form.focus();
										return;
									}
									let value = form.getValue();

									let _event = this.verify(value); // Verify the event is valid first just to be extra sure

									if (!_event.event) {
										$(document).Toasts("create", {
											class: "bg-warning",
											title: "Event verification failed",
											autohide: true,
											delay: 20000,
											body: _event
										});
										form.focus();
										return;
									}

									// Add/edit the event
									if (event) {
										value.ID = event.ID;
										this.editCalendar(this.eventModal, value, success => {
											if (success) {
												this.eventModal.iziModal("close");
												this.occurrenceModal.iziModal("close");
											}
										});
									} else {
										this.addCalendar(this.eventModal, value, success => {
											if (success) {
												this.eventModal.iziModal("close");
												this.occurrenceModal.iziModal("close");
											}
										});
									}
								}
							}
						}
					}
				},

				data: event ? event : []
			});

			this.eventModal.iziModal("open");
		});
	}

	/**
	 * Show form to edit an occurrence.
	 *
	 * @param {object} event Original event data
	 * @param {?string} newStart Pre-fill a new start date/time for the reschedule
	 * @param {?number} newDuration Pre-fill a new duration for the reschedule
	 */
	showOccurrenceForm(event, newStart, newDuration) {
		this.occurrenceActionModal.title = `Edit occurrence ${event.type}: ${
			event.hosts
		} - ${event.name} on ${moment(event.start).format("LLLL")}`;
		this.occurrenceActionModal.footer = "";
		this.occurrenceActionModal.body = "";

		let validTypes = [];

		// Limit the types we can switch to for this occurrence depending on the type of the original event.
		switch (event.type) {
			case "show":
			case "remote":
			case "prerecord":
				validTypes = ["show", "remote", "prerecord"];
				break;
			case "genre":
			case "playlist":
				validTypes = ["genre", "playlist"];
				break;
			case "sports":
				validTypes = ["sports"];
				break;
			case "office-hours":
				validTypes = ["office-hours"];
				break;
			case "prod-booking":
			case "onair-booking":
				validTypes = ["prod-booking", "onair-booking"];
				break;
			case "task":
				validTypes = ["task"];
				break;
		}

		// Get events and playlist we can select
		this.getEventsPlaylists((events, playlists) => {
			let _djs = this.manager.get("WWSUdjs").find({ active: true });

			let calendarEvents = this.calendar.find().map(event => event.name);

			let sportsEvents = this.calendar
				.find()
				.filter(event => event.type === "sports")
				.map(event => event.name);

			// Generate form
			$(this.occurrenceActionModal.body).alpaca({
				schema: {
					title: "Properties for this occurrence only",
					type: "object",
					properties: {
						calendarID: {
							type: "number"
						},
						scheduleID: {
							type: "number"
						},
						scheduleType: {
							type: "string"
						},
						originalTime: {
							type: "string"
						},
						scheduleReason: {
							type: "string",
							title: "Reason for update/change",
							maxLength: 255
						},
						newTime: {
							format: "datetime",
							title: "Change start date/time"
						},
						duration: {
							type: "number",
							title: "Change occurrence duration",
							min: 1 / 60,
							max: 24
						},
						type: {
							type: "string",
							title: "Change occurrence type",
							enum: validTypes
						},
						name: {
							type: "string",
							title: "Change occurrence name",
							maxLength: 255
						},
						description: {
							type: "string",
							title: "Change occurrence description"
						},
						priority: {
							type: "number",
							title: "Change occurrence priority",
							minimum: -1,
							maximum: 10
						},
						hostDJ: {
							type: "number",
							title: "Change occurrence Host DJ",
							enum: _djs.map(dj => dj.ID)
						},
						cohostDJ1: {
							type: "number",
							title: "Change occurrence Co-Host DJ (1)",
							enum: _djs.map(dj => dj.ID)
						},
						cohostDJ2: {
							type: "number",
							title: "Change occurrence Co-Host DJ (2)",
							enum: _djs.map(dj => dj.ID)
						},
						cohostDJ3: {
							type: "number",
							title: "Change occurrence Co-Host DJ (3)",
							enum: _djs.map(dj => dj.ID)
						},
						playlistID: {
							type: "number",
							title: "Change occurrence RadioDJ Playlist",
							enum: playlists.map(playlist => playlist.ID)
						},
						eventID: {
							type: "number",
							title:
								"Change occurrence RadioDJ Rotation-triggering Manual Event",
							enum: events.map(eventb => eventb.ID)
						}
					}
				},

				options: {
					fields: {
						calendarID: {
							type: "hidden"
						},
						scheduleID: {
							type: "hidden"
						},
						scheduleType: {
							type: "hidden"
						},
						originalTime: {
							type: "hidden"
						},
						scheduleReason: {
							type: "textarea",
							helper:
								"The reason will be displayed publicly on the website and will be saved in logs"
						},
						newTime: {
							dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
								.parseZone(
									this.manager.get("WWSUMeta")
										? this.manager.get("WWSUMeta").meta.time
										: undefined
								)
								.format("Z")}`,
							helper: `If this occurrence should happen at a different date/time, specify it here. The date will default to the station's timezone of ${
								this.manager.get("WWSUMeta")
									? this.manager.get("WWSUMeta").meta.timezone
									: "Unknown zone"
							}. The current start date/time is <strong>${moment
								.parseZone(event.start)
								.format("LLLL Z")}</strong>.`,
							picker: {
								inline: true,
								sideBySide: true
							}
						},
						duration: {
							helper: `If changing the duration of this occurrence, type the new duration here (in hours; decimals permitted). The current duration is <strong>${event.duration /
								60}</strong>.`
						},
						type: {
							type: "select",
							helper: `If changing the type for this occurrence, specify the new type here. The types you may change to are limited and depend on the original type. The current type is <strong>${event.type}</strong>`
						},
						name: {
							helper: `If changing the name of this occurrence, specify it here. The current name is <strong>${event.name}</strong>. This field is ignored for bookings and office-hours.`,
							validator: function(callback) {
								let value = this.getValue();
								if (value.includes(" -")) {
									callback({
										status: false,
										message: `Invalid; event names may not contain " - " as this is a separation used by the system.`
									});
									return;
								}

								let type = this.getParent().childrenByPropertyId[
									"type"
								].getValue();
								if (event.type === "sports") value = value.split(" vs.")[0];
								if (
									value &&
									value !== "" &&
									(((!type || type === "") && event.type === "sports") ||
										type === "sports") &&
									sportsEvents.indexOf(value) === -1
								) {
									callback({
										status: false,
										message: `For sports, name must begin with a valid sport and optionally proceed with " vs. name of opponent team". Valid sports: ${sportsEvents.join(
											", "
										)}`
									});
									return;
								} else if (
									value &&
									value !== "" &&
									calendarEvents.indexOf(value) !== -1 &&
									(!event || !event.name || event.name !== value)
								) {
									callback({
										status: false,
										message:
											"Value in this field matches the name of another event. This is not allowed."
									});
									return;
								}
								callback({
									status: true
								});
							}
						},
						description: {
							type: "textarea",
							helper: `Type a new description if you want to change it. The current description: ${
								event.description ? event.description : `--NONE--`
							}`
						},
						priority: {
							type: "integer",
							helper: `Change the occurrence priority. Please see <button class="btn btn-sm btn-outline-info" data-izimodal-open="#modal-${this.priorityInfoModal.id}">This Modal</button> for information on how priorities work regarding schedule conflicts. The current priority is <strong>${event.priority}</strong>`
						},
						hostDJ: {
							type: "select",
							optionLabels: _djs.map(dj => dj.name),
							helper: `Change the DJ who signed up for this show, or the official WWSU producer for shows run by non-WWSU people. The current hostDJ is set to <strong>${
								event.hostDJ
									? _djs.find(dj => dj.ID === event.hostDJ).name
									: `--NONE--`
							}</strong>`,
							validator: function(callback) {
								let value = this.getValue();
								let type = this.getParent().childrenByPropertyId[
									"type"
								].getValue();
								if (
									((type &&
										type !== "" &&
										["show", "remote", "prerecord"].indexOf(type) !== -1) ||
										["show", "remote", "prerecord"].indexOf(event.type) !==
											-1) &&
									(!value || value === "") &&
									!event.hostDJ
								) {
									callback({
										status: false,
										message:
											"Field is required for show, remote, and prerecord events."
									});
									return;
								}
								callback({
									status: true
								});
							}
						},
						cohostDJ1: {
							type: "select",
							optionLabels: _djs.map(dj => dj.name),
							helper: `Change the value of the first co-host DJ. The current first co-host is set to <strong>${
								event.cohostDJ1
									? _djs.find(dj => dj.ID === event.cohostDJ1).name
									: `--NONE--`
							}</strong>`
						},
						cohostDJ2: {
							type: "select",
							optionLabels: _djs.map(dj => dj.name),
							helper: `Change the value of the second co-host DJ. The current second co-host is set to <strong>${
								event.cohostDJ2
									? _djs.find(dj => dj.ID === event.cohostDJ2).name
									: `--NONE--`
							}</strong>`
						},
						cohostDJ3: {
							type: "select",
							optionLabels: _djs.map(dj => dj.name),
							helper: `Change the value of the third co-host DJ. The current third co-host is set to <strong>${
								event.cohostDJ3
									? _djs.find(dj => dj.ID === event.cohostDJ3).name
									: `--NONE--`
							}</strong>`
						},
						playlistID: {
							type: "select",
							optionLabels: playlists.map(playlist => playlist.name),
							helper: `Change or set the RadioDJ playlist (prerecord and playlist events). The current playlist is set to <strong>${
								event.playlistID
									? playlists.find(playlist => playlist.ID === event.playlistID)
											.name
									: `--NONE--`
							}</strong>`,
							validator: function(callback) {
								let value = this.getValue();
								let type = this.getParent().childrenByPropertyId[
									"type"
								].getValue();
								if (
									((type &&
										type !== "" &&
										["prerecord", "playlist"].indexOf(type) !== -1) ||
										["prerecord", "playlist"].indexOf(event.type) !== -1) &&
									(!value || value === "") &&
									!event.playlistID
								) {
									callback({
										status: false,
										message:
											"Field is required for prerecord and playlist events."
									});
									return;
								}
								callback({
									status: true
								});
							}
						},
						eventID: {
							type: "select",
							optionLabels: events.map(eventb => eventb.name),
							helper: `Change or set the rotation-triggering RadioDJ event (genre events). The current RadioDJ event is set to <strong>${
								event.eventID
									? events.find(eventb => eventb.ID === event.eventID).name
									: `--NONE--`
							}</strong>`,
							validator: function(callback) {
								let value = this.getValue();
								let type = this.getParent().childrenByPropertyId[
									"type"
								].getValue();
								if (
									((type && type !== "" && ["genre"].indexOf(type) !== -1) ||
										["genre"].indexOf(event.type) !== -1) &&
									(!value || value === "") &&
									!event.eventID
								) {
									callback({
										status: false,
										message: "Field is required for genre events."
									});
									return;
								}
								callback({
									status: true
								});
							}
						}
					},

					form: {
						buttons: {
							submit: {
								title: `Edit Occurrence`,
								click: (form, e) => {
									form.refreshValidationState(true);
									if (!form.isValid(true)) {
										form.focus();
										return;
									}
									let value = form.getValue();

									// Change duration from hours to minutes.
									value.duration *= 60;

									let _event = this.verify(value); // Verify the event just to be safe
									if (!_event.event) {
										$(document).Toasts("create", {
											class: "bg-warning",
											title: "Event verification failed",
											autohide: true,
											delay: 20000,
											body: _event
										});
										form.focus();
										return;
									}

									// Confirm if we really want to edit
									this.manager.get("WWSUutil").confirmDialog(
										`<p>Are you sure you want to edit occurrence ${
											event.type
										}: ${event.hosts} - ${event.name} on ${moment(
											event.start
										).format("LLLL")}?</p>
                                        <ul>
                                            <li>Changes will only apply to the event's original occurrence of ${moment(
																							event.start
																						).format("LLLL")}.</li>
                                            <li>A conflict check will run, and you will be notified of occurrence changes that will be made to avoid conflicts</li>
                                            ${
																							value.newTime &&
																							value.newTime !== "" &&
																							[
																								"show",
																								"sports",
																								"remote",
																								"prerecord",
																								"genre",
																								"playlist"
																							].indexOf(event.type) !== -1
																								? `<li>Subscribers will be notified of the change in date/time.</li>`
																								: ``
																						}
                                            ${
																							value.newTime &&
																							value.newTime !== "" &&
																							[
																								"show",
																								"sports",
																								"remote",
																								"prerecord",
																								"playlist"
																							].indexOf(event.type) !== -1
																								? `<li>DJs will be emailed informing them of the change in date/time.</li>`
																								: ``
																						}
                                            <li>Properties which you did not set a value via the edit form will use the default value from the event. Properties which you had set on the form will use the value you set, even if the default value for the event is edited later.</li>
                                        </ul>`,
										null,
										() => {
											this.addSchedule(
												this.occurrenceActionModal,
												value,
												success => {
													if (success) {
														this.occurrenceActionModal.iziModal("close");
														this.occurrenceModal.iziModal("close");
													}
												}
											);
										}
									);
								}
							}
						}
					}
				},

				data: {
					calendarID: event.calendarID,
					scheduleID: event.scheduleID,
					scheduleType: "updated",
					originalTime: event.start,
					newTime: newStart,
					duration: newDuration ? newDuration / 60 : undefined
				}
			});

			this.occurrenceActionModal.iziModal("open");
		});
	}

	/**
	 * Show form to add a new schedule or edit an existing one.
	 *
	 * @param {?object} schedule Original schedule data if editing a schedule, or null if making a new one
	 * @param {number} calendarID The ID of the calendar record pertaining to this schedule
	 */
	showScheduleForm(schedule, calendarID) {
		let event = this.calendar.db({ ID: calendarID }, true).first();

		this.scheduleModal.title = `${
			schedule && schedule.ID
				? `Edit schedule ${event.type}: ${event.hosts} - ${event.name}`
				: `New schedule for ${event.type}: ${event.hosts} - ${event.name}`
		}`;
		this.scheduleModal.footer = ``;
		this.scheduleModal.body = ``;

		let validTypes = [];

		// Limit the types we can change to depending on the main event type.
		switch (event.type) {
			case "show":
			case "remote":
			case "prerecord":
				validTypes = ["show", "remote", "prerecord"];
				break;
			case "genre":
			case "playlist":
				validTypes = ["genre", "playlist"];
				break;
			case "sports":
				validTypes = ["sports"];
				break;
			case "office-hours":
				validTypes = ["office-hours"];
				break;
			case "prod-booking":
			case "onair-booking":
				validTypes = ["prod-booking", "onair-booking"];
				break;
			case "task":
				validTypes = ["task"];
				break;
		}

		// Get the events and playlists we can select from
		this.getEventsPlaylists((events, playlists) => {
			let _djs = this.manager.get("WWSUdjs").find({ active: true });

			let calendarEvents = this.calendar.find().map(event => event.name);
			let sportsEvents = this.calendar
				.find()
				.filter(event => event.type === "sports")
				.map(event => event.name);

			// Make some corrections with the original schedule parameter, such as timezone correction.
			schedule =
				schedule && schedule.ID
					? Object.assign(schedule, this.recurrenceRulesToFields(schedule))
					: Object.assign(schedule || {}, { calendarID: calendarID });
			schedule.startDate = schedule.startDate
				? moment
						.tz(
							schedule.startDate,
							this.manager.get("WWSUMeta")
								? this.manager.get("WWSUMeta").meta.timezone
								: moment.tz.guess()
						)
						.toISOString(true)
				: undefined;
			schedule.endDate = schedule.endDate
				? moment
						.tz(
							schedule.endDate,
							this.manager.get("WWSUMeta")
								? this.manager.get("WWSUMeta").meta.timezone
								: moment.tz.guess()
						)
						.toISOString(true)
				: undefined;

			// Convert duration from minutes to hours
			if (schedule && schedule.duration) schedule.duration /= 60;

			// Generate form
			$(this.scheduleModal.body).alpaca({
				schema: {
					title: "Schedule",
					type: "object",
					properties: {
						ID: {
							type: "number"
						},
						calendarID: {
							type: "number"
						},
						scheduleID: {
							type: "number"
						},
						oneTime: {
							title: "One-time Schedules",
							type: "array",
							items: {
								title: "One-time start date/time",
								format: "datetime"
							}
						},
						startDate: {
							title: "Start Date",
							format: "date"
						},
						endDate: {
							title: "End Date",
							format: "date"
						},
						recurDW: {
							title: "Recur on days of the week",
							type: "array",
							items: {
								type: "number"
							},
							enum: [0, 1, 2, 3, 4, 5, 6]
						},
						recurWM: {
							title: "Recur on weeks of the month",
							type: "array",
							items: {
								type: "number"
							},
							enum: [0, 1, 2, 3, 4]
						},
						recurDM: {
							title: "Recur on days of the month",
							type: "array",
							items: {
								type: "number"
							},
							enum: [
								1,
								2,
								3,
								4,
								5,
								6,
								7,
								8,
								9,
								10,
								11,
								12,
								13,
								14,
								15,
								16,
								17,
								18,
								19,
								20,
								21,
								22,
								23,
								24,
								25,
								26,
								27,
								28,
								29,
								30,
								31
							]
						},
						recurEveryWeeks: {
							title: "Recur every x weeks",
							type: "number",
							required: true,
							default: 1,
							min: 1,
							max: 52
						},
						startTime: {
							title: "Event start time",
							format: "time"
						},
						duration: {
							title: "Event Duration",
							type: "number",
							required: true,
							min: 1 / 60,
							max: 24
						},
						type: {
							type: "string",
							title: "Change occurrence type",
							enum: validTypes
						},
						name: {
							type: "string",
							title: "Change occurrence name",
							maxLength: 255
						},
						description: {
							type: "string",
							title: "Change occurrence description"
						},
						priority: {
							type: "number",
							title: "Change occurrence priority",
							minimum: -1,
							maximum: 10
						},
						hostDJ: {
							type: "number",
							title: "Change occurrence Host DJ",
							enum: _djs.map(dj => dj.ID)
						},
						cohostDJ1: {
							type: "number",
							title: "Change occurrence Co-Host DJ (1)",
							enum: _djs.map(dj => dj.ID)
						},
						cohostDJ2: {
							type: "number",
							title: "Change occurrence Co-Host DJ (2)",
							enum: _djs.map(dj => dj.ID)
						},
						cohostDJ3: {
							type: "number",
							title: "Change occurrence Co-Host DJ (3)",
							enum: _djs.map(dj => dj.ID)
						},
						playlistID: {
							type: "number",
							title: "Change occurrence RadioDJ Playlist",
							enum: playlists.map(playlist => playlist.ID)
						},
						eventID: {
							type: "number",
							title:
								"Change occurrence RadioDJ Rotation-triggering Manual Event",
							enum: events.map(eventb => eventb.ID)
						}
					}
				},

				options: {
					fields: {
						ID: {
							type: "hidden"
						},
						calendarID: {
							type: "hidden"
						},
						scheduleID: {
							type: "hidden"
						},
						oneTime: {
							helper: `Specify specific non-recurring dates/times you would like the event to occur. Note that all oneTime occurrences use the same duration and overrides you provide below. Also, times you provide are in the station timezone (${
								this.manager.get("WWSUMeta")
									? this.manager.get("WWSUMeta").meta.timezone
									: "Unknown zone"
							}) by default.`,
							fields: {
								item: {
									dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
										.parseZone(
											this.manager.get("WWSUMeta")
												? this.manager.get("WWSUMeta").meta.time
												: undefined
										)
										.format("Z")}`,
									picker: {
										inline: true,
										sideBySide: true
									}
								}
							},
							actionbar: {
								showLabels: true,
								actions: [
									{
										label: "Add",
										action: "add"
									},
									{
										label: "Remove",
										action: "remove"
									},
									{
										label: "Move Up",
										action: "up",
										enabled: false
									},
									{
										label: "Move Down",
										action: "down",
										enabled: false
									}
								]
							}
						},
						startDate: {
							dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
								.parseZone(
									this.manager.get("WWSUMeta")
										? this.manager.get("WWSUMeta").meta.time
										: undefined
								)
								.format("Z")}`,
							helper: `If a date is specified, this schedule will not occur prior to this date.`,
							picker: {
								inline: true,
								sideBySide: true
							}
						},
						endDate: {
							dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
								.parseZone(
									this.manager.get("WWSUMeta")
										? this.manager.get("WWSUMeta").meta.time
										: undefined
								)
								.format("Z")}`,
							helper: `This schedule will not occur after this date. It is recommended to set this as the end of the show scheduling period (such as the semester).`,
							picker: {
								inline: true,
								sideBySide: true
							},
							validator: function(callback) {
								let value = this.getValue();
								let startTime = this.getParent().childrenByPropertyId[
									"startTime"
								].getValue();

								if ((!value || value === "") && startTime && startTime !== "") {
									callback({
										status: false,
										message: "endDate is required for recurring schedules."
									});
									return;
								}
								callback({
									status: true
								});
							}
						},
						recurDW: {
							helper:
								"If you want this event to recur on specific days of the week, choose them here. This recurring filter will be combined with others you specify.",
							type: "select",
							multiple: true,
							optionLabels: [
								"Sunday",
								"Monday",
								"Tuesday",
								"Wednesday",
								"Thursday",
								"Friday",
								"Saturday"
							]
						},
						recurWM: {
							helper:
								"If you want this event to recur on specific weeks of the month, choose them here. This recurring filter will be combined with others you specify.",
							type: "select",
							multiple: true,
							optionLabels: [
								"First",
								"Second",
								"Third",
								"Fourth",
								"Fifth (only if applicable)"
							]
						},
						recurDM: {
							helper:
								"If you want this event to recur on specific days of the month, choose them here.",
							type: "select",
							multiple: true
						},
						recurEveryWeeks: {
							helper:
								"This event will only occur every specified number of weeks starting from the Start Date. For example, if you specify 2, the event will occur bi-weekly."
						},
						startTime: {
							helper: `If using recurrence, specify start time in the station's timezone of ${
								this.manager.get("WWSUMeta")
									? this.manager.get("WWSUMeta").meta.timezone
									: "Unknown"
							}. For different start times, create multiple schedules.`,
							dateFormat: "HH:mm",
							picker: {
								inline: true,
								sideBySide: true
							},
							validator: function(callback) {
								let value = this.getValue();
								let dm = this.getParent().childrenByPropertyId[
									"recurDM"
								].getValue();
								let wm = this.getParent().childrenByPropertyId[
									"recurWM"
								].getValue();
								let dw = this.getParent().childrenByPropertyId[
									"recurDW"
								].getValue();

								if (
									(dm.length > 0 || wm.length > 0 || dw.length > 0) &&
									!moment(value, "HH:mm", true).isValid()
								) {
									callback({
										status: false,
										message:
											"You must specify a start time in the 24-hour format HH:mm when using recurrence rules."
									});
									return;
								}
								callback({
									status: true
								});
							}
						},
						duration: {
							helper:
								"Specify the amount of time this event lasts (in hours). Decimals permitted (eg. 1.5 = 1 hour and 30 minutes). Duration is used for all oneTime and recurrence rules specified. If you need a different duration for different times, create multiple schedules."
						},
						type: {
							type: "select",
							helper: `Specify the event type for this schedule if different from the event default of <strong>${event.type}</strong>`
						},
						name: {
							helper: `Specify an event name that should be used for this schedule if different from the event default of <strong>${event.name}</strong>. This field is ignored for bookings and office-hours.`,
							validator: function(callback) {
								let value = this.getValue();
								if (value.includes(" -")) {
									callback({
										status: false,
										message: `Invalid; event names may not contain " - " as this is a separation used by the system.`
									});
									return;
								}
								if (event.type === "sports") value = value.split(" vs.")[0];
								let type = this.getParent().childrenByPropertyId[
									"type"
								].getValue();
								if (
									value &&
									value !== "" &&
									(((!type || type === "") && event.type === "sports") ||
										type === "sports") &&
									sportsEvents.indexOf(value) === -1
								) {
									callback({
										status: false,
										message: `For sports, name must begin with a valid sport and optionally proceed with " vs. name of opponent team". Valid sports: ${sportsEvents.join(
											", "
										)}`
									});
									return;
								} else if (
									value &&
									value !== "" &&
									calendarEvents.indexOf(value) !== -1 &&
									(!event || !event.name || event.name !== value)
								) {
									callback({
										status: false,
										message:
											"Value in this field matches the name of another event. This is not allowed."
									});
									return;
								}
								callback({
									status: true
								});
							}
						},
						description: {
							type: "textarea",
							helper: `Specify a description that should be used for this schedule if different from the event default: ${
								event.description ? event.description : `--NONE--`
							}`
						},
						priority: {
							type: "integer",
							helper: `Specify a priority for this schedule if different from the event default of <strong>${event.priority}</strong>. Please see <button class="btn btn-sm btn-outline-info" data-izimodal-open="#modal-${this.priorityInfoModal.id}">This Modal</button> for information on how priorities work regarding schedule conflicts.`
						},
						hostDJ: {
							type: "select",
							optionLabels: _djs.map(dj => dj.name),
							helper: `Specify the host DJ running this show for this schedule if different from the event default of <strong>${
								event.hostDJ
									? _djs.find(dj => dj.ID === event.hostDJ).name
									: `--NONE--`
							}</strong>`,
							validator: function(callback) {
								let value = this.getValue();
								let type = this.getParent().childrenByPropertyId[
									"type"
								].getValue();
								if (
									((type &&
										type !== "" &&
										["show", "remote", "prerecord"].indexOf(type) !== -1) ||
										["show", "remote", "prerecord"].indexOf(event.type) !==
											-1) &&
									(!value || value === "") &&
									!event.hostDJ
								) {
									callback({
										status: false,
										message:
											"Field is required for show, remote, and prerecord events."
									});
									return;
								}
								callback({
									status: true
								});
							}
						},
						cohostDJ1: {
							type: "select",
							optionLabels: _djs.map(dj => dj.name),
							helper: `Specify a co-host DJ for this schedule if different from the event default of <strong>${
								event.cohostDJ1
									? _djs.find(dj => dj.ID === event.cohostDJ1).name
									: `--NONE--`
							}</strong>`
						},
						cohostDJ2: {
							type: "select",
							optionLabels: _djs.map(dj => dj.name),
							helper: `Specify a second co-host DJ if different from the event default of <strong>${
								event.cohostDJ2
									? _djs.find(dj => dj.ID === event.cohostDJ2).name
									: `--NONE--`
							}</strong>`
						},
						cohostDJ3: {
							type: "select",
							optionLabels: _djs.map(dj => dj.name),
							helper: `Specify a third co-host DJ if different from the event default of <strong>${
								event.cohostDJ3
									? _djs.find(dj => dj.ID === event.cohostDJ3).name
									: `--NONE--`
							}</strong>`
						},
						playlistID: {
							type: "select",
							optionLabels: playlists.map(playlist => playlist.name),
							helper: `Set the RadioDJ playlist (prerecord and playlist events) for this schedule if different from the event default of <strong>${
								event.playlistID
									? playlists.find(playlist => playlist.ID === event.playlistID)
											.name
									: `--NONE--`
							}</strong>`,
							validator: function(callback) {
								let value = this.getValue();
								let type = this.getParent().childrenByPropertyId[
									"type"
								].getValue();
								if (
									((type &&
										type !== "" &&
										["prerecord", "playlist"].indexOf(type) !== -1) ||
										["prerecord", "playlist"].indexOf(event.type) !== -1) &&
									(!value || value === "") &&
									!event.playlistID
								) {
									callback({
										status: false,
										message:
											"Field is required for prerecord and playlist events."
									});
									return;
								}
								callback({
									status: true
								});
							}
						},
						eventID: {
							type: "select",
							optionLabels: events.map(eventb => eventb.name),
							helper: `Set the rotation-triggering RadioDJ event (genre events) if different from the event default of <strong>${
								event.eventID
									? events.find(eventb => eventb.ID === event.eventID).name
									: `--NONE--`
							}</strong>`,
							validator: function(callback) {
								let value = this.getValue();
								let type = this.getParent().childrenByPropertyId[
									"type"
								].getValue();
								if (
									((type && type !== "" && ["genre"].indexOf(type) !== -1) ||
										["genre"].indexOf(event.type) !== -1) &&
									(!value || value === "") &&
									!event.eventID
								) {
									callback({
										status: false,
										message: "Field is required for genre events."
									});
									return;
								}
								callback({
									status: true
								});
							}
						}
					},

					form: {
						buttons: {
							submit: {
								title: `${schedule && schedule.ID ? `Edit` : `Add`} Schedule`,
								click: (form, e) => {
									form.refreshValidationState(true);
									if (!form.isValid(true)) {
										form.focus();
										return;
									}
									let value = form.getValue();

									// Map recurring rules to an array
									value.recurDM = value.recurDM.map(val => val.value);
									value.recurWM = value.recurWM.map(val => val.value);
									value.recurDW = value.recurDW.map(val => val.value);

									// Determine latest one-time and set endDate to that +2 days if not provided
									if (
										value.oneTime &&
										value.oneTime.length > 0 &&
										(!value.endDate || value.endDate === "")
									) {
										let oneTimes = value.oneTime
											.map(ot => moment(ot).valueOf())
											.sort((a, b) => b - a);

										value.endDate = moment
											.tz(
												oneTimes[0],
												this.manager.get("WWSUMeta")
													? this.manager.get("WWSUMeta").meta.timezone
													: moment.tz.guess()
											)
											.add(2, "days")
											.toISOString(true);
									}

									// Prepare fields for database
									value = Object.assign(
										value,
										this.fieldsToRecurrenceRules(value)
									);
									delete value.recurDM;
									delete value.recurDW;
									delete value.recurWM;
									delete value.recurEveryWeeks;

									// Convert duration from hours to minutes
									value.duration *= 60;

									let _event = this.verify(value); // Verify the event just to be safe
									if (!_event.event) {
										$(document).Toasts("create", {
											class: "bg-warning",
											title: "Event verification failed",
											autohide: true,
											delay: 20000,
											body: _event
										});
										form.focus();
										return;
									}

									// Add or edit the schedule
									if (!schedule || !schedule.ID) {
										this.addSchedule(this.scheduleModal, value, success => {
											if (success) {
												this.scheduleModal.iziModal("close");
												this.occurrenceModal.iziModal("close");
												this.schedulesModal.body = `<div class="alert alert-warning">
                                            Schedule changes take several seconds to reflect in the system. Please close and re-open this window.
                                            </div>`;
											}
										});
									} else {
										this.editSchedule(this.scheduleModal, value, success => {
											if (success) {
												this.scheduleModal.iziModal("close");
												this.occurrenceModal.iziModal("close");
												this.schedulesModal.body = `<div class="alert alert-warning">
                                            Schedule changes take several seconds to reflect in the system. Please close and re-open this window.
                                            </div>`;
											}
										});
									}
								}
							}
						}
					}
				},

				data: schedule
			});

			this.scheduleModal.iziModal("open");
		});
	}

	/**
	 * Do conflict checking on an event and show a modal if conflicts are detected.
	 *
	 * @param {WWSUmodal} modal Modal to block while checking for conflicts
	 * @param {object} event The CalendarDb event being added, edited, or deleted
	 * @param {string} action What we are doing with event: insert, update, or remove
	 * @param {function} cb Callback fired when there are no conflicts detected or the user agreed to proceed with the conflict resolution steps.
	 */
	doConflictCheck(modal, event, action, cb) {
		console.dir(event);
		$(`#modal-${modal.id}`).block({
			message: `<h1>Checking conflicts...</h1><p class="conflict-check-progress"></p>`,
			css: { border: "3px solid #a00" },
			timeout: 180000,
			onBlock: () => {
				if (["remove", "removeCalendar"].indexOf(action) === -1) {
					event = this.verify(event);
				} else {
					event = {
						event: _.cloneDeep(event)
					};
				}
				if (!event.event) {
					$(`#modal-${modal.id}`).unblock();
					$(document).Toasts("create", {
						class: "bg-danger",
						title: "Error resolving schedule conflicts",
						body: `Event is invalid: ${event}`,
						autohide: true,
						delay: 10000,
						icon: "fas fa-skull-crossbones fa-lg"
					});
					console.dir(event);
					return;
				}
				let query = {};
				query[action] =
					action === "remove" || action === "removeCalendar"
						? event.event.ID
						: event.event;

				this.checkConflicts(
					conflicts => {
						console.dir(conflicts);
						$(`#modal-${modal.id}`).unblock();

						// If no conflicts detected, then fire callback immediately

						if (
							conflicts.additions.length === 0 &&
							conflicts.removals.length === 0 &&
							conflicts.errors.length === 0
						) {
							cb();
							return;
						}

						let actions = [];

						conflicts.errors.map(error => {
							actions.push(`<li><strong>ERROR: </strong>${error}</li>`);
						});

						conflicts.additions.map(conflict => {
							if (conflict.scheduleType === "canceled-system") {
								actions.push(
									`<li>${conflict.type}: ${conflict.hosts} - ${
										conflict.name
									} <ul>
                  <li>Original date/time: ${moment(
										conflict.originalTime
									).format("LLLL")} - ${moment(conflict.originalTime)
										.add(conflict.originalDuration, "minutes")
										.format("LLLL")}</li>
                  <li>Action: will be <strong>CANCELED</strong></li></ul></li>`
								);
							}
							if (
								conflict.scheduleType === "updated-system" &&
								!conflict.newTime
							) {
								actions.push(
									`<li>${conflict.type}: ${conflict.hosts} - ${
										conflict.name
									} <ul>
                  <li>Original date/time: ${moment(
										conflict.originalTime
									).format("LLLL")} - ${moment(conflict.originalTime)
										.add(conflict.originalDuration, "minutes")
										.format("LLLL")}</li>
                  <li>Action: Will <strong>END EARLIER</strong></li>
                  <li>New end time: ${moment(conflict.originalTime)
										.add(conflict.duration, "minutes")
										.format("LLLL")}</li></ul></li>`
								);
							}
							if (
								conflict.scheduleType === "updated-system" &&
								conflict.newTime
							) {
								actions.push(
									`<li>${conflict.type}: ${conflict.hosts} - ${
										conflict.name
									} <ul>
                  <li>Original date/time: ${moment(
										conflict.originalTime
									).format("LLLL")} - ${moment(conflict.originalTime)
										.add(conflict.originalDuration, "minutes")
										.format("LLLL")}</li>
                  <li>Action: Will <strong>START LATER</strong></li>
                  <li>New start date/time: ${moment(conflict.newTime).format(
										"LLLL"
									)}</li></ul></li>`
								);
							}
						});

						conflicts.removals.map(conflict => {
							if (conflict.scheduleType === "canceled-system") {
								actions.push(
									`<li>${conflict.type}: ${conflict.hosts} - ${
										conflict.name
									} <ul>
                  <li>Original date/time: ${moment(
										conflict.originalTime
									).format("LLLL")} - ${moment(conflict.originalTime)
										.add(conflict.originalDuration, "minutes")
										.format("LLLL")}</li>
                  <li>Previously: Canceled</li>
                  <li>Action: will be <strong>UN-CANCELED</strong> (put back on the schedule).</li></ul></li>`
								);
							}
							if (
								conflict.scheduleType === "updated-system" &&
								!conflict.newTime
							) {
								actions.push(
									`<li>${conflict.type}: ${conflict.hosts} - ${
										conflict.name
									} <ul>
                  <li>Original date/time: ${moment(
										conflict.originalTime
									).format("LLLL")} - ${moment(conflict.originalTime)
										.add(conflict.originalDuration, "minutes")
										.format("LLLL")}</li>
                  <li>Previously: Re-scheduled to end at ${moment(
										conflict.originalTime
									)
										.add(conflict.duration, "minutes")
										.format("LLLL")}</li>
                  <li>Action: will <strong>END AT ORIGINALLY SCHEDULED TIME</strong></li></ul></li>`
								);
							}
							if (
								conflict.scheduleType === "updated-system" &&
								conflict.newTime
							) {
								actions.push(
									`<li>${conflict.type}: ${conflict.hosts} - ${
										conflict.name
									} <ul>
                  <li>Original date/time: ${moment(
										conflict.originalTime
									).format("LLLL")} - ${moment(conflict.originalTime)
										.add(conflict.originalDuration, "minutes")
										.format("LLLL")}</li>
                  <li>Previously: Re-scheduled to start at ${moment(
										conflict.newTime
									).format("LLLL")}</li>
                  <li>Action: will <strong>START AT ORIGINALLY SCHEDULED TIME</strong></li></ul></li>`
								);
							}
						});

						this.conflictModal.body = `<p>The following changes will be made to resolve event conflicts if you continue:</p>
                    <div id="modal-${this.conflictModal.id}-conflicts"></div>`;
						$(`#modal-${this.conflictModal.id}-conflicts`).html(
							`<ul>${actions.join("")}</ul>`
						);

						if (conflicts.errors.length === 0) {
							this.conflictModal.footer = `<div class="alert alert-primary">
                    <p>DJs will be emailed and subscribers notified of cancellations / changes or their reversals.</p>
                  </div>
                    <button type="button" data-izimodal-close="" class="btn btn-success" id="modal-${this.conflictModal.id}-continue">Continue</button>
        <button type="button" data-izimodal-close="" class="btn btn-danger">Cancel</button>`;
						} else {
							this.conflictModal.footer = `<div class="alert alert-danger">
							<p>You cannot proceed due to the errors stated above.</p>
						  </div>
							<button type="button" data-izimodal-close="" class="btn btn-danger">Cancel</button>`;
						}

						this.conflictModal.iziModal("open");

						$(`#modal-${this.conflictModal.id}-continue`).unbind("click");
						$(`#modal-${this.conflictModal.id}-continue`).click(e => {
							cb();
						});
					},
					[query],
					string => {
						$(".conflict-check-progress").html(string);
					}
				);
			}
		});
	}

	/**
	 * this.manager.get("WWSUutil")ity function to convert schedule fields into moment.recur recurrence rules.
	 *
	 * @param {object} record The form record to check
	 * @returns {object} properties recurrenceRules and recurrenceInterval to use in the database.
	 */
	fieldsToRecurrenceRules(record) {
		let criteria = { recurrenceRules: null, recurrenceInterval: null };

		if (record.startTime) {
			criteria.recurrenceRules = [];

			if (record.recurDM && record.recurDM.length > 0) {
				criteria.recurrenceRules.push({
					measure: "daysOfMonth",
					units: record.recurDM
				});
			}

			if (record.recurWM && record.recurWM.length > 0) {
				criteria.recurrenceRules.push({
					measure:
						record.recurDW && record.recurDW.length > 0
							? "weeksOfMonthByDay"
							: "weeksOfMonth",
					units: record.recurWM
				});
			}

			if (record.recurDW && record.recurDW.length > 0) {
				criteria.recurrenceRules.push({
					measure: "daysOfWeek",
					units: record.recurDW
				});
			}

			if (record.recurEveryWeeks && record.recurEveryWeeks > 1) {
				criteria.recurrenceInterval = {
					measure: "weeks",
					unit: record.recurEveryWeeks
				};
			}
		}

		return criteria;
	}

	/**
	 * this.manager.get("WWSUutil")ity function to convert recurrenceRules and recurrenceInterval into form fields.
	 *
	 * @param {object} record The event record.
	 * @returns {object} recurDM, recurWM, recurDW, and recurEveryWeeks.
	 */
	recurrenceRulesToFields(record) {
		let criteria = {
			recurDM: null,
			recurWM: null,
			recurDW: null,
			recurEveryWeeks: 1
		};

		if (record.recurrenceRules && record.recurrenceRules.length > 0) {
			record.recurrenceRules.map(rule => {
				if (!rule.measure || !rule.units || rule.units.length === 0) return;
				switch (rule.measure) {
					case "daysOfMonth":
						criteria.recurDM = rule.units;
						break;
					case "weeksOfMonth":
					case "weeksOfMonthByDay":
						criteria.recurWM = rule.units;
						break;
					case "daysOfWeek":
						criteria.recurDW = rule.units;
						break;
				}
			});
		}

		if (
			record.recurrenceInterval &&
			record.recurrenceInterval.measure &&
			record.recurrenceInterval.measure === "weeks" &&
			record.recurrenceInterval.unit
		) {
			criteria.recurEveryWeeks = record.recurrenceInterval.unit;
		}

		return criteria;
	}

	newOccurrence(start, end) {
		let duration = moment(end).diff(start, "minutes");

		// Duration check; do not allow events more than 1 day long
		if (duration > 60 * 24) {
			$(document).Toasts("create", {
				class: "bg-warning",
				title: "Multi-day Events Not Allowed",
				body:
					"Occurrences may not last more than 24 hours. Consider setting up a recurring schedule.",
				autohide: true,
				delay: 15000
			});
			return;
		}

		this.newOccurrenceModal.title = `New Occurrence`;
		this.newOccurrenceModal.footer = `${moment(start).format("lll")} - ${moment(
			end
		).format("lll")}`;
		this.newOccurrenceModal.body = ``;

		$(this.newOccurrenceModal.body).alpaca({
			schema: {
				type: "object",
				properties: {
					event: {
						title: "Choose Event",
						type: "number",
						required: true,
						enum: this.calendar
							.db()
							.get()
							.map(cal => cal.ID)
					},
					recur: {
						type: "boolean",
						title: "Recurs / Repeats?"
					}
				}
			},
			options: {
				fields: {
					event: {
						type: "select",
						optionLabels: this.calendar
							.db()
							.get()
							.map(cal => `${cal.type}: ${cal.hosts} - ${cal.name}`),
						helper:
							"If the event you want is not listed, you may need to add it first under the Manage Events button on the calendar."
					},
					recur: {
						rightLabel: "Yes",
						helpers: [
							`If unchecked, the time of ${moment(start).format(
								"lll"
							)} - ${moment(end).format(
								"lll"
							)} will be filled in as a one-time occurrence on the next screen.`,
							`If checked, the time of ${moment(start).format(
								"dddd h:mm A"
							)} - ${moment(end).format(
								"dddd h:mm A"
							)} will be filled in as a weekly recurring schedule on the next screen (but you can change recurrence settings).`
						]
					}
				},

				form: {
					buttons: {
						submit: {
							title: `Continue`,
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();

								if (value.recur) {
									this.showScheduleForm(
										{
											recurDW: parseInt(moment(start).format("e")),
											startDate: moment(start).subtract(1, "days"),
											startTime: moment(start).format("HH:mm"),
											duration: duration
										},
										value.event
									);
								} else {
									this.showScheduleForm(
										{
											oneTime: [moment(start).toISOString(true)],
											startDate: moment(start).subtract(1, "days"),
											duration: duration
										},
										value.event
									);
								}
							}
						}
					}
				}
			}
		});

		this.newOccurrenceModal.iziModal("open");
	}
}
