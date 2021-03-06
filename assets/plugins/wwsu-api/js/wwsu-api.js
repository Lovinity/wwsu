'use strict';

/**
 * This class manages raw API queries to WWSU.
 * @requires $ jQuery
 * @requires $.alpaca Alpaca forms custom WWSU build
 */

 // REQUIRES these WWSUmodules (via WWSUreq): noReq, hostReq, djReq, directorReq, adminDirectorReq
class WWSUapi {

    /**
     * Construct the class.
     * 
	 * @param {WWSUmodules} manager The modules class which initiated this module
	 * @param {object} options Options to be passed to this module
     */
    constructor(manager, options) {
        this.manager = manager;

        this.dom; // The DOM string of the API form will be stored here when initialized.
    }

    /**
     * Make API query to WWSU
     * 
     * @param {string} path sails.js URL path
     * @param {string} req this.requests key indicating which WWSUreq to use.
     * @param {object} data Data to pass to API
     * @param {function} cb Callback executed. Parameter is returned data from WWSU.
     */
    query (path, req, data, cb) {
        try {
            this.manager.get(req).request({ dom: this.dom, method: 'post', url: path, data }, (response) => {
                if (typeof cb === 'function') {
                    cb(response);
                }
            })
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error making API query',
                body: 'There was an error making the API query. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            console.error(e);
        }
    }

    /**
     * Initialize Alpaca form for API query.
     * 
     * @param {*} dom DOM query string where to generate the form.
     */
    initApiForm (dom) {
        this.dom = dom;
        $(dom).alpaca({
            "schema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "title": "API / URL Path",
                        "required": true
                    },
                    "req": {
                        "type": "string",
                        "title": "Authorization to use",
                        "enum": ['noReq', 'hostReq', 'djReq', 'directorReq', 'adminDirectorReq' ],
                        "required": true
                    },
                    "data": {
                        "type": "string",
                        "title": "JSON data to send to API",
                    },
                    "response": {
                        "type": "string",
                        "title": "Response from server"
                    }
                }
            },
            "options": {
                "fields": {
                    "path": {
                        "helper": "If using relative path, must begin with a /."
                    },
                    "data": {
                        "type": "json"
                    },
                    "response": {
                        "type": "textarea",
                    }
                },
                "form": {
                    "buttons": {
                        "submit": {
                            "title": "Submit Query",
                            "click": (form, e) => {
                                form.refreshValidationState(true);
                                if (!form.isValid(true)) {
                                    form.focus();
                                    return;
                                }
                                let value = form.getValue();
                                this.query(value.path, value.req, value.data, (response) => {
                                    form.setValue({ path: value.path, req: value.req, data: value.data, response: JSON.stringify(response) })
                                });
                            }
                        }
                    }
                }
            },
        });
    }
}