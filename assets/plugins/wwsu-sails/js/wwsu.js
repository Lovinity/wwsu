"use strict";

/* global moment, TAFFY */

/**
 * This class is a custom WWSU event emitter.
 */
class WWSUevents {
	constructor() {
		// Structure: this.events[key] is an object where key = event name; this.events[key][key2] is a function where key2 is the scope.
		this.events = {};
	}

	/**
	 * Emit an event across all scopes.
	 *
	 * @param {string} event name of the event to emit.
	 * @param {Array} args array of arguments to pass to the event.
	 */
	emitEvent(event, args) {
		if (typeof this.events[event] === "object") {
			for (let scope in this.events[event]) {
				if (
					Object.prototype.hasOwnProperty.call(this.events[event], scope) &&
					typeof this.events[event][scope].fn === "function"
				) {
					this.events[event][scope].fn(...args);
					if (this.events[event][scope].once) {
						delete this.events[event][scope];
					}
				}
			}
		}
	}

	/**
	 * Create an event listener.
	 *
	 * @param {string} event name of the event
	 * @param {string} scope a scope ID allowing for multiple listeners for the same event; providing an ID that already exists will overwrite it.
	 * @param {function} fn the function to execute when the event is emitted. Arguments are passed as spreaded parameters.
	 */
	on(event, scope, fn) {
		if (typeof this.events[event] === "undefined") {
			this.events[event] = {};
		}
		this.events[event][scope] = { once: false, fn };
	}

	/**
	 * Create an event listener that destroys itself after one emission (only on the provided scope).
	 *
	 * @param {string} event name of the event
	 * @param {string} scope a scope ID allowing for multiple listeners for the same event; providing an ID that already exists will overwrite it.
	 * @param {function} fn the function to execute when the event is emitted. Arguments are passed as spreaded parameters.
	 */
	once(event, scope, fn) {
		if (typeof this.events[event] === "undefined") {
			this.events[event] = {};
		}
		this.events[event][scope] = { once: true, fn };
	}

	/**
	 * Destroy an event listener on the provided scope.
	 *
	 * @param {string} event name of the event
	 * @param {string} scope scope ID to destroy the listener from
	 */
	off(event, scope) {
		if (this.events[event] && this.events[event][scope]) {
			delete this.events[event][scope];
		}
	}
}

/**
 * WWSUdb manages data from the WWSU websockets
 *
 * @class WWSUdb
 */
// eslint-disable-next-line no-unused-lets
class WWSUdb extends WWSUevents {
	/**
	 *Creates an instance of WWSUdb.
	 * @param {TAFFY} db TAFFY DB to use
	 * @memberof WWSUdb
	 */
	constructor(db) {
		super();
		this._db = db || TAFFY();
	}

	/**
	 * Return the TAFFYDB associated with this member.
	 *
	 * @readonly
	 * @memberof WWSUdb
	 */
	get db() {
		return this._db;
	}

	/**
	 * Execute a query on the database.
	 *
	 * @param {Array || Object} _query An array of records to replace in the database (if replace = true), or a query object {insert || update: {record object}} or {remove: record ID}.
	 * @param {boolean} [replace=false] If true, this query will replace everything in the TAFFY database.
	 * @memberof WWSUdb
	 */
	query(_query, replace = false) {
		let query = _.cloneDeep(_query);
		if (replace) {
			if (query.constructor === Array) {
				this._db().remove();
				this._db.insert(query);
				this.emitEvent("replace", [this._db()]);
				this.emitEvent("change", [this._db(), query]);
			}
			return null;
		} else {
			for (let key in query) {
				if (Object.prototype.hasOwnProperty.call(query, key)) {
					switch (key) {
						case "insert":
							this._db.insert(query[key]);
							this.emitEvent("insert", [query[key], this._db()]);
							break;
						case "update":
							this._db({ ID: query[key].ID }).update(query[key]);
							this.emitEvent("update", [query[key], this._db()]);
							break;
						case "remove":
							this._db({ ID: query[key] }).remove();
							this.emitEvent("remove", [query[key], this._db()]);
							break;
					}
					this.emitEvent("change", [this._db(), query]);
				}
			}
		}
	}

	/**
	 * Safely find and return array of matching documents in the db using cloneDeep.
	 *
	 * @param {object|function} _query The search criteria
	 * @returns {array|?object} Array of matching records if first = false, or single object (null: none found) of the first found record if true
	 */
	find(_query, first = false) {
		let query;
		if (typeof _query === "object") {
			query = _.cloneDeep(_query);
		} else {
			query = _query;
		}
		let records;
		if (!first) {
			records = this._db(query).get();
		} else {
			records = this._db(query).first();
		}
		return _.cloneDeep(records);
	}

	/**
	 * Call WWSU's API and replace all data in memory with what WWSU returns. Also establishes socket event.
	 *
	 * @param {WWSUreq} WWSUreq The request to use
	 * @param {string} path URL path relative to the WWSU server
	 * @param {object} data Data to pass in the request
	 */
	replaceData(WWSUreq, path, data = {}) {
		try {
			WWSUreq.request({ method: "POST", url: path, data: data }, (body) => {
				this.query(body, true);
			});
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * Assign a socket event to this database which follows WWSU's websocket standards for data.
	 *
	 * @param {string} event Socket event name to attach
	 * @param {sails.io} socket WWSU socket to use
	 */
	assignSocketEvent(event, socket) {
		socket.on(event, (data) => {
			this.query(data, false);
		});
	}
}

// Class for managing requests and authorization to WWSU's API
// eslint-disable-next-line no-unused-lets

class WWSUreq {
	/**
	 * Construct the class
	 *
	 * @param {WWSUmodules} manager The WWSU modules that initiated this module
	 * @param {object} options Object of options passed in the manager.add method
	 * @param {string} options.host Host name of this client
	 * @param {string} options.db Name of the WWSU module containing the WWSUdb containing records of those that can authorize with this request, if applicable
	 * @param {?object} options.filter Filter applicable records that can authorize in the WWSUdb by this TAFFY query object, if applicable
	 * @param {?string} options.usernameField Name of the database column containing names for authorization, if applicable
	 * @param {?string} options.authPath URL path in WWSU's API for authorization and getting a token, if applicable
	 * @param {?string} options.authName Human friendly name of the type of person (eg. "Director") that must authorize themselves for this request
	 */
	constructor(manager, options) {
		this.manager = manager;
		this.socket = this.manager.socket;
		this.host = options.host || null;
		this.db = options.db || null;
		this.filter = options.filter || null;
		this.authPath = options.authPath || null;
		this.authName = options.authName || null;
		this.usernameField = options.usernameField || null;
		this.loginID = null;

		// Storing authorization tokens in memory
		this._token = null;
		this._time = null;
		this._expiration = null;
	}

	get token() {
		return this._token;
	}

	set token(value) {
		this._token = value;
	}

	get time() {
		return this._time;
	}

	set time(value) {
		this._time = value;
	}

	get expiration() {
		return this._expiration;
	}

	set expiration(value) {
		this._expiration = value;
	}

	// Is the current token expected to be expired?
	expired() {
		return (
			this._token === null ||
			moment().isAfter(
				moment(this.time).add(this.expiration - 1000, "milliseconds")
			)
		);
	}

	/**
	 * Check authorization, and then make a request to WWSU's API
	 *
	 * @param {object} opts Options to pass to the sails.io socket request
	 * @param {string} opts.dom DOM query string of the element to block / show login form when login is necessary vis JQuery blockui.
	 * @param {function} cb Callback executed after the request is made. Contains response body as parameter.
	 */
	request(opts, cb) {
		// Called after logging in and getting a token
		const step2 = (username, password) => {
			this._authorize(username, password, (token) => {
				if (token === 0) {
					$(document).Toasts("create", {
						class: "bg-danger",
						title: "Error Authorizing",
						body:
							"There was an error authorizing. Did you type your password in correctly?",
						autoHide: true,
						delay: 10000,
						icon: "fas fa-skull-crossbones fa-lg",
					});
				} else if (
					typeof token.errToken !== `undefined` ||
					typeof token.token === "undefined"
				) {
					$(document).Toasts("create", {
						class: "bg-danger",
						title: "Error Authorizing",
						body: `${
							typeof token.errToken !== `undefined`
								? `Failed to authenticate; please try again. ${token.errToken}`
								: `Failed to authenticate; unknown error.`
						}`,
						autoHide: true,
						delay: 10000,
						icon: "fas fa-skull-crossbones fa-lg",
					});
				} else {
					this._tryRequest(opts, (body2) => {
						cb(body2);
					});
				}
			});
		};

		// Token expected to be expired?
		if (this.expired()) {
			// If /auth/host, we don't need to prompt for login; authenticate by host
			if (this.authPath === "/auth/host") {
				step2(this.host, null);
				// If auth path is null, this request doesn't need authentication; proceed with the request immediately
			} else if (this.authPath === null) {
				this._tryRequest(opts, (body2) => {
					cb(body2);
				});
				// Otherwise, prompt for a login
			} else {
				this._promptLogin((username, password) => step2(username, password));
			}

			// Otherwise, try the request, and for safe measures, prompt for login if we end up getting an auth error
		} else {
			this._tryRequest(opts, (body) => {
				if (body === -1) {
					if (this.authPath !== "/auth/host") {
						this.token = null;
						this._promptLogin((username, password) =>
							step2(username, password)
						);
					} else {
						step2(this.host, null);
					}
				} else if (body !== 0) {
					// eslint-disable-next-line callback-return
					cb(body);
				}
			});
		}
	}

	/**
	 * Helper: Attempt the API request with the current token.
	 *
	 * @param {object} opts Options to pass to the sails.io request
	 * @param {string} opts.dom The DOM query string to be blocked by JQuery BlockUI while the request is being made
	 * @param {function} cb Function called after the request is made. Parameter: -1 = unauthorized. 0 = No body returned. Otherwise, returns body.
	 */
	_tryRequest(opts, cb) {
		try {
			if (this.authPath !== null) {
				if (typeof opts.headers === `undefined`) {
					opts.headers = {
						Authorization: "Bearer " + this.token,
					};
				} else {
					opts.headers["Authorization"] = "Bearer " + this.token;
				}
			}

			const doRequest = (cb2) => {
				this.socket.request(opts, (body) => {
					cb2();
					if (!body) {
						// eslint-disable-next-line standard/no-callback-literal
						cb(0);
					} else if (typeof body.tokenErr !== `undefined`) {
						// eslint-disable-next-line standard/no-callback-literal
						cb(-1);
					} else {
						cb(body);
					}
				});
			};

			if (opts.dom) {
				$(opts.dom).block({
					message: "<h1>Processing...</h1>",
					css: { border: "3px solid #a00" },
					timeout: 120000,
					onBlock: () => {
						doRequest(() => {
							$(opts.dom).unblock();
						});
					},
				});
			} else {
				doRequest(() => {});
			}
		} catch (unusedE) {
			// eslint-disable-next-line standard/no-callback-literal
			cb(0);
		}
	}

	/**
	 * Make an authorization request to WWSU for a token, and store the token in memory.
	 *
	 * @param {string} username Username of the person authorizing
	 * @param {string} password Password provided
	 * @param {function} cb Function called after request. 0 = failed to authorize, otherwise contains authorization information.
	 */
	_authorize(username, password, cb) {
		try {
			this.socket.request(
				{
					method: "POST",
					url: this.authPath,
					data: { username: username, password: password },
				},
				(body) => {
					if (!body) {
						// eslint-disable-next-line standard/no-callback-literal
						cb(0);
					} else {
						if (typeof body.token !== `undefined`) {
							this.token = body.token;
							this.expiration = body.expires || 60000 * 5;
							this.time = moment();
							cb(body);
						} else if (typeof body.errToken !== `undefined`) {
							cb(body);
						} else {
							// eslint-disable-next-line standard/no-callback-literal
							cb(0);
						}
					}
				}
			);
		} catch (unusedE) {
			// eslint-disable-next-line standard/no-callback-literal
			cb(0);
		}
	}

	/**
	 * Create an authorization prompt with iziModal.
	 *
	 * @param {function} cb Function called after user completes the prompt. Contains (username, password) as parameters.
	 */
	_promptLogin(cb) {
		let fdb;
		if (typeof this.filter === "object") {
			fdb = this.manager.get(this.db).db(this.filter);
		} else {
			fdb = this.manager.get(this.db).db();
		}
		if (!fdb || fdb.length < 1) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Authorization error",
				body: `There is no ${this.authName} available to authorize. Please report this to the engineer.`,
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			return null;
		}

		if (!this.usernameField) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Authorization error",
				body: `A username field was not specified for ${this.authName} authorization. Please report this to the engineer.`,
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
			return null;
		}

		let tempModal = new WWSUmodal(
			`${this.authName} Authorization Required`,
			`bg-danger`,
			``,
			true,
			{
				headerColor: "",
				overlayClose: false,
				zindex: 5000,
				timeout: false,
				closeOnEscape: true,
				closeButton: true,
				onClosed: () => {
					tempModal.iziModal("destroy");
					$(`#modal-${tempModal.id}`).remove();
					tempModal = undefined;
				},
			}
		);

		tempModal.body = `<p>To perform this action, you must login with ${this.authName} credentials. Please choose a user, and then type in your password.</p><div id="modal-${tempModal.id}-form"></div>`;

		tempModal.iziModal("open");

		let util = new WWSUutil();
		util.waitForElement(`#modal-${tempModal.id}-form`, () => {
			$(`#modal-${tempModal.id}-form`).alpaca({
				schema: {
					title: `Confirm Action`,
					type: "object",
					properties: {
						username: {
							type: "string",
							title: `User`,
							required: true,
							enum: fdb.get().map((user) => user.name),
						},
						password: {
							title: "Password",
							format: "password",
							required: true,
						},
					},
				},
				options: {
					form: {
						buttons: {
							submit: {
								title: `Authorize`,
								click: (form, e) => {
									form.refreshValidationState(true);
									if (!form.isValid(true)) {
										form.focus();
										return;
									}
									let value = form.getValue();
									tempModal.iziModal("close");
									cb(value.username, value.password);
								},
							},
						},
					},
				},
			});
		});
	}
}

// Class for loading scripts in web pages dynamically
class WWSUScriptLoader {
	constructor() {
		this.loadedScripts = [];
	}

	/**
	 * Load a script.
	 *
	 * @param {string} filename Relative path to the script to load
	 * @param {string} filetype js or css
	 */
	loadScript(filename, filetype) {
		if (this.loadedScripts.indexOf(filename) === -1) {
			this._loadScript(filename, filetype);
			this.loadedScripts.push(filename);
		}
	}

	/**
	 * Helper: Load a script. Should not be called directly; loadScript prevents duplicate script loading.
	 *
	 * @param {string} filename Relative path to the script to load
	 * @param {string} filetype js or css
	 */
	_loadScript(filename, filetype) {
		if (filetype === "js") {
			//if filename is a external JavaScript file
			let fileref = document.createElement("script");
			fileref.setAttribute("type", "text/javascript");
			fileref.setAttribute("src", filename);
		} else if (filetype === "css") {
			//if filename is an external CSS file
			let fileref = document.createElement("link");
			fileref.setAttribute("rel", "stylesheet");
			fileref.setAttribute("type", "text/css");
			fileref.setAttribute("href", filename);
		}
		if (typeof fileref !== "undefined")
			document.getElementsByTagName("head")[0].appendChild(fileref);
	}
}

class WWSUutil {
	/**
	 * Get the value of the specified URL parameter
	 *
	 * @param {string} name Name of URL parameter to fetch
	 * @returns {?string} Value of the URL parameter being fetched, or null if not set.
	 */
	getUrlParameter(name) {
		try {
			name = name.replace(/[[]/, "\\[").replace(/[\]]/, "\\]");
			let regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
			let results = regex.exec(window.location.search);
			return results === null
				? null
				: decodeURIComponent(results[1].replace(/\+/g, " "));
		} catch (e) {
			console.error(e);
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error in getUrlParameter function",
				body:
					"There was an error in the getUrlParameter function. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
		}
	}

	/**
	 * Convert a hexadecimal color into its RGBA values.
	 *
	 * @param {string} hex A hexadecimal color
	 * @param {object} options options.format: specify "array" to return as [red, green, blue, alpha] instead of object
	 * @returns {object || array} {red, green, blue, alpha} or [red, green, blue, alpha] values
	 */
	hexRgb(hex, options = {}) {
		// function-specific values
		let hexChars = "a-f\\d";
		let match3or4Hex = `#?[${hexChars}]{3}[${hexChars}]?`;
		let match6or8Hex = `#?[${hexChars}]{6}([${hexChars}]{2})?`;
		let nonHexChars = new RegExp(`[^#${hexChars}]`, "gi");
		let validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, "i");

		try {
			if (
				typeof hex !== "string" ||
				nonHexChars.test(hex) ||
				!validHexSize.test(hex)
			) {
				throw new TypeError("Expected a valid hex string");
			}

			hex = hex.replace(/^#/, "");
			let alpha = 255;

			if (hex.length === 8) {
				alpha = parseInt(hex.slice(6, 8), 16) / 255;
				hex = hex.substring(0, 6);
			}

			if (hex.length === 4) {
				alpha = parseInt(hex.slice(3, 4).repeat(2), 16) / 255;
				hex = hex.substring(0, 3);
			}

			if (hex.length === 3) {
				hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
			}

			const num = parseInt(hex, 16);
			const red = num >> 16;
			const green = (num >> 8) & 255;
			const blue = num & 255;

			return options.format === "array"
				? [red, green, blue, alpha]
				: { red, green, blue, alpha };
		} catch (e) {
			console.error(e);
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "hexrgb error",
				body:
					"There was an error in the hexrgb function. Please report this to the engineer.",
				autoHide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg",
			});
		}
	}

	/**
	 * Determine if the text should be black or white depending on the provided background color.
	 *
	 * @param {string} hex The hex color of the background
	 * @returns {boolean} True if text should be black, false if it should be white.
	 */
	getContrastYIQ(hex) {
		let r = parseInt(hex.substr(1, 2), 16),
			g = parseInt(hex.substr(3, 2), 16),
			b = parseInt(hex.substr(5, 2), 16),
			yiq = (r * 299 + g * 587 + b * 114) / 1000;
		return yiq >= 128;
	}

	/**
	 * Escape HTML for use in the web page.
	 *
	 * @param {string} str The HTML to escape
	 */
	escapeHTML(str) {
		let div = document.createElement("div");
		div.appendChild(document.createTextNode(str));
		return div.innerHTML;
	}

	/**
	 * Call a function when an element exists on the document.
	 *
	 * @param {string} theelement DOM query string of the element to wait for until it exists
	 * @param {function} cb Function to call when the element exists
	 */
	waitForElement(theelement, cb) {
		if (!document.querySelector(theelement)) {
			window.requestAnimationFrame(() => this.waitForElement(theelement, cb));
		} else {
			// eslint-disable-next-line callback-return
			cb(document.querySelector(theelement));
		}
	}

	/**
	 * Create a UUID
	 */
	createUUID() {
		let dt = new Date().getTime();
		let uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
			/[xy]/g,
			function (c) {
				let r = (dt + Math.random() * 16) % 16 | 0;
				dt = Math.floor(dt / 16);
				return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
			}
		);
		return uuid;
	}

	/**
	 * Create a confirmation dialog with Alpaca forms and iziModal
	 *
	 * @param {string} description Further information to provide in the confirmation
	 * @param {?string} confirmText Require user to type this text to confirm their action (null: use simple yes/no confirmation)
	 * @param {function} cb Callback executed when and only if action is confirmed.
	 */
	confirmDialog(description, confirmText, cb) {
		let tempModal = new WWSUmodal(`Confirm Action`, `bg-warning`, ``, false, {
			headerColor: "",
			overlayClose: false,
			zindex: 5000,
			timeout: false,
			closeOnEscape: false,
			closeButton: false,
			onClosed: () => {
				tempModal.iziModal("destroy");
				$(`#modal-${tempModal.id}`).remove();
				tempModal = undefined;
			},
		});

		tempModal.body = `<p>${description}</p><div id="modal-${tempModal.id}-form"></div>`;

		tempModal.iziModal("open");

		let util = new WWSUutil();
		util.waitForElement(`#modal-${tempModal.id}-form`, () => {
			$(`#modal-${tempModal.id}-form`).alpaca({
				schema: {
					title: `Confirm Action`,
					type: "object",
					properties: {
						confirmText: {
							type: "string",
							title: `Confirmation`,
							required: confirmText ? true : false,
						},
					},
				},
				options: {
					fields: {
						confirmText: {
							helper: `Please type <strong>${confirmText}</strong> to confirm your action (case sensitive).`,
							hidden: confirmText ? false : true,
							validator: function (callback) {
								let value = this.getValue();
								if (confirmText && value !== confirmText) {
									callback({
										status: false,
										message: `You must type <strong>${confirmText}</strong> to confirm your action.`,
									});
									return;
								}
								callback({
									status: true,
								});
							},
						},
					},
					form: {
						buttons: {
							submit: {
								title: `Yes`,
								click: (form, e) => {
									form.refreshValidationState(true);
									if (!form.isValid(true)) {
										form.focus();
										return;
									}
									cb();
									tempModal.iziModal("close");
								},
							},
							dismiss: {
								title: `No`,
								click: (form, e) => {
									$(document).Toasts("create", {
										class: "bg-warning",
										title: "Action canceled",
										autohide: true,
										delay: 10000,
										body: `You clicked No.`,
									});
									tempModal.iziModal("close");
								},
							},
						},
					},
				},
			});
		});
	}

	/**
	 * Truncate a string to the specified length.
	 *
	 * @param {string} str String to truncate
	 * @param {number} strLength Number of characters the returned string should contain at maximum (including ending string)
	 * @param {string} ending What should be appended to the end when the string is truncated
	 */
	truncateText(str, strLength = 256, ending = "...") {
		if (str === null) return "";

		if (str.length > strLength) {
			return `${str.substring(0, strLength - ending.length)}${ending}`;
		} else {
			return str;
		}
	}
}

class WWSUqueue {
	constructor() {
		this.timer = null;
		this.taskList = [];
	}

	idleCallback(handler) {
		let startTime = Date.now();

		return setTimeout(() => {
			handler({
				didTimeout: false,
				timeRemaining: () => {
					return Math.max(0, 50.0 - (Date.now() - startTime));
				},
			});
		}, 1);
	}

	handleTaskQueue(deadline) {
		while (
			(deadline.timeRemaining() > 0 || deadline.didTimeout) &&
			this.taskList.length
		) {
			let task = this.taskList.shift();
			task();
		}

		if (this.taskList.length) {
			this.timer = this.idleCallback((deadline) => {
				this.handleTaskQueue(deadline);
			});
		} else {
			this.timer = undefined;
		}
	}

	add(fn, time) {
		if (fn) {
			this.taskList.push(fn);
			if (this.taskList.length === 1 || !this.timer) {
				this.timer = this.idleCallback((deadline) => {
					this.handleTaskQueue(deadline);
				});
			}
		}
	}
}

// Build an izi Modal with some additional properties
class WWSUmodal {
	/**
	 * Construct the modal.
	 *
	 * @param {string} title Set the initial title
	 * @param {?string} bgClass Set the initial color class for the modal background
	 * @param {?string} body Set the initial body of the modal
	 * @param {boolean} closeButton Should a close button be made in the top right corner?
	 * @param {object} modalOptions Options to pass to iziModal
	 */
	constructor(
		title = ``,
		bgClass = null,
		body = ``,
		closeButton = true,
		modalOptions = {}
	) {
		this.util = new WWSUutil();
		if ($.fn.iziModal) {
			this.id = this.util.createUUID();

			this.util.waitForElement("body", () => {
				// Append the model
				$("body").append(`<div class="modal" id="modal-${
					this.id
				}" aria-hidden="true" aria-labelledby="modal-${this.id}-title">
      <div class="modal-content${bgClass ? ` ${bgClass}` : ``}">
          <div class="modal-header">
              <h4 class="modal-title" id="modal-${this.id}-title">${title}</h4>
              ${
								closeButton
									? `<button type="button" class="close" data-izimodal-close="" aria-label="Close">
              <span aria-hidden="true">×</span>
          </button>`
									: ``
							}
          </div>
          <div class="modal-body" id="modal-${this.id}-body">
              ${body}
          </div>
          <div class="modal-footer justify-content-between" id="modal-${
						this.id
					}-footer">
          </div>
      </div>
      <!-- /.modal-content -->
  </div>`);

				// Initialize the model once loaded in the DOM
				this.util.waitForElement(`#modal-${this.id}`, () => {
					this.izi = $(`#modal-${this.id}`).iziModal(modalOptions);
				});
			});
		}
	}

	get title() {
		return $(`#modal-${this.id}-title`).html();
	}

	set title(value) {
		this.util.waitForElement(`#modal-${this.id}-title`, () => {
			$(`#modal-${this.id}-title`).html(value);
		});
	}

	get body() {
		return $(`#modal-${this.id}-body`);
	}

	set body(value) {
		this.util.waitForElement(`#modal-${this.id}-body`, () => {
			$(`#modal-${this.id}-body`).html(value);
		});
	}

	get footer() {
		return $(`#modal-${this.id}-footer`);
	}

	set footer(value) {
		this.util.waitForElement(`#modal-${this.id}-footer`, () => {
			$(`#modal-${this.id}-footer`).html(value);
		});
	}

	addEvent(event, fn) {
		this.util.waitForElement(`#modal-${this.id}`, () => {
			$(document).on(event, `#modal-${this.id}`, function (e) {
				fn(e);
			});
		});
	}

	iziModal(query) {
		if ($.fn.iziModal) {
			return this.izi.iziModal(query);
		}
		return;
	}
}

/**
 *  Class for managing DOM animations
 *  Note: We use this instead of requestAnimationFrame because requestAnimationFrame calls not run due to
 *  background throttling are all called once no longer throttled. This is not ideal because not only does
 *  it freeze the UI momentarily, but it is unnecessary; we only need to process the most recently queued
 *  frame of each animation, which is what this class does.
 */
class WWSUanimations extends WWSUevents {
	constructor() {
		super();

		// Hidden window detection
		this.hidden;
		if (typeof document.hidden !== "undefined") {
			// Opera 12.10 and Firefox 18 and later support
			this.hidden = "hidden";
		} else if (typeof document.msHidden !== "undefined") {
			this.hidden = "msHidden";
		} else if (typeof document.webkitHidden !== "undefined") {
			this.hidden = "webkitHidden";
		}

		// Animation queue object: key is animation id, value is function to process the animation.
		this.animations = {};

		this.processed = true;
		this.processing = false;
	}

	processAnimations() {
		let processedAnimation = false;
		for (let key in this.animations) {
			if (Object.prototype.hasOwnProperty.call(this.animations, key)) {
				if (this.animations[key]) this.animations[key]();
				delete this.animations[key];
				if (!this.processing) this.emitEvent("updateStatus", [true]);
				this.processing = true;
				processedAnimation = true;
				break;
			}
		}
		if (!processedAnimation) {
			if (this.processing) this.emitEvent("updateStatus", [false]);
			this.processing = false;
			this.processed = true;
			this.animations = {};
		} else {
			window.requestAnimationFrame(() => {
				this.processAnimations();
			});
		}
	}

	/**
	 * Add an animation to the queue, which either processes immediately if window is active or is queued if not active.
	 *
	 * @param {string} name Animation name; if an animation with the same name is already queued, it is replaced.
	 * @param {function} fn Function called when it is time to process the animation.
	 */
	add(name, fn) {
		if (!document[this.hidden]) {
			delete this.animations[name]; // In case we are running the animation queue; don't accidentally process an older frame
			fn();
		} else {
			// If a function for the same name is already queued, it is overwritten; we only need to process the most recent frame.
			this.animations[name] = fn;
			if (this.processed) {
				this.processed = false;
				window.requestAnimationFrame(() => {
					this.processAnimations();
				});
			}
		}
	}
}

if (typeof require !== "undefined") {
	exports.WWSUdb = WWSUdb;
	exports.WWSUreq = WWSUreq;
	exports.WWSUScriptLoader = WWSUScriptLoader;
	exports.WWSUutil = WWSUutil;
	exports.WWSUqueue = WWSUqueue;
	exports.WWSUmodal = WWSUmodal;
	exports.WWSUanimations = WWSUanimations;
	exports.WWSUevents = WWSUevents;
}
