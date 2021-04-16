"use strict";

// This class manages the WWSU basketball shootout scoreboard
// REQUIRES: noReq, directorReq (if using web interface to control scoreboard)
class WWSUshootout extends WWSUdb {
  /**
   * Create the announcements class.
   *
   * @param {WWSUmodules} manager The modules class which initiated this module
   * @param {object} options Options to be passed to this module
   * @param {string} options.username If this is the web interface, the DOM query string for the text field containing the director
   * @param {string} options.password If this is the web interface, the DOM query string for the text field containing the password
   */
  constructor(manager, options) {
    super(); // Create the db

    this.manager = manager;

    this.endpoints = {
      get: "/shootout/get",
      set: "/shootout/set"
    };
    this.data = {
      get: {}
    };

    this.assignSocketEvent("shootout", this.manager.socket);

    this.username = options ? options.username : undefined;
    this.password = options ? options.password : undefined;
  }

  // Initialize the connection and get initial data; should be called on socket connect event.
  init() {
    this.replaceData(
      this.manager.get("noReq"),
      this.endpoints.get,
      this.data.get
    );
  }

  /**
   * Set something in the API for the shootout.
   *
   * @requires options.user and options.password to be set upon creation of the class.
   * @param {string} name Name of the value to set as defined in the shootout model.
   * @param {string} value Value to set.
   */
  set(name, value) {
    let req = this.manager.get("directorReq");
    req._authorize($(this.username).val(), $(this.password).val(), status => {
      if (!status) {
        $(document).Toasts("create", {
          class: "bg-danger",
          title: "Incorrect username and password",
          body:
            "There was an error authorizing to update the shootout scoreboard. The provided username and password is probably incorrect.",
          autohide: true,
          delay: 10000,
          icon: "fas fa-skull-crossbones fa-lg"
        });
      } else if (
        typeof status.errToken !== `undefined` ||
        typeof status.token === "undefined"
      ) {
        $(document).Toasts("create", {
          class: "bg-danger",
          title: "Error Authorizing",
          body: `${
            typeof token.errToken !== `undefined`
              ? `Failed to authenticate; please try again. ${token.errToken}`
              : `Failed to authenticate; unknown error.`
          }`,
          autohide: true,
          delay: 10000,
          icon: "fas fa-skull-crossbones fa-lg"
        });
      } else {
        req._tryRequest({ name: name, value: value }, body2 => {
          if (!body2 || body2 === -1) {
            $(document).Toasts("create", {
              class: "bg-danger",
              title: "Error updating scoreboard",
              body:
                "There was an error updating the shootout scoreboard. Please contact the engineer",
              autohide: true,
              delay: 10000,
              icon: "fas fa-skull-crossbones fa-lg"
            });
          }
        });
      }
    });
  }
}
