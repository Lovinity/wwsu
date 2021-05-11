"use strict";

/* global WWSUdb */

// This class manages WWSU track requests
// Event emitter also supports 'trackRequested' with the request object as a parameter

// REQUIRES these WWSUmodules: WWSUMeta, WWSUsongs, WWSUutil, WWSUanimations, WWSUhosts, hostReq (WWSUreq)
class WWSUrequests extends WWSUdb {
  /**
   * Create the announcements class.
   *
   * @param {WWSUmodules} manager The modules class which initiated this module
   * @param {object} options Options to be passed to this module
   */
  constructor(manager, options) {
    super(); // Create the db

    this.manager = manager;

    this.endpoints = {
      get: "/requests/get",
      queue: "/requests/queue",
    };
    this.data = {
      get: {},
    };

    this.table = undefined;
    this.icon = undefined;
    this.badge = undefined;

    this.IDs = [];

    this.assignSocketEvent("requests", this.manager.socket);
  }

  // Initialize the connection and get initial data; should be called on socket connect event.
  init() {
    this.replaceData(
      this.manager.get("hostReq"),
      this.endpoints.get,
      this.data.get
    );
  }

  /**
   * Initialize data table of track requests
   *
   * @param {string} table DOM query string of the div container which to place the table
   * @param {string} icon DOM query string of the track request menu icon
   * @param {string} badge DOM query string of the unplayed track requests number badge
   */
  initTable(table, icon, badge) {
    this.icon = icon;
    this.badge = badge;

    this.manager.get("WWSUanimations").add("requests-init-table", () => {
      // Init html
      $(table).html(
        `<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
          this.manager.get("WWSUMeta")
            ? this.manager.get("WWSUMeta").meta.timezone
            : moment.tz.guess()
        }.</p><table id="section-requests-table" class="table table-striped display responsive" style="width: 100%;"></table>`
      );

      this.manager
        .get("WWSUutil")
        .waitForElement(`#section-requests-table`, () => {
          // Generate table
          this.table = $(`#section-requests-table`).DataTable({
            paging: true,
            data: [],
            columns: [
              { title: "ID" },
              { title: "Date/Time" },
              { title: "Track" },
              { title: "Requested By" },
              { title: "Message" },
              { title: "Play Request" },
            ],
            columnDefs: [{ responsivePriority: 1, targets: 5 }],
            order: [[0, "desc"]],
            pageLength: 25,
            drawCallback: () => {
              // Action button click events
              $(".btn-request-queue").unbind("click");

              $(".btn-request-queue").click((e) => {
                this.queue(e.currentTarget, {
                  ID: parseInt($(e.currentTarget).data("id")),
                });
              });
            },
          });

          // Update with information
          this.updateTable();
        });
    });
  }

  /**
   * Queue a requested track via the WWSU API.
   *
   * @param {string} dom The DOM query string to block while processing.
   * @param {object} data The data to pass to the API.
   * @param {?function} cb Callback function with true if success, false if not.
   */
  queue(dom, data, cb) {
    try {
      this.manager
        .get("WWSUhosts")
        .promptIfNotHost(`queue a requested track`, () => {
          this.manager
            .get("hostReq")
            .request(
              { dom: dom, method: "post", url: this.endpoints.queue, data },
              (response) => {
                if (response !== "OK") {
                  $(document).Toasts("create", {
                    class: "bg-danger",
                    title: "Error queuing request",
                    body: `There was an error queuing the request. Your DJ Controls might not be allowed to do this when you are not on the air. Or, this request was already queued.`,
                    autohide: true,
                    delay: 10000,
                    icon: "fas fa-skull-crossbones fa-lg",
                  });
                  if (typeof cb === "function") {
                    cb(false);
                  }
                } else {
                  $(document).Toasts("create", {
                    class: "bg-success",
                    title: "Request queued",
                    autohide: true,
                    delay: 15000,
                    body: `The request was queued. It will not disappear from track requests until it is played.`,
                  });
                  if (typeof cb === "function") {
                    cb(true);
                  }
                }
              }
            );
        });
    } catch (e) {
      $(document).Toasts("create", {
        class: "bg-danger",
        title: "Error queuing request",
        body:
          "There was an error queuing the request. Please report this to the engineer.",
        autohide: true,
        delay: 10000,
        icon: "fas fa-skull-crossbones fa-lg",
      });
      if (typeof cb === "function") {
        cb(false);
      }
      console.error(e);
    }
  }
  
  /**
   * Update the track requests table if it exists. Also update track request notification badge and icon.
   */
  updateTable() {
    this.manager.get("WWSUanimations").add("requests-update-table", () => {
      if (this.table) {
        this.table.clear();
        let numRequests = 0;
        this.find().forEach((request) => {
          numRequests++;
          this.table.row.add([
            request.ID,
            moment
              .tz(
                request.createdAt,
                this.manager.get("WWSUMeta")
                  ? this.manager.get("WWSUMeta").meta.timezone
                  : moment.tz.guess()
              )
              .format("lll"),
            request.trackname,
            request.username,
            request.message,
            `<button class="btn btn-sm btn-primary btn-request-queue" data-id="${request.ID}" title="Queue / Play Request immediately"><i class="fas fa-play"></i></button>`,
          ]);

          if (this.IDs.indexOf(request.ID) === -1) {
            this.emitEvent("trackRequested", [request]);
            this.IDs.push(request.ID);
          }
        });
        this.table.draw();

        // Update flashing icon and number of requests badges
        if (this.icon) {
          if (numRequests > 0) {
            $(this.icon).addClass("pulse-primary");
          } else {
            $(this.icon).removeClass("pulse-primary");
          }
        }
        if (this.badge) {
          if (numRequests > 0) {
            $(this.badge).removeClass("badge-secondary");
            $(this.badge).addClass("badge-danger");
            $(this.badge).html(numRequests);
          } else {
            $(this.badge).removeClass("badge-danger");
            $(this.badge).addClass("badge-secondary");
            $(this.badge).html(numRequests);
          }
        }
      }
    });
  }
}
