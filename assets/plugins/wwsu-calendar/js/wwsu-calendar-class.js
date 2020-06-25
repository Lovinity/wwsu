/* global CalendarDb */

// This class manages the calendar from WWSU's sockets.
class WWSUcalendar extends CalendarDb {

    /**
     * Create the calendar class.
     * 
     * @param {sails.io} socket 
     * @param {WWSUreq} noReq WWSU request with no authorization
     * @param {WWSUreq} directorReq WWSU request with director authorization
     */
    constructor(socket, noReq, directorReq) {
        super(); // Create the db

        this.endpoints = {
            add: '/calendar/add',
            addSchedule: '/calendar/add-schedule',
            edit: '/calendar/edit',
            editSchedule: '/calendar/edit-schedule',
            get: '/calendar/get',
            getClockwheels: '/clockwheels/get',
            getEventsPlaylists: '/calendar/get-events-playlists',
            getSchedule: '/calendar/get-schedule',
            remove: '/calendar/remove',
            removeSchedule: '/calendar/remove-schedule'
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
            removeSchedule: {}
        };
        this.requests = {
            no: noReq,
            director: directorReq
        };

        this.events = new EventEmitter();

        // Assign socket events
        this.calendar.assignSocketEvent('calendar', socket);
        this.schedule.assignSocketEvent('schedule', socket);
        this.clockwheels.assignSocketEvent('clockwheels', socket);

        // Emit calendarUpdated whenever a change is made to the calendar.
        this.calendar.on('insert', () => { this.calendarUpdated() });
        this.calendar.on('update', () => { this.calendarUpdated() });
        this.calendar.on('remove', () => { this.calendarUpdated() });
        this.calendar.on('replace', () => { this.calendarUpdated() });
        this.schedule.on('insert', () => { this.calendarUpdated() });
        this.schedule.on('update', () => { this.calendarUpdated() });
        this.schedule.on('remove', () => { this.calendarUpdated() });
        this.schedule.on('replace', () => { this.calendarUpdated() });
        this.clockwheels.on('insert', () => { this.calendarUpdated() });
        this.clockwheels.on('update', () => { this.calendarUpdated() });
        this.clockwheels.on('remove', () => { this.calendarUpdated() });
        this.clockwheels.on('replace', () => { this.calendarUpdated() });

        // Generate a modal for displaying event conflicts
        this.conflictModal = new WWSUmodal(`Event Conflicts`, `bg-info`, ``, false, {
            headerColor: '',
            overlayClose: false,
            zindex: 2000,
        });

        // Generate a modal for displaying help on how priorities work
        this.priorityInfoModal = new WWSUmodal(`Explanation of how Priorities Work`, null, `<p>Priorities determine how the system will resolve incidents where event schedules overlap each other.</p>
        <ul>
            <li><strong>-1</strong>: Schedule is always allowed to overlap any other schedule. Use this for events that do not deal with OnAir programming, such as meetings and office hours.</li>
            <li><strong>0</strong>: Schedule is not allowed to overlap any other priority 0 schedule, but can overlap schedules of any other priority. Use this for genre rotations where you do not want genres to overlap, but they are allowed to co-exist with scheduled broadcasts (eg. if the broadcast is not on the air, the system will run the genre rotation instead until they go on the air).</li>
            <li><strong>1 - 10</strong>: Schedule is not allowed to overlap other schedules with the same or higher priority. If it overlaps a schedule of the same or higher priority, this schedule for that date/time will either be auto-canceled or its time/duration updated to avoid the conflict. If it overlaps a schedule of lower priority, the lower-priority schedule will be auto-canceled or its time/duration updated to avoid the conflict.</li>
        </ul>
        <p>Example: A priority 5 show is scheduled Thursdays 7-9PM. Someone schedules a priority 9 sports broadcast for one of those Thursdays 7-9PM. Because sports takes priority, the show for that day will be auto-canceled.</p>
        <p>Example: A priority 5 show is scheduled Thursdays 8-10PM. Someone schedules a priority 9 sports broadcast for one of those Thursdays 7-9PM. Because sports takes priority, but there is at least 30 minutes of the show that would not be in conflict, the show's time for that day will be updated to 9-10PM instead of completely canceled.</p>
        <p>Example: A priority 9 sports broadcast is scheduled on a Thursday 7-9PM. Someone schedules a new show Thursdays 7-9PM. Because sports takes priority, the show for that Thursday will be marked as canceled automatically.</p>
        <p>Example: A priority 9 sports broadcast is scheduled on a Thursday 7-9PM. Someone schedules a new show Thursdays 5-8PM. Because sports takes priority, but the show for that Thursday has at least 30 minutes outside of the conflict, the show for that Thursday will instead be scheduled for 5-7PM.</p>
        <p>Example: A priority 5 show is scheduled for Fridays 7-9PM. A new priority 5 show is scheduled for Fridays 8-11PM. Both shows have the same priority, so the system prioritizes the show already scheduled. Therefore, the new show will only be allowed to be scheduled Fridays 9-11PM.</p>
        <p>Example: A priorty 5 show, scheduled Thursdays 7-9PM, was canceled on one Thursday by a priority 9 sports broadcast. But the sports broadcast was later canceled. The system will automatically un-cancel the show for that Thursday since the conflicting sports broadcast was canceled.</p>
        <p>Example: A priority 5 show, scheduled Thursdays 8-11PM, was rescheduled to 9-11PM on one Thursday by a priority 9 sports broadcast. But the sports broadcast was later canceled. The system will automatically reverse the show's re-scheduled time since the sports broadcast was canceled, therefore the show can air at its original time of 8-11PM.</p>`, true, {
            headerColor: '',
            zindex: 2000,
        });

        // Generate other modals
        this.occurrenceModal = new WWSUmodal(``, null, ``, true, {
            headerColor: '',
            zindex: 1100,
            openFullscreen: true,
        });
        this.occurrenceActionModal = new WWSUmodal(``, null, ``, true, {
            headerColor: '',
            zindex: 1110,
            openFullscreen: true,
        });
        this.eventsModal = new WWSUmodal(`Events`, null, ``, true, {
            headerColor: '',
            zindex: 1100,
            openFullscreen: true,
        });
        this.schedulesModal = new WWSUmodal(`Schedules`, null, ``, true, {
            headerColor: '',
            zindex: 1110,
            openFullscreen: true,
        });
        this.scheduleModal = new WWSUmodal(`Schedules`, null, ``, true, {
            headerColor: '',
            zindex: 1120,
            openFullscreen: true,
        });
        this.eventModal = new WWSUmodal(`New Event`, null, ``, true, {
            headerColor: '',
            zindex: 1120,
            openFullscreen: true,
        });
    }

    // Initialize the calendar. Call this on socket connect event.
    init () {
        this.calendar.replaceData(this.requests.no, this.endpoints.get, this.data.get);
        this.schedule.replaceData(this.requests.no, this.endpoints.getSchedule, this.data.getSchedule);
        this.clockwheels.replaceData(this.requests.no, this.endpoints.getClockwheels, this.data.getClockwheels);
    }

    // Emit calendarUpdated event when called.
    calendarUpdated () {
        this.events.emitEvent('calendarUpdated', [])
    }

    /**
     * Add an event listener.
     * 
     * @param {string} event Event to listen for: calendarUpdated
     * @param {function} fn Function to call when the event is triggered
     */
    on (event, fn) {
        this.events.on(event, fn);
    }

    /**
     * Generate a simple DataTables.js table of the events in the system and have edit/delete links
     * 
     * @param {WWSUdb} djs WWSUdb DJs for selection in event and schedule forms
     * @param {WWSUdb} directors WWSUdb directors that can authorize for event operations
     */
    showSimpleEvents (djs, directors) {
        this.eventsModal.body = `<table id="modal-${this.eventsModal.id}-table" class="table table-striped" style="min-width: 100%;"></table>`;
        this.eventsModal.iziModal('open');
        $(`#modal-${this.eventsModal.id}`).block({
            message: '<h1>Loading...</h1>',
            css: { border: '3px solid #a00' },
            onBlock: () => {
                var table = $(`#modal-${this.eventsModal.id}-table`).DataTable({
                    scrollCollapse: true,
                    paging: false,
                    data: [],
                    columns: [
                        { title: "Type" },
                        { title: "Event Name" },
                        { title: "Actions" },
                    ],
                    "order": [ [ 0, "asc" ], [ 1, "asc" ] ],
                    pageLength: 10
                });
                var drawRows = () => {
                    this.calendar.db().each((calendar) => {
                        table.rows.add([ [
                            `<span class="badge bg-${this.getColorClass(calendar)}">${calendar.type}</span>`,
                            calendar.name,
                            `<div class="btn-group"><div class="btn-group"><button class="btn btn-sm btn-primary btn-event-editschedule" data-calendarID="${calendar.ID}" title="Edit Schedule"><i class="fas fa-calendar"></i></button>${[ 'office-hours', 'sports', 'prod-booking', 'onair-booking' ].indexOf(calendar.type) === -1 ? `<button class="btn btn-sm btn-warning btn-event-edit" data-calendarid="${calendar.ID}" title="Edit Event"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-event-delete" data-calendarID="${calendar.ID}" title="Delete Event and all Schedules"><i class="fas fa-trash"></i></button>` : ``}</div>`
                        ] ])
                    });
                    table.draw();

                    // Action button click events
                    $('.btn-event-edit').unbind('click');
                    $('.btn-event-editschedule').unbind('click');
                    $('.btn-event-delete').unbind('click');

                    $('.btn-event-edit').click((e) => {
                        var event = this.calendar.db().get().find((event) => event.ID === parseInt($(e.currentTarget).data('calendarid')));
                        this.showEventForm(event, djs, directors);
                    });

                    $('.btn-event-editschedule').click((e) => {
                        this.showSchedules(parseInt($(e.currentTarget).data('calendarid')), djs, directors);
                    });

                    $('.btn-event-delete').click((e) => {
                        var util = new WWSUutil();
                        var event = this.calendar.db().get().find((event) => event.ID === parseInt($(e.currentTarget).data('calendarid')));
                        util.confirmDialog(`<p>Are you sure you want to <b>permanently</b> remove ${event.type}: ${event.name}?</p><ul><li>Removes the event</li><li>Removes all schedules of the event from the calendar</li><li>Notifies all notification subscribers the event has been discontinued</li><li>Removes all notification subscriptions</li><li>Does not remove broadcast logs nor timesheet records</li><li>Broadcasts: does not remove analytics, but disassociates them from the event</li></ul>`, event.name, () => {
                            this.removeCalendar(this.eventsModal, directors, { ID: parseInt($(e.currentTarget).data('calendarid')) }, (success) => {
                                this.eventsModal.body = `<div class="alert alert-warning">
                                Schedule changes take several seconds to reflect in the system. Please close and re-open this window.
                                </div>`;
                            });
                        });
                    });
                    $(`#modal-${this.eventsModal.id}`).unblock();
                };

                drawRows();
            }
        });

        this.eventsModal.footer = `<button type="button" class="btn btn-outline-success" id="modal-${this.eventsModal.id}-new" data-dismiss="modal">New Event</button>`;
        $(`#modal-${this.eventsModal.id}-new`).unbind('click');
        $(`#modal-${this.eventsModal.id}-new`).click(() => {
            this.showEventForm(null, djs, directors);
        });
    }

    showSchedules (calendarID, djs, directors) {
        this.schedulesModal.body = `<table id="modal-${this.schedulesModal.id}-table" class="table table-striped" style="min-width: 100%;"></table>`;
        this.schedulesModal.iziModal('open');
        $(`#modal-${this.schedulesModal.id}`).block({
            message: '<h1>Loading...</h1>',
            css: { border: '3px solid #a00' },
            onBlock: () => {
                var table = $(`#modal-${this.schedulesModal.id}-table`).DataTable({
                    scrollCollapse: true,
                    paging: false,
                    data: [],
                    columns: [
                        { title: "Schedule" },
                        { title: "Actions" },
                    ],
                    pageLength: 10
                });
                var drawRows = () => {
                    this.schedule.db({ calendarID: calendarID }).each((schedule) => {
                        // Skip all schedule entries that are unauthorized or specify an update/cancellation; these should be managed via the calendar.
                        if (schedule.scheduleType !== null) {
                            return;
                        }

                        table.rows.add([ [
                            this.generateScheduleText(schedule),
                            `${[ 'canceled-system', 'updated-system' ].indexOf(schedule.scheduleType) === -1 ? `<div class="btn-group"><button class="btn btn-sm btn-warning btn-schedule-edit" data-scheduleid="${schedule.ID}" data-calendarid="${schedule.calendarID}" title="Edit Schedule"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-schedule-delete" data-scheduleid="${schedule.ID}" data-calendarid="${schedule.calendarID}" title="Delete Schedule"><i class="fas fa-trash"></i></button></div>` : ``}`
                        ] ])
                    });
                    table.draw();
                    $(`#modal-${this.schedulesModal.id}`).unblock();

                    // Action button click events
                    $('.btn-schedule-edit').unbind('click');
                    $('.btn-schedule-delete').unbind('click');

                    $('.btn-schedule-edit').click((e) => {
                        var schedule = this.schedule.db({ ID: parseInt($(e.currentTarget).data('scheduleid')) }).first();
                        var calendarID = parseInt($(e.currentTarget).data('calendarid'));
                        this.showScheduleForm(schedule, calendarID, djs, directors);
                    });
                    $('.btn-schedule-delete').click((e) => {
                        var util = new WWSUutil();
                        util.confirmDialog(`<p>Are you sure you want to delete that schedule?</p>
                        <ul>
                            <li>Please <strong>do not</strong> delete schedules to cancel a specific date/time; click the occurrence on the calendar and elect to cancel it.</li>
                            <li>Will not notify subscribers.</li>
                            <li>A conflict check will run, and you will be notified of occurrence changes that will be made to avoid conflicts</li>
                        </ul>`, null, () => {
                            var scheduleID = parseInt($(e.currentTarget).data('scheduleid'));
                            this.removeSchedule(this.schedulesModal, directors, { ID: scheduleID }, (success) => {
                                if (success) {
                                    this.schedulesModal.body = `<div class="alert alert-warning">
                                    Schedule changes take several seconds to reflect in the system. Please close and re-open this window.
                                    </div>`;
                                }
                            });
                        });
                    });
                };

                drawRows();
            }
        });

        this.schedulesModal.footer = `<button type="button" class="btn btn-outline-success" id="modal-${this.schedulesModal.id}-new" data-dismiss="modal">New Schedule</button>`;
        $(`#modal-${this.schedulesModal.id}-new`).unbind('click');
        $(`#modal-${this.schedulesModal.id}-new`).click(() => {
            this.showScheduleForm(null, calendarID, djs, directors);
        });
    }

    /**
     * Get events and playlists from WWSU's API that can be selected in calendar and event forms.
     * 
     * @param {function} cb Callback containing array of events first parameter, array of playlists second parameter (only holds ID and name properties)
     */
    getEventsPlaylists (cb) {
        try {
            this.requests.no.request({ method: 'post', url: this.endpoints.getEventsPlaylists, data: {} }, (response) => {
                if (!response.playlists || !response.events) {
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Error loading events and playlists',
                        body: 'There was an error loading events and playlists. Please report this to the engineer.',
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                    cb([], []);
                } else {
                    cb(response.events, response.playlists);
                }
            })
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error loading events and playlists',
                body: 'There was an error loading events and playlists. Please report this to the engineer.',
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            cb([], []);
            console.error(e);
        }
    }

    /**
     * Tell WWSU API to add a schedule.
     * 
     * @param {WWSUmodal} modal Modal to get blocked by JQuery UI when prompting for authorization.
     * @param {WWSUdb} directors Directors WWSUdb.
     * @param {object} data Data to pass to the endpoint.
     * @param {function} cb Function called after the request. True = success, false = failure.
     */
    addSchedule (modal, directors, data, cb) {
        this.doConflictCheck(modal, data, 'insert', () => {
            try {
                this.requests.director.request({ dom: `#modal-${modal.id}`, db: directors.db(), method: 'post', url: this.endpoints.addSchedule, data: data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error adding schedule',
                            body: 'There was an error adding the schedule. Please report this to the engineer.',
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        cb(false);
                    } else {
                        $(document).Toasts('create', {
                            class: 'bg-success',
                            title: 'Schedule added!',
                            autohide: true,
                            delay: 15000,
                            body: `Schedule was added! However, it may take several seconds to register in the WWSU system.`,
                        })
                        cb(true);
                    }
                })
            } catch (e) {
                $(document).Toasts('create', {
                    class: 'bg-danger',
                    title: 'Error adding schedule',
                    body: 'There was an error adding the schedule. Please report this to the engineer.',
                    icon: 'fas fa-skull-crossbones fa-lg',
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
     * @param {WWSUdb} directors Directors WWSUdb.
     * @param {object} data Data to pass to the endpoint.
     * @param {function} cb Function called after the request. True = success, false = failure.
     */
    editSchedule (modal, directors, data, cb) {
        this.doConflictCheck(modal, data, 'update', () => {
            try {
                this.requests.director.request({ dom: `#modal-${modal.id}`, db: directors.db(), method: 'post', url: this.endpoints.editSchedule, data: data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error editing schedule',
                            body: 'There was an error editing the schedule. Please report this to the engineer.',
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        cb(false);
                    } else {
                        $(document).Toasts('create', {
                            class: 'bg-success',
                            title: 'Schedule edited!',
                            autohide: true,
                            delay: 15000,
                            body: `Schedule was edited! However, it may take several seconds to register in the WWSU system.`,
                        })
                        cb(true);
                    }
                })
            } catch (e) {
                $(document).Toasts('create', {
                    class: 'bg-danger',
                    title: 'Error editing schedule',
                    body: 'There was an error editing the schedule. Please report this to the engineer.',
                    icon: 'fas fa-skull-crossbones fa-lg',
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
     * @param {WWSUdb} directors WWSUdb directors that can authorize this request
     * @param {object} data Data to pass to the endpoint.
     * @param {function} cb Function called after the request. True = success, false = failure.
     */
    removeSchedule (modal, directors, data, cb) {
        try {
            var schedule = this.schedule.db({ ID: data.ID }).first();
            //if (schedule.scheduleID) {
            //schedule = this.schedule.db({ ID: schedule.scheduleID }).first();
            //}
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error removing/reversing schedule',
                body: 'There was an error removing/reversing the schedule. Please report this to the engineer.',
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            cb(false);
        }
        this.doConflictCheck(modal, schedule, 'remove', () => {
            try {
                console.dir(this.schedule.db().get());
                this.requests.director.request({ dom: `#modal-${modal.id}`, db: directors.db(), method: 'post', url: this.endpoints.removeSchedule, data: data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error removing/reversing schedule',
                            body: 'There was an error removing/reversing the schedule. Please report this to the engineer.',
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        cb(false);
                    } else {
                        $(document).Toasts('create', {
                            class: 'bg-success',
                            title: 'Schedule removed/reversed',
                            autohide: true,
                            delay: 15000,
                            body: `Schedule was removed/reversed! However, it may take several seconds to register in the WWSU system.`,
                        });
                        cb(true);
                    }
                })
            } catch (e) {
                $(document).Toasts('create', {
                    class: 'bg-danger',
                    title: 'Error removing/reversing schedule',
                    body: 'There was an error removing/reversing the schedule. Please report this to the engineer.',
                    icon: 'fas fa-skull-crossbones fa-lg',
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
     * @param {WWSUdb} directors WWSUdb directors that can authorize this request
     * @param {object} data Data to pass to the endpoint.
     * @param {function} cb Function called after the request. True = success, false = failure.
     */
    addCalendar (modal, directors, data, cb) {
        // No conflict check necessary because new calendar events will never have a schedule immediately on creation.
        try {
            this.requests.director.request({ dom: `#modal-${modal.id}`, db: directors.db(), method: 'post', url: this.endpoints.add, data: data }, (response) => {
                if (response !== 'OK') {
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Error adding event',
                        body: 'There was an error adding the event. Please report this to the engineer.',
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                    cb(false);
                } else {
                    $(document).Toasts('create', {
                        class: 'bg-success',
                        title: 'Event added',
                        autohide: true,
                        delay: 10000,
                        body: `Event was added!`,
                    })
                    cb(true);
                }
            })
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error adding event',
                body: 'There was an error adding the event. Please report this to the engineer.',
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            console.error(e);
            cb(false);
        }
    }

    /**
  * Tell WWSU API to edit a calendar event.
  * 
  * @param {WWSUmodal} modal Modal to get blocked by JQuery UI when prompting for authorization.
  * @param {WWSUdb} directors WWSUdb directors that can authorize this request
  * @param {object} data Data to pass to the endpoint.
  * @param {function} cb Function called after the request. True = success, false = failure.
  */
    editCalendar (modal, directors, data, cb) {
        // Editing a calendar event requires conflict checking because it may affect the priority of its schedules using default values.
        this.doConflictCheck(modal, data, 'updateCalendar', () => {
            try {
                this.requests.director.request({ dom: `#modal-${modal.id}`, db: directors.db(), method: 'post', url: this.endpoints.edit, data: data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error editing event',
                            body: 'There was an error editing the event. Please report this to the engineer.',
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        cb(false);
                    } else {
                        $(document).Toasts('create', {
                            class: 'bg-success',
                            title: 'Event edited',
                            autohide: true,
                            delay: 15000,
                            body: `Event was edited! It may take several seconds for it to reflect in the system.`,
                        })
                        cb(true);
                    }
                })
            } catch (e) {
                $(document).Toasts('create', {
                    class: 'bg-danger',
                    title: 'Error editing event',
                    body: 'There was an error editing the event. Please report this to the engineer.',
                    icon: 'fas fa-skull-crossbones fa-lg',
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
     * @param {WWSUdb} directors WWSUdb directors that can authorize this request.
     * @param {object} data Data to pass to the endpoint.
     * @param {function} cb Function called after the request. True = success, false = failure.
     */
    removeCalendar (modal, directors, data, cb) {
        // We need to determine if the removal of this calendar (and thus all its schedules) will affect other events
        var calendar = this.calendar.db({ ID: data.ID }).first();
        this.doConflictCheck(modal, calendar, 'removeCalendar', () => {
            try {
                this.requests.director.request({ dom: `#modal-${modal.id}`, db: directors.db(), method: 'post', url: this.endpoints.remove, data: data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error removing event',
                            body: 'There was an error removing the event. Please report this to the engineer.',
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        cb(false);
                    } else {
                        $(document).Toasts('create', {
                            class: 'bg-success',
                            title: 'Event remove',
                            autohide: true,
                            delay: 15000,
                            body: `Event was permanently removed! However, it may take several seconds to register in the WWSU system.`,
                        })
                        cb(true);
                    }
                })
            } catch (e) {
                $(document).Toasts('create', {
                    class: 'bg-danger',
                    title: 'Error removing event',
                    body: 'There was an error removing the event. Please report this to the engineer.',
                    icon: 'fas fa-skull-crossbones fa-lg',
                });
                console.error(e);
                cb(false);
            }
        });
    }

    /**
     * Display a modal of a clicked event from the calendar.
     * 
     * @param {object} event Calendardb event
     * @param {WWSUdb} djs WWSUdb DJs for event actions
     * @param {WWSUdb} directors WWSUdb directors that can authorize actions
     */
    showClickedEvent (event, djs, directors) {
        this.occurrenceModal.title = `${event.type}: ${event.hosts} - ${event.name}`;
        this.occurrenceModal.body = this.generateFullEventCard(event);

        // Generate actions to perform on the event
        // Initialize utilities
        var util = new WWSUutil();

        // Initialize choices
        var choices = [ 'Do Nothing' ];
        if (event.scheduleType === 'updated') {
            choices.push(`Occurrence: Reverse / discard changes`);
        }
        if (event.scheduleType === 'canceled') {
            choices.push(`Occurrence: Un-cancel`);
        }
        if ([ 'canceled', 'canceled-system', 'unscheduled' ].indexOf(event.scheduleType) === -1) {
            choices.push(`Occurrence: Cancel`);
        }
        if ([ 'canceled', 'canceled-system', 'unscheduled', 'updated', 'updated-system' ].indexOf(event.scheduleType) === -1) {
            choices.push(`Occurrence: Edit and/or reschedule`);
        }
        choices.push(`Event Schedules: Add / Edit / Delete`);
        if ([ 'sports', 'office-hours', 'prod-booking', 'onair-booking' ].indexOf(event.type) === -1) {
            choices.push(`Event: Edit defaults`);
            choices.push(`Event: Delete (and all schedules)`);
        }

        // generate form
        this.occurrenceModal.footer = ``;
        $(this.occurrenceModal.footer).alpaca({
            "schema": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "required": true,
                        "title": "Choose an action",
                        "enum": choices
                    },
                }
            },
            "options": {
                "fields": {
                    "action": {
                        "select": true
                    }
                },
                "form": {
                    "buttons": {
                        "submit": {
                            "title": "Perform Action",
                            "click": (form, e) => {
                                form.refreshValidationState(true);
                                if (!form.isValid(true)) {
                                    form.focus();
                                    return;
                                }
                                var value = form.getValue();
                                switch (value.action) {

                                    case `Occurrence: Reverse / discard changes`:
                                        // TODO: Conflict checks (make sure WWSU API does this too)
                                        util.confirmDialog(`<p>Are you sure you want to reverse updates made for ${event.type}: ${event.name} on ${moment(event.start).format('LLLL')}?</p>
                                        <ul>
                                            <li>Discards updates applied to this date/time</li>
                                            <li>Reverts this back to event's regular scheduled time and options if changed</li>
                                            <li>A conflict check will run, and you will be notified of occurrence changes that will be made to avoid conflicts</li>
                                            ${[ 'show', 'sports', 'remote', 'prerecord', 'genre', 'playlist' ].indexOf(event.type) !== -1 && event.timeChanged ? `<li>Notifies subscribers the event will air at the regularly-scheduled date/time</li>` : ``}
                                        </ul>`, null, () => {
                                            this.removeSchedule(this.occurrenceModal, directors, { ID: event.scheduleID }, (success) => {
                                                if (success) {
                                                    this.occurrenceModal.iziModal('close');
                                                }
                                            });
                                        });
                                        break;

                                    case `Occurrence: Un-cancel`:
                                        // TODO: Conflict checks (make sure WWSU API does this too)
                                        util.confirmDialog(`<p>Are you sure you want to reverse the cancellation of ${event.type}: ${event.name} on ${moment(event.start).format('LLLL')}?</p>
                                        <ul>
                                            <li>Occurrence will be on the schedule again</li>
                                            <li>A conflict check will run, and you will be notified of occurrence changes that will be made to avoid conflicts</li>
                                            ${[ 'show', 'sports', 'remote', 'prerecord', 'genre', 'playlist' ].indexOf(event.type) !== -1 ? `<li>Notifies subscribers the cancellation was reversed</li>` : ``}
                                        </ul>`, null, () => {
                                            this.removeSchedule(this.occurrenceModal, directors, { ID: event.scheduleID }, (success) => {
                                                if (success) {
                                                    this.occurrenceModal.iziModal('close');
                                                }
                                            });

                                        });
                                        break;

                                    case `Event: Delete (and all schedules)`:
                                        util.confirmDialog(`<p>Are you sure you want to <b>permanently</b> remove ${event.type}: ${event.name}?</p>
                                        <ul>
                                            <li>Removes the event</li>
                                            <li>Removes all schedules of the event from the calendar</li>
                                            <li>Notifies all notification subscribers the event has been discontinued</li>
                                            <li>Removes all notification subscriptions</li>
                                            <li>Does not remove broadcast logs nor timesheet records</li>
                                            <li>Broadcasts: does not remove analytics, but disassociates them from the event</li>
                                        </ul>`, event.name, () => {
                                            this.removeCalendar(this.occurrenceModal, directors, { ID: event.calendarID }, (success) => {
                                                if (success) {
                                                    this.occurrenceModal.iziModal('close');
                                                }
                                            });
                                        });
                                        break;

                                    case `Occurrence: Cancel`:
                                        this.showCancelForm(event, directors);
                                        break;

                                    case `Event: Edit defaults`:
                                        var _calendar = this.calendar.db().get().find((_event) => event.ID === event.calendarID);
                                        this.showEventForm(_calendar, djs, directors);
                                        break;

                                    case `Occurrence: Edit and/or reschedule`:
                                        this.showOccurrenceForm(event, djs, directors);
                                        break;

                                    case `Event Schedules: Add / Edit / Delete`:
                                        this.showSchedules(event.calendarID, djs, directors);
                                        break;

                                }
                            }
                        }
                    }
                }
            },
        });

        this.occurrenceModal.iziModal('open');
    }

    /**
     * Generate HTML to view a full event
     * 
     * @param {object} event Event as generated from calendardb.processRecord
     * @returns {string} HTML of the card
     */
    generateFullEventCard (event) {
        var colorClass = this.getColorClass(event);
        var iconClass = this.getIconClass(event);

        if ([ 'canceled', 'canceled-system', 'canceled-changed' ].indexOf(event.scheduleType) !== -1) { colorClass = 'dark' }

        var badgeInfo
        if ([ 'canceled-changed' ].indexOf(event.scheduleType) !== -1) {
            badgeInfo = `<span class="badge-warning" style="font-size: 1em;">RESCHEDULED</span>`
        }
        if ([ 'updated', 'updated-system' ].indexOf(event.scheduleType) !== -1 && (event.timeChanged)) {
            badgeInfo = `<span class="badge badge-warning" style="font-size: 1em;">TEMP TIME CHANGE</span>`
        }
        if ([ 'canceled', 'canceled-system' ].indexOf(event.scheduleType) !== -1) {
            badgeInfo = `<span class="badge badge-danger" style="font-size: 1em;">CANCELED</span>`
        }

        return `<div class="p-2 card card-${colorClass} card-outline">
      <div class="card-body box-profile">
        <div class="text-center">
        ${event.logo !== null ? `<img class="profile-user-img img-fluid img-circle" src="https://server.wwsu1069.org/uploads/calendar/logo/${event.logo}" alt="Show Logo">` : `<i class="profile-user-img img-fluid img-circle ${iconClass} bg-${colorClass}" style="font-size: 5rem;"></i>`}
        </div>

        <h3 class="profile-username text-center">${event.name}</h3>

        <p class="text-muted text-center">${event.hosts}</p>

        <ul class="list-group list-group-unbordered mb-3">
        ${badgeInfo ? `<li class="list-group-item text-center">
        <p><b>${badgeInfo}</b></p>
        ${event.scheduleReason !== null ? `<p><strong>${event.scheduleReason}</strong></p>` : ``}
      </li>` : ``}
        <li class="list-group-item text-center">
            <b>${[ 'canceled', 'canceled-system', 'canceled-updated' ].indexOf(event.scheduleType) !== -1 ? `Original Time: ` : ``}${moment(event.start).format('lll')} - ${moment(event.end).format('hh:mm A')}</b>
        </li>
        <li class="list-group-item">
        ${event.banner !== null ? `<img class="img-fluid" src="https://server.wwsu1069.org/uploads/calendar/banner/${event.banner}" alt="Show Banner">` : ``}
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
     * @param {WWSUdb} directors WWSUdb directors that can authorize an action
     */
    showCancelForm (event, directors) {
        // Initialize utilities
        var util = new WWSUutil();

        this.occurrenceActionModal.title = `Cancel ${event.type}: ${event.hosts} - ${event.name} on ${moment(event.start).format('LLLL')}`;
        this.occurrenceActionModal.footer = ``;
        this.occurrenceActionModal.body = ``;

        $(this.occurrenceActionModal.body).alpaca({
            "schema": {
                "type": "object",
                "properties": {
                    "scheduleReason": {
                        "type": "string",
                        "title": "Reason for cancellation",
                        "maxLength": 255
                    },
                }
            },
            "options": {
                "fields": {
                    "scheduleReason": {
                        "type": "textarea",
                        "helper": "The reason will be displayed publicly on the website and will be saved in logs"
                    }
                },
                "form": {
                    "buttons": {
                        "submit": {
                            "title": "Cancel Event",
                            "click": (form, e) => {
                                form.refreshValidationState(true);
                                if (!form.isValid(true)) {
                                    form.focus();
                                    return;
                                }
                                var value = form.getValue();
                                util.confirmDialog(`<p>Are you sure you want to cancel ${event.type}: ${event.hosts} - ${event.name} on ${moment(event.start).format("LLLL")}?</p>
                                        <ul>
                                            <li>Please <strong>do not</strong> cancel occurrences to make room to schedule other events; scheduling the other event will automatically make adjustments as necessary and reverse the changes should the other event get canceled.</li>
                                            <li>Marks this occurrence as canceled on calendar</li>
                                            ${[ 'show', 'sports', 'remote' ].indexOf(event.type) !== -1 ? `<li>If the DJ tries to broadcast on this date/time, it will be flagged as an unauthorized / unscheduled broadcast.</li>` : ``}
                                            ${[ 'remote' ].indexOf(event.type) !== -1 ? `<li>DJ Controls will deny the DJ's ability to start a remote broadcast on this date/time if their DJ Controls is DJ-locked.</li>` : ``}
                                            ${[ 'prerecord', 'playlist' ].indexOf(event.type) !== -1 ? `<li>This prerecord or playlist will not be aired by the system on this date/time.</li>` : ``}
                                            ${[ 'genre' ].indexOf(event.type) !== -1 ? `<li>This genre rotation will not start on this date/time; if no other genres are scheduled, the system will go to default rotation.</li>` : ``}
                                            ${[ 'show', 'sports', 'remote', 'prerecord', 'genre', 'playlist' ].indexOf(event.type) !== -1 ? `<li>Subscribers will be notified the event was canceled on this date/time.</li>` : ``}
                                            <li>Any event occurrences canceled or changed via priorities because of this occurrence will have their cancellations / updates reversed; they will be back on the schedule with their original dates/times. Subscribers will be notified of this as well.</li>
                                        </ul>`, null, () => {
                                    this.addSchedule(this.occurrenceActionModal, directors, {
                                        calendarID: event.calendarID,
                                        scheduleID: event.scheduleID,
                                        scheduleType: 'canceled',
                                        scheduleReason: value.scheduleReason,
                                        originalTime: event.start
                                    }, (success) => {
                                        if (success) {
                                            this.occurrenceActionModal.iziModal('close');
                                            this.occurrenceModal.iziModal('close');
                                        }
                                    });
                                });
                            }
                        }
                    }
                }
            },
        });

        this.occurrenceActionModal.iziModal('open');
    }

    /**
     * Show form to add a new event or edit an existing one.
     * 
     * @param {?object} event Original event data if editing an event, or null if making a new one
     * @param {WWSUdb} djs WWSUdb DJs that can be selected in the form
     * @param {WWSUdb} directors WWSUdb directors that can be selected in the form and authorize the request
     */
    showEventForm (event, djs, directors) {
        this.eventModal.title = `${event ? `Edit event ${event.type}: ${event.hosts} - ${event.name}` : `New event`}`;
        this.eventModal.footer = ``;
        this.eventModal.body = ``;

        this.getEventsPlaylists((events, playlists) => {
            var _djs = djs.db().get();

            var calendarEvents = this.calendar.db().get().map((event) => event.name);

            $(this.eventModal.body).alpaca({
                "schema": {
                    "title": "Default Event Properties",
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "required": true,
                            "title": "Event Type",
                            "enum": [ 'show', 'remote', 'prerecord', 'genre', 'playlist', 'event' ]
                        },
                        "name": {
                            "type": "string",
                            "required": true,
                            "title": "Event Name",
                            "maxLength": 255
                        },
                        "description": {
                            "type": "string",
                            "title": "Event Description"
                        },
                        "priority": {
                            "type": "number",
                            "title": "Event Priority",
                            "minimum": -1,
                            "maximum": 10
                        },
                        "hostDJ": {
                            "type": "number",
                            "title": "Host DJ",
                            "enum": _djs.map((dj) => dj.ID),
                        },
                        "cohostDJ1": {
                            "type": "number",
                            "title": "Co-Host DJ (1)",
                            "enum": _djs.map((dj) => dj.ID),
                        },
                        "cohostDJ2": {
                            "type": "number",
                            "title": "Co-Host DJ (2)",
                            "enum": _djs.map((dj) => dj.ID),
                        },
                        "cohostDJ3": {
                            "type": "number",
                            "title": "Co-Host DJ (3)",
                            "enum": _djs.map((dj) => dj.ID),
                        },
                        "playlistID": {
                            "type": "number",
                            "title": "RadioDJ Playlist",
                            "enum": playlists.map((playlist) => playlist.ID)
                        },
                        "eventID": {
                            "type": "number",
                            "title": "RadioDJ Rotation-triggering Manual Event",
                            "enum": events.map((eventb) => eventb.ID)
                        }
                    }
                },

                "options": {
                    "fields": {
                        "type": {
                            "type": "select"
                        },
                        "name": {
                            "helper": "Event may not share the name of another event",
                            "validator": function (callback) {
                                var value = this.getValue();
                                if (calendarEvents.indexOf(value) !== -1 && (!event || !event.name || event.name !== value)) {
                                    callback({
                                        "status": false,
                                        "message": "Value in this field matches the name of another event. This is not allowed."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        },
                        "description": {
                            "type": "textarea",
                        },
                        "priority": {
                            "type": "integer",
                            "helper": `Please see <button class="btn btn-sm btn-outline-info" data-izimodal-open="#modal-${this.priorityInfoModal.id}">This Modal</button> for information on how priorities work regarding schedule conflicts. If left blank, a default priority depending on event type will be used (sports = 9, remote = 7, show = 5, prerecord = 3, playlist = 1, genre = 0, everything else = -1).`,
                        },
                        "hostDJ": {
                            "type": "select",
                            "optionLabels": _djs.map((dj) => dj.name),
                            "helper": "The DJ who signed up for this show, or the official WWSU producer for shows run by non-WWSU people. This field is required for show, remote, and prerecord events.",
                            "validator": function (callback) {
                                var value = this.getValue();
                                var type = this.getParent().childrenByPropertyId[ "type" ].getValue();
                                if ([ 'show', 'remote', 'prerecord' ].indexOf(type) !== -1 && (!value || value === '')) {
                                    callback({
                                        "status": false,
                                        "message": "Field is required for show, remote, and prerecord events."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        },
                        "cohostDJ1": {
                            "type": "select",
                            "optionLabels": _djs.map((dj) => dj.name),
                            "helper": "If another DJ runs this show together with the host DJ, specify them here."
                        },
                        "cohostDJ2": {
                            "type": "select",
                            "optionLabels": _djs.map((dj) => dj.name),
                            "helper": "If there is a third DJ who runs this show, specify them here."
                        },
                        "cohostDJ3": {
                            "type": "select",
                            "optionLabels": _djs.map((dj) => dj.name),
                            "helper": "If there is a fourth DJ who runs this show, specify them here."
                        },
                        "playlistID": {
                            "type": "select",
                            "optionLabels": playlists.map((playlist) => playlist.name),
                            "helper": "Required for prerecords and playlists only.",
                            "validator": function (callback) {
                                var value = this.getValue();
                                var type = this.getParent().childrenByPropertyId[ "type" ].getValue();
                                if ([ 'prerecord', 'playlist' ].indexOf(type) !== -1 && (!value || value === '')) {
                                    callback({
                                        "status": false,
                                        "message": "Field is required for prerecord and playlist events."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        },
                        "eventID": {
                            "type": "select",
                            "optionLabels": events.map((eventb) => eventb.name),
                            "helper": "Required for genres only.",
                            "validator": function (callback) {
                                var value = this.getValue();
                                var type = this.getParent().childrenByPropertyId[ "type" ].getValue();
                                if ([ 'genre' ].indexOf(type) !== -1 && (!value || value === '')) {
                                    callback({
                                        "status": false,
                                        "message": "Field is required for genre events."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        }
                    },

                    "form": {
                        "buttons": {
                            "submit": {
                                "title": `${event ? `Edit` : `Add`} Event`,
                                "click": (form, e) => {
                                    form.refreshValidationState(true);
                                    if (!form.isValid(true)) {
                                        form.focus();
                                        return;
                                    }
                                    var value = form.getValue();
                                    var _event = this.verify(value);
                                    if (!_event.event) {
                                        $(document).Toasts('create', {
                                            class: 'bg-warning',
                                            title: 'Event verification failed',
                                            autohide: true,
                                            delay: 20000,
                                            body: _event,
                                        })
                                        form.focus();
                                        return;
                                    }
                                    if (event) {
                                        value.ID = event.ID;
                                        this.editCalendar(this.eventModal, directors, value, (success) => {
                                            if (success) {
                                                this.eventModal.iziModal('close');
                                                this.occurrenceModal.iziModal('close');
                                            }
                                        });
                                    } else {
                                        this.addCalendar(this.eventModal, directors, value, (success) => {
                                            if (success) {
                                                this.eventModal.iziModal('close');
                                                this.occurrenceModal.iziModal('close');
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                },

                "data": event ? event : [],
            });

            this.eventModal.iziModal('open');
        });
    }

    /**
     * Show form to edit an occurrence.
     * 
     * @param {object} event Original event data
     * @param {WWSUdb} djs WWSUdb DJs that can be selected in the form
     * @param {WWSUdb} directors WWSUdb directors that can be selected in the form and authorize the request
     */
    showOccurrenceForm (event, djs, directors) {
        this.occurrenceActionModal.title = `Edit occurrence ${event.type}: ${event.hosts} - ${event.name} on ${moment(event.start).format("LLLL")}`;
        this.occurrenceActionModal.footer = '';
        this.occurrenceActionModal.body = '';

        var validTypes = [];
        var util = new WWSUutil();

        switch (event.type) {
            case 'show':
            case 'remote':
            case 'prerecord':
                validTypes = [ 'show', 'remote', 'prerecord' ];
                break;
            case 'genre':
            case 'playlist':
                validTypes = [ 'genre', 'playlist' ];
                break;
            case 'sports':
                validTypes = [ 'sports' ];
                break;
            case 'office-hours':
                validTypes = [ 'office-hours' ];
                break;
            case 'prod-booking':
            case 'onair-booking':
                validTypes = [ 'prod-booking', 'onair-booking' ];
                break;
            case 'task':
                validTypes = [ 'task' ];
                break;
        }

        this.getEventsPlaylists((events, playlists) => {
            var _djs = djs.db().get();

            var calendarEvents = this.calendar.db().get().map((event) => event.name);
            var sportsEvents = this.calendar.db().get()
                .filter((event) => event.type === 'sports')
                .map((event) => event.name);

            $(this.occurrenceActionModal.body).alpaca({
                "schema": {
                    "title": "Properties for this occurrence only",
                    "type": "object",
                    "properties": {
                        "calendarID": {
                            "type": "number"
                        },
                        "scheduleID": {
                            "type": "number"
                        },
                        "scheduleType": {
                            "type": "string",
                        },
                        "originalTime": {
                            "type": "string",
                        },
                        "scheduleReason": {
                            "type": "string",
                            "title": "Reason for update/change",
                            "maxLength": 255
                        },
                        "newTime": {
                            "format": "datetime",
                            "title": "Re-schedule to this time/date"
                        },
                        "duration": {
                            "type": "number",
                            "title": "Change occurrence duration (in minutes)",
                            "min": 1,
                            "max": 1440,
                        },
                        "type": {
                            "type": "string",
                            "title": "Change occurrence type",
                            "enum": validTypes
                        },
                        "name": {
                            "type": "string",
                            "title": "Change occurrence name",
                            "maxLength": 255
                        },
                        "description": {
                            "type": "string",
                            "title": "Change occurrence description"
                        },
                        "priority": {
                            "type": "number",
                            "title": "Change occurrence priority",
                            "minimum": -1,
                            "maximum": 10
                        },
                        "hostDJ": {
                            "type": "number",
                            "title": "Change occurrence Host DJ",
                            "enum": _djs.map((dj) => dj.ID),
                        },
                        "cohostDJ1": {
                            "type": "number",
                            "title": "Change occurrence Co-Host DJ (1)",
                            "enum": _djs.map((dj) => dj.ID),
                        },
                        "cohostDJ2": {
                            "type": "number",
                            "title": "Change occurrence Co-Host DJ (2)",
                            "enum": _djs.map((dj) => dj.ID),
                        },
                        "cohostDJ3": {
                            "type": "number",
                            "title": "Change occurrence Co-Host DJ (3)",
                            "enum": _djs.map((dj) => dj.ID),
                        },
                        "playlistID": {
                            "type": "number",
                            "title": "Change occurrence RadioDJ Playlist",
                            "enum": playlists.map((playlist) => playlist.ID)
                        },
                        "eventID": {
                            "type": "number",
                            "title": "Change occurrence RadioDJ Rotation-triggering Manual Event",
                            "enum": events.map((eventb) => eventb.ID)
                        },
                    }
                },

                "options": {
                    "fields": {
                        "calendarID": {
                            "type": "hidden"
                        },
                        "scheduleID": {
                            "type": "hidden"
                        },
                        "scheduleType": {
                            "type": "hidden"
                        },
                        "originalTime": {
                            "type": "hidden"
                        },
                        "scheduleReason": {
                            "type": "textarea",
                            "helper": "The reason will be displayed publicly on the website and will be saved in logs"
                        },
                        "newTime": {
                            "dateFormat": "YYYY-MM-DDTHH:mm:[00]Z",
                            "helper": `If this occurrence should happen at a different date/time, specify it here. The current start date/time is <strong>${moment(event.start).format("LLLL")}</strong>.`,
                            "picker": {
                                "inline": true,
                                "sideBySide": true
                            }
                        },
                        "duration": {
                            "helper": `If changing the duration of this occurrence, type the new duration here. The current duration is <strong>${event.duration}</strong>.`
                        },
                        "type": {
                            "type": "select",
                            "helper": `If changing the type for this occurrence, specify the new type here. The types you may change to are limited and depend on the original type. The current type is <strong>${event.type}</strong>`
                        },
                        "name": {
                            "helper": `If changing the name of this occurrence, specify it here. The current name is <strong>${event.name}</strong>. This field is ignored for bookings and office-hours.`,
                            "validator": function (callback) {
                                var value = this.getValue();
                                value = value.split(" vs.")[ 0 ];
                                var type = this.getParent().childrenByPropertyId[ "type" ].getValue();
                                if ((((!type || type === '') && event.type === 'sports') || type === 'sports') && sportsEvents.indexOf(value) === -1) {
                                    callback({
                                        "status": false,
                                        "message": `For sports, name must begin with a valid sport and optionally proceed with " vs. name of opponent team". Valid sports: ${sportsEvents.join(", ")}`
                                    });
                                    return;
                                } else if (value && value !== '' && calendarEvents.indexOf(value) !== -1 && (!event || !event.name || event.name !== value)) {
                                    callback({
                                        "status": false,
                                        "message": "Value in this field matches the name of another event. This is not allowed."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        },
                        "description": {
                            "type": "textarea",
                            "helper": `Type a new description if you want to change it. The current description: ${event.description ? event.description : `--NONE--`}`
                        },
                        "priority": {
                            "type": "integer",
                            "helper": `Change the occurrence priority. Please see <button class="btn btn-sm btn-outline-info" data-izimodal-open="#modal-${this.priorityInfoModal.id}">This Modal</button> for information on how priorities work regarding schedule conflicts. The current priority is <strong>${event.priority}</strong>`,
                        },
                        "hostDJ": {
                            "type": "select",
                            "optionLabels": _djs.map((dj) => dj.name),
                            "helper": `Change the DJ who signed up for this show, or the official WWSU producer for shows run by non-WWSU people. The current hostDJ is set to <strong>${event.hostDJ ? _djs.find((dj) => dj.ID === event.hostDJ).name : `--NONE--`}</strong>`,
                            "validator": function (callback) {
                                var value = this.getValue();
                                var type = this.getParent().childrenByPropertyId[ "type" ].getValue();
                                if (((type && type !== '' && [ 'show', 'remote', 'prerecord' ].indexOf(type) !== -1) || ([ 'show', 'remote', 'prerecord' ].indexOf(event.type) !== -1)) && (!value || value === '') && !event.hostDJ) {
                                    callback({
                                        "status": false,
                                        "message": "Field is required for show, remote, and prerecord events."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        },
                        "cohostDJ1": {
                            "type": "select",
                            "optionLabels": _djs.map((dj) => dj.name),
                            "helper": `Change the value of the first co-host DJ. The current first co-host is set to <strong>${event.cohostDJ1 ? _djs.find((dj) => dj.ID === event.cohostDJ1).name : `--NONE--`}</strong>`
                        },
                        "cohostDJ2": {
                            "type": "select",
                            "optionLabels": _djs.map((dj) => dj.name),
                            "helper": `Change the value of the second co-host DJ. The current second co-host is set to <strong>${event.cohostDJ2 ? _djs.find((dj) => dj.ID === event.cohostDJ2).name : `--NONE--`}</strong>`
                        },
                        "cohostDJ3": {
                            "type": "select",
                            "optionLabels": _djs.map((dj) => dj.name),
                            "helper": `Change the value of the third co-host DJ. The current third co-host is set to <strong>${event.cohostDJ3 ? _djs.find((dj) => dj.ID === event.cohostDJ3).name : `--NONE--`}</strong>`
                        },
                        "playlistID": {
                            "type": "select",
                            "optionLabels": playlists.map((playlist) => playlist.name),
                            "helper": `Change or set the RadioDJ playlist (prerecord and playlist events). The current playlist is set to <strong>${event.playlistID ? playlists.find((playlist) => playlist.ID === event.playlistID).name : `--NONE--`}</strong>`,
                            "validator": function (callback) {
                                var value = this.getValue();
                                var type = this.getParent().childrenByPropertyId[ "type" ].getValue();
                                if (((type && type !== '' && [ 'prerecord', 'playlist' ].indexOf(type) !== -1) || ([ 'prerecord', 'playlist' ].indexOf(event.type) !== -1)) && (!value || value === '') && !event.playlistID) {
                                    callback({
                                        "status": false,
                                        "message": "Field is required for prerecord and playlist events."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        },
                        "eventID": {
                            "type": "select",
                            "optionLabels": events.map((eventb) => eventb.name),
                            "helper": `Change or set the rotation-triggering RadioDJ event (genre events). The current RadioDJ event is set to <strong>${event.eventID ? events.find((eventb) => eventb.ID === event.eventID).name : `--NONE--`}</strong>`,
                            "validator": function (callback) {
                                var value = this.getValue();
                                var type = this.getParent().childrenByPropertyId[ "type" ].getValue();
                                if (((type && type !== '' && [ 'genre' ].indexOf(type) !== -1) || ([ 'genre' ].indexOf(event.type) !== -1)) && (!value || value === '') && !event.eventID) {
                                    callback({
                                        "status": false,
                                        "message": "Field is required for genre events."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        }
                    },

                    "form": {
                        "buttons": {
                            "submit": {
                                "title": `Edit Occurrence`,
                                "click": (form, e) => {
                                    form.refreshValidationState(true);
                                    if (!form.isValid(true)) {
                                        form.focus();
                                        return;
                                    }
                                    var value = form.getValue();
                                    var _event = this.verify(value);
                                    if (!_event.event) {
                                        $(document).Toasts('create', {
                                            class: 'bg-warning',
                                            title: 'Event verification failed',
                                            autohide: true,
                                            delay: 20000,
                                            body: _event,
                                        })
                                        form.focus();
                                        return;
                                    }
                                    util.confirmDialog(`<p>Are you sure you want to edit occurrence ${event.type}: ${event.hosts} - ${event.name} on ${moment(event.start).format("LLLL")}?</p>
                                        <ul>
                                            <li>Changes will only apply to the event's original occurrence of ${moment(event.start).format("LLLL")}.</li>
                                            <li>A conflict check will run, and you will be notified of occurrence changes that will be made to avoid conflicts</li>
                                            ${value.newTime && value.newTime !== '' ? `<li>Subscribers will be notified of the change in date/time.</li>` : ``}
                                            <li>Properties which you did not set a value via the edit form will use the default value from the event. Properties which you had set on the form will use the value you set, even if the default value for the event is edited later.</li>
                                        </ul>`, null, () => {
                                        this.addSchedule(this.occurrenceActionModal, directors, value, (success) => {
                                            if (success) {
                                                this.occurrenceActionModal.iziModal('close');
                                                this.occurrenceModal.iziModal('close');
                                            }
                                        });
                                    });
                                }
                            }
                        }
                    }
                },

                "data": {
                    "calendarID": event.calendarID,
                    "scheduleID": event.scheduleID,
                    "scheduleType": "updated",
                    "originalTime": moment(event.start).toISOString(true)
                }
            });

            this.occurrenceActionModal.iziModal('open');
        });
    }

    /**
     * Show form to add a new schedule or edit an existing one.
     * 
     * @param {?object} schedule Original schedule data if editing a schedule, or null if making a new one
     * @param {number} calendarID The ID of the calendar record pertaining to this schedule
     * @param {WWSUdb} djs WWSUdb DJs that can be selected in the form
     * @param {WWSUdb} directors WWSUdb directors that can be selected in the form and authorize the request
     */
    showScheduleForm (schedule, calendarID, djs, directors) {
        var event = this.calendar.db({ ID: calendarID }).first();

        this.scheduleModal.title = `${schedule ? `Edit schedule ${event.type}: ${event.hosts} - ${event.name}` : `New schedule for ${event.type}: ${event.hosts} - ${event.name}`}`;
        this.scheduleModal.footer = ``;
        this.scheduleModal.body = ``;

        var validTypes = [];
        var util = new WWSUutil();

        switch (event.type) {
            case 'show':
            case 'remote':
            case 'prerecord':
                validTypes = [ 'show', 'remote', 'prerecord' ];
                break;
            case 'genre':
            case 'playlist':
                validTypes = [ 'genre', 'playlist' ];
                break;
            case 'sports':
                validTypes = [ 'sports' ];
                break;
            case 'office-hours':
                validTypes = [ 'office-hours' ];
                break;
            case 'prod-booking':
            case 'onair-booking':
                validTypes = [ 'prod-booking', 'onair-booking' ];
                break;
            case 'task':
                validTypes = [ 'task' ];
                break;
        }

        this.getEventsPlaylists((events, playlists) => {
            var _djs = djs.db().get();

            var calendarEvents = this.calendar.db().get().map((event) => event.name);
            var sportsEvents = this.calendar.db().get()
                .filter((event) => event.type === 'sports')
                .map((event) => event.name);

            $(this.scheduleModal.body).alpaca({
                "schema": {
                    "title": "Schedule",
                    "type": "object",
                    "properties": {
                        "ID": {
                            "type": "number"
                        },
                        "calendarID": {
                            "type": "number"
                        },
                        "scheduleID": {
                            "type": "number"
                        },
                        "oneTime": {
                            "title": "One-time Schedules",
                            "type": "array",
                            "items": {
                                "title": "One-time start date/time",
                                "format": "datetime"
                            }
                        },
                        "recurDM": {
                            "title": "Recur on days of the month",
                            "type": "array",
                            "items": {
                                "type": "number"
                            },
                            "enum": [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31 ]
                        },
                        "recurWM": {
                            "title": "Recur on weeks of the month",
                            "type": "array",
                            "items": {
                                "type": "number"
                            },
                            "enum": [ 1, 2, 3, 4, 5, 0 ]
                        },
                        "recurDW": {
                            "title": "Recur on days of the week",
                            "type": "array",
                            "items": {
                                "type": "number"
                            },
                            "enum": [ 1, 2, 3, 4, 5, 6, 7 ]
                        },
                        "recurEvery": {
                            "title": "Schedule only on every X week of the year",
                            "type": "number",
                            "required": true,
                            "default": 1,
                            "min": 1,
                            "max": 52
                        },
                        "recurH": {
                            "title": "Recur on hours of the day",
                            "type": "array",
                            "items": {
                                "type": "number"
                            },
                            "enum": [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23 ]
                        },
                        "recurM": {
                            "title": "Minute of the hour",
                            "type": "number",
                            "min": 0,
                            "max": 59
                        },
                        "duration": {
                            "title": "Duration (minutes)",
                            "type": "number",
                            "required": true,
                            "min": 1,
                            "max": 1440
                        },
                        "startDate": {
                            "title": "Start Date",
                            "format": "date"
                        },
                        "endDate": {
                            "title": "End Date",
                            "required": true,
                            "format": "date"
                        },
                        "type": {
                            "type": "string",
                            "title": "Change occurrence type",
                            "enum": validTypes
                        },
                        "name": {
                            "type": "string",
                            "title": "Change occurrence name",
                            "maxLength": 255
                        },
                        "description": {
                            "type": "string",
                            "title": "Change occurrence description"
                        },
                        "priority": {
                            "type": "number",
                            "title": "Change occurrence priority",
                            "minimum": -1,
                            "maximum": 10
                        },
                        "hostDJ": {
                            "type": "number",
                            "title": "Change occurrence Host DJ",
                            "enum": _djs.map((dj) => dj.ID),
                        },
                        "cohostDJ1": {
                            "type": "number",
                            "title": "Change occurrence Co-Host DJ (1)",
                            "enum": _djs.map((dj) => dj.ID),
                        },
                        "cohostDJ2": {
                            "type": "number",
                            "title": "Change occurrence Co-Host DJ (2)",
                            "enum": _djs.map((dj) => dj.ID),
                        },
                        "cohostDJ3": {
                            "type": "number",
                            "title": "Change occurrence Co-Host DJ (3)",
                            "enum": _djs.map((dj) => dj.ID),
                        },
                        "playlistID": {
                            "type": "number",
                            "title": "Change occurrence RadioDJ Playlist",
                            "enum": playlists.map((playlist) => playlist.ID)
                        },
                        "eventID": {
                            "type": "number",
                            "title": "Change occurrence RadioDJ Rotation-triggering Manual Event",
                            "enum": events.map((eventb) => eventb.ID)
                        },
                    }
                },

                "options": {
                    "fields": {
                        "ID": {
                            "type": "hidden"
                        },
                        "calendarID": {
                            "type": "hidden"
                        },
                        "scheduleID": {
                            "type": "hidden"
                        },
                        "oneTime": {
                            "helper": `Specify specific non-recurring dates/times you would like the event to occur.`,
                            "fields": {
                                "item": {
                                    "dateFormat": "YYYY-MM-DDTHH:mm:[00]Z",
                                    "picker": {
                                        "inline": true,
                                        "sideBySide": true
                                    },
                                }
                            },
                            "actionbar": {
                                "showLabels": true,
                                "actions": [ {
                                    "label": "Add",
                                    "action": "add"
                                }, {
                                    "label": "Remove",
                                    "action": "remove"
                                }, {
                                    "label": "Move Up",
                                    "action": "up",
                                    "enabled": false
                                }, {
                                    "label": "Move Down",
                                    "action": "down",
                                    "enabled": false
                                } ]
                            },
                        },
                        "recurDM": {
                            "helper": "If you want this event to recur on specific days of the month, choose them here. This recurring filter will be combined with others you specify. For example, if you also specify recurring days of the week, this event will only be scheduled on the selected days of the month that also match the selected days of the week.",
                            "type": "select",
                            "multiple": true,
                        },
                        "recurWM": {
                            "helper": "If you want this event to recur on specific weeks of the month, choose them here. This recurring filter will be combined with others you specify.",
                            "type": "select",
                            "multiple": true,
                            "optionLabels": [ "First", "Second", "Third", "Fourth", "Fifth (only if applicable)", "Last (either fourth or fifth)" ],
                        },
                        "recurDW": {
                            "helper": "If you want this event to recur on specific days of the week, choose them here. This recurring filter will be combined with others you specify.",
                            "type": "select",
                            "multiple": true,
                            "optionLabels": [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
                        },
                        "recurEvery": {
                            "helper": "This event should only be scheduled every X weeks in the year. For example, 1 = every week, 2 = every other week, 3 = every third week, etc.",
                        },
                        "recurH": {
                            "helper": "If you specify any recurring filters, specify what hour(s) of the day this event should begin.",
                            "type": "select",
                            "multiple": true,
                            "optionLabels": [ "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM" ],
                            "validator": function (callback) {
                                var value = this.getValue();
                                var dm = this.getParent().childrenByPropertyId[ "recurDM" ].getValue();
                                var wm = this.getParent().childrenByPropertyId[ "recurWM" ].getValue();
                                var dw = this.getParent().childrenByPropertyId[ "recurDW" ].getValue();

                                if ((dm.length > 0 || wm.length > 0 || dw.length > 0) && value.length === 0) {
                                    callback({
                                        "status": false,
                                        "message": "You must specify at least one hour when you have a Day of Month, Week of Month, or Day of Week recurrence filter set."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        },
                        "recurM": {
                            "helper": "If you specify any recurring filters, specify what minute of the hour(s) this event should begin.",
                            "validator": function (callback) {
                                var value = this.getValue();
                                var dm = this.getParent().childrenByPropertyId[ "recurDM" ].getValue();
                                var wm = this.getParent().childrenByPropertyId[ "recurWM" ].getValue();
                                var dw = this.getParent().childrenByPropertyId[ "recurDW" ].getValue();
                                var h = this.getParent().childrenByPropertyId[ "recurH" ].getValue();

                                if ((dm.length > 0 || wm.length > 0 || dw.length > 0 || h.length > 0) && ((!value && value !== 0) || value === ``)) {
                                    callback({
                                        "status": false,
                                        "message": "Minute is required when one or more recurrence filters are specified."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        },
                        "startDate": {
                            "dateFormat": "YYYY-MM-DDT[00]:[00]:[00]Z",
                            "helper": `If a date is specified, this schedule will not occur prior to this date.`,
                            "picker": {
                                "inline": true,
                                "sideBySide": true
                            }
                        },
                        "endDate": {
                            "dateFormat": "YYYY-MM-DDT[00]:[00]:[00]Z",
                            "helper": `This schedule will not occur after this date. It is recommended to set this as the end of the show scheduling period (such as the semester).`,
                            "picker": {
                                "inline": true,
                                "sideBySide": true
                            }
                        },
                        "type": {
                            "type": "select",
                            "helper": `Specify the event type for this schedule if different from the event default of <strong>${event.type}</strong>`
                        },
                        "name": {
                            "helper": `Specify an event name that should be used for this schedule if different from the event default of <strong>${event.name}</strong>. This field is ignored for bookings and office-hours.`,
                            "validator": function (callback) {
                                var value = this.getValue();
                                value = value.split(" vs.")[ 0 ];
                                var type = this.getParent().childrenByPropertyId[ "type" ].getValue();
                                if ((((!type || type === '') && event.type === 'sports') || type === 'sports') && sportsEvents.indexOf(event.name) === -1 && sportsEvents.indexOf(value) === -1) {
                                    callback({
                                        "status": false,
                                        "message": `For sports, name must begin with a valid sport and optionally proceed with " vs. name of opponent team". Valid sports: ${sportsEvents.join(", ")}`
                                    });
                                    return;
                                } else if (value && value !== '' && calendarEvents.indexOf(value) !== -1 && (!event || !event.name || event.name !== value)) {
                                    callback({
                                        "status": false,
                                        "message": "Value in this field matches the name of another event. This is not allowed."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        },
                        "description": {
                            "type": "textarea",
                            "helper": `Specify a description that should be used for this schedule if different from the event default: ${event.description ? event.description : `--NONE--`}`
                        },
                        "priority": {
                            "type": "integer",
                            "helper": `Specify a priority for this schedule if different from the event default of <strong>${event.priority}</strong>. Please see <button class="btn btn-sm btn-outline-info" data-izimodal-open="#modal-${this.priorityInfoModal.id}">This Modal</button> for information on how priorities work regarding schedule conflicts.`,
                        },
                        "hostDJ": {
                            "type": "select",
                            "optionLabels": _djs.map((dj) => dj.name),
                            "helper": `Specify the host DJ running this show for this schedule if different from the event default of <strong>${event.hostDJ ? _djs.find((dj) => dj.ID === event.hostDJ).name : `--NONE--`}</strong>`,
                            "validator": function (callback) {
                                var value = this.getValue();
                                var type = this.getParent().childrenByPropertyId[ "type" ].getValue();
                                if (((type && type !== '' && [ 'show', 'remote', 'prerecord' ].indexOf(type) !== -1) || ([ 'show', 'remote', 'prerecord' ].indexOf(event.type) !== -1)) && (!value || value === '') && !event.hostDJ) {
                                    callback({
                                        "status": false,
                                        "message": "Field is required for show, remote, and prerecord events."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        },
                        "cohostDJ1": {
                            "type": "select",
                            "optionLabels": _djs.map((dj) => dj.name),
                            "helper": `Specify a co-host DJ for this schedule if different from the event default of <strong>${event.cohostDJ1 ? _djs.find((dj) => dj.ID === event.cohostDJ1).name : `--NONE--`}</strong>`
                        },
                        "cohostDJ2": {
                            "type": "select",
                            "optionLabels": _djs.map((dj) => dj.name),
                            "helper": `Specify a second co-host DJ if different from the event default of <strong>${event.cohostDJ2 ? _djs.find((dj) => dj.ID === event.cohostDJ2).name : `--NONE--`}</strong>`
                        },
                        "cohostDJ3": {
                            "type": "select",
                            "optionLabels": _djs.map((dj) => dj.name),
                            "helper": `Specify a third co-host DJ if different from the event default of <strong>${event.cohostDJ3 ? _djs.find((dj) => dj.ID === event.cohostDJ3).name : `--NONE--`}</strong>`
                        },
                        "playlistID": {
                            "type": "select",
                            "optionLabels": playlists.map((playlist) => playlist.name),
                            "helper": `Set the RadioDJ playlist (prerecord and playlist events) for this schedule if different from the event default of <strong>${event.playlistID ? playlists.find((playlist) => playlist.ID === event.playlistID).name : `--NONE--`}</strong>`,
                            "validator": function (callback) {
                                var value = this.getValue();
                                var type = this.getParent().childrenByPropertyId[ "type" ].getValue();
                                if (((type && type !== '' && [ 'prerecord', 'playlist' ].indexOf(type) !== -1) || ([ 'prerecord', 'playlist' ].indexOf(event.type) !== -1)) && (!value || value === '') && !event.playlistID) {
                                    callback({
                                        "status": false,
                                        "message": "Field is required for prerecord and playlist events."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        },
                        "eventID": {
                            "type": "select",
                            "optionLabels": events.map((eventb) => eventb.name),
                            "helper": `Set the rotation-triggering RadioDJ event (genre events) if different from the event default of <strong>${event.eventID ? events.find((eventb) => eventb.ID === event.eventID).name : `--NONE--`}</strong>`,
                            "validator": function (callback) {
                                var value = this.getValue();
                                var type = this.getParent().childrenByPropertyId[ "type" ].getValue();
                                if (((type && type !== '' && [ 'genre' ].indexOf(type) !== -1) || ([ 'genre' ].indexOf(event.type) !== -1)) && (!value || value === '') && !event.eventID) {
                                    callback({
                                        "status": false,
                                        "message": "Field is required for genre events."
                                    });
                                    return;
                                }
                                callback({
                                    "status": true
                                });
                            }
                        }
                    },

                    "form": {
                        "buttons": {
                            "submit": {
                                "title": `${schedule ? `Edit` : `Add`} Schedule`,
                                "click": (form, e) => {
                                    form.refreshValidationState(true);
                                    if (!form.isValid(true)) {
                                        form.focus();
                                        return;
                                    }
                                    var value = form.getValue();

                                    value.recurDM = value.recurDM.map((val) => val.value);
                                    value.recurWM = value.recurWM.map((val) => val.value);
                                    value.recurDW = value.recurDW.map((val) => val.value);
                                    value.recurH = value.recurH.map((val) => val.value);
                                    console.dir(value);
                                    var _event = this.verify(value);
                                    if (!_event.event) {
                                        $(document).Toasts('create', {
                                            class: 'bg-warning',
                                            title: 'Event verification failed',
                                            autohide: true,
                                            delay: 20000,
                                            body: _event,
                                        })
                                        form.focus();
                                        return;
                                    }

                                    if (!schedule) {
                                        this.addSchedule(this.scheduleModal, directors, value, (success) => {
                                            if (success) {
                                                this.scheduleModal.iziModal('close');
                                                this.occurrenceModal.iziModal('close');
                                                this.schedulesModal.body = `<div class="alert alert-warning">
                                            Schedule changes take several seconds to reflect in the system. Please close and re-open this window.
                                            </div>`;
                                            }
                                        });
                                    } else {
                                        this.editSchedule(this.scheduleModal, directors, value, (success) => {
                                            if (success) {
                                                this.scheduleModal.iziModal('close');
                                                this.occurrenceModal.iziModal('close');
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

                "data": schedule ? schedule : { calendarID: calendarID },
            });

            this.scheduleModal.iziModal('open');
        });
    }

    /**
     * Do conflict checking on an event and show a modal if conflicts are detected.
     * 
     * @param {WWSUmodal} modal Modal to block while checking for conflicts
     * @param {object} event The CalendarDb event being added, edited, or deleted
     * @param {string} action What we are doing with event: insert, update, or remote
     * @param {function} cb Callback fired when there are no conflicts detected or the user agreed to proceed with the conflict resolution steps.
     */
    doConflictCheck (modal, event, action, cb) {
        $(`#modal-${modal.id}`).block({
            message: `<h1>Checking conflicts...</h1><p class="conflict-check-progress"></p>`,
            css: { border: '3px solid #a00' },
            onBlock: () => {
                event = this.verify(event);
                if (!event.event) {
                    $(`#modal-${modal.id}`).unblock();
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Error resolving schedule conflicts',
                        body: `Event is invalid: ${event}`,
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                    return;
                }
                var query = {};
                query[ action ] = action === 'remove' || action === 'removeCalendar' ? event.event.ID : event.event;
                this.checkConflicts((conflicts) => {
                    console.dir(conflicts);
                    $(`#modal-${modal.id}`).unblock();

                    // If no conflicts detected, then fire callback immediately

                    if (conflicts.additions.length === 0 && conflicts.removals.length === 0 && conflicts.errors.length === 0) {
                        cb();
                        return;
                    }

                    var actions = [];

                    conflicts.errors.map((error) => {
                        actions.push(`<li><strong>ERROR: </strong>${error}</li>`)
                    });

                    conflicts.additions.map((conflict) => {
                        if (conflict.scheduleType === 'canceled-system') {
                            actions.push(`<li>${conflict.type}: ${conflict.hosts} - ${conflict.name} on ${moment(conflict.originalTime).format("LLLL")} will be CANCELED.</li>`);
                        }
                        if (conflict.scheduleType === 'updated-system' && !conflict.newTime) {
                            actions.push(`<li>${conflict.type}: ${conflict.hosts} - ${conflict.name} on ${moment(conflict.originalTime).format("LLLL")} will be CHANGED; it will end at ${moment(conflict.originalTime).add(conflict.duration, 'minutes').format("LLLL")}.</li>`);
                        }
                        if (conflict.scheduleType === 'updated-system' && conflict.newTime) {
                            actions.push(`<li>${conflict.type}: ${conflict.hosts} - ${conflict.name} on ${moment(conflict.originalTime).format("LLLL")} will be CHANGED; it will air on ${moment(conflict.newTime).format("LLLL")} - ${moment(conflict.newTime).add(conflict.duration, 'minutes').format("LLLL")}.</li>`);
                        }
                    });

                    conflicts.removals.map((conflict) => {
                        if (conflict.scheduleType === 'canceled-system') {
                            actions.push(`<li>${conflict.type}: ${conflict.hosts} - ${conflict.name}, which was canceled on ${moment(conflict.originalTime).format("LLLL")}, will be put back on the schedule.</li>`);
                        }
                        if (conflict.scheduleType === 'updated-system' && !conflict.newTime) {
                            actions.push(`<li>${conflict.type}: ${conflict.hosts} - ${conflict.name}, whose end time was changed to ${moment(conflict.originalTime).add(conflict.duration, 'minutes').format("LLLL")}, will end at its originally scheduled end time.</li>`);
                        }
                        if (conflict.scheduleType === 'updated-system' && conflict.newTime) {
                            actions.push(`<li>${conflict.type}: ${conflict.hosts} - ${conflict.name}, whose start date/time was rescheduled to ${moment(conflict.newTime).format("LLLL")}, will now start at its originally scheduled date/time.</li>`);
                        }
                    });

                    this.conflictModal.body = `<p>The following changes will be made to resolve event conflicts if you continue:</p>
                    <div id="modal-${this.conflictModal.id}-conflicts"></div>`;
                    $(`#modal-${this.conflictModal.id}-conflicts`).html(`<ul>${actions.join("")}</ul>`);
                    this.conflictModal.footer = `<button type="button" data-izimodal-close="" class="btn btn-success" id="modal-${this.conflictModal.id}-continue">Continue</button>
        <button type="button" data-izimodal-close="" class="btn btn-danger">Cancel</button>`;

                    this.conflictModal.iziModal('open');

                    $(`#modal-${this.conflictModal.id}-continue`).unbind('click');
                    $(`#modal-${this.conflictModal.id}-continue`).click((e) => {
                        cb();
                    });
                }, [ query ], (string) => {
                    $('.conflict-check-progress').html(string);
                });
            }
        });
    }
}