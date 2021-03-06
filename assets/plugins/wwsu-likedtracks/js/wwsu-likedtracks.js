"use strict";

// This class manages the track liking system and recent tracks played
class WWSUlikedtracks extends WWSUevents {
  /**
   * Construct the directors.
   *
   * @param {WWSUmodules} manager The modules class which initiated this module
   * @param {object} options Options to be passed to this module
   */
  constructor(manager, options) {
    super();

    this.manager = manager;

    this.endpoints = {
      get: "/songs/get-liked",
      like: "/songs/like",
      sendMessage: "/messages/send-web",
    };

    this._likedTracks = [];

    this.table;
  }

  // Start the connection. Call this in socket connect event.
  init() {
    this.manager
      .get("noReq")
      .request(
        { method: "POST", url: this.endpoints.get, data: {} },
        (body) => {
          try {
            this._likedTracks = body;
            this.emitEvent("init", [body]);
          } catch (unusedE) {
            setTimeout(this.init, 10000);
          }
        }
      );

    // Set on event for new meta
    this.manager.get("WWSUMeta").on("newMeta", "WWSUlikedtracks", (newMeta) => {
      if (typeof newMeta.history !== "undefined") this.updateTable();
    });
  }

  /**
   * Initialize the table for track history.
   *
   * @param {string} table The DOM query string for the div container to place the table.
   */
  initTable(table) {
    this.manager.get("WWSUanimations").add("history-init-table", () => {
      // Init html
      $(table).html(
        `<p class="wwsumeta-timezone-display">Times are shown in the timezone ${
          this.manager.get("WWSUMeta")
            ? this.manager.get("WWSUMeta").meta.timezone
            : moment.tz.guess()
        }.</p><table id="section-nowplaying-history-table" class="table table-striped display responsive" style="width: 100%;"></table>`
      );

      this.manager
        .get("WWSUutil")
        .waitForElement(`#section-nowplaying-history-table`, () => {
          // Generate table
          this.table = $(`#section-nowplaying-history-table`).DataTable({
            paging: true,
            data: [],
            columns: [
              { title: "Date/Time Played" },
              { title: "Artist - Title" },
              { title: "Actions" },
            ],
            columnDefs: [{ responsivePriority: 1, targets: 2 }],
            pageLength: 100,
            drawCallback: () => {
              // Action button click events
              $(".btn-nowplaying-history-like").unbind("click");

              $(".btn-nowplaying-history-like").click((e) => {
                this.likeTrack(
                  $(e.currentTarget).data("id")
                    ? parseInt($(e.currentTarget).data("id"))
                    : $(e.currentTarget).data("track")
                );
              });
            },
          });

          // Update with information
          this.updateTable();
        });
    });
  }

  /**
   * Update the recent tracks table if it exists
   */
  updateTable() {
    this.manager.get("WWSUanimations").add("history-update-table", () => {
      if (this.table) {
        this.table.clear();
        this.manager.get("WWSUMeta").meta.history.forEach((track) => {
          this.table.row.add([
            moment
              .tz(
                track.time,
                this.manager.get("WWSUMeta")
                  ? this.manager.get("WWSUMeta").meta.timezone
                  : moment.tz.guess()
              )
              .format("LLL"),
            track.track,
            track.likable && track.ID !== 0
              ? `${
                  this.likedTracks.indexOf(track.ID) === -1
                    ? `<button type="button" ${
                        track.ID
                          ? `data-id="${track.ID}"`
                          : `data-track="${track.track}"`
                      } class="btn btn-success btn-small button-track-like" tabindex="0" title="Like this track; liked tracks play more often on WWSU."><i class="fas fa-thumbs-up p-1"></i> Like</button>`
                    : `<button type="button" class="btn btn-outline-primary btn-small disabled" tabindex="0" title="You already liked this track."><i class="far fa-thumbs-up p-1"></i> Liked</button>`
                }`
              : `<button type="button" class="btn btn-outline-danger btn-small disabled" tabindex="0" title="This track was not played in the WWSU automation system. If you like it, please send a message to the DJ instead.">Manual</button>`,
          ]);
        });
        this.table.draw();
      }
    });
  }

  /**
   * Get the tracks liked by the current user.
   *
   * @returns {array} Array of track IDs or 'artist - title' strings liked
   */
  get likedTracks() {
    return this._likedTracks;
  }

  /**
   * Like a track.
   *
   * @param {number|string} trackID Track ID liked, or string of 'artist - title' if track was manual (eg. DJ log)
   */
  likeTrack(trackID) {
    // If trackID is a string, send the like as a message to the DJ
    if (isNaN(trackID)) {
      this.manager.get("WWSUmessagesweb").send({
        nickname: this.manager.get("WWSUrecipientsweb")
          ? this.manager.get("WWSUrecipientsweb").recipient.label
          : "Unknown Visitor",
        message: `[SYSTEM] This recipient liked a track that was played: ${trackID}`,
        private: false,
      });
      // Otherwise, register the track ID as liked in the automation system
    } else {
      this.manager.get("noReq").request(
        {
          method: "POST",
          url: this.endpoints.like,
          data: { trackID: trackID },
        },
        (response) => {
          try {
            if (response !== "OK") {
              $(document).Toasts("create", {
                class: "bg-warning",
                title: "Could Not Like Track",
                subtitle: trackID,
                autohide: true,
                delay: 10000,
                body: `<p>There was a problem liking that track. Most likely, this track played over 30 minutes ago and cannot be liked.</p>`,
                icon: "fas fa-music fa-lg",
              });
            } else {
              this._likedTracks.push(trackID);
              this.emitEvent("likedTrack", trackID);

              $(document).Toasts("create", {
                class: "bg-success",
                title: "Track Liked",
                subtitle: trackID,
                autohide: true,
                delay: 10000,
                body: `<p>You successfully liked a track!</p><p>Tracks people like will play more often on WWSU.</p>`,
                icon: "fas fa-music fa-lg",
              });
            }
          } catch (unusedE) {
            $(document).Toasts("create", {
              class: "bg-danger",
              title: "Track Liking Error",
              subtitle: trackID,
              autohide: true,
              delay: 10000,
              body: `<p>There was a problem liking that track. Please contact the engineer if you are having problems liking any tracks.</p>`,
              icon: "fas fa-music fa-lg",
            });
          }
        }
      );
    }
  }
}
