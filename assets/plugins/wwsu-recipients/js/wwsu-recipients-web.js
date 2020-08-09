// This class is a recipients helper for web-based recipients, such as listeners.

class WWSUrecipientsweb {
  /**
   * The class constructor.
   *
   * @param {sails.io} socket The sails.io socket connected to the WWSU API.
   * @param {WWSUreq} noReq Request with no authorization
   */
  constructor(socket, noReq) {
    this.endpoints = {
      addDisplay: "/recipients/add-display",
      addWeb: "/recipients/add-web",
      editWeb: "/recipients/edit-web",
    };
    this.requests = {
      no: noReq,
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
    this.requests.no.request(
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
    this.requests.no.request(
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
   * @param {function} cb Callback.
   */
  editRecipientWeb(label, cb) {
    this.requests.no.request(
      {
        method: "post",
        url: this.endpoints.editWeb,
        data: { label: label },
      },
      (response2) => {
        cb();
      }
    );
  }
}
