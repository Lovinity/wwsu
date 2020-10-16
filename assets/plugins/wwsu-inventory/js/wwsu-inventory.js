// This class manages the WWSU inventory and checking equipment in/out.
class WWSUinventory extends WWSUdb {
	/**
	 * Construct the class
	 *
	 * @param {sails.io} socket The socket connection to WWSU
	 * @param {WWSUmeta} meta Initialized WWSUmeta class
	 * @param {WWSUreq} hostReq Request with host authorization
	 * @param {WWSUreq} directorReq Request with Director authorization
	 */
	constructor(socket, meta, hostReq, directorReq) {
		super(); // Create the db

		this.endpoints = {
			add: "/inventory/add",
			checkIn: "/inventory/check-in",
			checkOut: "/inventory/check-out",
			editCheckout: "/inventory/edit-checkout",
			edit: "/inventory/edit",
			get: "/inventory/get",
			removeCheckout: "/inventory/remove-checkout",
			remove: "/inventory/remove",
		};
		this.requests = {
			host: hostReq,
			director: directorReq,
		};
		this.data = {
			get: {},
		};
		this.meta = meta;

		this.animations = new WWSUanimations();

		this.table;

		this.assignSocketEvent("items", socket);

		this.on("change", "WWSUinventory", () => {
			this.updateTable();
		});

		this.newItemModal = new WWSUmodal(`New Item`, null, ``, true, {
			headerColor: "",
			overlayClose: false,
			zindex: 1110,
		});
		this.itemInfoModal = new WWSUmodal(``, null, ``, true, {
			headerColor: "",
			width: 800,
			zindex: 1100,
		});
		this.checkoutModal = new WWSUmodal(``, null, ``, true, {
			headerColor: "",
			zindex: 1110,
		});
		this.checkInOutModal = new WWSUmodal(``, null, ``, true, {
			headerColor: "",
			zindex: 1120,
		});
	}

	// Initialize connection. Call this on socket connect event.
	init() {
		this.replaceData(this.requests.host, this.endpoints.get, this.data.get);
	}

	/**
	 * Initialize the table which will contain our inventory.
	 *
	 * @param {string} table DOM query string where the table should be created (should be a div).
	 */
	initTable(table) {
		this.animations.add("inventory-init-table", () => {
			var util = new WWSUutil();

			// Init html
			$(table).html(
				`<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
					this.meta ? this.meta.meta.timezone : moment.tz.guess()
				}.</p><p><button type="button" class="btn btn-block btn-success btn-inventory-new">New Item</button></p><table id="section-inventory-table" class="table table-striped display responsive" style="width: 100%;"></table>`
			);

			util.waitForElement(`#section-inventory-table`, () => {
				// Generate table
				this.table = $(`#section-inventory-table`).DataTable({
					paging: false,
					data: [],
					columns: [
						{ title: "ID" },
						{ title: "Item" },
						{ title: "Make / Model" },
						{ title: "Location / Bin" },
						{ title: "Quantity" },
						{ title: "Condition" },
						{ title: "Actions" },
					],
					columnDefs: [{ responsivePriority: 1, targets: 6 }],
					order: [
						[3, "asc"],
						[1, "asc"],
					],
					scrollCollapse: true,
					drawCallback: () => {
						// Action button click events
						$(".btn-inventory-checkout").unbind("click");
						$(".btn-inventory-edit").unbind("click");
						$(".btn-inventory-delete").unbind("click");

						$(".btn-inventory-checkout").click((e) => {
							this.showItem(parseInt($(e.currentTarget).data("id")));
						});

						$(".btn-inventory-edit").click((e) => {
							var item = this.find().find(
								(item) => item.ID === parseInt($(e.currentTarget).data("id"))
							);
							this.showItemForm(item);
						});

						$(".btn-inventory-delete").click((e) => {
							var util = new WWSUutil();
							var item = this.find().find(
								(item) => item.ID === parseInt($(e.currentTarget).data("id"))
							);
							util.confirmDialog(
								`Are you sure you want to <strong>permanently</strong> remove the item "${item.name}" in ${item.location} / ${item.subLocation} (ID: ${item.ID})?
                            <ul>
                            <li><strong>Do NOT permanently remove an item unless it is no longer in WWSU's possession permanently.</strong></li>
                            <li>Removing this item will also remove all its check-in and check-out records permanently.</li>
                            </ul>`,
								item.name,
								() => {
									this.remove({ ID: item.ID });
								}
							);
						});
					},
				});

				// Add click event for new item button
				$(".btn-inventory-new").unbind("click");
				$(".btn-inventory-new").click(() => {
					this.showItemForm();
				});

				// Update with information
				this.updateTable();
			});
		});
	}

	/**
	 * Add a new item to the inventory via WWSU API.
	 *
	 * @param {object} data Data to be passed to the WWSU API
	 * @param {?function} cb Callback function after request is finished; passes true if successful.
	 */
	add(data, cb) {
		try {
			this.requests.director.request(
				{
					dom: `#modal-${this.newItemModal.id}`,
					method: "post",
					url: this.endpoints.add,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-warning",
							title: "Error adding item",
							body:
								"There was an error adding the item. Please make sure you filled all fields correctly.",
							delay: 10000,
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Item Added",
							autohide: true,
							delay: 10000,
							body: `Item has been added`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error adding item",
				body:
					"There was an error adding a new item. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Check an item in via WWSU API.
	 *
	 * @param {object} data Data to be passed to the WWSU API
	 * @param {?function} cb Callback function after request is finished; passes true if successful.
	 */
	checkIn(data, cb) {
		try {
			this.requests.director.request(
				{
					dom: `#modal-${this.checkInOutModal.id}`,
					method: "post",
					url: this.endpoints.checkIn,
					data: data,
				},
				(response) => {
					if (response === "OK") {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Item Checked In",
							autohide: true,
							delay: 10000,
							body: `Item has been checked in`,
						});
						if (typeof cb === "function") cb(true);
					} else if (response === "CHECKOUT_NOT_FOUND") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error checking item in",
							body:
								"There was an error checking the item in: checkout record not found. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else if (response === "ITEM_NOT_FOUND") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error checking item in",
							body:
								"There was an error checking the item in: item not found in the inventory. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error checking item in",
							body:
								"There was an error checking the item in. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error checking item in",
				body:
					"There was an error checking the item in. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Check an item out via WWSU API.
	 *
	 * @param {object} data Data to be passed to the WWSU API
	 * @param {?function} cb Callback function after request is finished; passes true if successful.
	 */
	checkOut(data, cb) {
		try {
			this.requests.director.request(
				{
					dom: `#modal-${this.checkInOutModal.id}`,
					method: "post",
					url: this.endpoints.checkOut,
					data: data,
				},
				(response) => {
					if (response === "OK") {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Item checked out",
							autohide: true,
							delay: 10000,
							body: `Item has been checked out`,
						});
						if (typeof cb === "function") cb(true);
					} else if (response === "ITEM_NOT_FOUND") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error checking item out",
							body:
								"There was an error checking the item out: item not found in the inventory. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else if (response === "CANNOT_CHECK_OUT") {
						$(document).Toasts("create", {
							class: "bg-warning",
							title: "Error checking item out",
							body:
								"There was an error checking the item out: that item is not available for checking out via its settings.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else if (response === "QUANTITY_NOT_AVAILABLE") {
						$(document).Toasts("create", {
							class: "bg-warning",
							title: "Error checking item out",
							body:
								"There was an error checking the item out: you tried to check out more of that item (quantity) than is available for checking out.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error checking item out",
							body:
								"There was an error checking the item out. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error checking item out",
				body:
					"There was an error checking the item out. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Edit an item in the inventory via WWSU API.
	 *
	 * @param {object} data Data to be passed to the WWSU API
	 * @param {?function} cb Callback function after request is finished; passes true if successful.
	 */
	edit(data, cb) {
		try {
			this.requests.director.request(
				{
					dom: `#modal-${this.newItemModal.id}`,
					method: "post",
					url: this.endpoints.edit,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-warning",
							title: "Error editing item",
							body:
								"There was an error editing the item. Please make sure you filled all fields correctly.",
							delay: 10000,
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Item Edited",
							autohide: true,
							delay: 10000,
							body: `Item has been edited`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error editing item",
				body:
					"There was an error editing that item. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Edit an inventory checkout record via WWSU API.
	 *
	 * @param {object} data Data to be passed to the WWSU API
	 * @param {?function} cb Callback function after request is finished; passes true if successful.
	 */
	editCheckout(data, cb) {
		try {
			this.requests.director.request(
				{
					dom: `#modal-${this.checkoutModal.id}`,
					method: "post",
					url: this.endpoints.edit,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-warning",
							title: "Error editing checkout record",
							body:
								"There was an error editing the checkout record. Please make sure you filled all fields correctly.",
							delay: 10000,
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Checkout Record Edited",
							autohide: true,
							delay: 10000,
							body: `Checkout record has been edited`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error editing checkout record",
				body:
					"There was an error editing that checkout record. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Retrieve information about the items (or a single item) from the WWSU API.
	 *
	 * @param {object} data Data to be passed to the WWSU API
	 * @param {?function} cb Callback function after request is finished; passes the data returned if successful, false if not.
	 */
	get(data, cb) {
		try {
			this.requests.host.request(
				{
					method: "post",
					url: this.endpoints.get,
					data: data,
				},
				(response) => {
					if (typeof response !== "object") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error fetching items",
							body:
								"There was an error fetching that item. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						if (typeof cb === "function") cb(response);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error fetching items",
				body:
					"There was an error fetching that item. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Remove an item from the inventory via WWSU API.
	 *
	 * @param {object} data Data to be passed to the WWSU API
	 * @param {?function} cb Callback function after request is finished; passes true if successful.
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
							title: "Error removing item",
							body:
								"There was an error removing that item. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Item Removed",
							autohide: true,
							delay: 10000,
							body: `Item has been removed`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error removing item",
				body:
					"There was an error removing that item. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Remove a checkout record from the inventory via WWSU API.
	 *
	 * @param {object} data Data to be passed to the WWSU API
	 * @param {?function} cb Callback function after request is finished; passes true if successful.
	 */
	removeCheckout(data, cb) {
		try {
			this.requests.director.request(
				{
					method: "post",
					url: this.endpoints.removeCheckout,
					data: data,
				},
				(response) => {
					if (response !== "OK") {
						$(document).Toasts("create", {
							class: "bg-danger",
							title: "Error removing checkout record",
							body:
								"There was an error removing that checkout record. Please report this to the engineer.",
							autoHide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg",
						});
						if (typeof cb === "function") cb(false);
					} else {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Checkout record Removed",
							autohide: true,
							delay: 10000,
							body: `Checkout record has been removed`,
						});
						if (typeof cb === "function") cb(true);
					}
				}
			);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error removing checkout record",
				body:
					"There was an error removing that checkout record. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			console.error(e);
			if (typeof cb === "function") cb(false);
		}
	}

	/**
	 * Generate HTML progress bar indicating the condition of an item.
	 *
	 * @param {string} condition The condition string
	 * @returns {string} HTML progress bar, or X icon for broken condition.
	 */
	generateConditionProgress(condition) {
		let icon = `secondary`;
		let progress = 100;
		switch (condition) {
			case "Excellent":
				icon = "success";
				progress = 100;
				break;
			case "Very Good":
				icon = "teal";
				progress = 80;
				break;
			case "Good":
				icon = "info";
				progress = 60;
				break;
			case "Fair":
				icon = "warning";
				progress = 40;
				break;
			case "Poor":
				icon = "orange";
				progress = 20;
				break;
			case "Broken":
				icon = "danger";
				progress = 0;
				break;
		}

		return progress > 0
			? `<div class="progress mb-3" title="Item condition: ${condition}"><div class="progress-bar bg-${icon}" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" style="width: ${progress}%">
		<span class="sr-only">${condition}</span>
	  </div></div>`
			: `<i class="fas fa-times-circle text-danger" title="Item condition: ${condition}"></i>`;
	}

	/**
	 * Update the inventory table if it exists
	 */
	updateTable() {
		this.animations.add("inventory-update-table", () => {
			if (this.table) {
				this.table.clear();
				this.find().forEach((item) => {
					this.table.row.add([
						item.ID,
						item.name,
						`${item.make ? item.make : `Unknown`} / ${
							item.model ? item.model : `Unknown`
						}`,
						`${item.location}${
							item.subLocation ? ` / ${item.subLocation}` : ``
						}`,
						item.quantity,
						this.generateConditionProgress(item.condition),
						`<div class="btn-group"><button class="btn btn-sm btn-primary btn-inventory-checkout" data-id="${item.ID}" title="Check In / Check Out, and view check-in / check-out history."><i class="fas fa-clipboard-check"></i></button><button class="btn btn-sm btn-warning btn-inventory-edit" data-id="${item.ID}" title="Edit Inventory Item"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger btn-inventory-delete" data-id="${item.ID}" title="Remove Inventory Item"><i class="fas fa-trash"></i></button></div>`,
					]);
				});
				this.table.draw();
			}
		});
	}

	/**
	 * Show the form for a new item / editing an existing item.
	 *
	 * @param {?object} data If editing an existing item, this should contain the item's original properties.
	 */
	showItemForm(data) {
		this.newItemModal.body = ``;

		this.newItemModal.iziModal("open");

		$(this.newItemModal.body).alpaca({
			schema: {
				title: data ? "Edit Item" : "New Item",
				type: "object",
				properties: {
					ID: {
						type: "number",
					},
					name: {
						type: "string",
						required: true,
						title: "Name of Item",
						maxLength: 255,
					},
					make: {
						type: "string",
						title: "Make / Brand",
						maxLength: 255,
					},
					model: {
						type: "string",
						title: "Model",
						maxLength: 255,
					},
					location: {
						type: "string",
						required: true,
						title: "Location (Room)",
						enum: [
							"Lobby",
							"OnAir Studio",
							"Production Studio",
							"GM Office",
							"Engineering",
							"Penthouse",
						],
					},
					subLocation: {
						type: "string",
						title: "Sub-location / bin",
					},
					quantity: {
						type: "number",
						title: "Quantity",
						required: true,
						minimum: 1,
					},
					condition: {
						type: "string",
						required: true,
						enum: ["Excellent", "Very Good", "Good", "Fair", "Poor", "Broken"],
						title: "Condition",
					},
					canCheckOut: {
						type: "boolean",
						title: "Item can be Checked Out",
					},
					otherInfo: {
						type: "string",
						title: "Additional Information",
					},
				},
			},
			options: {
				fields: {
					ID: {
						type: "hidden",
					},
					quantity: {
						type: "integer",
					},
					condition: {
						helper:
							"Excellent = New / like new. Very Good = Gently Used. Good = Noticably Used. Fair = Extensively Used / Dirty. Poor = Visible damage, but still works. Broken = Item is inoperatable.",
					},
					canCheckOut: {
						rightLabel: "Yes",
					},
					otherInfo: {
						type: "textarea",
						helper:
							"Here, you might provide additional info on the condition of the item, or special steps that must be taken by anyone who checks the item out/in.",
					},
				},
				form: {
					buttons: {
						submit: {
							title: data ? "Edit Item" : "Add Item",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								var value = form.getValue();
								if (data) {
									this.edit(value, (success) => {
										if (success) {
											this.newItemModal.iziModal("close");
										}
									});
								} else {
									this.add(value, (success) => {
										if (success) {
											this.newItemModal.iziModal("close");
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

	/**
	 * Open a modal for a specific item with extra info and its checkout history (plus a button to check out).
	 *
	 * @param {number} item The item number
	 */
	showItem(item) {
		this.itemInfoModal.title = `Loading...`;
		this.itemInfoModal.body = ``;
		this.itemInfoModal.iziModal("open");
		this.get({ ID: item }, (response) => {
			if (response) {
				var util = new WWSUutil();

				this.itemInfoModal.title = `Item ${response.name} (${response.ID})`;
				this.itemInfoModal.body = `<table class="table table-striped">
				<thead>
					<tr>
						<th>Property</th>
						<th>Value</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Name</td>
						<td>${response.name}</td>
					</tr>
					<tr>
						<td>Make / Model</td>
						<td>${response.make ? response.make : `Unknown`} / ${
					response.model ? response.model : `Unknown`
				}</td>
					</tr>
					<tr>
						<td>Location / Sub-location</td>
						<td>${response.location}${
					response.subLocation ? ` / ${response.subLocation}` : ``
				}</td>
					</tr>
					<tr>
						<td>Condition</td>
						<td>${this.generateConditionProgress(response.condition)}</td>
					</tr>
					<tr>
						<td>Total Quantity</td>
						<td>${response.quantity}</td>
					</tr>
					<tr>
						<td>Available Quantity</td>
						<td>${response.availableQuantity[1]}</td>
					</tr>
					<tr>
						<td>Additional Info</td>
						<td>${response.otherInfo}</td>
					</tr>
					<tr>
						<td>Check Out</td>
						<td>${
							response.canCheckOut
								? `${
										response.availableQuantity[1] > 0
											? `<button type="button" class="btn btn-block btn-success btn-inventory-check-out" data-id="${response.ID}">Check Out</button>`
											: `No available quantity left to check out at this time`
								  }`
								: `Item may not be checked out`
						}</td>
					</tr>
				</tbody>
			</table>
			<h2>Check-out Records</h2>
				<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
					this.meta ? this.meta.meta.timezone : moment.tz.guess()
				}.</p><table id="section-inventory-checkout-table" class="table table-striped display responsive" style="width: 100%;"></table>`;

				util.waitForElement(`#section-inventory-checkout-table`, () => {
					// Generate table

					// Extra information
					let format = (d) => {
						return `<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">
						<tr>
							<td>Condition when checked out:</td>
							<td>${this.generateConditionProgress(d.checkOutCondition)}</td>
						</tr>
						<tr>
							<td>Quantity checked out:</td>
							<td>${d.checkOutQuantity}</td>
						</tr>
						<tr>
							<td>Check Out Notes:</td>
							<td>${d.checkOutNotes}</td>
						</tr>
						<tr>
							<td>Check In Due:</td>
							<td>${
								d.checkInDue
									? moment
											.tz(
												d.checkInDue,
												this.meta ? this.meta.meta.timezone : moment.tz.guess()
											)
											.format("llll")
									: `Not Set`
							}</td>
						</tr>
						<tr>
							<td>Condition when checked in:</td>
							<td>${
								d.checkInCondition
									? this.generateConditionProgress(d.checkInCondition)
									: `Still Checked Out`
							}</td>
						</tr>
						<tr>
							<td>Quantity checked in:</td>
							<td>${d.checkInQuantity ? d.checkInQuantity : `Still Checked Out`}</td>
						</tr>
						<tr>
							<td>Check In Notes:</td>
							<td>${d.checkInNotes || `N/A`}</td>
						</tr>
						</table>`;
					};
					let table = $(`#section-inventory-checkout-table`).DataTable({
						paging: true,
						data: response.checkoutRecords.map((record) => {
							record.checkOutDate = moment
								.tz(
									record.checkOutDate,
									this.meta ? this.meta.meta.timezone : moment.tz.guess()
								)
								.format("lll");
							record.checkInDate = record.checkInDate
								? moment
										.tz(
											record.checkInDate,
											this.meta ? this.meta.meta.timezone : moment.tz.guess()
										)
										.format("lll")
								: `Checked Out`;
							// TODO: Add edit button
							record.actions = `<div class="btn-group">${
								record.checkInDate === "Checked Out"
									? `<button class="btn btn-sm btn-success btn-inventory-checkout-checkin" data-id="${record.ID}" data-itemid="${record.item}" title="Check the item back in"><i class="fas fa-clipboard-check"></i></button>`
									: ``
							}<button class="btn btn-sm btn-danger btn-inventory-checkout-delete" data-id="${
								record.ID
							}" data-itemid="${
								record.item
							}" title="Remove Checkout Record"><i class="fas fa-trash"></i></button></div>`;
							return record;
						}),
						columns: [
							{
								className: "details-control",
								orderable: false,
								data: null,
								defaultContent: "",
							},
							{ title: "ID", data: "ID" },
							{ title: "Name", data: "name" },
							{ title: "Checked Out", data: "checkOutDate" },
							{ title: "Checked In", data: "checkInDate" },
							{ title: "Actions", data: "actions" },
						],
						columnDefs: [{ responsivePriority: 1, targets: 5 }],
						order: [[1, "asc"]],
						pageLength: 25,
						drawCallback: () => {
							// Action button click events
							$(".btn-inventory-checkout-checkin").unbind("click");
							$(".btn-inventory-checkout-delete").unbind("click");

							$(".btn-inventory-checkout-checkin").click((e) => {
								this.showCheckInForm(
									parseInt($(e.currentTarget).data("id")),
									parseInt($(e.currentTarget).data("itemid"))
								);
							});

							$(".btn-inventory-checkout-delete").click((e) => {
								var id = parseInt($(e.currentTarget).data("id"));
								var util = new WWSUutil();
								util.confirmDialog(
									`Are you sure you want to <strong>permanently</strong> remove the checkout record ID ${id}?
                            <p><strong>Do NOT permanently remove a checkout record unless it was added by mistake.</strong></p>`,
									`${id}`,
									() => {
										this.removeCheckout({ ID: id }, (response) => {
											if (response) {
												this.showItem(
													parseInt($(e.currentTarget).data("itemid"))
												);
											}
										});
									}
								);
							});
						},
					});

					// Additional info rows
					$("#section-inventory-checkout-table tbody").on(
						"click",
						"td.details-control",
						function () {
							var tr = $(this).closest("tr");
							var row = table.row(tr);

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

					// Add click event for check out button
					$(".btn-inventory-check-out").unbind("click");
					$(".btn-inventory-check-out").click((e) => {
						this.showCheckOutForm(parseInt($(e.currentTarget).data("id")));
					});
				});
			}
		});
	}

	/**
	 * Show the form for checking an item out
	 *
	 * @param {number} itemID The ID of the item being checked out.
	 */
	showCheckOutForm(itemID) {
		this.checkInOutModal.body = ``;

		this.checkInOutModal.iziModal("open");

		let item = this.find({ ID: itemID }, true);

		$(this.checkInOutModal.body).alpaca({
			schema: {
				title: `Check Out ${item.name} (${item.ID})`,
				type: "object",
				properties: {
					item: {
						type: "number",
					},
					name: {
						type: "string",
						required: true,
						title: "Full Name of Person Using Item",
					},
					checkOutQuantity: {
						minimum: 1,
						required: true,
						title: "Quantity of Item being Checked Out",
					},
					checkOutCondition: {
						required: true,
						enum: ["Excellent", "Very Good", "Good", "Fair", "Poor", "Broken"],
						title: "Item Condition Upon Checking Out",
					},
					checkOutDate: {
						title: "Check Out Date/Time",
						required: true,
						format: "datetime",
					},
					checkInDue: {
						title: "Due Date of Check-In / Return",
						format: "datetime",
					},
					checkOutNotes: {
						type: "string",
						title: "Check-Out Notes",
					},
				},
			},
			options: {
				fields: {
					item: {
						type: "hidden",
					},
					checkOutQuantity: {
						helper:
							"This helps keep track of quantity and alert directors via system status if there are missing quantities of this item.",
					},
					checkOutDate: {
						dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
							.parseZone(this.meta ? this.meta.meta.time : undefined)
							.format("Z")}`,
						picker: {
							inline: true,
							sideBySide: true,
						},
					},
					checkOutCondition: {
						helpers: [
							"Excellent = New / like new. Very Good = Gently Used. Good = Noticably Used. Fair = Extensively Used / Dirty. Poor = Visible damage, but still works. Broken = Item is inoperatable.",
							"Note: This does NOT change the condition listed for the item itself in the inventory; you will need to change this manually if applicable.",
						],
					},
					checkInDue: {
						dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
							.parseZone(this.meta ? this.meta.meta.time : undefined)
							.format("Z")}`,
						picker: {
							inline: true,
							sideBySide: true,
						},
						helper:
							"When you specify a date/time, if the item(s) are not checked back in by the provided date/time, the system status will show an info message of the past-due item(s) until checked back in.",
					},
					checkOutNotes: {
						type: "textarea",
						helper:
							"Here, you might provide additional info regarding the checking out of this item. For example, you can explain how/where/when the person plans to use the item/equipment.",
					},
				},
				form: {
					buttons: {
						submit: {
							title: `Check Item Out`,
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								var value = form.getValue();
								this.checkOut(value, (success) => {
									if (success) {
										this.checkInOutModal.iziModal("close");
										this.showItem(item.ID);
									}
								});
							},
						},
					},
				},
			},
			data: {
				item: itemID,
				checkOutDate: moment(this.meta.meta.time).toISOString(true),
			},
		});
	}

	/**
	 * Show the form to check an item back in.
	 *
	 * @param {number} checkoutID The ID of the checkout record
	 * @param {number} itemID The ID of the item
	 */
	showCheckInForm(checkoutID, itemID) {
		this.checkInOutModal.body = ``;

		this.checkInOutModal.iziModal("open");

		let item = this.find({ ID: itemID }, true);

		$(this.checkInOutModal.body).alpaca({
			schema: {
				title: `Check In record ${checkoutID} for ${item.name}`,
				type: "object",
				properties: {
					ID: {
						type: "number",
					},
					checkInQuantity: {
						minimum: 1,
						required: true,
						title: "Quantity of item being Checked In",
					},
					checkInCondition: {
						required: true,
						enum: ["Excellent", "Very Good", "Good", "Fair", "Poor", "Broken"],
						title: "Item Condition Upon Checking In",
					},
					checkInDate: {
						title: "Check In Date/Time",
						required: true,
						format: "datetime",
					},
					checkInNotes: {
						type: "string",
						title: "Check-In Notes",
					},
				},
			},
			options: {
				fields: {
					ID: {
						type: "hidden",
					},
					checkInQuantity: {
						helper:
							"If the quantity of the item being checked in is less than what was checked out, system status will alert of missing quantity.",
					},
					checkInDate: {
						dateFormat: `YYYY-MM-DDTHH:mm:[00]${moment
							.parseZone(this.meta ? this.meta.meta.time : undefined)
							.format("Z")}`,
						picker: {
							inline: true,
							sideBySide: true,
						},
					},
					checkInCondition: {
						helpers: [
							"Excellent = New / like new. Very Good = Gently Used. Good = Noticably Used. Fair = Extensively Used / Dirty. Poor = Visible damage, but still works. Broken = Item is inoperatable.",
							"Note: This does NOT change the condition listed for the item itself in the inventory; you will need to change this manually if applicable.",
						],
					},
					checkInNotes: {
						type: "textarea",
						helper:
							"Here, you might provide additional info regarding the checking in of this item. For example, if any visible damage or wear and tear was observed and probably caused by this person, you may want to log that.",
					},
				},
				form: {
					buttons: {
						submit: {
							title: `Check Item In`,
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								var value = form.getValue();
								this.checkIn(value, (success) => {
									if (success) {
										this.checkInOutModal.iziModal("close");
										this.showItem(itemID);
									}
								});
							},
						},
					},
				},
			},
			data: {
				ID: checkoutID,
				checkInDate: moment(this.meta.meta.time).toISOString(true),
			},
		});
	}
}
