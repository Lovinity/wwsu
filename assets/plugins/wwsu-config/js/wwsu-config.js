'use strict';

// This class manages the WWSU server configuration

// REQUIRES these WWSUmodules: hostReq (WWSUreq), directorReq (WWSUreq) (only if changing settings)
class WWSUconfig extends WWSUevents {
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
			get: "/config/get",
		};
		this.data = {
			get: {},
		};

		this.config = {};

		// Update internal config when websocket broadcasts a change
		this.manager.socket.on("config", (data) => {
			Object.assign(this.config, data.update);
			this.emitEvent("configChanged", [data.update, this.config]);
		});
	}

	// Initialize the config class. Call this on socket connect event.
	init() {
		try {
			this.manager.get("hostReq").request(
				{
					method: "post",
					url: this.endpoints.get,
					data: {},
				},
				(response) => {
					if (typeof response !== "object" && !response.website) {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error loading WWSU server configuration",
							body:
								"There was an error WWSU server configuration. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
					} else {
						this.config = response;
						this.emitEvent("configChanged", [response, this.config]);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error loading WWSU server configuration",
				body:
					"There was an error WWSU server configuration. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
		}
	}
}
