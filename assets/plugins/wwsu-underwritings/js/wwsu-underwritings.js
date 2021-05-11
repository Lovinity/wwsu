"use strict";

// This class manages the underwritings in the WWSU system.

// REQUIRES these WWSU modules: WWSUMeta, WWSUsongs, WWSUutil, WWSUanimations, hostReq (WWSUreq), directorReq (WWSUreq)

class WWSUunderwritings extends WWSUdb {
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
			get: "/underwritings/get",
			add: "/underwritings/add",
			edit: "/underwritings/edit",
			remove: "/underwritings/remove",
		};
		this.data = {
			get: {},
		};

		this.assignSocketEvent("underwritings", this.manager.socket);

		this.table;

		this.modals = {
			help: new WWSUmodal(
				`How Underwritings Work`,
				null,
				`<p>The WWSU system uses complex algorithms to determine when to air underwritings. It factors in (when applicable) the underwritings' start/end date, number of spins required, priority, set air schedule, and set calendar events. The system can also adjust frequency depending on the number of online listeners tuned in. The system also uses checks to ensure the same underwriting does not air twice in the same break, and that there will not be a bunch of underwritings airing on the same break.</p>
                <ul>
                    <li><strong>Adjust for online listeners:</strong> If enabled for an underwriting, then the more online listeners are tuned in, the more often it will air during that time (using a complex algorithm factoring in a lot of things including average online listenership in the last 7 days). If disabled, the frequency of the underwriting will not be affected by online listeners tuned in.</li>
                    <li><strong>Algorithmic schedules:</strong> During these days and times, the underwriting will air depending on a number of factors (end date, spins remaining, track priority, whether or not adjust for online listeners is enabled, the calendar event filters specified)</li>
                    <li><strong>Forced schedules:</strong> During these times, the underwriting will always air once per hour regardless of all other settings (except for calendar event filters).</li>
					<li><strong>Calendar event filters:</strong> If one or more filter is specified, the underwriting will only air if one of these events are currently on the air.</li>
                </ul>
                <p><strong>Algorithms</strong>: The table below details how underwritings will air depending on the settings applied to it.</p>
                <table border="1" cellpadding="1" cellspacing="1" style="width:100%">
                    <tbody>
                        <tr>
                            <td><strong>End Date Set on RadioDJ track?</strong></td>
                            <td><strong>Spin Counts set on RadioDJ track?</strong></td>
                            <td><strong>One or more Algorithmic schedules specified?</strong></td>
                            <td><strong>One or more Forced schedules specified?</strong></td>
                            <td><strong>Algorithm / logic used</strong></td>
                        </tr>
                        <tr>
                            <td>Yes</td>
                            <td>Yes</td>
                            <td>Yes</td>
                            <td>Yes or No</td>
                            <td><span style="font-size:11.0pt"><span style="font-family:&quot;Arial&quot;,sans-serif">System will spread underwritings out among the date/time filters to ensure all play counts air by the end date. However, if there are &ldquo;ignore algorithms&rdquo; filters, underwriting might run out of spins too early (it will do its best to ensure that doesn&rsquo;t happen unless there are more hourly spots scheduled than spin counts set).</span></span></td>
                        </tr>
                        <tr>
                            <td>Yes</td>
                            <td>Yes</td>
                            <td>No</td>
                            <td>Yes</td>
                            <td><span style="font-size:11.0pt"><span style="font-family:&quot;Arial&quot;,sans-serif">Underwriting will only air once per hour during specified &ldquo;Ignore Algorithms&rdquo; schedules. It could run out of spins early and it could also not meet its spin requirements by the end date; schedule wisely because <strong>in this case, the system does not use algorithms to ensure the underwriting meets all its airs.</strong></span></span></td>
                        </tr>
                        <tr>
                            <td>Yes</td>
                            <td>Yes</td>
                            <td>Yes or No</td>
                            <td>No</td>
                            <td><span style="font-size:11.0pt"><span style="font-family:&quot;Arial&quot;,sans-serif">System will spread underwritings out among the date/time filters (if set; otherwise, it is spread out any time and any day of the week) to ensure all play counts air by the end date.</span></span></td>
                        </tr>
                        <tr>
                            <td>Yes</td>
                            <td>No</td>
                            <td>Yes</td>
                            <td>Yes or No</td>
                            <td><span style="font-size:11.0pt"><span style="font-family:&quot;Arial&quot;,sans-serif">System will air on average 56* times per week during time/date filters without ignore algorithms specified. If any Ignore Algorithms filters are set, these will air in addition to (independently of) the 56* hours/week during the schedules without ignore algorithms set.</span></span></td>
                        </tr>
                        <tr>
                            <td>Yes</td>
                            <td>No</td>
                            <td>No</td>
                            <td>Yes</td>
                            <td><span style="font-size:11.0pt"><span style="font-family:&quot;Arial&quot;,sans-serif">System will air once per hour during the ignore algorithms schedules.</span></span></td>
                        </tr>
                        <tr>
                            <td>Yes</td>
                            <td>No</td>
                            <td>Yes or No</td>
                            <td>No</td>
                            <td><span style="font-size:11.0pt"><span style="font-family:&quot;Arial&quot;,sans-serif">System will air on average 56* times per week and will spread out based on set date/time filters.</span></span></td>
                        </tr>
                        <tr>
                            <td>No</td>
                            <td>Yes or No</td>
                            <td>Yes</td>
                            <td>Yes or No</td>
                            <td><span style="font-size:11.0pt"><span style="font-family:&quot;Arial&quot;,sans-serif">System will air on average 28* times per week during date/time filters without ignore algorithms set until all spin counts are used (if specified). If any Ignore Algorithms filters are set, these will air in addition to (independently of) the 28* hours/week during the schedules without ignore algorithms set (but they will still count towards spins, if specified).</span></span></td>
                        </tr>
                        <tr>
                            <td>No</td>
                            <td>Yes or No</td>
                            <td>No</td>
                            <td>Yes</td>
                            <td><span style="font-size:11.0pt"><span style="font-family:&quot;Arial&quot;,sans-serif">System will air once per hour during the ignore algorithms schedules until all spin counts are used (if set).</span></span></td>
                        </tr>
                        <tr>
                            <td>No</td>
                            <td>Yes or No</td>
                            <td>Yes or No</td>
                            <td>No</td>
                            <td><span style="font-size:11.0pt"><span style="font-family:&quot;Arial&quot;,sans-serif">System will air on average 28* times per week during the date/time filters specified until spin counts are all used (if set).</span></span></td>
                        </tr>
                    </tbody>
                </table>

                <p><strong>Calendar event filters note on frequency: </strong>If any calendar event filters are added to an underwriting, instead of the 28/56 airs per week average for schedules without ignore algorithms, the system will air on average 6 times per week* for every event filter added during any of the specified shows<strong> </strong>(assumes an average duration of 2 hours with 3 breaks per hour).</p>

                <p>*The number of average weekly spins also depends on the track's priority in RadioDJ. The stated number is based on a priority of 50. Priorities greater than 50 will have a higher weekly spin count; a priority of 100 doubles the stated average weekly spins. Priorities less than 50 will have a lower weekly spin count; a priority of 0 divides the stated average weekly spins by 2.<br />
                Example ratios when it says on average 56 times per week (priority : average airs per week): 0:28, 25:42, 50:56, 75:89, 100:112.</p>`,
				true,
				{
					headerColor: "",
					zindex: 1100,
				}
			),

			underwriting: new WWSUmodal(`New Underwriting`, null, ``, true, {
				headerColor: "",
				overlayClose: false,
				zindex: 1110,
			}),
		};

		// Update table whenever something changes
		this.on("change", "WWSUunderwritings", () => {
			this.updateTable();
		});
	}

	// Initialize connection. Call this on socket connect event.
	init() {
		this.replaceData(
			this.manager.get("hostReq"),
			this.endpoints.get,
			this.data.get
		);
	}

	/**
	 * Add an underwriting into the system via the WWSU API.
	 *
	 * @param {Object} data Data to be passed to the API.
	 * @param {?function} cb Function to call after API request is made. Parameter is true if successful, false if not successful.
	 */
	add(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${this.modals.underwriting.id}`,
					method: "post",
					url: this.endpoints.add,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-warning",
							title: "Error adding underwriting",
							body:
								"There was an error adding the underwriting. Please make sure you filled all fields correctly.",
							delay: 10000,
						});
						cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Underwriting Added",
							autohide: true,
							delay: 10000,
							body: `Underwriting has been added`,
						});
						cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error adding underwriting",
				body:
					"There was an error adding a new underwriting. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			cb(false);
		}
	}

	/**
	 * Edit an underwriting in the system
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {?function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	edit(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${this.modals.underwriting.id}`,
					method: "post",
					url: this.endpoints.edit,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-warning",
							title: "Error editing underwriting",
							body:
								"There was an error editing the underwriting. Please make sure you filled all fields correctly.",
							delay: 10000,
						});
						console.log(response);
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Underwriting Edited",
							autohide: true,
							delay: 10000,
							body: `Underwriting has been edited`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error editing underwriting",
				body:
					"There was an error editing the underwriting. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Remove an underwriting from the system.
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
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error removing underwriting",
							body:
								"There was an error removing the underwriting. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Underwriting Removed",
							autohide: true,
							delay: 30000,
							body: `Underwriting has been removed.`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error removing underwriting",
				body:
					"There was an error removing the underwriting. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Initialize the table for managing underwritings.
	 *
	 * @param {string} table The DOM query string for the div container to place the table.
	 */
	initTable(table) {
		this.manager.get("WWSUanimations").add("underwritings-init-table", () => {
			// Init html
			$(table).html(
				`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
					this.manager.get("WWSUMeta")
						? this.manager.get("WWSUMeta").meta.timezone
						: moment.tz.guess()
				}.</p>
                <div class="container-fluid">
				    <div class="row">
				        <div class="col-12 col-md-6">
                            <button type="button" class="btn btn-block btn-info btn-underwritings-help">How Underwritings Work</button>
                        </div>
                        <div class="col-12 col-md-6">
                            <button type="button" class="btn btn-block btn-success btn-underwritings-new">New Underwriting</button>
                        </div>
                    </div>
                </div>
                <table id="section-underwritings-table" class="table table-striped display responsive" style="width: 100%;"></table>`
			);

			// Click event for help button
			$(".btn-underwritings-help").on("click", () => {
				this.modals.help.iziModal("open");
			});

			// Create table
			this.manager
				.get("WWSUutil")
				.waitForElement(`#section-underwritings-table`, () => {
					// Generate table
					this.table = $(`#section-underwritings-table`).DataTable({
						paging: true,
						data: [],
						columns: [{ title: "Name" }, { title: "Actions" }],
						columnDefs: [{ responsivePriority: 1, targets: 1 }],
						order: [[0, "asc"]],
						buttons: ["copy", "csv", "excel", "pdf", "print", "colvis"],
						pageLength: 100,
						drawCallback: () => {
							// Action button click events
							$(".btn-underwriting-edit").unbind("click");
							$(".btn-underwriting-delete").unbind("click");
							$(".btn-underwriting-info").unbind("click");

							$(".btn-underwriting-edit").click((e) => {
								let underwriting = this.find().find(
									(underwriting) =>
										underwriting.ID === parseInt($(e.currentTarget).data("id"))
								);
								this.showUnderwritingForm(underwriting);
							});

							$(".btn-underwriting-delete").click((e) => {
								let underwriting = this.find().find(
									(underwriting) =>
										underwriting.ID === parseInt($(e.currentTarget).data("id"))
								);
								this.manager.get("WWSUutil").confirmDialog(
									`Are you sure you want to <strong>permanently</strong> remove the underwriting "${underwriting.name}"?
                                <ul>
                                <li><strong>Do NOT permanently remove an underwriting unless you no longer want it aired.</strong></li>
                                <li>This removes the underwriting from the WWSU system and all its filters and settings; it will no longer air.</li>
                                <li>This does NOT remove the underwriting track from RadioDJ nor its records of when it aired.</li>
                                </ul>`,
									underwriting.ID,
									() => {
										this.remove({ ID: underwriting.ID });
									}
								);
							});

							$(".btn-underwriting-info").click((e) => {
								let underwriting = this.find().find(
									(underwriting) =>
										underwriting.ID === parseInt($(e.currentTarget).data("id"))
								);
								this.manager
									.get("WWSUsongs")
									.showTrackInfo(underwriting.trackID, true);
							});
						},
					});

					this.table
						.buttons()
						.container()
						.appendTo(`#section-underwritings-table_wrapper .col-md-6:eq(0)`);

					// Add click event for new DJ button
					$(".btn-underwritings-new").unbind("click");
					$(".btn-underwritings-new").click(() => {
						this.showUnderwritingForm();
					});

					// Update with information
					this.updateTable();
				});
		});
	}

	/**
	 * Update the Underwritings management table if it exists
	 */
	updateTable() {
		this.manager.get("WWSUanimations").add("underwritings-update-table", () => {
			if (this.table) {
				this.table.clear();
				this.find().forEach((underwriting) => {
					this.table.row.add([
						underwriting.name || "Unknown Underwriting",
						`<div class="btn-group"><button class="btn btn-sm btn-info btn-underwriting-info" data-id="${underwriting.ID}" title="Show underwriting RadioDJ track info (including when it aired so far)"><i class="fas fa-eye"></i></button><button class="btn btn-sm btn-warning btn-underwriting-edit" data-id="${underwriting.ID}" title="Edit underwriting"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-underwriting-delete" data-id="${underwriting.ID}" title="Remove underwriting"><i class="fas fa-trash"></i></button></div>`,
					]);
				});
				this.table.draw();
			}
		});
	}

	/**
	 * Show form to add or edit an underwriting.
	 *
	 * @param {?Object} data If editing an underwriting, this is the original underwriting.
	 */
	showUnderwritingForm(data) {
		// First, get a list of tracks in the underwritings category that we can select from
		this.manager
			.get("WWSUsongs")
			.get({ category: "underwritings", limit: 1000 }, (tracks) => {
				this.modals.underwriting.body = ``;
				this.modals.underwriting.iziModal("open");

				// Re-format data to be compatible with our Alpaca schema
				if (data) {
					data.schedule = _.cloneDeep(data.mode.schedule.schedules);
					data.scheduleForced = _.cloneDeep(data.mode.scheduleForced.schedules);
					data.show = _.cloneDeep(data.mode.show);
					data.mode = data.mode.mode === 1;
				}

				// Validator does not support arrow functions, so we need to declare timezone.
				let timezone = this.manager.get("WWSUMeta")
					? this.manager.get("WWSUMeta").meta.timezone
					: moment.tz.guess();

				// Also because of Alpaca's lack of arrow function support, get calendar events (but only ones dealing with on-air programming)
				let events = this.manager.get("WWSUcalendar").calendar.db().get();
				events = events.filter(
					(event) =>
						[
							"show",
							"prerecord",
							"remote",
							"sports",
							"genre",
							"playlist",
						].indexOf(event.type) !== -1
				);

				// Generate form
				// TODO
				$(this.modals.underwriting.body).alpaca({
					schema: {
						title: data ? "Edit Underwriting" : "New Underwriting",
						type: "object",
						properties: {
							name: {
								type: "string",
								required: true,
								title: "Name of Underwriting",
								maxLength: 255,
							},
							trackID: {
								type: "number",
								required: true,
								title: "RadioDJ Track",
								enum: tracks.map((track) => track.ID),
							},
							mode: {
								type: "boolean",
								default: false,
								title: "Adjust for Online Listeners",
							},
							schedule: {
								title: "Algorithmic Schedules",
								type: "array",
								items: {
									title: "Algorithmic Schedule",
									type: "object",
									properties: {
										dw: {
											title: "Days of Week",
											type: "array",
											items: {
												type: "number",
											},
											enum: [1, 2, 3, 4, 5, 6, 7],
										},
										h: {
											title: "Hours of Day",
											type: "array",
											items: {
												type: "number",
											},
											enum: [
												0,
												1,
												2,
												3,
												4,
												5,
												6,
												7,
												8,
												9,
												10,
												11,
												12,
												13,
												14,
												15,
												16,
												17,
												18,
												19,
												20,
												21,
												22,
												23,
											],
										},
									},
								},
							},
							scheduleForced: {
								title: "Forced Schedules",
								type: "array",
								items: {
									title: "Forced Schedule",
									type: "object",
									properties: {
										dw: {
											title: "Days of Week",
											type: "array",
											items: {
												type: "number",
											},
											enum: [1, 2, 3, 4, 5, 6, 7],
										},
										h: {
											title: "Hours of Day",
											type: "array",
											items: {
												type: "number",
											},
											enum: [
												0,
												1,
												2,
												3,
												4,
												5,
												6,
												7,
												8,
												9,
												10,
												11,
												12,
												13,
												14,
												15,
												16,
												17,
												18,
												19,
												20,
												21,
												22,
												23,
											],
										},
									},
								},
							},
							show: {
								title: "Calendar Event Filters",
								type: "array",
								items: {
									title: "Calendar Event",
									type: "number",
									required: true,
									enum: events.map((event) => event.ID),
								},
							},
						},
					},
					options: {
						fields: {
							name: {
								helper:
									"This can be anything you want; the name is used in the underwritings management table and in the system status when alerting of a problem with an underwriting.",
							},
							trackID: {
								type: "select",
								optionLabels: tracks.map(
									(track) =>
										`${track.artist} - ${track.title} (ID: ${track.ID})${
											track.enabled !== 1 ? ` (DISABLED)` : ``
										}`
								),
								helper:
									"Choose the underwriting track in RadioDJ to associate with this underwriting. If it was not added, please import it first in the configured underwritings/commercials category and then close / re-open this window.",
								validator: function (callback) {
									let value = this.getValue();
									let track = tracks.find((track) => track.ID === value);
									if (track) {
										let start = track.start_date
											? moment.tz(track.start_date, timezone)
											: undefined;
										let end = track.end_date
											? moment.tz(track.end_date, timezone)
											: undefined;
										if (
											start &&
											moment
												.tz(start, timezone)
												.isBefore(moment.tz("2002-01-02T00:00:01Z", timezone))
										)
											start = undefined;
										if (
											end &&
											moment
												.tz(end, timezone)
												.isBefore(moment.tz("2002-01-02T00:00:01Z", timezone))
										)
											end = undefined;
										callback({
											status: true,
											message: `<p><strong>Selected Track Information:</strong></p>
												<ul>
													<li><strong>Enabled?: </strong>${
														track.enabled === 1
															? `Yes`
															: track.enabled === 0
															? `No (manually disabled)`
															: `No (disabled because track is corrupted)`
													}</li>
													<li><strong>Start Date: </strong>${
														start ? start.format("LLLL") : `Not Set`
													}</li>
													<li><strong>End Date: </strong>${end ? end.format("LLLL") : `Not Set`}</li>
													<li><strong>Spin Count Limit: </strong>${
														track.play_limit > 0
															? track.play_limit
															: `Unlimited`
													}</li>
													<li><strong>Estimated Spins So Far: </strong>${track.count_played}</li>
												</ul>`,
										});
									} else {
										callback({
											status: true,
										});
									}
								},
							},
							mode: {
								rightLabel: "Yes",
								helper:
									"If checked, the number of times this underwriting airs will be adjusted according to how many online listeners are tuned in; the more online listeners tuned in, the more likely/often it will air. <strong>This only applies to algorithmic schedules.</strong>",
							},
							schedule: {
								actionbar: {
									showLabels: true,
									actions: [
										{
											label: "Add",
											action: "add",
										},
										{
											label: "Remove",
											action: "remove",
										},
										{
											label: "Move Up",
											action: "up",
											enabled: false,
										},
										{
											label: "Move Down",
											action: "down",
											enabled: false,
										},
									],
								},
								helpers: [
									"The system uses algorithms during algorthmic schedules to determine when is best to air the underwriting.",
									"<strong>You should always have at least one algorithmic schedule for underwritings with both an end date and spin count set.</strong> Ideally, you should not used any forced schedules in that case.",
									"Specify times in the timezone of the WWSU server.",
								],
								items: {
									fields: {
										dw: {
											type: "select",
											multiple: true,
											multiselect: {
												enableFiltering: true,
												includeSelectAllOption: true,
											},
											optionLabels: [
												"Sunday",
												"Monday",
												"Tuesday",
												"Wednesday",
												"Thursday",
												"Friday",
												"Saturday",
											],
											helper: "Selecting none assumes all days of the week",
											sort: function (a, b) {
												return a.value - b.value;
											},
										},
										h: {
											type: "select",
											multiple: true,
											multiselect: {
												enableFiltering: true,
												includeSelectAllOption: true,
											},
											optionLabels: [
												"12 - 1 AM",
												"1 - 2 AM",
												"2 - 3 AM",
												"3 - 4 AM",
												"4 - 5 AM",
												"5 - 6 AM",
												"6 - 7 AM",
												"7 - 8 AM",
												"8 - 9 AM",
												"9 - 10 AM",
												"10 - 11 AM",
												"11 AM - 12 PM",
												"12 - 1 PM",
												"1 - 2 PM",
												"2 - 3 PM",
												"3 - 4 PM",
												"4 - 5 PM",
												"5 - 6 PM",
												"6 - 7 PM",
												"7 - 8 PM",
												"8 - 9 PM",
												"9 - 10 PM",
												"10 - 11 PM",
												"11 PM - 12 AM",
											],
											helper: "Selecting none assumes all hours of the day",
											sort: function (a, b) {
												return a.value - b.value;
											},
										},
									},
								},
							},
							scheduleForced: {
								actionbar: {
									showLabels: true,
									actions: [
										{
											label: "Add",
											action: "add",
										},
										{
											label: "Remove",
											action: "remove",
										},
										{
											label: "Move Up",
											action: "up",
											enabled: false,
										},
										{
											label: "Move Down",
											action: "down",
											enabled: false,
										},
									],
								},
								helpers: [
									"Forced schedules do NOT use algorithms to determine when to air the underwriting. Instead, <strong>it will always air once per hour during selected days/times.</strong>",
									"Specify times in the timezone of the WWSU server.",
								],
								items: {
									fields: {
										dw: {
											type: "select",
											multiple: true,
											multiselect: {
												enableFiltering: true,
												includeSelectAllOption: true,
											},
											optionLabels: [
												"Sunday",
												"Monday",
												"Tuesday",
												"Wednesday",
												"Thursday",
												"Friday",
												"Saturday",
											],
											helper: "Selecting none assumes all days of the week",
											sort: function (a, b) {
												return a.value - b.value;
											},
										},
										h: {
											type: "select",
											multiple: true,
											multiselect: {
												enableFiltering: true,
												includeSelectAllOption: true,
											},
											optionLabels: [
												"12 - 1 AM",
												"1 - 2 AM",
												"2 - 3 AM",
												"3 - 4 AM",
												"4 - 5 AM",
												"5 - 6 AM",
												"6 - 7 AM",
												"7 - 8 AM",
												"8 - 9 AM",
												"9 - 10 AM",
												"10 - 11 AM",
												"11 AM - 12 PM",
												"12 - 1 PM",
												"1 - 2 PM",
												"2 - 3 PM",
												"3 - 4 PM",
												"4 - 5 PM",
												"5 - 6 PM",
												"6 - 7 PM",
												"7 - 8 PM",
												"8 - 9 PM",
												"9 - 10 PM",
												"10 - 11 PM",
												"11 PM - 12 AM",
											],
											helper: "Selecting none assumes all hours of the day",
											sort: function (a, b) {
												return a.value - b.value;
											},
										},
									},
								},
							},
							show: {
								actionbar: {
									showLabels: true,
									actions: [
										{
											label: "Add",
											action: "add",
										},
										{
											label: "Remove",
											action: "remove",
										},
										{
											label: "Move Up",
											action: "up",
											enabled: false,
										},
										{
											label: "Move Down",
											action: "down",
											enabled: false,
										},
									],
								},
								helper:
									"When you specify one or more calendar events, the underwriting will not air unless <strong>both</strong> a defined schedule is matched (if one is defined) and one of the defined calendar events is currently on the air.",
								items: {
									type: "select",
									optionLabels: events.map(
										(event) => `${event.type}: ${event.hosts} - ${event.name}`
									),
								},
							},
						},
						form: {
							buttons: {
								submit: {
									title: `${data ? `Edit` : `Add`} Underwriting`,
									click: (form, e) => {
										form.refreshValidationState(true);
										if (!form.isValid(true)) {
											form.focus();
											return;
										}
										let value = form.getValue();

										// Convert Alpaca schema to schema used by WWSU
										value.mode = {
											mode: value.mode ? 1 : 0,
											schedule: {
												schedules: value.schedule.map((schedule) => {
													// No idea why, but we have to do this to convert {value, text} into just the values; accessing property value directly results in null.
													schedule.dw = schedule.dw.map((dw) => {
														return dw;
													});
													schedule.h = schedule.h.map((h) => {
														return h;
													});
													return schedule;
												}),
											},
											scheduleForced: {
												schedules: value.scheduleForced.map((schedule) => {
													// No idea why, but we have to do this to convert {value, text} into just the values; accessing property value directly results in null.
													schedule.dw = schedule.dw.map((dw) => {
														return dw;
													});
													schedule.h = schedule.h.map((h) => {
														return h;
													});
													return schedule;
												}),
											},
											show: value.show,
										};

										// Add or edit the underwriting
										if (!data) {
											this.add(value, (success) => {
												if (success) {
													this.modals.underwriting.iziModal("close");
												}
											});
										} else {
											this.edit(value, (success) => {
												if (success) {
													this.modals.underwriting.iziModal("close");
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
			});
	}
}
