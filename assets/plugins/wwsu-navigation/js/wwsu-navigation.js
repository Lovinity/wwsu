'use strict';

// This class manages the sidebar navigation menu on WWSU pages using AdminLTE

class WWSUNavigation {
	/**
	 * Construct the class
	 */
	constructor(manager, options) {
		this.manager = manager;
		this.elements = [];
		this.activeMenu = ``;

		window.onpopstate = function (e) {
			if (e.state) {
				$("body").html(e.state.html);
				document.title = e.state.pageTitle;
			}
		};
	}

	/**
	 * Add a menu item to the controller
	 *
	 * @param {string} dom DOM query string for the navigation item
	 * @param {string} section DOM query string for the section that should be visible when this menu is active, and invisible when it is not
	 * @param {string} url Relative URL for this menu item
	 * @param {boolean} defaultItem Set to true to make this the default menu activated. Defaults to false
	 * @param {function} callback Function with no parameters called when this menu becomes active. Defaults to empty function.
	 */
	addItem(dom, section, title, url, defaultItem = false, callback = () => {}) {
		// Remove item if it already exists
		this.elements = this.elements.filter((ele) => ele.dom !== dom);

		this.elements.push({ dom, section, title, url, callback });

		if (defaultItem) {
			$(dom).addClass("active");
			$(section).css("display", "");
		} else {
			$(dom).removeClass("active");
			$(section).css("display", "none");
		}

		$(dom).unbind("click");
		$(dom).click((event) => {
			this.processMenu(dom);
		});

		$(dom).unbind("keypress");
		$(dom).keypress((event) => {
			if (event.which === 13) {
				this.processMenu(dom);
			}
		});

		if (this.activeMenu === dom) {
			this.processMenu(dom);
		}

		return this;
	}

	/**
	 * Remove the provided nav element from the WWSUnavigation manager.
	 *
	 * @param {string} dom The DOM query string that was provided in addItem for this element to be removed.
	 */
	removeItem(dom) {
		this.elements = this.elements.filter((ele) => ele.dom !== dom);
		return this;
	}

	/**
	 * Activate the menu page provided.
	 *
	 * @param {string} dom DOM query string of the sidebar menu item to activate.
	 */
	processMenu(dom) {
		this.activeMenu = dom;

		// De-activate all menu items and hide all their sections
		this.elements.forEach((element) => {
			$(element.dom).removeClass("active");
			$(element.section).css("display", "none");
		});

		// Activate the menu item passed as dom parameter, and un-hide its section.
		this.elements
			.filter((element) => element.dom === dom)
			.map((element) => {
				$(element.dom).addClass("active");
				$(element.section).css("display", "");
				try {
					// Add window history manually since we are not physically going to another page.
					window.history.pushState(
						{ html: $("body").html(), pageTitle: element.title },
						"",
						element.url
					);
				} catch (e) {
					// Consume errors
				}
				element.callback();
			});

		// Manually trigger resize event
		window.requestAnimationFrame(() => {
			window.dispatchEvent(new Event('resize'));
		});
	}
}
