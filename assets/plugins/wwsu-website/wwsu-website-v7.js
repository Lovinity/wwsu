/* global WWSUreq, WWSUmeta, WWSUnavigation, CalendarDb, WWSUutil, WWSUsubscriptions, WWSUlikedtracks */

// These need loaded immediately and on a global scale. They do not rely on the DOM being loaded first.
var wwsuutil = new WWSUutil();
var navigation = new WWSUNavigation();

window.addEventListener("DOMContentLoaded", () => {
  try {
    // Initialize sails.js socket connection to WWSU
    io.sails.url = "https://server.wwsu1069.org";
    var socket = io.sails.connect();
    var noReq = new WWSUreq(socket, null);

    // WWSU Variables
    var meta = new WWSUMeta(socket, noReq);

    // Liked Tracks
    var likedtracks = new WWSUlikedtracks(socket, noReq);
    likedtracks.on("init", "renderer", () => {
      meta.meta = meta.meta.history;
    });
    likedtracks.on("likedTrack", "renderer", () => {
      meta.meta = meta.meta.history;
    });
    likedtracks.on("likedTrackManual", "renderer", () => {
      meta.meta = meta.meta.history;
    });

    // Announcements
    var announcementsToastIDs = [];
    var announcements = new WWSUannouncements(socket, noReq, [
      "website-toast",
      "website-nowplaying",
      "website-chat",
      "website-schedule",
      "website-request",
      "website-directors",
    ]);

    // Add event handlers
    announcements.on("change", "renderer", (db) => {
      processAnnouncements();
    });

    // Directors
    var directorsdb = new WWSUdirectors(socket, noReq);
    var directorHours = {};

    var messageIDs = [];
    var calendardb = new WWSUcalendar(socket, meta, noReq);
    var newMessages = 0;
    var client = "";
    var automationpost = ``;
    var blocked = false;
    var skipIt = 0;
    var viewingEvent = {};

    // subscriptions
    var subscriptions = new WWSUsubscriptions(socket, noReq);
    subscriptions.on("subscriptions", "renderer", (subscriptions) => {
      meta.meta = { state: meta.meta.state };
    });

    // Operation Variables
    var firstTime = true;

    // oneSignal Variables
    var onlineSocketDone = false;
    var device = wwsuutil.getUrlParameter(`device`);
    var isMobile = device !== null;
    var notificationsSupported = false;
    var OneSignal;
  } catch (e) {
    console.error(e);
    $(document).Toasts("create", {
      class: "bg-danger",
      title: "Error initializing",
      body:
        "There was an error initializing the website. Please report this to wwsu4@wright.edu.",
      icon: "fas fa-skull-crossbones fa-lg",
    });
  }

  try {
    // Initialize the web player
    if (document.querySelector("#single-song-player")) {
      Amplitude.init({
        songs: [
          {
            url: "https://server.wwsu1069.org/stream",
            live: true,
          },
        ],
      });
    }

    // Initialize menu items
    navigation.addItem(
      "#nav-nowplaying",
      "#section-nowplaying",
      "Now Playing - WWSU 106.9 FM Listener's Corner",
      "/",
      true
    );
    navigation.addItem(
      "#nav-chat",
      "#section-chat",
      "Chat with DJ - WWSU 106.9 FM Listener's Corner",
      "/chat",
      false,
      () => {
        newMessages = 0;
        updateNewMessages();
      }
    );
    navigation.addItem(
      "#nav-schedule",
      "#section-schedule",
      "Schedule - WWSU 106.9 FM Listener's Corner",
      "/schedule",
      false,
      () => {
        updateCalendar();
      }
    );
    navigation.addItem(
      "#nav-hours",
      "#section-hours",
      "Office Hours - WWSU 106.9 FM Listener's Corner",
      "/hours",
      false,
      () => {
        updateDirectorsCalendar();
      }
    );
    navigation.addItem(
      "#nav-request",
      "#section-request",
      "Track Requests - WWSU 106.9 FM Listener's Corner",
      "/request",
      false
    );

    // Add change event for chat-nickname
    $("#chat-nickname").change(function () {
      socket.post(
        "/recipients/edit-web",
        { label: $(this).val() },
        function serverResponded() {}
      );
    });

    // Add click events for subscription buttons
    $(`#modal-eventinfo-subscribe-once`).click((e) => {
      subscribe(`calendar-once`, viewingEvent.unique);
      $("#modal-eventinfo").modal("hide");
    });
    $(`#modal-eventinfo-subscribe-once`).keypress((e) => {
      if (e.key === "Enter") {
        subscribe(`calendar-once`, viewingEvent.unique);
        $("#modal-eventinfo").modal("hide");
      }
    });
    $(`#modal-eventinfo-subscribe-all`).click((e) => {
      subscribe(`calendar-all`, viewingEvent.calendarID);
      $("#modal-eventinfo").modal("hide");
    });
    $(`#modal-eventinfo-subscribe-all`).keypress((e) => {
      if (e.key === "Enter") {
        subscribe(`calendar-all`, viewingEvent.calendarID);
        $("#modal-eventinfo").modal("hide");
      }
    });
    $(`#modal-eventinfo-unsubscribe`).click((e) => {
      unsubscribe(viewingEvent.unique, viewingEvent.calendarID);
      $("#modal-eventinfo").modal("hide");
    });
    $(`#modal-eventinfo-unsubscribe`).keypress((e) => {
      if (e.key === "Enter") {
        unsubscribe(viewingEvent.unique, viewingEvent.calendarID);
        $("#modal-eventinfo").modal("hide");
      }
    });
    $(`#send-message-public`).click(() => {
      sendMessage();
    });
    $(`#send-message-public`).keydown((e) => {
      if (e.code === "Space" || e.code === "Enter") sendMessage();
    });
    $(`#send-message-private`).click(() => {
      sendMessage(true);
    });
    $(`#send-message-private`).keydown((e) => {
      if (e.code === "Space" || e.code === "Enter") sendMessage(true);
    });
    $(`#schedule-select`).change(() => {
      updateCalendar();
    });
    $(`#request-search`).click(() => {
      loadTracks(0);
    });
    $(`#request-search`).keydown((e) => {
      if (e.code === "Space" || e.code === "Enter") loadTracks(0);
    });
    $(`#request-more`).click(() => {
      loadTracks(0);
    });
    $(`#request-more`).keydown((e) => {
      if (e.code === "Space" || e.code === "Enter") loadTracks(0);
    });
  } catch (e) {
    console.error(e);
    $(document).Toasts("create", {
      class: "bg-danger",
      title: "Error in document.ready",
      body:
        "There was an error in initializing the webpage. Please report this to wwsu4@wright.edu.",
      icon: "fas fa-skull-crossbones fa-lg",
    });
  }

  /*
    SOCKET EVENTS
*/

  // Socket connect
  socket.on("connect", () => {
    doSockets(firstTime);
  });

  // Disconnection; try to re-connect
  socket.on("disconnect", () => {
    try {
      socket._raw.io._reconnection = true;
      socket._raw.io._reconnectionAttempts = Infinity;
    } catch (unusedE) {}
  });

  /*
    DISCIPLINE FUNCTIONS
*/

  socket.on("discipline", (data) => {
    socket.disconnect();
    $("#modal-discipline-title").html(
      `Disciplinary action issued - Disconnected from WWSU`
    );
    $("#modal-discipline-body")
      .html(`<p>Disciplinary action was issued against you for the following reason: ${data.message}.</p>
<p>A ${data.action} was issued against you, and you may no longer use WWSU's services until the discipline expires.</p>
<p>Please contact gm@wwsu1069.org if you have any questions or concerns.</p>`);
    $("#modal-discipline").modal({ backdrop: "static", keyboard: false });
  });

  /**
   * Check if this client has an active discipline on WWSU's API, and if so, display the #modal-discipline.
   *
   * @param {function} cb Callback executed if user is not under a discipline
   */
  function checkDiscipline(cb) {
    socket.post("/discipline/get-web", {}, function serverResponded(body) {
      try {
        var docb = true;
        if (body.length > 0) {
          body.map((discipline) => {
            var activeDiscipline =
              discipline.active &&
              (discipline.action !== "dayban" ||
                moment(discipline.createdAt).add(1, "days").isAfter(moment()));
            if (activeDiscipline) {
              docb = false;
            }
            if (activeDiscipline || !discipline.acknowledged) {
              $("#modal-discipline-title").html(
                `Disciplinary action ${
                  activeDiscipline
                    ? `active against you`
                    : `was issued in the past against you`
                }`
              );
              $("#modal-discipline-body").html(`<p>On ${moment(
                discipline.createdAt
              ).format(
                "LLL"
              )}, disciplinary action was issued against you for the following reason: ${
                discipline.message
              }.</p>
                <p>${
                  activeDiscipline
                    ? `A ${discipline.action} is currently active, and you are not allowed to use WWSU's services at this time.`
                    : `The discipline has expired, but you must acknowledge this message before you may use WWSU's services. Further issues may warrant more severe disciplinary action.`
                }</p>
                <p>Please contact gm@wwsu1069.org if you have any questions or concerns.</p>`);
              $("#modal-discipline").modal({
                backdrop: "static",
                keyboard: false,
              });
            }
          });
        }
        if (docb) {
          cb();
        }
      } catch (e) {
        console.error(e);
        $(document).Toasts("create", {
          class: "bg-danger",
          title: "Error checking discipline",
          body:
            "There was an error checking to see if you are allowed to access WWSU. Please try again later, or contact wwsu4@wright.edu if this problem continues.",
          icon: "fas fa-skull-crossbones fa-lg",
        });
      }
    });
  }

  /*
    SOCKET FUNCTIONS
*/

  /**
   * Hit necessary WWSU API endpoints and subscribe to socket events.
   *
   * @param {boolean} firsttime Whether or not this is the first time executing doSockets since the user loaded the page.
   */
  function doSockets(firsttime = false) {
    // Mobile devices and web devices where device parameter was passed, start sockets immediately.
    if (isMobile || !firsttime || (!isMobile && device !== null)) {
      checkDiscipline(() => {
        likedtracks.init();
        meta.init();
        announcements.init();
        directorsdb.init();
        calendardb.init();
        loadGenres();
        onlineSocket();
        messagesSocket();
      });
      // web devices without device parameter, connect to OneSignal first and get the ID, then start sockets.
    } else {
      OneSignal = window.OneSignal || [];
      checkDiscipline(() => {
        likedtracks.init();
        meta.init();
        announcements.init();
        directorsdb.init();
        calendardb.init();
        loadGenres();
        onlineSocket(true);
        messagesSocket();
      });
    }
  }

  /*
    META FUNCTIONS
*/

  meta.on("newMeta", "renderer", (response, _meta) => {
    try {
      var temp;
      var temp2;
      var temp3;
      var temp4;
      var subscribed;

      // Update meta, if new meta was provided
      if ("line1" in response || "line2" in response) {
        // Update now playing icon
        if (_meta.state.startsWith("live_")) {
          $(".nowplaying-icon").html(
            `${
              _meta.showLogo !== null
                ? `<img class="profile-user-img img-fluid img-circle bg-danger" src="/uploads/calendar/logo/${_meta.showLogo}" alt="Show Logo">`
                : `<i class="profile-user-img img-fluid img-circle fas fa-microphone bg-danger" aria-hidden="true" title="Live radio show"></i><span class="sr-only">Live radio show</span>`
            }`
          );
        }
        if (_meta.state.startsWith("prerecord_")) {
          $(".nowplaying-icon").html(
            `${
              _meta.showLogo !== null
                ? `<img class="profile-user-img img-fluid img-circle bg-danger" src="/uploads/calendar/logo/${_meta.showLogo}" alt="Show Logo">`
                : `<i class="profile-user-img img-fluid img-circle fas fa-play-circle bg-pink" aria-hidden="true" title="Prerecorded show"></i><span class="sr-only">Prerecorded show</span>`
            }`
          );
        }
        if (
          _meta.state.startsWith("sports_") ||
          _meta.state.startsWith("sportsremote_")
        ) {
          $(".nowplaying-icon").html(
            `${
              _meta.showLogo !== null
                ? `<img class="profile-user-img img-fluid img-circle bg-success" src="/uploads/calendar/logo/${_meta.showLogo}" alt="Show Logo">`
                : `<i class="profile-user-img img-fluid img-circle fas fa-basketball-ball bg-success" aria-hidden="true" title="Sports broadcast"></i><span class="sr-only">Sports broadcast</span>`
            }`
          );
        }
        if (_meta.state.startsWith("remote_")) {
          $(".nowplaying-icon").html(
            `<i class="profile-user-img img-fluid img-circle fas fa-broadcast-tower bg-purple"></i>`
          );
          $(".nowplaying-icon").html(
            `${
              _meta.showLogo !== null
                ? `<img class="profile-user-img img-fluid img-circle bg-purple" src="/uploads/calendar/logo/${_meta.showLogo}" alt="Show Logo">`
                : `<i class="profile-user-img img-fluid img-circle fas fa-broadcast-tower bg-purple" aria-hidden="true" title="Remote broadcast"></i><span class="sr-only">Remote broadcast</span>`
            }`
          );
        }
        if (
          _meta.state.startsWith("automation_") ||
          _meta.state === "unknown"
        ) {
          $(".nowplaying-icon").html(
            `<i class="profile-user-img img-fluid img-circle fas fa-music bg-primary" aria-hidden="true" title="Music genre"></i><span class="sr-only">Music</span>`
          );
        }

        // Update now playing text
        $(".nowplaying-line1").html(_meta.line1);
        $(".nowplaying-line2").html(_meta.line2);
        $(".nowplaying-topic").html(_meta.topic);
      }

      if ("webchat" in response && !response.webchat) {
        blocked = true;
        $(".chat-status").html(`<p class="h5">Chat Status: Disabled</p>
            <p>Either the current DJ disabled the chat for their show, or directors have temporarily disabled the chat globally.</p>`);
        $(".chat-blocker").prop("disabled", true);
      }

      // If a state change was returned, process it by informing the client whether or not there is probably a DJ at the studio to read messages
      if ("state" in response && _meta.webchat) {
        if (
          response.state.startsWith("automation_") ||
          _meta.state === "unknown"
        ) {
          if (automationpost !== "automation") {
            $(".chat-status").html(`<p class="h5">Chat Status: Inactive</p>
                    <p>No shows are airing right now. Your message will likely not be seen by a DJ.</p>`);
            automationpost = "automation";
          }
        } else if (response.state.startsWith("prerecord_")) {
          if (automationpost !== response.show) {
            automationpost = response.show;
            $(".chat-status").html(`<p class="h5">Chat Status: Prerecord</p>
                    <p>The show airing now is prerecorded. There might not be anyone in the studio to see your messages.</p>`);
          }

          /* TODO
                temp = document.querySelector(`#show-subscribe`)
                temp2 = document.querySelector(`#show-subscribe-button`)
                temp3 = document.querySelector(`#show-subscribe-name`)
                temp4 = document.querySelector(`#show-subscribe-instructions`)
                if (temp !== null) {
                    subscribed = Subscriptions({ type: `calendar-all`, subtype: _meta.state.startsWith('sports') ? `Sports: ${_meta.show}` : _meta.show }).get().length
                    if (subscribed === 0) {
                        temp.style.display = 'block'
                    } else {
                        temp.style.display = 'none'
                    }
                    temp3.innerHTML = _meta.show
                    if (notificationsSupported || isMobile) {
                        if (device === null && !isMobile) {
                            temp2.innerHTML = 'Show Prompt'
                            temp4.innerHTML = `First, click "Show Prompt" and allow notifications. Then when the button turns to "Subscribe", click it again.`
                            temp2.onclick = () => OneSignal.showSlidedownPrompt({ force: true })
                            temp2.onkeydown = () => OneSignal.showSlidedownPrompt({ force: true })
                        } else {
                            temp2.innerHTML = 'Subscribe'
                            temp4.innerHTML = `Click "Subscribe" to receive notifications when this show is on the air.`
                            temp2.onclick = () => {
                                if (_meta.state.startsWith('live_') || _meta.state.startsWith('remote_')) {
                                    subscribe(`calendar-all`, _meta.show)
                                } else if (_meta.state.startsWith('sports_') || _meta.state.startsWith('sportsremote_')) {
                                    subscribe(`calendar-all`, `Sports: ${_meta.show}`)
                                }
                            }
                            temp2.onkeydown = () => {
                                if (_meta.state.startsWith('live_') || _meta.state.startsWith('remote_')) {
                                    subscribe(`calendar-all`, _meta.show)
                                } else if (_meta.state.startsWith('sports_') || _meta.state.startsWith('sportsremote_')) {
                                    subscribe(`calendar-all`, `Sports: ${_meta.show}`)
                                }
                            }
                        }
                    } else {
                        temp2.innerHTML = 'Not Supported'
                        temp4.innerHTML = `Sorry, push notifications are not supported on your browser at this time. Stay tuned as we will be releasing a WWSU mobile app in the future!`
                        temp2.onclick = () => { }
                        temp2.onkeydown = () => { }
                    }
                }
                */
        } else {
          if (automationpost !== response.show) {
            $(".chat-status").html(`<p class="h5">Chat Status: Active</p>
                    <p>Your messages should be received by the DJ / host.</p>`);
            automationpost = response.show;
          }

          /* TODO
                temp = document.querySelector(`#show-subscribe`)
                temp2 = document.querySelector(`#show-subscribe-button`)
                temp3 = document.querySelector(`#show-subscribe-name`)
                temp4 = document.querySelector(`#show-subscribe-instructions`)
                if (temp !== null) {
                    subscribed = Subscriptions({ type: `calendar-all`, subtype: _meta.state.startsWith('sports') ? `Sports: ${_meta.show}` : _meta.show }).get().length
                    if (subscribed === 0) {
                        temp.style.display = 'block'
                    } else {
                        temp.style.display = 'none'
                    }
                    temp3.innerHTML = _meta.show
                    if (notificationsSupported || isMobile) {
                        if (device === null && !isMobile) {
                            temp2.innerHTML = 'Show Prompt'
                            temp4.innerHTML = `First, click "Show Prompt" and allow notifications. Then when the button turns to "Subscribe", click it again.`
                            temp2.onclick = () => OneSignal.showSlidedownPrompt({ force: true })
                            temp2.onkeydown = () => OneSignal.showSlidedownPrompt({ force: true })
                        } else {
                            temp2.innerHTML = 'Subscribe'
                            temp4.innerHTML = `Click "Subscribe" to receive notifications when this show goes on the air.`
                            temp2.onclick = () => {
                                if (_meta.state.startsWith('live_') || _meta.state.startsWith('remote_')) {
                                    subscribe(`calendar-all`, _meta.show)
                                } else if (_meta.state.startsWith('sports_') || _meta.state.startsWith('sportsremote_')) {
                                    subscribe(`calendar-all`, `Sports: ${_meta.show}`)
                                }
                            }
                            temp2.onkeydown = () => {
                                if (_meta.state.startsWith('live_') || _meta.state.startsWith('remote_')) {
                                    subscribe(`calendar-all`, _meta.show)
                                } else if (_meta.state.startsWith('sports_') || _meta.state.startsWith('sportsremote_')) {
                                    subscribe(`calendar-all`, `Sports: ${_meta.show}`)
                                }
                            }
                        }
                    } else {
                        temp2.innerHTML = 'Not Supported'
                        temp4.innerHTML = `Sorry, push notifications are not supported on your browser at this time. Stay tuned as we will be releasing a WWSU mobile app in the future!`
                        temp2.onclick = () => { }
                        temp2.onkeydown = () => { }
                    }
                }
                */
        }
      }

      // Unblock webchat if chats are allowed
      if (_meta.webchat) {
        blocked = false;
        $(".chat-blocker").prop("disabled", false);
      }

      // If a track ID change was passed, do some stuff in recent tracks
      if (typeof response.history !== "undefined") {
        // reset recent tracks
        $(".nowplaying-recentlyplayed").html(
          response.history.map((track) => {
            if (track.likable && track.ID !== 0)
              wwsuutil.waitForElement(`#track-like-${track.ID}`, () => {
                $(`#track-like-${track.ID}`).click(() => {
                  console.log(`Clicked #track-like-${track.ID}`);
                  likeTrack(track.ID);
                });
                $(`#track-like-${track.ID}`).keydown((e) => {
                  if (e.code === "Space" || e.code === "Enter")
                    likeTrack(track.ID);
                });
              });
            return `<tr>
                <td>
                ${track.track}
                </td>
                <td>
                ${
                  track.likable && track.ID !== 0
                    ? `${
                        likedtracks.likedTracks.indexOf(track.ID) === -1
                          ? `<button type="button" id="track-like-${track.ID}" class="btn btn-success btn-small" tabindex="0" title="Like this track; liked tracks play more often on WWSU.">Like Track</button>`
                          : `<button type="button" class="btn btn-outline-success btn-small disabled" tabindex="0" title="You already liked this track.">Already Liked</button>`
                      }`
                    : `<button type="button" class="btn btn-outline-danger btn-small disabled" tabindex="0" title="This track was not played in the WWSU automation system. If you like it, please send a message to the DJ instead.">Manually Played</button>`
                }
                </td>
                </tr>`;
          })
        );
      }
    } catch (e) {
      console.error(e);
    }
  });

  /*
    TRACK LIKING FUNCTIONS
*/

  /**
   * Mark a track as liked through the WWSU API.
   *
   * @param {integer || string} trackID The ID number of the track to like, or a string of the track artist - name if the track was played manually.
   */
  function likeTrack(trackID) {
    likedtracks.likeTrack(trackID);
  }

  /*
    ANNOUNCEMENTS FUNCTIONS
*/

  /**
   *  Update all announcements for the website.
   */
  function processAnnouncements() {
    // Process all announcements
    var html = {
      nowplaying: ``,
      chat: ``,
      schedule: ``,
      request: ``,
      directors: ``,
    };
    announcements.db().each((announcement) => {
      if (
        moment(meta.meta.time).isAfter(moment(announcement.starts)) &&
        moment(meta.meta.time).isBefore(moment(announcement.expires))
      ) {
        if (announcement.type.startsWith("website-")) {
          var type = announcement.type.replace("website-", "");
          if (
            type === "toast" &&
            announcementsToastIDs.indexOf(announcement.ID) === -1
          ) {
            announcementsToastIDs.push(announcement.ID);
            $(document).Toasts("create", {
              class: `bg-${announcement.level}`,
              title: announcement.title,
              subtitle: `Announcement`,
              autohide: true,
              delay: announcement.displayTime * 1000 || 15000,
              body: announcement.announcement,
              icon: "fas fa-bullhorn fa-lg",
            });
          } else {
            html[type] += `<div class="alert alert-${announcement.level}">
                    <p class="h5">${announcement.title}</p>
                    ${announcement.announcement}
                  </div>`;
          }
        }
      }
    });

    // Display announcements on website
    for (var announcementType in html) {
      if (Object.prototype.hasOwnProperty.call(html, announcementType)) {
        $(`.announcements-${announcementType}`).html(html[announcementType]);
      }
    }
  }

  /*
    CALENDAR / SCHEDULE FUNCTIONS
*/

  calendardb.on("calendarUpdated", "renderer", (db) => {
    updateCalendar();
    updateDirectorsCalendar();
  });
  directorsdb.on("change", "renderer", () => {
    updateDirectorsCalendar();
  });

  /**
   * Re-process calendar events
   */
  var calendarUpdating = false;
  function updateCalendar() {
    if (calendarUpdating) return;
    calendarUpdating = true;
    $("#schedule-events").block({
      message: "<h1>Loading...</h1>",
      css: { border: "3px solid #a00" },
      timeout: 15000,
      onBlock: () => {
        // Get the value of the currently selected calendar item
        var selectedOption = $("#schedule-select")
          .children("option:selected")
          .val();
        selectedOption = parseInt(selectedOption);

        for (var i = 1; i < 14; i++) {
          $(`#schedule-select-${i}`).html(
            moment(meta.meta.time)
              .startOf(`day`)
              .add(i, "days")
              .format(`dddd MM/DD`)
          );
        }

        // Process events for the next 7 days
        calendardb.getEvents(
          (events) => {
            var html = "";

            // Run through every event in memory and add appropriate ones into our formatted calendar variable.
            events
              .filter(
                (event) =>
                  [
                    "event",
                    "onair-booking",
                    "prod-booking",
                    "office-hours",
                  ].indexOf(event.type) === -1 &&
                  moment(event.start).isSameOrBefore(
                    moment(meta.meta.time)
                      .startOf(`day`)
                      .add(selectedOption + 1, `days`)
                  ) &&
                  moment(event.start).isSameOrAfter(
                    moment(meta.meta.time)
                      .startOf(`day`)
                      .add(selectedOption, `days`)
                  )
              )
              .map((event) => {
                try {
                  var colorClass = `secondary`;
                  var iconClass = "far fa-calendar-alt";
                  var accessibleText = "Event";

                  switch (event.type) {
                    case "genre":
                    case "playlist":
                      colorClass = "primary";
                      iconClass = "fas fa-music";
                      accessibleText = "Music";
                      break;
                    case "show":
                      colorClass = "danger";
                      iconClass = "fas fa-microphone";
                      accessibleText = "Live Show";
                      break;
                    case "sports":
                      colorClass = "success";
                      iconClass = "fas fa-basketball-ball";
                      accessibleText = "Sports Broadcast";
                      break;
                    case "remote":
                      colorClass = "purple";
                      iconClass = "fas fa-broadcast-tower";
                      accessibleText = "Remote Broadcast";
                      break;
                    case "prerecord":
                      colorClass = "pink";
                      iconClass = "fas fa-play-circle";
                      accessibleText = "Prerecorded Show";
                      break;
                  }

                  if (
                    ["canceled", "canceled-system", "canceled-changed"].indexOf(
                      event.scheduleType
                    ) !== -1
                  ) {
                    colorClass = "dark";
                  }

                  var badgeInfo;
                  if (["canceled-changed"].indexOf(event.scheduleType) !== -1) {
                    badgeInfo = `<span class="badge-warning" style="font-size: 1em;">RESCHEDULED</span>`;
                  }
                  if (
                    ["updated", "updated-system"].indexOf(
                      event.scheduleType
                    ) !== -1 &&
                    event.timeChanged
                  ) {
                    badgeInfo = `<span class="badge badge-warning" style="font-size: 1em;">TEMP TIME CHANGE</span>`;
                  }
                  if (
                    ["canceled", "canceled-system"].indexOf(
                      event.scheduleType
                    ) !== -1
                  ) {
                    badgeInfo = `<span class="badge badge-danger" style="font-size: 1em;">CANCELED</span>`;
                  }

                  var shouldBeDark =
                    ["canceled", "canceled-system", "canceled-changed"].indexOf(
                      event.scheduleType
                    ) !== -1 || moment().isAfter(moment(event.end));

                  html += `<div class="col" style="min-width: 280px;">
                <div class="p-2 card card-${colorClass} card-outline${
                    shouldBeDark ? ` bg-secondary` : ``
                  }">
                  <div class="card-body box-profile">
                    <div class="text-center">
                    ${
                      event.logo !== null
                        ? `<img class="profile-user-img img-fluid img-circle" src="/uploads/calendar/logo/${event.logo}" alt="Show Logo">`
                        : `<i class="profile-user-img img-fluid img-circle ${iconClass} bg-${colorClass}" style="font-size: 5rem;" aria-hidden="true" title="${accessibleText}"></i><span class="sr-only">${accessibleText}</span>`
                    }
                    </div>
    
                    <p class="profile-username text-center h3">${event.name}</p>
    
                    <p class="${
                      !shouldBeDark ? `text-muted ` : ``
                    }text-center">${event.hosts}</p>
    
                    <ul class="list-group list-group-unbordered mb-3 text-center">
                    ${
                      badgeInfo
                        ? `<li class="list-group-item${
                            shouldBeDark ? ` bg-secondary` : ``
                          }">
                    <b>${badgeInfo}</b>
                  </li>`
                        : ``
                    }
                    <li class="list-group-item${
                      shouldBeDark ? ` bg-secondary` : ``
                    }">
                        <b>${moment(event.start).format("hh:mm A")} - ${moment(
                    event.end
                  ).format("hh:mm A")}</b>
                    </li>
                    </ul>
    
                    <a href="#" class="btn btn-primary btn-block" tabindex="0" title="Click to view more information about this event and to subscribe or unsubscribe from push notifications." id="event-info-${
                      event.unique
                    }"><b>More Info / Notifications</b></a>
                  </div>
                </div>
              </div>`;
                  wwsuutil.waitForElement(`#event-info-${event.unique}`, () => {
                    $(`#event-info-${event.unique}`).click(() => {
                      console.log(`Clicked #event-info-${event.unique}`);
                      displayEventInfo(event.unique);
                    });
                    $(`#event-info-${event.unique}`).keydown((e) => {
                      if (e.code === "Space" || e.code === "Enter")
                        displayEventInfo(event.unique);
                    });
                  });
                } catch (e) {
                  console.error(e);
                  $(document).Toasts("create", {
                    class: "bg-danger",
                    title: "calendar error",
                    body:
                      "There was an error in the updateCalendar function, event mapping. Please report this to wwsu4@wright.edu.",
                    icon: "fas fa-skull-crossbones fa-lg",
                  });
                }
              });

            $("#schedule-events").html(html);
            $("#schedule-events").unblock();

            calendarUpdating = false;
          },
          moment().add(selectedOption, "days").startOf("day"),
          moment()
            .add(selectedOption + 1, "days")
            .startOf("day")
        );
      },
      onUnblock: () => {
        calendarUpdating = false;
      },
    });
  }

  /**
   * Update director office hours
   */
  var directorsCalendarUpdating = false;
  function updateDirectorsCalendar() {
    if (directorsCalendarUpdating) return;
    directorsCalendarUpdating = true;
    $("#schedule-hours").block({
      message: "<h1>Loading...</h1>",
      css: { border: "3px solid #a00" },
      timeout: 15000,
      onBlock: () => {
        try {
          directorHours = {};

          directorsdb.db().each((director) => {
            directorHours[director.ID] = { director: director, hours: [] };
          });

          // A list of Office Hours for the directors

          // Define a comparison function that will order calendar events by start time when we run the iteration
          var compare = function (a, b) {
            try {
              if (moment(a.start).valueOf() < moment(b.start).valueOf()) {
                return -1;
              }
              if (moment(a.start).valueOf() > moment(b.start).valueOf()) {
                return 1;
              }
              if (a.ID < b.ID) {
                return -1;
              }
              if (a.ID > b.ID) {
                return 1;
              }
              return 0;
            } catch (e) {
              console.error(e);
              iziToast.show({
                title: "An error occurred - Please check the logs",
                message: `Error occurred in the compare function of Calendar.sort in the Calendar[0] call.`,
              });
            }
          };
          calendardb.getEvents(
            (events) => {
              events
                .sort(compare)
                .filter((event) => event.type === "office-hours")
                .map((event) => {
                  // null start or end? Use a default to prevent errors.
                  if (!moment(event.start).isValid()) {
                    event.start = moment(meta.meta.time).startOf("day");
                  }
                  if (!moment(event.end).isValid()) {
                    event.end = moment(meta.meta.time)
                      .add(1, "days")
                      .startOf("day");
                  }

                  event.startT =
                    moment(event.start).minutes() === 0
                      ? moment(event.start).format("h")
                      : moment(event.start).format("h:mm");
                  if (
                    (moment(event.start).hours() < 12 &&
                      moment(event.end).hours() >= 12) ||
                    (moment(event.start).hours() >= 12 &&
                      moment(event.end).hours() < 12)
                  ) {
                    event.startT += moment(event.start).format("A");
                  }
                  event.endT =
                    moment(event.end).minutes() === 0
                      ? moment(event.end).format("hA")
                      : moment(event.end).format("h:mmA");

                  // Update strings if need be, if say, start time was before this day, or end time is after this day.
                  if (
                    moment(event.end).isAfter(
                      moment(event.start).startOf("day").add(1, "days")
                    )
                  ) {
                    event.endT = `${moment(event.end).format("MM/DD ")} ${
                      event.endT
                    }`;
                  }
                  event.startT = `${moment(event.start).format("MM/DD ")} ${
                    event.startT
                  }`;

                  var endText = `<span class="text-dark">${event.startT} - ${event.endT}</span>`;
                  if (event.timeChanged) {
                    endText = `<span class="text-primary" title="These hours were changed/updated from the original.">${event.startT} - ${event.endT}</span> (temp hours)`;
                  }
                  if (moment(meta.meta.time).isAfter(moment(event.end))) {
                    endText = `<strike><span class="text-black-50" title="These hours have passed.">${event.startT} - ${event.endT}</span></strike> (passed)`;
                  }
                  if (
                    event.scheduleType &&
                    event.scheduleType.startsWith("canceled")
                  ) {
                    endText = `<strike><span class="text-danger" title="These hours were canceled.">${event.startT} - ${event.endT}</span></strike> (canceled)`;
                  }

                  if (
                    typeof directorHours[event.director] !== "undefined" &&
                    typeof directorHours[event.director].hours !== "undefined"
                  ) {
                    directorHours[event.director].hours.push(endText);
                  }
                });

              var html = ``;

              for (var directorHour in directorHours) {
                if (
                  Object.prototype.hasOwnProperty.call(
                    directorHours,
                    directorHour
                  )
                ) {
                  var text1 = "OUT OF OFFICE";
                  var textTitle =
                    "This director is not currently in the WWSU office.";
                  var theClass = "danger";
                  if (directorHours[directorHour].director.present) {
                    text1 = "IN OFFICE";
                    textTitle =
                      "This director is currently in the WWSU office.";
                    theClass = "success";
                  }
                  html += `<div class="col" style="min-width: 280px;">
                  <div class="p-2 card card-${theClass} card-outline">
                    <div class="card-body box-profile">
                      <div class="text-center">
                      ${
                        directorHours[directorHour].director.avatar !== ""
                          ? `<img class="profile-user-img img-fluid img-circle" src="${directorHours[directorHour].director.avatar}" alt="Director Avatar">`
                          : `<div class="bg-${theClass} profile-user-img img-fluid img-circle">${jdenticon.toSvg(
                              `Director ${directorHours[directorHour].director.name}`,
                              96
                            )}</div>`
                      }
                      </div>
      
                      <p class="profile-username text-center h3">${
                        directorHours[directorHour].director.name
                      }</p>
      
                      <p class="text-center">${
                        directorHours[directorHour].director.position
                      }</p>
      
                      <ul class="list-group list-group-unbordered mb-3 text-center">
                      <li class="list-group-item">
                      <div class="p-1 text-center" style="width: 100%;"><span class="notification badge badge-${theClass}" style="font-size: 1em;" title="${textTitle}">${text1}</span></div>
                      </li>
                      <li class="list-group-item">
                          <strong>${directorHours[directorHour].hours.join(
                            "<br />"
                          )}</strong>
                      </li>
                      </ul>
                    </div>
                  </div>
                </div>`;
                }
              }

              $("#schedule-hours").html(html);
              $("#schedule-hours").unblock();

              directorsCalendarUpdating = false;
            },
            moment().startOf("day"),
            moment().add(7, "days").startOf("day")
          );
        } catch (e) {
          iziToast.show({
            title: "An error occurred - Please check the logs",
            message: "Error occurred during the call of office hours.",
          });
          console.error(e);
        }
      },
      onUnblock: () => {
        directorsCalendarUpdating = false;
      },
    });
  }

  /**
   * Display a modal with more information about the given event, and a chance to subscribe or unsubscribe.
   *
   * @param {string} showID Unique ID of the event to show
   */
  function displayEventInfo(showID) {
    calendardb.getEvents(
      (events) => {
        events = events.filter((event) => event.unique === showID);
        if (events.length === 0) {
          $(document).Toasts("create", {
            class: "bg-danger",
            title: "calendar error",
            subtitle: showID,
            body:
              "There was an error trying to load that event. Please report this to wwsu4@wright.edu.",
            icon: "fas fa-skull-crossbones fa-lg",
          });
          return null;
        }
        var event = events[0];
        viewingEvent = event;
        var colorClass = `secondary`;
        var iconClass = "far fa-calendar-alt";
        var accessibleText = `Event`;

        switch (event.type) {
          case "genre":
          case "playlist":
            colorClass = "primary";
            iconClass = "fas fa-music";
            accessibleText = "Music";
            break;
          case "show":
            colorClass = "danger";
            iconClass = "fas fa-microphone";
            accessibleText = "Live Show";
            break;
          case "sports":
            colorClass = "success";
            iconClass = "fas fa-basketball-ball";
            accessibleText = "Sports Broadcast";
            break;
          case "remote":
            colorClass = "purple";
            iconClass = "fas fa-broadcast-tower";
            accessibleText = "Remote Broadcast";
            break;
          case "prerecord":
            colorClass = "pink";
            iconClass = "fas fa-play-circle";
            accessibleText = "Prerecorded Show";
            break;
        }

        if (
          ["canceled", "canceled-system", "canceled-changed"].indexOf(
            event.scheduleType
          ) !== -1
        ) {
          colorClass = "dark";
        }

        var badgeInfo;
        if (["canceled-changed"].indexOf(event.scheduleType) !== -1) {
          badgeInfo = `<span class="badge-warning" style="font-size: 1em;">RESCHEDULED</span>`;
        }
        if (
          ["updated", "updated-system"].indexOf(event.scheduleType) !== -1 &&
          event.timeChanged
        ) {
          badgeInfo = `<span class="badge badge-warning" style="font-size: 1em;">TEMP TIME CHANGE</span>`;
        }
        if (
          ["canceled", "canceled-system"].indexOf(event.scheduleType) !== -1
        ) {
          badgeInfo = `<span class="badge badge-danger" style="font-size: 1em;">CANCELED</span>`;
        }

        $("#modal-eventinfo-body")
          .html(`<div class="p-2 card card-${colorClass} card-outline">
      <div class="card-body box-profile">
        <div class="text-center">
        ${
          event.logo !== null
            ? `<img class="profile-user-img img-fluid img-circle" src="/uploads/calendar/logo/${event.logo}" alt="Show Logo">`
            : `<i class="profile-user-img img-fluid img-circle ${iconClass} bg-${colorClass}" style="font-size: 5rem;" aria-hidden="true" title="${accessibleText}"></i><span class="sr-only">${accessibleText}</span>`
        }
        </div>

        <p class="profile-username text-center h3">${event.name}</p>

        <p class="text-muted text-center">${event.hosts}</p>

        <ul class="list-group list-group-unbordered mb-3">
        ${
          badgeInfo
            ? `<li class="list-group-item text-center">
        <p><b>${badgeInfo}</b></p>
        ${
          event.scheduleReason !== null
            ? `<p><strong>${event.scheduleReason}</strong></p>`
            : ``
        }
      </li>`
            : ``
        }
        <li class="list-group-item text-center">
            <b>${
              ["canceled", "canceled-system", "canceled-updated"].indexOf(
                event.scheduleType
              ) !== -1
                ? `Original Time: `
                : ``
            }${moment(event.start).format("lll")} - ${moment(event.end).format(
          "hh:mm A"
        )}</b>
        </li>
        <li class="list-group-item">
        ${
          event.banner !== null
            ? `<img class="img-fluid" src="/uploads/calendar/banner/${event.banner}" alt="Show Banner">`
            : ``
        }
        </li>
        <li class="list-group-item">
            ${event.description !== null ? event.description : ``}
        </li>
        </ul>
      </div>
    </div>`);

        // If a device ID was provided from the WWSU mobile app
        if (!notificationsSupported && !isMobile) {
          $("#modal-eventinfo-subscribe-once").css("display", "none");
          $("#modal-eventinfo-unsubscribe").css("display", "");
          $("#modal-eventinfo-subscribe-all").css("display", "none");
          $("#modal-eventinfo-unsubscribe").prop("disabled", true);
          $("#modal-eventinfo-unsubscribe").html(
            `Browser does not support notifications`
          );
        } else if (device !== null) {
          // Determine the types of subscriptions to search for to see if the user is already subscribed to this event.

          // Check the number of subscriptions
          var subscribed = subscriptions.countSubscribed(
            event.unique,
            event.calendarID
          );

          if (subscribed === 0) {
            $("#modal-eventinfo-subscribe-once").css("display", "");
            $("#modal-eventinfo-unsubscribe").css("display", "none");
            $("#modal-eventinfo-subscribe-all").css("display", "");
            $("#modal-eventinfo-subscribe-all").html(`Subscribe All Times`);
            $("#modal-eventinfo-unsubscribe").prop("disabled", false);
            $("#modal-eventinfo-unsubscribe").html(`Unsubscribe All Times`);
          } else {
            $("#modal-eventinfo-subscribe-once").css("display", "none");
            $("#modal-eventinfo-unsubscribe").css("display", "");
            $("#modal-eventinfo-subscribe-all").css("display", "none");
            $("#modal-eventinfo-subscribe-all").html(`Subscribe All Times`);
            $("#modal-eventinfo-unsubscribe").prop("disabled", false);
            $("#modal-eventinfo-unsubscribe").html(`Unsubscribe All Times`);
          }
        } else if (!isMobile) {
          $("#modal-eventinfo-subscribe-once").css("display", "none");
          $("#modal-eventinfo-unsubscribe").css("display", "none");
          $("#modal-eventinfo-subscribe-all").css("display", "");
          $("#modal-eventinfo-subscribe-all").html(`Prompt for Notifications`);
          $("#modal-eventinfo-unsubscribe").prop("disabled", false);
          $("#modal-eventinfo-unsubscribe").html(`Unsubscribe All Times`);

          $(`#modal-eventinfo-subscribe-all`).click((event) => {
            OneSignal.showSlidedownPrompt({ force: true });
            $("#modal-eventinfo").modal("hide");
          });
          $(`#modal-eventinfo-subscribe-all`).keypress((event) => {
            if (event.key === "Enter") {
              OneSignal.showSlidedownPrompt({ force: true });
              $("#modal-eventinfo").modal("hide");
            }
          });
        }

        $("#modal-eventinfo").modal("show");
      },
      undefined,
      moment().add(14, "days")
    );
  }

  /**
   * Subscribe to push notifications for an event.
   *
   * @param {string} type calendar-once for one-time subscription, or calendar-all for permanent subscription.
   * @param {string} subtype event.unique if one-time subscription, or calendarID if permanent subscription.
   */
  function subscribe(type, subtype) {
    subscriptions.subscribe(type, subtype);
  }

  /**
   * Stop receiving push notifications for an event
   *
   * @param {string} ID event.unique to unsubscribe from
   * @param {string} event calendarID to unsubscribe from
   */
  function unsubscribe(ID, event) {
    subscriptions.unsubscribe(ID, event);
  }

  /*
    CHAT FUNCTIONS
*/

  // When a new message is received, process it.
  socket.on("messages", (data) => {
    try {
      for (var key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          switch (key) {
            case "insert":
              addMessage(data[key], firstTime);
              break;
            case "remove":
              removeMessage(data[key]);
              break;
          }
        }
      }
    } catch (unusedE) {}
  });

  /**
   * Updates all new message counts with the number of unread DJ messages
   */
  function updateNewMessages() {
    $(".chat-newmessages").html(newMessages);
    if (newMessages < 1) {
      $(".chat-newmessages").removeClass("bg-danger");
      $(".chat-newmessages").addClass("bg-secondary");
    } else {
      $(".chat-newmessages").addClass("bg-danger");
      $(".chat-newmessages").removeClass("bg-secondary");
    }
  }

  /**
   * Hit the messages endpoint and subscribe to receiving messages.
   */
  function messagesSocket() {
    socket.post("/messages/get-web", {}, function serverResponded(body) {
      //console.log(body);
      try {
        body
          .filter((message) => messageIDs.indexOf(message.ID) === -1)
          .map((message) => addMessage(message, firstTime));
        firstTime = false;
      } catch (e) {
        console.error(e);
        setTimeout(messagesSocket, 10000);
      }
    });
  }

  /**
   * TODO: Process a new message in the chat and notifications.
   *
   * @param {object} data Data object for the message from WWSU
   * @param {boolean} firsttime Whether or not this message was added on initial load (if true, no toast notification will display)
   */
  function addMessage(data, firsttime = false) {
    // Note the ID; used to determine new messages upon reconnection of a socket disconnect
    messageIDs.push(data.ID);

    // Private website message
    if (data.to.startsWith("website-")) {
      $("#chat-messages").append(`<div class="direct-chat-msg" id="msg-${
        data.ID
      }">
        <div class="direct-chat-infos clearfix">
          <span class="direct-chat-name float-left">${
            data.fromFriendly
          } (Private Message)</span>
          <span class="direct-chat-timestamp float-right">${moment(
            data.createdAt
          ).format("hh:mm A")}</span>
        </div>
        <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(
          data.from,
          40
        )}</div>
        <div class="direct-chat-text bg-danger">
            ${data.message}
        </div>
      </div>`);
      if (!firsttime) {
        $(document).Toasts("create", {
          class: "bg-success",
          title: "Private Message from WWSU",
          autohide: true,
          delay: 15000,
          body: data.message,
          icon: "fas fa-comments fa-lg",
        });
      }
      newMessages++;
      updateNewMessages();

      // Public website message for all visitors
    } else if (data.to === "website") {
      $("#chat-messages").append(`<div class="direct-chat-msg" id="msg-${
        data.ID
      }">
        <div class="direct-chat-infos clearfix">
          <span class="direct-chat-name float-left">${data.fromFriendly}</span>
          <span class="direct-chat-timestamp float-right">${moment(
            data.createdAt
          ).format("hh:mm A")}</span>
        </div>
        <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(
          data.from,
          40
        )}</div>
        <div class="direct-chat-text bg-success">
            ${data.message}
        </div>
      </div>`);
      if (!firsttime) {
        $(document).Toasts("create", {
          class: "bg-success",
          title: "Message from WWSU",
          autohide: true,
          delay: 15000,
          body: data.message,
          icon: "fas fa-comments fa-lg",
        });
      }
      newMessages++;
      updateNewMessages();

      // Private message sent from visitor
    } else if (data.to === "DJ-private" && data.from !== client) {
      $("#chat-messages").append(`<div class="direct-chat-msg" id="msg-${
        data.ID
      }">
        <div class="direct-chat-infos clearfix">
          <span class="direct-chat-name float-left">${data.fromFriendly}</span>
          <span class="direct-chat-timestamp float-right">${moment(
            data.createdAt
          ).format("hh:mm A")}</span>
        </div>
        <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(
          data.from,
          40
        )}</div>
        <div class="direct-chat-text bg-secondary">
            ${data.message}
        </div>
      </div>`);
      if (!firsttime) {
        $(document).Toasts("create", {
          class: "bg-success",
          title: "Message",
          subtitle: data.fromFriendly,
          autohide: true,
          delay: 15000,
          body: data.message,
          icon: "fas fa-comments fa-lg",
        });
      }
    } else if (data.from === client) {
      $("#chat-messages").append(`<div class="direct-chat-msg right" id="msg-${
        data.ID
      }">
        <div class="direct-chat-infos clearfix">
          <span class="direct-chat-name float-right">YOU${
            data.to === "DJ-private" ? ` (Private Message)` : ``
          }</span>
          <span class="direct-chat-timestamp float-left">${moment(
            data.createdAt
          ).format("hh:mm A")}</span>
        </div>
        <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(
          data.from,
          40
        )}</div>
        <div class="direct-chat-text bg-success">
            ${data.message}
        </div>
      </div>`);

      // All other messages
    } else {
      $("#chat-messages").append(`<div class="direct-chat-msg" id="msg-${
        data.ID
      }">
        <div class="direct-chat-infos clearfix">
          <span class="direct-chat-name float-left">${data.fromFriendly}</span>
          <span class="direct-chat-timestamp float-right">${moment(
            data.createdAt
          ).format("hh:mm A")}</span>
        </div>
        <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(
          data.from,
          40
        )}</div>
        <div class="direct-chat-text bg-secondary">
            ${data.message}
        </div>
      </div>`);
    }
  }

  /**
   * Remove a message if it exists.
   *
   * @param {number} ID ID of the message to remove.
   */
  function removeMessage(ID) {
    $(`#msg-${ID}`).remove();
  }

  /**
   * Send whatever is in the message box as a message.
   *
   * @param {boolean} privateMsg Is this message to be sent privately?
   */
  function sendMessage(privateMsg = false) {
    if (blocked) {
      return null;
    }
    if ($("#chat-message").val().length < 1) {
      $(document).Toasts("create", {
        class: "bg-warning",
        title: "Message Rejected",
        autohide: true,
        delay: 10000,
        body: "You did not type a message to send.",
        icon: "fas fa-skull-crossbones fa-lg",
      });
      return null;
    }
    socket.post(
      "/messages/send-web",
      {
        message: $("#chat-message").val(),
        nickname: $("#chat-nickname").val(),
        private: privateMsg,
      },
      function serverResponded(response) {
        try {
          if (response !== "OK") {
            $(document).Toasts("create", {
              class: "bg-warning",
              title: "Message Rejected",
              autohide: true,
              delay: 15000,
              body:
                "WWSU rejected your message. This could be because you are sending messages too fast, or you are banned from sending messages.",
              icon: "fas fa-skull-crossbones fa-lg",
            });
            return null;
          }
          $("#chat-message").val("");
        } catch (e) {
          console.error(e);
          $(document).Toasts("create", {
            class: "bg-danger",
            title: "Error sending message",
            body:
              "There was an error sending your message. Please report this to wwsu4@wright.edu.",
            icon: "fas fa-skull-crossbones fa-lg",
          });
        }
      }
    );
  }

  /*
    REQUEST FUNCTIONS
*/

  /**
   * Re-load the available genres to filter by in the track request system.
   */
  function loadGenres() {
    socket.post("/songs/get-genres", {}, function serverResponded(response) {
      try {
        var html = `<option value="0">Any Genre</option>`;
        response.map((subcat) => {
          html += `<option value="${subcat.ID}">${subcat.name}</option>`;
        });
        $("#request-genre").html(html);
      } catch (e) {
        console.error(e);
        $(document).Toasts("create", {
          class: "bg-danger",
          title: "Error loading genres for request system",
          body:
            "There was an error loading the available genres to filter by in the request system. Please report this to wwsu4@wright.edu.",
          icon: "fas fa-skull-crossbones fa-lg",
        });
      }
    });
  }

  /**
   * Load tracks into the track request table.
   *
   * @param {integer} skip Start at the provided track number.
   */
  function loadTracks(skip = skipIt) {
    var query = {
      search: $("#request-name").val(),
      skip: skip,
      limit: 50,
      ignoreDisabled: true,
      ignoreNonMusic: true,
    };
    var selectedOption = $("#request-genre").children("option:selected").val();
    if (selectedOption !== "0") {
      query.genre = parseInt(selectedOption);
    }
    var html = ``;
    socket.post("/songs/get", query, function serverResponded(response) {
      try {
        // response = JSON.parse(response);
        if (response === "false" || !response) {
          skipIt = 0;
          $("#request-more-none").css("display", "");
          $("#request-more").css("display", "none");
        } else if (response.length > 0) {
          skipIt += 50;
          $("#request-more-none").css("display", "none");
          $("#request-more").css("display", "");

          response.map((track) => {
            html += `<tr class="${track.enabled !== 1 ? "bg-dark" : ""}">
            <td>${track.artist} - ${track.title}${
              track.enabled !== 1 ? " (DISABLED)" : ""
            }</td>
            <td>
            ${
              track.enabled === 1
                ? `<button type="button" class="btn btn-success" id="request-track-${
                    track.ID
                  }" title="Get more info, or request, ${wwsuutil.escapeHTML(
                    track.artist
                  )} - ${wwsuutil.escapeHTML(
                    track.title
                  )}}">Info / Request</button>`
                : `<button type="button" class="btn btn-info" id="request-track-${
                    track.ID
                  }" title="Get more info about ${wwsuutil.escapeHTML(
                    track.artist
                  )} - ${wwsuutil.escapeHTML(track.title)}}.">Info</button>`
            }
            </td>
          </tr>`;

            wwsuutil.waitForElement(`#request-track-${track.ID}`, () => {
              $(`#request-track-${track.ID}`).click(() => {
                loadTrackInfo(track.ID);
              });
              $(`#request-track-${track.ID}`).keydown((e) => {
                if (e.code === "Space" || e.code === "Enter")
                  loadTrackInfo(track.ID);
              });
            });
          });

          if (skip === 0) {
            $("#request-table").html(html);
          } else {
            $("#request-table").append(html);
          }
        } else if (response.length === 0) {
          loadTracks(skip + 50);
        }
      } catch (e) {
        console.error(e);
        $(document).Toasts("create", {
          class: "bg-danger",
          title: "Error loading tracks for request system",
          body:
            "There was an error loading the tracks for the request system. Please report this to wwsu4@wright.edu.",
          icon: "fas fa-skull-crossbones fa-lg",
        });
      }
    });
  }

  /**
   * Get more information about a track and display it in a modal.
   *
   * @param {integer} trackID ID of the track to get more information.
   */
  function loadTrackInfo(trackID) {
    socket.post(
      "/songs/get",
      { ID: trackID, ignoreSpins: true },
      function serverResponded(response) {
        try {
          $("#track-info-ID").html(response[0].ID);
          $("#track-info-status").html(
            response[0].enabled === 1 ? "Enabled" : "Disabled"
          );
          document.getElementById("track-info-status").className = `bg-${
            response[0].enabled === 1 ? "success" : "dark"
          }`;
          $("#track-info-artist").html(response[0].artist);
          $("#track-info-title").html(response[0].title);
          $("#track-info-album").html(response[0].album);
          $("#track-info-genre").html(response[0].genre);
          $("#track-info-duration").html(
            moment.duration(response[0].duration, "seconds").format("HH:mm:ss")
          );
          $("#track-info-lastplayed").html(
            moment(response[0].date_played).isAfter("2002-01-01 00:00:01")
              ? moment(response[0].date_played).format("LLLL")
              : "Unknown"
          );
          $("#track-info-limits").html(`<ul>
              ${
                response[0].limit_action > 0 &&
                response[0].count_played < response[0].play_limit
                  ? `<li>Track has ${
                      response[0].play_limit - response[0].count_played
                    } spins left</li>`
                  : ``
              }
              ${
                response[0].limit_action > 0 &&
                response[0].count_played >= response[0].play_limit
                  ? `<li>Track expired (reached spin limit)</li>`
                  : ``
              }
              ${
                moment(response[0].start_date).isAfter()
                  ? `<li>Track cannot be played until ${moment(
                      response[0].start_date
                    ).format("LLLL")}</li>`
                  : ``
              }
              ${
                moment(response[0].end_date).isBefore() &&
                moment(response[0].end_date).isAfter("2002-01-01 00:00:01")
                  ? `<li>Track expired on ${moment(response[0].end_date).format(
                      "LLLL"
                    )}</li>`
                  : ``
              }
              </ul>`);

          if (response[0].request.requestable) {
            $("#track-info-request").html(`<div class="form-group">
                                      <h6>Request this Track</h6>
                                      <label for="track-request-name">Name (optional; displayed when the request plays)</label>
                                      <input type="text" class="form-control" id="track-request-name" tabindex="0">
                                      <label for="track-request-message">Message for the DJ (optional)</label>
                                      <textarea class="form-control" id="track-request-message" rows="2" tabindex="0"></textarea>
                                      </div>                    
                                      <div class="form-group"><button type="submit" id="track-request-submit" class="btn btn-primary" tabindex="0">Place Request</button></div>`);
            wwsuutil.waitForElement(`#track-request-submit`, () => {
              $(`#track-request-submit`).click(() => {
                requestTrack(response[0].ID);
              });
              $(`#track-request-submit`).keydown((e) => {
                if (e.code === "Space" || e.code === "Enter")
                  requestTrack(response[0].ID);
              });
            });
          } else {
            $("#track-info-request")
              .html(`<div class="callout callout-${response[0].request.listDiv}">
                          ${response[0].request.message}
                      </div>`);
          }

          $("#modal-trackinfo").modal("show");
        } catch (e) {
          console.error(e);
          $(document).Toasts("create", {
            class: "bg-danger",
            title: "Error loading track information",
            subtitle: trackID,
            body:
              "There was an error loading track information. Please report this to wwsu4@wright.edu.",
            icon: "fas fa-skull-crossbones fa-lg",
          });
        }
      }
    );
  }

  /**
   * Place a track request to WWSU.
   *
   * @param {integer} trackID ID of the track to request
   */
  function requestTrack(trackID) {
    var data = {
      ID: trackID,
      name: $("#track-request-name").val(),
      message: $("#track-request-message").val(),
    };
    if (device !== null) {
      data.device = device;
    }
    socket.post("/requests/place", data, function serverResponded(response) {
      try {
        if (response.requested) {
          $(document).Toasts("create", {
            class: "bg-success",
            title: "Request Placed",
            subtitle: trackID,
            autohide: true,
            delay: 10000,
            body: `Your request has been placed!`,
            icon: "fas fa-file-audio fa-lg",
          });
        } else {
          $(document).Toasts("create", {
            class: "bg-warning",
            title: "Request was not placed!",
            subtitle: trackID,
            autohide: true,
            delay: 10000,
            body: `WWSU rejected your track request. The track may already be in the queue or might not be requestable at this time.`,
            icon: "fas fa-file-audio fa-lg",
          });
        }
        $("#modal-trackinfo").modal("hide");
      } catch (e) {
        console.error(e);
        $(document).Toasts("create", {
          class: "bg-danger",
          title: "Error placing track request",
          subtitle: trackID,
          body:
            "There was an error placing the track request. Please report this to wwsu4@wright.edu.",
          icon: "fas fa-skull-crossbones fa-lg",
        });
      }
    });
  }

  /*
    ONLINE FUNCTIONS
*/

  /**
   * Register this client as online with WWSU, and get client info.
   *
   * @param {boolean} doOneSignal Should we initialize OneSignal?
   */
  function onlineSocket(doOneSignal = false) {
    socket.post(
      "/recipients/add-web",
      { device: device },
      function serverResponded(body) {
        try {
          try {
            $("#chat-nickname").val(
              body.label.replace("Web ", "").match(/\(([^)]+)\)/)[1]
            );
          } catch (e2) {
            $("#chat-nickname").val(body.label);
          }
          client = body.host;
          onlineSocketDone = true;
          automationpost = ``;
          meta.meta = { webchat: meta.meta.webchat, state: meta.meta.state };
          if (doOneSignal) {
            OneSignal.push(() => {
              OneSignal.init({
                appId: "150c0123-e224-4e5b-a8b2-fc202d78e2f1",
                autoResubscribe: true,
              });

              notificationsSupported = OneSignal.isPushNotificationsSupported();

              OneSignal.isPushNotificationsEnabled().then((isEnabled) => {
                if (isEnabled) {
                  OneSignal.getUserId().then((userId) => {
                    device = userId;
                    onlineSocket();
                  });
                } else {
                  device = null;
                  onlineSocket();
                }
              });

              OneSignal.on(
                "notificationPermissionChange",
                (permissionChange) => {
                  var currentPermission = permissionChange.to;
                  if (currentPermission === "granted" && device === null) {
                    OneSignal.getUserId().then((userId) => {
                      $(document).Toasts("create", {
                        class: "bg-success",
                        title: "Notifications Enabled",
                        autohide: true,
                        delay: 15000,
                        body:
                          "<p>You have granted WWSU permission to send you notifications. Now, you can subscribe to your favorite shows to get notified when they air and when their schedule changes.</p>",
                        icon: "fas fa-bell fa-lg",
                      });
                      device = userId;
                      onlineSocket();
                    });
                  } else if (
                    currentPermission === "denied" &&
                    device !== null
                  ) {
                    $(document).Toasts("create", {
                      class: "bg-success",
                      title: "Notifications Disabled",
                      autohide: true,
                      delay: 15000,
                      body:
                        "<p>You have rejected WWSU permission to send you notifications. You will no longer receive any notifications, including shows you subscribed.</p>",
                      icon: "fas fa-bell-slash fa-lg",
                    });
                    device = null;
                    onlineSocket();
                  }
                }
              );

              // On changes to web notification subscriptions; update subscriptions and device.
              OneSignal.on("subscriptionChange", (isSubscribed) => {
                if (isSubscribed && device === null) {
                  OneSignal.getUserId().then((userId) => {
                    $(document).Toasts("create", {
                      class: "bg-success",
                      title: "Notifications Enabled",
                      autohide: true,
                      delay: 15000,
                      body:
                        "<p>You have granted WWSU permission to send you notifications. Now, you can subscribe to your favorite shows to get notified when they air and when their schedule changes.</p>",
                      icon: "fas fa-bell fa-lg",
                    });
                    device = userId;
                    onlineSocket();
                  });
                } else if (!isSubscribed && device !== null) {
                  $(document).Toasts("create", {
                    class: "bg-success",
                    title: "Notifications Disabled",
                    autohide: true,
                    delay: 15000,
                    body:
                      "<p>You have rejected WWSU permission to send you notifications. You will no longer receive any notifications, including shows you subscribed.</p>",
                    icon: "fas fa-bell-slash fa-lg",
                  });
                  device = null;
                  onlineSocket();
                }
              });
            });
          }
        } catch (e) {
          console.error(e);
          setTimeout(onlineSocket, 10000);
        }
      }
    );

    if (device && device !== null) {
      subscriptions.init(device);
    }

    /* TODO
    var temp = document.querySelector(`#track-info-subscribe`)
    if (temp !== null) {
        if (device === null && !isMobile) {
            temp.style.display = 'block'
        } else {
            temp.style.display = 'none'
        }
    }

    temp = document.querySelector(`#chat-subscribe`)
    if (temp !== null) {
        if (device === null && !isMobile) {
            temp.style.display = 'block'
        } else {
            temp.style.display = 'none'
        }
    }

    temp = document.querySelector(`#show-subscribe-button`)
    var temp2 = document.querySelector(`#show-subscribe-instructions`)
    if (temp !== null) {
        if (notificationsSupported || isMobile) {
            if (device === null && !isMobile) {
                temp.innerHTML = 'Show Prompt'
                temp2.innerHTML = `First, click "Show Prompt" and allow notifications. Then when the button turns to "Subscribe", click it again.`
                temp.onclick = () => OneSignal.showSlidedownPrompt({ force: true })
                temp.onkeydown = () => OneSignal.showSlidedownPrompt({ force: true })
            } else {
                temp.innerHTML = 'Subscribe'
                temp2.innerHTML = `Click "Subscribe" to receive notifications when this show goes on the air.`
                temp.onclick = () => {
                    if (meta.meta.state.startsWith('live_') || meta.meta.state.startsWith('remote_')) {
                        subscribe(`calendar-all`, meta.meta.show)
                    } else if (meta.meta.state.startsWith('sports_') || meta.meta.state.startsWith('sportsremote_')) {
                        subscribe(`calendar-all`, `Sports: ${meta.meta.show}`)
                    }
                }
                temp.onkeydown = () => {
                    if (meta.meta.state.startsWith('live_') || meta.meta.state.startsWith('remote_')) {
                        subscribe(`calendar-all`, meta.meta.show)
                    } else if (meta.meta.state.startsWith('sports_') || meta.meta.state.startsWith('sportsremote_')) {
                        subscribe(`calendar-all`, `Sports: ${meta.meta.show}`)
                    }
                }
            }
        } else {
            temp.innerHTML = 'Not Supported'
            temp2.innerHTML = `Sorry, push notifications are not supported on your browser at this time. Stay tuned as we will be releasing a WWSU Mobile app in the future!`
            temp.onclick = () => { }
            temp.onkeydown = () => { }
        }
    }
    */
  }
});
