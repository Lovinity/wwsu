// This class manages director timesheets from WWSU.
// NOTE: unlike most other WWSU models, this does not use traditional WWSUdb extends. Otherwise, memory can be quickly eaten up by timesheets.
class WWSUtimesheet extends WWSUevents {
	/**
	 * Construct the class.
	 *
	 * @param {sails.io} socket WWSU socket connection
	 * @param {WWSUreq} noReq Request without authorization
	 * @param {WWSUreq} adminDirectorReq Request with admin director authorization
	 * @param {WWSUmeta} meta WWSUmeta class
	 */
	constructor(socket, noReq, adminDirectorReq, meta) {
		super();

		this.endpoints = {
			get: "/timesheet/get",
			edit: "/timesheet/edit",
			remove: "/timesheet/remove",
		};
		this.data = {
			get: {},
			edit: {},
			remove: {},
		};
		this.requests = {
			no: noReq,
			admin: adminDirectorReq,
		};
		this.tables = {
			hours: undefined,
			records: undefined,
		};
		this.models = {
			edit: new WWSUmodal(`Edit Timesheet`, null, ``, true, {
				headerColor: "",
				zindex: 1200,
				width: 800,
			}),
		};
		this.fields = {
			start: undefined,
			end: undefined,
			browse: undefined,
		};

		this.meta = meta;

		this.animations = new WWSUanimations();

		socket.on("timesheet", (data) => {
			this.updateTables();
		});

		this.cache = [];
	}

	/**
	 * Edit a timesheet via WWSU API.
	 *
	 * @param {object} data Data to pass to WWSU
	 * @param {?function} cb Callback function with true for success, false for failure
	 */
	edit(data, cb) {
		try {
			this.requests.admin.request(
				{ method: "post", url: this.endpoints.edit, data },
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error editing timesheet",
							body:
								"There was an error editing the timesheet. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") {
							cb(false);
						}
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "timesheet edited",
							autohide: true,
							delay: 15000,
							body: `The timesheet was edited.`,
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
				title: "Error editing timesheet",
				body:
					"There was an error editing the timesheet. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			if (typeof cb === "function") {
				cb(false);
			}
			console.error(e);
		}
	}

	/**
	 * Remove a timesheet via WWSU API.
	 *
	 * @param {object} data Data to pass to WWSU
	 * @param {?function} cb Callback function with true for success, false for failure
	 */
	remove(data, cb) {
		try {
			this.requests.admin.request(
				{ method: "post", url: this.endpoints.remove, data },
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error removing timesheet",
							body:
								"There was an error removing the timesheet. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") {
							cb(false);
						}
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "timesheet removed",
							autohide: true,
							delay: 10000,
							body: `The timesheet was removed.`,
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
				title: "Error removing timesheet",
				body:
					"There was an error removing the timesheet. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			if (typeof cb === "function") {
				cb(false);
			}
			console.error(e);
		}
	}

	/**
	 * Initialize tables.
	 *
	 * @param {string} hoursTable DOM query string for the table indicating total hours for each director
	 * @param {string} recordsTable DOM query string of the table indicating each timesheet record and actions for it
	 * @param {string} startField DOM query for the start date input field
	 * @param {string} endField DOM query for the end date input field
	 * @param {string} browseButton DOM query for the browse button to load timesheet records in the tables
	 */
	init(hoursTable, recordsTable, startField, endField, browseButton) {
		this.animations.add("timesheet-init-tables", () => {
			var util = new WWSUutil();

			// Set fields
			this.fields.start = startField;
			this.fields.end = endField;
			this.fields.browse = browseButton;

			// Browse button click event
			$(this.fields.browse).click(() => {
				this.getRecords();
			});

			// Init html
			$(hoursTable).html(
				`<table id="section-timesheets-hours-table" class="table table-striped display responsive" style="width: 100%;"></table>`
			);
			$(recordsTable).html(
				`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
					this.meta ? this.meta.meta.timezone : moment.tz.guess()
				}.</p><table id="section-timesheets-records-table" class="table table-striped display responsive" style="width: 100%;"></table>`
			);

			// Setup hours table
			util.waitForElement(`#section-timesheets-hours-table`, () => {
				this.tables.hours = $(`#section-timesheets-hours-table`).DataTable({
					paging: false,
					data: [],
					columns: [
						{ title: "Director" },
						{ title: "Scheduled Hours" },
						{ title: "Approved Hours" },
						{ title: "Unapproved Hours" },
						{ title: "Total Clocked Hours" },
					],
					order: [[0, "asc"]],
				});
			});

			// Setup records table
			util.waitForElement(`#section-timesheets-records-table`, () => {
				this.tables.records = $(`#section-timesheets-records-table`).DataTable({
					paging: true,
					data: [],
					columns: [
						{ title: "ID" },
						{ title: "Director" },
						{ title: "Status" },
						{ title: "Scheduled In" },
						{ title: "Scheduled Out" },
						{ title: "Actual In" },
						{ title: "Actual Out" },
						{ title: "Actions" },
					],
					columnDefs: [{ responsivePriority: 1, targets: 6 }],
					order: [[0, "asc"]],
					pageLength: 25,
					drawCallback: () => {
						// Action button click events
						$(".btn-timesheet-edit").unbind("click");
						$(".btn-timesheet-delete").unbind("click");

						$(".btn-timesheet-edit").click((e) => {
							var id = parseInt($(e.currentTarget).data("id"));
							var record = this.cache.find((rec) => rec.ID === id);
							if (record) {
								this.timesheetForm(record);
							} else {
								$(document).Toasts("create", {
									class: "bg-danger",
									title: "Error accessing timesheet edit form",
									body:
										"There was an error loading the form to edit that timesheet. Please report this to the engineer.",
									autoHide: true,
									delay: 10000,
									icon: "fas fa-skull-crossbones fa-lg",
								});
							}
						});

						$(".btn-timesheet-delete").click((e) => {
							var id = parseInt($(e.currentTarget).data("id"));
							util.confirmDialog(
								`<p>Are you sure you want to <strong>permanently</strong> remove the timesheet record ${id}?</p>
                                <p>This will permanently remove the timesheet record, and all associated hours will no longer count.</p>`,
								null,
								() => {
									this.remove({ ID: id }, (success) => {
										if (success) {
											this.getRecords();
										}
									});
								}
							);
						});
					},
				});
			});
		});
	}

	/**
	 * Get records for a range, and update tables if initialized.
	 *
	 * @param {?string} start The ISO date of the earliest timesheet records to get
	 * @param {?string} end The ISO date of the latest timesheet records to get
	 * @param {?function} cb Callback function to execute with records
	 */
	getRecords(cb) {
		this.requests.no.request(
			{
				method: "post",
				url: this.endpoints.get,
				data: {
					start: $(this.fields.start).val(),
					end: $(this.fields.end).val(),
				},
			},
			(response) => {
				if (!response || response.constructor !== Array) {
					$(document).Toasts("create", {
						class: "bg-danger",
						title: "Error getting timesheet records",
						body:
							"There was an error getting timesheet records. Please report this to the engineer.",
						autoHide: true,
						delay: 10000,
						icon: "fas fa-skull-crossbones fa-lg",
					});
				} else {
					// Cache the current timesheets
					this.cache = response;

					if (typeof cb === "function") {
						cb(response);
					}

					// Update hours table if it exists
					if (this.tables.hours) {
						// Calculate hours for directors
						let directors = {};
						response.map((record) => {
							// Set up tamplate if new director
							if (typeof directors[record.name] === "undefined") {
								directors[record.name] = {
									approved: 0,
									unapproved: 0,
									scheduled: 0,
								};
							}

							// Add scheduled hours
							if (record.scheduledIn && record.scheduledOut) {
								directors[record.name].scheduled += moment(
									record.scheduledOut
								).diff(record.scheduledIn, "hours", true);
							}

							// Add actual hours
							if (record.timeIn) {
								if (record.approved === 1) {
									directors[record.name].approved += moment(
										record.timeOut || undefined
									).diff(record.timeIn, "hours", true);
								} else {
									directors[record.name].unapproved += moment(
										record.timeOut || undefined
									).diff(record.timeIn, "hours", true);
								}
							}
						});

						// Update table
						this.tables.hours.clear();
						for (var director in directors) {
							if (Object.prototype.hasOwnProperty.call(directors, director)) {
								this.tables.hours.rows.add([
									[
										director,
										Math.round(
											(directors[director].scheduled + Number.EPSILON) * 100
										) / 100,
										Math.round(
											(directors[director].approved + Number.EPSILON) * 100
										) / 100,
										Math.round(
											(directors[director].unapproved + Number.EPSILON) * 100
										) / 100,
										Math.round(
											(directors[director].approved +
												directors[director].unapproved +
												Number.EPSILON) *
												100
										) / 100,
									],
								]);
							}
						}
						this.tables.hours.draw();
					}

					// Update records table if it exists
					if (this.tables.records) {
						this.tables.records.clear();
						this.tables.records.rows.add(
							response.map((record) => {
								let status = `<span class="badge badge-secondary">Unknown</span>`;
								switch (record.approved) {
									case -1:
										status = `<span class="badge badge-danger">Unexcused Absence</span>`;
										break;
									case 0:
										status = `<span class="badge badge-warning">Unapproved</span>`;
										break;
									case 1:
										status = `<span class="badge badge-success">Approved</span>`;
										break;
									case 2:
										status = `<span class="badge badge-secondary">Cancelled</span>`;
										break;
								}
								return [
									record.ID,
									record.name,
									status,
									record.scheduledIn
										? moment
												.tz(
													record.scheduledIn,
													this.meta
														? this.meta.meta.timezone
														: moment.tz.guess()
												)
												.format("YYYY-MM-DD h:mm A")
										: `Unscheduled`,
									record.scheduledOut
										? moment
												.tz(
													record.scheduledOut,
													this.meta
														? this.meta.meta.timezone
														: moment.tz.guess()
												)
												.format("YYYY-MM-DD h:mm A")
										: `Unscheduled`,
									record.timeIn
										? moment
												.tz(
													record.timeIn,
													this.meta
														? this.meta.meta.timezone
														: moment.tz.guess()
												)
												.format("YYYY-MM-DD h:mm A")
										: `Absent`,
									record.timeOut
										? moment
												.tz(
													record.timeOut,
													this.meta
														? this.meta.meta.timezone
														: moment.tz.guess()
												)
												.format("YYYY-MM-DD h:mm A")
										: record.timeIn
										? `Clocked In`
										: `Absent`,
									`<div class="btn-group">
                                    <button class="btn btn-sm btn-warning btn-timesheet-edit" data-id="${record.ID}" title="Edit Timesheet Record"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-timesheet-delete" data-id="${record.ID}" title="Remove Timesheet record"><i class="fas fa-trash"></i></button></div>`,
								];
							})
						);
						this.tables.records.draw();
					}
				}
			}
		);
	}

	/**
	 * Make a "Edit Timesheet" Alpaca form in a modal.
	 *
	 * @param {object} data The original timesheet record
	 */
	timesheetForm(data) {
		this.models.edit.body = ``;
		this.models.edit.iziModal("open");

		$(this.models.edit.body).alpaca({
			schema: {
				title: "Edit Timesheet",
				type: "object",
				properties: {
					ID: {
						type: "number",
						required: true,
					},
					name: {
						type: "string",
						title: "Director",
						readonly: true,
					},
					scheduledIn: {
						format: "datetime",
						title: "Scheduled Time In",
						readonly: true,
					},
					scheduledOut: {
						format: "datetime",
						title: "Scheduled Time Out",
						readonly: true,
					},
					approved: {
						type: "number",
						required: true,
						enum: [-1, 2, 0, 1],
						title: "Approval Status",
					},
					timeIn: {
						format: "datetime",
						title: "Clocked Time In",
					},
					timeOut: {
						format: "datetime",
						title: "Clocked Time Out",
					},
				},
			},
			options: {
				fields: {
					ID: {
						type: "hidden",
					},
					scheduledIn: {
						dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
							.parseZone(this.meta ? this.meta.meta.time : undefined)
							.format("Z")}`,
						helper: "The date/time the director was scheduled to clock in.",
					},
					scheduledOut: {
						dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
							.parseZone(this.meta ? this.meta.meta.time : undefined)
							.format("Z")}`,
						helper: "The date/time the director was scheduled to clock out.",
					},
					approved: {
						optionLabels: [
							"Unexcused Absence",
							"Excused Cancellation",
							"Unapproved Hours",
							"Approved Hours",
						],
					},
					timeIn: {
						dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
							.parseZone(this.meta ? this.meta.meta.time : undefined)
							.format("Z")}`,
						picker: {
							inline: true,
							sideBySide: true,
						},
						helper:
							"The date/time the director clocked in. Field required for approved hours and unapproved hours approval statuses.",
						validator: function (callback) {
							var value = this.getValue();
							var approved = this.getParent().childrenByPropertyId[
								"approved"
							].getValue();
							if (
								(approved === 0 || approved === 1) &&
								(!value || value === "")
							) {
								callback({
									status: false,
									message:
										"Field is required when approval status is approved hours or unapproved hours.",
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
					timeOut: {
						dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
							.parseZone(this.meta ? this.meta.meta.time : undefined)
							.format("Z")}`,
						picker: {
							inline: true,
							sideBySide: true,
						},
						helper:
							"The date/time the director clocked out. If clocked time in is filled in, and this is left empty, we assume the director is still clocked in.",
					},
				},
				form: {
					buttons: {
						submit: {
							title: "Edit Timesheet",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								var value = form.getValue();
								this.edit(value, (success) => {
									if (success) {
										this.models.edit.iziModal("close");
										this.getRecords();
									}
								});
							},
						},
					},
				},
			},
			data: data,
		});
	}
}
