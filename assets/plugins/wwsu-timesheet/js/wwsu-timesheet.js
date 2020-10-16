// This class manages director timesheets from WWSU.
// NOTE: unlike most other WWSU models, this does not use traditional WWSUdb extends. Otherwise, memory can be quickly eaten up by timesheets.
class WWSUtimesheet extends WWSUevents {
	/**
	 * Construct the class.
	 *
	 * @param {sails.io} socket WWSU socket connection
	 * @param {WWSUreq} noReq Request without authorization
	 * @param {WWSUreq} directorReq Request with director authorization
	 * @param {WWSUreq} adminDirectorReq Request with admin director authorization
	 * @param {WWSUmeta} meta WWSUmeta class
	 * @param {WWSUhosts} hosts WWSUhosts class for the timesheet computer only
	 */
	constructor(socket, noReq, directorReq, adminDirectorReq, meta, hosts) {
		super();

		this.endpoints = {
			add: "/timesheet/add",
			get: "/timesheet/get",
			edit: "/timesheet/edit",
			remove: "/timesheet/remove",
		};
		this.data = {
			add: {},
			get: {},
			edit: {},
			remove: {},
		};
		this.requests = {
			no: noReq,
			director: directorReq,
			admin: adminDirectorReq,
		};
		this.tables = {
			hours: undefined,
			records: undefined,
		};
		this.modals = {
			edit: new WWSUmodal(`Edit Timesheet`, null, ``, true, {
				headerColor: "",
				zindex: 1200,
				width: 800,
			}),
			clock: new WWSUmodal(``, null, ``, true, {
				headerColor: "",
				zindex: 1100,
			}),
		};
		this.fields = {
			start: undefined,
			end: undefined,
			browse: undefined,
		};

		this.meta = meta;
		this.hosts = hosts;

		this.animations = new WWSUanimations();

		socket.on("timesheet", (data) => {
			this.updateTables();
		});

		this.cache = [];
	}

	/**
	 * Show clock-in or clock-out form for the specified director.
	 *
	 * @param {number} directorID ID of the director clocking in or out
	 */
	clockForm(directorID) {
		// Find the director
		let director = this.requests.director.db.find({ ID: directorID }, true);

		this.modals.clock.title = `${director.name} - Clock ${
			!director.present
				? this.hosts && this.hosts.client && this.hosts.client.authorized
					? `In`
					: `In Remotely`
				: `Out`
		}`;

		this.modals.clock.iziModal("open");

		this.modals.clock.body = ``;

		$(this.modals.clock.body).alpaca({
			schema: {
				title: `Clock ${
					!director.present
						? this.hosts && this.hosts.client && this.hosts.client.authorized
							? `In`
							: `In Remotely`
						: `Out`
				}`,
				type: "object",
				properties: {
					name: {
						type: "string",
						required: true,
					},
					password: {
						type: "string",
						required: true,
						format: "password",
						title: "Password",
					},
					timestamp: {
						title: `Clock-${director.present ? `Out` : `In`} Time`,
						format: "datetime",
					},
					notes: {
						type: "string",
						title: "Accomplishments / Notes",
						// Notes are only required for clocking out; hide it otherwise.
						required: director.present ? true : false,
						hidden: director.present ? false : true,
					},
				},
			},
			options: {
				fields: {
					name: {
						type: "hidden",
					},
					timestamp: {
						dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
							.parseZone(this.meta ? this.meta.meta.time : undefined)
							.format("Z")}`,
						picker: {
							inline: true,
							sideBySide: true,
						},
						helper: `Be aware if you specify a time 30+ minutes from now, this record will be marked unapproved and will need approved by an admin director.`,
					},
					notes: {
						type: "tinymce",
						options: {
							toolbar:
								"undo redo | bold italic underline strikethrough | fontselect fontsizeselect formatselect | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | fullscreen preview | image link | ltr rtl",
							plugins:
								"autoresize preview paste importcss searchreplace autolink save directionality visualblocks visualchars fullscreen image link table hr pagebreak nonbreaking toc insertdatetime advlist lists wordcount imagetools textpattern noneditable help quickbars",
							menubar: "file edit view insert format tools table help",
						},
						helper:
							"Please briefly describe what you accomplished during your time clocked in. Optionally include things you planned to do but could not accomplish (and why), and things you plan to do next time you are in.",
					},
				},
				form: {
					buttons: {
						submit: {
							title: `Clock ${
								!director.present
									? this.hosts &&
									  this.hosts.client &&
									  this.hosts.client.authorized
										? `In`
										: `In Remotely`
									: `Out`
							}`,
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								var value = form.getValue();
								this.requests.director._authorize(
									value.name,
									value.password,
									(body) => {
										if (body === 0 || typeof body.token === `undefined`) {
											$(document).Toasts("create", {
												class: "bg-warning",
												title: "Authorization Error",
												body:
													"There was an error authorizing you. Did you type your password in correctly? Please contact the engineer if this is a bug.",
												delay: 15000,
												autoHide: true,
											});
										} else {
											this.requests.director._tryRequest(
												{
													method: "POST",
													url: "/timesheet/add",
													data: {
														timestamp: moment(value.timestamp).toISOString(
															true
														),
														notes: value.notes,
														remote:
															!this.hosts ||
															!this.hosts.client ||
															!this.hosts.client.authorized,
													},
												},
												(body2) => {
													if (body2 === "OK") {
														$(document).Toasts("create", {
															class: "bg-success",
															title: `Clocked ${
																director.present ? `Out` : `In`
															}`,
															autohide: true,
															delay: 10000,
															body: `You successfully clocked ${
																director.present ? `Out` : `In`
															}. ${
																director.present
																	? `Have a good day!`
																	: `Welcome!`
															}`,
														});
														this.modals.clock.iziModal("close");
													} else {
														$(document).Toasts("create", {
															class: "bg-warning",
															title: "Timesheet Error",
															body:
																"There was an error adding your record. Please contact the engineer.",
															delay: 10000,
															autohide: true,
														});
													}
												}
											);
										}
									}
								);
							},
						},
					},
				},
			},
			data: {
				name: director.name,
				password: ``,
				timestamp: moment().toISOString(true),
				notes: ``,
			},
		});
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
						{ title: "In-Office Hours" },
						{ title: "Remote Hours" },
						{ title: "Total Hours" },
					],
					order: [[0, "asc"]],
				});
			});

			// Setup records table
			util.waitForElement(`#section-timesheets-records-table`, () => {
				// Extra information
				let format = (d) => {
					return `<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">
					<tr>
						<td>Accomplishments / Notes:</td>
						<td>${d.notes}</td>
					</tr>
					</table>`;
				};
				this.tables.records = $(`#section-timesheets-records-table`).DataTable({
					paging: true,
					data: [],
					columns: [
						{
							className: "details-control",
							orderable: false,
							data: null,
							defaultContent: "",
						},
						{ title: "ID", data: "ID" },
						{ title: "Director", data: "director" },
						{ title: "Status", data: "status" },
						{ title: "Clock In", data: "clockIn" },
						{ title: "Clock Out", data: "clockOut" },
						{ title: "Actions", data: "actions" },
					],
					columnDefs: [{ responsivePriority: 1, targets: 6 }],
					order: [[1, "asc"]],
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
                                <p>This will remove the timesheet record, and its logged hours will no longer tally.</p>`,
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

				// Additional info rows
				$("#section-timesheets-records-table tbody").on(
					"click",
					"td.details-control",
					(e) => {
						var tr = $(e.target).closest("tr");
						var row = this.tables.records.row(tr);

						if (row.child.isShown()) {
							// This row is already open - close it
							row.child.hide();
							tr.removeClass("shown");
						} else {
							// Open this row
							row.child(format(row.data())).show();
							tr.addClass("shown");
						}
					}
				);
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
									scheduled: { office: 0, remote: 0, total: 0 },
									office: { approved: 0, unapproved: 0, total: 0 },
									remote: { approved: 0, unapproved: 0, total: 0 },
									total: { approved: 0, unapproved: 0, total: 0 },
								};
							}

							// Add scheduled hours
							if (record.scheduledIn && record.scheduledOut) {
								directors[record.name].scheduled[
									record.remote ? "remote" : "office"
								] += moment(record.scheduledOut).diff(
									record.scheduledIn,
									"hours",
									true
								);
								directors[record.name].scheduled.total += moment(
									record.scheduledOut
								).diff(record.scheduledIn, "hours", true);
							}

							// Add actual hours
							if (record.timeIn) {
								if (record.remote) {
									directors[record.name].remote[
										record.approved === 1 ? "approved" : "unapproved"
									] += moment(record.timeOut || undefined).diff(
										record.timeIn,
										"hours",
										true
									);
									directors[record.name].remote.total += moment(
										record.timeOut || undefined
									).diff(record.timeIn, "hours", true);
								} else {
									directors[record.name].office[
										record.approved === 1 ? "approved" : "unapproved"
									] += moment(record.timeOut || undefined).diff(
										record.timeIn,
										"hours",
										true
									);
									directors[record.name].office.total += moment(
										record.timeOut || undefined
									).diff(record.timeIn, "hours", true);
								}
								directors[record.name].total[
									record.approved === 1 ? "approved" : "unapproved"
								] += moment(record.timeOut || undefined).diff(
									record.timeIn,
									"hours",
									true
								);
								directors[record.name].total.total += moment(
									record.timeOut || undefined
								).diff(record.timeIn, "hours", true);
							}
						});

						// Update table
						this.tables.hours.clear();
						for (var director in directors) {
							if (Object.prototype.hasOwnProperty.call(directors, director)) {
								this.tables.hours.rows.add([
									[
										director,
										`<ul>
										<li>In-Office: ${
											Math.round(
												(directors[director].scheduled.office +
													Number.EPSILON) *
													100
											) / 100
										}</li>
										<li>Remote: ${
											Math.round(
												(directors[director].scheduled.remote +
													Number.EPSILON) *
													100
											) / 100
										}</li>
										<li>Total: ${
											Math.round(
												(directors[director].scheduled.total + Number.EPSILON) *
													100
											) / 100
										}</li>
										</ul>`,
										`<ul>
										<li>Approved: ${
											Math.round(
												(directors[director].office.approved + Number.EPSILON) *
													100
											) / 100
										}</li>
										<li>Un-approved: ${
											Math.round(
												(directors[director].office.unapproved +
													Number.EPSILON) *
													100
											) / 100
										}</li>
										<li>Total: ${
											Math.round(
												(directors[director].office.total + Number.EPSILON) *
													100
											) / 100
										}</li>
										</ul>`,
										`<ul>
										<li>Approved: ${
											Math.round(
												(directors[director].remote.approved + Number.EPSILON) *
													100
											) / 100
										}</li>
										<li>Un-approved: ${
											Math.round(
												(directors[director].remote.unapproved +
													Number.EPSILON) *
													100
											) / 100
										}</li>
										<li>Total: ${
											Math.round(
												(directors[director].remote.total + Number.EPSILON) *
													100
											) / 100
										}</li>
										</ul>`,
										`<ul>
										<li>Approved: ${
											Math.round(
												(directors[director].total.approved + Number.EPSILON) *
													100
											) / 100
										}</li>
										<li>Un-approved: ${
											Math.round(
												(directors[director].total.unapproved +
													Number.EPSILON) *
													100
											) / 100
										}</li>
										<li>Total: ${
											Math.round(
												(directors[director].total.total + Number.EPSILON) * 100
											) / 100
										}</li>
										</ul>`,
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
								return {
									notes: record.notes,
									ID: record.ID,
									director: record.name,
									status: `${
										record.remote
											? `<span class="badge bg-indigo">Remote</span>`
											: ``
									}${status}`,
									clockIn: `<ul>
									<li>Scheduled: ${
										record.scheduledIn
											? moment
													.tz(
														record.scheduledIn,
														this.meta
															? this.meta.meta.timezone
															: moment.tz.guess()
													)
													.format("YYYY-MM-DD h:mm A")
											: `Unscheduled`
									}</li>
										<li>Actual: ${
											record.timeIn
												? moment
														.tz(
															record.timeIn,
															this.meta
																? this.meta.meta.timezone
																: moment.tz.guess()
														)
														.format("YYYY-MM-DD h:mm A")
												: `Absent`
										}</li>
										</ul>`,
									clockOut: `<ul>
									<li>Scheduled: ${
										record.scheduledOut
											? moment
													.tz(
														record.scheduledOut,
														this.meta
															? this.meta.meta.timezone
															: moment.tz.guess()
													)
													.format("YYYY-MM-DD h:mm A")
											: `Unscheduled`
									}</li>
										<li>Actual: ${
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
												: `Absent`
										}</li>
										</ul>`,
									actions: `<div class="btn-group">
                                    <button class="btn btn-sm btn-warning btn-timesheet-edit" data-id="${record.ID}" title="Edit Timesheet Record"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-timesheet-delete" data-id="${record.ID}" title="Remove Timesheet record"><i class="fas fa-trash"></i></button></div>`,
									};
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
		this.modals.edit.body = ``;
		this.modals.edit.iziModal("open");

		$(this.modals.edit.body).alpaca({
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
					remote: {
						type: "boolean",
						title: "Is Remote Hours?",
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
					notes: {
						type: "string",
						title: "Accomplishments / Notes",
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
					notes: {
						type: "tinymce",
						options: {
							toolbar:
								"undo redo | bold italic underline strikethrough | fontselect fontsizeselect formatselect | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | fullscreen preview | image link | ltr rtl",
							plugins:
								"autoresize preview paste importcss searchreplace autolink save directionality visualblocks visualchars fullscreen image link table hr pagebreak nonbreaking toc insertdatetime advlist lists wordcount imagetools textpattern noneditable help quickbars",
							menubar: "file edit view insert format tools table help",
						},
						helper:
							"Accomplishments during this timesheet period. Optionally plans that could not be completed (and why), and plans for the future.",
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
										this.modals.edit.iziModal("close");
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
