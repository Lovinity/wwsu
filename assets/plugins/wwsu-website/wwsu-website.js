"use strict";

// Initialize sails.js socket connection to WWSU
io.sails.url = "https://server.wwsu1069.org";
let socket = io.sails.connect();

let machineID = null;

// Add WWSU modules
let wwsumodules = new WWSUmodules(socket);
wwsumodules
  .add("WWSUanimations", WWSUanimations)
  .add(`WWSUutil`, WWSUutil)
  .add("WWSUNavigation", WWSUNavigation)
  .add("noReq", WWSUreq, { host: null })
  .add("WWSUMeta", WWSUMeta)
  .add("WWSUdirectors", WWSUdirectors, { host: machineID })
  .add("WWSUeas", WWSUeas)
  .add("WWSUannouncements", WWSUannouncements, {
    types: [
      "website-toast",
      "website-nowplaying",
      "website-chat",
      "website-schedule",
      "website-request",
      "website-directors"
    ]
  })
  .add("WWSUcalendar", WWSUcalendar)
  .add("WWSUsubscriptions", WWSUsubscriptions)
  .add("WWSUdiscipline", WWSUdiscipline)
  .add("WWSUrecipientsweb", WWSUrecipientsweb)
  .add("WWSUrequestsweb", WWSUrequestsweb)
  .add("WWSUsongs", WWSUsongs)
  .add("WWSUmessagesweb", WWSUmessagesweb)
  .add("WWSUlikedtracks", WWSUlikedtracks);

// Reference modules to variables
var navigation = wwsumodules.get("WWSUNavigation"); // Navigation must be global so it can be accessed by other ejs scripts

let animations = wwsumodules.get("WWSUanimations");
let util = wwsumodules.get("WWSUutil");
let meta = wwsumodules.get("WWSUMeta");
let noReq = wwsumodules.get("noReq");
let eas = wwsumodules.get("WWSUeas");
let announcements = wwsumodules.get("WWSUannouncements");
let directors = wwsumodules.get("WWSUdirectors");
let calendar = wwsumodules.get("WWSUcalendar");
let subscriptions = wwsumodules.get("WWSUsubscriptions");
let discipline = wwsumodules.get("WWSUdiscipline");
let recipients = wwsumodules.get("WWSUrecipientsweb");
let requests = wwsumodules.get("WWSUrequestsweb");
let songs = wwsumodules.get("WWSUsongs");
let messages = wwsumodules.get("WWSUmessagesweb");
let likedtracks = wwsumodules.get("WWSUlikedtracks");

// Liked Tracks
likedtracks.on("init", "renderer", () => {
  meta.meta = { history: meta.meta.history }; // Call newMeta
});
likedtracks.on("likedTrack", "renderer", () => {
  meta.meta = { history: meta.meta.history }; // Call newMeta
});
likedtracks.on("likedTrackManual", "renderer", () => {
  meta.meta = { history: meta.meta.history }; // Call newMeta
});
likedtracks.initTable(`#section-nowplaying-history`);

// Announcements
let announcementsToastIDs = [];
announcements.on("change", "renderer", db => {
  processAnnouncements();
});

// Requests
requests.initTable(
  "#request-table",
  "#request-name",
  "#request-genre",
  "#request-search",
  "#request-more"
);

// EAS
eas.on("newAlert", "renderer", record => {
  $(document).Toasts("create", {
    class: `bg-${record.severity === "Extreme" ? `danger` : `warning`}`,
    title: record.alert,
    subtitle: record.counties,
    autohide: true,
    delay: 30000,
    body: `A ${
      record.alert
    } is in effect for the WWSU listening area counties of ${
      record.counties
    }, from ${moment
      .tz(record.starts, meta.meta ? meta.meta.timezone : moment.tz.guess())
      .format("lll")} to ${moment
      .tz(record.expires, meta.meta ? meta.meta.timezone : moment.tz.guess())
      .format("lll")} (station time).`,
    icon: "fas fa-bolt fa-lg"
  });
});

// Directors
let directorHours = {};

/*
    CALENDAR / SCHEDULE FUNCTIONS
*/

calendar.on("calendarUpdated", "renderer", db => {
  updateCalendar();
  updateDirectorsCalendar();
});
directors.on("change", "renderer", () => {
  updateDirectorsCalendar();
});

// Operation Variables
var firstTime = true;
let messageIDs = [];
let newMessages = 0;
let automationpost = ``;
let blocked = false;
let skipIt = 0;
let viewingEvent = {};

// oneSignal Variables
let onlineSocketDone = false;
let device = util.getUrlParameter(`device`);
let isMobile = device !== null;
let notificationsSupported = false;

// Initialize the web player
if (document.querySelector("#single-song-player")) {
  Amplitude.init({
    songs: [
      {
        url: "https://server.wwsu1069.org/stream",
        live: true
      }
    ]
  });
}

// Initialize menu items
navigation
  .addItem(
    "#nav-nowplaying",
    "#section-nowplaying",
    "Now Playing - WWSU 106.9 FM Listener's Corner",
    "/",
    true
  )
  .addItem(
    "#nav-chat",
    "#section-chat",
    "Chat with DJ - WWSU 106.9 FM Listener's Corner",
    "/chat",
    false
  )
  .addItem(
    "#nav-discord",
    "#section-discord",
    "WWSU Discord - WWSU 106.9 FM Listener's Corner",
    "/discord",
    false
  )
  .addItem(
    "#nav-schedule",
    "#section-schedule",
    "Schedule - WWSU 106.9 FM Listener's Corner",
    "/schedule",
    false,
    () => {
      updateCalendar();
    }
  )
  .addItem(
    "#nav-hours",
    "#section-hours",
    "Office Hours - WWSU 106.9 FM Listener's Corner",
    "/hours",
    false,
    () => {
      updateDirectorsCalendar();
    }
  )
  .addItem(
    "#nav-request",
    "#section-request",
    "Track Requests - WWSU 106.9 FM Listener's Corner",
    "/request",
    false
  );

// Add click events for subscription buttons
/*
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
*/

// Others
$(`#schedule-select`).change(() => {
  updateCalendar();
});

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
    discipline.checkDiscipline(() => {
      meta.init();
      likedtracks.init();
      announcements.init();
      directors.init();
      calendar.init();
      eas.init();
      messages.init();
      loadGenres();
      onlineSocket();
    });
    // web devices without device parameter, connect to OneSignal first and get the ID, then start sockets.
  } else {
    // OneSignal = window.OneSignal || [];
    discipline.checkDiscipline(() => {
      meta.init();
      likedtracks.init();
      announcements.init();
      directors.init();
      calendar.init();
      eas.init();
      messages.init();
      loadGenres();
      onlineSocket(true);
    });
  }
}

/*
    META FUNCTIONS
*/

meta.on("newMeta", "renderer", (response, _meta) => {
  try {
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
              ? `<img class="profile-user-img img-fluid img-circle bg-pink" src="/uploads/calendar/logo/${_meta.showLogo}" alt="Show Logo">`
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
        _meta.state.startsWith("automation_") &&
        [
          "automation_on",
          "automation_break",
          "automation_genre",
          "automation_playlist"
        ].indexOf(_meta.state) === -1
      ) {
        $(".nowplaying-icon").html(
          `<i class="profile-user-img img-fluid img-circle fas fa-music bg-orange" aria-hidden="true" title="Broadcast about to start"></i><span class="sr-only">Broadcast about to start</span>`
        );
      }
      if (
        ["automation_on", "automation_break", "unknown"].indexOf(
          _meta.state
        ) !== -1
      ) {
        $(".nowplaying-icon").html(
          `<i class="profile-user-img img-fluid img-circle fas fa-music bg-secondary" aria-hidden="true" title="Music"></i><span class="sr-only">Music</span>`
        );
      }
      if (_meta.state === "automation_playlist") {
        $(".nowplaying-icon").html(
          `<i class="profile-user-img img-fluid img-circle fas fa-music bg-primary" aria-hidden="true" title="Music playlist"></i><span class="sr-only">Music playlist</span>`
        );
      }
      if (_meta.state === "automation_genre") {
        $(".nowplaying-icon").html(
          `<i class="profile-user-img img-fluid img-circle fas fa-music bg-info" aria-hidden="true" title="Music genre"></i><span class="sr-only">Music genre</span>`
        );
      }

      // Update now playing text
      $(".nowplaying-line1").html(_meta.line1);
      $(".nowplaying-line2").html(_meta.line2);
      $(".nowplaying-topic").html(_meta.topic);
    }
  } catch (e) {
    console.error(e);
  }
});

meta.on("metaTick", "renderer", meta => {
  if (moment(meta.time).seconds() === 0) {
    checkCalendarChanges();
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
    directors: ``
  };
  announcements.db().each(announcement => {
    if (
      moment(meta.meta.time).isAfter(moment(announcement.starts)) &&
      moment(meta.meta.time).isBefore(moment(announcement.expires))
    ) {
      if (announcement.type.startsWith("website-")) {
        let type = announcement.type.replace("website-", "");
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
            icon: "fas fa-bullhorn fa-lg"
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

/**
 * Re-process calendar events
 */
let calendarUpdating = false;
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
      calendar.getEvents(
        events => {
          var html = "";

          // Run through every event in memory and add appropriate ones into our formatted calendar variable.
          events
            .filter(
              event =>
                [
                  "event",
                  "onair-booking",
                  "prod-booking",
                  "office-hours"
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
            .map(event => {
              try {
                var colorClass = `secondary`;
                var iconClass = "far fa-calendar-alt";
                var accessibleText = "Event";

                switch (event.type) {
                  case "genre":
                    colorClass = "info";
                    iconClass = "fas fa-music";
                    accessibleText = "Music";
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
                    colorClass = "indigo";
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
                  badgeInfo = `<span class="badge badge-warning" style="font-size: 1em;">RESCHEDULED</span>`;
                }
                if (
                  ["updated", "updated-system"].indexOf(event.scheduleType) !==
                    -1 &&
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
    
                    <a href="#" class="btn btn-primary btn-block button-event-info" tabindex="0" title="Click to view more information about this event and to subscribe or unsubscribe from push notifications." data-id="${
                      event.unique
                    }"><b>More Info / Notifications</b></a>
                  </div>
                </div>
              </div>`;
              } catch (e) {
                console.error(e);
                $(document).Toasts("create", {
                  class: "bg-danger",
                  title: "calendar error",
                  body:
                    "There was an error in the updateCalendar function, event mapping. Please report this to wwsu4@wright.edu.",
                  icon: "fas fa-skull-crossbones fa-lg"
                });
              }
            });

          $("#schedule-events").html(html);
          $("#schedule-events").unblock();

          window.requestAnimationFrame(() => {
            $(`.button-event-info`)
              .unbind("click")
              .click(e => {
                console.log(
                  `Getting more info for event ${$(e.currentTarget).data("id")}`
                );
                displayEventInfo($(e.currentTarget).data("id"));
              });
            $(`.button-event-info`)
              .unbind("keydown")
              .keydown(e => {
                if (e.code === "Space" || e.code === "Enter")
                  displayEventInfo($(e.currentTarget).data("id"));
              });
          });

          checkCalendarChanges();

          calendarUpdating = false;
        },
        moment()
          .add(selectedOption, "days")
          .startOf("day"),
        moment()
          .add(selectedOption + 1, "days")
          .startOf("day")
      );
    },
    onUnblock: () => {
      calendarUpdating = false;
    }
  });
}

/**
 * Update director office hours
 */
let directorsCalendarUpdating = false;
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

        directors.db().each(director => {
          directorHours[director.ID] = { director: director, hours: [] };
        });

        // A list of Office Hours for the directors

        // Define a comparison function that will order calendar events by start time when we run the iteration
        var compare = function(a, b) {
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
            $(document).Toasts("create", {
              class: "bg-danger",
              title: "Calendar sort error",
              subtitle: trackID,
              autohide: true,
              delay: 10000,
              body: `There was a problem in the calendar sort function. Please report this to the engineer at wwsu4@wright.edu.`
            });
          }
        };
        calendar.getEvents(
          events => {
            events
              .sort(compare)
              .filter(event => event.type === "office-hours")
              .map(event => {
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
                    moment(event.start)
                      .startOf("day")
                      .add(1, "days")
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
                if (directorHours[directorHour].director.present === 1) {
                  text1 = "IN OFFICE";
                  textTitle = "This director is currently in the WWSU office.";
                  theClass = "success";
                } else if (directorHours[directorHour].director.present === 2) {
                  text1 = "IN REMOTE";
                  textTitle = "This director is currently working remotely.";
                  theClass = "indigo";
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
          moment()
            .add(7, "days")
            .startOf("day")
        );
      } catch (e) {
        console.error(e);
        $(document).Toasts("create", {
          class: "bg-danger",
          title: "Directors Calendar Error",
          subtitle: trackID,
          autohide: true,
          delay: 10000,
          body: `There was a problem loading director office hours. Please report this to the engineer at wwsu4@wright.edu.`
        });
      }
    },
    onUnblock: () => {
      directorsCalendarUpdating = false;
    }
  });
}

/**
 * Check for, and display on now playing page, event re-schedules and cancellations that take place right now.
 */
function checkCalendarChanges() {
  calendar.whatShouldBePlaying(
    events => {
      let aHTML = ``;
      events
        .filter(
          event =>
            [
              "canceled",
              "canceled-system",
              "canceled-changed",
              "updated",
              "updated-system"
            ].indexOf(event.scheduleType) !== -1
        )
        .map(event => {
          if (
            ["canceled", "canceled-system"].indexOf(event.scheduleType) !== -1
          ) {
            aHTML += `<div class="alert alert-danger">
        <p class="h5">CANCELED: ${event.hosts} - ${event.name}</p>
        <p>Are you here for ${event.hosts} - ${
              event.name
            }? This broadcast was canceled for ${moment
              .tz(
                event.originalTime,
                meta.timezone ? meta.timezone : moment.tz.guess()
              )
              .format("LLL Z")}.</p>
        <p>Reason for cancellation (if specified): ${event.scheduleReason}</p>
      </div>`;
          } else if (event.scheduleType === "canceled-changed") {
            aHTML += `<div class="alert alert-warning">
        <p class="h5">RE-SCHEDULED: ${event.hosts} - ${event.name}</p>
        <p>Are you here for ${event.hosts} - ${event.name} on ${moment
              .tz(
                event.start,
                meta.timezone ? meta.timezone : moment.tz.guess()
              )
              .format("LLL Z")}? ${event.scheduleReason}</p>
      </div>`;
          } else if (
            ["updated", "updated-system"].indexOf(event.scheduleType) &&
            event.originalDuration &&
            event.originalDuration !== event.duration
          ) {
            aHTML += `<div class="alert alert-info">
            <p class="h5">END TIME CHANGED: ${event.hosts} - ${event.name}</p>
            <p>Are you here for ${event.hosts} - ${event.name} on ${moment
              .tz(
                event.originalTime,
                meta.timezone ? meta.timezone : moment.tz.guess()
              )
              .format("LLL")} ? The broadcast will end at ${moment
              .tz(
                event.start,
                meta.timezone ? meta.timezone : moment.tz.guess()
              )
              .add(event.duration, "minutes")
              .format("LT")} instead of its originally scheduled end time.</p>
            <p>Reason for change (if specified): ${event.scheduleReason}</p>
          </div>`;
          }
        });

      $(".announcements-calendar").html(aHTML);
    },
    false,
    true
  );
}

/**
 * Display a modal with more information about the given event, and a chance to subscribe or unsubscribe.
 *
 * @param {string} showID Unique ID of the event to show
 */
function displayEventInfo(showID) {
  calendar.getEvents(
    events => {
      let event = events.find(event => event.unique === showID);
      if (!event) {
        $(document).Toasts("create", {
          class: "bg-danger",
          title: "calendar error",
          subtitle: showID,
          autohide: true,
          delay: 15000,
          body:
            "There was an error trying to load that event. Please report this to wwsu4@wright.edu.",
          icon: "fas fa-skull-crossbones fa-lg"
        });
        return null;
      }

      calendar.eventModal.body = calendar.generateFullEventCard(event); // TODO: Not entirely accurate. Find a more effective means than displayEventInfo.
      calendar.eventModal.iziModal("open");
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
    REQUEST FUNCTIONS
*/

/**
 * Re-load the available genres to filter by in the track request system.
 */
function loadGenres() {
  songs.getGenres({}, response => {
    try {
      var html = `<option value="0">Any Genre</option>`;
      response.map(subcat => {
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
        icon: "fas fa-skull-crossbones fa-lg"
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
  recipients.addRecipientWeb(device, data => {
    try {
      try {
        // Discord iframe
        $("#section-discord-iframe").attr(
          "src",
          `https://titanembeds.com/embed/742819639096246383?defaultchannel=782073518606647297&theme=DiscordDark&username=${data.label
            .replace("Web ", "")
            .match(/\(([^)]+)\)/)[1]
            .replace(/[^a-zA-Z0-9\d\-_\s]+/gi, "")
            .substring(0, 32)}`
        );
      } catch (e2) {}

      // Initialize Messages
      messages.initComponents(
        ".chat-status",
        ".chat-messages",
        ".chat-form",
        ".chat-new-messages",
        ".chat-messages-icon"
      );

      onlineSocketDone = true;
      automationpost = ``;
      meta.meta = { webchat: meta.meta.webchat, state: meta.meta.state };
      /*
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

          OneSignal.on("notificationPermissionChange", (permissionChange) => {
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
            } else if (currentPermission === "denied" && device !== null) {
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
      */
    } catch (e) {
      console.error(e);
      setTimeout(onlineSocket, 10000);
    }
  });

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
