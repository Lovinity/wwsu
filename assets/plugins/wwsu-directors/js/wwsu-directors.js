"use strict";

// This class manages directors from WWSU.

// REQUIRED WWSUmodules: noReq (WWSUreq), adminDirectorReq (WWSUreq), masterDirectorReq (WWSUreq), WWSUMeta, WWSUutil, WWSUanimations
class WWSUdirectors extends WWSUdb {
	/**
	 * Construct the directors.
	 *
	 * @param {WWSUmodules} manager The modules class which initiated this module
	 * @param {object} options Options to be passed to this module
	 */
	constructor(manager, options) {
		super(); // Create the db

		this.manager = manager;

		this.endpoints = {
			get: "/directors/get",
			add: "/directors/add",
			edit: "/directors/edit",
			remove: "/directors/remove",
		};
		this.data = {
			get: {},
		};

		this.table;

		this.assignSocketEvent("directors", this.manager.socket);

		this.newDirectorModal = new WWSUmodal(`New Director`, null, ``, true, {
			headerColor: "",
			overlayClose: false,
			zindex: 1110,
		});
	}

	// Initialize the directors class. Call this on socket connect event.
	init() {
		this.replaceData(
			this.manager.get("noReq"),
			this.endpoints.get,
			this.data.get
		);
	}

	/**
	 * Add a new Director to the system via the API
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	addDirector(data, cb) {
		try {
			this.manager.get("adminDirectorReq").request(
				{
					dom: `#modal-${this.newDirectorModal.id}`,
					method: "post",
					url: this.endpoints.add,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-warning",
							title: "Error adding director",
							body:
								"There was an error adding the director. Please make sure you filled all fields correctly.",
							delay: 10000,
						});
						cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Director Added",
							autohide: true,
							delay: 10000,
							body: `Director has been created`,
						});
						cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error adding Director",
				body:
					"There was an error adding a new Director. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			cb(false);
		}
	}

	/**
	 * Edit a Director in the system
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	editDirector(data, cb) {
		try {
			this.manager
				.get(data.ID === 1 ? "masterDirectorReq" : "adminDirectorReq")
				.request(
					{
						dom: `#modal-${this.newDirectorModal.id}`,
						method: "post",
						url: this.endpoints.edit,
						data: data,
					},
					(response) => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-warning",
								title: "Error editing director",
								body:
									"There was an error editing the Director. Please make sure you filled all fields correctly.",
								delay: 10000,
							});
							console.log(response);
							if (typeof cb === "function") cb(false);
						} else {
							$(document).Toasts("create", {
								class: "bg-success",
								title: "Director Edited",
								autohide: true,
								delay: 10000,
								body: `Director has been edited`,
							});
							if (typeof cb === "function") cb(true);
						}
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error adding Director",
				body:
					"There was an error editing the Director. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Remove a Director from the system.
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	removeDirector(data, cb) {
		try {
			this.manager.get("adminDirectorReq").request(
				{
					method: "post",
					url: this.endpoints.remove,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error removing Director",
							body:
								"There was an error removing the Director. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Director Removed",
							autohide: true,
							delay: 30000,
							body: `Director has been removed. <br /><strong>WARNING!</strong> If this director had any DJ Controls installed on personal machines, please remove access under Administration -> Hosts.`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error removing Director",
				body:
					"There was an error removing the Director. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Initialize director management table.
	 *
	 * @param {string} table The DOM query string of the div container that should house the table.
	 */
	initTable(table) {
		this.manager.get("WWSUanimations").add("directors-init-table", () => {
			// Init html
			$(table).html(
				`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.timezone
						: moment.tz.guess()
				}.</p><p><button type="button" class="btn btn-block btn-success btn-director-new">New Director</button></p><table id="section-directors-table" class="table table-striped display responsive" style="width: 100%;"></table>`
			);

			this.manager
				.get("WWSUutil")
				.waitForElement(`#section-directors-table`, () => {
					// Generate table
					this.table = $(`#section-directors-table`).DataTable({
						paging: true,
						data: [],
						columns: [
							{ title: "Name" },
							{ title: "Position" },
							{ title: "Clocked In?" },
							{ title: "Admin?" },
							{ title: "Assistant?" },
							{ title: "Emails" },
							{ title: "Actions" },
						],
						columnDefs: [{ responsivePriority: 1, targets: 4 }],
						order: [[0, "asc"]],
						buttons: ["copy", "csv", "excel", "pdf", "print", "colvis"],
						pageLength: 100,
						drawCallback: () => {
							// Action button click events
							$(".btn-director-edit").unbind("click");
							$(".btn-director-delete").unbind("click");

							$(".btn-director-edit").click((e) => {
								let director = this.find().find(
									(director) =>
										director.ID === parseInt($(e.currentTarget).data("id"))
								);
								if (director.ID === 1) {
									this.manager.get("WWSUutil").confirmDialog(
										`<p>Are you sure you want to edit the <strong>Master Director</strong>?</p>
									<p>Please be aware that <strong>only the master director may edit the master director</strong>.</p>
									<p>If the master director forgot their password, it must be reset. Please contact Patrick Schmalstig at xanaftp@gmail.com.</p>`,
										null,
										() => {
											this.showDirectorForm(director);
										}
									);
								} else {
									this.showDirectorForm(director);
								}
							});

							$(".btn-director-delete").click((e) => {
								let director = this.find().find(
									(director) =>
										director.ID === parseInt($(e.currentTarget).data("id"))
								);
								this.manager.get("WWSUutil").confirmDialog(
									`Are you sure you want to <strong>permanently</strong> remove the director "${director.name}"?
                                <ul>
                                <li><strong>Do NOT permanently remove a director unless they are no longer working for WWSU.</strong></li>
                                <li>This removes the director from the system, including WWSU timesheets application and anywhere office hours and directors are posted.</li>
                                <li>The director can no longer perform actions that require director authorization.</li>
                                <li>This removes the director's office hours from the calendar.</li>
                                <li>This will disassociate the director from any tasks to which they are assigned.</li>
                                <li>This will delete tasks created by this director.</li>
                                <li>The timesheet records for the director will remain in the system and can still be viewed. But the director cannot clock in/out anymore.</li>
                                </ul>`,
									director.name,
									() => {
										this.removeDirector({ ID: director.ID });
									}
								);
							});
						},
					});

					this.table
						.buttons()
						.container()
						.appendTo(`#section-directors-table_wrapper .col-md-6:eq(0)`);

					// Add click event for new DJ button
					$(".btn-director-new").unbind("click");
					$(".btn-director-new").click(() => {
						this.showDirectorForm();
					});

					// Update with information
					this.updateTable();
				});
		});
	}

	/**
	 * Update the Director management table if it exists
	 */
	updateTable() {
		this.manager.get("WWSUanimations").add("directors-update-table", () => {
			if (this.table) {
				this.table.clear();
				this.find().forEach((director) => {
					this.table.row.add([
						director.name || "",
						director.position || "Unknown Position",
						director.present
							? `<i class="fas fa-check-circle text-${
									director.present === 2 ? `indigo` : `success`
							  }" title="${director.name} is currently clocked in${
									director.present === 2 ? ` for remote hours` : ``
							  }"></i>`
							: ``,
						director.admin
							? `<i class="fas fa-check-circle text-success" title="${director.name} is an administrator director"></i>`
							: ``,
						director.assistant
							? `<i class="fas fa-check-circle text-success" title="${director.name} is an assistant director"></i>`
							: ``,
						`${
							director.emailEmergencies
								? `<i class="fas fa-exclamation-triangle text-danger" title="${director.name} will receive emails of critical system issues."></i>`
								: ``
						}${
							director.emailCalendar
								? `<i class="fas fa-calendar text-info" title="${director.name} will receive emails regarding calendar events and shows/broadcasts."></i>`
								: ``
						}${
							director.emailWeeklyAnalytics
								? `<i class="fas fa-chart-line text-primary" title="${director.name} will receive emails every Sunday 12AM containing weekly analytics."></i>`
								: ``
						}`,
						`<div class="btn-group"><button class="btn btn-sm btn-warning btn-director-edit" data-id="${
							director.ID
						}" title="Edit director"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-director-delete" data-id="${
							director.ID
						}" ${
							director.ID === 1
								? `title="Cannot remove the master director" disabled`
								: `title="Remove Director"`
						}><i class="fas fa-trash"></i></button></div>`,
					]);
				});
				this.table.draw();
			}
		});
	}

	/**
	 * Make a "New Director" Alpaca form in a modal.
	 */
	showDirectorForm(data) {
		// reset login to null when filling out default values
		if (data && data.login) data.login = null;

		this.newDirectorModal.body = ``;

		this.newDirectorModal.iziModal("open");

		$(this.newDirectorModal.body).alpaca({
			schema: {
				title: data ? "Edit Director" : "New Director",
				type: "object",
				properties: {
					ID: {
						type: "number",
					},
					name: {
						type: "string",
						required: true,
						title: "Full Name",
						maxLength: 255,
					},
					position: {
						type: "string",
						title: "Position",
						maxLength: 255,
					},
					admin: {
						type: "boolean",
						title: "Is Admin Director?",
						readonly: data && data.ID === 1,
					},
					assistant: {
						type: "boolean",
						title: "Is Assistant Director?",
					},
					email: {
						type: "string",
						format: "email",
						title: "Change Email Address",
						maxLength: 255,
					},
					login: {
						type: "string",
						format: "password",
						required: data ? false : true,
						title: "Change Password",
						maxLength: 255,
					},
					emailEmergencies: {
						type: "boolean",
						title: "Email on Critical Issues?",
					},
					emailCalendar: {
						type: "boolean",
						title: "Calendar/broadcast related emails?",
					},
					emailWeeklyAnalytics: {
						type: "boolean",
						title: "Weekly analytics emails?",
					},
				},
			},
			options: {
				fields: {
					ID: {
						type: "hidden",
					},
					position: {
						helper: "What is the director's official title at WWSU?",
					},
					admin: {
						rightLabel: "Yes",
						helpers: [
							"Check this box if this director is an admin. Admin directors have the power to manage other directors and their timesheets in the system.",
							"This option cannot be changed for the master director.",
						],
					},
					assistant: {
						rightLabel: "Yes",
						helper:
							"Check this box if this director is an assistant, defined by WWSU as an unpaid director.",
					},
					email: {
						helper:
							"Change the email address of the director; the system will send emails to them according to email settings. Type remove@example.com to remove their email address. <strong>WWSU work email is highly recommended, or campus email if the director does not have a WWSU work email.</strong>",
					},
					login: {
						helper:
							"Change the password for the director. Director will use this password to clock in/out and to perform tasks requiring director authorization. <strong>CAUTION!</strong> If the password is forgotten, it must be changed by an/another admin director.",
					},
					emailEmergencies: {
						rightLabel: "Yes",
						helper:
							"Check this box if this director should be emailed when a critical issue occurs with WWSU.",
					},
					emailCalendar: {
						rightLabel: "Yes",
						helper:
							"Check this box if this director should be emailed for calendar/broadcast related matters, such as show absences/cancellations/changes.",
					},
					emailWeeklyAnalytics: {
						rightLabel: "Yes",
						helper:
							"Check this box if this director should be emailed every Sunday 12AM with the broadcast analytics for the week.",
					},
				},
				form: {
					buttons: {
						submit: {
							title: data ? "Edit Director" : "Add Director",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();
								if (data) {
									this.editDirector(value, (success) => {
										if (success) {
											this.newDirectorModal.iziModal("close");
										}
									});
								} else {
									this.addDirector(value, (success) => {
										if (success) {
											this.newDirectorModal.iziModal("close");
										}
									});
								}
							},
						},
					},
				},
			},
			data: data ? data : [],
		});
	}
}
