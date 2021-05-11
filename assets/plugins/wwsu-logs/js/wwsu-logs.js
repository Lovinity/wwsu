"use strict";

/* global TAFFY */

// This class manages logs, analytics, and attendance
// NOTE: unlike most other WWSU models, this does not use traditional WWSUdb extends. Otherwise, memory can be quickly eaten up by logs.

// REQUIRES these WWSUmodules: noReq (WWSUreq), hostReq (WWSUreq), directorReq (WWSUreq) (only when editing logs), WWSUhosts, WWSUMeta, WWSUutil, WWSUanimations
class WWSUlogs extends WWSUevents {
	/**
	 * Construct the class.
	 *
	 * @param {WWSUmodules} manager The modules class which initiated this module
	 * @param {object} options Options to be passed to this module
	 */
	constructor(manager, options) {
		super();

		this.manager = manager;

		this.endpoints = {
			edit: "/logs/edit",
			get: "/logs/get",
			add: "/logs/add",
			getAttendance: "/attendance/get",
			getListeners: "/analytics/listeners",
			getShowtime: "/analytics/showtime"
		};

		this.tables = {
			issues: undefined,
			attendance: undefined,
			log: undefined
		};

		this.modals = {
			viewLog: new WWSUmodal(`Logs`, null, ``, true, {
				headerColor: "",
				zindex: 1200,
				width: 800
			}),

			addLog: new WWSUmodal(`Add a Log`, null, ``, true, {
				headerColor: "",
				zindex: 1100
			})
		};

		this.attendanceID = 0;

		// WWSUdbs
		this.issues = new WWSUdb(TAFFY());
		this.issues.on("replace", "WWSUlogs", data => {
			this.emitEvent("issues-replace", [data]);
			this.updateIssuesTable();
		});

		this.dashboardLogs;
		this.dashboard = new WWSUdb(TAFFY());
		this.dashboard.on("replace", "WWSUlogs", data => {
			this.updateDashboardLogs();
		});

		this.manager.socket.on("logs", data => {
			for (let key in data) {
				if (key === "remove") {
					this.emitEvent(`issues-remove`, [data[key]]);
					this.issues.query({ remove: data[key].ID }, false);
					this.updateIssuesTable();
					continue;
				}
				if (
					data[key].attendanceID &&
					data[key].attendanceID === this.attendanceID
				) {
					this.dashboard.query(data, false);
					this.updateDashboardLogs();
				}
				if (
					[
						"cancellation",
						"updated",
						"delay-dump",
						"delay-bypass",
						"director-cancellation",
						"director-updated",
						"silence",
						"silence-track",
						"silence-switch",
						"silence-terminated",
						"absent",
						"director-absent",
						"unauthorized",
						"prerecord-terminated",
						"system-queuefail",
						"system-frozen",
						"system-changingstate",
						"reboot",
						"id",
						"status-danger",
						"status-reported",
						"sign-on-early",
						"sign-on-late",
						"sign-off-early",
						"sign-off-late",
						"sign-off-problem",
						"recipient-discipline"
					].indexOf(data[key].logtype) !== -1
				) {
					if (!data[key].acknowledged) {
						if (this.issues.find({ ID: data[key].ID }).length > 0) {
							this.issues.query(data, false);
							this.emitEvent(`issues-${key}`, [data[key]]);
						} else {
							this.issues.query({ insert: data[key] }, false);
							this.emitEvent(`issues-insert`, [data[key]]);
						}
					} else {
						this.emitEvent(`issues-remove`, [data[key].ID]);
						this.issues.query({ remove: data[key].ID }, false);
					}
					this.updateIssuesTable();
				}
			}
		});
	}

	// Initialize issues logs by fetching issues and subscribing to sockets
	initIssues() {
		this.issues.replaceData(this.manager.get("hostReq"), this.endpoints.get, {
			subtype: "ISSUES"
		});
	}

	/**
	 * Initialize timeline-style dashboard logs
	 *
	 * @param {string} dom DOM query string of the timeline div.
	 */
	initDashboardLogs(dom) {
		this.dashboardLogs = dom;
	}

	/**
	 * Sets the current attendance ID for use with dashboard logs.
	 *
	 * @param {number} id Attendance ID.
	 */
	setAttendanceID(id) {
		this.attendanceID = id;
		this.getLogs({ attendanceID: id }, records => {
			this.dashboard.query(records, true);
		});
	}

	/**
	 * Get attendance records from the WWSU API.
	 *
	 * @param {object} data Data to pass to WWSU
	 * @param {function} cb Callback function with results as parameter. Does not fire if API fails.
	 */
	getAttendance(dom, data, cb) {
		try {
			this.manager
				.get("hostReq")
				.request(
					{ dom: dom, method: "post", url: this.endpoints.getAttendance, data },
					response => {
						if (!response) {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error getting attendance records",
								body:
									"There was an error getting attendance records. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg"
							});
						} else {
							if (typeof cb === "function") {
								cb(response);
							}
						}
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error getting attendance records",
				body:
					"There was an error getting attendance records. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
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
	getListeners(dom, data, cb) {
		try {
			this.manager
				.get("hostReq")
				.request(
					{ dom: dom, method: "post", url: this.endpoints.getListeners, data },
					response => {
						if (!response || typeof response.map !== "function") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error getting listener analytics",
								body:
									"There was an error getting listener analytics. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg"
							});
						} else {
							if (typeof cb === "function") {
								cb(response);
							}
						}
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error getting listener analytics",
				body:
					"There was an error getting listener analytics. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
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
	getLogs(data, cb) {
		try {
			this.manager
				.get("hostReq")
				.request(
					{ method: "post", url: this.endpoints.get, data },
					response => {
						if (!response || typeof response.map !== "function") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error getting logs",
								body:
									"There was an error getting logs. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg"
							});
						} else {
							if (typeof cb === "function") {
								cb(response);
							}
						}
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error getting logs",
				body:
					"There was an error getting logs. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
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
	edit(data, cb) {
		try {
			this.manager
				.get("directorReq")
				.request(
					{ method: "post", url: this.endpoints.edit, data },
					response => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error editing log",
								body:
									"There was an error editing the log. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg"
							});
							if (typeof cb === "function") {
								cb(false);
							}
						} else {
							$(document).Toasts("create", {
								class: "bg-success",
								title: "log edited",
								autohide: true,
								delay: 10000,
								body: `The log was edited.`
							});
							if (typeof cb === "function") {
								cb(true);
							}
						}
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error editing log",
				body:
					"There was an error editing the log. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
			});
			if (typeof cb === "function") {
				cb(false);
			}
			console.error(e);
		}
	}

	/**
	 * Add a log via WWSU API.
	 *
	 * @param {object} data Data to pass to WWSU
	 * @param {?function} cb Callback function with true for success, false for failure
	 */
	add(data, silent = false, cb) {
		try {
			this.manager
				.get("hostReq")
				.request(
					{ method: "post", url: this.endpoints.add, data },
					response => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error adding log",
								body:
									"There was an error adding the log. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg"
							});
							if (typeof cb === "function") {
								cb(false);
							}
						} else {
							if (!silent) {
								$(document).Toasts("create", {
									class: "bg-success",
									title: "log added",
									autohide: true,
									delay: 15000,
									body: `The log was added. 
								<p>If you added a log, <strong>Be sure to click "I am Talking"</strong> on the Dashboard when you are done playing music, or click "Add Log" again when playing a different track.</p>`
								});
							}
							if (typeof cb === "function") {
								cb(true);
							}
						}
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error adding log",
				body:
					"There was an error adding the log. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
			});
			if (typeof cb === "function") {
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
	initIssuesTable(table) {
		this.manager.get("WWSUanimations").add("logs-init-issues-table", () => {
			// Init html
			$(table).html(
				`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.timezone
						: moment.tz.guess()
				}.</p><table id="section-notifications-issues-table" class="table table-striped display responsive" style="width: 100%;"></table>`
			);

			this.manager
				.get("WWSUutil")
				.waitForElement(`#section-notifications-issues-table`, () => {
					// Generate table
					this.tables.issues = $(
						`#section-notifications-issues-table`
					).DataTable({
						paging: true,
						data: [],
						columns: [
							{ title: "ID" },
							{ title: "Type" },
							{ title: "Date/Time" },
							{ title: "Event" },
							{ title: "Actions" }
						],
						columnDefs: [{ responsivePriority: 1, targets: 4 }],
						order: [[0, "asc"]],
						pageLength: 50,
						buttons: ["copy", "csv", "excel", "pdf", "print", "colvis"],
						drawCallback: () => {
							// Action button click events
							$(".btn-issue-unexcused").unbind("click");
							$(".btn-issue-excused").unbind("click");
							$(".btn-issue-dismiss").unbind("click");

							$(".btn-issue-unexcused").click(e => {
								let id = parseInt($(e.currentTarget).data("id"));
								this.manager.get("WWSUutil").confirmDialog(
									`Are you sure you want to mark issue ${id} as <strong>unexcused</strong>?
                <ul>
                <li>Unexcused means this record <strong>will</strong> count against DJ/show reputation and show up in analytics.</li>
                <li>You should mark records as unexcused when the issue was caused by the DJ and not WWSU, and the issue (such as cancellations / absences) does not fall within an "optional" clause / timeframe.</li>
                <li>Once you proceed, the issue will be marked unexcused and dismissed from the to-do window on all DJ Controls. You will need to access the specific log for this issue if you later decide to change it to excused.</li>
                </ul>
                `,
									null,
									() => {
										this.edit({ ID: id, acknowledged: true, excused: false });
									}
								);
							});

							$(".btn-issue-excused").click(e => {
								let id = parseInt($(e.currentTarget).data("id"));
								this.manager.get("WWSUutil").confirmDialog(
									`Are you sure you want to mark issue ${id} as <strong>excused</strong>?
                <ul>
                <li>Excused means this record <strong>will NOT</strong> count against DJ/show reputation nor analytics; excusing this means we pretend it never happened.</li>
                <li>You should mark records as excused when the issue was caused by WWSU and not the DJ (such as a bug or a higher-priority broadcast conflict, such as sports), or the issue fell under an "optional" clause or timeframe.</li>
                <li>Once you proceed, the issue will be marked excused and dismissed from the to-do window on all DJ Controls. You will need to access the specific log for this issue if you later decide to change it to unexcused.</li>
                </ul>
                `,
									null,
									() => {
										this.edit({ ID: id, acknowledged: true, excused: true });
									}
								);
							});

							$(".btn-issue-dismiss").click(e => {
								let id = parseInt($(e.currentTarget).data("id"));
								console.log(`dismiss`);
								this.manager.get("WWSUutil").confirmDialog(
									`Are you sure you want to dismiss ${id}?
                  <ul>
                  <li>Please <strong>do not</strong> dismiss an issue until it is considered resolved.</li>
                  <li>When a record is dismissed, it is removed from the to-do window of all DJ Controls. It can still be accessed via the logs.</li>
                  </ul>`,
									null,
									() => {
										this.edit({ ID: id, acknowledged: true });
									}
								);
							});
						}
					});

					this.tables.issues
						.buttons()
						.container()
						.appendTo(
							$(`#section-notifications-issues-table_wrapper .col-md-6:eq(0)`)
						);

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
	isAccountable(log) {
		return (
			[
				"cancellation",
				"updated",
				"delay-dump",
				"delay-bypass",
				"director-cancellation",
				"director-updated",
				"silence",
				"absent",
				"director-absent",
				"unauthorized",
				"id",
				"sign-on-early",
				"sign-on-late",
				"sign-off-early",
				"sign-off-late"
			].indexOf(log.logtype) !== -1
		);
	}

	/**
	 * Update the issues table if it exists. Also emits count event for notifications
	 */
	updateIssuesTable() {
		this.manager.get("WWSUanimations").add("logs-update-issues-table", () => {
			if (this.tables.issues) {
				this.tables.issues.clear();
				this.issues.find().forEach(log => {
					this.tables.issues.row.add([
						log.ID,
						`<i class="${
							log.logIcon !== "" ? log.logIcon : `fas fa-dot-circle`
						} bg-${
							log.loglevel
						}" style="border-radius: 50%; font-size: 15px; height: 30px; line-height: 30px; text-align: center; width: 30px;"></i>`,
						moment
							.tz(
								log.createdAt,
								this.manager.get("WWSUMeta")
									? this.manager.get("WWSUMeta").meta.timezone
									: moment.tz.guess()
							)
							.format("llll"),
						`<strong>${log.title}</strong><br />${log.event}${
							log.trackArtist ||
							log.trackTitle ||
							log.trackAlbum ||
							log.trackRecordLabel
								? `${
										log.trackArtist || log.trackTitle
											? `<br />Track: ${
													log.trackArtist ? log.trackArtist : `Unknown Artist`
											  } - ${
													log.trackTitle ? log.trackTitle : `Unknown Title`
											  }`
											: ``
								  }${log.trackAlbum ? `<br />Album: ${log.trackAlbum}` : ``}${
										log.trackLabel ? `<br />Label: ${log.trackLabel}` : ``
								  }`
								: ``
						}`,
						`${
							this.isAccountable(log) && log.attendanceID && !log.excused
								? `<div class="btn-group"><button class="btn btn-sm btn-danger btn-issue-unexcused" data-id="${log.ID}" title="Mark Unexcused (counts in analytics)"><i class="fas fa-thumbs-down"></i></button><button class="btn btn-sm btn-success btn-issue-excused" data-id="${log.ID}" title="Mark Excused (does not count in analytics)"><i class="fas fa-thumbs-up"></i></button></div>`
								: `<button class="btn btn-sm btn-warning btn-issue-dismiss" data-id="${log.ID}" title="Acknowledge / Dismiss"><i class="fas fa-check-circle"></i></button>`
						}`
					]);
				});
				this.tables.issues.draw();

				// Notification counters
				let danger = this.issues.find({ loglevel: "danger" }).length;
				let orange = this.issues.find({ loglevel: "orange" }).length;
				let warning = this.issues.find({ loglevel: "warning" }).length;
				let info = this.issues.find({ loglevel: "info" }).length;
				this.emitEvent(`count`, [danger, orange, warning, info]);
			}
		});
	}

	/**
	 * Initialize the attendance data table.
	 *
	 * @param {string} dom DOM query string where the table should be created in (div).
	 */
	initAttendanceTable(dom) {
		this.manager.get("WWSUanimations").add("logs-init-attendance-table", () => {
			// Init html
			$(dom).html(
				`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.timezone
						: moment.tz.guess()
				}.</p><table id="section-logs-table" class="table table-striped display responsive" style="width: 100%;"></table>`
			);

			this.manager.get("WWSUutil").waitForElement(`#section-logs-table`, () => {
				// Generate table
				this.tables.attendance = $(`#section-logs-table`).DataTable({
					paging: true,
					data: [],
					columns: [
						{ title: "ID" },
						{ title: "Type" },
						{ title: "Event" },
						{ title: "Start" },
						{ title: "End" },
						{ title: "Actions" }
					],
					columnDefs: [{ responsivePriority: 1, targets: 5 }],
					pageLength: 50,
					buttons: ["copy", "csv", "excel", "pdf", "print", "colvis"],
					drawCallback: () => {
						// Add log buttons click event
						$(".btn-logs-view").unbind("click");
						$(".btn-logs-view").click(e => {
							let id = parseInt($(e.currentTarget).data("id"));
							this.viewLog(id);
						});
					}
				});

				this.tables.attendance
					.buttons()
					.container()
					.appendTo($(`#section-logs-table_wrapper .col-md-6:eq(0)`));
			});
		});
	}

	/**
	 * Populate attendance table with attendance records from the provided date.
	 *
	 * @param {string} date moment() date of the logs to get.
	 */
	showAttendance(date) {
		this.getAttendance(
			`#section-logs-table`,
			{ date, duration: 1 },
			records => {
				this.tables.attendance.clear();
				records.map(record => {
					let theClass = "secondary";
					let theType = `Unknown`;
					if (record.event.toLowerCase().startsWith("show: ")) {
						theClass = "danger";
						theType = "Show";
					} else if (record.event.toLowerCase().startsWith("prerecord: ")) {
						theClass = "pink";
						theType = "Prerecord";
					} else if (record.event.toLowerCase().startsWith("sports: ")) {
						theClass = "success";
						theType = "Sports";
					} else if (record.event.toLowerCase().startsWith("remote: ")) {
						theClass = "indigo";
						theType = "Remote";
					} else if (record.event.toLowerCase().startsWith("genre: ")) {
						theClass = "info";
						theType = "Genre";
					} else if (record.event.toLowerCase().startsWith("playlist: ")) {
						theClass = "primary";
						theType = "Playlist";
					}
					if (
						record.actualStart !== null &&
						record.actualEnd !== null &&
						record.happened === 1
					) {
						this.tables.attendance.rows.add([
							[
								record.ID,
								`<span class="badge bg-${theClass}">${theType}</span>`,
								record.event,
								moment
									.tz(
										record.actualStart,
										this.manager.get("WWSUMeta")
											? this.manager.get("WWSUMeta").meta.timezone
											: moment.tz.guess()
									)
									.format("h:mm A"),
								moment
									.tz(
										record.actualEnd,
										this.manager.get("WWSUMeta")
											? this.manager.get("WWSUMeta").meta.timezone
											: moment.tz.guess()
									)
									.format("h:mm A"),
								`<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`
							]
						]);
					} else if (
						record.actualStart !== null &&
						record.actualEnd === null &&
						record.happened === 1
					) {
						this.tables.attendance.rows.add([
							[
								record.ID,
								`<span class="badge bg-${theClass}">${theType}</span>`,
								record.event,
								moment
									.tz(
										record.actualStart,
										this.manager.get("WWSUMeta")
											? this.manager.get("WWSUMeta").meta.timezone
											: moment.tz.guess()
									)
									.format("h:mm A"),
								`ONGOING`,
								`<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`
							]
						]);
					} else if (
						record.actualStart === null &&
						record.actualEnd === null &&
						record.happened === -1
					) {
						this.tables.attendance.rows.add([
							[
								record.ID,
								`<span class="badge bg-${theClass}">${theType}</span>`,
								record.event,
								`CANCELED (${moment
									.tz(
										record.scheduledStart,
										this.manager.get("WWSUMeta")
											? this.manager.get("WWSUMeta").meta.timezone
											: moment.tz.guess()
									)
									.format("h:mm A")})`,
								`CANCELED (${moment
									.tz(
										record.scheduledEnd,
										this.manager.get("WWSUMeta")
											? this.manager.get("WWSUMeta").meta.timezone
											: moment.tz.guess()
									)
									.format("h:mm A")})`,
								`<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`
							]
						]);
					} else if (record.happened === 0) {
						this.tables.attendance.rows.add([
							[
								record.ID,
								`<span class="badge bg-${theClass}">${theType}</span>`,
								record.event,
								`ABSENT (${moment
									.tz(
										record.scheduledStart,
										this.manager.get("WWSUMeta")
											? this.manager.get("WWSUMeta").meta.timezone
											: moment.tz.guess()
									)
									.format("h:mm A")})`,
								`ABSENT (${moment
									.tz(
										record.scheduledEnd,
										this.manager.get("WWSUMeta")
											? this.manager.get("WWSUMeta").meta.timezone
											: moment.tz.guess()
									)
									.format("h:mm A")})`,
								`<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`
							]
						]);
					} else if (record.actualStart !== null && record.actualEnd !== null) {
						this.tables.attendance.rows.add([
							[
								record.ID,
								`<span class="badge bg-${theClass}">${theType}</span>`,
								record.event,
								moment
									.tz(
										record.actualStart,
										this.manager.get("WWSUMeta")
											? this.manager.get("WWSUMeta").meta.timezone
											: moment.tz.guess()
									)
									.format("h:mm A"),
								record.actualEnd !== null
									? moment
											.tz(
												record.actualEnd,
												this.manager.get("WWSUMeta")
													? this.manager.get("WWSUMeta").meta.timezone
													: moment.tz.guess()
											)
											.format("h:mm A")
									: `ONGOING`,
								`<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`
							]
						]);
					} else {
						this.tables.attendance.rows.add([
							[
								record.ID,
								`<span class="badge bg-${theClass}">${theType}</span>`,
								record.event,
								`SCHEDULED (${moment
									.tz(
										record.scheduledStart,
										this.manager.get("WWSUMeta")
											? this.manager.get("WWSUMeta").meta.timezone
											: moment.tz.guess()
									)
									.format("h:mm A")})`,
								`SCHEDULED (${moment
									.tz(
										record.scheduledEnd,
										this.manager.get("WWSUMeta")
											? this.manager.get("WWSUMeta").meta.timezone
											: moment.tz.guess()
									)
									.format("h:mm A")})`,
								`<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`
							]
						]);
					}
				});

				this.tables.attendance.draw();
			}
		);
	}

	/**
	 * View a log in a modal window.
	 *
	 * @param {number} id The ID of the attendance log to view
	 * @param {string} name Name of the event/log (to appear on modal title)
	 */
	viewLog(id, name) {
		this.modals.viewLog.body = `<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
			this.manager.get("WWSUMeta")
				? this.manager.get("WWSUMeta").meta.timezone
				: moment.tz.guess()
		}.</p><canvas id="modal-${
			this.modals.viewLog.id
		}-body-listeners" style="min-height: 200px; height: 200px; max-height: 350px; max-width: 100%;"></canvas><div id="modal-${
			this.modals.viewLog.id
		}-body-info"></div><table id="modal-${
			this.modals.viewLog.id
		}-body-log" class="table table-striped display responsive" style="width: 100%;"></table>`;
		this.modals.viewLog.iziModal("open");
		this.getAttendance(`#section-logs-table`, { ID: id }, attendance => {
			this.manager
				.get("WWSUutil")
				.waitForElement(
					`#modal-${this.modals.viewLog.id}-body-listeners`,
					() => {
						this.getListeners(
							`#modal-${this.modals.viewLog.id}-body-listeners`,
							{
								start: moment(attendance.actualStart).toISOString(true),
								end: moment(
									attendance.actualEnd
										? attendance.actualEnd
										: moment(attendance.actualStart).add(1, "days")
								).toISOString(true)
							},
							listeners => {
								let data = [];
								data = listeners.map(listener => {
									return {
										x: moment
											.tz(
												listener.createdAt,
												this.manager.get("WWSUMeta")
													? this.manager.get("WWSUMeta").meta.timezone
													: moment.tz.guess()
											)
											.format(),
										y: listener.listeners
									};
								});

								let listenerChartCanvas = $(
									`#modal-${this.modals.viewLog.id}-body-listeners`
								)
									.get(0)
									.getContext("2d");
								let listenerChart = new Chart(listenerChartCanvas, {
									type: "line",
									data: {
										datasets: [
											{
												label: "Online Listeners",
												data: data,
												steppedLine: true,
												fill: false,
												borderColor: `#17a2b8`
											}
										]
									},
									options: {
										responsive: true,
										title: {
											display: true,
											text: "Online Listeners"
										},
										scales: {
											xAxes: [
												{
													type: "time",
													display: true,
													scaleLabel: {
														display: true,
														labelString: "Date"
													},
													ticks: {
														major: {
															fontStyle: "bold",
															fontColor: "#FF0000"
														},
														min: moment
															.tz(
																attendance.actualStart,
																this.manager.get("WWSUMeta")
																	? this.manager.get("WWSUMeta").meta.timezone
																	: moment.tz.guess()
															)
															.format(),
														max: moment
															.tz(
																attendance.actualEnd,
																this.manager.get("WWSUMeta")
																	? this.manager.get("WWSUMeta").meta.timezone
																	: moment.tz.guess()
															)
															.format()
													}
												}
											],
											yAxes: [
												{
													display: true,
													scaleLabel: {
														display: true,
														labelString: "value"
													},
													ticks: {
														min: 0
													}
												}
											]
										}
									}
								});
							}
						);
					}
				);

			this.manager
				.get("WWSUutil")
				.waitForElement(`#modal-${this.modals.viewLog.id}-body-info`, () => {});

			this.manager
				.get("WWSUutil")
				.waitForElement(`#modal-${this.modals.viewLog.id}-body-log`, () => {
					const generateLog = updateOnly => {
						this.getLogs({ attendanceID: id }, logs => {
							if (!updateOnly) {
								this.tables.log = $(
									`#modal-${this.modals.viewLog.id}-body-log`
								).DataTable({
									paging: false,
									data: logs.map(log => {
										return [
											log.ID,
											moment
												.tz(
													log.createdAt,
													this.manager.get("WWSUMeta")
														? this.manager.get("WWSUMeta").meta.timezone
														: moment.tz.guess()
												)
												.format("llll"),
											`<i class="${
												log.logIcon !== "" ? log.logIcon : `fas fa-dot-circle`
											} bg-${
												log.loglevel
											}" style="border-radius: 50%; font-size: 15px; height: 30px; line-height: 30px; text-align: center; width: 30px;"></i>`,
											`<strong>${log.title}</strong><br />${log.event}${
												log.trackArtist ||
												log.trackTitle ||
												log.trackAlbum ||
												log.trackRecordLabel
													? `${
															log.trackArtist || log.trackTitle
																? `<br />Track: ${
																		log.trackArtist
																			? log.trackArtist
																			: `Unknown Artist`
																  } - ${
																		log.trackTitle
																			? log.trackTitle
																			: `Unknown Title`
																  }`
																: ``
													  }${
															log.trackAlbum
																? `<br />Album: ${log.trackAlbum}`
																: ``
													  }${
															log.trackLabel
																? `<br />Label: ${log.trackLabel}`
																: ``
													  }`
													: ``
											}`,
											`${
												this.isAccountable(log) && log.attendanceID
													? `<div class="btn-group"><button class="btn btn-sm btn-danger btn-log-unexcused" data-id="${
															log.ID
													  }" title="Mark Unexcused (counts in analytics)"><i class="fas fa-thumbs-down"></i></button><button class="btn btn-sm btn-success btn-log-excused" data-id="${
															log.ID
													  }" title="Mark Excused (does not count in analytics)"><i class="fas fa-thumbs-up"></i></button></div>${
															log.excused
																? `<div class="text-success">EXCUSED</div>`
																: `<div class="text-danger">UN-EXCUSED</div>`
													  }`
													: ``
											}`
										];
									}),
									columns: [
										{ title: "ID" },
										{ title: "Time" },
										{ title: "Type" },
										{ title: "Event" },
										{ title: "Actions" }
									],
									columnDefs: [{ responsivePriority: 1, targets: 4 }],
									pageLength: 25,
									buttons: ["copy", "csv", "excel", "pdf", "print", "colvis"],
									drawCallback: () => {
										// Action button click events
										$(".btn-log-unexcused").unbind("click");
										$(".btn-log-excused").unbind("click");

										$(".btn-log-unexcused").click(e => {
											let id = parseInt($(e.currentTarget).data("id"));
											this.manager.get("WWSUutil").confirmDialog(
												`Are you sure you want to mark issue ${id} as <strong>unexcused</strong>?
                    <ul>
                    <li>Unexcused means this record <strong>will</strong> count against DJ/show reputation and show up in analytics.</li>
                    <li>You should mark records as unexcused when the issue was caused by the DJ and not WWSU, and the issue (such as cancellations / absences) does not fall within an "optional" clause / timeframe.</li>
                    <li>Once you proceed, the issue will be marked unexcused and dismissed from the to-do window on all DJ Controls. You will need to access the specific log for this issue if you later decide to change it to excused.</li>
                    </ul>
                    `,
												null,
												() => {
													this.edit(
														{ ID: id, acknowledged: true, excused: false },
														success => {
															if (success) {
																generateLog(true);
															}
														}
													);
												}
											);
										});

										$(".btn-log-excused").click(e => {
											let id = parseInt($(e.currentTarget).data("id"));
											this.manager.get("WWSUutil").confirmDialog(
												`Are you sure you want to mark issue ${id} as <strong>excused</strong>?
                      <ul>
                      <li>Excused means this record <strong>will NOT</strong> count against DJ/show reputation nor analytics; excusing this means we pretend it never happened.</li>
                      <li>You should mark records as excused when the issue was caused by WWSU and not the DJ (such as a bug or a higher-priority broadcast conflict, such as sports), or the issue fell under an "optional" clause or timeframe.</li>
                      <li>Once you proceed, the issue will be marked excused and dismissed from the to-do window on all DJ Controls. You will need to access the specific log for this issue if you later decide to change it to unexcused.</li>
                      </ul>
                      `,
												null,
												() => {
													this.edit(
														{ ID: id, acknowledged: true, excused: true },
														success => {
															if (success) {
																generateLog(true);
															}
														}
													);
												}
											);
										});
									}
								});

								this.tables.log
									.buttons()
									.container()
									.appendTo(
										$(
											`#modal-${this.modals.viewLog.id}-body-log_wrapper .col-md-6:eq(0)`
										)
									);
							} else {
								this.tables.log.clear();
								this.tables.log.rows.add(
									logs.map(log => {
										return [
											log.ID,
											moment
												.tz(
													log.createdAt,
													this.manager.get("WWSUMeta")
														? this.manager.get("WWSUMeta").meta.timezone
														: moment.tz.guess()
												)
												.format("llll"),
											`<i class="${
												log.logIcon !== "" ? log.logIcon : `fas fa-dot-circle`
											} bg-${
												log.loglevel
											}" style="border-radius: 50%; font-size: 15px; height: 30px; line-height: 30px; text-align: center; width: 30px;"></i>`,
											`<strong>${log.title}</strong><br />${log.event}${
												log.trackArtist ||
												log.trackTitle ||
												log.trackAlbum ||
												log.trackRecordLabel
													? `${
															log.trackArtist || log.trackTitle
																? `<br />Track: ${
																		log.trackArtist
																			? log.trackArtist
																			: `Unknown Artist`
																  } - ${
																		log.trackTitle
																			? log.trackTitle
																			: `Unknown Title`
																  }`
																: ``
													  }${
															log.trackAlbum
																? `<br />Album: ${log.trackAlbum}`
																: ``
													  }${
															log.trackLabel
																? `<br />Label: ${log.trackLabel}`
																: ``
													  }`
													: ``
											}`,
											`${
												this.isAccountable(log) && log.attendanceID
													? `<div class="btn-group"><button class="btn btn-sm btn-danger btn-log-unexcused" data-id="${
															log.ID
													  }" title="Mark Unexcused (counts in analytics)"><i class="fas fa-thumbs-down"></i></button><button class="btn btn-sm btn-success btn-log-excused" data-id="${
															log.ID
													  }" title="Mark Excused (does not count in analytics)"><i class="fas fa-thumbs-up"></i></button></div>${
															log.excused
																? `<div class="text-success">EXCUSED</div>`
																: `<div class="text-danger">UN-EXCUSED</div>`
													  }`
													: ``
											}`
										];
									})
								);
								this.tables.log.draw();
							}
						});
					};
					generateLog(false);
				});
		});
	}

	// Update the dashboard logs timeline
	updateDashboardLogs() {
		this.manager.get("WWSUanimations").add("logs-update-dashboard-logs", () => {
			if (this.dashboardLogs) {
				$(this.dashboardLogs).html("");
				this.dashboard
					.find()
					.sort(
						(a, b) =>
							moment(a.createdAt).valueOf() - moment(b.createdAt).valueOf()
					)
					.map(log => {
						$(this.dashboardLogs).prepend(`<div>
                    <i class="${
											log.logIcon !== "" ? log.logIcon : `fas fa-dot-circle`
										} bg-${log.loglevel}"></i>
                    <div class="timeline-item">
                      <span class="time"><i class="fas fa-clock"></i> ${moment
												.tz(
													log.createdAt,
													this.manager.get("WWSUMeta")
														? this.manager.get("WWSUMeta").meta.timezone
														: moment.tz.guess()
												)
												.format("LT")}</span>
                      <h3 class="timeline-header">${log.title}</h3>
                      <div class="timeline-body">
                      ${log.event}${
							log.trackArtist ||
							log.trackTitle ||
							log.trackAlbum ||
							log.trackRecordLabel
								? `${
										log.trackArtist || log.trackTitle
											? `<br />Track: ${
													log.trackArtist ? log.trackArtist : `Unknown Artist`
											  } - ${
													log.trackTitle ? log.trackTitle : `Unknown Title`
											  }`
											: ``
								  }${log.trackAlbum ? `<br />Album: ${log.trackAlbum}` : ``}${
										log.trackLabel ? `<br />Label: ${log.trackLabel}` : ``
								  }`
								: ``
						}
                      </div>
                    </div>
                  </div>`);
					});
			}
		});
	}

	/**
	 * Get show analytics
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter is returned data, or false if failed.
	 */
	getShowtime(dom, data, cb) {
		try {
			this.manager.get("hostReq").request(
				{
					dom: dom,
					method: "post",
					url: this.endpoints.getShowtime,
					data: data
				},
				response => {
					if (response[0] && response[1]) {
						cb(response);
					} else {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error getting analytics",
							body:
								"There was an error getting analytics. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg"
						});
						console.error(e);
						cb(false);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error getting analytics",
				body:
					"There was an error getting analytics. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
			});
			console.error(e);
			cb(false);
		}
	}

	/**
	 * Show a modal to add a log into the system.
	 */
	showLogForm() {
		// TODO: Prompt for host (cannot do at this time because of circular requirement loop between logs, hosts, and djs; build a WWSU class manager to oversee all WWSU classes)
		this.modals.addLog.body = ``;
		this.modals.addLog.iziModal("open");

		$(this.modals.addLog.body).alpaca({
			schema: {
				type: "object",
				properties: {
					date: {
						format: "datetime",
						required: true,
						title: "Air date/time"
					},
					trackArtist: {
						format: "string",
						title: "Track Artist",
						required: true
					},
					trackTitle: {
						format: "string",
						title: "Track Title",
						required: true
					},
					trackAlbum: {
						type: "string",
						title: "Album Name"
					},
					trackLabel: {
						type: "string",
						title: "Record Label"
					}
				}
			},
			options: {
				fields: {
					date: {
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
					},
					trackLabel: {
						helpers: [
							"This is the record company / companies which the artist went through to publish this track.",
							"Please search online if you do not know. If the internet does not help either, you can leave this blank.",
							"Please put Independent if this track was published by the artist and not a company / record label."
						]
					}
				},
				form: {
					buttons: {
						submit: {
							title: "Add Log",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();

								value.logtype = "manual";
								value.loglevel = "secondary";
								value.logsubtype = this.manager.get("WWSUMeta")
									? this.manager.get("WWSUMeta").meta.show
									: null;
								value.logIcon = "fas fa-file";
								value.title =
									value.trackTitle && value.trackTitle.length > 0
										? `DJ / Producer played a track.`
										: `DJ / Producer started talking.`;

								this.add(value, false, success => {
									if (success) {
										this.modals.addLog.iziModal("close");
									}
								});
							}
						}
					}
				}
			},
			data: {
				date: moment(
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.time
						: undefined
				).toISOString(true)
			}
		});
	}
}
