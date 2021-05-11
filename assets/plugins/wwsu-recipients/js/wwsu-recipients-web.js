"use strict";

// This class is a recipients helper for web-based recipients, such as listeners.

// REQUIRES these WWSUmodules: noReq (WWSUreq)
class WWSUrecipientsweb {
  /**
   * The class constructor.
   *
   * @param {WWSUmodules} manager The modules class which initiated this module
   * @param {object} options Options to be passed to this module
   */
  constructor(manager, options) {
    this.manager = manager;

    this.endpoints = {
      addDisplay: "/recipients/add-display",
      addWeb: "/recipients/add-web",
      editWeb: "/recipients/edit-web",
    };

    this.recipient = {};
  }

  /**
   * Add this host as a display recipient to the WWSU API (register as online).
   *
   * @param {string} host Name of the host being registered
   * @param {function} cb Callback; recipient data as first parameter, boolean true = success, false = no success as second parameter
   */
  addRecipientDisplay(host, cb) {
    this.manager.get("noReq").request(
      {
        method: "post",
        url: this.endpoints.addDisplay,
        data: { host: host },
      },
      (response2) => {
        try {
          if (response2.label) {
            cb(response2, true);
          } else {
            cb(response2, false);
          }
        } catch (e) {
          cb({}, false);
          console.error(e);
        }
      }
    );
  }

  /**
   * Add this host as a web recipient to the WWSU API (register as online).
   *
   * @param {?string} device OneSignal App ID if applicable (for notifications)
   * @param {function} cb Callback; recipient data as first parameter, boolean true = success, false = no success as second parameter
   */
  addRecipientWeb(device, cb) {
    this.manager.get("noReq").request(
      {
        method: "post",
        url: this.endpoints.addWeb,
        data: { device: device },
      },
      (response2) => {
        try {
          this.recipient = response2;
          if (response2.label) {
            cb(response2, true);
          } else {
            cb(response2, false);
          }
        } catch (e) {
          this.recipient = {};
          cb({}, false);
          console.error(e);
        }
      }
    );
  }

  /**
   * Edit the nickname for a web recipient.
   *
   * @param {string} label The new nickname for this recipient
   * @param {?function} cb Callback.
   */
  editRecipientWeb(label, cb) {
    this.manager.get("noReq").request(
      {
        method: "post",
        url: this.endpoints.editWeb,
        data: { label: label },
      },
      (response2) => {
        if (typeof cb === "function") cb();
      }
    );
  }
}
