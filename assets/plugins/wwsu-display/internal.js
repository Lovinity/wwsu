"use strict";

// TODO: Move burnguard to a WWSU class

// Initialize socket
io.sails.url = "https://server.wwsu1069.org";
let socket = io.sails.connect();

// Add WWSU modules
let wwsumodules = new WWSUmodules(socket);
wwsumodules
  .add("WWSUanimations", WWSUanimations)
  .add(`WWSUutil`, WWSUutil)
  .add("noReq", WWSUreq, { host: `display-internal` })
  .add("WWSUMeta", WWSUMeta)
  .add("WWSUdirectors", WWSUdirectors, { host: `display-internal` })
  .add("WWSUeas", WWSUeas)
  .add("WWSUannouncements", WWSUannouncements, {
    types: ["display-internal", "display-internal-sticky"],
  })
  .add("WWSUcalendar", WWSUcalendar)
  .add("WWSUrecipientsweb", WWSUrecipientsweb)
  .add("WWSUstatus", WWSUstatus)
  .add("WWSUmessagesweb", WWSUmessagesweb);

// Reference modules to variables
let animations = wwsumodules.get("WWSUanimations");
let util = wwsumodules.get("WWSUutil");
let Meta = wwsumodules.get("WWSUMeta");
let noReq = wwsumodules.get("noReq");
let Announcements = wwsumodules.get("WWSUannouncements");
let Directors = wwsumodules.get("WWSUdirectors");
let Calendar = wwsumodules.get("WWSUcalendar");
let Recipients = wwsumodules.get("WWSUrecipientsweb");
let Messages = wwsumodules.get("WWSUmessagesweb");
let Status = wwsumodules.get("WWSUstatus");

// Add event listeners
Status.on("change", "renderer", (db) => processStatus(db.get()));
Directors.on("change", "renderer", () => {
  updateCalendar();
});
Calendar.on("calendarUpdated", "renderer", (data, db) => {
  updateCalendar();
});
Announcements.on("update", "renderer", (data) => {
  WWSUslides.removeSlide(`attn-${data.ID}`);
  createAnnouncement(data);
});
Announcements.on("insert", "renderer", (data) => createAnnouncement(data));
Announcements.on("remove", "renderer", (data) =>
  WWSUslides.removeSlide(`attn-${data}`)
);
Announcements.on("replace", "renderer", (db) => {
  console.dir(db.get());
  // Remove all announcement slides
  WWSUslides.allSlides()
    .filter((slide) => slide.name.startsWith(`attn-`))
    .map((slide) => WWSUslides.removeSlide(slide.name));

  // Add slides for each announcement
  db.each((data) => createAnnouncement(data));
});
Meta.on("newMeta", "renderer", (data) => {
  try {
    for (let key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Do a status update if a state change was returned; this could impact power saving mode
        if (key === "state") {
          processStatus(Status.find());
        }
      }
    }
  } catch (e) {
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message: "Error occurred on meta event.",
    });
    console.error(e);
  }
});
Meta.on("metaTick", "renderer", () => clockTick());

// Assign additional event handlers
socket.on("display-refresh", () => {
  // Reload the display sign when this event is called
  window.location.reload(true);
});

// Display messages sent to the display
Messages.on("insert", "renderer", (data) => {
  iziToast.show({
    title: "Message",
    message: data[key].message,
    timeout: 60000,
    backgroundColor: "#FFF59D",
    color: "#FFF59D",
    progressBarColor: "#FFF59D",
    overlayColor: "rgba(255, 255, 54, 0.1)",
    closeOnClick: true,
    titleSize: "2em",
    messageSize: "1.5em",
    balloon: true,
    zindex: 999,
  });
  sounds.displaymessage.play();
});

// When a socket connection is established
socket.on("connect", () => {
  Recipients.addRecipientDisplay("display-internal", (data, success) => {
    Meta.init();
    Directors.init();
    Calendar.init();
    Status.init();
    Announcements.init();
    Messages.init();
    // Remove the lost connection overlay
    if (disconnected) {
      // noConnection.style.display = "none";
      disconnected = false;
      clearTimeout(restart);
      clearTimeout(slidetimer);
    }
  });
});

// When a socket connection is lost
socket.on("disconnect", () => {
  console.log("Lost connection");
  try {
    socket._raw.io._reconnection = true;
    socket._raw.io._reconnectionAttempts = Infinity;
  } catch (e) {
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message: "Error occurred trying to make socket reconnect indefinitely.",
    });
    console.error(e);
  }
  // Show the lost connection overlay
  if (!disconnected) {
    // noConnection.style.display = "inline";
    disconnected = true;
    processStatus(Status.find());
  }
});

// Sound alerts
let sounds = {
  clockOut: new Howl({ src: ["/sounds/display/clockout.mp3"] }),
  critical: new Howl({ src: ["/sounds/display/critical.mp3"] }),
  disconnected: new Howl({ src: ["/sounds/display/disconnected.mp3"] }),
  warning: new Howl({ src: ["/sounds/display/warning.mp3"] }),
  ping: new Howl({ src: ["/sounds/display/ping.mp3"] }),
  displaymessage: new Howl({ src: ["/sounds/display/displaymessage.mp3"] }),
};

/*
      DEFAULT SLIDES
  */

// Initialize slides manager
WWSUslides = WWSUslides(wwsumodules);

// Director hours
WWSUslides.newSlide({
  name: `hours-directors`,
  label: `Directors`,
  weight: 999999,
  isSticky: false,
  color: `success`,
  active: true,
  transitionIn: `fadeIn`,
  transitionOut: `fadeOut`,
  displayTime: 5,
  fitContent: false,
  html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Directors</h1><div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1"></div><p class="text-white"><span class="m-3"><span class="text-warning">9AM - 5PM</span>: One-time office hours.</span> <span class="m-3"><span class="text-danger"><strike>9AM - 5PM</strike></span>: One-time cancellation.</span><span class="text-white">9AM - 5PM</span>: Regular office hours.</span></p>`,
});

// Assistant Director hours
WWSUslides.newSlide({
  name: `hours-assistants`,
  label: `Assistants`,
  weight: 999998,
  isSticky: false,
  color: `success`,
  active: true,
  transitionIn: `fadeIn`,
  transitionOut: `fadeOut`,
  displayTime: 5,
  fitContent: false,
  html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Assistant Directors</h1><div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1"></div><p class="text-white"><span class="m-3"><span class="text-warning">9AM - 5PM</span>: One-time office hours.</span> <span class="m-3"><span class="text-danger"><strike>9AM - 5PM</strike></span>: One-time cancellation.</span><span class="text-white">9AM - 5PM/span>: Regular office hours.</span></p>`,
});

// System Status
WWSUslides.newSlide({
  name: `system`,
  label: `System`,
  weight: -1000000,
  isSticky: false,
  color: `danger`,
  active: false,
  transitionIn: `fadeIn`,
  transitionOut: `fadeOut`,
  displayTime: 15,
  fitContent: false,
  html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">System Status</h1><div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1"></div>`,
});

// Director auto-clockout message
WWSUslides.newSlide({
  name: `director-clockout`,
  label: `Director Auto Clock Out`,
  weight: 800000,
  isSticky: true,
  color: `danger`,
  active: false,
  transitionIn: `fadeIn`,
  transitionOut: `fadeOut`,
  displayTime: 60,
  fitContent: true,
  html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Automatic Director Clockout at Midnight</h1><span style="color: #FFFFFF;">All directors who are still clocked in must clock out before midnight.<br>Otherwise, the system will automatically clock you out and flag your timesheet.<br>If you are still doing hours, you can clock back in after midnight.</span>`,
});

// Define HTML elements
let statusLine = document.getElementById("status-line");
let flashInterval = null;
let statusMarquee = ``;

// Define other letiables
// LINT says directorpresent is never used. That is a lie.
// eslint-disable-next-line no-unused-lets
let disconnected = true;
let slidetimer = false;
let prevStatus = 5;
let offlineTimer;
let globalStatus = 5;
let officeHoursTimer;
let directorNotify;
let innercontent;

let colors = ["#FF0000", "#00FF00", "#0000FF"];
let color = 0;
let delay = 300000;
let scrollDelay = 15000;

// burnGuard is a periodic line that sweeps across the screen to prevent burn-in. Define / construct it.
let $burnGuard = $("<div>")
  .attr("id", "burnGuard")
  .css({
    "background-color": "rgba(0, 0, 0, 0)",
    width: "10px",
    height: $(document).height() + "px",
    position: "absolute",
    top: "0px",
    left: "0px",
    display: "none",
    "z-index": 9999,
  })
  .appendTo("body");

// This function triggers a burn guard sweep.
function burnGuardAnimate() {
  try {
    color = ++color % 3;
    let rColor = colors[color];
    $burnGuard
      .css({
        left: "0px",
        "background-color": rColor,
      })
      .show()
      .animate(
        {
          left: $(window).width() + "px",
        },
        scrollDelay,
        "linear",
        function () {
          $(this).hide();
        }
      );
    setTimeout(burnGuardAnimate, delay);
  } catch (e) {
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message: "Error occurred during the burnGuardAnimate function.",
    });
    console.error(e);
  }
}

setTimeout(burnGuardAnimate, 5000);

// Define default settings for iziToast (overlaying messages)
iziToast.settings({
  titleColor: "#000000",
  messageColor: "#000000",
  backgroundColor: "rgba(244, 67, 54, 0.8);",
  color: "rgba(244, 67, 54);",
  close: false,
  progressBarColor: "rgba(244, 67, 54, 1)",
  overlay: true,
  overlayColor: "rgba(244, 67, 54, 0.1)",
  zindex: 1000,
  layout: 1,
  closeOnClick: true,
  position: "center",
  timeout: 30000,
});

$.fn.extend({
  // Add an animateCss function to JQuery to trigger an animation of an HTML element with animate.css
  animateCss: function (animationName, callback) {
    let animationEnd = (function (el) {
      let animations = {
        animation: "animationend",
        OAnimation: "oAnimationEnd",
        MozAnimation: "mozAnimationEnd",
        WebkitAnimation: "webkitAnimationEnd",
      };

      for (let t in animations) {
        if (el.style[t] !== undefined) {
          return animations[t];
        }
      }
    })(document.createElement("div"));

    this.addClass("animated " + animationName).one(animationEnd, function () {
      $(this).removeClass("animated " + animationName);

      if (typeof callback === "function") {
        callback();
      }
    });

    return this;
  },
});

// Define a reload timer; terminates if socket connection gets established. This ensures if no connection is made, page will refresh itself to try again.
let restart = setTimeout(() => {
  window.location.reload(true);
}, 15000);

/**
 * Function should be called every second.
 */
function clockTick() {
  // At 11:55PM, display director clock-out message and play message
  if (
    moment.parseZone(Meta.meta.time).hour() === 23 &&
    moment.parseZone(Meta.meta.time).minute() >= 55
  ) {
    if (!directorNotify) {
      directorNotify = true;
      WWSUslides.slide(`director-clockout`).active = true;
      sounds.clockOut.play();
    }
  } else if (directorNotify) {
    WWSUslides.slide(`director-clockout`).active = false;
    directorNotify = false;
  }

  // Refresh hours every midnight
  if (
    moment.parseZone(Meta.meta.time).hour() === 0 &&
    moment.parseZone(Meta.meta.time).minute() === 0 &&
    moment.parseZone(Meta.meta.time).second() < 3
  ) {
    updateCalendar();
  }

  // If status is critical, play ping sound every minute
  if (moment.parseZone(Meta.meta.time).second() === 0 && globalStatus < 2) {
    sounds.ping.play();
  }
}

// Define data-specific functions

/**
 * Process statuses from WWSU.
 *
 * @param {TaffyDB} db All current status records
 */
function processStatus(db) {
  try {
    // These are used for alternating gray shades to make status table easier to read
    let secondRow = false;

    globalStatus = 5;
    statusMarquee = `<div class="row bg-dark-1">
                      <div class="col-3 text-warning">
                      <strong>System</strong>
                      </div>
                      <div class="col-9 text-white">
                      <strong>Information</strong>
                      </div>
                    </div><div class="row ${
                      secondRow ? `bg-dark-3` : `bg-dark-2`
                    }">`;

    // Add status info to table for each status, and determine current global status (worst of all statuses)
    db.forEach((thestatus) => {
      try {
        if (thestatus.status === 5) return; // Skip good statuses
        if (!secondRow) {
          secondRow = true;
        } else {
          secondRow = false;
        }
        statusMarquee += `</div><div class="row ${
          secondRow ? `bg-dark-3` : `bg-dark-2`
        }">`;

        switch (thestatus.status) {
          case 1:
            statusMarquee += `<div class="col-2">
                      <span class="m-1 badge badge-danger">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                      <strong>CRITICAL</strong>: ${thestatus.data}
                      </div>`;
            if (globalStatus > 1) {
              globalStatus = 1;
            }
            break;
          case 2:
            statusMarquee += `<div class="col-2">
                      <span class="m-1 badge badge-urgent">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                      <strong>Urgent</strong>: ${thestatus.data}
                      </div>`;
            if (globalStatus > 2) {
              globalStatus = 2;
            }
            break;
          case 3:
            statusMarquee += `<div class="col-2">
                      <span class="m-1 badge badge-warning">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                      <strong>Warning</strong>: ${thestatus.data}
                      </div>`;
            if (globalStatus > 3) {
              globalStatus = 3;
            }
            break;
          case 4:
            statusMarquee += `<div class="col-2">
                      <span class="m-1 badge badge-info">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                      <strong>Info</strong>: ${thestatus.data}
                      </div>`;
            if (globalStatus > 4) {
              globalStatus = 4;
            }
            break;
          case 5:
            statusMarquee += `<div class="col-2">
                      <span class="m-1 badge badge-success">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                      <strong>Good</strong>: ${thestatus.data}
                      </div>`;
            if (globalStatus > 5) {
              globalStatus = 5;
            }
            break;
          default:
        }
      } catch (e) {
        iziToast.show({
          title: "An error occurred - Please check the logs",
          message: `Error occurred during Status iteration in processStatus call.`,
        });
        console.error(e);
      }
    });

    statusMarquee += `</div>`;

    if (disconnected) {
      globalStatus = 0;
    }

    let status = document.getElementById("status-div");
    let color = "rgba(158, 158, 158, 0.3)";
    clearInterval(flashInterval);

    // Do stuff depending on global status
    switch (globalStatus) {
      case 0:
        color = "rgba(244, 67, 54, 0.5)";
        statusLine.innerHTML =
          "No connection to WWSU! The server might be offline and WWSU not functional";
        if (globalStatus !== prevStatus) {
          offlineTimer = setTimeout(() => {
            sounds.disconnected.play();
          }, 180000);
        }
        // Flash screen for major outages every second
        flashInterval = setInterval(() => {
          $("html, body").css("background-color", "#D32F2F");
          setTimeout(() => {
            $("html, body").css("background-color", "#000000");
          }, 250);
        }, 1000);

        WWSUslides.slide(`system`).isSticky = true;
        WWSUslides.slide(`system`).active = true;
        break;
      case 1:
        color = "rgba(244, 67, 54, 0.5)";
        statusLine.innerHTML =
          "WWSU is critically unstable and is not functioning properly!";
        clearTimeout(offlineTimer);
        if (globalStatus !== prevStatus) {
          sounds.critical.play();
        }
        // Flash screen for major outages every second
        flashInterval = setInterval(() => {
          $("html, body").css("background-color", "#D32F2F");
          setTimeout(() => {
            $("html, body").css("background-color", "#000000");
          }, 250);
        }, 1000);

        WWSUslides.slide(`system`).isSticky = true;
        WWSUslides.slide(`system`).active = true;
        break;
      case 2:
        color = "rgba(245, 124, 0, 0.5)";
        statusLine.innerHTML =
          "WWSU is experiencing issues that may impact operation";
        clearTimeout(offlineTimer);
        if (globalStatus !== prevStatus) {
          sounds.warning.play();
        }
        // Flash screen for partial outages every 5 seconds
        // Flash screen for major outages every second
        flashInterval = setInterval(() => {
          $("html, body").css("background-color", "#FF9800");
          setTimeout(() => {
            $("html, body").css("background-color", "#000000");
          }, 250);
        }, 5000);

        WWSUslides.slide(`system`).isSticky = false;
        WWSUslides.slide(`system`).active = true;
        break;
      case 3:
        statusLine.innerHTML = "WWSU is experiencing minor issues";
        clearTimeout(offlineTimer);
        color = "rgba(251, 192, 45, 0.5)";

        WWSUslides.slide(`system`).isSticky = false;
        WWSUslides.slide(`system`).active = true;
        break;
      case 4:
        statusLine.innerHTML = "WWSU is operational; information available";
        clearTimeout(offlineTimer);
        color = "rgba(18, 129, 147, 0.5)";

        WWSUslides.slide(`system`).isSticky = false;
        WWSUslides.slide(`system`).active = true;
        break;
      case 5:
        statusLine.innerHTML = "WWSU is operational";
        clearTimeout(offlineTimer);
        color = "rgba(76, 175, 80, 0.5)";
        WWSUslides.slide(`system`).active = false;
        WWSUslides.slide(`system`).isSticky = false;
        break;
      default:
        statusLine.innerHTML = "WWSU status is unknown";
        color = "rgba(158, 158, 158, 0.3)";
        WWSUslides.slide(`system`).active = false;
        WWSUslides.slide(`system`).isSticky = false;
    }

    prevStatus = globalStatus;

    status.style.backgroundColor = color;
    status.style.color = "rgba(255, 255, 255, 1)";
    statusLine.style.color = "rgba(255, 255, 255, 1)";

    // Update status html
    WWSUslides.slide(
      `system`
    ).html = `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">System Status</h1><div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1">${statusMarquee}</div>`;
  } catch (e) {
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message: "Error occurred during the call of Status[0].",
    });
    console.error(e);
  }
}

// Update the calendar data
function updateCalendar() {
  // Set / reset 1-second timer so we are not updating on literally every update pushed through sockets
  clearTimeout(officeHoursTimer);
  officeHoursTimer = setTimeout(() => {
    Calendar.getEvents(
      (events) => {
        let directorHours = [];
        let tasks = [];

        directorHours = events
          .filter(
            (event) =>
              ["office-hours"].indexOf(event.type) !== -1 &&
              moment(event.end).add(1, "days").startOf("day").isAfter(moment())
          )
          .sort(
            (a, b) => moment(a.start).valueOf() - moment(b.start).valueOf()
          );

        tasks = events
          .filter(
            (event) =>
              ["tasks"].indexOf(event.type) !== -1 &&
              moment(event.end).add(1, "days").startOf("day").isAfter(moment())
          )
          .sort(
            (a, b) => moment(a.start).valueOf() - moment(b.start).valueOf()
          );

        // Sort director hours by start time
        let compare = function (a, b) {
          try {
            if (moment(a.start).valueOf() < moment(b.start).valueOf()) {
              return -1;
            }
            if (moment(a.start).valueOf() > moment(b.start).valueOf()) {
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

        // Format office hours
        let calendar = {};
        let asstcalendar = {};

        Directors.find({ assistant: false }).forEach((director) => {
          calendar[director.ID] = {};
          calendar[director.ID]["director"] = director;
          calendar[director.ID][0] = ``;
          calendar[director.ID][1] = ``;
          calendar[director.ID][2] = ``;
          calendar[director.ID][3] = ``;
          calendar[director.ID][4] = ``;
          calendar[director.ID][5] = ``;
          calendar[director.ID][6] = ``;
        });

        Directors.find({ assistant: true }).forEach((director) => {
          asstcalendar[director.ID] = {};
          asstcalendar[director.ID]["director"] = director;
          asstcalendar[director.ID][0] = ``;
          asstcalendar[director.ID][1] = ``;
          asstcalendar[director.ID][2] = ``;
          asstcalendar[director.ID][3] = ``;
          asstcalendar[director.ID][4] = ``;
          asstcalendar[director.ID][5] = ``;
          asstcalendar[director.ID][6] = ``;
        });

        directorHours.sort(compare).map((event) => {
          // First, get the director
          let temp = Directors.find({ ID: event.director }, true);

          // No temp record? Exit immediately. Also, default to assistant director = true if it is not provided.
          if (typeof temp === `undefined`) {
            return null;
          }
          let assistant;
          if (typeof temp.assistant !== "undefined") {
            assistant = temp.assistant;
          } else {
            assistant = true;
          }

          // null start or end? Use a default to prevent errors.
          if (!moment(event.start).isValid()) {
            event.start = moment.parseZone(Meta.meta.time).startOf("day");
          }
          if (!moment(event.end).isValid()) {
            event.end = moment
              .parseZone(Meta.meta.time)
              .add(1, "days")
              .startOf("day");
          }

          // Cycle through each day of the week, and add in director hours
          for (let i = 0; i < 7; i++) {
            let looptime = moment
              .parseZone(Meta.meta.time)
              .startOf("day")
              .add(i, "days");
            let looptime2 = moment
              .parseZone(Meta.meta.time)
              .startOf("day")
              .add(i + 1, "days");
            let bg;
            if (
              (moment(event.start).isSameOrAfter(looptime) &&
                moment(event.start).isBefore(looptime2)) ||
              (moment(event.start).isBefore(looptime) &&
                moment(event.end).isAfter(looptime))
            ) {
              event.startT =
                moment(event.start).minutes() === 0
                  ? moment
                      .tz(
                        event.start,
                        Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                      )
                      .format("h")
                  : moment
                      .tz(
                        event.start,
                        Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                      )
                      .format("h:mm");
              if (
                (moment.parseZone(event.start).hours() < 12 &&
                  moment.parseZone(event.end).hours() >= 12) ||
                (moment.parseZone(event.start).hours() >= 12 &&
                  moment.parseZone(event.end).hours() < 12)
              ) {
                event.startT += moment
                  .tz(
                    event.start,
                    Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                  )
                  .format("A");
              }
              event.endT =
                moment.parseZone(event.end).minutes() === 0
                  ? moment
                      .tz(
                        event.end,
                        Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                      )
                      .format("hA")
                  : moment
                      .tz(
                        event.end,
                        Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                      )
                      .format("h:mmA");

              // Update strings if need be, if say, start time was before this day, or end time is after this day.
              if (
                moment(event.end).isAfter(
                  moment
                    .parseZone(Meta.meta.time)
                    .startOf("day")
                    .add(i + 1, "days")
                )
              ) {
                event.endT = moment
                  .tz(
                    event.end,
                    Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                  )
                  .format("MM/DD h:mmA");
              }
              if (
                moment(event.start).isBefore(
                  moment.parseZone(Meta.meta.time).add(i, "days").startOf("day")
                )
              ) {
                event.startT = moment
                  .tz(
                    event.start,
                    Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                  )
                  .format("MM/DD h:mmA");
              }

              let endText = `<span class="text-white${
                moment(Meta.meta.time).isAfter(moment(event.end))
                  ? ` text-muted`
                  : ``
              }">${event.startT} - ${event.endT}</span>`;
              if (
                ["updated", "updated-system"].indexOf(event.scheduleType) !== -1
              ) {
                endText = `<span class="text-warning${
                  moment(Meta.meta.time).isAfter(moment(event.end))
                    ? ` text-muted`
                    : ``
                }">${event.startT} - ${event.endT}</span>`;
              }
              if (
                ["canceled", "canceled-system", "canceled-changed"].indexOf(
                  event.scheduleType
                ) !== -1
              ) {
                endText = `<strike><span class="text-danger">${event.startT} - ${event.endT}</span></strike>`;
              }

              // Push the final products into our formatted letiable
              if (!assistant) {
                calendar[event.director][
                  i
                ] += `<div class="m-1 text-white" style="${
                  bg || ``
                }">${endText}</div>`;
              }
              if (assistant) {
                asstcalendar[event.director][
                  i
                ] += `<div class="m-1 text-white" style="${
                  bg || ``
                }">${endText}</div>`;
              }
            }
          }
        });

        // Director hours slide
        innercontent = ``;

        stuff = `<div class="row shadow-2 bg-dark-1">
     <div class="col-3 text-info">
     <strong>Director</strong>
     </div>
     <div class="col text-info">
     <strong>Today</strong>
     </div>
     <div class="col text-info">
     <strong>${moment
       .parseZone(Meta.meta.time)
       .add(1, "days")
       .format("ddd MM/DD")}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment
       .parseZone(Meta.meta.time)
       .add(2, "days")
       .format("ddd MM/DD")}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment
       .parseZone(Meta.meta.time)
       .add(3, "days")
       .format("ddd MM/DD")}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment
       .parseZone(Meta.meta.time)
       .add(4, "days")
       .format("ddd MM/DD")}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment
       .parseZone(Meta.meta.time)
       .add(5, "days")
       .format("ddd MM/DD")}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment
       .parseZone(Meta.meta.time)
       .add(6, "days")
       .format("ddd MM/DD")}</strong>
     </div>
     </div>`;
        doShade = false;
        isActive = false;
        WWSUslides.slide(`hours-directors`).displayTime = 7;
        for (let director in calendar) {
          if (Object.prototype.hasOwnProperty.call(calendar, director)) {
            isActive = true;
            let temp = calendar[director].director;
            WWSUslides.slide(`hours-directors`).displayTime += 3;
            stuff += `<div class="row shadow-2 ${
              doShade ? `bg-dark-3` : `bg-dark-2`
            }">
     <div class="col-3 shadow-2" style="background-color: ${
       temp.present
         ? temp.present === 2
           ? `rgba(102, 16, 242, 0.25)`
           : `rgba(56, 142, 60, 0.25)`
         : `rgba(211, 47, 47, 0.25)`
     };">
                <div class="container">
  <div class="row">
    <div class="col-4">
                ${
                  temp.avatar && temp.avatar !== ""
                    ? `<img src="${temp.avatar}" width="48" class="rounded-circle">`
                    : jdenticon.toSvg(`Director ${temp.name}`, 48)
                }
    </div>
    <div class="col-8">
      <span class="text-white">${temp.name}</span><br />
      <span class="text-warning" style="font-size: 0.8em;">${
        temp.position
      }</span><br />
      ${
        temp.present
          ? temp.present === 2
            ? `<span class="text-success"><strong>REMOTE</strong></span>`
            : `<span class="text-success"><strong>IN</strong></span>`
          : `<span class="text-danger"><strong>OUT</strong></span>`
      }
    </div>
  </div>
</div>
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${calendar[director][0]}
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${calendar[director][1]}
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${calendar[director][2]}
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${calendar[director][3]}
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${calendar[director][4]}
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${calendar[director][5]}
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${calendar[director][6]}
     </div>
     </div>`;
            if (doShade) {
              doShade = false;
            } else {
              doShade = true;
            }
          }
        }

        WWSUslides.slide(`hours-directors`).active = isActive;
        WWSUslides.slide(
          `hours-directors`
        ).html = `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Directors</h1><div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1">${stuff}</div><p class="text-white"><span class="m-3"><span class="text-warning">9AM - 5PM</span>: One-time office hours.</span> <span class="m-3"><span class="text-danger"><strike>9AM - 5PM</strike></span>: One-time cancellation.</span><span class="text-white">9AM - 5PM</span>: Regular office hours.</span></p>`;

        // Assistant hours slide
        innercontent = ``;

        stuff = `<div class="row shadow-2 bg-dark-1">
     <div class="col-3 text-info">
     <strong>Director</strong>
     </div>
     <div class="col text-info">
     <strong>Today</strong>
     </div>
     <div class="col text-info">
     <strong>${moment
       .parseZone(Meta.meta.time)
       .add(1, "days")
       .format("ddd MM/DD")}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment
       .parseZone(Meta.meta.time)
       .add(2, "days")
       .format("ddd MM/DD")}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment
       .parseZone(Meta.meta.time)
       .add(3, "days")
       .format("ddd MM/DD")}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment
       .parseZone(Meta.meta.time)
       .add(4, "days")
       .format("ddd MM/DD")}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment
       .parseZone(Meta.meta.time)
       .add(5, "days")
       .format("ddd MM/DD")}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment
       .parseZone(Meta.meta.time)
       .add(6, "days")
       .format("ddd MM/DD")}</strong>
     </div>
     </div>`;
        doShade = false;
        isActive = false;
        WWSUslides.slide(`hours-assistants`).displayTime = 7;
        for (let director2 in asstcalendar) {
          if (Object.prototype.hasOwnProperty.call(asstcalendar, director2)) {
            isActive = true;
            let temp2 = asstcalendar[director2].director;
            WWSUslides.slide(`hours-assistants`).displayTime += 3;
            stuff += `<div class="row shadow-2 ${
              doShade ? `bg-dark-3` : `bg-dark-2`
            }">
     <div class="col-3 shadow-2" style="background-color: ${
       temp2.present
         ? temp2.present === 2
           ? `rgba(102, 16, 242, 0.25)`
           : `rgba(56, 142, 60, 0.25)`
         : `rgba(211, 47, 47, 0.25)`
     };">
                <div class="container">
  <div class="row">
    <div class="col-4">
                ${
                  temp2.avatar && temp2.avatar !== ""
                    ? `<img src="${temp2.avatar}" width="48" class="rounded-circle">`
                    : jdenticon.toSvg(`Director ${temp2.name}`, 48)
                }
    </div>
    <div class="col-8">
      <span class="text-white">${temp2.name}</span><br />
      <span class="text-warning" style="font-size: 0.8em;">${
        temp2.position
      }</span><br />
      ${
        temp2.present
          ? temp2.present === 2
            ? `<span class="text-success"><strong>REMOTE</strong></span>`
            : `<span class="text-success"><strong>IN</strong></span>`
          : `<span class="text-danger"><strong>OUT</strong></span>`
      }
    </div>
  </div>
</div>
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${asstcalendar[director2][0]}
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${asstcalendar[director2][1]}
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${asstcalendar[director2][2]}
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${asstcalendar[director2][3]}
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${asstcalendar[director2][4]}
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${asstcalendar[director2][5]}
     </div>
     <div class="col" style="font-size: 0.75em;">
     ${asstcalendar[director2][6]}
     </div>
     </div>`;
            if (doShade) {
              doShade = false;
            } else {
              doShade = true;
            }
          }
        }

        WWSUslides.slide(`hours-assistants`).active = isActive;
        WWSUslides.slide(
          `hours-assistants`
        ).html = `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Assistant Directors</h1><div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1">${stuff}</div><p class="text-white"><span class="m-3"><span class="text-warning">9AM - 5PM</span>: One-time office hours.</span> <span class="m-3"><span class="text-danger"><strike>9AM - 5PM</strike></span>: One-time cancellation.</span><span class="text-white">9AM - 5PM</span>: Regular office hours.</span></p>`;
      },
      undefined,
      moment
        .parseZone(Meta.meta ? Meta.meta.time : undefined)
        .add(7, "days")
        .toISOString(true)
    );
  }, 1000);
}

// Add a slide for an announcement
function createAnnouncement(data) {
  if (data.type.startsWith(`display-internal`)) {
    WWSUslides.newSlide({
      name: `attn-${data.ID}`,
      label: data.title,
      weight: 0,
      isSticky: data.type === `display-internal-sticky`,
      color: data.level,
      active: true,
      starts: moment(data.starts),
      expires: moment(data.expires),
      transitionIn: `fadeIn`,
      transitionOut: `fadeOut`,
      displayTime: data.displayTime || 15,
      fitContent: true,
      html: `<div style="overflow-y: hidden; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" class="text-white" id="content-attn-${data.ID}">${data.announcement}</div>`,
    });
  }
}
