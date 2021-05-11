"use strict";

/* global WWSUdb */

// This class manages DJs from WWSU.

// REQUIRES these WWSUmodules: noReq (WWSUreq), directorReq (WWSUreq), hostReq (WWSUreq), WWSUlogs, WWSUMeta, WWSUutil, WWSUanimations
class WWSUdjs extends WWSUdb {
	/**
	 * Construct the class
	 *
	 * @param {WWSUmodules} manager The modules class which initiated this module
	 * @param {object} options Options to be passed to this module
	 */
	constructor(manager, options) {
		super(); // Create the db

		this.manager = manager;

		this.endpoints = {
			get: "/djs/get",
			add: "/djs/add",
			edit: "/djs/edit",
			remove: "/djs/remove",
			active: "/djs/active",
			inactive: "/djs/inactive",
		};
		this.data = {
			get: {},
		};

		this.assignSocketEvent("djs", this.manager.socket);

		this.table;

		this.djsModal = new WWSUmodal(`Manage DJs`, null, ``, true, {
			headerColor: "",
			overlayClose: false,
			zindex: 1100,
		});

		this.djModal = new WWSUmodal(``, null, ``, true, {
			headerColor: "",
			overlayClose: false,
			zindex: 1100,
		});

		this.djInfoModal = new WWSUmodal(``, null, ``, true, {
			headerColor: "",
			width: 800,
			zindex: 1100,
		});

		this.newDjModal = new WWSUmodal(`New DJ`, null, ``, true, {
			headerColor: "",
			overlayClose: false,
			zindex: 1110,
		});

		this.on("change", "WWSUdjs", () => {
			this.updateTable();
		});
	}

	// Initialize connection. Call this on socket connect event.
	init() {
		this.replaceData(
			this.manager.get("noReq"),
			this.endpoints.get,
			this.data.get
		);
	}

	/**
	 * Generate a simple DataTables.js table of the DJs in the system
	 *
	 */
	showDJs() {
		this.djsModal.body = `<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
			this.manager.get("WWSUMeta")
				? this.manager.get("WWSUMeta").meta.timezone
				: moment.tz.guess()
		}</p><table id="modal-${
			this.djsModal.id
		}-table" class="table table-striped" style="min-width: 100%;"></table>`;
		// Generate new DJ button
		this.djsModal.footer = `<button type="button" class="btn btn-outline-success" id="modal-${this.djsModal.id}-new" data-dismiss="modal">New DJ</button>`;

		this.this.manager
			.get("WWSUutil")
			.waitForElement(`#modal-${this.djsModal.id}-new`, () => {
				$(`#modal-${this.djsModal.id}-new`).unbind("click");
				$(`#modal-${this.djsModal.id}-new`).click(() => {
					this.showDJForm();
				});
			});

		this.djsModal.iziModal("open");

		$(this.djsModal.body).block({
			message: "<h1>Loading...</h1>",
			css: { border: "3px solid #a00" },
			timeout: 30000,
			onBlock: () => {
				let table = $(`#modal-${this.djsModal.id}-table`).DataTable({
					scrollCollapse: true,
					paging: true,
					data: [],
					columns: [
						{ title: "DJ Name" },
						{ title: "Full Name" },
						{ title: "Active?" },
						{ title: "Last Seen" },
					],
					order: [[0, "asc"]],
					pageLength: 100,
				});
				this.find().forEach((dj) => {
					table.rows.add([
						[
							dj.name || "Unknown",
							dj.fullName || "Unknown",
							dj.active ? `Yes` : `No`,
							moment
								.tz(
									dj.lastSeen,
									this.manager.get("WWSUMeta")
										? this.manager.get("WWSUMeta").meta.timezone
										: moment.tz.guess()
								)
								.format("LLL"),
						],
					]);
				});
				table.draw();
				$(this.djsModal.body).unblock();
			},
		});
	}

	/**
	 * Make a "New DJ" Alpaca form in a modal.
	 */
	showDJForm(data) {
		// reset login to null when filling out default values
		if (data && data.login) data.login = null;

		this.newDjModal.body = ``;

		this.newDjModal.iziModal("open");

		let _djs = this.find();

		$(this.newDjModal.body).alpaca({
			schema: {
				title: data ? "Edit DJ" : "New DJ",
				type: "object",
				properties: {
					ID: {
						type: "number",
					},
					name: {
						type: "string",
						required: true,
						title: "Name of DJ as used on radio",
						maxLength: 255,
					},
					realName: {
						type: "string",
						title: "Real full name of person",
						maxLength: 255,
					},
					email: {
						type: "string",
						format: "email",
						title: "Change email address",
						maxLength: 255,
					},
					login: {
						type: "string",
						format: "password",
						title: "Change login password",
						maxLength: 255,
					},
				},
			},
			options: {
				fields: {
					ID: {
						type: "hidden",
					},
					name: {
						helper:
							"This is the name that appears publicly on shows, the website, etc. You may not use the same DJ name twice.",
						validator: function (callback) {
							let value = this.getValue();
							let _dj = _djs.find((dj) => dj.name === value);
							if (value.includes(" -") || value.includes(";")) {
								callback({
									status: false,
									message: `DJ names may not contain " - " or semicolons. These are used by the system as separators. If you are adding multiple DJs, please add each one by one.`,
								});
								return;
							}
							if ((!data || data.name !== value) && _dj) {
								if (_dj.active) {
									callback({
										status: false,
										message: `An active DJ with the specified name already exists. Please choose another name.`,
									});
								} else {
									callback({
										status: false,
										message: `An inactive DJ with the specified name already exists. Please remove the inactive DJ first, or mark the DJ as active and edit that one instead.`,
									});
								}
								return;
							}
							callback({
								status: true,
							});
						},
					},
					realName: {
						helper:
							"Used for directors to help easily identify who this person is.",
					},
					email: {
						helper:
							"Change the email address used to send the DJ show changes / cancellations and analytics. Type remove@example.com to remove their email address. <strong>Campus email is highly recommended.</strong>",
					},
					login: {
						helper:
							"DJs will use this to log in to their online DJ panel. In the future, this may be used to log in to prod / onair computers during schedule shows or bookings. You might choose to use their door PIN. Type remove to remove their password.",
					},
				},
				form: {
					buttons: {
						submit: {
							title: data ? "Edit DJ" : "Add DJ",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();
								if (data) {
									this.editDJ(value, (success) => {
										if (success) {
											this.djsModal.iziModal("close");
											this.newDjModal.iziModal("close");
										}
									});
								} else {
									this.addDJ(value, (success) => {
										if (success) {
											this.djsModal.iziModal("close");
											this.newDjModal.iziModal("close");
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

	/**
	 * Add a new DJ to the system via the API
	 *
	 * @param {Object} data The data to send in the request to the API to add a DJ
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	addDJ(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${this.newDjModal.id}`,
					method: "post",
					url: this.endpoints.add,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-warning",
							title: "Error adding",
							body:
								"There was an error adding the DJ. Please make sure you filled all fields correctly.",
							delay: 10000,
						});
						cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "DJ Added",
							autohide: true,
							delay: 10000,
							body: `DJ has been created`,
						});
						cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error adding DJ",
				body:
					"There was an error adding a new DJ. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			cb(false);
		}
	}

	/**
	 * Edit a DJ in the system
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	editDJ(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${this.newDjModal.id}`,
					method: "post",
					url: this.endpoints.edit,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-warning",
							title: "Error editing",
							body:
								"There was an error editing the DJ. Please make sure you filled all fields correctly.",
							delay: 10000,
						});
						console.log(response);
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "DJ Edited",
							autohide: true,
							delay: 10000,
							body: `DJ has been edited`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error adding DJ",
				body:
					"There was an error editing the DJ. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Mark a DJ as inactive in the system.
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	inactiveDJ(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${this.newDjModal.id}`,
					method: "post",
					url: this.endpoints.inactive,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error marking DJ as inactive",
							body:
								"There was an error marking the DJ as inactive. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "DJ Removed",
							autohide: true,
							delay: 30000,
							body: `DJ was marked inactive.<br /><strong>WARNING!</strong> If this DJ had any DJ Controls installed on personal machines, please remove access under Administration -> Hosts.`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error marking DJ inactive",
				body:
					"There was an error marking the DJ as inactive. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Mark a DJ as active in the system.
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	activeDJ(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${this.newDjModal.id}`,
					method: "post",
					url: this.endpoints.active,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error marking DJ as active",
							body:
								"There was an error marking the DJ as active. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "DJ Removed",
							autohide: true,
							delay: 5000,
							body: `DJ was marked active.`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error marking DJ active",
				body:
					"There was an error marking the DJ as active. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Permanently remove a DJ from the system.
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	removeDJ(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${this.newDjModal.id}`,
					method: "post",
					url: this.endpoints.remove,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error removing DJ",
							body:
								"There was an error removing the DJ. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "DJ Removed",
							autohide: true,
							delay: 30000,
							body: `DJ was removed.<br /><strong>WARNING!</strong> If this DJ had any DJ Controls installed on personal machines, please remove access under Administration -> Hosts.`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error removing DJ",
				body:
					"There was an error removing the DJ. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Initialize the table for managing DJs.
	 *
	 * @param {string} table The DOM query string for the div container to place the table.
	 */
	initTable(table) {
		this.manager.get("WWSUanimations").add("djs-init-table", () => {
			// Init html
			$(table).html(
				`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.timezone
						: moment.tz.guess()
				}.</p><p><button type="button" class="btn btn-block btn-success btn-dj-new">New DJ</button></p><table id="section-djs-table" class="table table-striped display responsive" style="width: 100%;"></table>`
			);

			this.manager.get("WWSUutil").waitForElement(`#section-djs-table`, () => {
				// Generate table
				this.table = $(`#section-djs-table`).DataTable({
					paging: true,
					data: [],
					columns: [
						{ title: "DJ Handle" },
						{ title: "Real Name" },
						{ title: "Active?" },
						{ title: "Last Seen" },
						{ title: "Actions" },
					],
					columnDefs: [{ responsivePriority: 1, targets: 4 }],
					order: [[0, "asc"]],
					pageLength: 100,
					buttons: ["copy", "csv", "excel", "pdf", "print", "colvis"],
					drawCallback: () => {
						// Action button click events
						$(".btn-dj-logs").unbind("click");
						$(".btn-dj-analytics").unbind("click");
						$(".btn-dj-edit").unbind("click");
						$(".btn-dj-inactive").unbind("click");
						$(".btn-dj-active").unbind("click");
						$(".btn-dj-delete").unbind("click");
						$(".btn-dj-notes").unbind("click");

						$(".btn-dj-analytics").click((e) => {
							let dj = this.find().find(
								(dj) => dj.ID === parseInt($(e.currentTarget).data("id"))
							);
							this.showDJAnalytics(dj);
						});

						$(".btn-dj-logs").click((e) => {
							let dj = this.find().find(
								(dj) => dj.ID === parseInt($(e.currentTarget).data("id"))
							);
							this.showDJLogs(dj);
						});

						$(".btn-dj-notes").click((e) => {
							let dj = this.find().find(
								(dj) => dj.ID === parseInt($(e.currentTarget).data("id"))
							);
							this.manager.get("WWSUdjnotes").showDJNotes(dj);
						});

						$(".btn-dj-edit").click((e) => {
							let dj = this.find().find(
								(dj) => dj.ID === parseInt($(e.currentTarget).data("id"))
							);
							this.showDJForm(dj);
						});

						$(".btn-dj-inactive").click((e) => {
							let dj = this.find().find(
								(dj) => dj.ID === parseInt($(e.currentTarget).data("id"))
							);
							this.manager.get("WWSUutil").confirmDialog(
								`Are you sure you want to <strong>mark the DJ "${dj.name}" as inactive</strong>?
                            <ul>
                            <li><strong>Do NOT mark a DJ as inactive until/unless they are no longer going to air any broadcasts for the forseeable future.</strong></li>
							<li>An inactive DJ will be permanently removed from the system after going one year without airing a broadcast ("last seen") if not re-activated. This means their analytics can no longer be viewed once permanently removed (but show logs will still be available).</li>
							<li>The DJ will no longer receive any emails sent via the DJ Controls email tab so long as they are inactive.</li>
                            <li>The DJ can no longer log in or authorize, such as to access the DJ Panel, as long as they are inactive.</li>
							<li>Any hosts which has this DJ set as the "Lock to DJ" will have that setting changed to "Do not allow anyone to start any kind of broadcast on this host". However, the host will still be authorized to connect to WWSU unless manually edited or removed.</li>
                            <li>The DJ will be removed from all calendar events they are listed on.</li>
                            <li><strong>Any events which this DJ was the primary host of will also be marked inactive and its schedules removed</strong> (If you don't want this, please assign a new host to these events before marking this DJ inactive.). Subscribers of those shows will be notified it has been discontinued.</li>
							<li>Inactive DJs cannot be set as event hosts.</li>
                            </ul>`,
								dj.name,
								() => {
									this.inactiveDJ({ ID: dj.ID });
								}
							);
						});

						$(".btn-dj-active").click((e) => {
							let dj = this.find().find(
								(dj) => dj.ID === parseInt($(e.currentTarget).data("id"))
							);
							this.manager.get("WWSUutil").confirmDialog(
								`Are you sure you want to <strong>mark the DJ "${dj.name}" as active</strong>?
                            <ul>
							<li>The DJ will start to receive emails sent via the DJ Controls -> Email tab.</li>
                            <li>The DJ can log in or authorize again, such as to access the DJ Panel.</li>
							<li>The DJ can now be set as a host / co-host for events again.</li>
							<li><strong>Hosts which had this DJ set as the "Lock to DJ" will need to be manually edited</strong>; this setting was switched to no one can start any broadcast when the DJ was marked inactive.</li>
							<li><strong>Events which had this DJ as a host or co-host will need to be manually edited</strong>; This DJ was removed as co-host from all events when marked inactive. And events which this DJ was the primary host were marked inactive.</li>
                            </ul>`,
								null,
								() => {
									this.activeDJ({ ID: dj.ID });
								}
							);
						});

						$(".btn-dj-delete").click((e) => {
							let dj = this.find().find(
								(dj) => dj.ID === parseInt($(e.currentTarget).data("id"))
							);
							this.manager.get("WWSUutil").confirmDialog(
								`Are you sure you want to <strong>permanently remove the DJ "${dj.name}"</strong>?
                            <ul>
                            <li><strong>It is NOT recommended permanently removing a DJ unless the DJ was added out of error</strong>. Instead, mark a DJ as inactive (the DJ will then be deleted automatically a year after their last broadcast).</li>
							<li>This DJ's analytics will no longer be available (but show logs will still be available).</li>
                            <li>The DJ can no longer log in or authorize, such as to access the DJ Panel.</li>
							<li>Any hosts which has this DJ set as the "Lock to DJ" will have that setting changed to "Do not allow anyone to start any kind of broadcast on this host". However, the host will still be authorized to connect to WWSU unless manually edited or removed.</li>
                            <li>The DJ will be removed from all calendar events they are listed on.</li>
                            <li><strong>Any events which this DJ was the primary host of will also be marked inactive and their schedules removed</strong> (If you don't want this, please assign a new host to these events before deleting this DJ.). Subscribers of those shows will be notified it has been discontinued.
                            </ul>`,
								dj.name,
								() => {
									this.removeDJ({ ID: dj.ID });
								}
							);
						});
					},
				});

				this.table
					.buttons()
					.container()
					.appendTo(`#section-djs-table_wrapper .col-md-6:eq(0)`);

				// Add click event for new DJ button
				$(".btn-dj-new").unbind("click");
				$(".btn-dj-new").click(() => {
					this.showDJForm();
				});

				// Update with information
				this.updateTable();
			});
		});
	}

	/**
	 * Update the DJ management table if it exists
	 */
	updateTable() {
		this.manager.get("WWSUanimations").add("djs-update-table", () => {
			if (this.table) {
				this.table.clear();
				this.find().forEach((dj) => {
					let icon = `<span class="badge badge-danger" title="INACTIVE: This DJ is inactive and will be deleted one year from the Last Seen date unless they air a broadcast."><i class="far fa-times-circle p-1"></i>No</span>`;
					if (!dj.active) {
						icon = `<span class="badge badge-danger" title="INACTIVE: This DJ is inactive and will be deleted one year from the Last Seen date unless they air a broadcast."><i class="far fa-times-circle p-1"></i>No</span>`;
					} else if (
						!dj.lastSeen ||
						moment(dj.lastSeen)
							.add(30, "days")
							.isBefore(
								moment(
									this.manager.get("WWSUMeta")
										? this.manager.get("WWSUMeta").meta.time
										: undefined
								)
							)
					) {
						icon = `<span class="badge badge-warning" title="ACTIVE, but did not air a broadcast for over 30 days."><i class="far fa-question-circle p-1"></i>30+ Days Ago</span>`;
					} else if (
						moment(dj.lastSeen)
							.add(7, "days")
							.isBefore(
								moment(
									this.manager.get("WWSUMeta")
										? this.manager.get("WWSUMeta").meta.time
										: undefined
								)
							)
					) {
						icon = `<span class="badge badge-info" title="ACTIVE, but did not air a broadcast for between 7 and 30 days."><i class="far fa-check-circle p-1"></i>7 - 30 Days Ago</span>`;
					} else {
						icon = `<span class="badge badge-success" title="ACTIVE; this DJ aired a broadcast in the last 7 days."><i class="fas fa-check-circle p-1"></i>Yes</span>`;
					}
					this.table.row.add([
						dj.name || "",
						dj.realName || "",
						`${icon}`,
						dj.lastSeen
							? moment
									.tz(
										dj.lastSeen,
										this.manager.get("WWSUMeta")
											? this.manager.get("WWSUMeta").meta.timezone
											: moment.tz.guess()
									)
									.format("LLLL")
							: "Unknown / Long Ago",
						dj.active
							? `<div class="btn-group"><button class="btn btn-sm btn-primary btn-dj-analytics" data-id="${dj.ID}" title="View DJ and Show Analytics"><i class="fas fa-chart-line"></i></button><button class="btn btn-sm btn-secondary btn-dj-logs" data-id="${dj.ID}" title="View Show Logs"><i class="fas fa-clipboard-list"></i></button><button class="btn btn-sm bg-indigo btn-dj-notes" data-id="${dj.ID}" title="View/Edit Notes and Remote Credits"><i class="fas fa-sticky-note"></i></button><button class="btn btn-sm btn-warning btn-dj-edit" data-id="${dj.ID}" title="Edit DJ"><i class="fas fa-edit"></i></button><button class="btn btn-sm bg-orange btn-dj-inactive" data-id="${dj.ID}" title="Mark DJ as inactive"><i class="fas fa-times-circle"></i></button></div>`
							: `<div class="btn-group"><button class="btn btn-sm btn-primary btn-dj-analytics" data-id="${dj.ID}" title="View DJ and Show Analytics"><i class="fas fa-chart-line"></i></button><button class="btn btn-sm btn-secondary btn-dj-logs" data-id="${dj.ID}" title="View Show Logs"><i class="fas fa-clipboard-list"></i></button><button class="btn btn-sm bg-indigo btn-dj-notes" data-id="${dj.ID}" title="View/Edit Notes and Remote Credits"><i class="fas fa-sticky-note"></i></button><button class="btn btn-sm btn-success btn-dj-active" data-id="${dj.ID}" title="Mark DJ as active"><i class="fas fa-check-circle"></i></button><button class="btn btn-sm btn-danger btn-dj-delete" data-id="${dj.ID}" title="Permanently remove this DJ"><i class="fas fa-trash"></i></button></div>`,
					]);
				});
				this.table.draw();
			}
		});
	}

	/**
	 * Display DJ analytics and analytics for their shows in a modal.
	 *
	 * @param {object} dj The DJ record to get analytics
	 */
	showDJAnalytics(dj) {
		this.djInfoModal.title = `Analytics for ${dj.name} (${
			dj.realName || `Unknown Person`
		})`;
		this.djInfoModal.body = ``;

		let makeTable = (dom, analytic) => {
			this.manager.get("WWSUutil").waitForElement(`${dom}`, () => {
				// Generate table
				$(`${dom}`).DataTable({
					paging: false,
					data: [
						[
							"a. Live Shows Aired",
							analytic.week.shows,
							analytic.semester.shows,
							analytic.overall.shows,
						],
						[
							"b. Prerecorded Shows Aired",
							analytic.week.prerecords,
							analytic.semester.prerecords,
							analytic.overall.prerecords,
						],
						[
							"c. Remote Shows Aired",
							analytic.week.remotes,
							analytic.semester.remotes,
							analytic.overall.remotes,
						],
						[
							"d. Playlists Aired",
							analytic.week.playlists,
							analytic.semester.playlists,
							analytic.overall.playlists,
						],
						[
							"e. Airtime",
							moment
								.duration(analytic.week.showtime, "minutes")
								.format("h [hours], m [minutes]"),
							moment
								.duration(analytic.semester.showtime, "minutes")
								.format("h [hours], m [minutes]"),
							moment
								.duration(analytic.overall.showtime, "minutes")
								.format("h [hours], m [minutes]"),
						],
						[
							"f. Online Listener Time",
							moment
								.duration(analytic.week.listeners, "minutes")
								.format("h [hours], m [minutes]"),
							moment
								.duration(analytic.semester.listeners, "minutes")
								.format("h [hours], m [minutes]"),
							moment
								.duration(analytic.overall.listeners, "minutes")
								.format("h [hours], m [minutes]"),
						],
						[
							"g. Web Messages Exchanged",
							analytic.week.messages,
							analytic.semester.messages,
							analytic.overall.messages,
						],
						[
							"h. Remote Credits",
							typeof analytic.week.remoteCredits !== "undefined"
								? analytic.week.remoteCredits
								: "N/A",
							typeof analytic.semester.remoteCredits !== "undefined"
								? analytic.semester.remoteCredits
								: "N/A",
							typeof analytic.overall.remoteCredits !== "undefined"
								? analytic.overall.remoteCredits
								: "N/A",
						],
						[
							"i. Warning / Discipline Points",
							typeof analytic.week.warningPoints !== "undefined"
								? analytic.week.warningPoints
								: "N/A",
							typeof analytic.semester.warningPoints !== "undefined"
								? analytic.semester.warningPoints
								: "N/A",
							typeof analytic.overall.warningPoints !== "undefined"
								? analytic.overall.warningPoints
								: "N/A",
						],
						[
							"j. Shows Started 5+ Minutes Early",
							analytic.week.earlyStart,
							analytic.semester.earlyStart,
							analytic.overall.earlyStart,
						],
						[
							"k. Shows Started 10+ Minutes Late",
							analytic.week.lateStart,
							analytic.semester.lateStart,
							analytic.overall.lateStart,
						],
						[
							"l. Shows Ended 10+ Minutes Early",
							analytic.week.earlyEnd,
							analytic.semester.earlyEnd,
							analytic.overall.earlyEnd,
						],
						[
							"m. Shows Ended 5+ Minutes Late",
							analytic.week.lateEnd,
							analytic.semester.lateEnd,
							analytic.overall.lateEnd,
						],
						[
							"n. Absences / No-Shows",
							analytic.week.absences,
							analytic.semester.absences,
							analytic.overall.absences,
						],
						[
							"o. Cancellations",
							analytic.week.cancellations,
							analytic.semester.cancellations,
							analytic.overall.cancellations,
						],
						[
							"p. Missed Top-Of-Hour ID Breaks",
							analytic.week.missedIDs,
							analytic.semester.missedIDs,
							analytic.overall.missedIDs,
						],
						[
							"q. Silence Alarms Triggered",
							analytic.week.silences,
							analytic.semester.silences,
							analytic.overall.silences,
						],
						[
							"r. Reputation Score (out of 100)",
							analytic.week.reputationPercent,
							analytic.semester.reputationPercent,
							analytic.overall.reputationPercent,
						],
					],
					columns: [
						{ title: "Analytic" },
						{ title: "Past Week" },
						{ title: "This Semester" },
						{ title: "Past Year" },
					],
					buttons: ["copy", "csv", "excel", "pdf", "print", "colvis"],
				});

				this.table
					.buttons()
					.container()
					.appendTo(`${dom}_wrapper .col-md-6:eq(0)`);
			});
		};

		this.djInfoModal.iziModal("open");

		this.manager.get("WWSUlogs").getShowtime(
			`#modal-${this.djInfoModal.id}`,
			{
				djs: [dj.ID],
				start: moment(
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.time
						: undefined
				)
					.subtract(1, "years")
					.toISOString(true),
				end: moment(
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.time
						: undefined
				).toISOString(true),
			},
			(analytics) => {
				if (!analytics) return;
				let analytic = analytics[0][dj.ID];
				let html = `<div class="card card-widget widget-user-2 p-1">
            <div class="widget-user-header bg-info">
              <h3 class="widget-user-username">DJ Analytics</h3>
            </div>
            <div class="card-footer p-1">
				<table id="section-djs-${dj.ID}-analytics-dj" class="table table-striped display responsive" style="width: 100%;"></table>
			</div>
          </div>`;

				makeTable(`#section-djs-${dj.ID}-analytics-dj`, analytic);

				for (let show in analytics[1]) {
					if (show > 0) {
						if (Object.prototype.hasOwnProperty.call(analytics[1], show)) {
							let analytic = analytics[1][show];
							html += `<div class="card card-widget widget-user-2 p-1">
            <div class="widget-user-header bg-secondary">
              <h3 class="widget-user-username">Show Analytics (${analytic.name})</h3>
            </div>
            <div class="card-footer p-1">
				<table id="section-djs-${dj.ID}-analytics-show-${show}" class="table table-striped display responsive" style="width: 100%;"></table>
            </div>
          </div>`;
							makeTable(
								`#section-djs-${dj.ID}-analytics-show-${show}`,
								analytic
							);
						}
					}
				}
				this.djInfoModal.body = html;
			}
		);
	}

	/**
	 * Show attendance records for the provided DJ in a modal
	 *
	 * @param {object} dj The DJ record to view attendance records
	 */
	showDJLogs(dj) {
		this.djInfoModal.title = `Attendance Logs for ${dj.name} (${
			dj.realName || `Unknown Person`
		})`;
		this.djInfoModal.body = `<div class="callout callout-info">
		<h5>Logs Lifespan</h5>
		<p>
			Operation logs are deleted automatically after 2 years. This is
			to keep the system running fast and smooth.
		</p>
	</div>
	<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
		this.manager.get("WWSUMeta")
			? this.manager.get("WWSUMeta").meta.timezone
			: moment.tz.guess()
	}.</p><table id="section-djs-table-logs" class="table table-striped display responsive" style="width: 100%;"></table>`;

		this.djInfoModal.iziModal("open");

		this.manager
			.get("WWSUutil")
			.waitForElement(`#section-djs-table-logs`, () => {
				this.manager
					.get("WWSUlogs")
					.getAttendance(
						`#modal-${this.djInfoModal.id}`,
						{ dj: dj.ID },
						(logs) => {
							let table = $(`#section-djs-table-logs`).DataTable({
								paging: true,
								data:
									!logs || typeof logs.map !== "function"
										? []
										: logs.map((record) => {
												let theClass = "secondary";
												let theType = `Unknown`;
												if (record.event.toLowerCase().startsWith("show: ")) {
													theClass = "danger";
													theType = "Show";
												} else if (
													record.event.toLowerCase().startsWith("prerecord: ")
												) {
													theClass = "pink";
													theType = "Prerecord";
												} else if (
													record.event.toLowerCase().startsWith("sports: ")
												) {
													theClass = "success";
													theType = "Sports";
												} else if (
													record.event.toLowerCase().startsWith("remote: ")
												) {
													theClass = "indigo";
													theType = "Remote";
												} else if (
													record.event.toLowerCase().startsWith("genre: ")
												) {
													theClass = "info";
													theType = "Genre";
												} else if (
													record.event.toLowerCase().startsWith("playlist: ")
												) {
													theClass = "primary";
													theType = "Playlist";
												}
												if (
													record.actualStart !== null &&
													record.actualEnd !== null &&
													record.happened === 1
												) {
													return [
														record.ID,
														moment
															.tz(
																record.actualStart,
																this.manager.get("WWSUMeta")
																	? this.manager.get("WWSUMeta").meta.timezone
																	: moment.tz.guess()
															)
															.format("L"),
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
														`<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`,
													];
												} else if (
													record.actualStart !== null &&
													record.actualEnd === null &&
													record.happened === 1
												) {
													return [
														record.ID,
														moment
															.tz(
																record.actualStart,
																this.manager.get("WWSUMeta")
																	? this.manager.get("WWSUMeta").meta.timezone
																	: moment.tz.guess()
															)
															.format("L"),
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
														`<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`,
													];
												} else if (
													record.actualStart === null &&
													record.actualEnd === null &&
													record.happened === -1
												) {
													return [
														record.ID,
														moment
															.tz(
																record.scheduledStart,
																this.manager.get("WWSUMeta")
																	? this.manager.get("WWSUMeta").meta.timezone
																	: moment.tz.guess()
															)
															.format("L"),
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
														`<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`,
													];
												} else if (
													record.actualStart === null &&
													record.actualEnd === null &&
													record.happened === 0
												) {
													return [
														record.ID,
														moment
															.tz(
																record.scheduledStart,
																this.manager.get("WWSUMeta")
																	? this.manager.get("WWSUMeta").meta.timezone
																	: moment.tz.guess()
															)
															.format("L"),
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
														`<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`,
													];
												} else if (
													record.actualStart !== null &&
													record.actualEnd !== null
												) {
													return [
														record.ID,
														moment
															.tz(
																record.actualStart,
																this.manager.get("WWSUMeta")
																	? this.manager.get("WWSUMeta").meta.timezone
																	: moment.tz.guess()
															)
															.format("L"),
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
																			? this.manager.get("WWSUMeta").meta
																					.timezone
																			: moment.tz.guess()
																	)
																	.format("h:mm A")
															: `ONGOING`,
														`<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`,
													];
												} else {
													return [
														record.ID,
														moment
															.tz(
																record.scheduledStart,
																this.manager.get("WWSUMeta")
																	? this.manager.get("WWSUMeta").meta.timezone
																	: moment.tz.guess()
															)
															.format("L"),
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
														`<button class="btn btn-sm btn-primary btn-logs-view" data-id="${record.ID}" title="View this log"><i class="fas fa-eye"></i></button>`,
													];
												}
										  }),
								columns: [
									{ title: "ID" },
									{ title: "Date" },
									{ title: "Icon" },
									{ title: "Event" },
									{ title: "Start" },
									{ title: "End" },
									{ title: "Actions" },
								],
								columnDefs: [{ responsivePriority: 1, targets: 6 }],
								order: [[0, "desc"]],
								pageLength: 50,
								buttons: ["copy", "csv", "excel", "pdf", "print", "colvis"],
								drawCallback: () => {
									// Add log buttons click event
									$(".btn-logs-view").unbind("click");
									$(".btn-logs-view").click((e) => {
										let id = parseInt($(e.currentTarget).data("id"));
										this.manager.get("WWSUlogs").viewLog(id);
									});
								},
							});

							table
								.buttons()
								.container()
								.appendTo(`#section-djs-table-logs_wrapper .col-md-6:eq(0)`);
						}
					);
			});
	}
}
