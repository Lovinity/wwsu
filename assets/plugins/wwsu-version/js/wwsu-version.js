"use strict";

// This is a version checker for WWSU apps. This ONLY gets the latest version and download URL. You are expected to handle determining if an update is needed (via WWSUdb event listeners), and notifying of said update, outside this class.

// REQUIRES these WWSUmodules: hostReq (WWSUreq)
class WWSUversion extends WWSUdb {
	/**
	 * Construct the class
	 *
	 * @param {WWSUmodules} manager The modules class which initiated this module
	 * @param {object} options Options to be passed to this module
	 * @param {string} options.app Name of the app running
	 */
	constructor(manager, options) {
		super();

		this.manager = manager;

		this.app = options.app;

		this.endpoints = {
			check: "/version/check",
		};

		this.data = {
			check: { app: this.app },
		};

		this.assignSocketEvent("version", this.manager.socket);
	}

	// Start the connection. Call this in socket connect event.
	init() {
		this.replaceData(
			this.manager.get("hostReq"),
			this.endpoints.check,
			this.data.check
		);
	}
}
