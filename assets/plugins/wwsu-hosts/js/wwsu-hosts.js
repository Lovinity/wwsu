"use strict";

// This class manages WWSU hosts

// REQUIRES these WWSUmodules: WWSUMeta, WWSUrecipients, WWSUdjs, hostReq (WWSUreq), directorReq (WWSUreq), WWSUutil, WWSUanimations
class WWSUhosts extends WWSUdb {
	/**
	 * Construct the class
	 *
	 * @param {WWSUmodules} manager The modules class which initiated this module
	 * @param {object} options Options to be passed to this module
	 * @param {string} options.machineID The ID of this machine / host
	 * @param {string} options.app The app name and version running on this host
	 */
	constructor(manager, options) {
		super(); // Create the db

		this.manager = manager;

		this.endpoints = {
			edit: "/hosts/edit",
			get: "/hosts/get",
			remove: "/hosts/remove"
		};
		this.data = {
			get: { host: options.machineID, app: options.app }
		};

		this.host = options.machineID;

		this.table;

		this.assignSocketEvent("hosts", this.manager.socket);

		// Contains information about the current host
		this.client = {};

		// Update client info if it changed
		this.on("update", "WWSUhosts", record => {
			if (record.host === this.host) {
				this.client = record;
				this.emitEvent("clientChanged", [record]);
				$(".host-friendlyname").html(record.friendlyname);
			}
		});
		this.on("remove", "WWSUhosts", record => {
			if (record.host === this.host) {
				this.client = {};
				this.emitEvent("clientChanged", [null]);
				$(".host-friendlyname").html("Unknown Host");
			}
		});

		this.hostModal = new WWSUmodal(``, null, ``, true, {
			headerColor: "",
			overlayClose: false,
			zindex: 1100
		});

		this.on("change", "WWSUhosts", db => {
			this.updateTable();
		});
	}

	/**
	 * Get / authorize this host in the WWSU API.
	 * This should be called BEFORE any other WWSU init functions are called.
	 *
	 * @param {function} cb Callback w/ parameter. 1 = authorized and connected. 0 = not authorized, -1 = authorized, but already connected
	 */
	get(cb) {
		this.manager
			.get("hostReq")
			.request(
				{ method: "POST", url: this.endpoints.get, data: this.data.get },
				body => {
					try {
						this.client = body;
						$(".host-friendlyname").html(body.friendlyname);

						if (!this.client.authorized) {
							cb(0);
						} else {
							if (body.otherHosts) {
								this.query(body.otherHosts, true);
								delete this.client.otherHosts;
							}
							this.manager
								.get("WWSUrecipients")
								.addRecipientComputer(
									this.client.host,
									(recipient, success) => {
										if (success) {
											cb(1);
										} else {
											cb(-1);
										}
									}
								);
						}
					} catch (e) {
						cb(0);
						console.error(e);
					}
				}
			);
	}

	/**
	 * Edit a host in the system
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	edit(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${this.hostModal.id}`,
					method: "post",
					url: this.endpoints.edit,
					data: data
				},
				response => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error editing host",
							body:
								"There was an error editing the host. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg"
						});
						console.log(response);
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Host Edited",
							autohide: true,
							delay: 10000,
							body: `Host has been edited`
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error editing host",
				body:
					"There was an error editing the host. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Remove a host in the system
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	remove(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					method: "post",
					url: this.endpoints.remove,
					data: data
				},
				response => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error removing host",
							body:
								"There was an error removing the host. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg"
						});
						console.log(response);
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Host Removed",
							autohide: true,
							delay: 10000,
							body: `Host has been removed`
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error removing host",
				body:
					"There was an error removing the host. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Make a "Edit Host" Alpaca form in a modal.
	 */
	showHostForm(data) {
		this.hostModal.body = ``;

		this.hostModal.iziModal("open");

		let _djs = this.manager.get("WWSUdjs").find({ active: true });
		_djs.push({
			ID: 0,
			name: "(Do not allow anyone to start any kind of broadcast on this host)"
		});

		let rSilence = this.find({ silenceDetection: true }, true);
		let rRecord = this.find({ recordAudio: true }, true);
		let rDelay = this.find({ delaySystem: true }, true);
		let rEAS = this.find({ EAS: true }, true);

		$(this.hostModal.body).alpaca({
			schema: {
				title: data ? "Edit Host" : "New Host",
				type: "object",
				properties: {
					ID: {
						type: "number"
					},
					host: {
						type: "string",
						title: "Host ID",
						readonly: true
					},
					app: {
						type: "string",
						title: "Application / Version",
						readonly: true
					},
					friendlyname: {
						type: "string",
						required: true,
						title: "Friendly Name",
						maxLength: 255
					},
					authorized: {
						type: "boolean",
						title: "Is Authorized?"
					},
					lockToDJ: {
						type: "number",
						enum: _djs.map(dj => dj.ID),
						title: "Lock To DJ"
					},
					admin: {
						type: "boolean",
						title: "Allow access to DJ Controls Administration Menu?"
					},
					makeCalls: {
						type: "boolean",
						title: "Can start remote broadcasts?"
					},
					answerCalls: {
						type: "boolean",
						title: "Can answer/broadcast remote audio calls?"
					},
					silenceDetection: {
						type: "boolean",
						title: "Monitor / Report Silence?",
						readonly: rSilence && data && rSilence.ID !== data.ID
					},
					recordAudio: {
						type: "boolean",
						title: "Record audio?",
						readonly: rRecord && data && rRecord.ID !== data.ID
					},
					delaySystem: {
						type: "boolean",
						title: "Delay System Connected?",
						readonly: rDelay && data && rDelay.ID !== data.ID
					},
					EAS: {
						type: "boolean",
						title: "Emergency Alert System (EAS) Connected?",
						readonly: rEAS && data && rEAS.ID !== data.ID
					}
				}
			},
			options: {
				fields: {
					ID: {
						type: "hidden"
					},
					host: {
						helper:
							"This string hash identifies the host depending on the application and the machine. It cannot be edited."
					},
					app: {
						helper:
							"This is the name of the application and its version running on this host. It cannot be edited."
					},
					friendlyname: {
						helper:
							"Give a more descriptive name for this host. For example, you may want to specify the name of the person/DJ who is using this host."
					},
					authorized: {
						rightLabel: "Yes",
						helper:
							"If not checked, connection attempts to WWSU by this host will be rejected."
					},
					admin: {
						rightLabel: "Yes",
						helper:
							"(wwsu-dj-controls only) If checked, administration menu items will be visible and accessible. You should only do this for hosts running on the machines of directors."
					},
					lockToDJ: {
						type: "select",
						helpers: [
							"(wwsu-dj-controls only) Lock this host to a specific DJ (or to no one) to prevent starting live [in-studio] broadcasts from this host (remote broadcasts allowed only). Also, this prevents starting a remote broadcast unless a broadcast is on the schedule for that moment (or up to 5 minutes before start time) and this DJ is either a host or a co-host of that broadcast.",
							"Setting this to None means anyone can start any kind of broadcast at any time from this host, including in-studio broadcasts and unscheduled broadcasts."
						],
						optionLabels: _djs.map(dj => dj.name)
					},
					makeCalls: {
						rightLabel: "Yes",
						helper: "(wwsu-dj-controls only)"
					},
					answerCalls: {
						rightLabel: "Yes",
						helper:
							"(wwsu-dj-controls only) Can this host be chosen to receive and broadcast the audio call when starting a remote broadcast? <strong>You should not check this box except for hosts which can stream the audio over WWSU's airwaves.</strong> You should also ensure the correct output audio device is selected in the Audio Settings of DJ Controls."
					},
					silenceDetection: {
						rightLabel: "Yes",
						helpers: [
							"(wwsu-dj-controls only) Should this host be responsible for monitoring and reporting silence? <strong>Make sure the input device is properly set in audio settings</strong>; it should receive audio from the WWSU airwaves.",
							"If this check box is disabled / read-only, then another host is already set for silence detection. Please turn off silence detection on the other host first."
						]
					},
					recordAudio: {
						rightLabel: "Yes",
						helpers: [
							"(wwsu-dj-controls only) Should this host be responsible for recording on-air programming? <strong>Make sure the input device is properly set in audio settings</strong>; it should receive audio from the WWSU airwaves.",
							"If this check box is disabled / read-only, then another host is already set for recording audio. Please turn off audio recording on the other host first."
						]
					},
					delaySystem: {
						rightLabel: "Yes",
						helpers: [
							"(wwsu-dj-controls only) Is the delay system connected to this host's computer? <strong>Make sure the serial port is correctly chosen in serial port settings</strong>.",
							"If this check box is disabled / read-only, then another host is already set for the delay system. Please turn off delay system on the other host first."
						]
					},
					EAS: {
						rightLabel: "Yes",
						helpers: [
							"(wwsu-dj-controls only) Is the emergency alert system connected to this host's computer? <strong>Make sure the serial port is correctly chosen in serial port settings</strong>.",
							"If this check box is disabled / read-only, then another host is already set for the EAS. Please turn off EAS on the other host first."
						]
					}
				},
				form: {
					buttons: {
						submit: {
							title: data ? "Edit Host" : "Add Host",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();

								// Bug; when lockToDJ has no value, it should be set to null. Without this, it is undefined instead.
								if (typeof value.lockToDJ === "undefined")
									value.lockToDJ = null;

								this.edit(value, success => {
									if (success) {
										this.hostModal.iziModal("close");
									}
								});
							}
						}
					}
				}
			},
			data: data ? data : []
		});
	}

	/**
	 * Is this DJ Controls the host of the current broadcast?
	 *
	 * @return {boolean} True if this host started the current broadcast, false otherwise
	 */
	get isHost() {
		return this.client.ID === this.manager.get("WWSUMeta").meta.host;
	}

	/**
	 * If another host started the current broadcast, display a confirmation prompt to prevent accidental interference with another broadcast.
	 *
	 * @param {string} action Description of the action being taken
	 * @param {function} cb Callback when we are the host, or "yes" is chosen on the confirmation dialog.
	 */
	promptIfNotHost(action, cb) {
		if (this.manager.get("WWSUMeta").meta.host && !this.isHost) {
			this.manager
				.get("WWSUutil")
				.confirmDialog(
					`<strong>Your host did not start the current broadcast</strong>. Are you sure you want to ${action}? You may be interfering with someone else's broadcast.`,
					null,
					() => {
						cb();
					}
				);
		} else {
			cb();
		}
	}

	/**
	 * Initialize the data table for managing hosts.
	 *
	 * @param {string} table DOM query string div container where the table should be placed.
	 */
	initTable(table) {
		this.manager.get("WWSUanimations").add("hosts-init-table", () => {
			// Init html
			$(table).html(
				`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.timezone
						: moment.tz.guess()
				}.</p><table id="section-hosts-table" class="table table-striped display responsive" style="width: 100%;"></table>`
			);

			this.manager
				.get("WWSUutil")
				.waitForElement(`#section-hosts-table`, () => {
					// Generate table
					this.table = $(`#section-hosts-table`).DataTable({
						paging: true,
						data: [],
						columns: [
							{ title: "Name" },
							{ title: "Authorized?" },
							{ title: "Admin Menu?" },
							{ title: "Remote Audio" },
							{ title: "Responsibilities" },
							{ title: "Actions" }
						],
						columnDefs: [{ responsivePriority: 1, targets: 5 }],
						order: [
							[0, "asc"],
							[1, "asc"]
						],
						pageLength: 100,
						buttons: ["copy", "csv", "excel", "pdf", "print", "colvis"],
						drawCallback: () => {
							// Action button click events
							$(".btn-host-edit").unbind("click");
							$(".btn-host-delete").unbind("click");

							$(".btn-host-edit").click(e => {
								let host = this.find().find(
									host => host.ID === parseInt($(e.currentTarget).data("id"))
								);
								this.showHostForm(host);
							});

							$(".btn-host-delete").click(e => {
								let host = this.find().find(
									host => host.ID === parseInt($(e.currentTarget).data("id"))
								);
								this.manager.get("WWSUutil").confirmDialog(
									`Are you sure you want to remove the host "${host.friendlyname}"?
							<ul>
							<li>This host will no longer have access to WWSU.</li>
							<li>If the host is connected to WWSU, they will be disconnected.</li>
							<li>All options for this host will be removed.</li>
							<li>This host will be removed from the list. However, should this host try to connect to WWSU again, it will re-appear in the list but with all settings erased (as if it was a new host without authorization to connect).</li>
                            </ul>`,
									null,
									() => {
										this.remove({ ID: host.ID });
									}
								);
							});
						}
					});

					this.table
						.buttons()
						.container()
						.appendTo(`#section-hosts-table_wrapper .col-md-6:eq(0)`);

					// Update with information
					this.updateTable();
				});
		});
	}

	/**
	 * Update the host management table if it exists
	 */
	updateTable() {
		this.manager.get("WWSUanimations").add("hosts-update-table", () => {
			if (this.table) {
				this.table.clear();
				this.find().forEach(host => {
					this.table.row.add([
						host.friendlyname,
						`${
							host.authorized
								? `<span class="badge badge-success" title="${host.friendlyname} is authorized to connect to WWSU."><i class="fas fa-check-circle p-1"></i>Yes</span>`
								: `<span class="badge badge-danger" title="${host.friendlyname} is NOT authorized to connect to WWSU; they will be denied access on any attempts."><i class="far fa-times-circle p-1"></i>No</span>`
						}`,
						`${
							host.admin
								? `<span class="badge badge-success" title="${host.friendlyname} has access to the DJ Controls administration menu."><i class="fas fa-check-circle p-1"></i>Yes</span>`
								: `<span class="badge badge-danger" title="${host.friendlyname} does not have access to the DJ Controls administration menu."><i class="far fa-times-circle p-1"></i>No</span>`
						}`,
						`<ul>${
							host.makeCalls
								? `<li><span class="badge bg-indigo" title="${host.friendlyname} can start remote broadcasts."><i class="fas fa-broadcast-tower p-1"></i>Can Start Remotes</span></li>`
								: ``
						}${
							host.answerCalls
								? `<li><span class="badge bg-indigo" title="${host.friendlyname} can play audio for remote broadcasts over the airwaves via its configured Output Device."><i class="fas fa-volume-up p-1"></i>Can Broadcast Remotes</span></li>`
								: ``
						}</ul>`,
						`<ul>${
							host.silenceDetection
								? `<li><span class="badge bg-orange" title="${host.friendlyname} is monitoring for, and reporting, silence on the air, via its configured Silence Detection Input Devices."><i class="fas fa-volume-mute p-1"></i>Silence Detection</span></li>`
								: ``
						}${
							host.recordAudio
								? `<li><span class="badge badge-primary" title="${host.friendlyname} is recording on-air audio from its configured Record Audio Input Devices and saving them to its configured file path."><i class="fas fa-circle p-1"></i>Record On-Air Audio</span></li>`
								: ``
						}${
							host.delaySystem
								? `<li><span class="badge bg-fuchsia" title="${host.friendlyname} is monitoring the status of the delay system via its configured Serial Port and will trigger it when someone clicks the dump button in DJ Controls."><i class="fas fa-hourglass-start p-1"></i>Monitor / Operate Delay System</span></li>`
								: ``
						}${
							host.EAS
								? `<li><span class="badge badge-danger" title="${host.friendlyname} is monitoring the Emergency Alert System (EAS) via its configured Serial Port."><i class="fas fa-bolt p-1"></i>Monitor / Operate EAS</span></li>`
								: ``
						}</ul>`,
						`<div class="btn-group"><button class="btn btn-sm btn-warning btn-host-edit" data-id="${host.ID}" title="Edit Host"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-host-delete" data-id="${host.ID}" title="Remove Host"><i class="fas fa-trash"></i></button></div>`
					]);
				});
				this.table.draw();
			}
		});
	}
}
