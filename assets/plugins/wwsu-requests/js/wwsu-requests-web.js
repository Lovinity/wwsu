"use strict";

/* global WWSUdb */

// This class manages requesting tracks on the WWSU website
// Event emitter also supports 'trackRequested' with the request object as a parameter

// REQUIRES these WWSUmodules: WWSUMeta, WWSUsongs, WWSUutil, WWSUanimations, noReq (WWSUreq)
class WWSUrequestsweb extends WWSUevents {
  /**
   * Create the announcements class.
   *
   * @param {WWSUmodules} manager The modules class which initiated this module
   * @param {object} options Options to be passed to this module
   */
  constructor(manager, options) {
    super(); // Create the events

    this.manager = manager;

    this.endpoints = {
      place: "/requests/place",
    };
    this.data = {
      get: {},
    };

    this.table = undefined;
    this.searchField;
    this.searchGenre;
    this.searchButton;

    this.skip = 0;
  }

  /**
   * Initialize the table for browsing tracks to request and requesting them.
   *
   * @param {string} table DOM query string where to place the track browsing table.
   * @param {string} searchField DOM query string of the input box where listeners can search by artist or title
   * @param {string} searchGenre DOM query string of the select box that will be populated with genres to select / filter by.
   * @param {string} searchButton DOM query string of the button to click to execute the filter/search.
   * @param {string} loadMoreButton DOM query string of the button to click to load more tracks.
   */
  initTable(table, searchField, searchGenre, searchButton, loadMoreButton) {
    this.searchField = searchField;
    this.searchGenre = searchGenre;
    this.searchButton = searchButton;
    this.loadMoreButton = loadMoreButton;

    // Create table
    this.manager.get("WWSUanimations").add("requests-init-track-table", () => {
      // Init html
      $(table).html(
        `<table id="section-requests-track-table" class="table table-striped display responsive" style="width: 100%;"></table>`
      );

      this.manager
        .get("WWSUutil")
        .waitForElement(`#section-requests-track-table`, () => {
          // Generate table
          this.table = $(`#section-requests-track-table`).DataTable({
            paging: true,
            data: [],
            columns: [{ title: "Artist - Title" }, { title: "View / Request" }],
            columnDefs: [{ responsivePriority: 1, targets: 1 }],
            pageLength: 50,
            drawCallback: () => {
              // Action button click events
              $(".btn-track-view").unbind("click");

              $(".btn-track-view").click((e) => {
                this.manager
                  .get("WWSUsongs")
                  .showTrackInfo(
                    parseInt($(e.currentTarget).data("id")),
                    false,
                    true
                  );
              });
            },
          });

          // Clear the table
          this.clearTable();
        });
    });

    // Add click handlers for buttons
    $(this.searchButton).click((e) => {
      this.clearTable();
      this.populateTable();
    });

    $(this.loadMoreButton).click((e) => {
      this.populateTable();
    });
  }

  /**
   * Place a track request via the WWSU API.
   *
   * @param {string} dom The DOM query string to block while processing.
   * @param {object} data The data to pass to the API.
   * @param {?function} cb Callback function with true if success, false if not.
   */
  place(dom, data, cb) {
    try {
      this.manager
        .get("noReq")
        .request(
          { dom: dom, method: "post", url: this.endpoints.place, data },
          (response) => {
            if (response !== "OK") {
              $(document).Toasts("create", {
                class: "bg-danger",
                title: "Error placing request",
                body: `There was an error placing the request. Maybe this track cannot be requested right now?`,
                autoHide: true,
                delay: 10000,
                icon: "fas fa-skull-crossbones fa-lg",
              });
              if (typeof cb === "function") {
                cb(false);
              }
            } else {
              $(document).Toasts("create", {
                class: "bg-success",
                title: "Request placed!",
                autohide: true,
                delay: 15000,
                body: `Your request was placed! Requests play after breaks in automation. When a show is broadcasting, it is up to DJ/host discretion.`,
              });
              if (typeof cb === "function") {
                cb(true);
              }
            }
          }
        );
    } catch (e) {
      $(document).Toasts("create", {
        class: "bg-danger",
        title: "Error placing request",
        body:
          "There was an error placing the request. Please report this to the engineer.",
        autoHide: true,
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
   * Clear the track table if it exists.
   */
  clearTable() {
    this.manager.get("WWSUanimations").add("tracks-clear-table", () => {
      if (this.table) {
        this.table.clear();
        this.table.draw();
        this.skip = 0;
      }
    });
  }

  /**
   * Update the track requests table if it exists. Also update track request notification badge and icon.
   */
  populateTable() {
    this.manager.get("WWSUanimations").add("tracks-populate-table", () => {
      if (this.table) {
        let query = {
          search: $("#request-name").val(),
          skip: this.skip,
          limit: 50,
          ignoreDisabled: true,
          ignoreNonMusic: true,
        };
        let selectedOption = $("#request-genre")
          .children("option:selected")
          .val();
        if (selectedOption !== "0") {
          query.genre = parseInt(selectedOption);
        }
        this.manager.get("WWSUsongs").get(query, (tracks) => {
          if (tracks.constructor === Array && tracks.length > 0) {
            this.skip += tracks.length;
            tracks.forEach((track) => {
              this.table.row.add([
                `${track.artist} - ${track.title}`,
                `<button class="btn btn-sm btn-primary btn-track-view" data-id="${track.ID}" title="View more info / Request Track"><i class="fas fa-eye"></i></button>`,
              ]);
            });
          } else {
            $(document).Toasts("create", {
                class: "bg-warning",
                autoHide: true,
                delay: 5000,
                title: "No more tracks",
                body:
                  "There are no more tracks to load for your search.",
              });
          }
        });

        this.table.draw();
      }
    });
  }
}
