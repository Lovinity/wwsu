"use strict";

/* global WWSUdb */

// This class manages announcements from WWSU.

// REQUIRES these WWSUmodules: noReq (WWSUreq), directorReq (WWSUreq) (only if managing announcements), WWSUMeta, WWSUutil, WWSUanimations
class WWSUannouncements extends WWSUdb {
	/**
	 * Create the announcements class.
	 *
	 * @param {WWSUmodules} manager The modules class which initiated this module
	 * @param {object} options Options to be passed to this module
	 * @param {Array} options.types Array of strings containing each type of announcements to register
	 */
	constructor(manager, options) {
		super(); // Create the db

		this.manager = manager;

		this.endpoints = {
			add: "/announcements/add",
			edit: "/announcements/edit",
			get: "/announcements/get",
			remove: "/announcements/remove",
		};
		this.data = {
			get: { types: options.types },
		};

		this.assignSocketEvent("announcements", this.manager.socket);

		this.table;

		this.formModal = new WWSUmodal(``, null, ``, true, {
			headerColor: "",
			zindex: 1100,
		});
	}

	// Initialize the connection and get initial data; should be called on socket connect event.
	init() {
		this.replaceData(
			this.manager.get("noReq"),
			this.endpoints.get,
			this.data.get
		);
	}

	/**
	 * Initialize data table of announcements management
	 *
	 * @param {string} table DOM query string of the div container which to place the table and "add announcement" button
	 */
	initTable(table) {
		this.manager.get("WWSUanimations").add("announcements-init-table", () => {
			// Init html
			$(table).html(
				`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.timezone
						: moment.tz.guess()
				}.</p><p><button type="button" class="btn btn-block btn-success btn-announcement-new">New Announcement</button></p><table id="section-announcements-table" class="table table-striped display responsive" style="width: 100%;"></table>`
			);

			this.manager
				.get("WWSUutil")
				.waitForElement(`#section-announcements-table`, () => {
					// Generate table
					this.table = $(`#section-announcements-table`).DataTable({
						paging: true,
						data: [],
						columns: [
							{ title: "Title" },
							{ title: "Type" },
							{ title: "Start" },
							{ title: "End" },
							{ title: "Priority" },
							{ title: "Actions" },
						],
						columnDefs: [{ responsivePriority: 1, targets: 5 }],
						order: [
							[3, "asc"],
							[2, "asc"],
						],
						buttons: ["colvis"],
						pageLength: 25,
						drawCallback: () => {
							// Action button click events
							$(".btn-announcement-edit").unbind("click");
							$(".btn-announcement-delete").unbind("click");

							$(".btn-announcement-edit").click((e) => {
								let announcement = this.find().find(
									(announcement) =>
										announcement.ID === parseInt($(e.currentTarget).data("id"))
								);
								this.showForm(announcement);
							});

							$(".btn-announcement-delete").click((e) => {
								let announcement = this.find().find(
									(announcement) =>
										announcement.ID === parseInt($(e.currentTarget).data("id"))
								);
								this.manager
									.get("WWSUutil")
									.confirmDialog(
										`Are you sure you want to <strong>permanently</strong> remove the ${announcement.type} announcement "${announcement.title}"?`,
										null,
										() => {
											this.remove({ ID: announcement.ID });
										}
									);
							});
						},
					});

					this.table
						.buttons()
						.container()
						.appendTo(`#section-announcements-table_wrapper .col-md-6:eq(0)`);

					// Add click event for new announcement button
					$(".btn-announcement-new").unbind("click");
					$(".btn-announcement-new").click(() => {
						this.showForm();
					});

					// Update with information
					this.updateTable();
				});
		});
	}

	/**
	 * Add a new announcement to the WWSU system.
	 *
	 * @param {object} data The data to pass to the API.
	 * @param {?function} cb Callback function with true if success, false if not.
	 */
	add(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: this.formModal ? `#modal-${this.formModal.id}` : undefined,
					method: "post",
					url: this.endpoints.add,
					data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error adding announcement",
							body:
								"There was an error adding the announcement. Please report this to the engineer.",
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
							title: "Announcement added",
							autohide: true,
							delay: 10000,
							body: `The announcement was added.`,
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
				title: "Error adding announcement",
				body:
					"There was an error adding the announcement. Please report this to the engineer.",
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
	 * Edit an announcement in the WWSU system
	 *
	 * @param {object} data The data to pass to the API.
	 * @param {?function} cb Callback function with true if success, false if not.
	 */
	edit(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: this.formModal ? `#modal-${this.formModal.id}` : undefined,
					method: "post",
					url: this.endpoints.edit,
					data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error editing announcement",
							body:
								"There was an error editing the announcement. Please report this to the engineer.",
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
							title: "Announcement edited",
							autohide: true,
							delay: 10000,
							body: `The announcement was edited.`,
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
				title: "Error editing announcement",
				body:
					"There was an error editing the announcement. Please report this to the engineer.",
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
	 * Remove an announcement from WWSU via API.
	 *
	 * @param {object} data The data to pass as parameters to the endpoint.
	 * @param {?function} cb Callback function with true if success, false if not.
	 */
	remove(data, cb) {
		try {
			this.manager
				.get("directorReq")
				.request(
					{ method: "post", url: this.endpoints.remove, data },
					(response) => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error removing announcement",
								body:
									"There was an error removing the announcement. Please report this to the engineer.",
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
								title: "Announcement removed",
								autohide: true,
								delay: 10000,
								body: `The announcement was removed.`,
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
				title: "Error removing announcement",
				body:
					"There was an error removing the announcement. Please report this to the engineer.",
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
	 * Update the announcement management table if it exists
	 */
	updateTable() {
		this.manager.get("WWSUanimations").add("announcements-update-table", () => {
			if (this.table) {
				this.table.clear();
				this.find().forEach((announcement) => {
					this.table.row.add([
						announcement.title,
						announcement.type,
						moment
							.tz(
								announcement.starts,
								this.manager.get("WWSUMeta")
									? this.manager.get("WWSUMeta").meta.timezone
									: moment.tz.guess()
							)
							.format("LLLL"),
						moment
							.tz(
								announcement.expires,
								this.manager.get("WWSUMeta")
									? this.manager.get("WWSUMeta").meta.timezone
									: moment.tz.guess()
							)
							.format("LLLL"),
						`<span class="text-${announcement.level}"><i class="fas fa-dot-circle"></i></span>`,
						`<div class="btn-group"><button class="btn btn-sm btn-warning btn-announcement-edit" data-id="${announcement.ID}" title="Edit Announcement"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-announcement-delete" data-id="${announcement.ID}" title="Delete Announcement"><i class="fas fa-trash"></i></button></div>`,
					]);
				});
				this.table.draw();
			}
		});
	}

	/**
	 * Show new / edit announcement form in a modal and Alpaca form.
	 *
	 * @param {?object} data If editing an announcement, this is the announcement's original properties.
	 */
	showForm(data) {
		// Init modal data
		this.formModal.title = data ? `Edit Announcement` : `New Announcement`;
		this.formModal.footer = ``;
		this.formModal.body = ``;

		// Create form
		$(this.formModal.body).alpaca({
			schema: {
				type: "object",
				properties: {
					ID: {
						type: "number",
					},
					type: {
						type: "string",
						required: true,
						title: "Type",
						enum: [
							"djcontrols",
							"website-toast",
							"website-nowplaying",
							"website-chat",
							"website-schedule",
							"website-request",
							"website-directors",
							"timesheet",
							"display-internal",
							"display-internal-sticky",
							"display-public",
							"display-public-sticky",
						],
					},
					level: {
						type: "string",
						required: true,
						title: "Importance Level",
						enum: ["danger", "warning", "info", "success", "secondary"],
					},
					title: {
						type: "string",
						required: true,
						title: "Title",
						maxLength: 32,
					},
					announcement: {
						type: "string",
						title: "Content",
						required: true,
					},
					displayTime: {
						type: "number",
						default: 15,
						title: "Display Time (seconds)",
						minimum: 5,
						maximum: 60,
					},
					starts: {
						title: "Starts",
						format: "datetime",
					},
					expires: {
						title: "Expires",
						format: "datetime",
					},
				},
			},
			options: {
				fields: {
					ID: {
						type: "hidden",
					},
					type: {
						optionLabels: [
							"DJ Controls",
							"Website (Pop-up)",
							"Website (Now Playing Page)",
							"Website (Chat Page)",
							"Website (Schedule Page)",
							"Website (Request Page)",
							"Website (Directors Page)",
							"Timesheet Computer",
							"Internal Display Sign",
							"Internal Display Sign (sticky)",
							"Public Display Sign",
							"Public Display Sign (sticky)",
						],
						helper: "Where should this announcement be displayed?",
					},
					level: {
						optionLabels: [
							"Danger (red)",
							"Warning (yellow)",
							"Info (teal)",
							"Success (green)",
							"Secondary (gray)",
						],
						helper: "Level determines the color of the alert background/badge.",
					},
					title: {
						helper: "Keep short and concise; there is a 32-character limit.",
					},
					announcement: {
						type: "tinymce",
						options: {
							toolbar:
								"undo redo | bold italic underline strikethrough | fontselect fontsizeselect formatselect | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | fullscreen preview | image link | ltr rtl",
							plugins:
								"autoresize preview paste importcss searchreplace autolink save directionality visualblocks visualchars fullscreen image link table hr pagebreak nonbreaking toc insertdatetime advlist lists wordcount imagetools textpattern noneditable help quickbars",
							menubar: "file edit view insert format tools table help",
						},
						helper:
							"For display signs, content will be auto-scaled to fit the screen. Avoid using large images when also using text for display sign announcements; the text will become very small when scaled.",
					},
					displayTime: {
						helper:
							"How long the announcement is displayed. Only applies to Website (Pop-up) or any of the display sign announcement types.",
					},
					starts: {
						dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
							.parseZone(
								this.manager.get("WWSUMeta")
									? this.manager.get("WWSUMeta").meta.time
									: undefined
							)
							.format("Z")}`,
						picker: {
							inline: true,
							sideBySide: true,
						},
						helper: `Defaults to the timezone ${
							this.manager.get("WWSUMeta")
								? this.manager.get("WWSUMeta").meta.timezone
								: moment.tz.guess()
						}`,
					},
					expires: {
						dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
							.parseZone(
								this.manager.get("WWSUMeta")
									? this.manager.get("WWSUMeta").meta.time
									: undefined
							)
							.format("Z")}`,
						picker: {
							inline: true,
							sideBySide: true,
						},
						helper: `Defaults to the timezone ${
							this.manager.get("WWSUMeta")
								? this.manager.get("WWSUMeta").meta.timezone
								: moment.tz.guess()
						}`,
					},
				},

				form: {
					buttons: {
						submit: {
							title: `${data ? `Edit` : `Add`} Announcement`,
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();

								if (!data) {
									this.add(value, (success) => {
										if (success) {
											this.formModal.iziModal("close");
										}
									});
								} else {
									this.edit(value, (success) => {
										if (success) {
											this.formModal.iziModal("close");
										}
									});
								}
							},
						},
					},
				},
			},
			data: data ? data : null,
		});

		this.formModal.iziModal("open");
	}
}
