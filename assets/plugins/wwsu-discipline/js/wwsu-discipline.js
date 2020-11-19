/* global WWSUdb */

// This class manages discipline.
class WWSUdiscipline extends WWSUdb {
	/**
	 * Construct the directors.
	 *
	 * @param {sails.io} socket The socket connection to WWSU
	 * @param {WWSUreq} noReq A request with no authorization
	 * @param {WWSUreq} noReq A request with host authorization (if using DJ Controls)
	 * @param {WWSUreq} directorReq A request with director authorization (only provide if this client is allowed to manage discipline)
	 * @param {WWSUmeta} meta The WWSUmeta class
	 */
	constructor(socket, noReq, hostReq, directorReq, meta) {
		super(); // Create the db

		this.meta = meta;

		this.endpoints = {
			acknowledge: "/discipline/acknowledge",
			add: "/discipline/add",
			edit: "/discipline/edit",
			getWeb: "/discipline/get-web",
			get: "/discipline/get",
			remove: "/discipline/remove",
		};
		this.data = {
			getWeb: {},
			get: {},
		};
		this.requests = {
			no: noReq,
			host: hostReq,
			director: directorReq,
		};

		this.animations = new WWSUanimations();

		this.table;

		// Discipline socket event for managing discipline
		this.assignSocketEvent("discipline", socket);

		this.on("change", "WWSUdiscipline", () => {
			this.updateTable();
		});

		// This event is called when the client gets issued discipline
		socket.on("discipline-add", (discipline) => {
			var activeDiscipline =
				discipline.active &&
				(discipline.action !== "dayban" ||
					moment(discipline.createdAt)
						.add(1, "days")
						.isAfter(moment(this.meta ? this.meta.meta.time : undefined)));
			if (activeDiscipline || !discipline.acknowledged) {
				this.addDiscipline(discipline);
			}
		});

		this.queuedDiscipline = [];
		this.activeDiscipline = null;

		this.modals = {
			// Modal for displaying issued discipline
			discipline: new WWSUmodal(``, `bg-danger`, ``, false, {
				headerColor: "",
				overlayClose: false,
				zindex: 5000,
				timeout: false,
				openFullscreen: true,
				closeOnEscape: false,
				closeButton: false,
				onClosed: () => {
					if (this.queuedDiscipline.length > 0) {
						let nextDiscipline = this.queuedDiscipline.shift();
						this.showDiscipline(nextDiscipline);
					}
				},
			}),

			// Quick form for muting someone
			mute: new WWSUmodal(`Mute`, `bg-warning`, ``, true, {
				headerColor: "",
				zindex: 1100,
				overlayClose: false,
			}),

			// Quick form for banning someone
			ban: new WWSUmodal(`Ban`, `bg-danger`, ``, true, {
				headerColor: "",
				zindex: 1100,
				overlayClose: false,
			}),

			// Full discipline form
			addDiscipline: new WWSUmodal(``, null, ``, true, {
				headerColor: "",
				zindex: 1100,
				overlayClose: false,
			}),
		};

		this.modals.discipline.footer = `<button type="button" class="btn btn-success" id="modal-${this.modals.discipline.id}-acknowledge">Acknowledge</button>`;

		var util = new WWSUutil();
		util.waitForElement(
			`#modal-${this.modals.discipline.id}-acknowledge`,
			() => {
				$(`#modal-${this.modals.discipline.id}-acknowledge`).click(() => {
					this.acknowledgeDiscipline(this.activeDiscipline);
				});
			}
		);
	}

	// Initialize ONLY if this client will be allowed to manage discipline.
	init() {
		this.replaceData(this.requests.host, this.endpoints.get, this.data.get);
	}

	/**
	 * Check if this client has any discipline issued, past or present, and display modals if so.
	 *
	 * @param {function} cb Callback fired if there are no active disciplines in effect.
	 */
	checkDiscipline(cb) {
		try {
			this.requests.no.request(
				{ method: "post", url: this.endpoints.getWeb, data: {} },
				(body) => {
					var docb = true;
					if (body.length > 0) {
						body.map((discipline) => {
							var activeDiscipline =
								discipline.active &&
								(discipline.action !== "dayban" ||
									moment(discipline.createdAt)
										.add(1, "days")
										.isAfter(
											moment(this.meta ? this.meta.meta.time : undefined)
										));
							if (activeDiscipline) {
								docb = false;
							}
							if (activeDiscipline || !discipline.acknowledged) {
								this.addDiscipline(discipline);
							}
						});
					}
					if (docb) {
						cb();
					}
				}
			);
		} catch (e) {
			console.error(e);
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error checking discipline",
				body:
					"There was an error checking to see if you are allowed to access WWSU. Please try again later, or contact the engineer if this problem continues.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
		}
	}

	/**
	 * Queue a discipline message for modals.
	 *
	 * @param {object} discipline The discipline record returned from WWSU.
	 */
	addDiscipline(discipline) {
		let state = this.modals.discipline.iziModal("getState");

		// Skip if the discipline was already acknowledged
		var activeDiscipline =
			discipline.active &&
			(discipline.action !== "dayban" ||
				moment(discipline.createdAt)
					.add(1, "days")
					.isAfter(moment(this.meta ? this.meta.meta.time : undefined)));

		if (discipline.acknowledged && !activeDiscipline) return;

		if (state !== "closed") {
			this.queuedDiscipline.push(discipline);
		} else {
			this.showDiscipline(discipline);
		}
	}

	/**
	 * Open the modal to display a disciplinary message.
	 *
	 * @param {object} discipline The discipline record returned from WWSU.
	 */
	showDiscipline(discipline) {
		var activeDiscipline =
			discipline.active &&
			(discipline.action !== "dayban" ||
				moment(discipline.createdAt)
					.add(1, "days")
					.isAfter(moment(this.meta ? this.meta.meta.time : undefined)));

		this.modals.discipline.title = `Disciplinary action ${
			activeDiscipline
				? `active against you`
				: `was issued in the past against you`
		}`;
		this.modals.discipline.body = `<p>On ${moment
			.parseZone(discipline.createdAt)
			.format(
				"LLLL Z"
			)}, disciplinary action was issued against you for the following reason: ${
			discipline.message
		}.</p>
        <p>${
					activeDiscipline
						? `A ${discipline.action} is currently active, and you are not allowed to use WWSU's services at this time.`
						: `The discipline has expired, but you must acknowledge this message before you may use WWSU's services. Further issues may warrant more severe disciplinary action.`
				}</p>
        <p>Please contact wwsu1@wright.edu if you have any questions or concerns.</p>`;

		this.activeDiscipline = discipline.ID;

		this.modals.discipline.iziModal("open");
	}

	/**
	 * Acknowledge a discipline in WWSU's API
	 *
	 * @param {number} ID ID of the discipline to acknowledge
	 * @param {?function} cb Callback called after the request is completed
	 */
	acknowledgeDiscipline(ID, cb) {
		try {
			this.requests.no.request(
				{
					dom: `#modal-${this.modals.discipline.id}`,
					method: "post",
					url: this.endpoints.acknowledge,
					data: { ID: ID },
				},
				(response) => {
					this.modals.discipline.iziModal("close");
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error acknowledging",
							body:
								"There was an error acknowledging the discipline. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Acknowledged",
							autohide: true,
							delay: 10000,
							body: `Discipline was acknowledged.`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error acknowledging",
				body:
					"There was an error acknowledging the discipline. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Add a discipline to the WWSU system.
	 *
	 * @param {string} dom DOM query string to block while processing
	 * @param {object} data Data to send to the API
	 * @param {?function} cb Callback after request is made, with parameter being whether or not it was successful.
	 */
	add(dom, data, cb) {
		try {
			this.requests.host.request(
				{
					dom: dom,
					method: "post",
					url: this.endpoints.add,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-warning",
							title: "Error adding discipline",
							body:
								"There was an error adding the discipline. Please make sure you filled all fields correctly. If your DJ Controls is locked to a DJ and you are not on the air, your request might have been blocked.",
							delay: 15000,
							autohide: true,
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Discipline Added",
							autohide: true,
							delay: 10000,
							body: `Discipline was added`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error adding discipline",
				body:
					"There was an error adding discipline. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Edit a discipline record in the WWSU API
	 *
	 * @param {string} dom DOM query string of element to block while processing
	 * @param {object} data Data to send to the API
	 * @param {?function} cb Callback after request is made, with parameter being whether or not it was successful.
	 */
	edit(dom, data, cb) {
		try {
			this.requests.director.request(
				{
					dom: dom,
					method: "post",
					url: this.endpoints.edit,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error editing discipline",
							body:
								"There was an error editing discipline. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Discipline Edited",
							autohide: true,
							delay: 10000,
							body: `Discipline was edited`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error editing discipline",
				body:
					"There was an error editing discipline. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Remove a discipline record in the WWSU API
	 *
	 * @param {object} data Data to send to the API
	 * @param {?function} cb Callback after request is made, with parameter being whether or not it was successful.
	 */
	remove(data, cb) {
		try {
			this.requests.director.request(
				{
					method: "post",
					url: this.endpoints.remove,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error removing discipline",
							body:
								"There was an error removing discipline. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Discipline Removed",
							autohide: true,
							delay: 10000,
							body: `Discipline was removed`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error removing discipline",
				body:
					"There was an error removing discipline. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Initialize bans management table.
	 *
	 * @param {string} table The DOM query string of the div container that should house the table.
	 */
	initTable(table) {
		this.animations.add("bans-init-table", () => {
			var util = new WWSUutil();

			// Init html
			$(table).html(
				`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
					this.meta ? this.meta.meta.timezone : moment.tz.guess()
				}.</p><p><button type="button" class="btn btn-block btn-success btn-bans-new">New Ban / Discipline</button></p><table id="section-bans-table" class="table table-striped display responsive" style="width: 100%;"></table>`
			);

			util.waitForElement(`#section-bans-table`, () => {
				// Generate table
				this.table = $(`#section-bans-table`).DataTable({
					paging: true,
					data: [],
					columns: [
						{
							className: "details-control",
							orderable: false,
							data: null,
							defaultContent: "",
						},
						{ title: "ID", data: "ID" },
						{ title: "IP/Host", data: "IP" },
						{ title: "Issued", data: "createdAt" },
						{ title: "Active?", data: "active" },
						{ title: "Read?", data: "acknowledged" },
						{ title: "Type", data: "type" },
						{ title: "Actions", data: "actions" },
					],
					columnDefs: [{ responsivePriority: 1, targets: 7 }],
					order: [[1, "desc"]],
					pageLength: 25,
					drawCallback: () => {
						// Action button click events
						$(".btn-bans-edit").unbind("click");
						$(".btn-bans-delete").unbind("click");

						$(".btn-bans-edit").click((e) => {
							var ban = this.find().find(
								(ban) => ban.ID === parseInt($(e.currentTarget).data("id"))
							);
							if (ban) {
								this.showBanForm(ban);
							}
						});

						$(".btn-bans-delete").click((e) => {
							var util = new WWSUutil();
							var ban = this.find().find(
								(ban) => ban.ID === parseInt($(e.currentTarget).data("id"))
							);
							util.confirmDialog(
								`Are you sure you want to <strong>permanently</strong> remove the discipline ID ${ban.ID}?
                                <ul>
                                    <li>You should instead edit and uncheck "active" if you still want this discipline for the records.</li>
                                    <li>Removing this record means this device will have access to the WWSU system again (providing there is not another active discipline)</li>
                                </ul>`,
								`${ban.ID}`,
								() => {
									this.remove({ ID: ban.ID });
								}
							);
						});
					},
				});

				// Additional info rows
				let format = (d) => {
					return `<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">
					<tr>
						<td>Reason(s):</td>
						<td>${d.message}</td>
					</tr>
					</table>`;
				};
				$("#section-bans-table tbody").on(
					"click",
					"td.details-control",
					(e) => {
						var tr = $(e.target).closest("tr");
						var row = this.table.row(tr);

						if (row.child.isShown()) {
							// This row is already open - close it
							row.child.hide();
							tr.removeClass("shown");
						} else {
							// Open this row
							row.child(format(row.data())).show();
							tr.addClass("shown");
						}
					}
				);

				// Add click event for new DJ button
				$(".btn-bans-new").unbind("click");
				$(".btn-bans-new").click(() => {
					this.showBanForm();
				});

				// Update with information
				this.updateTable();
			});
		});
	}

	/**
	 * Update initialized table
	 */
	updateTable() {
		if (this.table) {
			this.table.clear();
			this.table.rows.add(
				this.db()
					.get()
					.map((record) => {
						return {
							message: record.message,
							ID: record.ID,
							active: record.active
								? `<i class="fas fa-check-circle text-success" title="This discipline is active."></i>`
								: ``,
							acknowledged: record.acknowledged
								? `<i class="fas fa-check-circle text-success" title="Someone on this IP/host read and acknowledged the discipline message."></i>`
								: ``,
							IP: record.IP,
							type: record.action,
							createdAt: moment
								.tz(
									record.createdAt,
									this.meta ? this.meta.meta.timezone : moment.tz.guess()
								)
								.format("LLL"),
							actions: `<div class="btn-group">
                    <button class="btn btn-sm btn-warning btn-bans-edit" data-id="${record.ID}" title="Edit Discipline"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-bans-delete" data-id="${record.ID}" title="Remove Discipline"><i class="fas fa-trash"></i></button></div>`,
						};
					})
			);
			this.table.draw();
		}
	}

	/**
	 * Show a form for adding / editing discipline
	 *
	 * @param {?object} data If modifying a discipline, the original record/data
	 */
	showBanForm(data) {
		this.modals.addDiscipline.body = ``;
		this.modals.addDiscipline.iziModal("open");

		$(this.modals.addDiscipline.body).alpaca({
			schema: {
				title: data ? `Edit Discipline` : `Add Discipline`,
				type: "object",
				properties: {
					ID: {
						type: "number",
					},
					IP: {
						type: "string",
						required: true,
						title: "IP address or recipient.host string",
					},
					action: {
						type: "string",
						title: "Type of Discipline",
						enum: ["permaban", "dayban", "showban"],
						required: true,
					},
					active: {
						type: "boolean",
						title: "Active?",
						default: true,
					},
					message: {
						type: "string",
						title: "Reason(s) for Discipline",
					},
				},
			},
			options: {
				fields: {
					ID: {
						type: "hidden",
					},
					IP: {
						helper: `<strong>WARNING!</strong> If you ban your own IP or host, DJ Controls will stop working.`,
					},
					action: {
						optionLabels: [
							"Permanent Ban (permaban)",
							"Ban for 24 hours (dayban)",
							"Ban; Marked Inactive when Broadcast Ends (showban)",
						],
					},
					active: {
						rightLabel: "Yes",
						helpers: [
							"<strong>If adding new discipline and you save as not active (unchecked), this discipline will be auto-acknowledged<strong>, meaning the IP/host will never see the disciplinary message.",
							"If unchecked, the discipline will not apply, but this will be in the records for reference.",
						],
					},
					message: {
						type: "tinymce",
						options: {
							toolbar:
								"undo redo | bold italic underline strikethrough | fontselect fontsizeselect formatselect | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | fullscreen preview | image link | ltr rtl",
							plugins:
								"autoresize preview paste importcss searchreplace autolink save directionality visualblocks visualchars fullscreen image link table hr pagebreak nonbreaking toc insertdatetime advlist lists wordcount imagetools textpattern noneditable help quickbars",
							menubar: "file edit view insert format tools table help",
						},
					},
				},
				form: {
					buttons: {
						submit: {
							title: data ? "Edit Discipline" : "Add Discipline",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								var value = form.getValue();
								var util = new WWSUutil();
								if (!data) {
									util.confirmDialog(
										`Are you sure you want to add this discipline?
                                    
                                    <ul>
                                        <li>When you apply this discipline (whether or not you marked "active"), all messages sent by this IP/host will be "deleted".</li>
                                        <li>"Deleted" means although the messages will no longer appear in messengers, they will remain in the database for record keeping.</li>
                                    </ul>`,
										null,
										() => {
											this.add(
												`#modal-${this.modals.addDiscipline.id}`,
												value,
												(success) => {
													if (success) {
														this.modals.addDiscipline.iziModal("close");
													}
												}
											);
										}
									);
								} else {
									this.edit(
										`#modal-${this.modals.addDiscipline.id}`,
										value,
										(success) => {
											if (success) {
												this.modals.addDiscipline.iziModal("close");
											}
										}
									);
								}
							},
						},
					},
				},
			},
			data: data || {},
		});
	}

	/**
	 * Show a simple mute form to mute a recipient
	 *
	 * @param {object} recipient A recipient from the WWSUrecipients db to mute
	 */
	simpleMuteForm(recipient) {
		this.modals.mute.body = ``;
		this.modals.mute.iziModal("open");

		$(this.modals.mute.body).alpaca({
			schema: {
				title: `Mute ${recipient.label}`,
				type: "object",
				properties: {
					message: {
						type: "string",
						title: "Reason(s) for Discipline",
					},
				},
			},
			options: {
				fields: {
					message: {
						type: "tinymce",
						options: {
							toolbar:
								"undo redo | bold italic underline strikethrough | fontselect fontsizeselect formatselect | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | fullscreen preview | image link | ltr rtl",
							plugins:
								"autoresize preview paste importcss searchreplace autolink save directionality visualblocks visualchars fullscreen image link table hr pagebreak nonbreaking toc insertdatetime advlist lists wordcount imagetools textpattern noneditable help quickbars",
							menubar: "file edit view insert format tools table help",
						},
						helper: `A mute means this user will lose access to WWSU for 24 hours, and all messages they sent will be deleted. <strong>You should only mute this user if they are being harassing or inappropriate</strong>`,
					},
				},
				form: {
					buttons: {
						submit: {
							title: `Mute Recipient`,
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								var value = form.getValue();
								this.add(
									`#modal-${this.modals.mute.id}`,
									{
										IP: recipient.host,
										action: "dayban",
										message: value.message,
									},
									(success) => {
										if (success) {
											this.modals.mute.iziModal("close");
										}
									}
								);
							},
						},
					},
				},
			},
			data: {},
		});
	}

	/**
	 * Show a simple mute form to ban a recipient
	 *
	 * @param {object} recipient A recipient from the WWSUrecipients db to ban
	 */
	simpleBanForm(recipient) {
		this.modals.ban.body = ``;
		this.modals.ban.iziModal("open");

		$(this.modals.ban.body).alpaca({
			schema: {
				title: `Ban ${recipient.label}`,
				type: "object",
				properties: {
					message: {
						type: "string",
						title: "Reason(s) for Discipline",
					},
				},
			},
			options: {
				fields: {
					message: {
						type: "tinymce",
						options: {
							toolbar:
								"undo redo | bold italic underline strikethrough | fontselect fontsizeselect formatselect | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | fullscreen preview | image link | ltr rtl",
							plugins:
								"autoresize preview paste importcss searchreplace autolink save directionality visualblocks visualchars fullscreen image link table hr pagebreak nonbreaking toc insertdatetime advlist lists wordcount imagetools textpattern noneditable help quickbars",
							menubar: "file edit view insert format tools table help",
						},
						helper: `A ban means this user will lose access to WWSU permanently, and all messages they sent will be deleted. <strong>You should only ban this user if they are making threats to harm people or destroy WWSU / Wright State property</strong>`,
					},
				},
				form: {
					buttons: {
						submit: {
							title: `Ban Recipient`,
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								var value = form.getValue();
								this.add(
									`#modal-${this.modals.ban.id}`,
									{
										IP: recipient.host,
										action: "permaban",
										message: value.message,
									},
									(success) => {
										if (success) {
											this.modals.ban.iziModal("close");
										}
									}
								);
							},
						},
					},
				},
			},
			data: {},
		});
	}
}
