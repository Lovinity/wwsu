"use strict";

/**
 * This class manages climaCell weather data from the WWSU API.
 *
 * @requires $ jQuery
 * @requires WWSUdb WWSU TAFFYdb wrapper
 * @requires WWSUanimations WWSU animations management
 * @requires moment moment.js time/date library
 */

// REQUIRES these WWSUmodules: noReq (WWSUreq), WWSUMeta, WWSUanimations
class WWSUclimacell extends WWSUdb {
	/**
	 * The class constructor.
	 *
	 * @param {WWSUmodules} manager The modules class which initiated this module
	 * @param {object} options Options to be passed to this module
	 */
	constructor(manager, options) {
		super();

		this.manager = manager;

		this.endpoints = {
			get: "/climacell/get",
		};
		this.data = {
			get: {},
		};

		this.assignSocketEvent("climacell", this.manager.socket);

		this.ncTimer;

		// Data operations
		super.on("insert", "WWSUclimacell", (query) => {
			this.updateData(query);
			clearTimeout(this.ncTimer);
			this.ncTimer = setTimeout(() => {
				this.recalculateNowcast();
			}, 1000);
		});
		super.on("update", "WWSUclimacell", (query) => {
			this.updateData(query);
			clearTimeout(this.ncTimer);
			this.ncTimer = setTimeout(() => {
				this.recalculateNowcast();
			}, 1000);
		});
		super.on("remove", "WWSUclimacell", (query) => {
			let record = this.find({ ID: query }, true);
			if (record) {
				this.updateData({ dataClass: record.dataClass, data: `???` });
			}
			clearTimeout(this.ncTimer);
			this.ncTimer = setTimeout(() => {
				this.recalculateNowcast();
			}, 1000);
		});
		super.on("replace", "WWSUclimacell", (db) => {
			db.get().forEach((record) => {
				this.updateData(record);
			});
			clearTimeout(this.ncTimer);
			this.ncTimer = setTimeout(() => {
				this.recalculateNowcast();
			}, 1000);
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
	 * Update a piece of text data by div class.
	 *
	 * @param {object} query climacell weather record that contains at least dataClass and data.
	 */
	updateData(query) {
		this.manager
			.get("WWSUanimations")
			.add(`update-climacell-${query.dataClass}`, () => {
				$(`.climacell-${query.dataClass}`).html(query.data);
				if (query.dataClass === "realtime-wind-direction") {
					$(`.climacell-realtime-wind-direction-code`).html(
						this.degToCard(query.data.split(" ")[0])
					);
				}
			});
	}

	// Recalculate when precipitation is expected
	recalculateNowcast() {
		let precip = [];

		// Populate precip
		this.db()
			.get()
			.filter((record) => record.dataClass.startsWith("nc-"))
			.map((record) => {
				let splits = record.dataClass.split("-");
				let ncNumber = parseInt(splits[1]);
				if (typeof precip[ncNumber] === "undefined") {
					precip[ncNumber] = { type: null, rate: null, time: null };
				}

				if (record.dataClass.endsWith("precipitation-type")) {
					precip[ncNumber].type = record.data;
				} else if (record.dataClass.endsWith("precipitation")) {
					precip[ncNumber].rate = record.data;
				} else if (record.dataClass.endsWith("observation-time")) {
					precip[ncNumber].time = record.data;
				}
			});

		// sort precip by observation time
		precip.sort((a, b) => {
			if (!a.time) return 1;
			if (!b.time) return -1;
			if (moment(a.time).isBefore(moment(b.time))) return -1;
			if (moment(b.time).isBefore(moment(a.time))) return 1;
			return 0;
		});

		// Figure out the next chance of precipitation, and update cards
		let precipExpected = precip.find(
			(record) => record.type && record.type !== "none"
		);
		let realtimePrecipType = this.db({
			dataClass: `realtime-precipitation-type`,
		}).first();
		let realtimePrecip = this.db({
			dataClass: `realtime-precipitation`,
		}).first();
		if (
			precipExpected &&
			(!realtimePrecipType || realtimePrecipType.data === "none")
		) {
			$(".climacell-nowcast-color").removeClass(`bg-gray`);
			$(".climacell-nowcast-color").removeClass(`bg-danger`);
			$(".climacell-nowcast-color").removeClass(`bg-success`);
			$(".climacell-nowcast-color").addClass(`bg-warning`);
			$(".climacell-nowcast-time").html(
				moment
					.tz(
						precipExpected.time,
						this.manager.get("WWSUMeta") ? this.manager.get("WWSUMeta").meta.timezone : moment.tz.guess()
					)
					.format("h:mm A")
			);
			$(".climacell-nowcast-text").html(`${precipExpected.type} possible`);
		} else if (!precipExpected) {
			$(".climacell-nowcast-color").removeClass(`bg-gray`);
			$(".climacell-nowcast-color").removeClass(`bg-danger`);
			$(".climacell-nowcast-color").removeClass(`bg-warning`);
			$(".climacell-nowcast-color").addClass(`bg-success`);
			$(".climacell-nowcast-time").html(`None`);
			$(".climacell-nowcast-text").html(`No Precip Next 6 Hours`);
		} else {
			$(".climacell-nowcast-color").removeClass(`bg-gray`);
			$(".climacell-nowcast-color").removeClass(`bg-success`);
			$(".climacell-nowcast-color").removeClass(`bg-warning`);
			$(".climacell-nowcast-color").addClass(`bg-danger`);

			// Determine when the precip is expected to end
			let precipEnd = precip.find(
				(record) => record.type && record.type === "none"
			);
			$(".climacell-nowcast-time").html(
				precipEnd
					? moment
							.tz(
								precipEnd.time,
								this.manager.get("WWSUMeta") ? this.manager.get("WWSUMeta").meta.timezone : moment.tz.guess()
							)
							.format("h:mm A")
					: `Next >6 Hours`
			);
			$(".climacell-nowcast-text").html(
				`${
					realtimePrecipType
						? realtimePrecipType.data || `Unknown Precip`
						: `Unknown Precip`
				} ending`
			);
		}
	}

	/**
	 * Utility function to convert wind direction degrees to cardinal direction.
	 *
	 * @param {number} d Degrees
	 * @returns {string} cardinal direction
	 */
	degToCard(d) {
		if (11.25 <= d && d < 33.75) {
			return "NNE";
		} else if (33.75 <= d && d < 56.25) {
			return "NE";
		} else if (56.25 <= d && d < 78.75) {
			return "ENE";
		} else if (78.75 <= d && d < 101.25) {
			return "E";
		} else if (101.25 <= d && d < 123.75) {
			return "ESE";
		} else if (123.75 <= d && d < 146.25) {
			return "SE";
		} else if (146.25 <= d && d < 168.75) {
			return "SSE";
		} else if (168.75 <= d && d < 191.25) {
			return "S";
		} else if (191.25 <= d && d < 213.75) {
			return "SSW";
		} else if (213.75 <= d && d < 236.25) {
			return "SW";
		} else if (236.25 <= d && d < 258.75) {
			return "WSW";
		} else if (258.75 <= d && d < 281.25) {
			return "W";
		} else if (281.25 <= d && d < 303.75) {
			return "WNW";
		} else if (303.75 <= d && d < 326.25) {
			return "NW";
		} else if (326.25 <= d && d < 348.75) {
			return "NNW";
		} else {
			return "N";
		}
	}
}
