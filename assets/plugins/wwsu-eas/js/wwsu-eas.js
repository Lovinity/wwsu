"use strict";

// This class manages the EAS

// REQUIRES these WWSUmodules: noReq (WWSUreq), directorReq (WWSUreq) (only if sending new alerts or cancelling existing ones), WWSUMeta, WWSUutil, WWSUanimations
class WWSUeas extends WWSUdb {
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
			edit: "/eas/edit",
			get: "/eas/get",
			remove: "/eas/remove",
			test: "/eas/test",
			send: "/eas/send",
		};

		this.data = {
			get: {},
			test: {},
			send: {},
		};

		this.table;

		this.displayed = [];

		this.assignSocketEvent("eas", this.manager.socket);

		this.on("change", "WWSUeas", (db) => {
			this.emitNewAlerts();
			this.updateTable();
		});

		this.easModal = new WWSUmodal(`Active Emergency Alerts`, null, ``, true, {
			headerColor: "",
			overlayClose: true,
			zindex: 1100,
			timeout: 180000,
			timeoutProgressbar: true,
		});

		this.newEASModal = new WWSUmodal(`New EAS Alert`, null, ``, true, {
			headerColor: "",
			overlayClose: true,
			zindex: 1200,
		});
	}

	// Start the connection. Call this in socket connect event.
	init() {
		this.replaceData(
			this.manager.get("noReq"),
			this.endpoints.get,
			this.data.get
		);
	}

	/**
	 * Send an alert out through the internal Node.js EAS (but NOT the on-air EAS)
	 *
	 * @param {string} dom DOM query string of the element to block while processing
	 * @param {object} data The data to pass to the API
	 * @param {?function} cb Callback called after API request is made
	 */
	send(dom, data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom,
					method: "post",
					url: this.endpoints.send,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error sending alert",
							body:
								"There was an error sending the alert. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Alert Sent!",
							autohide: true,
							delay: 10000,
							body: `Alert was sent!`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error sending alert",
				body:
					"There was an error sending the alert. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Send a test alert through the internal EAS (but NOT the on-air EAS)
	 *
	 * @param {string} dom DOM query string of the element to block while processing
	 * @param {?function} cb Callback called after API request is made
	 */
	test(dom, cb) {
		try {
			this.manager
				.get("directorReq")
				.request(
					{ dom, method: "post", url: this.endpoints.test, data: {} },
					(response) => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error sending test alert",
								body:
									"There was an error sending the test alert. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg",
							});
							if (typeof cb === "function") cb(false);
						} else {
							$(document).Toasts("create", {
								class: "bg-success",
								title: "Test Alert Sent!",
								autohide: true,
								delay: 10000,
								body: `Test alert was sent!`,
							});
							if (typeof cb === "function") cb(true);
						}
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error sending test alert",
				body:
					"There was an error sending the test alert. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Edit and re-send an alert through the EAS
	 *
	 * @param {string} dom DOM query string of the element to block while processing
	 * @param {object} data The data to pass to the API
	 * @param {?function} cb Callback called after API request is made
	 */
	edit(dom, data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom,
					method: "post",
					url: this.endpoints.edit,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error editing alert",
							body:
								"There was an error editing the alert. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Alert Edited!",
							autohide: true,
							delay: 10000,
							body: `Alert was edited!`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error editing alert",
				body:
					"There was an error editing the alert. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Remove an EAS alert
	 *
	 * @param {string} dom DOM query string of the element to block while processing
	 * @param {object} data The data to pass to the API
	 * @param {?function} cb Callback called after API request is made
	 */
	remove(dom, data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom,
					method: "post",
					url: this.endpoints.remove,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error remove alert",
							body:
								"There was an error removing the alert. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Alert Removed!",
							autohide: true,
							delay: 10000,
							body: `Alert was removed!`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error removing alert",
				body:
					"There was an error removing the alert. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Emit events for new alerts
	 */
	emitNewAlerts() {
		this.find().forEach((record) => {
			if (this.displayed.indexOf(record.ID) === -1) {
				this.displayed.push(record.ID);
				this.emitEvent("newAlert", [record]);
			}
		});
	}

	/**
	 * Initialize table for managing EAS alerts
	 *
	 * @param {string} table DOM query string of the div where to place the table
	 */
	initTable(table) {
		this.manager.get("WWSUanimations").add("eas-init-table", () => {
			// Init html
			$(table).html(
				`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.timezone
						: moment.tz.guess()
				}.</p><p><button type="button" class="btn btn-block btn-success btn-eas-new">New EAS Alert</button><button type="button" class="btn btn-block btn-warning btn-eas-test">Send Test</button></p><table id="section-eas-table" class="table table-striped display responsive" style="width: 100%;"></table>`
			);

			this.manager.get("WWSUutil").waitForElement(`#section-eas-table`, () => {
				// Generate table
				this.table = $(`#section-eas-table`).DataTable({
					paging: true,
					data: [],
					columns: [
						{ title: "Source" },
						{ title: "Alert" },
						{ title: "Counties" },
						{ title: "Starts" },
						{ title: "Expires" },
						{ title: "Actions" },
					],
					columnDefs: [{ responsivePriority: 1, targets: 5 }],
					pageLength: 25,
					drawCallback: () => {
						// Action button click events
						$(".btn-eas-edit").unbind("click");
						$(".btn-eas-delete").unbind("click");

						$(".btn-eas-edit").click((e) => {
							let eas = this.find().find(
								(eas) => eas.ID === parseInt($(e.currentTarget).data("id"))
							);
							this.showEASForm(eas);
						});

						$(".btn-eas-delete").click((e) => {
							let eas = this.find().find(
								(eas) => eas.ID === parseInt($(e.currentTarget).data("id"))
							);
							this.manager.get("WWSUutil").confirmDialog(
								`Are you sure you want to <strong>permanently</strong> remove the alert "${eas.alert}"?
                            <ul>
                            <li><strong>Do NOT permanently remove an alert unless it is no longer active / in effect (such as if it is cancelled)</strong></li>
                            <li>This removes the EAS alert and will no longer be displayed internally.</li>
                            </ul>`,
								null,
								() => {
									this.remove(undefined, { ID: eas.ID });
								}
							);
						});
					},
				});

				// Add click event for new EAS button
				$(".btn-eas-new").unbind("click");
				$(".btn-eas-new").click(() => {
					this.showEASForm();
				});

				$(".btn-eas-test").unbind("click");
				$(".btn-eas-test").click(() => {
					this.manager.get("WWSUutil").confirmDialog(
						`<p>Please confirm you want to send out an internal EAS test. When sent, please check the following to ensure it worked:</p>
            <ul>
              <li>Active DJ Controls instances</li>
              <li>Public Display Signs (/display/public)</li>
              <li>Listener's Corner website</li>
            </ul>
            <p>The test will be active for 3 minutes.</p>`,
						null,
						() => {
							this.test();
						}
					);
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
		this.manager.get("WWSUanimations").add("eas-update-table", () => {
			if (this.table) {
				this.table.clear();
				this.find().forEach((eas) => {
					this.table.row.add([
						eas.source,
						eas.alert,
						eas.counties,
						moment
							.tz(
								eas.starts,
								this.manager.get("WWSUMeta")
									? this.manager.get("WWSUMeta").meta.timezone
									: moment.tz.guess()
							)
							.format("lll"),
						moment
							.tz(
								eas.expires,
								this.manager.get("WWSUMeta")
									? this.manager.get("WWSUMeta").meta.timezone
									: moment.tz.guess()
							)
							.format("lll"),
						eas.source === "WWSU"
							? `<div class="btn-group"><button class="btn btn-sm btn-warning btn-eas-edit" data-id="${eas.ID}" title="Edit certain elements of this alert and re-send it."><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-eas-delete" data-id="${eas.ID}" title="Delete / cancel this EAS elart."><i class="fas fa-trash"></i></button></div>`
							: `<div class="btn-group"><button class="btn btn-sm btn-warning" title="Cannot edit an alert that did not originate from WWSU." disabled><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" title="Cannot delete / cancel an alert that did not originate from WWSU." disabled><i class="fas fa-trash"></i></button></div>`,
					]);
				});
				this.table.draw();
			}
		});
	}

	/**
	 * Show a form for adding / editing EAS Alerts
	 *
	 * @param {?object} data If editing an alert, the original data.
	 */
	showEASForm(data) {
		this.newEASModal.body = ``;

		this.newEASModal.iziModal("open");

		// Correct timezones in data
		if (data) {
			data.starts = moment
				.tz(
					data.starts,
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.timezone
						: moment.tz.guess()
				)
				.toISOString(true);
			data.expires = moment
				.tz(
					data.expires,
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.timezone
						: moment.tz.guess()
				)
				.toISOString(true);
		}

		$(this.newEASModal.body).alpaca({
			schema: {
				title: data ? "Edit/Resend EAS Alert" : "New EAS Alert",
				type: "object",
				properties: {
					ID: {
						type: "number",
					},
					counties: {
						type: "string",
						required: true,
						title: "Counties Affected",
						maxLength: 255,
					},
					alert: {
						type: "string",
						required: true,
						readonly: typeof data !== "undefined",
						title: "Name of Alert",
						maxLength: 255,
					},
					severity: {
						type: "string",
						required: true,
						readonly: typeof data !== "undefined",
						enum: ["Extreme", "Severe", "Moderate", "Minor"],
						title: "Severity",
					},
					color: {
						type: "string",
						required: true,
						readonly: typeof data !== "undefined",
						title: "Alert Representative Color",
					},
					information: {
						type: "string",
						required: true,
						title: "Alert Information",
						maxLength: 1024,
					},
					starts: {
						format: "datetime",
						title: "Start Date/Time",
					},
					expires: {
						format: "datetime",
						title: "Expiration Date/Time",
					},
				},
			},
			options: {
				fields: {
					ID: {
						type: "hidden",
					},
					counties: {
						helper: "Comma-separated list of counties this alert affects.",
					},
					alert: {
						helpers: [
							"The official name of the alert being issued.",
							"<strong>CANNOT BE EDITED once set!</strong>",
						],
					},
					severity: {
						helpers: [
							"The severity of this alert.",
							"Minor = no risk of life or property. Moderate = Minor risk of life and property. Severe = moderate risk of life and property. Extreme = critical risk of life and property.",
							"<strong>CANNOT BE EDITED once set!</strong>",
						],
					},
					color: {
						type: "color",
						helpers: [
							"A color representing this alert; used as a background.",
							"<strong>CANNOT BE EDITED once set!</strong>",
						],
					},
					information: {
						type: "textarea",
						helper:
							"Information pertaining to this alert, such as what it is, what is happening, what and whom it affects, and what people should do.",
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
					},
				},
				form: {
					buttons: {
						submit: {
							title: data ? "Edit / Re-send Alert" : "Send Alert",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();
								if (data) {
									this.edit(
										`#modal-${this.newEASModal.id}-body`,
										value,
										(success) => {
											if (success) {
												this.newEASModal.iziModal("close");
											}
										}
									);
								} else {
									this.send(
										`#modal-${this.newEASModal.id}-body`,
										value,
										(success) => {
											if (success) {
												this.newEASModal.iziModal("close");
											}
										}
									);
								}
							},
						},
					},
				},
			},
			data: data ? data : {},
		});
	}
}
