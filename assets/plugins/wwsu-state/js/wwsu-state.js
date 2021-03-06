"use strict";

// This class handles states and operations.

// REQUIRES these WWSUmodules: WWSUhosts, WWSUcalendar, WWSUconfig, hostReq (WWSureq), WWSUutil
class WWSUstate extends WWSUevents {
	/**
	 * Construct the class
	 *
	 * @param {WWSUmodules} manager The modules class which initiated this module
	 * @param {object} options Options to be passed to this module
	 */
	constructor(manager, options) {
		super();

		this.manager = manager;

		this.endpoints = {
			return: "/state/return",
			queuePSA: "/songs/queue-psa",
			automation: "/state/automation",
			break: "/state/break",
			topAdd: "/songs/queue-top-add",
			liner: "/songs/queue-liner",
			dump: "/delay/dump",
			delayStatus: "/delay/status",
			live: "/state/live",
			remote: "/state/remote",
			sports: "/state/sports",
			sportsRemote: "/state/sports-remote",
		};

		this.data = {
			get: {},
		};

		this.broadcastModal = new WWSUmodal(``, `operations`, ``, true, {
			headerColor: "",
			overlayClose: false,
			zindex: 1100,
		});

		this.pendingRemote;
	}

	/**
	 * Report delay system status to WWSU
	 *
	 * @param {object} data Data to send to the endpoint
	 * @param {?function} cb Callback executed when the request is completed
	 */
	delayStatus(data, cb) {
		try {
			this.manager
				.get("hostReq")
				.request(
					{ method: "post", url: this.endpoints.delayStatus, data },
					(response) => {
						if (response !== "OK") {
							if (typeof cb === "function") {
								cb(false);
							}
						} else {
							if (typeof cb === "function") {
								cb(true);
							}
						}
					}
				);
		} catch (e) {
			if (typeof cb === "function") {
				cb(false);
			}
			console.error(e);
		}
	}

	/**
	 * Call WWSU API to return from a break.
	 *
	 * @param {object} data Data to send to the API
	 * @param {?function} cb Callback function executed after the request was made.
	 */
	return(data, cb) {
		try {
			this.manager.get("WWSUhosts").promptIfNotHost(`return from break`, () => {
				this.manager
					.get("hostReq")
					.request(
						{ method: "post", url: this.endpoints.return, data },
						(response) => {
							if (response !== "OK") {
								$(document).Toasts("create", {
									class: "bg-danger",
									title: "Error returning",
									body:
										"There was an error returning from break. Either you are not in a break, or your DJ controls prevents you from returning when you are not on the air. If neither of these are true, please contact the engineer.",
									autoHide: true,
									delay: 15000,
									icon: "fas fa-skull-crossbones fa-lg",
								});
								if (typeof cb === "function") {
									cb(false);
								}
							} else {
								if (typeof cb === "function") {
									cb(true);
								}
							}
						}
					);
			});
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error returning",
				body:
					"There was an error returning from break. Please report this to the engineer.",
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
	 * Call WWSU API to add a PSA in the queue.
	 *
	 * @param {object} data Data to send to the API
	 * @param {?function} cb Callback after the request is made
	 */
	queuePSA(data, cb) {
		try {
			this.manager
				.get("WWSUhosts")
				.promptIfNotHost(
					`queue a ${
						data && data.duration ? `${data.duration}-second` : ``
					} PSA`,
					() => {
						this.manager
							.get("hostReq")
							.request(
								{ method: "post", url: this.endpoints.queuePSA, data },
								(response) => {
									if (response !== "OK") {
										$(document).Toasts("create", {
											class: "bg-danger",
											title: "Error adding PSA",
											body:
												"There was an error adding the PSA. Your DJ Controls might not allow you to do this when you are not on the air. If this is not the case, please contact the engineer.",
											autoHide: true,
											delay: 15000,
											icon: "fas fa-skull-crossbones fa-lg",
										});
										if (typeof cb === "function") {
											cb(false);
										}
									} else {
										$(document).Toasts("create", {
											class: "bg-success",
											title: "PSA Added",
											autohide: true,
											delay: 5000,
											body: `PSA was added to the queue`,
										});
										if (typeof cb === "function") {
											cb(true);
										}
									}
								}
							);
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error adding PSA",
				body:
					"There was an error adding the PSA. Please report this to the engineer.",
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
	 * Call the WWSU API to end the current broadcast and go to automation.
	 *
	 * @param {object} data Data to send to the API
	 * @param {?function} cb Callback function after request is made (contains responded analytic data as parameter)
	 */
	automation(data, cb) {
		try {
			this.manager
				.get("WWSUhosts")
				.promptIfNotHost(
					`go to ${
						data && data.transition ? `break for next show` : `automation`
					}`,
					() => {
						this.manager
							.get("hostReq")
							.request(
								{ method: "post", url: this.endpoints.automation, data },
								(response) => {
									if (response !== "OK") {
										$(document).Toasts("create", {
											class: "bg-danger",
											title: "Error ending broadcast",
											body:
												"There was an error ending the broadcast. Your DJ Controls might not allow you to end broadcasts you did not start. If this is not the case, please contact the engineer.",
											autoHide: true,
											delay: 15000,
											icon: "fas fa-skull-crossbones fa-lg",
										});
										if (typeof cb === "function") {
											cb(false);
										}
									} else {
										if (typeof cb === "function") {
											cb(response);
										}
									}
								}
							);
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error ending broadcast",
				body:
					"There was an error ending the broadcast. Please report this to the engineer.",
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
	 * Tell the WWSU API to go to a break.
	 *
	 * @param {object} data Data to send to the API
	 * @param {?function} cb Callback function after request is made
	 */
	break(data, cb) {
		try {
			let apiRequest = () => {
				this.manager
					.get("hostReq")
					.request(
						{ method: "post", url: this.endpoints.break, data },
						(response) => {
							if (response !== "OK") {
								$(document).Toasts("create", {
									class: "bg-danger",
									title: "Error going to break",
									body:
										"There was an error going to break. Your DJ Controls might not allow you to go to break when you are not on the air. If this is not the case, please contact the engineer.",
									autoHide: true,
									delay: 15000,
									icon: "fas fa-skull-crossbones fa-lg",
								});
								if (typeof cb === "function") {
									cb(false);
								}
							} else {
								if (typeof cb === "function") {
									cb(true);
								}
							}
						}
					);
			};

			// Skip host prompting if going to break because of a problem
			if (data.problem) {
				apiRequest();
			} else {
				this.manager
					.get("WWSUhosts")
					.promptIfNotHost(
						`go to ${data && data.halftime ? `extended ` : ``}break`,
						() => {
							apiRequest();
						}
					);
			}
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error going to break",
				body:
					"There was an error going to break. Please report this to the engineer.",
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
	 * Tell the WWSU API to queue a Top Add
	 *
	 * @param {object} data Data to pass to the API
	 * @param {?function} cb Callback executed when request is completed
	 */
	queueTopAdd(data, cb) {
		try {
			this.manager.get("WWSUhosts").promptIfNotHost(`play a Top Add`, () => {
				this.manager
					.get("hostReq")
					.request(
						{ method: "post", url: this.endpoints.topAdd, data },
						(response) => {
							if (response !== "OK") {
								$(document).Toasts("create", {
									class: "bg-danger",
									title: "Error queuing Top Add",
									body:
										"There was an error queuing a Top Add. Your DJ Controls might not allow you to do this when you are not on the air. If this is not the case, please contact the engineer.",
									autoHide: true,
									delay: 15000,
									icon: "fas fa-skull-crossbones fa-lg",
								});
								if (typeof cb === "function") {
									cb(false);
								}
							} else {
								$(document).Toasts("create", {
									class: "bg-success",
									title: "Top Add Queued",
									autohide: true,
									delay: 5000,
									body: `Top Add was added to the queue`,
								});
								if (typeof cb === "function") {
									cb(true);
								}
							}
						}
					);
			});
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error queuing Top Add",
				body:
					"There was an error queuing a Top Add. Please report this to the engineer.",
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
	 * Tell the WWSU API to queue a liner
	 *
	 * @param {object} data Data to pass to the API
	 * @param {?function} cb Callback function to execute when request is completed
	 */
	queueLiner(data, cb) {
		try {
			this.manager.get("WWSUhosts").promptIfNotHost(`play a liner`, () => {
				this.manager
					.get("hostReq")
					.request(
						{ method: "post", url: this.endpoints.liner, data },
						(response) => {
							if (response !== "OK") {
								$(document).Toasts("create", {
									class: "bg-danger",
									title: "Error queuing liner",
									body:
										"There was an error queuing a liner. Your DJ Controls might not allow you to do this when you are not on the air. If this is not the case, please contact the engineer.",
									autoHide: true,
									delay: 15000,
									icon: "fas fa-skull-crossbones fa-lg",
								});
								if (typeof cb === "function") {
									cb(false);
								}
							} else {
								$(document).Toasts("create", {
									class: "bg-success",
									title: "Liner Queued",
									autohide: true,
									delay: 5000,
									body: `Liner was added to the queue`,
								});
								if (typeof cb === "function") {
									cb(true);
								}
							}
						}
					);
			});
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error queuing liner",
				body:
					"There was an error queuing a liner. Please report this to the engineer.",
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
	 * Tell the WWSU API to send the dump command to the delay system.
	 *
	 * @param {object} data Data to pass to the API
	 * @param {?function} cb Callback to execure when request is complete
	 */
	dump(data, cb) {
		try {
			this.manager
				.get("WWSUhosts")
				.promptIfNotHost(`dump audio on the delay system`, () => {
					this.manager
						.get("hostReq")
						.request(
							{ method: "post", url: this.endpoints.dump, data },
							(response) => {
								if (response !== "OK") {
									$(document).Toasts("create", {
										class: "bg-danger",
										title: "Error dumping",
										body:
											"There was an error triggering the dump on the delay system. Your DJ Controls might not allow you to do this when you are not on the air. If this is not the case, please contact the engineer.",
										autoHide: true,
										delay: 15000,
										icon: "fas fa-skull-crossbones fa-lg",
									});
									if (typeof cb === "function") {
										cb(false);
									}
								} else {
									$(document).Toasts("create", {
										class: "bg-success",
										title: "Dump command sent",
										autohide: true,
										delay: 10000,
										body: `Dump command was sent to the delay system. If successful, the number of seconds on the dump button will go down shortly.`,
									});
									if (typeof cb === "function") {
										cb(true);
									}
								}
							}
						);
				});
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error dumping",
				body:
					"There was an error triggering the dump on the delay system. Please report this to the engineer.",
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
	 * Show a form for starting a live in-studio show in a modal via Alpaca.
	 */
	showLiveForm() {
		if (this.manager.get("WWSUhosts").client.lockToDJ !== null) {
			$(document).Toasts("create", {
				class: "bg-warning",
				title: "Action not allowed",
				delay: 20000,
				autohide: true,
				body: `You are not allowed to start a live (in-studio) broadcast from this host. Please contact a director if you think this is an error.`,
			});
			return;
		}

		this.broadcastModal.title = `Start Live (in-studio) Broadcast`;
		this.broadcastModal.body = ``;
		this.broadcastModal.iziModal("open");

		let whatShouldBePlaying = this.manager
			.get("WWSUcalendar")
			.whatShouldBePlaying()
			.sort((a, b) => b.priority - a.priority);
		whatShouldBePlaying = whatShouldBePlaying.find(
			(record) => record.type === "show"
		);

		$(this.broadcastModal.body).alpaca({
			schema: {
				title: "Start Live (in-studio) Broadcast",
				type: "object",
				properties: {
					acknowledge: {
						type: "boolean",
						default: false,
						title: "I read the announcements",
					},
					djs: {
						type: "string",
						required: true,
						title: "DJ handles",
						maxLength: 256,
					},
					name: {
						type: "string",
						title: "Name of Show",
						required: true,
						maxLength: 256,
					},
					topic: {
						type: "string",
						title: "Episode Topic / Description",
						maxLength: 256,
					},
				},
			},
			options: {
				fields: {
					djs: {
						helper: `Each DJ handle should be separated with a "; " (semicolon-space) if providing multiple DJs.`,
						validator: function (callback) {
							let value = this.getValue();
							if (value.includes(" -")) {
								callback({
									status: false,
									message: `Invalid; DJ handles may not contain " - " as this is a separation used by the system.`,
								});
								return;
							}
							if (!whatShouldBePlaying || whatShouldBePlaying.hosts !== value) {
								callback({
									status: true,
									message: `Not on the immediate schedule (proceeding could result in the show being flagged as unauthorized)`,
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
					name: {
						validator: function (callback) {
							let value = this.getValue();
							if (value.includes(" -")) {
								callback({
									status: false,
									message: `Invalid; Show names may not contain " - " as this is a separation used by the system.`,
								});
								return;
							}
							if (!whatShouldBePlaying || whatShouldBePlaying.name !== value) {
								callback({
									status: true,
									message: `Not on the immediate schedule (proceeding could result in the show being flagged as unauthorized)`,
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
					topic: {
						helper:
							"Limit: 256 characters. The topic will be displayed on the website and display signs. It will also be posted in the WWSU Discord.",
						type: "textarea",
						placeholder: whatShouldBePlaying
							? whatShouldBePlaying.description
							: "",
					},
					acknowledge: {
						rightLabel: "Yes",
						helper:
							"Please check this box to indicate you read the announcements on the announcements tab of DJ Controls.",
						validator: function (callback) {
							let value = this.getValue();
							if (!value) {
								callback({
									status: false,
									message: `You must acknowledge that you read the announcements on the announcements tab of DJ Controls before doing a broadcast.`,
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
				},
				form: {
					buttons: {
						submit: {
							title: "Start Broadcast",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();

								value = {
									topic: value.topic,
									showname: `${value.djs} - ${value.name}`
								};

								this.goLive(value, (success) => {
									if (success) {
										this.broadcastModal.iziModal("close");
									}
								});
							},
						},
					},
				},
			},
			data: {
				djs: whatShouldBePlaying
					? this.manager
							.get("WWSUutil")
							.truncateText(whatShouldBePlaying.hosts, 256)
					: "",
				name: whatShouldBePlaying
					? this.manager
							.get("WWSUutil")
							.truncateText(whatShouldBePlaying.name, 256)
					: "",
				topic: whatShouldBePlaying
					? this.manager
							.get("WWSUutil")
							.truncateText(whatShouldBePlaying.description, 256)
					: "",
			},
		});
	}

	/**
	 * Tell the WWSU API to start a live broadcast.
	 *
	 * @param {object} data Data to send to the endpoint
	 * @param {?function} cb Callback executed when the request is completed
	 */
	goLive(data, cb) {
		try {
			this.manager
				.get("WWSUhosts")
				.promptIfNotHost(`start a live in-studio broadcast`, () => {
					this.manager
						.get("hostReq")
						.request(
							{ method: "post", url: this.endpoints.live, data },
							(response) => {
								if (response !== "OK") {
									$(document).Toasts("create", {
										class: "bg-danger",
										title: "Error starting live broadcast",
										body:
											"There was an error starting the live broadcast. Live broadcasts may only be started from the WWSU studio (otherwise, you must do a remote broadcast). If you are in the WWSU studio, please contact the engineer.",
										autoHide: true,
										delay: 15000,
										icon: "fas fa-skull-crossbones fa-lg",
									});
									if (typeof cb === "function") {
										cb(false);
									}
								} else {
									if (typeof cb === "function") {
										cb(true);
									}
								}
							}
						);
				});
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error starting live broadcast",
				body:
					"There was an error starting the live broadcast. Please report this to the engineer.",
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
	 * Show a form for starting a remote broadcast
	 */
	showRemoteForm() {
		// Reject if host does not have makeCalls permission
		if (!this.manager.get("WWSUhosts").client.makeCalls) {
			$(document).Toasts("create", {
				class: "bg-warning",
				title: "Remote broadcasts not allowed",
				delay: 20000,
				autohide: true,
				body: `You are not allowed to start a remote broadcast from this host. Please contact a director if you think this is an error.`,
			});
			return;
		}

		// Find what should be airing right now; filter to only the highest priority remote broadcast
		let whatShouldBePlaying = this.manager
			.get("WWSUcalendar")
			.whatShouldBePlaying()
			.sort((a, b) => b.priority - a.priority);
		whatShouldBePlaying = whatShouldBePlaying.find(
			(record) => record.type === "remote"
		);

		// Reject if no remote broadcasts scheduled and this host is locked to a DJ.
		if (
			this.manager.get("WWSUhosts").client.lockToDJ !== null &&
			!whatShouldBePlaying
		) {
			$(document).Toasts("create", {
				class: "bg-warning",
				title: "No remote broadcasts scheduled",
				delay: 30000,
				autohide: true,
				body: `You are not allowed to start a remote broadcast from this host at this time; there are no broadcasts scheduled. Please wait until 5 minutes before show start time and try again. Please contact a director if you think this is an error.`,
			});
			return;
		}

		// Reject if the DJ locked to this host is not part of the currently scheduled remote broadcast
		if (
			this.manager.get("WWSUhosts").client.lockToDJ !== null &&
			whatShouldBePlaying &&
			[
				whatShouldBePlaying.hostDJ,
				whatShouldBePlaying.cohostDJ1,
				whatShouldBePlaying.cohostDJ2,
				whatShouldBePlaying.cohostDJ3,
			].indexOf(this.manager.get("WWSUhosts").client.lockToDJ) === -1
		) {
			$(document).Toasts("create", {
				class: "bg-warning",
				title: "Scheduled remote broadcast is not yours",
				delay: 30000,
				autohide: true,
				body: `The remote broadcast scheduled to air at this time, ${whatShouldBePlaying.hosts} - ${whatShouldBePlaying.name}, may not be started from this host. Please contact a director if you think this is an error.`,
			});
			return;
		}

		this.broadcastModal.title = `Start Remote Broadcast`;
		this.broadcastModal.body = ``;
		this.broadcastModal.iziModal("open");

		// Set lock to DJ to a local letiable as Alpaca's validators do not use arrow functions
		let lockToDJ = this.manager.get("WWSUhosts").client.lockToDJ;

		// Get the hosts that may be called for an audio broadcast
		let callableHosts = this.manager.get("WWSUrecipients").find({
			answerCalls: true,
			status: 5,
		});

		$(this.broadcastModal.body).alpaca({
			schema: {
				title: "Start Remote Broadcast",
				type: "object",
				properties: {
					audioAcknowledgement: {
						type: "boolean",
						default: false,
						title: "Settings in Audio menu are correct",
					},
					acknowledge: {
						type: "boolean",
						default: false,
						title: "I read the announcements",
					},
					hostCall: {
						type: "number",
						enum: callableHosts.map((host) => host.hostID),
						required: true,
						title: "Host to call",
					},
					djs: {
						type: "string",
						required: true,
						readonly: this.manager.get("WWSUhosts").client.lockToDJ !== null,
						title: "DJ handles",
						maxLength: 256,
					},
					name: {
						type: "string",
						title: "Name of Show",
						readonly: this.manager.get("WWSUhosts").client.lockToDJ !== null,
						required: true,
						maxLength: 256,
					},
					topic: {
						type: "string",
						title: "Episode Topic / Description",
						maxLength: 256,
					},
				},
			},
			options: {
				fields: {
					audioAcknowledgement: {
						rightLabel: "Yes",
						helper: `You confirm you went into the Audio page of DJ Controls and ensured the devices you want broadcast have "Remote Broadcasts" checked, their volumes are set to where you want them, and you tested (via the VU meters) to ensure DJ Controls is receiving audio from those devices.`,
						validator: function (callback) {
							let value = this.getValue();
							if (!value) {
								callback({
									status: false,
									message: `You must acknowledge that you checked the Audio settings and ensured everything is set correctly and working.`,
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
					acknowledge: {
						rightLabel: "Yes",
						helper:
							"Please check this box to indicate you read the announcements on the announcements tab of DJ Controls. Important information regarding DJs, shows/broadcasts, or WWSU might be posted here.",
						validator: function (callback) {
							let value = this.getValue();
							if (!value) {
								callback({
									status: false,
									message: `You must acknowledge that you read the announcements on the announcements tab of DJ Controls.`,
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
					djs: {
						helpers: [
							`Each DJ handle should be separated with a "; " (semicolon-space) if providing multiple DJs.`,
							`If this field is uneditable but incorrect, please contact a director ASAP.`,
						],
						validator: function (callback) {
							let value = this.getValue();
							if (value.includes(" -")) {
								callback({
									status: false,
									message: `Invalid; DJ handles may not contain " - " as this is a separation used by the system.`,
								});
								return;
							}
							if (!whatShouldBePlaying || whatShouldBePlaying.hosts !== value) {
								callback({
									status: true,
									message: `Not on the immediate schedule (proceeding could result in the show being flagged as unauthorized)`,
								});
								return;
							} else if (whatShouldBePlaying && lockToDJ) {
								callback({
									status: true,
									message: `This field cannot be edited; this is the only broadcast you are allowed to start from this host at this time.`,
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
					name: {
						helper: `If this field is uneditable but incorrect, please contact a director ASAP.`,
						validator: function (callback) {
							let value = this.getValue();
							if (value.includes(" -")) {
								callback({
									status: false,
									message: `Invalid; Show names may not contain " - " as this is a separation used by the system.`,
								});
								return;
							}
							if (!whatShouldBePlaying || whatShouldBePlaying.name !== value) {
								callback({
									status: true,
									message: `Not on the immediate schedule (proceeding could result in the show being flagged as unauthorized)`,
								});
								return;
							} else if (whatShouldBePlaying && lockToDJ) {
								callback({
									status: true,
									message: `This field cannot be edited; this is the only broadcast you are allowed to start from this host at this time.`,
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
					topic: {
						helper:
							"Limit: 256 characters. The topic will be displayed on the website and display signs. It will also be posted in the WWSU Discord.",
						type: "textarea",
						placeholder: whatShouldBePlaying
							? whatShouldBePlaying.description
							: "",
					},
					hostCall: {
						type: "select",
						optionLabels: callableHosts.map((host) => host.label),
						helper:
							"Choose which host you want to establish an audio call with for the broadcast. Please contact a director for guidance or choose the first one (unless that one does not work).",
					},
				},
				form: {
					buttons: {
						submit: {
							title: "Start Broadcast",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();

								// The process of going remote requires a lot of back and forth between processes and the API.
								// So, store the form data in memory and block the form while we are processing.
								// Then, once an audio call is established, this.goRemote() should be called.

								this.pendingRemote = {
									fn: "goRemote",
									data: {
										topic: value.topic,
										showname: `${value.djs} - ${value.name}`,
										host: value.hostCall,
									},
								};

								this.manager
									.get("WWSUhosts")
									.promptIfNotHost(`start a remote broadcast`, () => {
										$(this.broadcastModal.body).block({
											message: `<h1>Please wait...</h1><p class="remote-start-status">Initializing...</p>`,
											css: { border: "3px solid #a00" },
											timeout: 30000,
											onBlock: () => {
												// You should listen for this event and start the process of remote audio calling when called.
												this.emitEvent("startRemote", [value.hostCall]);
											},
										});
									});
							},
						},
					},
				},
			},
			data: {
				djs: whatShouldBePlaying
					? this.manager
							.get("WWSUutil")
							.truncateText(whatShouldBePlaying.hosts, 256)
					: "",
				name: whatShouldBePlaying
					? this.manager
							.get("WWSUutil")
							.truncateText(whatShouldBePlaying.name, 256)
					: "",
				topic: whatShouldBePlaying
					? this.manager
							.get("WWSUutil")
							.truncateText(whatShouldBePlaying.description, 256)
					: "",
			},
		});
	}

	/**
	 * Unblock the broadcast modal. Usually used externally when a remote broadcast attempt fails.
	 */
	unblockBroadcastModal() {
		$(this.broadcastModal.body).unblock();
	}

	/**
	 * When an audio call for a remote broadcast has been established, call this to transition to the pending remote broadcast.
	 *
	 * @param {?function} cb Function to call after the API is called, containing true for success or false for failure.
	 */
	finalizeRemote(cb) {
		if (this.pendingRemote) {
			this[this.pendingRemote.fn](this.pendingRemote.data, cb);
			this.pendingRemote = undefined;
		} else {
			cb(false);
		}
	}

	/**
	 * Tell the WWSU API to start a remote broadcast.
	 *
	 * @param {object} data Data to send to the endpoint
	 * @param {?function} cb Callback executed when the request is completed
	 */
	goRemote(data, cb) {
		try {
			this.manager
				.get("hostReq")
				.request(
					{ method: "post", url: this.endpoints.remote, data },
					(response) => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error starting remote broadcast",
								body:
									"There was an error starting the remote broadcast. Please contact the engineer if you think you should be allowed to start a remote broadcast.",
								autoHide: true,
								delay: 15000,
								icon: "fas fa-skull-crossbones fa-lg",
							});
							if (typeof cb === "function") {
								cb(false);
							}
						} else {
							if (typeof cb === "function") {
								cb(true);
							}
						}
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error starting remote broadcast",
				body:
					"There was an error starting the remote broadcast. Please contact the engineer if you think you should be allowed to start a remote broadcast.",
				autoHide: true,
				delay: 15000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			if (typeof cb === "function") {
				cb(false);
			}
			console.error(e);
		}
	}

	/**
	 * Show a form for starting a live in-studio sports broadcast in a modal via Alpaca.
	 */
	showSportsForm() {
		if (this.manager.get("WWSUhosts").client.lockToDJ !== null) {
			$(document).Toasts("create", {
				class: "bg-warning",
				title: "Action not allowed",
				delay: 20000,
				autohide: true,
				body: `You are not allowed to start a live (in-studio) broadcast from this host. Please contact a director if you think this is an error.`,
			});
			return;
		}

		this.broadcastModal.title = `Start Live (in-studio) Sports Broadcast`;
		this.broadcastModal.body = ``;
		this.broadcastModal.iziModal("open");

		let whatShouldBePlaying = this.manager
			.get("WWSUcalendar")
			.whatShouldBePlaying()
			.sort((a, b) => b.priority - a.priority);
		whatShouldBePlaying = whatShouldBePlaying.find(
			(record) => record.type === "sports"
		);
		let title = whatShouldBePlaying
			? whatShouldBePlaying.name.split(" vs.")[0]
			: undefined;

		let _sports = this.manager.get("WWSUconfig").config.sports;

		$(this.broadcastModal.body).alpaca({
			schema: {
				title: "Start Live (in-studio) Sports Broadcast",
				type: "object",
				properties: {
					acknowledge: {
						type: "boolean",
						default: false,
						title: "I read the announcements",
					},
					sport: {
						type: "string",
						title: "Sport",
						enum: _sports,
						required: true,
					},
					topic: {
						type: "string",
						title: "Broadcast Description",
						maxLength: 256,
					},
				},
			},
			options: {
				fields: {
					acknowledge: {
						rightLabel: "Yes",
						helper:
							"Please check this box to indicate you read the announcements on the announcements tab of DJ Controls.",
						validator: function (callback) {
							let value = this.getValue();
							if (!value) {
								callback({
									status: false,
									message: `You must acknowledge that you read the announcements on the announcements tab of DJ Controls before doing a broadcast.`,
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
					sport: {
						type: "select",
						validator: function (callback) {
							let value = this.getValue();
							if (!title || title !== value) {
								callback({
									status: true,
									message: `Not on the immediate schedule (proceeding could result in the broadcast being flagged as unauthorized)`,
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
					topic: {
						helper:
							"Limit: 256 characters. The topic will be displayed on the website and display signs. It will also be posted in the WWSU Discord.",
						type: "textarea",
					},
				},
				form: {
					buttons: {
						submit: {
							title: "Start Broadcast",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();

								value = {
									topic: value.topic,
									sport: value.sport,
								};

								this.goSports(value, (success) => {
									if (success) {
										this.broadcastModal.iziModal("close");
									}
								});
							},
						},
					},
				},
			},
			data: {
				sport: title ? title : "",
				topic: whatShouldBePlaying
					? this.manager
							.get("WWSUutil")
							.truncateText(whatShouldBePlaying.description, 256)
					: "",
			},
		});
	}

	/**
	 * Tell the WWSU API to start a sports broadcast.
	 *
	 * @param {object} data Data to send to the endpoint
	 * @param {?function} cb Callback executed when the request is completed
	 */
	goSports(data, cb) {
		try {
			this.manager
				.get("WWSUhosts")
				.promptIfNotHost(`start a live in-studio sports broadcast`, () => {
					this.manager
						.get("hostReq")
						.request(
							{ method: "post", url: this.endpoints.sports, data },
							(response) => {
								if (response !== "OK") {
									$(document).Toasts("create", {
										class: "bg-danger",
										title: "Error starting live sports broadcast",
										body:
											"There was an error starting the live sports broadcast. Live sports broadcasts may only be started from the WWSU studio (otherwise, you must do a remote sports broadcast). If you are in the WWSU studio, please contact the engineer.",
										autoHide: true,
										delay: 15000,
										icon: "fas fa-skull-crossbones fa-lg",
									});
									if (typeof cb === "function") {
										cb(false);
									}
								} else {
									if (typeof cb === "function") {
										cb(true);
									}
								}
							}
						);
				});
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error starting live sports broadcast",
				body:
					"There was an error starting the live sports broadcast. Please report this to the engineer.",
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
	 * Show a form for starting a remote sports broadcast in a modal via Alpaca.
	 */
	showSportsRemoteForm() {
		// Reject if host does not have makeCalls permission
		if (!this.manager.get("WWSUhosts").client.makeCalls) {
			$(document).Toasts("create", {
				class: "bg-warning",
				title: "Remote broadcasts not allowed",
				delay: 20000,
				autohide: true,
				body: `You are not allowed to start a remote broadcast from this host. Please contact a director if you think this is an error.`,
			});
			return;
		}

		// Find what should be airing right now; filter to only the highest priority sports broadcast
		let whatShouldBePlaying = this.manager
			.get("WWSUcalendar")
			.whatShouldBePlaying()
			.sort((a, b) => b.priority - a.priority);
		whatShouldBePlaying = whatShouldBePlaying.find(
			(record) => record.type === "sports"
		);

		// Set lock to DJ to a local letiable as Alpaca's validators do not use arrow functions
		let lockToDJ = this.manager.get("WWSUhosts").client.lockToDJ;

		// Reject if no remote broadcasts scheduled and this host is locked to a DJ.
		if (
			this.manager.get("WWSUhosts").client.lockToDJ !== null &&
			!whatShouldBePlaying
		) {
			$(document).Toasts("create", {
				class: "bg-warning",
				title: "No sports broadcasts scheduled",
				delay: 30000,
				autohide: true,
				body: `You are not allowed to start a remote sports broadcast from this host at this time; there are no broadcasts scheduled. Please wait until 5 minutes before start time and try again. Please contact a director if you think this is an error.`,
			});
			return;
		}

		// TODO: Add a flag in WWSU hosts allowing only certain hosts to start remote sports broadcasts, and run a check here.

		this.broadcastModal.title = `Start Remote Sports Broadcast`;
		this.broadcastModal.body = ``;
		this.broadcastModal.iziModal("open");

		let title = whatShouldBePlaying
			? whatShouldBePlaying.name.split(" vs.")[0]
			: undefined;

		let _sports = this.manager.get("WWSUconfig").config.sports;

		// Get the hosts that may be called for an audio broadcast
		let callableHosts = this.manager.get("WWSUrecipients").find({
			answerCalls: true,
			status: 5,
		});

		$(this.broadcastModal.body).alpaca({
			schema: {
				title: "Start Remote Sports Broadcast",
				type: "object",
				properties: {
					audioAcknowledgement: {
						type: "boolean",
						default: false,
						title: "Settings in Audio menu are correct",
					},
					acknowledge: {
						type: "boolean",
						default: false,
						title: "I read the announcements",
					},
					hostCall: {
						type: "number",
						enum: callableHosts.map((host) => host.hostID),
						required: true,
						title: "Host to call",
					},
					sport: {
						type: "string",
						title: "Sport",
						enum: _sports,
						required: true,
						readonly: this.manager.get("WWSUhosts").client.lockToDJ !== null,
					},
					topic: {
						type: "string",
						title: "Broadcast Description",
						maxLength: 256,
					},
				},
			},
			options: {
				fields: {
					audioAcknowledgement: {
						rightLabel: "Yes",
						helper: `You confirm you went into the Audio page of DJ Controls and ensured the devices you want broadcast have "Remote Broadcasts" checked, their volumes are set to where you want them, and you tested (via the VU meters) to ensure DJ Controls is receiving audio from those devices.`,
						validator: function (callback) {
							let value = this.getValue();
							if (!value) {
								callback({
									status: false,
									message: `You must acknowledge that you checked the Audio settings and ensured everything is set correctly and working.`,
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
					acknowledge: {
						rightLabel: "Yes",
						helper:
							"Please check this box to indicate you read the announcements on the announcements tab of DJ Controls.",
						validator: function (callback) {
							let value = this.getValue();
							if (!value) {
								callback({
									status: false,
									message: `You must acknowledge that you read the announcements on the announcements tab of DJ Controls before doing a broadcast.`,
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
					hostCall: {
						type: "select",
						optionLabels: callableHosts.map((host) => host.label),
						helper:
							"Choose which host you want to establish an audio call with for the broadcast. Please contact a director for guidance or choose the first one (unless that one does not work).",
					},
					sport: {
						type: "select",
						validator: function (callback) {
							let value = this.getValue();
							if (!title || title !== value) {
								callback({
									status: true,
									message: `Not on the immediate schedule (proceeding could result in the broadcast being flagged as unauthorized)`,
								});
								return;
							} else if (whatShouldBePlaying && lockToDJ) {
								callback({
									status: true,
									message: `This field cannot be edited; this is the only sports broadcast you are allowed to start from this host at this time.`,
								});
								return;
							}
							callback({
								status: true,
							});
						},
					},
					topic: {
						helper:
							"Limit: 256 characters. The topic will be displayed on the website and display signs. It will also be posted in the WWSU Discord.",
						type: "textarea",
					},
				},
				form: {
					buttons: {
						submit: {
							title: "Start Broadcast",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();

								// The process of going remote requires a lot of back and forth between processes and the API.
								// So, store the form data in memory and block the form while we are processing.
								// Then, once an audio call is established, this.goRemote() should be called.

								this.pendingRemote = {
									fn: "goSportsRemote",
									data: {
										topic: value.topic,
										sport: value.sport,
										host: value.hostCall,
									},
								};

								this.manager
									.get("WWSUhosts")
									.promptIfNotHost(`start a remote sports broadcast`, () => {
										$(this.broadcastModal.body).block({
											message: `<h1>Please wait...</h1><p class="remote-start-status">Initializing...</p>`,
											css: { border: "3px solid #a00" },
											timeout: 30000,
											onBlock: () => {
												// You should listen for this event and start the process of remote audio calling when called.
												this.emitEvent("startRemote", [value.hostCall]);
											},
										});
									});
							},
						},
					},
				},
			},
			data: {
				sport: title ? title : "",
				topic: whatShouldBePlaying
					? this.manager
							.get("WWSUutil")
							.truncateText(whatShouldBePlaying.description, 256)
					: "",
			},
		});
	}

	/**
	 * Tell the WWSU API to start a remote sports broadcast.
	 *
	 * @param {object} data Data to send to the endpoint
	 * @param {?function} cb Callback executed when the request is completed
	 */
	goSportsRemote(data, cb) {
		try {
			this.manager
				.get("hostReq")
				.request(
					{ method: "post", url: this.endpoints.sportsRemote, data },
					(response) => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error starting remote sports broadcast",
								body:
									"There was an error starting the remote sports broadcast. Please contact the engineer if you think you should be allowed to start a remote sports broadcast.",
								autoHide: true,
								delay: 15000,
								icon: "fas fa-skull-crossbones fa-lg",
							});
							if (typeof cb === "function") {
								cb(false);
							}
						} else {
							if (typeof cb === "function") {
								cb(true);
							}
						}
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error starting remote sports broadcast",
				body:
					"There was an error starting the remote sports broadcast. Please contact the engineer if you think you should be allowed to start a remote sports broadcast.",
				autoHide: true,
				delay: 15000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			if (typeof cb === "function") {
				cb(false);
			}
			console.error(e);
		}
	}
}
