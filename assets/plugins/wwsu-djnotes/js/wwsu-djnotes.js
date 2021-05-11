"use strict";

/* global WWSUdb */

// This class manages DJ notes from WWSU.

class WWSUdjnotes extends WWSUevents {
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
			get: "/djnotes/get",
			add: "/djnotes/add",
			edit: "/djnotes/edit",
			remove: "/djnotes/remove",
		};
		this.data = {
			get: {},
		};

		this.modals = {
			notes: new WWSUmodal(`DJ Notes`, null, ``, true, {
				headerColor: "",
				zindex: 1100,
				// openFullscreen: true,
			}),
			newNote: new WWSUmodal(`New DJ Note`, null, ``, true, {
				headerColor: "",
				zindex: 1110,
				// openFullscreen: true,
			}),
		};

		this.notes = [];
	}

	/**
	 * Get records of DJ notes from the WWSU API.
	 *
	 * @param {Object} data Data to be passed to the API.
	 * @param {function} cb Function called after request is made; parameter is the data returned from the server.
	 */
	get(data, cb) {
		this.manager
			.get("hostReq")
			.request(
				{ method: "post", url: this.endpoints.get, data },
				(response) => {
					if (response.constructor === Array) this.notes = response;

					cb(response);
				}
			);
	}

	/**
	 * Permanently remove a DJ Note from the system.
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	remove(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${this.modals.notes.id}`,
					method: "post",
					url: this.endpoints.remove,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error removing DJ note",
							body:
								"There was an error removing the DJ note. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "DJ Note Removed",
							autohide: true,
							delay: 10000,
							body: `DJ note was removed!`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error removing DJ note",
				body:
					"There was an error removing the DJ note. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Add a DJ Note into the system.
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	add(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${this.modals.newNote.id}`,
					method: "post",
					url: this.endpoints.add,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error adding DJ note",
							body:
								"There was an error adding the DJ note. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "DJ Note Added",
							autohide: true,
							delay: 10000,
							body: `DJ note was added!`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error adding DJ note",
				body:
					"There was an error adding the DJ note. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Edit a DJ Note in the system.
	 *
	 * @param {Object} data The data to send in the request to the API
	 * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
	 */
	edit(data, cb) {
		try {
			this.manager.get("directorReq").request(
				{
					dom: `#modal-${this.modals.newNote.id}`,
					method: "post",
					url: this.endpoints.edit,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error editing DJ note",
							body:
								"There was an error editing the DJ note. Please report this to the engineer.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "DJ Note Edited",
							autohide: true,
							delay: 10000,
							body: `DJ note was edited!`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error editing DJ note",
				body:
					"There was an error editing the DJ note. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Generate a DataTables.js table and action buttons for DJ notes of a specific DJ
	 *
	 * @param {Object} dj The dj from WWSUdjs to get notes
	 */
	showDJNotes(dj) {
		// Initialize the table class
		this.modals.notes.title = `DJ Notes for ${dj.name}`;
		this.modals.notes.body = `<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
			this.manager.get("WWSUMeta")
				? this.manager.get("WWSUMeta").meta.timezone
				: moment.tz.guess()
		}.</p><table id="modal-${
			this.modals.notes.id
		}-table" class="table table-striped" style="min-width: 100%;"></table>`;
		this.modals.notes.iziModal("open");

		// Block the modal while we generate the table
		$(`#modal-${this.modals.notes.id}`).block({
			message: "<h1>Loading...</h1>",
			css: { border: "3px solid #a00" },
			timeout: 30000,
			onBlock: () => {
				// Get the data
				this.get({ dj: dj.ID }, (djnotes) => {
					// Extra information
					const format = (d) => {
						return `<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">
					<tr>
						<td>Details:</td>
						<td>${d.description}</td>
					</tr>
					<tr>
						<td>Amount (Remote Credits / Warning Points):</td>
						<td>${d.amount}</td>
					</tr>
					</table>`;
					};

					// Generate the data table
					let table = $(`#modal-${this.modals.notes.id}-table`).DataTable({
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
							{ title: "Type", data: "type" },
							{ title: "Date/Time", data: "date" },
							{ title: "Actions", data: "actions" },
						],
						columnDefs: [{ responsivePriority: 1, targets: 4 }],
						order: [[1, "asc"]],
						pageLength: 25,
						buttons: ["copy", "csv", "excel", "pdf", "print", "colvis"],
						drawCallback: () => {
							// Action button click events
							$(".btn-djnote-edit").unbind("click");
							$(".btn-djnote-delete").unbind("click");

							// Edit event
							$(".btn-djnote-edit").click((e) => {
								let djnote = this.notes.find(
									(note) =>
										note.ID === parseInt($(e.currentTarget).data("djnoteid"))
								);
								this.showDJNoteForm(djnote, dj);
							});

							// Confirm before deleting when someone wants to delete an event
							$(".btn-djnote-delete").click((e) => {
								let djnote = this.notes.find(
									(note) =>
										note.ID === parseInt($(e.currentTarget).data("djnoteid"))
								);
								this.manager.get("WWSUutil").confirmDialog(
									`<p>Are you sure you want to <b>permanently</b> remove DJ note ${
										djnote.ID
									}?</p>
                            <ul>
							<li><strong>This will permanently remove the DJ Note from the DJ's records!</strong> It is not recommended to do this unless this record is no longer relevant.</li>
							${
								djnote.type.startsWith("remote-")
									? `<li>This will remove ${djnote.amount} remote credits from the DJ.</li>`
									: ``
							}
							${
								djnote.type.startsWith("warning-")
									? `<li>This will remove ${djnote.amount} warning points from the DJ.</li>`
									: ``
							}
                            </ul>`,
									djnote.ID,
									() => {
										this.remove(
											{ ID: parseInt($(e.currentTarget).data("djnoteid")) },
											(success) => {
												// Reload the modal
												this.showDJNotes(dj);
											}
										);
									}
								);
							});
						},
					});

					table
						.buttons()
						.container()
						.appendTo(
							$(`#modal-${this.modals.notes.id}-table_wrapper .col-md-6:eq(0)`)
						);

					// Additional info rows
					$(`#modal-${this.modals.notes.id}-table tbody`).on(
						"click",
						"td.details-control",
						(e) => {
							let tr = $(e.target).closest("tr");
							let row = table.row(tr);

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

					// Populate the data table with data.
					let drawRows = () => {
						djnotes.forEach((note) => {
							let badgeClass = `badge-secondary`;
							if (note.type.startsWith("remote-")) badgeClass = `badge-success`;
							if (note.type.startsWith("warning-"))
								badgeClass = `badge-warning`;
							if (note.type.startsWith("public-")) badgeClass = `badge-info`;
							table.rows.add([
								{
									ID: note.ID,
									amount: note.amount,
									description: note.description,
									type: `<span class="badge ${badgeClass}">${note.type}</span>`,
									date: moment
										.tz(
											note.date,
											this.manager.get("WWSUMeta")
												? this.manager.get("WWSUMeta").meta.timezone
												: moment.tz.guess()
										)
										.format("LLLL"),
									actions: `<div class="btn-group"><button class="btn btn-sm btn-warning btn-djnote-edit" data-djnoteid="${note.ID}" title="View / Edit DJ Note"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-djnote-delete" data-djnoteid="${note.ID}" title="Delete this DJ Note"><i class="fas fa-trash"></i></button></div>`,
								},
							]);
						});
						table.draw();

						$(`#modal-${this.modals.notes.id}`).unblock();
					};

					drawRows();
				});
			},
		});

		this.modals.notes.footer = `<button type="button" class="btn btn-outline-success" id="modal-${this.modals.notes.id}-new" data-dismiss="modal">New DJ Note</button>`;
		$(`#modal-${this.modals.notes.id}-new`).unbind("click");
		$(`#modal-${this.modals.notes.id}-new`).click(() => {
			this.showDJNoteForm(null, dj);
		});
	}

	/**
	 * Make a "New DJ Note" Alpaca form in a modal.
	 *
	 * @param {?Object} data When editing an entry, the initial data.
	 * @param {?Object} defaultDj When adding or editing a note from a DJ screen, the WWSUdjs dj from which we were viewing notes.
	 */
	showDJNoteForm(data, defaultDj) {
		this.modals.newNote.body = ``;

		this.modals.newNote.iziModal("open");

		let _djs = this.manager.get("WWSUdjs").find();

		$(this.modals.newNote.body).alpaca({
			schema: {
				title: data ? "Edit DJ Note" : "New DJ Note",
				type: "object",
				properties: {
					ID: {
						type: "number",
					},
					dj: data
						? {
								type: "number",
								required: true,
								title: "Applicable DJ",
								enum: _djs.map((dj) => dj.ID),
						  }
						: undefined,
					djs: !data
						? {
								type: "array",
								items: {
									type: "number",
								},
								required: true,
								title: "Applicable DJs",
								enum: _djs.map((dj) => dj.ID),
								default: defaultDj ? [defaultDj.ID] : [],
						  }
						: undefined,
					date: {
						title: "Date/time of Occurrance",
						format: "datetime",
						required: true,
					},
					type: {
						type: "string",
						required: true,
						title: "Type of Note",
						enum: [
							"public-general",
							"public-reminder",
							"public-praise",
							"private-general",
							"private-watchlist",
							"remote-general",
							"remote-event",
							"remote-production",
							"remote-cdreview",
							"remote-feedback",
							"remote-sportsbroadcast",
							"warning-general",
							"warning-fccviolation",
							"warning-absence",
							"warning-handbookviolation",
							"warning-membership",
							"warning-deadlineviolation",
						],
					},
					description: {
						type: "string",
						title: "Note",
						required: true,
					},
					amount: {
						type: "number",
						default: 0,
						title: "Remote Credits / Warning Points",
						required: true,
					},
				},
			},
			options: {
				fields: {
					ID: {
						type: "hidden",
					},
					dj: {
						type: data ? "select" : "hidden",
						helper: [
							"Change the DJ this note applies to.",
							"WARNING! Changing the DJ will alter the applicable remote credits / warning points. Also, do note that notes that were added to multiple DJs cannot be edited en masse; they must be edited one at a time from each DJ.",
						],
						optionLabels: _djs.map((dj) => dj.name),
					},
					djs: {
						type: data ? "hidden" : "select",
						helpers: [
							"Choose all of the DJs that you want this note to be saved.",
							"WARNING! After adding the note, you cannot edit it for all selected DJs en masse; you must edit the note from each DJ individually in their respective notes screen.",
						],
						optionLabels: _djs.map((dj) => dj.name),
					},
					date: {
						dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
							.parseZone(
								this.manager.get("WWSUMeta")
									? this.manager.get("WWSUMeta").meta.time
									: undefined
							)
							.format("Z")}`,
						picker: {
							inline: true,
							sideBySide: true,
						},
						helper:
							"This should generally be the date/time the note was applicable. For examples: date/time the remote credit was earned; date/time the incident being disciplined occurred, etc.",
					},
					type: {
						type: "select",
						helper:
							"public- are notes that will be visible to the DJ. private- are notes that will not be visible to the DJ. remote- are remote credits earned by the DJ. warning- are warning points / discipline issued against the DJ.",
					},
					description: {
						type: "tinymce",
						options: {
							toolbar:
								"undo redo | bold italic underline strikethrough | fontselect fontsizeselect formatselect | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | fullscreen preview | image link | ltr rtl",
							plugins:
								"autoresize preview paste importcss searchreplace autolink save directionality visualblocks visualchars fullscreen image link table hr pagebreak nonbreaking toc insertdatetime advlist lists wordcount imagetools textpattern noneditable help quickbars",
							menubar: "file edit view insert format tools table help",
						},
						helper:
							"Be sure to include all relevant information especially for warning- types",
					},
				},
				form: {
					buttons: {
						submit: {
							title: data ? "Edit DJ Note" : "Add DJ Note",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();

								if (value.djs) value.djs = value.djs.map((item) => item.value);

								if (data) {
									this.edit(value, (success) => {
										if (success) {
											this.modals.newNote.iziModal("close");
											if (defaultDj) this.showDJNotes(defaultDj);
										}
									});
								} else {
									this.add(value, (success) => {
										if (success) {
											this.modals.newNote.iziModal("close");
											if (defaultDj) this.showDJNotes(defaultDj);
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
	}
}
