"use strict";

/**
 * This class manages tracking remote audio call quality of various connections.
 */

// REQUIRES these WWSUmodules: WWSUMeta
class WWSUremoteQuality extends WWSUevents {
	/**
	 * Construct the class
	 *
	 * @param {WWSUmodules} manager The modules class which initiated this module
	 * @param {object} options Options to be passed to this module
	 */
	constructor(manager, options) {
		super();

		this.manager = manager;

		this.connections = new Map();

		// Increase quality by 1% for all connections every 0.5 seconds; push quality event at 33%, 66%, and 100%.
		this.rebuildQuality = setInterval(() => {
			this.connections.forEach((value, key) => {
				if (value < 100) {
					value += 1;
					this.connections.set(key, value);

					if (value === 33)
						this.emitEvent("quality", [key, `improvedQuality`, value]);
					if (value === 66)
						this.emitEvent("quality", [key, `improvedQuality`, value]);
					if (value === 100)
						this.emitEvent("quality", [key, `improvedQuality`, value]);
				}
			});
		}, 500);
	}

	/**
	 * Report a quality problem.
	 *
	 * @param {string} connection The Peer ID
	 * @param {number} value The amount to subtract from quality %
	 * @param {string} reason A reason phrase to indicate why we are subtracting quality, such as "incomingSilence" or "PLC"
	 */
	qualityProblem(connection, value, reason) {
		// Do not account silence problems if we are not on the air right now
		if (
			reason === `incomingSilence` &&
			(!this.manager.get("WWSUMeta") ||
				this.manager.get("WWSUMeta").meta.state !== "remote_on" ||
				this.manager.get("WWSUMeta").meta.state !== "sportsremote_on" ||
				this.manager.get("WWSUMeta").meta.playing)
		) {
			return;
		}

		let currentQuality = this.connections.get(connection) || 100;
		currentQuality -= value;
		if (currentQuality < 0) currentQuality = 0;
		this.connections.set(connection, currentQuality);

		this.emitEvent("quality", [connection, reason, currentQuality]);
	}

	/**
	 * Clear a connection when it is disconnected.
	 *
	 * @param {string} connection The peer ID
	 */
	callClosed(connection) {
		this.connections.delete(connection);
	}

	/**
	 * Call when the peer is destroyed to remove all connections.
	 */
	peerDestroyed() {
		this.connections.clear();
	}
}
