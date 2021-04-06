"use strict";

// This class manages the WWSU status system

// REQUIRES these WWSUmodules: noReq (WWSUreq), hostReq (if reporting issues with recorder)
class WWSUstatus extends WWSUdb {
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
			get: "/status/get",
			report: "/status/report",
			recorder: "/status/recorder",
		};
		this.data = {
			get: {},
		};

		this.assignSocketEvent("status", this.manager.socket);

		this.statusModal = new WWSUmodal(
			`Problems Detected with WWSU`,
			null,
			``,
			true,
			{
				headerColor: "",
				overlayClose: true,
				zindex: 1100,
				timeout: 180000,
				timeoutProgressbar: true,
			}
		);
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
	 * Report a problem to WWSU.
	 *
	 * @param {string} dom DOM query string that should be blocked when processing report (typically the report form).
	 * @param {object} data Data to pass to the API
	 * @param {?function} cb Callback function with true for success, false for failure.
	 */
	report(dom, data, cb) {
		try {
			this.manager
				.get("noReq")
				.request(
					{ dom: dom, method: "post", url: this.endpoints.report, data },
					(response) => {
						if (response !== "OK") {
							$(document).Toasts("create", {
								class: "bg-danger",
								title: "Error reporting problem",
								body:
									"There was an error reporting a problem. Please report this to the engineer.",
								autohide: true,
								delay: 10000,
								icon: "fas fa-skull-crossbones fa-lg",
							});
							if (typeof cb === "function") {
								cb(false);
							}
						} else {
							$(document).Toasts("create", {
								class: "bg-success",
								title: "Problem reported",
								autohide: true,
								delay: 10000,
								body: `The issue has been reported to WWSU.`,
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
				title: "Error reporting problem",
				body:
					"There was an error reporting a problem. Please report this to the engineer.",
				autohide: true,
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
	 * Report current status of the recorder to WWSU.
	 *
	 * @param {object} data Data to send to the WWSU API.
	 * @param {?function} cb Callback function with true for success, false for failure.
	 */
	recorder(data, cb) {
		try {
			this.manager
				.get("hostReq")
				.request(
					{ method: "post", url: this.endpoints.recorder, data },
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
	 * Initialize a "report problem" Alpaca form.
	 *
	 * @param {string} location Descriptor used in the report to determine where the problem was reported.
	 * @param {string} dom DOM query string where to put the form.
	 */
	initReportForm(location, dom) {
		$(dom).alpaca({
			schema: {
				type: "object",
				properties: {
					location: {
						type: "string",
						default: location,
					},
					information: {
						type: "string",
						title: "Describe the problem",
						maxLength: 1024,
						required: true,
					},
				},
			},
			options: {
				fields: {
					location: {
						type: "hidden",
					},
					information: {
						type: "textarea",
						helper:
							"Explain concisely what problem you are having, what you did leading up to the problem, and any errors you received. Do NOT include personal information / passwords / etc (reports are public). You have a 1024 character limit.",
					},
				},
				form: {
					buttons: {
						submit: {
							title: "Submit Problem",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();
								this.report(
									dom,
									{
										location: value.location,
										information: value.information,
									},
									(success) => {
										if (success) {
											form.clear();
										}
									}
								);
							},
						},
					},
				},
			},
		});
	}
}
