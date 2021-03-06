"use strict";

// This class manages tasks relating to RadioDJ tracks.

// REQUIRES these WWSU modules: WWSUMeta, noReq (WWSUreq), WWSUrequestsweb (if using requestFOrm = true in showTrackInfo)
// REQUIRES these libraries: JQuery Block
class WWSUsongs extends WWSUevents {
  /**
   * Construct the class
   *
   * @param {WWSUmodules} manager The modules class which initiated this module
   * @param {object} options Options to be passed to this module
   */
  constructor(manager, options) {
    super();

    this.manager = manager;

    this.endpoints = {
      get: "/songs/get",
      getGenres: "/songs/get-genres",
    };

    this.modals = {
      trackInfo: new WWSUmodal(
        `Track Information`,
        null,
        `<table class="table table-striped">
			<thead>
			  <tr>
				<th scope="col"><strong>Name</strong></th>
				<th scope="col"><strong>Value</strong></th>
			  </tr>
			</thead>
			<tbody>
			  <tr>
				<td>Track ID</td>
				<td id="song-info-ID"></td>
			  </tr>
			  <tr>
				<td>Status</td>
				<td id="song-info-status"></td>
			  </tr>
			  <tr>
				<td>Artist</td>
				<td id="song-info-artist"></td>
			  </tr>
			  <tr>
				<td>Title</td>
				<td id="song-info-title"></td>
			  </tr>
			  <tr>
				<td>Album</td>
				<td id="song-info-album"></td>
			  </tr>
			  <tr>
				<td>Genre</td>
				<td id="song-info-genre"></td>
			  </tr>
			  <tr>
				<td>Duration</td>
				<td id="song-info-duration"></td>
			  </tr>
			  <tr>
				<td>Date Last Played</td>
				<td id="song-info-lastplayed"></td>
			  </tr>
			  <tr>
				<td>Track Limits</td>
				<td id="song-info-limits"></td>
			  </tr>
			  <tr>
				<td>Spins</td>
				<td><div id="song-info-spins" class="bg-info" style="height: 20vh; overflow-y: scroll;"></div></td>
			  </tr>
			</tbody>
		  </table>`,
        true,
        {
          headerColor: "",
          zindex: 1200,
        }
      ),
    };
  }

  /**
   * Get information about a song or songs in RadioDJ from the WWSU API.
   *
   * @param {Object} data Data to be passed to the API.
   * @param {function} cb Function called after request is made; parameter is the data returned from the server.
   */
  get(data, cb) {
    this.manager
      .get("noReq")
      .request(
        { method: "post", url: this.endpoints.get, data },
        (response) => {
          cb(response);
        }
      );
  }

  /**
   * Get the available genres in the WWSU system.
   *
   * @param {object} data Data to pass to WWSU
   * @param {function} cb Callback with an array of genres as parameter (ID and name as properties)
   */
  getGenres(data, cb) {
    this.manager
      .get("noReq")
      .request(
        { method: "post", url: this.endpoints.getGenres, data },
        (response) => {
          cb(response);
        }
      );
  }

  /**
   * Show information about a track in a Modal.
   *
   * @param {number} trackID ID of the track to query.
   * @param {boolean} spins Set to true to also show information on when the track aired
   * @param {boolean} requestForm Set to true to also display a request form (or an error if the track cannot be requested right now)
   */
  showTrackInfo(trackID, spins, requestForm) {
    this.modals.trackInfo.iziModal("open");
    $(`#modal-${this.modals.trackInfo.id}`).block({
      message: "<h1>Getting Track Info...</h1>",
      css: { border: "3px solid #a00" },
      timeout: 15000,
      onBlock: () => {
        this.get({ ID: trackID, ignoreSpins: !spins }, (track) => {
          try {
            track = track[0];
            $("#song-info-ID").html(track.ID);
            $("#song-info-status").html(
              track.enabled === 1 ? "Enabled" : "Disabled"
            );
            document.getElementById("song-info-status").className = `bg-${
              track.enabled === 1 ? "success" : "dark"
            }`;
            $("#song-info-artist").html(track.artist);
            $("#song-info-title").html(track.title);
            $("#song-info-album").html(track.album);
            $("#song-info-genre").html(track.genre);
            $("#song-info-duration").html(
              moment.duration(track.duration, "seconds").format("HH:mm:ss")
            );
            $("#song-info-lastplayed").html(
              moment
                .tz(
                  track.date_played,
                  this.manager.get("WWSUMeta")
                    ? this.manager.get("WWSUMeta").meta.timezone
                    : moment.tz.guess()
                )
                .isAfter("2002-01-01 00:00:01")
                ? moment
                    .tz(
                      track.date_played,
                      this.manager.get("WWSUMeta")
                        ? this.manager.get("WWSUMeta").meta.timezone
                        : moment.tz.guess()
                    )
                    .format("LLLL")
                : "Unknown"
            );
            $("#song-info-limits").html(`<ul>
							${
                track.limit_action > 0 && track.count_played < track.play_limit
                  ? `<li>Track has ${
                      track.play_limit - track.count_played
                    } spins left</li>`
                  : ``
              }
							${
                track.limit_action > 0 && track.count_played >= track.play_limit
                  ? `<li>Track expired (reached spin limit)</li>`
                  : ``
              }
							${
                moment
                  .tz(
                    track.start_date,
                    this.manager.get("WWSUMeta")
                      ? this.manager.get("WWSUMeta").meta.timezone
                      : moment.tz.guess()
                  )
                  .isAfter(this.manager.get("WWSUMeta").meta.time)
                  ? `<li>Track cannot be played until ${moment
                      .tz(
                        track.start_date,
                        this.manager.get("WWSUMeta")
                          ? this.manager.get("WWSUMeta").meta.timezone
                          : moment.tz.guess()
                      )
                      .format("LLLL")}</li>`
                  : ``
              }
							${
                moment
                  .tz(
                    track.end_date,
                    this.manager.get("WWSUMeta")
                      ? this.manager.get("WWSUMeta").meta.timezone
                      : moment.tz.guess()
                  )
                  .isBefore(this.manager.get("WWSUMeta").meta.time) &&
                moment
                  .tz(
                    track.end_date,
                    this.manager.get("WWSUMeta")
                      ? this.manager.get("WWSUMeta").meta.timezone
                      : moment.tz.guess()
                  )
                  .isAfter("2002-01-01 00:00:01")
                  ? `<li>Track expired on ${moment
                      .tz(
                        track.end_date,
                        this.manager.get("WWSUMeta")
                          ? this.manager.get("WWSUMeta").meta.timezone
                          : moment.tz.guess()
                      )
                      .format("LLLL")}</li>`
                  : ``
              }
							</ul>`);

            if (spins && track.spins) {
              $("#song-info-spins").html(
                `${track.spins.automation
                  .map(
                    (spin) =>
                      `Automation: ${moment
                        .tz(
                          spin,
                          this.manager.get("WWSUMeta")
                            ? this.manager.get("WWSUMeta").meta.timezone
                            : moment.tz.guess()
                        )
                        .format("LLLL")}`
                  )
                  .join("<br />")}<br />${track.spins.logged
                  .map(
                    (spin) =>
                      `Logged: ${moment
                        .tz(
                          spin,
                          this.manager.get("WWSUMeta")
                            ? this.manager.get("WWSUMeta").meta.timezone
                            : moment.tz.guess()
                        )
                        .format("LLLL")}`
                  )
                  .join("<br />")}`
              );
            } else {
              $("#song-info-spins").html(``);
            }

            if (requestForm) {
              if (track.request.requestable) {
                $(this.modals.trackInfo.footer).html(`<div class="form-group">
													<h6>Request this Track</h6>
													<label for="song-request-name">Name (optional; displayed when the request plays)</label>
													<input type="text" class="form-control" id="song-request-name" tabindex="0">
													<label for="song-request-message">Message for the DJ (optional)</label>
													<textarea class="form-control" id="song-request-message" rows="2" tabindex="0"></textarea>
													</div>                    
													<div class="form-group"><button type="submit" id="song-request-submit" class="btn btn-primary" tabindex="0">Place Request</button></div>`);
                window.requestAnimationFrame(() => {
                  $(`#song-request-submit`)
                    .unbind("click")
                    .click((e) => {
                      this.manager
                        .get("WWSUrequestsweb")
                        .place(`#modal-${this.modals.trackInfo.id}`, {
                          ID: track.ID,
                        });
                    });
                  $(`#song-request-submit`)
                    .unbind("keydown")
                    .keydown((e) => {
                      if (e.code === "Space" || e.code === "Enter")
                      this.manager
                        .get("WWSUrequestsweb")
                        .place(`#modal-${this.modals.trackInfo.id}`, {
                          ID: track.ID,
                        });
                    });
                });
              } else {
                $(this.modals.trackInfo.footer)
                  .html(`<div class="callout callout-${track.request.listDiv}">
										${track.request.message}
									</div>`);
              }
            } else {
              $(this.modals.trackInfo.footer).html(``);
            }
          } catch (e) {
            console.error(e);
            $(document).Toasts("create", {
              class: "bg-danger",
              title: "Error loading track information",
              subtitle: trackID,
              body:
                "There was an error loading track information. Please report this to the engineer.",
              icon: "fas fa-skull-crossbones fa-lg",
            });
          }
          $(`#modal-${this.modals.trackInfo.id}`).unblock();
        });
      },
    });
  }
}
