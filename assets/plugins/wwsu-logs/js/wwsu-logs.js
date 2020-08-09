/* global TAFFY */

// This class manages logs, analytics, and attendance

// NOTE: unlike most other WWSU models, this does not use traditional WWSUdb extends. Otherwise, memory can be quickly eaten up by logs.
class WWSUlogs extends WWSUevents {

    /**
     * Construct the class.
     * 
     * @param {sails.io} socket WWSU socket connection
     * @param {WWSUreq} noReq Request without authorization
     * @param {WWSUreq} hostReq Request with host authorization
     * @param {WWSUreq} directorReq Request with director authorization
     * @param {WWSUmeta} meta WWSUmeta class
     */
    constructor(socket, noReq, hostReq, directorReq, meta) {
        super();
        this.endpoints = {
            edit: '/logs/edit',
            get: '/logs/get',
            getAttendance: '/attendance/get',
            getListeners: '/analytics/listeners',
            getShowtime: '/analytics/showtime'
        };
        this.requests = {
            no: noReq,
            host: hostReq,
            director: directorReq
        }
        this.tables = {
            issues: undefined,
            attendance: undefined,
            log: undefined
        }
        this.models = {
            viewLog: new WWSUmodal(`Logs`, null, ``, true, {
                headerColor: '',
                zindex: 1200,
                width: 800
            })
        }

        this.meta = meta;

        this.animations = new WWSUanimations();

        this.attendanceID = 0;

        // WWSUdbs
        this.issues = new WWSUdb(TAFFY());
        this.issues.on('replace', "WWSUlogs", (data) => {
            this.emitEvent('issues-replace', [ data ]);
            this.updateIssuesTable();
        })

        this.dashboardLogs;
        this.dashboard = new WWSUdb(TAFFY());
        this.dashboard.on('replace', "WWSUlogs", (data) => {
            this.updateDashboardLogs();
        })

        socket.on('logs', (data) => {
            for (var key in data) {
                if (key === 'remove') {
                    this.emitEvent(`issues-remove`, [ data[ key ] ]);
                    this.issues.query({ remove: data[ key ].ID }, false);
                    this.updateIssuesTable();
                    continue;
                }
                if (data[ key ].attendanceID && data[ key ].attendanceID === this.attendanceID) {
                    this.dashboard.query(data, false);
                    this.updateDashboardLogs();
                }
                if ([
                    'cancellation',
                    'updated',
                    'director-cancellation',
                    'director-updated',
                    'silence',
                    'silence-track',
                    'silence-switch',
                    'silence-terminated',
                    'absent',
                    'director-absent',
                    'unauthorized',
                    'prerecord-terminated',
                    'system-queuefail',
                    'system-frozen',
                    'system-changingstate',
                    'reboot',
                    'id',
                    'status-danger',
                    'status-reported',
                    'sign-on-early',
                    'sign-on-late',
                    'sign-off-early',
                    'sign-off-late',
                    'sign-off-problem'
                ].indexOf(data[ key ].logtype) !== -1) {
                    if (!data[ key ].acknowledged) {
                        if (this.issues.find({ ID: data[ key ].ID }).length > 0) {
                            this.issues.query(data, false);
                            this.emitEvent(`issues-${key}`, [ data[ key ] ]);
                        } else {
                            this.issues.query({ insert: data[ key ] }, false);
                            this.emitEvent(`issues-insert`, [ data[ key ] ]);
                        }
                    } else {
                        this.emitEvent(`issues-remove`, [ data[ key ].ID ]);
                        this.issues.query({ remove: data[ key ].ID }, false);
                    }
                    this.updateIssuesTable();
                }
            }
        })
    }

    // Initialize issues logs by fetching issues and subscribing to sockets
    initIssues () {
        this.issues.replaceData(this.requests.host, this.endpoints.get, { subtype: 'ISSUES' });
    }

    /**
     * Initialize timeline-style dashboard logs
     * 
     * @param {string} dom DOM query string of the timeline div.
     */
    initDashboardLogs (dom) {
        this.dashboardLogs = dom;
    }

    /**
     * Sets the current attendance ID for use with dashboard logs.
     * 
     * @param {number} id Attendance ID.
     */
    setAttendanceID (id) {
        this.attendanceID = id;
        this.getLogs({ attendanceID: id }, (records) => {
            this.dashboard.query(records, true);
        })
    }

    /**
     * Get attendance records from the WWSU API.
     * 
     * @param {object} data Data to pass to WWSU 
     * @param {function} cb Callback function with results as parameter. Does not fire if API fails.
     */
    getAttendance (dom, data, cb) {
        try {
            this.requests.host.request({ dom: dom, method: 'post', url: this.endpoints.getAttendance, data }, (response) => {
                if (!response) {
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Error getting attendance records',
                        body: 'There was an error getting attendance records. Please report this to the engineer.',
                        autoHide: true,
                        delay: 10000,
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                } else {
                    if (typeof cb === 'function') {
                        cb(response);
                    }
                }
            })
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error getting attendance records',
                body: 'There was an error getting attendance records. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            console.error(e);
        }
    }

    /**
     * Get listener information from WWSU.
     * 
     * @param {string} dom The DOM query string to block while loading
     * @param {object} data Data to pass to WWSU 
     * @param {function} cb Callback function with results as parameter. Does not fire if API fails.
     */
    getListeners (dom, data, cb) {
        try {
            this.requests.host.request({ dom: dom, method: 'post', url: this.endpoints.getListeners, data }, (response) => {
                if (!response || typeof response.map !== 'function') {
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Error getting listener analytics',
                        body: 'There was an error getting listener analytics. Please report this to the engineer.',
                        autoHide: true,
                        delay: 10000,
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                } else {
                    if (typeof cb === 'function') {
                        cb(response);
                    }
                }
            })
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error getting listener analytics',
                body: 'There was an error getting listener analytics. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            console.error(e);
        }
    }

    /**
     * Get logs from WWSU.
     * 
     * @param {object} data Data to pass to WWSU 
     * @param {function} cb Callback function with results as parameter. Does not fire if API fails.
     */
    getLogs (data, cb) {
        try {
            this.requests.host.request({ method: 'post', url: this.endpoints.get, data }, (response) => {
                if (!response || typeof response.map !== 'function') {
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Error getting logs',
                        body: 'There was an error getting logs. Please report this to the engineer.',
                        autoHide: true,
                        delay: 10000,
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                } else {
                    if (typeof cb === 'function') {
                        cb(response);
                    }
                }
            })
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error getting logs',
                body: 'There was an error getting logs. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            console.error(e);
        }
    }

    /**
     * Edit the log via WWSU API.
     * 
     * @param {object} data Data to pass to WWSU 
     * @param {?function} cb Callback function with true for success, false for failure
     */
    edit (data, cb) {
        try {
            this.requests.director.request({ method: 'post', url: this.endpoints.edit, data }, (response) => {
                if (response !== 'OK') {
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Error editing log',
                        body: 'There was an error editing the log. Please report this to the engineer.',
                        autoHide: true,
                        delay: 10000,
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                    if (typeof cb === 'function') {
                        cb(false);
                    }
                } else {
                    $(document).Toasts('create', {
                        class: 'bg-success',
                        title: 'log edited',
                        autohide: true,
                        delay: 10000,
                        body: `The log was edited.`,
                    })
                    if (typeof cb === 'function') {
                        cb(true);
                    }
                }
            })
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error editing log',
                body: 'There was an error editing the log. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            if (typeof cb === 'function') {
                cb(false);
            }
            console.error(e);
        }
    }

    /**
     * Initialize the table which will be used for browsing and managing issues / accountability.
     * 
     * @param {string} table DOM query string of the div container that should contain the table.
     */
    initIssuesTable (table) {
        this.animations.add('logs-init-issues-table', () => {
            var util = new WWSUutil();

            // Init html
            $(table).html(`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${this.meta ? this.meta.meta.timezone : moment.tz.guess()}.</p><table id="section-notifications-issues-table" class="table table-striped display responsive" style="width: 100%;"></table>`);

            util.waitForElement(`#section-notifications-issues-table`, () => {
                // Generate table
                this.tables.issues = $(`#section-notifications-issues-table`).DataTable({
                    paging: true,
                    data: [],
                    columns: [
                        { title: "ID" },
                        { title: "Icon" },
                        { title: "Date/Time" },
                        { title: "Event" },
                        { title: "Actions" },
                    ],
                    columnDefs: [
                        { responsivePriority: 1, targets: 4 },
                    ],
                    "order": [ [ 0, "asc" ] ],
                    pageLength: 25,
                    drawCallback: () => {
                        // Action button click events
                        $('.btn-issue-unexcused').unbind('click');
                        $('.btn-issue-excused').unbind('click');
                        $('.btn-issue-dismiss').unbind('click');

                        $('.btn-issue-unexcused').click((e) => {
                            var id = parseInt($(e.currentTarget).data('id'));
                            util.confirmDialog(`Are you sure you want to mark issue ${id} as <strong>unexcused</strong>?
                <ul>
                <li>Once you proceed, the issue will be marked unexcused and dismissed from the to-do window. You will need to access the specific log for this issue if you later decide to change it to excused.</li>
                <li>Unexcused means this record <strong>will</strong> count against DJ/show reputation and show up in analytics.</li>
                </ul>
                `, null, () => {
                                this.edit({ ID: id, acknowledged: true, excused: false });
                            });
                        })

                        $('.btn-issue-excused').click((e) => {
                            var id = parseInt($(e.currentTarget).data('id'));
                            util.confirmDialog(`Are you sure you want to mark issue ${id} as <strong>excused</strong>?
                <ul>
                <li>Once you proceed, the issue will be marked excused and dismissed from the to-do window. You will need to access the specific log for this issue if you later decide to change it to unexcused.</li>
                <li>Excused means this record <strong>will NOT</strong> count against DJ/show reputation nor analytics; excusing this means we pretend it never happened.</li>
                <li><strong>Please do not excuse issues unless the issue was caused by WWSU and not the broadcast host(s).</strong> Otherwise, issues should be marked unexcused.</li>
                </ul>
                `, null, () => {
                                this.edit({ ID: id, acknowledged: true, excused: true });
                            });
                        })

                        $('.btn-issue-dismiss').click((e) => {
                            var id = parseInt($(e.currentTarget).data('id'));
                            console.log(`dismiss`);
                            util.confirmDialog(`Are you sure you want to dismiss ${id}? <strong>This cannot be undone!</strong> Once you proceed, the issue will be dismissed from the todo window (but you can still find it in the logs). <strong>Please do not dismiss issues until they are resolved / no longer relevant.</strong>`, null, () => {
                                this.edit({ ID: id, acknowledged: true });
                            });
                        })
                    }
                });

                // Update with information
                this.updateIssuesTable();
            });
        });
    }

    /**
     * Check if a log is an accountable one and can be marked excused/unexcused.
     * 
     * @param {object} log The log record as received from WWSU.
     * @returns {boolean} True if the log can be marked excused/unexcused, false otherwise.
     */
    isAccountable (log) {
        return [
            'cancellation',
            'updated',
            'director-cancellation',
            'director-updated',
            'silence',
            'absent',
            'director-absent',
            'unauthorized',
            'id',
            'sign-on-early',
            'sign-on-late',
            'sign-off-early',
            'sign-off-late'
        ].indexOf(log.logtype) !== -1;
    }

    /**
     * Update the issues table if it exists. Also emits count event for notifications
     */
    updateIssuesTable () {
        this.animations.add('logs-update-issues-table', () => {
            var util = new WWSUutil();

            if (this.tables.issues) {
                this.tables.issues.clear();
                this.issues.find().forEach((log) => {
                    this.tables.issues.row.add([
                        log.ID,
                        `<i class="${log.logIcon !== '' ? log.logIcon : `fas fa-dot-circle`} bg-${log.loglevel}" style="border-radius: 50%; font-size: 15px; height: 30px; line-height: 30px; text-align: center; width: 30px;"></i>`,
                        moment.tz(log.createdAt, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format("llll"),
                        `<strong>${log.title}</strong><br />${log.event}${log.trackArtist || log.trackTitle || log.trackAlbum || log.trackRecordLabel ? `${log.trackArtist || log.trackTitle ? `<br />Track: ${log.trackArtist ? log.trackArtist : `Unknown Artist`} - ${log.trackTitle ? log.trackTitle : `Unknown Title`}` : ``}${log.trackAlbum ? `<br />Album: ${log.trackAlbum}` : ``}${log.trackLabel ? `<br />Label: ${log.trackLabel}` : ``}` : ``}`,
                        `${this.isAccountable(log) && log.attendanceID && !log.excused ? `<div class="btn-group"><button class="btn btn-sm btn-danger btn-issue-unexcused" data-id="${log.ID}" title="Mark Unexcused (counts in analytics)"><i class="fas fa-thumbs-down"></i></button><button class="btn btn-sm btn-success btn-issue-excused" data-id="${log.ID}" title="Mark Excused (does not count in analytics)"><i class="fas fa-thumbs-up"></i></button></div>` : `<button class="btn btn-sm btn-warning btn-issue-dismiss" data-id="${log.ID}" title="Acknowledge / Dismiss"><i class="fas fa-check-circle"></i></button>`}`
                    ])
                });
                this.tables.issues.draw();

                // Notification counters
                var danger = this.issues.find({ loglevel: 'danger' }).length;
                var orange = this.issues.find({ loglevel: 'orange' }).length;
                var warning = this.issues.find({ loglevel: 'warning' }).length;
                var info = this.issues.find({ loglevel: 'info' }).length;
                this.emitEvent(`count`, [ danger, orange, warning, info ]);
            }
        });
    }

    /**
     * Initialize the attendance data table.
     * 
     * @param {string} dom DOM query string where the table should be created in (div).
     */
    initAttendanceTable (dom) {
        this.animations.add('logs-init-attendance-table', () => {
            var util = new WWSUutil();

            // Init html
            $(dom).html(`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${this.meta ? this.meta.meta.timezone : moment.tz.guess()}.</p><table id="section-logs-table" class="table table-striped display responsive" style="width: 100%;"></table>`);

            util.waitForElement(`#section-logs-table`, () => {
                // Generate table
                this.tables.attendance = $(`#section-logs-table`).DataTable({
                    paging: true,
                    data: [],
                    columns: [
                        { title: "ID" },
                        { title: "Level" },
                        { title: "Event" },
                        { title: "Start" },
                        { title: "End" },
                        { title: "Actions" },
                    ],
                    columnDefs: [
                        { responsivePriority: 1, targets: 5 },
                    ],
                    pageLength: 25,
                    drawCallback: () => {
                        // Add log buttons click event
                        $('.btn-logs-view').unbind('click');
                        $('.btn-logs-view').click((e) => {
                            var id = parseInt($(e.currentTarget).data('id'));
                            this.viewLog(id);
                        })
                    }
                });
            });
        });
    }

    /**
     * Populate attendance table with attendance records from the provided date.
     * 
     * @param {string} date moment() date of the logs to get. 
     */
    showAttendance (date) {
        this.getAttendance(`#section-logs-table`, { date, duration: 1 }, (records) => {
            this.tables.attendance.clear();
            records.map((record) => {
                var theClass = 'secondary'
                if (record.event.toLowerCase().startsWith('show: ') || record.event.toLowerCase().startsWith('prerecord: ')) {
                    theClass = 'danger'
                } else if (record.event.toLowerCase().startsWith('sports: ')) {
                    theClass = 'success'
                } else if (record.event.toLowerCase().startsWith('remote: ')) {
                    theClass = 'purple'
                } else if (record.event.toLowerCase().startsWith('genre: ') || record.event.toLowerCase().startsWith('playlist: ')) {
                    theClass = 'primary'
                }
                if (record.actualStart !== null && record.actualEnd !== null && record.happened === 1) {
                    this.tables.attendance.rows.add([ [
                        record.ID,
                        `<span class="text-${theClass}"><i class="fas fa-dot-circle"></i></span>`,
                        record.event,
                        moment.tz(record.actualStart, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('h:mm A'),
                        moment.tz(record.actualEnd, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('h:mm A'),
                        `<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`
                    ] ])
                } else if (record.actualStart !== null && record.actualEnd === null && record.happened === 1) {
                    this.tables.attendance.rows.add([ [
                        record.ID,
                        `<span class="text-${theClass}"><i class="fas fa-dot-circle"></i></span>`,
                        record.event,
                        moment.tz(record.actualStart, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('h:mm A'),
                        `ONGOING`,
                        `<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`
                    ] ])
                } else if (record.actualStart === null && record.actualEnd === null && record.happened === -1) {
                    this.tables.attendance.rows.add([ [
                        record.ID,
                        `<span class="text-${theClass}"><i class="fas fa-dot-circle"></i></span>`,
                        record.event,
                        `CANCELED (${moment.tz(record.scheduledStart, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('h:mm A')})`,
                        `CANCELED (${moment.tz(record.scheduledEnd, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('h:mm A')})`,
                        `<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`
                    ] ])
                } else if (record.happened === 0) {
                    this.tables.attendance.rows.add([ [
                        record.ID,
                        `<span class="text-${theClass}"><i class="fas fa-dot-circle"></i></span>`,
                        record.event,
                        `ABSENT (${moment.tz(record.scheduledStart, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('h:mm A')})`,
                        `ABSENT (${moment.tz(record.scheduledEnd, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('h:mm A')})`,
                        `<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`
                    ] ])
                } else if (record.actualStart !== null && record.actualEnd !== null) {
                    this.tables.attendance.rows.add([ [
                        record.ID,
                        `<span class="text-${theClass}"><i class="fas fa-dot-circle"></i></span>`,
                        record.event,
                        moment.tz(record.actualStart, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('h:mm A'),
                        record.actualEnd !== null ? moment.tz(record.actualEnd, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('h:mm A') : `ONGOING`,
                        `<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`
                    ] ])
                } else {
                    this.tables.attendance.rows.add([ [
                        record.ID,
                        `<span class="text-${theClass}"><i class="fas fa-dot-circle"></i></span>`,
                        record.event,
                        `SCHEDULED (${moment.tz(record.scheduledStart, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('h:mm A')})`,
                        `SCHEDULED (${moment.tz(record.scheduledEnd, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('h:mm A')})`,
                        `<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`
                    ] ])
                }
            });

            this.tables.attendance.draw();
        });
    }

    /**
     * View a log in a modal window.
     * 
     * @param {number} id The ID of the attendance log to view
     * @param {string} name Name of the event/log (to appear on modal title)
     */
    viewLog (id, name) {
        var util = new WWSUutil();
        this.models.viewLog.body = `<p class="wwsumeta-timezone-display">Times are shown in the timezone ${this.meta ? this.meta.meta.timezone : moment.tz.guess()}.</p><canvas id="modal-${this.models.viewLog.id}-body-listeners" style="min-height: 200px; height: 200px; max-height: 350px; max-width: 100%;"></canvas><div id="modal-${this.models.viewLog.id}-body-info"></div><table id="modal-${this.models.viewLog.id}-body-log" class="table table-striped display responsive" style="width: 100%;"></table>`
        this.models.viewLog.iziModal('open');
        this.getAttendance(`#section-logs-table`, { ID: id }, (attendance) => {
            util.waitForElement(`#modal-${this.models.viewLog.id}-body-listeners`, () => {
                this.getListeners(`#modal-${this.models.viewLog.id}-body-listeners`, { start: moment(attendance.actualStart).toISOString(true), end: moment(attendance.actualEnd ? attendance.actualEnd : moment(attendance.actualStart).add(1, 'days')).toISOString(true) }, (listeners) => {
                    var data = [];
                    data = listeners.map((listener) => {
                        return { x: moment.tz(listener.createdAt, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format(), y: listener.listeners }
                    });

                    var listenerChartCanvas = $(`#modal-${this.models.viewLog.id}-body-listeners`).get(0).getContext('2d');
                    var listenerChart = new Chart(listenerChartCanvas, {
                        type: 'line',
                        data: {
                            datasets: [ {
                                label: 'Online Listeners',
                                data: data,
                                steppedLine: true,
                                fill: false,
                                borderColor: `#17a2b8`
                            } ]
                        },
                        options: {
                            responsive: true,
                            title: {
                                display: true,
                                text: 'Online Listeners'
                            },
                            scales: {
                                xAxes: [ {
                                    type: 'time',
                                    display: true,
                                    scaleLabel: {
                                        display: true,
                                        labelString: 'Date'
                                    },
                                    ticks: {
                                        major: {
                                            fontStyle: 'bold',
                                            fontColor: '#FF0000'
                                        },
                                        min: moment.tz(attendance.actualStart, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format(),
                                        max: moment.tz(attendance.actualEnd, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format()
                                    },
                                } ],
                                yAxes: [ {
                                    display: true,
                                    scaleLabel: {
                                        display: true,
                                        labelString: 'value'
                                    },
                                    ticks: {
                                        min: 0
                                    }
                                } ]
                            }
                        }
                    })
                });
            });

            util.waitForElement(`#modal-${this.models.viewLog.id}-body-info`, () => {
            });

            util.waitForElement(`#modal-${this.models.viewLog.id}-body-log`, () => {
                var generateLog = (updateOnly) => {
                    this.getLogs({ attendanceID: id }, (logs) => {
                        if (!updateOnly) {
                            this.tables.log = $(`#modal-${this.models.viewLog.id}-body-log`).DataTable({
                                paging: false,
                                data: logs.map((log) => {
                                    return [
                                        log.ID,
                                        moment.tz(log.createdAt, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format("llll"),
                                        `<i class="${log.logIcon !== '' ? log.logIcon : `fas fa-dot-circle`} bg-${log.loglevel}" style="border-radius: 50%; font-size: 15px; height: 30px; line-height: 30px; text-align: center; width: 30px;"></i>`,
                                        `<strong>${log.title}</strong><br />${log.event}${log.trackArtist || log.trackTitle || log.trackAlbum || log.trackRecordLabel ? `${log.trackArtist || log.trackTitle ? `<br />Track: ${log.trackArtist ? log.trackArtist : `Unknown Artist`} - ${log.trackTitle ? log.trackTitle : `Unknown Title`}` : ``}${log.trackAlbum ? `<br />Album: ${log.trackAlbum}` : ``}${log.trackLabel ? `<br />Label: ${log.trackLabel}` : ``}` : ``}`,
                                        `${this.isAccountable(log) && log.attendanceID ? `<div class="btn-group"><button class="btn btn-sm btn-danger btn-log-unexcused" data-id="${log.ID}" title="Mark Unexcused (counts in analytics)"><i class="fas fa-thumbs-down"></i></button><button class="btn btn-sm btn-success btn-log-excused" data-id="${log.ID}" title="Mark Excused (does not count in analytics)"><i class="fas fa-thumbs-up"></i></button></div>${log.excused ? `<div class="text-success">EXCUSED</div>` : `<div class="text-danger">UN-EXCUSED</div>`}` : ``}`
                                    ];
                                }),
                                columns: [
                                    { title: "ID" },
                                    { title: "Time" },
                                    { title: "Icon" },
                                    { title: "Event" },
                                    { title: "Actions" },
                                ],
                                columnDefs: [
                                    { responsivePriority: 1, targets: 4 },
                                ],
                                pageLength: 25,
                                drawCallback: () => {
                                    // Action button click events
                                    $('.btn-log-unexcused').unbind('click');
                                    $('.btn-log-excused').unbind('click');

                                    $('.btn-log-unexcused').click((e) => {
                                        var id = parseInt($(e.currentTarget).data('id'));
                                        util.confirmDialog(`Are you sure you want to mark issue ${id} as <strong>unexcused</strong>?
                <ul>
                <li>Once you proceed, the issue will be marked unexcused and dismissed from the to-do window (if applicable). You will need to access the specific log for this issue if you later decide to change it to excused.</li>
                <li>Unexcused means this record <strong>will</strong> count against DJ/show reputation and show up in analytics.</li>
                </ul>
                `, null, () => {
                                            this.edit({ ID: id, acknowledged: true, excused: false }, (success) => {
                                                if (success) {
                                                    generateLog(true);
                                                }
                                            });
                                        });
                                    })

                                    $('.btn-log-excused').click((e) => {
                                        var id = parseInt($(e.currentTarget).data('id'));
                                        util.confirmDialog(`Are you sure you want to mark issue ${id} as <strong>excused</strong>?
                <ul>
                <li>Once you proceed, the issue will be marked excused and dismissed from the to-do window (if applicable). You will need to access the specific log for this issue if you later decide to change it to unexcused.</li>
                <li>Excused means this record <strong>will NOT</strong> count against DJ/show reputation nor analytics; excusing this means we pretend it never happened.</li>
                <li><strong>Please do not excuse issues unless the issue was caused by WWSU and not the broadcast host(s).</strong> Otherwise, issues should be marked unexcused.</li>
                </ul>
                `, null, () => {
                                            this.edit({ ID: id, acknowledged: true, excused: true }, (success) => {
                                                if (success) {
                                                    generateLog(true);
                                                }
                                            });
                                        });
                                    })
                                }
                            });
                        } else {
                            this.tables.log.clear();
                            this.tables.log.rows.add(logs.map((log) => {
                                return [
                                    log.ID,
                                    moment.tz(log.createdAt, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format("llll"),
                                    `<i class="${log.logIcon !== '' ? log.logIcon : `fas fa-dot-circle`} bg-${log.loglevel}" style="border-radius: 50%; font-size: 15px; height: 30px; line-height: 30px; text-align: center; width: 30px;"></i>`,
                                    `<strong>${log.title}</strong><br />${log.event}${log.trackArtist || log.trackTitle || log.trackAlbum || log.trackRecordLabel ? `${log.trackArtist || log.trackTitle ? `<br />Track: ${log.trackArtist ? log.trackArtist : `Unknown Artist`} - ${log.trackTitle ? log.trackTitle : `Unknown Title`}` : ``}${log.trackAlbum ? `<br />Album: ${log.trackAlbum}` : ``}${log.trackLabel ? `<br />Label: ${log.trackLabel}` : ``}` : ``}`,
                                    `${this.isAccountable(log) && log.attendanceID ? `<div class="btn-group"><button class="btn btn-sm btn-danger btn-log-unexcused" data-id="${log.ID}" title="Mark Unexcused (counts in analytics)"><i class="fas fa-thumbs-down"></i></button><button class="btn btn-sm btn-success btn-log-excused" data-id="${log.ID}" title="Mark Excused (does not count in analytics)"><i class="fas fa-thumbs-up"></i></button></div>${log.excused ? `<div class="text-success">EXCUSED</div>` : `<div class="text-danger">UN-EXCUSED</div>`}` : ``}`
                                ];
                            }));
                            this.tables.log.draw();
                        }
                    });
                }
                generateLog(false);
            });
        });
    }

    // Update the dashboard logs timeline
    updateDashboardLogs () {
        this.animations.add('logs-update-dashboard-logs', () => {
            if (this.dashboardLogs) {
                $(this.dashboardLogs).html('')
                this.dashboard.find()
                    .sort((a, b) => moment(a.createdAt).valueOf() - moment(b.createdAt).valueOf())
                    .map((log) => {
                        $(this.dashboardLogs).prepend(`<div>
                    <i class="${log.logIcon !== '' ? log.logIcon : `fas fa-dot-circle`} bg-${log.loglevel}"></i>
                    <div class="timeline-item">
                      <span class="time"><i class="fas fa-clock"></i> ${moment.tz(log.createdAt, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format("LT")}</span>
                      <h3 class="timeline-header">${log.title}</h3>
                      <div class="timeline-body">
                      ${log.event}${log.trackArtist || log.trackTitle || log.trackAlbum || log.trackRecordLabel ? `${log.trackArtist || log.trackTitle ? `<br />Track: ${log.trackArtist ? log.trackArtist : `Unknown Artist`} - ${log.trackTitle ? log.trackTitle : `Unknown Title`}` : ``}${log.trackAlbum ? `<br />Album: ${log.trackAlbum}` : ``}${log.trackLabel ? `<br />Label: ${log.trackLabel}` : ``}` : ``}
                      </div>
                    </div>
                  </div>`)
                    })
            }
        });
    }

    /**
     * Get show analytics
     * 
     * @param {Object} data The data to send in the request to the API
     * @param {function} cb Callback called after the request is complete. Parameter is returned data, or false if failed.
     */
    getShowtime (dom, data, cb) {
        try {
            this.requests.host.request({ dom: dom, method: 'post', url: this.endpoints.getShowtime, data: data }, (response) => {
                if (response[ 0 ] && response[ 1 ]) {
                    cb(response);
                } else {
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Error getting analytics',
                        body: 'There was an error getting analytics. Please report this to the engineer.',
                        autoHide: true,
                        delay: 10000,
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                    console.error(e);
                    cb(false);
                }
            });
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error getting analytics',
                body: 'There was an error getting analytics. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            console.error(e);
            cb(false);
        }
    }
}