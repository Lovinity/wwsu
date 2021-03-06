"use strict";

// This class manages all WWSU classes and modules

class WWSUmodules {
	/**
	 * Class constructor
	 *
	 * @param {sails.io} socket Socket connection to WWSU
	 */
	constructor(socket) {
		this.socket = socket;

		this.modules = new Map();
	}

	/**
	 * Initialize / add a module to the manager
	 *
	 * @param {string} name Name of module
	 * @param {class} module The un-initialized module class (its constructor should pass manager and options as parameters)
	 * @param {object} options Options to pass to the module when initialized
	 */
	add(name, module, options) {
		// Do not re-initialize a module already initialized
		if (!this.modules.has(name)) {
			this.modules.set(name, new module(this, options));
		}

		// allow chaining
		return this;
	}

	/**
	 * Get / return a module
	 *
	 * @param {string} name name of module to return
	 */
	get(name) {
		if (!this.modules.has(name))
			throw new Error(`The specified module ${name} was not added yet.`);
		return this.modules.get(name);
	}
}
