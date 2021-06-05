"use strict";

// AnimateCSS JQuery extension
$.fn.extend({
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

// Create restart function to restart the screen after 15 seconds if it does not connect.
let restart = setTimeout(() => {
  window.location.reload(true);
}, 15000);

// Sounds
let sounds = {
  lifethreatening: new Howl({
    src: ["/sounds/display/lifethreatening.mp3"],
  }),
  severeeas: new Howl({ src: ["/sounds/display/severeeas.mp3"] }),
  displaymessage: new Howl({ src: ["/sounds/display/displaymessage.mp3"] }),
  goingonair: new Howl({ src: ["/sounds/display/goingonair.mp3"] }),
};

const displayName = "display-public";

// Define hexrgb constants
let hexChars = "a-f\\d";
let match3or4Hex = `#?[${hexChars}]{3}[${hexChars}]?`;
let match6or8Hex = `#?[${hexChars}]{6}([${hexChars}]{2})?`;
let nonHexChars = new RegExp(`[^#${hexChars}]`, "gi");
let validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, "i");

// Define HTML elements
let content = document.getElementById("slide-contents");
let easAlert = document.getElementById("eas-alert");
let nowplaying = document.getElementById("nowplaying");
let nowplayingtime = document.getElementById("nowplaying-time");
let nowplayingline1 = document.getElementById("nowplaying-line1");
let nowplayingline2 = document.getElementById("nowplaying-line2");
let wrapper = document.getElementById("wrapper");

// Define connections
io.sails.url = "https://server.wwsu1069.org";
let socket = io.sails.connect();

// Add WWSU modules
let wwsumodules = new WWSUmodules(socket);
wwsumodules
  .add("WWSUanimations", WWSUanimations)
  .add(`WWSUutil`, WWSUutil)
  .add("WWSUslides", WWSUslides)
  .add("noReq", WWSUreq, { host: displayName })
  .add("WWSUMeta", WWSUMeta)
  .add("WWSUdirectors", WWSUdirectors, { host: displayName })
  .add("WWSUeas", WWSUeas)
  .add("WWSUannouncements", WWSUannouncements, {
    types: [displayName, `${displayName}-sticky`],
  })
  .add("WWSUcalendar", WWSUcalendar)
  .add("WWSUrecipientsweb", WWSUrecipientsweb)
  .add("WWSUstatus", WWSUstatus)
  .add("WWSUclimacell", WWSUclimacell)
  .add("WWSUmessagesweb", WWSUmessagesweb)
  .add("WWSUclocks", WWSUclocks);

// Reference modules to variables
let animations = wwsumodules.get("WWSUanimations");
let util = wwsumodules.get("WWSUutil");
let slides = wwsumodules.get("WWSUslides");
let Meta = wwsumodules.get("WWSUMeta");
let noReq = wwsumodules.get("noReq");
let Announcements = wwsumodules.get("WWSUannouncements");
let Directors = wwsumodules.get("WWSUdirectors");
let Calendar = wwsumodules.get("WWSUcalendar");
let Recipients = wwsumodules.get("WWSUrecipientsweb");
let Messages = wwsumodules.get("WWSUmessagesweb");
let Status = wwsumodules.get("WWSUstatus");
let Eas = wwsumodules.get("WWSUeas");
let Climacell = wwsumodules.get("WWSUclimacell");
let Clocks = wwsumodules.get("WWSUclocks");

// Immediately initialize clocks so we can begin adding them.
Clocks.init();

// Assign other (deprecated) data managers
let calendar = [];
let sportsdb = new WWSUdb(TAFFY());

// Assign event listeners
Directors.on("change", "renderer", (db) => processDirectors(db));
Calendar.on("calendarUpdated", "renderer", () => updateCalendar());
Eas.on("newAlert", "renderer", (record) => {
  newEas.push(record);
  if (record.severity === "Extreme") easExtreme = true;
  doEas();
});
Eas.on("change", "renderer", (db) => processEas(db));
Meta.on("newMeta", "renderer", (data) => processNowPlaying(data));
Meta.on("metaTick", "renderer", () => nowPlayingTick());

Announcements.on("update", "renderer", (data) => {
  slides.remove(`attn-${data.ID}`);
  createAnnouncement(data);
});
Announcements.on("insert", "renderer", (data) => {
  createAnnouncement(data);
});
Announcements.on("remove", "renderer", (data) => {
  slides.remove(`attn-${data}`);
});
Announcements.on("replace", "renderer", (db) => {
  // Remove all announcement slides
  [...slides.slides.values()]
    .filter((slide) => slide.name.startsWith(`attn-`))
    .map((slide) => slides.remove(slide.name));

  // Add slides for each announcement
  db.each((data) => createAnnouncement(data));
});

socket.on("connect", () => {
  Recipients.addRecipientDisplay(displayName, (data, success) => {
    if (success) {
      Meta.init();
      Calendar.init();
      Directors.init();
      Eas.init();
      Announcements.init();
      Messages.init();
      Climacell.init();

      weeklyDJSocket();
      if (disconnected) {
        // noConnection.style.display = "none";
        disconnected = false;
        clearTimeout(restart);
      }
    } else {
      $(document).Toasts("create", {
        class: "bg-danger",
        title: "Error registering",
        body: "There was an error registering this display sign with WWSU. I will try again in 60 seconds. Please report this to the engineer at wwsu4@wright.edu if this error keeps happening.",
        autohide: true,
        delay: 60000,
        icon: "fas fa-skull-crossbones fa-lg",
      });
      setTimeout(() => {
        window.location.reload(true);
      }, 60000);
    }
  });
});

socket.on("disconnect", () => {
  console.log("Lost connection");
  try {
    socket._raw.io._reconnection = true;
    socket._raw.io._reconnectionAttempts = Infinity;
  } catch (e) {
    console.error(e);
    $(document).Toasts("create", {
      class: "bg-danger",
      title: "Error reconnecting",
      body: "There was an error attempting to reconnect to WWSU. Please report this to the engineer at wwsu4@wright.edu.",
      icon: "fas fa-skull-crossbones fa-lg",
    });
  }
  if (!disconnected) {
    // noConnection.style.display = "inline";
    disconnected = true;
    // process now playing so that it displays that we are disconnected.
    processNowPlaying(Meta.meta);
    /*
           restart = setTimeout(function () {
           window.location.reload(true);
           }, 300000);
           */
  }
});

socket.on("display-refresh", () => {
  if (isStudio) {
    setTimeout(() => {
      window.location.reload(true);
    }, 10000);
  } else {
    window.location.reload(true);
  }
});

// Display messages sent to the display
Messages.on("insert", "renderer", (data) => {
  if (data.to !== displayName) return;
  $(document).Toasts("create", {
    class: "bg-lime",
    title: "Message!",
    body: data.message,
    autohide: true,
    delay: 60000,
  });
  if (!isStudio) {
    sounds.displaymessage.play();
  }
});

socket.on("analytics-weekly-dj", (data) => {
  try {
    processWeeklyStats(data);
  } catch (e) {
    $(document).Toasts("create", {
      class: "bg-danger",
      title: "Error updating analytics",
      body: "There was an error updating weekly analytics. Please report this to the engineer at wwsu4@wright.edu.",
      autohide: true,
      delay: 180000,
      icon: "fas fa-skull-crossbones fa-lg",
    });
    console.error(e);
  }
});

// Prepare other letiables
let newEas = [];
let prevEas = [];
let easActive = false;
// LINT LIES: easDelay is used.
// eslint-disable-next-line no-unused-lets
let easDelay = 5;
let easExtreme = false;

// Define additional letiables
let flashInterval = null;
let disconnected = true;
// LINT LIES: directorpresent is used.
// eslint-disable-next-line no-unused-lets
let directorpresent = false;
let nowPlayingTimer;
let calendarTimer;
let directorCalendarTimer;
let temp;
let queueUnknown = false;
let queueReminder = false;

// The URL should contain a query parameter "studio=true" for the display sign that is placed in the OnAir studio.
// This disables all audio warnings (such as shows going on the air and the EAS) so they do not interfere with a live broadcast.
// However, this enables an audio warning when a producer is about to go live in 10 seconds (for live and sports [live] shows where someone is expected to be in the studio).
// This audio warning helps alert guests in the station to be quiet as the producer might be about to turn the microphones on.
let isStudio = window.location.search.indexOf("studio=true") !== -1;

// Set to light mode if darkmode=false was set in URL
if (window.location.search.indexOf("darkmode=false") !== -1)
  $("body").removeClass("dark-mode");

// Set burnGuard height and width to window height and width.
wrapper.width = window.innerWidth;
wrapper.height = window.innerHeight;

// Add slide categories
slides.addCategory("social", "SOCIAL MEDIA");
slides.addCategory("events", "EVENTS");
slides.addCategory("announcements", "ANNOUNCEMENTS");
slides.addCategory("directors", "DIRECTORS");
slides.addCategory("weather", "WEATHER");

// Add intro slide
slides.add({
  name: `wwsu`,
  category: `social`,
  label: `WWSU 106.9 FM`,
  icon: `fas fa-broadcast-tower`,
  isSticky: false,
  color: `primary`,
  active: true,
  transitionIn: `bounceInUp`,
  transitionOut: `fadeOutRight`,
  displayTime: 14,
  fitContent: false,
  html: `<div style="text-align: center; width: 100%;"><img src="/images/display/wwsu.png" style="height: 20vh; width: auto;">
  <p style="font-size: 5vh; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);">106.9 FM / Dayton's Wright Choice</p>
  </div>
                        <div id="slide-wwsu-bottom" style="text-shadow: 1px 4px 1px rgba(0,0,0,0.3);">
                        <h1 style="text-align: center; font-size: 10vh; color: #FFFFFF">Website: <span class="text-lightblue">wwsu1069.org</span></h1>
<h1 style="text-align: center; font-size: 10vh; color: #FFFFFF">Office Line: <span class="text-warning">937-775-5554</span></h1>
<h1 style="text-align: center; font-size: 10vh; color: #FFFFFF">Request Line: <span class="text-warning">937-775-5555</span></h1>
        </div>
        </div>`,
  reset: true,
  fnStart: (slide) => {
    setTimeout((slide) => {
      $("#slide-wwsu-bottom").animateCss("fadeOut", function () {
        var temp = document.getElementById("slide-wwsu-bottom");
        if (temp !== null) {
          temp.innerHTML = `<h1 style="text-align: center; font-size: 10vh; color: #FFFFFF">Follow Us <span class="text-warning">@wwsu1069</span> On</h1>
        <div style="width: 100%; align-items: center; justify-content: center;" class="d-flex flex-nowrap p-3 m-3">
        <div class="flex-item m-1" style="width: 20%; text-align: center;"><img src="/images/display/facebook.png"></div>
        <div class="flex-item m-1" style="width: 20%; text-align: center;"><img src="/images/display/twitter.png"></div>
        <div class="flex-item m-1" style="width: 20%; text-align: center;"><img src="/images/display/instagram.png"></div>`;
          $("#slide-wwsu-bottom").animateCss("fadeIn");
        }
      });
    }, 7000);
  },
});

// Only display weeklyStats for non-studio display sign
if (!isStudio) {
  slides.addCategory("analytics", "ANALYTICS");
  slides.add({
    name: `weekly-stats`,
    category: `analytics`,
    label: `Weekly Stats`,
    isSticky: false,
    color: `success`,
    active: true,
    transitionIn: `fadeInDown`,
    transitionOut: `fadeOutDown`,
    displayTime: 15,
    fitContent: false,
    html: `<h1 style="text-align: center; font-size: 5vh;">Analytics last 7 days</h1><div style="overflow-y: hidden; overflow-x: hidden; font-size: 3vh;" class="container-full p-2 m-1 scale-content" id="analytics">Not Yet Loaded</div>`,
  });
}

// On the Air
slides.add({
  name: `on-air`,
  category: `events`,
  label: `On the Air Now`,
  icon: `fas fa-microphone`,
  isSticky: false,
  color: `danger`,
  active: false,
  transitionIn: `zoomInDown`,
  transitionOut: `bounceOut`,
  displayTime: 10,
  fitContent: false,
  html: ``,
});

// Weather alerts
slides.add({
  name: `eas-alerts`,
  category: `weather`,
  label: `Active Alerts`,
  icon: `fas fa-bolt`,
  isSticky: false,
  color: `danger`,
  active: false,
  transitionIn: `fadeIn`,
  transitionOut: `fadeOut`,
  displayTime: 15,
  fitContent: false,
  html: ``,
});

// Current Weather
slides.add({
  name: `current-weather`,
  category: `weather`,
  label: `Current Weather`,
  icon: `fas fa-sun`,
  isSticky: false,
  color: `warning`,
  active: true,
  transitionIn: `fadeInDown`,
  transitionOut: `fadeOutUp`,
  displayTime: 20,
  fitContent: false,
  html: `
  <div class="card card-info elevation-2" style="font-size: 4vh;">
							<div class="card-header">
								<h3 class="card-title" style="font-size: 4vh;">Current Weather at Wright State University (powered by tomorrow.io)</h3>
							</div>
							<!-- /.card-header -->
							<div
								class="card-body"
								title="Current weather conditions at WWSU."
							>
								<div class="row">
									<div class="col-12">
										<ul>
											<li>
												Conditions:
												<span
													class="climacell-current-0-weatherCode-string text-pink"
													>???</span
												>
											<ul>
                        <li>
                          Cloud Cover:
                          <span class="climacell-current-0-cloudCover text-pink"
                            >???</span
                          >%
                        </li>
                        <li>
                          Precip:
                          <span
                            class="climacell-current-0-precipitationIntensity text-pink"
                            >???</span
                          >
                          inches/hour of
                          <span
                            class="climacell-current-0-precipitationType-string text-pink"
                            >???</span
                          >
                        </li>
                      </ul>
                      </li>
											<li>
												Temperature:
												<span
													class="climacell-current-0-temperature text-pink"
													>???</span
												>°F
                      <ul>
                        <li>Feels like
												<span
													class="climacell-current-0-temperatureApparent text-pink"
													>???</span
												>°F</li>
                      </ul>
											</li>
											<li>
												Wind: From the
												<span
													class="climacell-current-0-windDirection-card text-pink"
													>???</span
												>
												at
												<span class="climacell-current-0-windSpeed text-pink"
													>???</span
												>
												MPH
                        <ul>
                        <li>Gusting to
                          <span
                            class="climacell-current-0-windGust text-pink"
                          ></span>
                          MPH</li>
                        </ul>
											</li>
											<li>
												Humidity:
												<span class="climacell-current-0-humidity text-pink"
													>???</span
												>%
                        <ul>
                        <li>
                        Dew point
                          <span class="climacell-current-0-dewPoint text-pink"
                            >???</span
                          >°F
                        </li>
                        </ul>
											</li>
											<li>
												Visibility:
												<span class="climacell-current-0-visibility text-pink"
													>???</span
												>
												miles
											</li>
											<li>
												Air Quality:
												<span
													class="climacell-current-0-epaHealthConcern-string text-pink"
													>???</span
												>
											</li>
										</ul>
									</div>
								</div>
							</div>
						</div>
  `,
});

// 12-hour forecast
slides.add({
  name: `forecast-12-hours`,
  category: `weather`,
  label: `12-hour Forecast`,
  icon: `fas fa-clock`,
  isSticky: false,
  color: `warning`,
  active: true,
  transitionIn: `fadeIn`,
  transitionOut: `fadeOut`,
  displayTime: 20,
  fitContent: false,
  html: `
  <div class="card card-success elevation-2" style="font-size: 2.5vh;">
							<div class="card-header">
								<h3 class="card-title" style="font-size: 4vh;">12-hour Weather Forecast (powered by tomorrow.io)</h3>
							</div>
							<!-- /.card-header -->
							<div
								class="card-body"
								title="Weather conditions for the next 12 hours at WWSU."
							>
								<div class="container-fluid">
									<div class="row">
										<div class="col-md-6 col-12">
                      <div id="climacell-clock" style="position: relative;"></div>
										</div>
										<div class="col-md-6 col-12">
											<ul id="weather-forecast-description"></ul>
										</div>
									</div>
								</div>
							</div>
							<div class="card-footer">
								<h4>Legend</h4>
								<div class="container-fluid">
									<div class="row">
										<div class="col-12 col-md-6 col-lg-4">
											Clear
											<span style="background: #ffd700"
												><i class="fas fa-sun"></i
											></span>
											<span class="text-light" style="background: #b29600"
												><i class="fas fa-cloud-sun"></i
											></span>
											<span class="text-light" style="background: #665600"
												><i class="fas fa-cloud"></i
											></span>
											Cloudy
										</div>
										<div class="col-12 col-md-6 col-lg-4">
											Light Rain
											<span style="background: #b2b2ff"
												><i class="fas fa-cloud-sun-rain"></i
											></span>
											<span class="text-light" style="background: #6666ff"
												><i class="fas fa-cloud-showers-heavy"></i
											></span>
											<span class="text-light" style="background: #0000ff"
												><i class="fas fa-cloud-rain"></i
											></span>
											Heavy Rain
										</div>
										<div class="col-12 col-md-6 col-lg-4">
											Light Snow
											<span style="background: #aeaeae"
												><i class="far fa-snowflake"></i
											></span>
											<span class="text-light" style="background: #787878"
												><i class="fas fa-snowman"></i
											></span>
											<span class="text-light" style="background: #484848"
												><i class="fas fa-snowboarding"></i
											></span>
											Heavy Snow
										</div>
										<div class="col-12 col-md-6 col-lg-4">
											Light Storms
											<span class="text-light" style="background: #ff6666"
												><i class="fas fa-bolt"></i
											></span>
											<span class="text-light" style="background: #ff0000"
												><i class="fas fa-bolt"></i
											></span>
											<span class="text-light" style="background: #990000"
												><i class="fas fa-poo-storm"></i
											></span>
											Heavy Storms
										</div>
										<div class="col-12 col-md-6 col-lg-4">
											Light Ice
											<span style="background: #e2a3ff"
												><i class="fas fa-icicles"></i
											></span>
											<span class="text-light" style="background: #cf66ff"
												><i class="fas fa-skating"></i
											></span>
											<span class="text-light" style="background: #b000ff"
												><i class="fas fa-igloo"></i
											></span>
											Heavy Ice
										</div>
										<div class="col-12 col-md-6 col-lg-4">
											Breezy
											<span style="background: #7fbf7f"
												><i class="fas fa-fan"></i
											></span>
											<span class="text-light" style="background: #008000"
												><i class="fas fa-wind"></i
											></span>
											<span class="text-light" style="background: #004000"
												><i class="fas fa-wind"></i
											></span>
											Very Windy
										</div>
									</div>
								</div>
							</div>
						</div>`,
});
Climacell.initClockForecast("forecast-12-hours", "#climacell-clock");

// Upcoming shows
let upcomingTable;
slides.add({
  name: `calendar`,
  category: `events`,
  label: `Upcoming Events`,
  icon: `fas fa-calendar-day`,
  isSticky: false,
  color: `info`,
  active: true,
  transitionIn: `fadeInDown`,
  transitionOut: `fadeOutUp`,
  displayTime: 20,
  fitContent: false,
  html: `<h2 style="text-align: center; font-size: 5vh; text-shadow: 1px 3px 1px rgba(0,0,0,0.3);">Upcoming Events (Next 24 Hours)</h2><table id="slide-calendar-table" class="table table-striped display responsive bg-dark" style="width: 100%; font-size: 2vh; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);"></table>`,
});
util.waitForElement(`#slide-calendar-table`, () => {
  // Generate table
  upcomingTable = $(`#slide-calendar-table`).DataTable({
    paging: false,
    data: [],
    columns: [
      { title: "Type" },
      { title: "Hosts" },
      { title: "Name" },
      { title: "Scheduled Time" },
    ],
    order: [],
    searching: false,
    pageLength: 10,
    language: {
      emptyTable: "No events in the next 24 hours",
    },
  });
});

// Promote Random Radio Shows and Events
slides.add({
  name: `show-info`,
  category: `events`,
  label: `Featured Show`,
  icon: `fas fa-star`,
  isSticky: false,
  color: `success`,
  active: true,
  transitionIn: `fadeIn`,
  transitionOut: `fadeOut`,
  displayTime: 10,
  fitContent: false,
  reset: true,
  html: ``,
  fnStart: (slide) => {
    slide.displayTime = 10;
    let tcalendar = calendar.filter(
      (event) =>
        ["show", "remote", "sports", "prerecord", "playlist"].indexOf(
          event.type
        ) !== -1
    );
    if (tcalendar.length > 0) {
      let index = Math.floor(Math.random() * tcalendar.length);
      if (typeof tcalendar[index] !== "undefined") {
        slide.displayTime =
          tcalendar[index].description !== null
            ? 10 + Math.floor(tcalendar[index].description.length / 20)
            : 10;
        if (tcalendar[index].banner) slide.displayTime = slide.displayTime + 5;
        $(`#section-slide-show-info-contents`).html(`
        <div class="card card-widget widget-user-2 shadow-sm" style="text-shadow: 1px 2px 1px rgba(0, 0, 0, 0.3);">
              <div class="widget-user-header bg-${Calendar.getColorClass(
                tcalendar[index]
              )}" style="font-size: 5vh">
                <div class="widget-user-image">
                  ${
                    tcalendar[index].logo
                      ? `<img
                  class="img-circle elevation-2"
                  src="/uploads/calendar/logo/${tcalendar[index].logo}"
                  alt="User Avatar"
                  style="width: 12vh"
                />`
                      : ``
                  }
                </div>
                <!-- /.widget-user-image -->
                <h3
                  class="widget-user-desc"
                  style="font-size: 5vh; margin-left: 13vh;"
                >
                  ${tcalendar[index].name}
                </h3>
                <h3
                  class="widget-user-username"
                  style="font-size: 5vh; margin-left: 13vh;"
                >
                ${tcalendar[index].hosts}
                </h3>
              </div>
              <div class="card-body" style="font-size: 4vh;">
                <div class="container-fluid">
                  <div class="row">
                  ${
                    tcalendar[index].banner
                      ? `<div class="col-6">
                  <img
                    class="elevation-2"
                    src="/uploads/calendar/banner/${tcalendar[index].banner}"
                    style="max-height: 55vh; max-width: 100%;"
                  />
                </div>
                <div class="col-6">
                <p class="text-teal">
                ${moment
                  .tz(
                    tcalendar[index].start,
                    Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                  )
                  .format("MM/DD hh:mm A")} - ${moment
                          .tz(
                            tcalendar[index].end,
                            Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                          )
                          .format("hh:mm A")}</p>
                  <p>${
                    tcalendar[index].description || "No description provided"
                  }</p>
                </div>`
                      : `<div class="col-12">
                      <p class="text-teal">
                      ${moment
                        .tz(
                          tcalendar[index].start,
                          Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                        )
                        .format("MM/DD hh:mm A")} - ${moment
                          .tz(
                            tcalendar[index].end,
                            Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                          )
                          .format("hh:mm A")}</p>
                        <p>${
                          tcalendar[index].description ||
                          "No description provided"
                        }</p>
              </div>`
                  }
                  </div>
                </div>
              </div>
            </div>
        `);
      }
    }
  },
});

// Director hours
slides.add({
  name: `hours-directors`,
  category: `directors`,
  label: `Director Office Hours`,
  icon: `fas fa-clock`,
  isSticky: false,
  color: `info`,
  active: false,
  transitionIn: `fadeInDown`,
  transitionOut: `fadeOutUp`,
  displayTime: 15,
  fitContent: false,
  html: ``,
});

// Assistant hours
slides.add({
  name: `hours-assistants`,
  category: `directors`,
  label: `Assistant Office Hours`,
  icon: `fas fa-clock`,
  isSticky: false,
  color: `info`,
  active: false,
  transitionIn: `fadeInDown`,
  transitionOut: `fadeOutUp`,
  displayTime: 15,
  fitContent: false,
  html: ``,
});

// Burnguard is the line that sweeps across the screen to prevent screen burn-in
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

let colors = ["#FF0000", "#00FF00", "#0000FF"];
let Scolor = 0;
let delay = 301111; // We have a 1111 at the end because the calendar update causes the burn guard to jitter; this allows the line to be at different spots on the screen instead of the same one when it happens
let scrollDelay = 15000;

function burnGuardAnimate() {
  try {
    Scolor = ++Scolor % 3;
    let rColor = colors[Scolor];
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
    console.error(e);
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message: "Error occurred during burnGuardAnimate.",
    });
  }
}
setTimeout(burnGuardAnimate, 5000);

// Replace all Status data with that of body request
function weeklyDJSocket() {
  console.log("attempting weeklyDJ socket");
  noReq.request(
    { method: "POST", url: "/analytics/weekly-dj", data: {} },
    (body) => {
      try {
        processWeeklyStats(body);
      } catch (e) {
        console.error(e);
        console.log("FAILED WEEKLYDJ CONNECTION");
        setTimeout(weeklyDJSocket, 10000);
      }
    }
  );
}

// Process Director data when received by updating local database and marking if a director is present.
function processDirectors(db) {
  // Run data manipulation process
  try {
    // Check for present directors
    directorpresent = false;
    db.each((director) => {
      try {
        if (director.present > 0) {
          directorpresent = true;
        }
      } catch (e) {
        console.error(e);
      }
    });
  } catch (e) {
    console.error(e);
  }
}

function updateCalendar() {
  // Do a 3 second timer to prevent frequent calendar updates
  clearTimeout(calendarTimer);
  calendarTimer = setTimeout(() => {
    Calendar.getEvents(
      (events) => {
        upcomingTable.clear();

        let noEvents = true;
        let activeEvents = 0;
        let innercontent = ``;
        let today = [];
        let color;
        let scheduleInfo = ``;

        // Update calendar array
        calendar = events
          .filter(
            (event) =>
              [
                "genre",
                "playlist",
                "onair-booking",
                "prod-booking",
                "task",
              ].indexOf(event.type) === -1 &&
              moment(event.end).isAfter(moment(Meta.meta.time))
          )
          .sort(
            (a, b) => moment(a.start).valueOf() - moment(b.start).valueOf()
          );

        // Update upcoming events next 24 hours
        calendar
          .filter(
            (event) =>
              [
                "genre",
                "playlist",
                "onair-booking",
                "prod-booking",
                "office-hours",
                "task",
              ].indexOf(event.type) === -1 &&
              moment
                .parseZone(Meta.meta.time)
                .add(1, "days")
                .isSameOrAfter(event.start)
          )
          .map((event) => {
            try {
              event.startT = moment
                .tz(
                  event.start,
                  Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                )
                .format("MM/DD hh:mm A");
              event.endT = moment
                .tz(
                  event.end,
                  Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                )
                .format("hh:mm A");

              color = event.color;
              if (
                ["canceled", "canceled-system", "canceled-changed"].indexOf(
                  event.scheduleType
                ) !== -1
              ) {
                color = `#161616`;
              } else {
                activeEvents++;
              }

              scheduleInfo = `<span class="text-teal">${event.startT} - ${event.endT}</span>`;

              if (["canceled-changed"].indexOf(event.scheduleType) !== -1) {
                scheduleInfo = `<span class="badge badge-warning">RE-SCHEDULED</span><br /><s><span class="text-teal">${event.startT} - ${event.endT}</span></s>`;
              }
              if (
                ["updated", "updated-system"].indexOf(event.scheduleType) !==
                  -1 &&
                event.timeChanged
              ) {
                scheduleInfo = `<span class="badge badge-warning">Temporary Time</span><br /><span class="text-teal">${event.startT} - ${event.endT}</span>`;
              }
              if (
                ["canceled", "canceled-system"].indexOf(event.scheduleType) !==
                -1
              ) {
                scheduleInfo = `<span class="badge badge-danger">CANCELED</span><br /></s><span class="text-teal">${event.startT} - ${event.endT}</span></s>`;
              }

              let image;
              if (event.type === "show") {
                image = `<i class="img-circle img-size-36 fas fa-microphone" style="font-size: 36px; background: ${color};"></i>`;
              } else if (event.type === "prerecord") {
                image = `<i class="img-circle img-size-36 fas fa-play-circle" style="font-size: 36px; background: ${color};"></i>`;
              } else if (event.type === "remote") {
                image = `<i class="img-circle img-size-36 fas fa-broadcast-tower" style="font-size: 36px; background: ${color};"></i>`;
              } else if (event.type === "sports") {
                image = `<i class="img-circle img-size-36 fas fa-trophy" style="font-size: 36px; background: ${color};"></i>`;
              } else {
                image = `<i class="img-circle img-size-36 fas fa-calendar" style="font-size: 36px; background: ${color};"></i>`;
              }

              if (event.logo)
                image = `<img class="img-circle img-size-36" src="/uploads/calendar/logo/${event.logo}" style="background: ${color};">`;

              noEvents = false;

              upcomingTable.row.add([
                `${image} <span class="p-1 text-${Calendar.getColorClass(
                  event
                )}">${event.type}</span>`,
                event.hosts,
                `<span class="text-warning font-weight-bold">${event.name}</span>`,
                scheduleInfo,
              ]);
            } catch (e) {
              console.error(e);
            }
          });

        upcomingTable.draw();

        // Update display time (7 seconds + 3 for every event)
        slides.slides.get(`calendar`).displayTime = 7 + 3 * activeEvents;

        // Do not randomly promote shows if we are not in automation
        if (activeEvents > 0 && Meta.meta.state.startsWith("automation_")) {
          slides.slides.get(`show-info`).active = true;
        } else {
          slides.slides.get(`show-info`).active = false;
        }

        updateDirectorsCalendar();
      },
      undefined,
      moment.parseZone(Meta.meta.time).add(7, "days").toISOString(true)
    );
  }, 3000);
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

    db.each((dodo) => {
      try {
        prevEas.push(dodo.ID);

        makeActive = true;
        displayTime += 4;

        if (dodo.severity === "Extreme") {
          easExtreme = true;
        }

        let colorClass = "secondary";
        if (typeof dodo["severity"] !== "undefined") {
          if (dodo["severity"] === "Extreme") {
            colorClass = "danger";
          } else if (dodo["severity"] === "Severe") {
            colorClass = "orange";
          } else if (dodo["severity"] === "Moderate") {
            colorClass = "warning";
          } else {
            colorClass = "primary";
          }
        }
        // LINT LIES: This letiable is used.
        // eslint-disable-next-line no-unused-lets

        innercontent += `<div class="col-4">
          <div class="card card-${colorClass}">
              <div class="card-header">
                <h3 class="card-title text-center" style="font-size: 2vh;"><strong>${
                  typeof dodo["alert"] !== "undefined"
                    ? dodo["alert"]
                    : "Unknown Alert"
                }</strong></h3>
              </div>

              <div class="card-body" style="font-size: 2vh;">
                <p>Counties: ${
                  typeof dodo["counties"] !== "undefined"
                    ? dodo["counties"]
                    : "Unknown Counties"
                }</p>
              </div>

              <div class="card-footer" style="font-size: 2vh;">
              Effective ${
                moment(dodo["starts"]).isValid()
                  ? moment
                      .tz(
                        dodo["starts"],
                        Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                      )
                      .format("MM/DD h:mm A")
                  : "UNKNOWN"
              } - ${
          moment(dodo["expires"]).isValid()
            ? moment
                .tz(
                  dodo["expires"],
                  Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                )
                .format("MM/DD h:mm A")
            : "UNKNOWN"
        }
              </div>
            </div>
          </div>`;
      } catch (e) {
        console.error(e);
        iziToast.show({
          title: "An error occurred - Please check the logs",
          message: `Error occurred during Eas iteration in processEas.`,
        });
      }
    });

    if (prevEas.length === 0) {
      innercontent = `<strong class="text-white">No active alerts</strong>`;
    }

    slides.slides.get(`eas-alerts`).active = makeActive;
    slides.slides.get(`eas-alerts`).displayTime = displayTime;
    slides.slides.get(
      `eas-alerts`
    ).html = `<h1 style="text-align: center; font-size: 7vh;">WWSU Emergency Alert System</h1><h2 style="text-align: center; font-size: 5vh;">Active Alerts</h2><h3 style="text-align: center; font-size: 3vh;">Clark, Greene, and Montgomery counties of Ohio</h3><div class="container-fluid"><div class="row">${innercontent}</div></div>`;

    // Do EAS events
    doEas();
  } catch (e) {
    console.error(e);
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message: "Error occurred during the call of Eas[0].",
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
        easAlert.innerHTML = `<div class="animated flash slower" id="slide-interrupt-eas"><div style="text-align: center; color: #ffffff;">
                    <h1 class="text-warning" style="font-size: 10vh;">WWSU Emergency Alert System</h1>
                    <div id="eas-alert-text" class="m-3 text-white" style="font-size: 7vh;">${alert}</div>
                    <div class="m-1 text-lime" style="font-size: 5vh;">Effective ${
                      moment(newEas[0]["starts"]).isValid()
                        ? moment
                            .tz(
                              newEas[0]["starts"],
                              Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                            )
                            .format("MM/DD h:mm A")
                        : "UNKNOWN"
                    } - ${
          moment(newEas[0]["expires"]).isValid()
            ? moment
                .tz(
                  newEas[0]["expires"],
                  Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                )
                .format("MM/DD h:mm A")
            : "UNKNOWN"
        }</div>
                    <div class="m-1 text-lime" style="font-size: 5vh;">for the counties ${
                      typeof newEas[0]["counties"] !== "undefined"
                        ? newEas[0]["counties"]
                        : "Unknown Counties"
                    }</div>
                    <div id="alert-marquee" class="marquee shadow-4 p-5 text-white" style="font-size: 7vh;">${text}</div>
                    </div></div>`;
        if (!isStudio) {
          sounds.severeeas.play();
        }
        if (easExtreme) {
          easAlert.style.display = "inline";
          easAlert.innerHTML += `<div style="text-align: center; font-size: 7vh;" class="text-white m-5 p-5"><strong class="text-danger">LIFE-THREATENING ALERTS IN EFFECT!</strong><br /> Please stand by for details...</div>`;
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
                message: `Error occurred in the finished bind of #alert-marquee in doEas.`,
              });
            }
          })
          .marquee({
            // duration in milliseconds of the marquee
            speed: 250,
            // gap in pixels between the tickers
            gap: 300,
            // time in milliseconds before the marquee will start animating
            delayBeforeStart: 3000,
            // 'left' or 'right'
            direction: "left",
            // true or false - should the marquee be duplicated to show an effect of continues flow
            duplicated: false,
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
        $("#eas-alert").addClass("bg-danger");
        setTimeout(() => {
          $("#eas-alert").removeClass("bg-danger");
          voiceCount++;
          if (voiceCount > 179) {
            voiceCount = 0;
            if (!isStudio) {
              sounds.lifethreatening.play();
            }
          }
        }, 250);
      }, 1000);

      // Display the extreme alerts
      easAlert.style.display = "inline";
      easAlert.innerHTML = `<div id="slide-interrupt-eas">
            <h1 style="text-align: center; font-size: 10vh;">WWSU Emergency Alert System</h1>
            <h2 style="text-align: center; font-size: 7vh;" class="text-danger">Life Threatening Alerts in Effect</h2>
            <h2 style="text-align: center; font-size: 7vh;" class="text-warning"><strong>TAKE ACTION NOW TO PROTECT YOUR LIFE!</strong></h2>
            <div class="container-fluid"> <div class="row" id="alerts"></div></div></div>`;
      let innercontent = document.getElementById("alerts");
      Eas.find({ severity: "Extreme" }).forEach((dodo) => {
        try {
          let color = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(dodo.color)
            ? hexRgb(dodo.color)
            : hexRgb("#787878");
          let borderclass = "black";
          borderclass = "danger";
          color = `rgb(${Math.round(color.red / 4)}, ${Math.round(
            color.green / 4
          )}, ${Math.round(color.blue / 4)});`;
          innercontent.innerHTML += `<div class="col-4">
          <div class="card card-danger">
              <div class="card-header">
                <h3 class="card-title text-center" style="font-size: 3vh;"><strong>${
                  typeof dodo["alert"] !== "undefined"
                    ? dodo["alert"]
                    : "Unknown Alert"
                }</strong></h3>
              </div>

              <div class="card-body" style="font-size: 3vh;">
                <p>Counties: ${
                  typeof dodo["counties"] !== "undefined"
                    ? dodo["counties"]
                    : "Unknown Counties"
                }</p>
              </div>

              <div class="card-footer" style="font-size: 3vh;">
              Effective ${
                moment(dodo["starts"]).isValid()
                  ? moment
                      .tz(
                        dodo["starts"],
                        Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                      )
                      .format("MM/DD h:mm A")
                  : "UNKNOWN"
              } - ${
            moment(dodo["expires"]).isValid()
              ? moment
                  .tz(
                    dodo["expires"],
                    Meta.meta ? Meta.meta.timezone : moment.tz.guess()
                  )
                  .format("MM/DD h:mm A")
              : "UNKNOWN"
          }
              </div>
            </div>
          </div>`;
        } catch (e) {
          console.error(e);
          iziToast.show({
            title: "An error occurred - Please check the logs",
            message: `Error occurred during Eas iteration in doEas.`,
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
      message: "Error occurred during doEas.",
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
            nowplaying.style.background = Calendar.getColor({ type: "" });
            break;
          case "automation_genre":
            nowplaying.style.background = Calendar.getColor({ type: "genre" });
          case "automation_playlist":
            nowplaying.style.background = Calendar.getColor({
              type: "playlist",
            });
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
            nowplaying.style.background = Calendar.getColor({ type: "show" });
            break;
          case "prerecord_on":
          case "prerecord_break":
            nowplaying.style.background = Calendar.getColor({
              type: "prerecord",
            });
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
            nowplaying.style.background = Calendar.getColor({ type: "sports" });
            break;
          case "remote_on":
          case "remote_break":
          case "remote_returning":
            nowplaying.style.background = Calendar.getColor({ type: "remote" });
            break;
          default:
            nowplaying.style.background = Calendar.getColor({ type: "" });
        }

        if (calendar.length > 0 && response.state.startsWith("automation_")) {
          slides.slides.get(`show-info`).active = true;
        } else {
          slides.slides.get(`show-info`).active = false;
        }
      }

      // First, process now playing information
      easDelay -= 1;

      if (
        typeof response.state !== `undefined` ||
        typeof response.topic !== `undefined` ||
        typeof response.show !== `undefined`
      ) {
        if (
          Meta.meta.state.startsWith("live_") ||
          Meta.meta.state.startsWith("remote_") ||
          Meta.meta.state.startsWith("sports_") ||
          Meta.meta.state.startsWith("sportsremote_") ||
          Meta.meta.state.startsWith("prerecord_")
        ) {
          slides.slides.get(`on-air`).active = true;
          let eventType = ``;
          if (Meta.meta.state.startsWith("live_")) eventType = "show";
          if (Meta.meta.state.startsWith("prerecord_")) eventType = "prerecord";
          if (Meta.meta.state.startsWith("remote_")) eventType = "remote";
          if (
            Meta.meta.state.startsWith("sports_") ||
            Meta.meta.state.startsWith("sportsremote_")
          )
            eventType = "sports";

          let showInfo = Meta.meta.show.split(" - ");
          let innercontent = `<div class="card card-widget widget-user-2 shadow-sm" style="height: 70vh;">
          <div class="widget-user-header bg-${Calendar.getColorClass({
            type: eventType,
          })}" style="font-size: 5vh">
            <div class="widget-user-image">
            ${
              Meta.meta.showLogo
                ? `<img
            class="img-circle elevation-2"
            src="/uploads/calendar/logo/${Meta.meta.showLogo}"
            alt="User Avatar"
            style="width: 12vh"
          />`
                : ``
            }
            </div>
            <h3
              class="widget-user-desc"
              style="font-size: 5vh; margin-left: 13vh; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);"
            >
              ${showInfo[1]}
            </h3>
            <h3
              class="widget-user-username"
              style="font-size: 5vh; margin-left: 13vh; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);"
            >
            ${showInfo[0]}
            </h3>
          </div>
          <div class="card-body" style="font-size: 4vh; text-shadow: 1px 2px 1px rgba(0,0,0,0.3); height: 45vh;">
            <div class="container-fluid">
              <div class="row">
                <div class="col-6">
                  ${Meta.meta.topic}
                </div>
                <div class="col-6" style="font-size: 5vh;">
                  <p class="text-danger">Tune in: wwsu1069.org</p>
                  ${
                    Meta.meta.webchat
                      ? `<p class="text-info">Chat with DJ: wwsu1069.org</p>`
                      : ``
                  }
                  <p class="text-warning">Request line: 937-775-5555</p>
                </div>
              </div>
            </div>
          </div>
        </div>`;
          if (Meta.meta.topic.length > 2) {
            slides.slides.get(`on-air`).displayTime = 20;
          } else {
            slides.slides.get(`on-air`).displayTime = 10;
          }
          slides.slides.get(
            `on-air`
          ).html = `<h1 class="p-1" style="text-align: center; font-size: 5vh; text-shadow: 1px 4px 1px rgba(0,0,0,0.3);">On the Air Right Now</h1>${innercontent}</div>`;
        } else {
          slides.slides.get(`on-air`).active = false;
        }
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
          nowplayingline1.className = `text-center`;
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
              duplicated: true,
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
              duplicated: true,
            });
          } else {
            $("#nowplaying-line1").animateCss("fadeIn");
          }
        });
      }
      if (typeof response.line2 !== "undefined") {
        let line2Timer = setTimeout(() => {
          nowplayingline2.innerHTML = Meta.meta.line2;
          nowplayingline2.className = `text-center`;
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
              duplicated: true,
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
              duplicated: true,
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

      // For the display that is in the studio, if going live or sports (live) and the countdown drops to 10 seconds, announce an audio warning to guests in the studio
      if (
        [
          "automation_live",
          "automation_sports",
          "live_returning",
          "sports_returning",
        ].indexOf(Meta.meta.state) !== -1
      ) {
        if (countDown <= 10 && isStudio) {
          if (!queueReminder) {
            sounds.goingonair.play();
          }
          queueReminder = true;
        }
      }
    } catch (e) {
      console.error(e);
      iziToast.show({
        title: "An error occurred - Please check the logs",
        message: "Error occurred during processNowPlaying.",
      });
    }
  }
}

function nowPlayingTick() {
  processNowPlaying({});

  // Every minute, re-process the calendar
  if (moment(Meta.meta.time).second() === 0) {
    updateCalendar();
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
      message: "Error occurred during hexRgb.",
    });
  }
}

function createAnnouncement(data) {
  if (data.type.startsWith(displayName)) {
    slides.add({
      name: `attn-${data.ID}`,
      category: `announcements`,
      label: data.title,
      weight: 0,
      isSticky: data.type === `${displayName}-sticky`,
      color: data.level,
      active: true,
      starts: moment(data.starts),
      expires: moment(data.expires),
      transitionIn: `fadeIn`,
      transitionOut: `fadeOut`,
      displayTime: data.displayTime || 15,
      fitContent: true,
      reset: true,
      html: `<div class="bg-dark">${data.announcement}</div>`,
    });
  }
}

function processWeeklyStats(data) {
  if (!isStudio) {
    slides.slides.get(
      `weekly-stats`
    ).html = `            <h1 style="text-align: center; font-size: 5vh">
    Analytics last 7 days
  </h1>

  <div class="container-fluid">
    <div class="row">
      <div class="col-7">
        <div
          class="card card-success"
          style="text-shadow: 1px 2px 1px rgba(0, 0, 0, 0.3)"
        >
          <div class="card-header">
            <h3 class="card-title" style="font-size: 4vh">
              Top 3 Shows
            </h3>
          </div>

          <div class="card-body">
            <div class="container-fluid">
              <div class="row p-1">
                <div class="col-1">
                  <img
                    src="/images/display/first.png"
                    style="height: 5vh; width: auto"
                  />
                </div>
                <div
                  class="col-11 text-warning text-weight-bold"
                  style="font-size: 3vh"
                >
                  ${data.topShows[0]}
                </div>
              </div>
              <div class="row p-1">
                <div class="col-1">
                  <img
                    src="/images/display/second.png"
                    style="height: 5vh; width: auto"
                  />
                </div>
                <div class="col-11" style="font-size: 3vh">
                ${data.topShows[1]}
                </div>
              </div>
              <div class="row p-1">
                <div class="col-1">
                  <img
                    src="/images/display/third.png"
                    style="height: 5vh; width: auto"
                  />
                </div>
                <div class="col-11" style="font-size: 3vh">
                ${data.topShows[2]}
                </div>
              </div>
            </div>
          </div>
          <!-- /.card-body -->

          <div class="card-footer">
            Based on online listeners : showtime ratio, FCC
            compliance, and messages sent / received
          </div>
        </div>
      </div>
      <div class="col-5">
        <div
          class="card card-info"
          style="text-shadow: 1px 2px 1px rgba(0, 0, 0, 0.3)"
        >
          <div class="card-header">
            <h3 class="card-title" style="font-size: 4vh">
              Other Top Stats
            </h3>
          </div>

          <div class="card-body">
            <div class="container-fluid">
              <div class="row p-1">
                <div class="col-5" style="font-size: 3vh">
                  Top Genre:
                </div>
                <div
                  class="col-7 text-warning text-weight-bold"
                  style="font-size: 3vh"
                >
                ${data.topGenre}
                </div>
              </div>
              <div class="row p-1">
                <div class="col-5" style="font-size: 3vh">
                  Top Playlist:
                </div>
                <div
                  class="col-7 text-warning text-weight-bold"
                  style="font-size: 3vh"
                >
                ${data.topPlaylist}
                </div>
              </div>
              <div class="row p-1">
                <div class="col-5" style="font-size: 3vh">
                  Peak Listeners:
                </div>
                <div
                  class="col-7 text-warning text-weight-bold"
                  style="font-size: 3vh"
                >
                  ${data.listenerPeak || 0} (${moment(
      data.listenerPeakTime
    ).format("MM/DD h:mm A")})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row" style="text-shadow: 1px 2px 1px rgba(0, 0, 0, 0.3)">
      <div class="col-3">
        <div class="small-box bg-danger">
          <div class="inner">
            <h3 style="font-size: 4vh;">${Math.round(data.onAir / 6) / 10}</h3>

            <p style="font-size: 3vh;">On-Air Hours<br /><small>Live, remote, sports, & prerecord</small></p>
          </div>
          <div class="icon">
            <i class="fas fa-microphone"></i>
          </div>
          <div class="small-box-footer" style="font-size: 2.5vh;">${
            Math.round((data.onAir / 60 / (24 * 7)) * 1000) / 10
          }% of the week</div>
        </div>
      </div>
      <div class="col-3">
        <div class="small-box bg-info">
          <div class="inner">
            <h3 style="font-size: 4vh;">${
              Math.round((data.listeners || 0) / 6) / 10
            }</h3>

            <p style="font-size: 3vh;">Online Listener Hours</p>
          </div>
          <div class="icon">
            <i class="fas fa-headphones"></i>
          </div>
          <div class="small-box-footer" style="font-size: 2.5vh;">
          ${
            data.listeners > 0
              ? Math.round((data.onAirListeners / data.listeners) * 1000) / 10
              : 0
          }% during On-Air Program
          </div>
        </div>
      </div>
      <div class="col-3">
        <div class="small-box bg-primary">
          <div class="inner">
            <h3 style="font-size: 4vh;">${data.tracksRequested}</h3>

            <p style="font-size: 3vh;">Track Requests Placed</p>
          </div>
          <div class="icon">
            <i class="fas fa-compact-disc"></i>
          </div>
          <div class="small-box-footer" style="font-size: 2.5vh;">${
            data.tracksLiked
          } Tracks Liked</div>
        </div>
      </div>
      <div class="col-3">
        <div class="small-box bg-success">
          <div class="inner">
            <h3 style="font-size: 4vh;">${
              data.webMessagesExchanged + data.discordMessagesExchanged
            }</h3>

            <p style="font-size: 3vh;">Messages Exchanged</p>
          </div>
          <div class="icon">
            <i class="fas fa-comments"></i>
          </div>
          <div class="small-box-footer" style="font-size: 2.5vh;">${
            data.discordMessagesExchanged
          } were in Discord</div>
        </div>
      </div>
    </div>
  </div>`;
  }
}

/**
 * Update director office hours
 */
function updateDirectorsCalendar() {
  clearTimeout(directorCalendarTimer);
  directorCalendarTimer = setTimeout(() => {
    try {
      let directorHours = {};

      Directors.db().each((director) => {
        directorHours[director.ID] = {
          director: director,
          hours: [],
          html: ``,
        };
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
          $(document).Toasts("create", {
            class: "bg-danger",
            title: "Calendar sort error",
            subtitle: trackID,
            autohide: true,
            delay: 10000,
            body: `There was a problem in the calendar sort function. Please report this to the engineer at wwsu4@wright.edu.`,
          });
        }
      };

      calendar
        .sort(compare)
        .filter((event) => event.type === "office-hours")
        .map((event) => {
          // null start or end? Use a default to prevent errors.
          if (!moment(event.start).isValid()) {
            event.start = moment(Meta.meta.time).startOf("day");
          }
          if (!moment(event.end).isValid()) {
            event.end = moment(Meta.meta.time).add(1, "days").startOf("day");
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
            event.startT += " " + moment(event.start).format("A");
          }
          event.endT =
            moment(event.end).minutes() === 0
              ? moment(event.end).format("h A")
              : moment(event.end).format("h:mm A");

          event.startD1 = moment(event.start).format("ddd");
          event.startD2 = moment(event.start).format("MM/DD");

          let html = `<div class="row">
          <div class="col-2">${event.startD1}</div>
          <div class="col-3">${event.startD2}</div>
          <div class="col-7">${event.startT} - ${event.endT}</div>
        </div>`;

          if (event.timeChanged) {
            html = `<div class="row">
            <div class="col-2">${event.startD1}</div>
            <div class="col-3">${event.startD2}</div>
          <div class="col-7 text-teal">${event.startT} - ${event.endT} (Temp Hours)</div>
        </div>`;
          }
          if (moment(Meta.meta.time).isAfter(moment(event.end))) {
            html = `<div class="row">
            <div class="col-2">${event.startD1}</div>
            <div class="col-3">${event.startD2}</div>
            <div class="col-7 text-muted"><s>${event.startT} - ${event.endT}</s> (Passed)</div>
          </div>`;
          }
          if (event.scheduleType && event.scheduleType.startsWith("canceled")) {
            html = `<div class="row">
            <div class="col-2">${event.startD1}</div>
            <div class="col-3">${event.startD2}</div>
            <div class="col-7 text-danger"><s>${event.startT} - ${event.endT}</s> (Canceled)</div>
          </div>`;
          }

          if (
            typeof directorHours[event.director] !== "undefined" &&
            typeof directorHours[event.director].hours !== "undefined"
          ) {
            directorHours[event.director].hours.push(html);
          }
        });

      // Build outer director HTML
      for (let key in directorHours) {
        if (!Object.prototype.hasOwnProperty.call(directorHours, key)) continue;

        directorHours[key].html = `
          <div class="col" style="min-width: 20.4vw; max-width: 20.4vw;">
                  <div
                    class="p-2 card card-${
                      directorHours[key].director.present
                        ? directorHours[key].director.present === 2
                          ? `indigo`
                          : `success`
                        : `danger`
                    } card-outline position-relative"
                  >
                    <div class="ribbon-wrapper ribbon-lg">
                    ${
                      directorHours[key].director.present
                        ? directorHours[key].director.present === 2
                          ? `<div
                        class="ribbon bg-indigo"
                        title="This director is currently doing remote hours."
                      >
                        REMOTE
                      </div>`
                          : `<div
                        class="ribbon bg-success"
                        title="This director is currently doing WWSU office hours."
                      >
                        IN OFFICE
                      </div>`
                        : `<div
                      class="ribbon bg-danger"
                      title="This director is currently clocked out."
                    >
                      OUT OF OFFICE
                    </div>`
                    }
                    </div>
                    <div class="card-body box-profile">
                      <div class="container-fluid">
                        <div class="row">
                          <div class="col-4 p-1">
                          ${
                            directorHours[key].director.avatar &&
                            directorHours[key].director.avatar !== ""
                              ? `<img class="profile-user-img img-fluid img-circle" width="48" src="/uploads/directors/${directorHours[key].director.avatar}">`
                              : `<div class="text-center">
                              <div class="bg-danger profile-user-img img-fluid img-circle">${jdenticon.toSvg(
                                `Director ${directorHours[key].director.name}`,
                                72
                              )}</div>
                              </div>`
                          }
                          </div>
                          <div class="col-8">
                            <p class="profile-username font-weight-bold" style="font-size: 2vh;">
                              ${directorHours[key].director.name}
                            </p>

                            <p class="text-warning" style="font-size: 1.66vh;">
                            ${directorHours[key].director.position}
                            </p>
                          </div>
                        </div>
                      </div>

                      <ul class="list-group list-group-unbordered mb-3">
                        <li class="list-group-item font-weight-bold">
                          <div class="container-fluid" style="font-size: 1.3vh;">
                            ${directorHours[key].hours.join("")}
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
          `;
      }

      // Director Office Hours slide
      let displayTime = 5;
      let innerHTML = ``;
      let directorsActive = false;

      for (let key in directorHours) {
        if (!Object.prototype.hasOwnProperty.call(directorHours, key)) continue;
        if (directorHours[key].director.assistant) continue;

        innerHTML += directorHours[key].html;
        displayTime += 3;
        directorsActive = true;
      }
      slides.slides.get(
        `hours-directors`
      ).html = `<h1 style="text-align: center; font-size: 5vh; text-shadow: 1px 2px 1px rgba(0, 0, 0, 0.3);">
        Director Office Hours (next 7 days)
      </h1>

      <div class="container-fluid" style="text-shadow: 1px 2px 1px rgba(0, 0, 0, 0.3);">
        <div class="row">
          ${innerHTML}
        </div>
      </div>
        `;
      slides.slides.get(`hours-directors`).displayTime = displayTime;
      slides.slides.get(`hours-directors`).active = directorsActive;

      // Assistant Director Office Hours slide
      displayTime = 5;
      innerHTML = ``;
      directorsActive = false;

      for (let key in directorHours) {
        if (!Object.prototype.hasOwnProperty.call(directorHours, key)) continue;
        if (!directorHours[key].director.assistant) continue;

        innerHTML += directorHours[key].html;
        displayTime += 3;
        directorsActive = true;
      }
      slides.slides.get(
        `hours-assistants`
      ).html = `<h1 style="text-align: center; font-size: 5vh; text-shadow: 1px 2px 1px rgba(0, 0, 0, 0.3);">
              Assistant Office Hours (next 7 days)
            </h1>
      
            <div class="container-fluid" style="text-shadow: 1px 2px 1px rgba(0, 0, 0, 0.3);">
              <div class="row">
                ${innerHTML}
              </div>
            </div>
              `;
      slides.slides.get(`hours-assistants`).displayTime = displayTime;
      slides.slides.get(`hours-assistants`).active = directorsActive;
    } catch (e) {
      console.error(e);
      $(document).Toasts("create", {
        class: "bg-danger",
        title: "Directors Calendar Error",
        subtitle: trackID,
        autohide: true,
        delay: 10000,
        body: `There was a problem loading director office hours. Please report this to the engineer at wwsu4@wright.edu.`,
      });
    }
  }, 1000);
}
