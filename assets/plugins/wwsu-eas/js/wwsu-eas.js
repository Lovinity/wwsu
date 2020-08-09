// This class manages the EAS
class WWSUeas extends WWSUdb {
  /**
   * Construct the class
   *
   * @param {sails.io} socket Socket connection to WWSU
   * @param {WWSUreq} noReq Request with no authorization
   * @param {WWSUreq} directorReq Request with director authorization
   * @param {WWSUmeta} meta WWSUmeta class
   */
  constructor(socket, noReq, directorReq, meta) {
    super(); // Create the db

    this.endpoints = {
      get: "/eas/get",
      test: "/eas/test",
      send: "/eas/send",
    };
    this.requests = {
      no: noReq,
      director: directorReq,
    };
    this.data = {
      get: {},
      test: {},
      send: {},
    };

    this.meta = meta;

    this.displayed = [];

    this.assignSocketEvent("eas", socket);

    this.on("change", "WWSUeas", (db) => {
        this.emitNewAlerts();
    });

    this.easModal = new WWSUmodal(`Active Emergency Alerts`, null, ``, true, {
      headerColor: "",
      overlayClose: true,
      zindex: 1100,
      timeout: 180000,
      timeoutProgressbar: true,
    });
  }

  // Start the connection. Call this in socket connect event.
  init() {
    this.replaceData(this.requests.no, this.endpoints.get, this.data.get);
  }

  /**
   * Send an alert out through the internal Node.js EAS (but NOT the on-air EAS)
   *
   * @param {string} dom DOM query string of the element to block while processing
   * @param {string} counties Comma separated list of counties for which this alert is in effect
   * @param {string} alert The name of the alert
   * @param {string} severity The severity of the alert. Must be Minor, Moderate, Severe, or Extreme.
   * @param {string} color Hexadecimal string of the color to use for this alert
   * @param {string} information Detailed information about the alert and what people should do.
   * @param {?string} expires ISO timestamp when this alert expires (undefined = 1 hour from now)
   * @param {string} starts ISO timestamp when this alert starts (undefined = now)
   */
  send(
    dom,
    counties,
    alert,
    severity,
    color,
    information,
    expires = moment(this.meta ? this.meta.meta.time : undefined)
      .add(1, "hour")
      .toISOString(true),
    starts = moment(this.meta ? this.meta.meta.time : undefined).toISOString(
      true
    )
  ) {
    try {
      this.requests.director.request(
        {
          dom,
          method: "post",
          url: this.endpoints.send,
          data: {
            counties,
            alert,
            severity,
            color,
            information,
            expires,
            starts,
          },
        },
        (response) => {
          if (response !== "OK") {
            $(document).Toasts("create", {
              class: "bg-danger",
              title: "Error sending alert",
              body:
                "There was an error sending the alert. Please report this to the engineer.",
              autoHide: true,
              delay: 10000,
              icon: "fas fa-skull-crossbones fa-lg",
            });
            cb(false);
          } else {
            $(document).Toasts("create", {
              class: "bg-success",
              title: "Alert Sent!",
              autohide: true,
              delay: 10000,
              body: `Alert was sent!`,
            });
            cb(true);
          }
        }
      );
    } catch (e) {
      $(document).Toasts("create", {
        class: "bg-danger",
        title: "Error sending alert",
        body:
          "There was an error sending the alert. Please report this to the engineer.",
        autoHide: true,
        delay: 10000,
        icon: "fas fa-skull-crossbones fa-lg",
      });
      console.error(e);
      cb(false);
    }
  }

  /**
   * Send a test alert through the internal EAS (but NOT the on-air EAS)
   *
   * @param {string} dom DOM query string of the element to block while processing
   */
  test(dom) {
    try {
      this.requests.director.request(
        { dom, method: "post", url: this.endpoints.test, data: {} },
        (response) => {
          if (response !== "OK") {
            $(document).Toasts("create", {
              class: "bg-danger",
              title: "Error sending test alert",
              body:
                "There was an error sending the test alert. Please report this to the engineer.",
              autoHide: true,
              delay: 10000,
              icon: "fas fa-skull-crossbones fa-lg",
            });
            cb(false);
          } else {
            $(document).Toasts("create", {
              class: "bg-success",
              title: "Test Alert Sent!",
              autohide: true,
              delay: 10000,
              body: `Test alert was sent!`,
            });
            cb(true);
          }
        }
      );
    } catch (e) {
      $(document).Toasts("create", {
        class: "bg-danger",
        title: "Error sending test alert",
        body:
          "There was an error sending the test alert. Please report this to the engineer.",
        autoHide: true,
        delay: 10000,
        icon: "fas fa-skull-crossbones fa-lg",
      });
      console.error(e);
      cb(false);
    }
  }

  /**
   * Emit events for new alerts
   */
  emitNewAlerts() {
    this.find().forEach((record) => {
      if (this.displayed.indexOf(record.ID) === -1) {
        this.displayed.push(record.ID);
        this.emitEvent("newAlert", [record]);
      }
    });
  }
}
