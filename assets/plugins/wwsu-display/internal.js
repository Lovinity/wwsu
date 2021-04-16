"use strict";

// TODO: Move burnguard to a WWSU class

// Initialize socket
io.sails.url = "https://server.wwsu1069.org";
let socket = io.sails.connect();

// DEPRECATED
let isLightTheme = false;

// Define hexrgb constants
let hexChars = "a-f\\d";
let match3or4Hex = `#?[${hexChars}]{3}[${hexChars}]?`;
let match6or8Hex = `#?[${hexChars}]{6}([${hexChars}]{2})?`;
let nonHexChars = new RegExp(`[^#${hexChars}]`, "gi");
let validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, "i");

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
    types: ["display-internal", "display-internal-sticky"]
  })
  .add("WWSUcalendar", WWSUcalendar)
  .add("WWSUrecipientsweb", WWSUrecipientsweb)
  .add("WWSUstatus", WWSUstatus)
  .add("WWSUshootout", WWSUshootout)
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
let Eas = wwsumodules.get("WWSUeas");
let Shootout = wwsumodules.get("WWSUshootout");

// Add event listeners
Eas.on("newAlert", "renderer", record => {
  newEas.push(record);
  if (record.severity === "Extreme") easExtreme = true;
  doEas();
});
Eas.on("change", "renderer", db => processEas(db));
Status.on("change", "renderer", db => processStatus(db.get()));
Directors.on("change", "renderer", () => {
  updateCalendar();
});
Calendar.on("calendarUpdated", "renderer", (data, db) => {
  updateCalendar();
});
Announcements.on("update", "renderer", data => {
  WWSUslides.removeSlide(`attn-${data.ID}`);
  createAnnouncement(data);
});
Announcements.on("insert", "renderer", data => createAnnouncement(data));
Announcements.on("remove", "renderer", data =>
  WWSUslides.removeSlide(`attn-${data}`)
);
Announcements.on("replace", "renderer", db => {
  console.dir(db.get());
  // Remove all announcement slides
  WWSUslides.allSlides()
    .filter(slide => slide.name.startsWith(`attn-`))
    .map(slide => WWSUslides.removeSlide(slide.name));

  // Add slides for each announcement
  db.each(data => createAnnouncement(data));
});
Meta.on("newMeta", "renderer", data => {
  processNowPlaying(data);

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
      message: "Error occurred on meta event."
    });
    console.error(e);
  }
});
Meta.on("metaTick", "renderer", () => {
  clockTick();
  processNowPlaying({});
});

// Assign additional event handlers
socket.on("display-refresh", () => {
  // Reload the display sign when this event is called
  window.location.reload(true);
});

// Display messages sent to the display
Messages.on("insert", "renderer", data => {
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
    zindex: 999
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
    Eas.init();
    Shootout.init();
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
      message: "Error occurred trying to make socket reconnect indefinitely."
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
  // Director auto clockout warning
  clockOut: new Howl({ src: ["/sounds/display/clockout.mp3"] }),

  // Statuses
  critical: new Howl({ src: ["/sounds/display/critical.mp3"] }),
  disconnected: new Howl({ src: ["/sounds/display/disconnected.mp3"] }),
  warning: new Howl({ src: ["/sounds/display/warning.mp3"] }),
  ping: new Howl({ src: ["/sounds/display/ping.mp3"] }),

  // Message sent
  displaymessage: new Howl({ src: ["/sounds/display/displaymessage.mp3"] }),

  // EAS
  lifethreatening: new Howl({
    src: ["/sounds/display/lifethreatening.mp3"]
  }),
  severeeas: new Howl({ src: ["/sounds/display/severeeas.mp3"] }),

  // Notices for broadcasts going on the air
  live: new Howl({ src: ["/sounds/display/live.mp3"] }),
  remote: new Howl({ src: ["/sounds/display/remote.mp3"] }),
  sports: new Howl({ src: ["/sounds/display/sports.mp3"] }),

  // Shootout scoreboard
  point1: new Howl({ src: ["/sounds/display/shootout/1point.mp3"] }),
  point2: new Howl({ src: ["/sounds/display/shootout/2points.mp3"] }),
  point3: new Howl({ src: ["/sounds/display/shootout/3points.mp3"] }),
  beat: new Howl({ src: ["/sounds/display/shootout/beat.mp3"] }),
  begin: new Howl({ src: ["/sounds/display/shootout/begin.mp3"] }),
  buzzer: new Howl({ src: ["/sounds/display/shootout/buzzer.mp3"] }),
  countdown: new Howl({ src: ["/sounds/display/shootout/countdown.mp3"] }),
  whistle: new Howl({ src: ["/sounds/display/shootout/whistle.mp3"] }),
  shortbuzz: new Howl({ src: ["/sounds/display/shootout/shortbuzz.mp3"] })
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
  html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Directors</h1><div style="overflow-y: hidden; overflow-x: hidden; font-size: 1.75vh;" class="container-full p-2 m-1"></div><p class="text-white"><span class="m-3"><span class="text-warning">9AM - 5PM</span>: One-time office hours.</span> <span class="m-3"><span class="text-danger"><strike>9AM - 5PM</strike></span>: One-time cancellation.</span><span class="text-white">9AM - 5PM</span>: Regular office hours.</span></p>`
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
  html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Assistant Directors</h1><div style="overflow-y: hidden; overflow-x: hidden; font-size: 1.75vh;" class="container-full p-2 m-1"></div><p class="text-white"><span class="m-3"><span class="text-warning">9AM - 5PM</span>: One-time office hours.</span> <span class="m-3"><span class="text-danger"><strike>9AM - 5PM</strike></span>: One-time cancellation.</span><span class="text-white">9AM - 5PM/span>: Regular office hours.</span></p>`
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
  html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">System Status</h1><div style="overflow-y: hidden; overflow-x: hidden; font-size: 1.75vh;" class="container-full p-2 m-1"></div>`
});

// Shootout scoreboard
WWSUslides.newSlide({
  name: `shootout`,
  label: `Shootout`,
  weight: -2000000,
  isSticky: true,
  color: `success`,
  active: false,
  transitionIn: `fadeIn`,
  transitionOut: `fadeOut`,
  displayTime: 15,
  fitContent: false,
  html: `<div class="text-white">
  
  <div style="font-size: 8vh; text-align: center;">
  Basketball Shootout
</div>

<div class="container-full" style="font-size: 8vh; text-align: center;">
  <div class="row">
    <div class="col-6">
      Round: <span class="shootout-round">0</span>
    </div>
    <div class="col-6">
      Time: <span class="shootout-time">0:00.0</span>
    </div>
  </div>
</div>

<div class="container" style="font-size: 8vh;">

  <div class="row p-1 shootout-player1 shadow-2 d-none">
    <div class="col-10 shootout-name1 bg-dark">
      Jon Doe
    </div>
    <div class="col-2 shootout-score1 bg-secondary" style="text-align: center;">
      0
    </div>
  </div>

  <div class="row p-1 shootout-player2 shadow-2 d-none">
    <div class="col-10 shootout-name2 bg-dark">
      Jon Doe
    </div>
    <div class="col-2 shootout-score2 bg-secondary" style="text-align: center;">
      0
    </div>
  </div>

  <div class="row p-1 shootout-player3 shadow-2 d-none">
    <div class="col-10 shootout-name3 bg-dark">
      Jon Doe
    </div>
    <div class="col-2 shootout-score3 bg-secondary" style="text-align: center;">
      0
    </div>
  </div>

  <div class="row  p-1 shootout-player4 shadow-2 d-none">
    <div class="col-10 shootout-name1 bg-dark">
      Jon Doe
    </div>
    <div class="col-2 shootout-score1 bg-secondary" style="text-align: center;">
      0
    </div>
  </div>
</div>

</div>`
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
  html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Automatic Director Clockout at Midnight</h1><span style="color: #FFFFFF;">All directors who are still clocked in must clock out before midnight.<br>Otherwise, the system will automatically clock you out and flag your timesheet.<br>If you are still doing hours, you can clock back in after midnight.</span>`
});

// Weather alerts
WWSUslides.newSlide({
  name: `eas-alerts`,
  label: `EAS Alerts`,
  weight: -800000,
  isSticky: false,
  color: `danger`,
  active: false,
  transitionIn: `fadeIn`,
  transitionOut: `fadeOut`,
  displayTime: 15,
  fitContent: true,
  html: `<h1 style="text-align: center; font-size: 3em; color: ${
    !isLightTheme ? `#ffffff` : `#000000`
  }">WWSU EAS - Active Alerts</h1><h2 style="text-align: center; font-size: 1.5em; color: ${
    !isLightTheme ? `#ffffff` : `#000000`
  }">Clark, Greene, and Montgomery counties</h2><div style="overflow-y: hidden;" class="d-flex flex-wrap" id="eas-alerts"></div>`
});

// Define HTML elements
let statusLine = document.getElementById("status-line");
let djAlert = document.getElementById("dj-alert");
let easAlert = document.getElementById("eas-alert");
let nowplaying = document.getElementById("nowplaying");
let nowplayingtime = document.getElementById("nowplaying-time");
let nowplayingline1 = document.getElementById("nowplaying-line1");
let nowplayingline2 = document.getElementById("nowplaying-line2");
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
let stuff;
let doShade = false;
let isActive = false;

let colors = ["#FF0000", "#00FF00", "#0000FF"];
let color = 0;
let delay = 300000;
let scrollDelay = 15000;

let queueUnknown = false;
let queueReminder = false;

let newEas = [];
let prevEas = [];
let easActive = false;
// LINT LIES: easDelay is used.
// eslint-disable-next-line no-unused-lets
let easDelay = 5;
let easExtreme = false;

let shootoutInactivity;
let shootoutTimer;
let shootoutTime = 0;
let shootoutTimeB = 0;
let shootoutTimeLeft = 0;
let shootoutScore = [0, 0, 0, 0];
let shootoutStart = moment();

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
    "z-index": 9999
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
        "background-color": rColor
      })
      .show()
      .animate(
        {
          left: $(window).width() + "px"
        },
        scrollDelay,
        "linear",
        function() {
          $(this).hide();
        }
      );
    setTimeout(burnGuardAnimate, delay);
  } catch (e) {
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message: "Error occurred during the burnGuardAnimate function."
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
  timeout: 30000
});

$.fn.extend({
  // Add an animateCss function to JQuery to trigger an animation of an HTML element with animate.css
  animateCss: function(animationName, callback) {
    let animationEnd = (function(el) {
      let animations = {
        animation: "animationend",
        OAnimation: "oAnimationEnd",
        MozAnimation: "mozAnimationEnd",
        WebkitAnimation: "webkitAnimationEnd"
      };

      for (let t in animations) {
        if (el.style[t] !== undefined) {
          return animations[t];
        }
      }
    })(document.createElement("div"));

    this.addClass("animated " + animationName).one(animationEnd, function() {
      $(this).removeClass("animated " + animationName);

      if (typeof callback === "function") {
        callback();
      }
    });

    return this;
  }
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
    db.forEach(thestatus => {
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
          message: `Error occurred during Status iteration in processStatus call.`
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
    ).html = `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">System Status</h1><div style="overflow-y: hidden; overflow-x: hidden; font-size: 1.75vh;" class="container-full p-2 m-1">${statusMarquee}</div>`;
  } catch (e) {
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message: "Error occurred during the call of Status[0]."
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
      events => {
        let directorHours = [];
        let tasks = [];

        directorHours = events
          .filter(
            event =>
              ["office-hours"].indexOf(event.type) !== -1 &&
              moment(event.end)
                .add(1, "days")
                .startOf("day")
                .isAfter(moment())
          )
          .sort(
            (a, b) => moment(a.start).valueOf() - moment(b.start).valueOf()
          );

        tasks = events
          .filter(
            event =>
              ["tasks"].indexOf(event.type) !== -1 &&
              moment(event.end)
                .add(1, "days")
                .startOf("day")
                .isAfter(moment())
          )
          .sort(
            (a, b) => moment(a.start).valueOf() - moment(b.start).valueOf()
          );

        // Sort director hours by start time
        let compare = function(a, b) {
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
              message: `Error occurred in the compare function of Calendar.sort in the Calendar[0] call.`
            });
          }
        };

        // Format office hours
        let calendar = {};
        let asstcalendar = {};

        Directors.find({ assistant: false }).forEach(director => {
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

        Directors.find({ assistant: true }).forEach(director => {
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

        directorHours.sort(compare).map(event => {
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
                  moment
                    .parseZone(Meta.meta.time)
                    .add(i, "days")
                    .startOf("day")
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
                ] += `<div class="m-1 text-white" style="${bg ||
                  ``}">${endText}</div>`;
              }
              if (assistant) {
                asstcalendar[event.director][
                  i
                ] += `<div class="m-1 text-white" style="${bg ||
                  ``}">${endText}</div>`;
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
      <span class="text-warning" style="font-size: 0.75em;">${
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
        ).html = `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Directors</h1><div style="overflow-y: hidden; overflow-x: hidden; font-size: 1.75vh;" class="container-full p-2 m-1">${stuff}</div><p class="text-white"><span class="m-3"><span class="text-warning">9AM - 5PM</span>: One-time office hours.</span> <span class="m-3"><span class="text-danger"><strike>9AM - 5PM</strike></span>: One-time cancellation.</span><span class="text-white">9AM - 5PM</span>: Regular office hours.</span></p>`;

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
        ).html = `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Assistant Directors</h1><div style="overflow-y: hidden; overflow-x: hidden; font-size: 1.75vh;" class="container-full p-2 m-1">${stuff}</div><p class="text-white"><span class="m-3"><span class="text-warning">9AM - 5PM</span>: One-time office hours.</span> <span class="m-3"><span class="text-danger"><strike>9AM - 5PM</strike></span>: One-time cancellation.</span><span class="text-white">9AM - 5PM</span>: Regular office hours.</span></p>`;
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
      html: `<div style="overflow-y: hidden; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" class="text-white" id="content-attn-${data.ID}">${data.announcement}</div>`
    });
  }
}

// This function is called whenever meta is changed. The parameter response contains only the meta that has changed / to be updated.
function processNowPlaying(response) {
  if (response) {
    try {
      if (typeof response.state !== "undefined") {
        queueUnknown = true;
        setTimeout(() => {
          queueUnknown = false;
        }, 3000);
        switch (response.state) {
          case "automation_on":
          case "automation_break":
            nowplaying.style.background = "#495057";
            break;
          case "automation_genre":
            nowplaying.style.background = "#2E4F54";
          case "automation_playlist":
            nowplaying.style.background = "#0056B2";
            break;
          case "automation_prerecord":
          case "automation_live":
          case "automation_remote":
          case "automation_sports":
          case "automation_sportsremote":
            nowplaying.style.background = "#7E3F0A";
            break;
          case "live_on":
          case "live_break":
          case "live_returning":
            nowplaying.style.background = "#9E0C1A";
            break;
          case "prerecord_on":
          case "prerecord_break":
            nowplaying.style.background = "#773B57";
            break;
          case "sports_on":
          case "sports_break":
          case "sports_halftime":
          case "sports_returning":
          case "sportsremote_on":
          case "sportsremote_break":
          case "sportsremote_returning":
          case "sportsremote_halftime":
          case "sportsremote_break_disconnected":
            nowplaying.style.background = "#186429";
            break;
          case "remote_on":
          case "remote_break":
          case "remote_returning":
            nowplaying.style.background = "#6610f2";
            break;
          default:
            nowplaying.style.background = "#212529";
        }
      }

      // First, process now playing information
      easDelay -= 1;

      let temp;
      let countdown;
      let countdowntext;
      let countdownclock;

      if (disconnected || typeof Meta.meta.state === "undefined") {
        djAlert.style.display = "none";
      }

      let countDown =
        Meta.meta.countdown !== null
          ? Math.round(
              moment(Meta.meta.countdown).diff(
                moment(Meta.meta.time),
                "seconds"
              )
            )
          : 1000000;
      if (countDown < 0) {
        countDown = 0;
      }
      if (countDown > 29) {
        queueReminder = false;
      }

      if (typeof response.line1 !== "undefined") {
        let line1Timer = setTimeout(() => {
          nowplayingline1.innerHTML = Meta.meta.line1;
          nowplayingline1.className = ``;
          if (Meta.meta.line1.length >= 80) {
            $("#nowplaying-line1").marquee({
              // duration in milliseconds of the marquee
              speed: 100,
              // gap in pixels between the tickers
              gap: 100,
              // time in milliseconds before the marquee will start animating
              delayBeforeStart: 0,
              // 'left' or 'right'
              direction: "left",
              // true or false - should the marquee be duplicated to show an effect of continues flow
              duplicated: true
            });
          }
        }, 5000);

        $("#nowplaying-line1").animateCss("fadeOut", () => {
          clearTimeout(line1Timer);
          nowplayingline1.innerHTML = Meta.meta.line1;
          if (Meta.meta.line1.length >= 80) {
            $("#nowplaying-line1").marquee({
              // duration in milliseconds of the marquee
              speed: 100,
              // gap in pixels between the tickers
              gap: 100,
              // time in milliseconds before the marquee will start animating
              delayBeforeStart: 0,
              // 'left' or 'right'
              direction: "left",
              // true or false - should the marquee be duplicated to show an effect of continues flow
              duplicated: true
            });
          } else {
            $("#nowplaying-line1").animateCss("fadeIn");
          }
        });
      }

      if (typeof response.line2 !== "undefined") {
        let line2Timer = setTimeout(() => {
          nowplayingline2.innerHTML = Meta.meta.line2;
          nowplayingline2.className = ``;
          if (Meta.meta.line2.length >= 80) {
            $("#nowplaying-line2").marquee({
              // duration in milliseconds of the marquee
              speed: 100,
              // gap in pixels between the tickers
              gap: 100,
              // time in milliseconds before the marquee will start animating
              delayBeforeStart: 0,
              // 'left' or 'right'
              direction: "left",
              // true or false - should the marquee be duplicated to show an effect of continues flow
              duplicated: true
            });
          }
        }, 5000);

        $("#nowplaying-line2").animateCss("fadeOut", () => {
          clearTimeout(line2Timer);
          nowplayingline2.innerHTML = Meta.meta.line2;
          if (Meta.meta.line2.length >= 80) {
            $("#nowplaying-line2").marquee({
              // duration in milliseconds of the marquee
              speed: 100,
              // gap in pixels between the tickers
              gap: 100,
              // time in milliseconds before the marquee will start animating
              delayBeforeStart: 0,
              // 'left' or 'right'
              direction: "left",
              // true or false - should the marquee be duplicated to show an effect of continues flow
              duplicated: true
            });
          } else {
            $("#nowplaying-line2").animateCss("fadeIn");
          }
        });
      }

      nowplayingtime.innerHTML = `${
        disconnected
          ? "DISPLAY DISCONNECTED FROM WWSU"
          : moment
              .tz(
                Meta.meta.time,
                Meta.meta ? Meta.meta.timezone : moment.tz.guess()
              )
              .format("LLLL") || "Unknown WWSU Time"
      }`;

      if (
        (Meta.meta.state === "automation_live" ||
          Meta.meta.state.startsWith("live_")) &&
        countDown < 60 &&
        (!Meta.meta.queueCalculating || djAlert.style.display === "inline")
      ) {
        djAlert.style.display = "inline";
        countdown = document.getElementById("countdown");
        countdowntext = document.getElementById("countdown-text");
        countdownclock = document.getElementById("countdown-clock");
        if (!countdown || !countdowntext || !countdownclock) {
          temp = Meta.meta.show.split(" - ");
          djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="countdown-text"></h1>
                    <div class="m-3 bg-primary text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div>
                    </div></div>`;
          countdown = document.getElementById("countdown");
          countdowntext = document.getElementById("countdown-text");
          countdownclock = document.getElementById("countdown-clock");
          countdowntext.innerHTML = `<span class="text-danger">${temp[0]}</span><br />is going live in`;
          sounds.live.play();
        }
        countdownclock.innerHTML = countDown;
        if (countDown <= 10) {
          queueReminder = true;
          $("#dj-alert").css("background-color", "#F44336");
          setTimeout(() => {
            $("#dj-alert").css("background-color", `#000000`);
          }, 250);
        }

        // When a remote broadcast is about to start
      } else if (
        (Meta.meta.state === "automation_remote" ||
          Meta.meta.state.startsWith("remote_")) &&
        countDown < 60 &&
        (!Meta.meta.queueCalculating || djAlert.style.display === "inline")
      ) {
        djAlert.style.display = "inline";
        countdown = document.getElementById("countdown");
        countdowntext = document.getElementById("countdown-text");
        countdownclock = document.getElementById("countdown-clock");
        if (!countdown || !countdowntext || !countdownclock) {
          temp = Meta.meta.show.split(" - ");
          djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-purple text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div></div></div>`;
          countdown = document.getElementById("countdown");
          countdowntext = document.getElementById("countdown-text");
          countdownclock = document.getElementById("countdown-clock");
          countdowntext.innerHTML = "Remote Broadcast starting in";
          sounds.remote.play();
        }
        countdownclock.innerHTML = countDown;
        // Sports broadcast about to begin
      } else if (
        (Meta.meta.state === "automation_sports" ||
          Meta.meta.state.startsWith("sports_") ||
          Meta.meta.state === "automation_sportsremote" ||
          Meta.meta.state.startsWith("sportsremote_")) &&
        countDown < 60 &&
        (!Meta.meta.queueCalculating || djAlert.style.display === "inline")
      ) {
        djAlert.style.display = "inline";
        countdown = document.getElementById("countdown");
        countdowntext = document.getElementById("countdown-text");
        countdownclock = document.getElementById("countdown-clock");
        if (!countdown || !countdowntext || !countdownclock) {
          djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-success text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div></div></div>`;
          countdown = document.getElementById("countdown");
          countdowntext = document.getElementById("countdown-text");
          countdownclock = document.getElementById("countdown-clock");
          countdowntext.innerHTML = `<span class="text-success">${Meta.meta.show}</span><br />about to broadcast in`;
          sounds.sports.play();
        }
        countdownclock.innerHTML = countDown;
        if (
          Meta.meta.state === "automation_sports" ||
          Meta.meta.state.startsWith("sports_")
        ) {
          if (countDown <= 10) {
            queueReminder = true;
            $("#dj-alert").css("background-color", "#4CAF50");
            setTimeout(() => {
              $("#dj-alert").css("background-color", `#000000`);
            }, 250);
          }
        }
        // Nothing special to show
      } else {
        djAlert.style.display = "none";
        djAlert.innerHTML = ``;
      }
    } catch (e) {
      console.error(e);
      iziToast.show({
        title: "An error occurred - Please check the logs",
        message: "Error occurred during processNowPlaying."
      });
    }
  }
}

// Check for new Eas alerts and push them out when necessary.
function processEas(db) {
  // Data processing
  try {
    // Check to see if any alerts are extreme, and update our previous Eas ID array
    easExtreme = false;

    prevEas = [];
    let innercontent = ``;

    // eslint-disable-next-line no-unused-lets
    let makeActive = false;
    // eslint-disable-next-line no-unused-lets
    let displayTime = 7;

    db.each(dodo => {
      try {
        prevEas.push(dodo.ID);

        makeActive = true;
        displayTime += 4;

        if (dodo.severity === "Extreme") {
          easExtreme = true;
        }

        let color =
          typeof dodo.color !== "undefined" &&
          /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(dodo.color)
            ? hexRgb(dodo.color)
            : hexRgb("#787878");
        let borderclass = "black";
        color.red = Math.round(color.red / 2);
        color.green = Math.round(color.green / 2);
        color.blue = Math.round(color.blue / 2);
        if (typeof dodo["severity"] !== "undefined") {
          if (dodo["severity"] === "Extreme") {
            borderclass = "danger";
          } else if (dodo["severity"] === "Severe") {
            borderclass = "warning";
          } else if (dodo["severity"] === "Moderate") {
            borderclass = "primary";
          }
        }
        // LINT LIES: This letiable is used.
        // eslint-disable-next-line no-unused-lets
        color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
        if (isLightTheme) {
          color = `rgb(${color.red / 4 + 191}, ${color.green / 4 +
            191}, ${color.blue / 4 + 191});`;
        }
        innercontent += `<div style="width: 32%;" class="d-flex align-items-stretch m-1 ${
          !isLightTheme ? `text-white` : `text-dark`
        } border border-${borderclass} rounded shadow-4 ${
          !isLightTheme ? `bg-dark-4` : `bg-light-1`
        }">
                        <div class="m-1" style="text-align: center; width: 100%"><span class="${
                          !isLightTheme ? `text-white` : `text-dark`
                        }" style="font-size: 1.5em;">${
          typeof dodo["alert"] !== "undefined" ? dodo["alert"] : "Unknown Alert"
        }</span><br />
                        <span style="font-size: 1em;" class="${
                          !isLightTheme ? `text-white` : `text-dark`
                        }">${
          moment(dodo["starts"]).isValid()
            ? moment
                .tz(
                  dodo["starts"],
                  Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                )
                .format("MM/DD h:mmA")
            : "UNKNOWN"
        } - ${
          moment(dodo["expires"]).isValid()
            ? moment
                .tz(
                  dodo["expires"],
                  Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                )
                .format("MM/DD h:mmA")
            : "UNKNOWN"
        }</span><br />
<span style="font-size: 1em;" class="${
          !isLightTheme ? `text-white` : `text-dark`
        }">${
          typeof dodo["counties"] !== "undefined"
            ? dodo["counties"]
            : "Unknown Counties"
        }</span><br /></div>
                        </div>
                        `;
      } catch (e) {
        console.error(e);
        iziToast.show({
          title: "An error occurred - Please check the logs",
          message: `Error occurred during Eas iteration in processEas.`
        });
      }
    });

    if (prevEas.length === 0) {
      innercontent = `<strong class="text-white">No active alerts</strong>`;
    }

    WWSUslides.slide(`eas-alerts`).active = makeActive;
    WWSUslides.slide(`eas-alerts`).displayTime = displayTime;
    WWSUslides.slide(
      `eas-alerts`
    ).html = `<h1 style="text-align: center; font-size: 3em; color: ${
      !isLightTheme ? `#ffffff` : `#000000`
    }">WWSU EAS - Active Alerts</h1><h2 style="text-align: center; font-size: 1.5em; color: ${
      !isLightTheme ? `#ffffff` : `#000000`
    }">Clark, Greene, and Montgomery counties of Ohio</h2><div style="overflow-y: hidden;" class="d-flex flex-wrap">${innercontent}</div>`;

    // Do EAS events
    doEas();
  } catch (e) {
    console.error(e);
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message: "Error occurred during the call of Eas[0]."
    });
  }
}

// This function is called whenever a change in Eas alerts is detected, or when we are finished displaying an alert. It checks to see if we should display something Eas-related.
function doEas() {
  try {
    console.log(`DO EAS called`);
    // Display the new alert if conditions permit
    if (newEas.length > 0 && !easActive) {
      // Make sure alert is valid. Also, only scroll severe and extreme alerts when there is an extreme alert in effect; ignore moderate and minor alerts.
      if (
        typeof newEas[0] !== "undefined" &&
        (!easExtreme ||
          (easExtreme &&
            (newEas[0]["severity"] === "Extreme" ||
              newEas[0]["severity"] === "Severe")))
      ) {
        easActive = true;

        let alert =
          typeof newEas[0]["alert"] !== "undefined"
            ? newEas[0]["alert"]
            : "Unknown Alert";
        let text =
          typeof newEas[0]["information"] !== "undefined"
            ? newEas[0]["information"].replace(/[\r\n]+/g, " ")
            : "There was an error attempting to retrieve information about this alert. Please check the National Weather Service or your local civil authorities for details about this alert.";
        let color2 =
          typeof newEas[0]["color"] !== "undefined" &&
          /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(newEas[0]["color"])
            ? hexRgb(newEas[0]["color"])
            : hexRgb("#787878");
        let color3 =
          typeof newEas[0]["color"] !== "undefined" &&
          /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(newEas[0]["color"])
            ? hexRgb(newEas[0]["color"])
            : hexRgb("#787878");
        color3.red = Math.round(color3.red / 2);
        color3.green = Math.round(color3.green / 2);
        color3.blue = Math.round(color3.blue / 2);
        color3 = `rgb(${color3.red}, ${color3.green}, ${color3.blue})`;
        let color4 =
          typeof newEas[0]["color"] !== "undefined" &&
          /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(newEas[0]["color"])
            ? hexRgb(newEas[0]["color"])
            : hexRgb("#787878");
        color4.red = Math.round(color4.red / 2 + 127);
        color4.green = Math.round(color4.green / 2 + 127);
        color4.blue = Math.round(color4.blue / 2 + 127);
        color4 = `rgb(${color4.red}, ${color4.green}, ${color4.blue})`;
        easAlert.style.display = "inline";
        easAlert.style.backgroundColor = `#0000ff`;
        easAlert.innerHTML = `<div class="animated heartBeat" id="slide-interrupt-eas"><div style="text-align: center; color: #ffffff;">
                    <h1 style="font-size: 7vh;">WWSU Emergency Alert System</h1>
                    <div id="eas-alert-text" class="m-3 text-white" style="font-size: 5vh;">${alert}</div>
                    <div class="m-1 text-white" style="font-size: 3vh;">Effective ${
                      moment(newEas[0]["starts"]).isValid()
                        ? moment
                            .tz(
                              newEas[0]["starts"],
                              Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                            )
                            .format("MM/DD h:mmA")
                        : "UNKNOWN"
                    } - ${
          moment(newEas[0]["expires"]).isValid()
            ? moment
                .tz(
                  newEas[0]["expires"],
                  Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                )
                .format("MM/DD h:mmA")
            : "UNKNOWN"
        }</div>
                    <div class="m-1 text-white" style="font-size: 3vh;">for the counties ${
                      typeof newEas[0]["counties"] !== "undefined"
                        ? newEas[0]["counties"]
                        : "Unknown Counties"
                    }</div>
                    <div id="alert-marquee" class="marquee m-3 shadow-4" style="color: #FFFFFF; background: rgb(${Math.round(
                      color2.red / 4
                    )}, ${Math.round(color2.green / 4)}, ${Math.round(
          color2.blue / 4
        )}); font-size: 5vh;">${text}</div>
                    </div></div>`;
        sounds.severeeas.play();
        if (easExtreme) {
          easAlert.style.display = "inline";
          easAlert.innerHTML += `<h2 style="text-align: center; font-size: 5vh;" class="text-white"><strong>LIFE-THREATENING ALERTS IN EFFECT!</strong> Please stand by for details...</h2>`;
        }
        $("#alert-marquee")
          .bind("finished", () => {
            try {
              easActive = false;
              let temp = document.getElementById("alert-marquee");
              temp.innerHTML = "";
              clearInterval(flashInterval);
              newEas.shift();
              doEas();
            } catch (e) {
              console.error(e);
              iziToast.show({
                title: "An error occurred - Please check the logs",
                message: `Error occurred in the finished bind of #alert-marquee in doEas.`
              });
            }
          })
          .marquee({
            // duration in milliseconds of the marquee
            speed: 180,
            // gap in pixels between the tickers
            gap: 50,
            // time in milliseconds before the marquee will start animating
            delayBeforeStart: 2000,
            // 'left' or 'right'
            direction: "left",
            // true or false - should the marquee be duplicated to show an effect of continues flow
            duplicated: false
          });
        /*
        clearInterval(flashInterval);
        flashInterval = setInterval(function () {
            let temp = document.querySelector(`#eas-alert-text`);
            if (temp !== null)
                temp.className = "m-3 animated pulse fast";
            setTimeout(() => {
                let temp = document.querySelector(`#eas-alert-text`);
                if (temp !== null)
                    temp.className = "m-3";
            }, 900);
            if (easActive && document.getElementById('slide-interrupt-eas') === null)
            {
                easActive = false;
                doEas();
            }
        }, 1000);
        */
      } else {
        easActive = false;
        newEas.shift();
        doEas();
      }
      // If there is an extreme alert in effect, we want it to be permanently on the screen while it is in effect
    } else if (easExtreme && !easActive) {
      // Make background flash red every second
      clearInterval(flashInterval);
      let voiceCount = 180;
      flashInterval = setInterval(() => {
        $("#eas-alert").css("background-color", "#D50000");
        setTimeout(() => {
          $("#eas-alert").css(
            "background-color",
            !isLightTheme ? `#320000` : `#f6cccc`
          );
          voiceCount++;
          if (voiceCount > 179) {
            voiceCount = 0;
            sounds.lifethreatening.play();
          }
        }, 250);
      }, 1000);

      // Display the extreme alerts
      easAlert.style.display = "inline";
      easAlert.innerHTML = `<div id="slide-interrupt-eas">
            <h1 style="text-align: center; font-size: 7vh; color: ${
              !isLightTheme ? `#ffffff` : `#000000`
            };">WWSU Emergency Alert System</h1>
            <h2 style="text-align: center; font-size: 5vh;" class="${
              !isLightTheme ? `text-white` : `text-dark`
            }">Extreme Alerts in effect</h2>
            <h2 style="text-align: center; font-size: 5vh;" class="${
              !isLightTheme ? `text-white` : `text-dark`
            }">SEEK SHELTER NOW!!!</h2>
            <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="alerts"></div></div>`;
      let innercontent = document.getElementById("alerts");
      Eas.find({ severity: "Extreme" }).forEach(dodo => {
        try {
          let color = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(dodo.color)
            ? hexRgb(dodo.color)
            : hexRgb("#787878");
          let borderclass = "black";
          borderclass = "danger";
          color = `rgb(${Math.round(color.red / 4)}, ${Math.round(
            color.green / 4
          )}, ${Math.round(color.blue / 4)});`;
          innercontent.innerHTML += `<div style="width: 32%;${
            !isLightTheme ? `background-color: ${color}` : ``
          }" class="d-flex align-items-stretch m-1 ${
            !isLightTheme ? `text-white` : `text-dark bg-light-1`
          } border border-${borderclass} rounded shadow-4">
                        <div class="m-1" style="text-align: center; width: 100%"><span style="font-size: 5vh;">${
                          typeof dodo["alert"] !== "undefined"
                            ? dodo["alert"]
                            : "Unknown Alert"
                        }</span><br />
                        <span style="font-size: 2vh;" class="${
                          !isLightTheme ? `text-white` : `text-dark`
                        }">${
            moment(dodo["starts"]).isValid()
              ? moment
                  .tz(
                    dodo["starts"],
                    Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                  )
                  .format("MM/DD h:mmA")
              : "UNKNOWN"
          } - ${
            moment(dodo["expires"]).isValid()
              ? moment
                  .tz(
                    dodo["expires"],
                    Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                  )
                  .format("MM/DD h:mmA")
              : "UNKNOWN"
          }</span><br />
<span style="font-size: 1em;" class="${
            !isLightTheme ? `text-white` : `text-dark`
          }">${
            typeof dodo["counties"] !== "undefined"
              ? dodo["counties"]
              : "Unknown Counties"
          }</span><br />
                        </div>
                        `;
        } catch (e) {
          console.error(e);
          iziToast.show({
            title: "An error occurred - Please check the logs",
            message: `Error occurred during Eas iteration in doEas.`
          });
        }
      });
      // Resume regular slides when no extreme alerts are in effect anymore
    } else if (
      !easExtreme &&
      !easActive &&
      document.getElementById("slide-interrupt-eas") !== null
    ) {
      clearInterval(flashInterval);
      easAlert.style.display = "none";
      easAlert.innerHTML = ``;
      // If we are supposed to display an EAS alert, but it is not on the screen, this is an error; put it on the screen.
    } else if (
      easActive &&
      document.getElementById("slide-interrupt-eas") === null
    ) {
      easActive = false;
      doEas();
    }
  } catch (e) {
    console.error(e);
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message: "Error occurred during doEas."
    });
  }
}

function hexRgb(hex, options = {}) {
  try {
    if (
      typeof hex !== "string" ||
      nonHexChars.test(hex) ||
      !validHexSize.test(hex)
    ) {
      throw new TypeError("Expected a valid hex string");
    }

    hex = hex.replace(/^#/, "");
    let alpha = 255;

    if (hex.length === 8) {
      alpha = parseInt(hex.slice(6, 8), 16) / 255;
      hex = hex.substring(0, 6);
    }

    if (hex.length === 4) {
      alpha = parseInt(hex.slice(3, 4).repeat(2), 16) / 255;
      hex = hex.substring(0, 3);
    }

    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    const num = parseInt(hex, 16);
    const red = num >> 16;
    const green = (num >> 8) & 255;
    const blue = num & 255;

    return options.format === "array"
      ? [red, green, blue, alpha]
      : { red, green, blue, alpha };
  } catch (e) {
    console.error(e);
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message: "Error occurred during hexRgb."
    });
  }
}

Shootout.on("insert", "displayinternal", data => {
  processShootout(data);
});
Shootout.on("update", "displayinternal", data => {
  processShootout(data);
});
Shootout.on("replace", "displayinternal", data => {
  data.get().map(datum => {
    
    // On replaces, do not process certain triggers
    if (
      ["timeStart", "timeStop", "timeResume"].indexOf(datum.name) !==
      -1
    )
      return;

    processShootout(datum);
  });
});

function processShootout(data) {
  // Disable slide after 10 minutes of inactivity
  clearTimeout(shootoutInactivity);
  shootoutInactivity = setTimeout(() => {
    WWSUslides.slide(`shootout`).active = false;
  }, 1000 * 60 * 10);

  if (data.name === "time") {
    shootoutTime = parseFloat(data.value);
    $(".shootout-time").html(
      moment
        .duration(shootoutTime, "seconds")
        .format("mm:ss.S", { trim: false })
    );
  } else if (data.name === "turn") {
    for (let i = 1; i <= 4; i++) {
      if (parseInt(data.value) === i) {
        $(`.shootout-name${i}`).removeClass("bg-dark");
        $(`.shootout-name${i}`).addClass("bg-success");
      } else {
        $(`.shootout-name${i}`).removeClass("bg-success");
        $(`.shootout-name${i}`).addClass("bg-dark");
      }
    }
  } else if (data.name.startsWith("name")) {
    let player = data.name.replace("name", "");
    if (!data.value || data.value.length < 1) {
      $(`.shootout-player${player}`).addClass("d-none");
    } else {
      $(`.shootout-player${player}`).removeClass("d-none");
      $(`.shootout-name${player}`).html(data.value);
    }
  } else if (data.name.startsWith("score")) {
    let score = parseInt(data.name.replace("score", ""));
    switch (
      parseInt(data.value) -
      shootoutScore[score - 1]
    ) {
      case 1:
        sounds.point1.play();
        break;
      case 2:
        sounds.point2.play();
        break;
      case 3:
        sounds.point3.play();
        break;
    }
    shootoutScore[score - 1] = parseInt(
      data.value
    );
    $(`.shootout-score${score}`).html(data.value);
    $(`.shootout-score${score}`).animateCss("heartBeat");
  } else if (data.name === "timeStart") {
    sounds.beat.stop();
    clearTimeout(shootoutTimer);
    clearInterval(shootoutTimer);
    sounds.begin.play();
    shootoutTimer = setTimeout(() => {
      shootoutTimeB = shootoutTime;
      shootoutTimeLeft = shootoutTime;
      shootoutStartTimer();
      sounds.beat.play();
    }, 3000);
  } else if (data.name === "timeStop") {
    clearTimeout(shootoutTimer);
    clearInterval(shootoutTimer);
    sounds.whistle.play();
  } else if (data.name === "timeResume") {
    clearTimeout(shootoutTimer);
    clearInterval(shootoutTimer);
    shootoutTimeB = shootoutTimeLeft;
    sounds.shortbuzz.play();
    shootoutStartTimer();
  } else if (data.name === "active") {
    if (parseInt(data.value) === 1) {
      WWSUslides.slide(`shootout`).active = true;
    } else {
      clearTimeout(shootoutInactivity);
      WWSUslides.slide(`shootout`).active = false;
    }
  } else {
    $(`.shootout-${data.name}`).html(data.value);
  }
}

function shootoutStartTimer() {
  shootoutStart = moment();
  $(`.shootout-time`).removeClass("text-warning");
  $(`.shootout-time`).removeClass("text-danger");
  clearTimeout(shootoutTimer);
  clearInterval(shootoutTimer);
  shootoutTimer = setInterval(() => {
    shootoutTimeLeft =
      shootoutTimeB - moment().diff(moment(shootoutStart), "seconds", true);

      if (shootoutTimeLeft <= 0) {
        shootoutTimeLeft = 0;
        clearTimeout(shootoutTimer);
        sounds.buzzer.play();
        sounds.beat.stop();
        $(`.shootout-time`).addClass("text-danger");
      }

    $(`.shootout-time`).html(
      moment.duration(shootoutTimeLeft, "seconds").format("mm:ss", { trim: false })
    );

    if (shootoutTimeLeft <= 10 && parseInt(shootoutTimeLeft * 10) % 10 === 0) {
      sounds.countdown.play();
      $(`.shootout-time`).animateCss("pulse");
      $(`.shootout-time`).addClass("text-warning");
    }
  }, 100);
}
