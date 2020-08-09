window.addEventListener("DOMContentLoaded", () => {
  try {
    // Sounds
    var sounds = {
      goingonair: new Howl({ src: ["/sounds/display/goingonair.mp3"] }),
      displaymessage: new Howl({ src: ["/sounds/display/displaymessage.mp3"] }),
      lifethreatening: new Howl({
        src: ["/sounds/display/lifethreatening.mp3"],
      }),
      live: new Howl({ src: ["/sounds/display/live.mp3"] }),
      remote: new Howl({ src: ["/sounds/display/remote.mp3"] }),
      severeeas: new Howl({ src: ["/sounds/display/severeeas.mp3"] }),
      sports: new Howl({ src: ["/sounds/display/sports.mp3"] }),
    };

    // Define hexrgb constants
    var hexChars = "a-f\\d";
    var match3or4Hex = `#?[${hexChars}]{3}[${hexChars}]?`;
    var match6or8Hex = `#?[${hexChars}]{6}([${hexChars}]{2})?`;
    var nonHexChars = new RegExp(`[^#${hexChars}]`, "gi");
    var validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, "i");

    // Define HTML elements
    var content = document.getElementById("slide");
    var djAlert = document.getElementById("dj-alert");
    var easAlert = document.getElementById("eas-alert");
    var nowplaying = document.getElementById("nowplaying");
    var nowplayingtime = document.getElementById("nowplaying-time");
    var nowplayingline1 = document.getElementById("nowplaying-line1");
    var nowplayingline2 = document.getElementById("nowplaying-line2");
    var wrapper = document.getElementById("wrapper");

    // Define data sources and connections
    var socket = io.sails.connect();
    var noReq = new WWSUreq(socket, `display-public`);
    var Meta = new WWSUMeta(socket, noReq);
    var Calendar = new WWSUcalendar(socket, Meta, noReq);
    var calendar = [];
    var Announcements = new WWSUannouncements(
      socket,
      noReq,
      ["display-public", "display-public-sticky"],
      Meta
    );
    var Directors = new WWSUdirectors(socket, noReq);
    var Eas = new WWSUeas(socket, noReq, null, Meta);
    var Darksky = new WWSUdb(TAFFY()); // DEPRECATED
    var darkskyWorker = new Worker(
      "../../plugins/wwsu-display/workers/publicDarksky.js"
    );
    var Recipients = new WWSUrecipientsweb(socket, noReq);
    var sportsdb = new WWSUdb(TAFFY());

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
    Darksky.assignSocketEvent("darksky", socket);
    Darksky.on("change", "renderer", (db) => processDarksky(db));
    Announcements.on("update", "renderer", (data) => {
      Slides.removeSlide(`attn-${data.ID}`);
      createAnnouncement(data);
      checkSlideCounts();
    });
    Announcements.on("insert", "renderer", (data) => {
      createAnnouncement(data);
      checkSlideCounts();
    });
    Announcements.on("remove", "renderer", (data) => {
      Slides.removeSlide(`attn-${data}`);
      checkSlideCounts();
    });
    Announcements.on("replace", "renderer", (db) => {
      // Remove all announcement slides
      Slides.allSlides()
        .filter((slide) => slide.name.startsWith(`attn-`))
        .map((slide) => Slides.removeSlide(slide.name));

      // Add slides for each announcement
      db.each((data) => createAnnouncement(data));
      checkSlideCounts();
    });

    socket.on("connect", () => {
      Recipients.addRecipientDisplay("display-public", (data, success) => {
        if (success) {
          Meta.init();
          Calendar.init();
          Directors.init();
          Eas.init();
          Announcements.init();
          darkskySocket();
          weeklyDJSocket();
          if (disconnected) {
            // noConnection.style.display = "none";
            disconnected = false;
            clearTimeout(restart);
          }
        } else {
          iziToast.show({
            title: "Failed to Connect",
            message:
              "Failed to connect to WWSU; recipients registration failed.",
            timeout: false,
          });
        }
      });
    });

    socket.on("disconnect", () => {
      console.log("Lost connection");
      try {
        io.socket._raw.io._reconnection = true;
        io.socket._raw.io._reconnectionAttempts = Infinity;
      } catch (e) {
        console.error(e);
        iziToast.show({
          title: "An error occurred - Please check the logs",
          message:
            "Error occurred trying to make socket reconnect indefinitely.",
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
      window.location.reload(true);
    });

    socket.on("messages", (data) => {
      for (var key in data) {
        if (
          Object.prototype.hasOwnProperty.call(data, key) &&
          key === "insert"
        ) {
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
          if (!isStudio) {
            sounds.displaymessage.play();
          }
        }
      }
    });

    socket.on("analytics-weekly-dj", (data) => {
      try {
        processWeeklyStats(data);
      } catch (e) {
        iziToast.show({
          title: "An error occurred - Please check the logs",
          message: "Error occurred on analytics-weekly-dj event.",
        });
        console.error(e);
      }
    });

    // Prepare other variables
    var newEas = [];
    var prevEas = [];
    var easActive = false;
    // LINT LIES: easDelay is used.
    // eslint-disable-next-line no-unused-vars
    var easDelay = 5;
    var easExtreme = false;

    // Define additional variables
    var flashInterval = null;
    var disconnected = true;
    var slides = {};
    // LINT LIES: directorpresent is used.
    // eslint-disable-next-line no-unused-vars
    var directorpresent = false;
    var nowPlayingTimer;
    var calendarTimer;
    var temp;
    var queueUnknown = false;
    var isStudio = window.location.search.indexOf("studio=true") !== -1;
    var isLightTheme = false;
    var weatherSlide = [
      {
        id: `weather`,
        icon: `fa-sun`,
        background: `#424242`,
        header: `Current Weather`,
        body: `Unknown`,
        show: true,
      },
      {
        id: `precipitation`,
        icon: `fa-umbrella`,
        background: `#424242`,
        header: `Precipitation`,
        body: ``,
        show: false,
      },
      {
        id: `wind`,
        icon: `fa-wind`,
        background: `#424242`,
        header: `Wind`,
        body: ``,
        show: false,
      },
      {
        id: `uv`,
        icon: `fa-sun`,
        background: `#424242`,
        header: `UV Index`,
        body: ``,
        show: false,
      },
      {
        id: `visibility`,
        icon: `fa-car`,
        background: `#424242`,
        header: `Visibility`,
        body: ``,
        show: false,
      },
      {
        id: `windchill`,
        icon: `fa-temperature-low`,
        background: `#424242`,
        header: `Wind Chill`,
        body: ``,
        show: false,
      },
      {
        id: `heatindex`,
        icon: `fa-temperature-high`,
        background: `#424242`,
        header: `Heat Index`,
        body: ``,
        show: false,
      },
    ];
    var weatherSlideSlot = -1;

    // Change weather block every 7 seconds
    setInterval(() => {
      var done = false;

      if (weatherSlide.length === 0) {
        return null;
      }

      while (!done) {
        weatherSlideSlot++;
        if (typeof weatherSlide[weatherSlideSlot] === `undefined`) {
          weatherSlideSlot = 0;
        }

        if (weatherSlide[weatherSlideSlot].show || weatherSlideSlot === 0) {
          document.querySelector(`#weather-background`).style.background =
            weatherSlide[weatherSlideSlot].background;
          document.querySelector(
            `#weather-icon`
          ).innerHTML = `<i class="fas ${weatherSlide[weatherSlideSlot].icon}" style="font-size: 64px;"></i>`;
          document.querySelector(
            `#weather-header`
          ).innerHTML = `<strong>${weatherSlide[weatherSlideSlot].header}</strong>`;
          document.querySelector(`#weather-body`).innerHTML =
            weatherSlide[weatherSlideSlot].body;
          done = true;
        }
      }
    }, 7000);

    if (isLightTheme) {
      document.body.style.backgroundColor = `#ffffff`;
      document.body.style.color = `#000000`;
      temp = document.querySelector(`#bg-canvas`);
      temp.style.opacity = 0.5;
      temp = document.querySelector(`#dj-alert`);
      temp.style.backgroundColor = `#ffffff`;
    }
    var queueReminder = false;

    wrapper.width = window.innerWidth;
    wrapper.height = window.innerHeight;

    // Initialize slides
    Slides = Slides(Meta);

    if (!isStudio) {
      Slides.newSlide({
        name: `weekly-stats`,
        label: `Weekly Stats`,
        weight: 1000000,
        isSticky: false,
        color: `success`,
        active: true,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 15,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 7vh; color: #FFFFFF">Analytics last 7 days</h1><div style="overflow-y: hidden; overflow-x: hidden; font-size: 3vh;" class="container-full p-2 m-1 text-white scale-content" id="analytics"></div>`,
      });
    }

    // On the Air
    Slides.newSlide({
      name: `on-air`,
      label: `On the Air`,
      weight: 999999,
      isSticky: false,
      color: `primary`,
      active: false,
      transitionIn: `fadeIn`,
      transitionOut: `fadeOut`,
      displayTime: 10,
      fitContent: false,
      html: `<h1 style="text-align: center; font-size: 4vh; color: ${
        !isLightTheme ? `#ffffff` : `#000000`
      }">On the Air Right Now</h1><div id="ontheair"></div>`,
      fnStart: (slide) => {
        if (calendar.length > 0) {
          calendar
            .filter(
              (event) =>
                event.unique === Meta.calendarUnique && event.active > 0
            )
            .map((event) => {
              var temp1 = document.querySelector(`#${event.ID}`);
              if (temp1 !== null) {
                temp1.classList.add(`pulsate-alert`);
              }
            });
        }
      },
      fnEnd: (slide) => {
        if (calendar.length > 0) {
          calendar
            .filter(
              (event) =>
                event.unique === Meta.calendarUnique && event.active > 0
            )
            .map((event) => {
              var temp1 = document.querySelector(`#${event.ID}`);
              if (temp1 !== null) {
                temp1.classList.remove(`pulsate-alert`);
              }
            });
        }
      },
    });

    // Weather alerts
    Slides.newSlide({
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
      }">Clark, Greene, and Montgomery counties</h2><div style="overflow-y: hidden;" class="d-flex flex-wrap" id="eas-alerts"></div>`,
    });

    // Promote Random Radio Shows and Events
    Slides.newSlide({
      name: `show-info`,
      label: `Events`,
      weight: -1,
      isSticky: false,
      color: `primary`,
      active: true,
      transitionIn: `fadeIn`,
      transitionOut: `fadeOut`,
      displayTime: 10,
      fitContent: false,
      reset: true,
      html: `<h2 style="text-align: center; font-size: 5vh; text-shadow: 1px 2px 1px rgba(0,0,0,0.3); color: ${
        !isLightTheme ? `#ffffff` : `#000000`
      };" id="promote-show-name"></h2><h3 style="text-align: center; font-size: 4vh; color: ${
        !isLightTheme ? `#ffffff` : `#000000`
      }; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="promote-show-time"></h3><div style="overflow-y: hidden; font-size: 4.5vh; color: ${
        !isLightTheme ? `#ffffff` : `#000000`
      }; height: 45vh;" class="${
        !isLightTheme ? `bg-dark-4 text-white` : `bg-light-1 text-dark`
      } p-1 m-1 shadow-8" id="promote-show-topic"></div>`,
      fnStart: (slide) => {
        slide.displayTime = 10;
        var tcalendar = calendar.filter((event) => event.active > 0);
        if (tcalendar.length > 0) {
          var index = Math.floor(Math.random() * tcalendar.length);
          if (typeof tcalendar[index] !== "undefined") {
            slide.displayTime =
              tcalendar[index].topic !== null
                ? 10 + Math.floor(tcalendar[index].topic.length / 20)
                : 10;
            var temp1 = document.querySelector("#promote-show-name");
            if (temp1 !== null) {
              temp1.innerHTML = `<strong>${tcalendar[index].name}</strong>`;
            }
            temp1 = document.querySelector("#promote-show-time");
            if (temp1 !== null) {
              temp1.innerHTML = tcalendar[index].time;
            }
            temp1 = document.querySelector("#promote-show-topic");
            if (temp1 !== null) {
              temp1.innerHTML = tcalendar[index].topic;
            }
            temp1 = document.querySelector(`#${tcalendar[index].ID}`);
            if (temp1 !== null) {
              temp1.classList.add(`pulsate-alert`);
            }
          }
        }
      },
      fnEnd: (slide) => {
        var temp1 = document.querySelector("#promote-show-name");
        if (temp1 !== null && calendar.length > 0) {
          calendar
            .filter((event) => event.active > 0)
            .map((event) => {
              var temp1 = document.querySelector(`#${event.ID}`);
              if (temp1 !== null) {
                temp1.classList.remove(`pulsate-alert`);
              }
            });
        }
      },
    });

    // Create restart function to restart the screen after 15 seconds if it does not connect.
    var restart = setTimeout(() => {
      window.location.reload(true);
    }, 15000);

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

    // Burnguard is the line that sweeps across the screen to prevent screen burn-in
    var $burnGuard = $("<div>")
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

    var colors = ["#FF0000", "#00FF00", "#0000FF"];
    var Scolor = 0;
    var delay = 300000;
    var scrollDelay = 15000;
  } catch (e) {
    console.error(e);
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message:
        "Error occurred when setting up initial variables and/or burnguard.",
    });
  }

  function burnGuardAnimate() {
    try {
      Scolor = ++Scolor % 3;
      var rColor = colors[Scolor];
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

  $.fn.extend({
    animateCss: function (animationName, callback) {
      var animationEnd = (function (el) {
        var animations = {
          animation: "animationend",
          OAnimation: "oAnimationEnd",
          MozAnimation: "mozAnimationEnd",
          WebkitAnimation: "webkitAnimationEnd",
        };

        for (var t in animations) {
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

  function darkskySocket() {
    console.log("attempting darksky socket");
    try {
      Darksky.replaceData(noReq, "/darksky/get");
    } catch (unusedE) {
      console.log("FAILED CONNECTION");
      setTimeout(darkskySocket, 10000);
    }
  }

  // Process Director data when received by updating local database and marking if a director is present.
  function processDirectors(db) {
    // Run data manipulation process
    try {
      // Check for present directors
      directorpresent = false;
      db.each((director) => {
        try {
          if (director.present) {
            directorpresent = true;
          }
        } catch (e) {
          console.error(e);
          iziToast.show({
            title: "An error occurred - Please check the logs",
            message: `Error occurred during Directors iteration in processDirectors.`,
          });
        }
      });
    } catch (e) {
      console.error(e);
      iziToast.show({
        title: "An error occurred - Please check the logs",
        message: "Error occurred during the call of processDirectors.",
      });
    }
  }

  function updateCalendar() {
    // Do a 1 second timer to prevent frequent calendar updates
    clearTimeout(calendarTimer);
    calendarTimer = setTimeout(() => {
      Calendar.getEvents(
        (events) => {
          var noEvents = true;
          var activeEvents = 0;
          var innercontent = ``;
          var today = [];
          events
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
                moment(event.end).isAfter(moment(Meta.meta.time))
            )
            .sort(
              (a, b) => moment(a.start).valueOf() - moment(b.start).valueOf()
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
                  .format("MM/DD hh:mm A");

                var color = hexRgb(event.color);
                var line1;
                var line2;
                var image;

                if (
                  ["canceled", "canceled-system", "canceled-changed"].indexOf(
                    event.scheduleType
                  ) !== -1
                ) {
                  color = hexRgb(`#161616`);
                }
                color.red = Math.round(color.red / 3);
                color.green = Math.round(color.green / 3);
                color.blue = Math.round(color.blue / 3);
                var badgeInfo = ``;
                if (["canceled-changed"].indexOf(event.scheduleType) !== -1) {
                  badgeInfo = `<span class="text-white" style="font-size: 1vh;"><strong>${event.scheduleReason}</strong></span>`;
                }
                if (
                  ["updated", "updated-system"].indexOf(event.scheduleType) !==
                    -1 &&
                  event.timeChanged
                ) {
                  badgeInfo = `<span class="text-white" style="font-size: 1vh;"><strong>Updated Time (temporary)</strong></span>`;
                }
                if (
                  ["canceled", "canceled-system"].indexOf(
                    event.scheduleType
                  ) !== -1
                ) {
                  badgeInfo = `<span class="text-white" style="font-size: 1vh;"><strong>CANCELED</strong></span>`;
                } else if (event.scheduleType !== "canceled-changed") {
                  activeEvents++;
                }
                line1 = event.hosts;
                line2 = event.name;
                if (event.type === "show") {
                  image = `<i class="fas fa-microphone text-white" style="font-size: 36px;"></i>`;
                } else if (event.type === "prerecord") {
                  image = `<i class="fas fa-play-circle text-white" style="font-size: 36px;"></i>`;
                } else if (event.type === "remote") {
                  image = `<i class="fas fa-broadcast-tower text-white" style="font-size: 36px;"></i>`;
                } else if (event.type === "sports") {
                  image = `<i class="fas fa-trophy text-white" style="font-size: 36px;"></i>`;
                } else {
                  image = `<i class="fas fa-calendar text-white" style="font-size: 36px;"></i>`;
                }

                color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
                innercontent += `
                      <div class="row shadow-2 m-1" style="background: ${color}; font-size: 1.5vh; border-color: #F9D91C;" id="calendar-event-${
                  event.unique
                }">
                          <div class="col-2 text-white">
                              ${image}
                          </div>
                          <div class="col-10 text-white">
                              <strong>${line1}${
                  line1 !== "" ? ` - ` : ``
                }${line2}</strong><br />
                              ${event.startT} - ${event.endT}<br />
                              ${badgeInfo}
                          </div>
                      </div>`;
                noEvents = false;
                today.push({
                  name: event.name,
                  type: event.type,
                  active:
                    ["canceled", "canceled-system", "canceled-changed"].indexOf(
                      event.scheduleType
                    ) === -1,
                  ID: `calendar-event-${event.unique}`,
                  topic: event.description,
                  time: `${event.startT} - ${event.endT}`,
                });
              } catch (e) {
                console.error(e);
                innercontent = `
                  <div class="row m-1" style="font-size: 1.5vh;">
                      <div class="col text-white">
                          <strong>Error fetching events!</strong>
                      </div>
                  </div>`;
              }
            });

          if (noEvents) {
            innercontent = `
                      <div class="row m-1" style="font-size: 1.5vh;">
                          <div class="col text-white">
                              <strong>No events next 24 hours</strong>
                          </div>
                      </div>`;
          }

          var _innercontent = document.getElementById("events-today");
          _innercontent.innerHTML = innercontent;
          calendar = today;
          if (activeEvents > 0 && Meta.state.startsWith("automation_")) {
            Slides.slide(`show-info`).active = true;
          } else {
            Slides.slide(`show-info`).active = false;
          }
        },
        undefined,
        moment.parseZone(Meta.meta.time).add(1, "days").toISOString(true)
      );
    }, 1000);
  }

  // Check for new Eas alerts and push them out when necessary.
  function processEas(db) {
    // Data processing
    try {
      // Check to see if any alerts are extreme, and update our previous Eas ID array
      easExtreme = false;

      prevEas = [];
      var innercontent = ``;

      // eslint-disable-next-line no-unused-vars
      var makeActive = false;
      // eslint-disable-next-line no-unused-vars
      var displayTime = 7;

      db.each((dodo) => {
        try {
          prevEas.push(dodo.ID);

          makeActive = true;
          displayTime += 4;

          if (dodo.severity === "Extreme") {
            easExtreme = true;
          }

          var color =
            typeof dodo.color !== "undefined" &&
            /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(dodo.color)
              ? hexRgb(dodo.color)
              : hexRgb("#787878");
          var borderclass = "black";
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
          // LINT LIES: This variable is used.
          // eslint-disable-next-line no-unused-vars
          color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
          if (isLightTheme) {
            color = `rgb(${color.red / 4 + 191}, ${color.green / 4 + 191}, ${
              color.blue / 4 + 191
            });`;
          }
          innercontent += `<div style="width: 32%;" class="d-flex align-items-stretch m-1 ${
            !isLightTheme ? `text-white` : `text-dark`
          } border border-${borderclass} rounded shadow-4 ${
            !isLightTheme ? `bg-dark-4` : `bg-light-1`
          }">
                        <div class="m-1" style="text-align: center; width: 100%"><span class="${
                          !isLightTheme ? `text-white` : `text-dark`
                        }" style="font-size: 1.5em;">${
            typeof dodo["alert"] !== "undefined"
              ? dodo["alert"]
              : "Unknown Alert"
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
            message: `Error occurred during Eas iteration in processEas.`,
          });
        }
      });

      if (prevEas.length === 0) {
        innercontent = `<strong class="text-white">No active alerts</strong>`;
      }

      Slides.slide(`eas-alerts`).active = makeActive;
      Slides.slide(`eas-alerts`).displayTime = displayTime;
      Slides.slide(
        `eas-alerts`
      ).html = `<h1 style="text-align: center; font-size: 3em; color: ${
        !isLightTheme ? `#ffffff` : `#000000`
      }">WWSU EAS - Active Alerts</h1><h2 style="text-align: center; font-size: 1.5em; color: ${
        !isLightTheme ? `#ffffff` : `#000000`
      }">Clark, Greene, and Montgomery counties of Ohio</h2><div style="overflow-y: hidden;" class="d-flex flex-wrap">${innercontent}</div>`;
      checkSlideCounts();

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

          var alert =
            typeof newEas[0]["alert"] !== "undefined"
              ? newEas[0]["alert"]
              : "Unknown Alert";
          var text =
            typeof newEas[0]["information"] !== "undefined"
              ? newEas[0]["information"].replace(/[\r\n]+/g, " ")
              : "There was an error attempting to retrieve information about this alert. Please check the National Weather Service or your local civil authorities for details about this alert.";
          var color2 =
            typeof newEas[0]["color"] !== "undefined" &&
            /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(newEas[0]["color"])
              ? hexRgb(newEas[0]["color"])
              : hexRgb("#787878");
          var color3 =
            typeof newEas[0]["color"] !== "undefined" &&
            /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(newEas[0]["color"])
              ? hexRgb(newEas[0]["color"])
              : hexRgb("#787878");
          color3.red = Math.round(color3.red / 2);
          color3.green = Math.round(color3.green / 2);
          color3.blue = Math.round(color3.blue / 2);
          color3 = `rgb(${color3.red}, ${color3.green}, ${color3.blue})`;
          var color4 =
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
                    <h1 style="font-size: 3em;">WWSU Emergency Alert System</h1>
                    <div id="eas-alert-text" class="m-3 text-white" style="font-size: 6em;">${alert}</div>
                    <div class="m-1 text-white" style="font-size: 2em;">Effective ${
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
                    <div class="m-1 text-white" style="font-size: 2em;">for the counties ${
                      typeof newEas[0]["counties"] !== "undefined"
                        ? newEas[0]["counties"]
                        : "Unknown Counties"
                    }</div>
                    <div id="alert-marquee" class="marquee m-3 shadow-4" style="color: #FFFFFF; background: rgb(${Math.round(
                      color2.red / 4
                    )}, ${Math.round(color2.green / 4)}, ${Math.round(
            color2.blue / 4
          )}); font-size: 2.5em;">${text}</div>
                    </div></div>`;
          if (!isStudio) {
            sounds.severeeas.play();
          }
          if (easExtreme) {
            easAlert.style.display = "inline";
            easAlert.innerHTML += `<h2 style="text-align: center; font-size: 2em;" class="text-white"><strong>LIFE-THREATENING ALERTS IN EFFECT!</strong> Please stand by for details...</h2>`;
          }
          $("#alert-marquee")
            .bind("finished", () => {
              try {
                easActive = false;
                var temp = document.getElementById("alert-marquee");
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
              speed: 180,
              // gap in pixels between the tickers
              gap: 50,
              // time in milliseconds before the marquee will start animating
              delayBeforeStart: 2000,
              // 'left' or 'right'
              direction: "left",
              // true or false - should the marquee be duplicated to show an effect of continues flow
              duplicated: false,
            });
          /*
        clearInterval(flashInterval);
        flashInterval = setInterval(function () {
            var temp = document.querySelector(`#eas-alert-text`);
            if (temp !== null)
                temp.className = "m-3 animated pulse fast";
            setTimeout(() => {
                var temp = document.querySelector(`#eas-alert-text`);
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
        var voiceCount = 180;
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
              if (!isStudio) {
                sounds.lifethreatening.play();
              }
            }
          }, 250);
        }, 1000);

        // Display the extreme alerts
        easAlert.style.display = "inline";
        easAlert.innerHTML = `<div id="slide-interrupt-eas">
            <h1 style="text-align: center; font-size: 3em; color: ${
              !isLightTheme ? `#ffffff` : `#000000`
            };">WWSU Emergency Alert System</h1>
            <h2 style="text-align: center; font-size: 3em;" class="${
              !isLightTheme ? `text-white` : `text-dark`
            }">Extreme Alerts in effect</h2>
            <h2 style="text-align: center; font-size: 3em;" class="${
              !isLightTheme ? `text-white` : `text-dark`
            }">SEEK SHELTER NOW!!!</h2>
            <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="alerts"></div></div>`;
        var innercontent = document.getElementById("alerts");
        Eas.find({ severity: "Extreme" }).forEach((dodo) => {
          try {
            var color = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(dodo.color)
              ? hexRgb(dodo.color)
              : hexRgb("#787878");
            var borderclass = "black";
            borderclass = "danger";
            color = `rgb(${Math.round(color.red / 4)}, ${Math.round(
              color.green / 4
            )}, ${Math.round(color.blue / 4)});`;
            innercontent.innerHTML += `<div style="width: 32%;${
              !isLightTheme ? `background-color: ${color}` : ``
            }" class="d-flex align-items-stretch m-1 ${
              !isLightTheme ? `text-white` : `text-dark bg-light-1`
            } border border-${borderclass} rounded shadow-4">
                        <div class="m-1" style="text-align: center; width: 100%"><span style="font-size: 1.5em;">${
                          typeof dodo["alert"] !== "undefined"
                            ? dodo["alert"]
                            : "Unknown Alert"
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
            }</span><br />
                        </div>
                        `;
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
            case "automation_genre":
            case "automation_break":
              nowplaying.style.background = "#1F285A";
              break;
            case "automation_playlist":
              nowplaying.style.background = "#014D72";
              break;
            case "automation_prerecord":
            case "automation_live":
            case "automation_remote":
            case "automation_sports":
            case "automation_sportsremote":
              nowplaying.style.background = "#312607";
              break;
            case "live_on":
            case "live_break":
            case "live_returning":
              nowplaying.style.background = "#6A0000";
              break;
            case "prerecord_on":
            case "prerecord_break":
              nowplaying.style.background = "#5C312E";
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
              nowplaying.style.background = "#054021";
              break;
            case "remote_on":
            case "remote_break":
            case "remote_returning":
              nowplaying.style.background = "#471255";
              break;
            default:
              nowplaying.style.background = "#191919";
          }

          if (calendar.length > 0 && response.state.startsWith("automation_")) {
            Slides.slide(`show-info`).active = true;
          } else {
            Slides.slide(`show-info`).active = false;
          }
        }

        // First, process now playing information
        easDelay -= 1;
        var temp;
        var countdown;
        var countdowntext;
        var countdownclock;

        if (disconnected || typeof Meta.state === "undefined") {
          djAlert.style.display = "none";
        }
        if (
          typeof response.state !== `undefined` ||
          typeof response.topic !== `undefined` ||
          typeof response.show !== `undefined`
        ) {
          /*
                if (Meta.state.startsWith("live_") || Meta.state.startsWith("remote_"))
                {
                    var temp = Meta.show.split(" - ");
                    Slides.slide(`be-a-dj`).html = `<div style="text-align: center; width: 100%; font-size: 4em; color: #FFFFFF; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Interested in being <div class="text-warning jump-text">on the air</div>just like <span class="text-danger">${temp[0]}</span>?</div>
                            <div id="thebottom">
                            <div style="text-align: center; font-size: 3em; color: #FFFFFF; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Send an email to <span class="text-primary">production@wwsu1069.org</span>!</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">Class/training is free, is online, and generally only takes a few weeks.</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">You must be enrolled in at least 6 credit hours (3 for graduates) at Wright State.</div>
            </div>
            </div>`;
                } else if (Meta.state.startsWith("sports_") || Meta.state.startsWith("sportsremote_"))
                {
                    Slides.slide(`be-a-dj`).html = `<div style="text-align: center; width: 100%; font-size: 4em; color: #FFFFFF; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Want to be a <div class="text-success jump-text">sports broadcaster?</div></div>
                            <div id="thebottom">
                            <div style="text-align: center; font-size: 3em; color: #FFFFFF; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Send an email to <span class="text-primary">sports@wwsu1069.org</span>!</div>
            </div>
            </div>`;
                } else {
                    Slides.slide(`be-a-dj`).html = `<div style="text-align: center; width: 100%; font-size: 4em; color: #FFFFFF; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Interested in becoming a<div class="text-warning jump-text">DJ / radio personality?</div></div>
                            <div id="thebottom">
                            <div style="text-align: center; font-size: 3em; color: #FFFFFF; 2px 4px 3px rgba(0,0,0,0.3);">Send an email to <span class="text-primary">production@wwsu1069.org</span>!</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF; 1px 2px 2px rgba(0,0,0,0.3);">Class/training is free, is online, and generally only takes a few weeks.</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF; 1px 2px 2px rgba(0,0,0,0.3);">You must be enrolled in at least 6 credit hours (3 for graduates) at Wright State.</div>
            </div>
            </div>`
                }
                */
          if (
            Meta.meta.state.startsWith("live_") ||
            Meta.meta.state.startsWith("remote_") ||
            Meta.meta.state.startsWith("sports_") ||
            Meta.meta.state.startsWith("sportsremote_") ||
            Meta.meta.state.startsWith("prerecord_")
          ) {
            Slides.slide(`on-air`).active = true;
            checkSlideCounts();
            var innercontent = ``;
            if (Meta.meta.topic.length > 2) {
              Slides.slide(`on-air`).displayTime = 20;
              innercontent = `<h2 style="text-align: center; font-size: 5vh; text-shadow: 1px 2px 1px rgba(0,0,0,0.3); color: ${
                !isLightTheme ? `#ffffff` : `#000000`
              };"><strong>${Meta.meta.show}</strong></h2>`;
              if ("webchat" in Meta.meta && Meta.meta.webchat) {
                innercontent += `<h3 style="text-align: center; font-size: 4vh; color: ${
                  !isLightTheme ? `#ffffff` : `#000000`
                }; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);">Tune in & Chat with the DJ: <string>wwsu1069.org</strong></h3>`;
              } else {
                innercontent += `<h3 style="text-align: center; font-size: 4vh; color: ${
                  !isLightTheme ? `#ffffff` : `#000000`
                }; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);">Tune in: <strong>wwsu1069.org</strong></h3>`;
              }
              innercontent += `<div style="overflow-y: hidden; font-size: 4.5vh; color: ${
                !isLightTheme ? `#ffffff` : `#000000`
              }; height: 45vh;" class="${
                !isLightTheme ? `bg-dark-4 text-white` : `bg-light-1 text-dark`
              } p-1 m-1 shadow-8">${Meta.meta.topic}</div>`;
            } else {
              Slides.slide(`on-air`).displayTime = 10;
              innercontent = `<h2 style="text-align: center; font-size: 5vh; text-shadow: 1px 2px 1px rgba(0,0,0,0.3); color: ${
                !isLightTheme ? `#ffffff` : `#000000`
              };"><strong>${Meta.meta.show}</strong></h2>`;
              if ("webchat" in Meta.meta && Meta.meta.webchat) {
                innercontent += `<h3 style="text-align: center; font-size: 4vh; color: ${
                  !isLightTheme ? `#ffffff` : `#000000`
                }; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);">Tune in & Chat with the DJ: <strong>wwsu1069.org</strong></h3>`;
              } else {
                innercontent += `<h3 style="text-align: center; font-size: 4vh; color: ${
                  !isLightTheme ? `#ffffff` : `#000000`
                }; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);">Tune in: <strong>wwsu1069.org</strong></h3>`;
              }
            }
            Slides.slide(
              `on-air`
            ).html = `<h1 style="text-align: center; font-size: 4vh; color: ${
              !isLightTheme ? `#ffffff` : `#000000`
            }">On the Air Right Now</h1>${innercontent}</div>`;
          } else {
            Slides.slide(`on-air`).active = false;
            checkSlideCounts();
          }
        }
        var countDown =
          Meta.meta.countdown !== null
            ? Math.round(
                moment(Meta.meta.countdown).diff(moment(Meta.meta.time), "seconds")
              )
            : 1000000;
        if (countDown < 0) {
          countDown = 0;
        }
        if (countDown > 29) {
          queueReminder = false;
        }
        if (typeof response.line1 !== "undefined") {
          var line1Timer = setTimeout(() => {
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
          var line2Timer = setTimeout(() => {
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
            : moment.tz(Meta.meta.time, Meta.meta ? Meta.meta.timezone : moment.tz.guess()).format("LLLL") || "Unknown WWSU Time"
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
            djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: ${
              !isLightTheme ? `#ffffff` : `#000000`
            };" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="countdown-text"></h1>
                    <div class="m-3 bg-primary text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div>
                    </div></div>`;
            countdown = document.getElementById("countdown");
            countdowntext = document.getElementById("countdown-text");
            countdownclock = document.getElementById("countdown-clock");
            countdowntext.innerHTML = `<span class="text-danger">${temp[0]}</span><br />is going live in`;
            if (!isStudio) {
              sounds.live.play();
            }
          }
          countdownclock.innerHTML = countDown;
          if (countDown <= 10) {
            if (!queueReminder && isStudio) {
              sounds.goingonair.play();
            }
            queueReminder = true;
            if (!isStudio) {
              $("#dj-alert").css("background-color", "#F44336");
              setTimeout(() => {
                $("#dj-alert").css(
                  "background-color",
                  !isLightTheme ? `#000000` : `#ffffff`
                );
              }, 250);
            }
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
            djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: ${
              !isLightTheme ? `#ffffff` : `#000000`
            };" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-purple text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div></div></div>`;
            countdown = document.getElementById("countdown");
            countdowntext = document.getElementById("countdown-text");
            countdownclock = document.getElementById("countdown-clock");
            countdowntext.innerHTML = "Remote Broadcast starting in";
            if (!isStudio) {
              sounds.remote.play();
            }
          }
          countdownclock.innerHTML = countDown;
          // Sports broadcast about to begin
        } else if (
          (Meta.meta.state === "automation_sports" ||
            Meta.meta.state.startsWith("sports_") ||
            Meta.meta.state === "automation_sportsremote" ||
            Meta.meta.state.startsWith("sportsremote_")) &&
          countDown < 60 &&
          (!Meta.queueCalculating || djAlert.style.display === "inline")
        ) {
          djAlert.style.display = "inline";
          countdown = document.getElementById("countdown");
          countdowntext = document.getElementById("countdown-text");
          countdownclock = document.getElementById("countdown-clock");
          if (!countdown || !countdowntext || !countdownclock) {
            djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: ${
              !isLightTheme ? `#ffffff` : `#000000`
            };" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-success text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div></div></div>`;
            countdown = document.getElementById("countdown");
            countdowntext = document.getElementById("countdown-text");
            countdownclock = document.getElementById("countdown-clock");
            countdowntext.innerHTML = `<span class="text-success">${Meta.show}</span><br />about to broadcast in`;
            if (!isStudio) {
              sounds.sports.play();
            }
          }
          countdownclock.innerHTML = countDown;
          if (
            Meta.meta.state === "automation_sports" ||
            Meta.meta.state.startsWith("sports_")
          ) {
            if (countDown <= 10) {
              if (!queueReminder && isStudio) {
                sounds.goingonair.play();
              }
              queueReminder = true;
              if (!isStudio) {
                $("#dj-alert").css("background-color", "#4CAF50");
                setTimeout(() => {
                  $("#dj-alert").css(
                    "background-color",
                    !isLightTheme ? `#000000` : `#ffffff`
                  );
                }, 250);
              }
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
    if (data.type.startsWith(`display-public`)) {
      Slides.newSlide({
        name: `attn-${data.ID}`,
        label: data.title,
        weight: 0,
        isSticky: data.type === `display-public-sticky`,
        color: data.level,
        active: true,
        starts: moment(data.starts),
        expires: moment(data.expires),
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: data.displayTime || 15,
        fitContent: true,
        html: `<div style="overflow-y: hidden; box-shadow: 1px 2px 1px rgba(0, 0, 0, 0.3);" class="${
          !isLightTheme ? `text-white bg-dark-2` : `text-dark bg-light-3`
        }">${data.announcement}</div>`,
      });
    }
  }

  function checkSlideCounts() {
    /*
     var slideCount = 8;
     if (!Slides.slide(`events-2-4`).active)
     slideCount--;
     if (!Slides.slide(`events-5-7`).active)
     slideCount--;
     if (Slides.countActive() >= slideCount)
     {
     Slides.slide(`events-2-4`).active = false;
     Slides.slide(`events-5-7`).active = false;
     } else {
     Slides.slide(`events-2-4`).active = true;
     Slides.slide(`events-5-7`).active = true;
     }
     */
  }

  function processDarksky(db) {
    // Run data manipulation process
    try {
      darkskyWorker.postMessage([
        db.get(),
        moment(Meta.time).toISOString(true),
      ]);
    } catch (e) {
      console.error(e);
      iziToast.show({
        title: "An error occurred - Please check the logs",
        message: "Error occurred during the call of processDirectors.",
      });
    }
  }

  darkskyWorker.onmessage = function (e) {
    switch (e.data[0]) {
      case `setWeatherSlide`:
        setWeatherSlide(
          e.data[1][0],
          e.data[1][1],
          e.data[1][2],
          e.data[1][3],
          e.data[1][4],
          e.data[1][5]
        );
        break;
      case `forecastGraph`:
        var temp = document.querySelector(`#forecast-graph`);
        temp.innerHTML = e.data[1];
        break;
    }
  };

  function processWeeklyStats(data) {
    if (!isStudio) {
      Slides.slide(
        `weekly-stats`
      ).html = `<h1 style="text-align: center; font-size: 7vh; color: #FFFFFF">Analytics last 7 days</h1><div style="overflow-y: hidden; overflow-x: hidden; font-size: 3vh;" class="container-full p-2 m-1 text-white scale-content"><p style="text-shadow: 2px 4px 3px rgba(0,0,0,0.3);"><strong class="ql-size-large">Top performing shows:</strong></p>
  <ol><li><strong class="ql-size-large" style="color: rgb(255, 235, 204); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">${
    data.topShows[0] ? data.topShows[0] : "Unknown"
  }</strong></li><li>${
        data.topShows[1] ? data.topShows[1] : "Unknown"
      }</li><li>${data.topShows[2] ? data.topShows[2] : "Unknown"}</li></ol>
  <p><span style="color: rgb(204, 232, 232); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Top Genre: ${
    data.topGenre
  }</span></p><p><span style="color: rgb(204, 232, 232); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Top Playlist: ${
        data.topPlaylist
      }</span></p>
  <p><span style="color: rgb(204, 232, 204); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">OnAir programming: ${
    Math.round((data.onAir / 60 / 24) * 1000) / 1000
  } days (${
        Math.round((data.onAir / (60 * 24 * 7)) * 1000) / 10
      }% of the week)</span></p><p><span style="color: rgb(204, 232, 204); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Online listenership during OnAir programming: ${
        Math.round((data.onAirListeners / 60 / 24) * 1000) / 1000
      } listener days</span></p><p><span style="color: rgb(235, 214, 255); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Tracks liked on website: ${
        data.tracksLiked
      }</span></p><p><span style="color: rgb(204, 224, 245); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Messages exchanged between DJ and website visitors: ${
        data.webMessagesExchanged
      }</span></p><p><span style="color: rgb(255, 255, 204); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Track requests placed: ${
        data.tracksRequested
      }</span></p></div>`;
    }
  }

  function setWeatherSlide(id, show, background, header, icon, body) {
    weatherSlide.map((slide, index) => {
      if (slide.id === id) {
        weatherSlide[index].background = background || slide.background;
        weatherSlide[index].header = header || slide.header;
        weatherSlide[index].show = show;
        weatherSlide[index].icon = icon || slide.icon;
        weatherSlide[index].body = body || slide.body;
      }
    });
  }
});
