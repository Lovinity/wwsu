'use strict';

/**
 * This class manages reporting silence to WWWSU.
 * For silence detection, use wwsu-audio/wwsu-silence (WWSUsilenceaudio class).
 */

 // REQUIRES these WWSUmodules: hostReq (WWSUreq)
class WWSUSilence extends WWSUevents {
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
			active: "/silence/active",
			inactive: "/silence/inactive",
		};
	}

	/**
	 * Tell WWSU there is unacceptable silence active. This should be re-triggered every minute until silence is no longer active (this.inactive should then be triggered).
	 *
	 * @param {?function} cb Callback executed after API call is made.
	 */
	active(cb) {
		try {
			this.manager.get("hostReq").request(
				{ method: "post", url: this.endpoints.active },
				(response) => {
					if (!response) {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error sending silence alarm",
							body:
								"There was an error sending a silence alarm to WWSU. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
					} else {
						if (typeof cb === "function") {
							cb(response);
						}
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error sending silence alarm",
				body:
					"There was an error sending a silence alarm to WWSU. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
		}
	}

	/**
	 * Tell WWSU there is no longer silence.
	 *
	 * @param {?function} cb Callback function after API call is made.
	 */
	inactive(cb) {
		try {
			this.manager.get("hostReq").request(
				{ method: "post", url: this.endpoints.inactive },
				(response) => {
					if (!response) {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error sending silence alarm",
							body:
								"There was an error deactivating the silence alarm on WWSU. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
					} else {
						if (typeof cb === "function") {
							cb(response);
						}
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error sending silence alarm",
				body:
					"There was an error deactivating the silence alarm on WWSU. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
		}
	}
}
