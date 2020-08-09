// WWSU SOCKET
try {
  // Connection and plugins
  var socket = io.sails.connect();
  var noReq = new WWSUreq(socket, null);
  var meta = new WWSUMeta(socket, noReq);
  var directorsdb = new WWSUdirectors(socket, noReq);
  var directorReq = new WWSUreq(
    socket,
    null,
    directorsdb,
    null,
    "name",
    "/auth/director",
    "Director"
  );
  var adminDirectorReq = new WWSUreq(
    socket,
    null,
    directorsdb,
    (record) => record.admin,
    "name",
    "/auth/admin-director",
    "Administrator Director"
  );
  var djsdb = new WWSUdjs(socket, noReq, directorReq, null, null, meta);
  var djReq = new WWSUreq(socket, null, djsdb, null, "name", "/auth/dj", "DJ");

  var Directors = [];
  var Timesheets = [];
  var timesheets = [];
  var timesheetsdb = new WWSUtimesheet(socket, noReq);
  var calendar;
  var calendardb = new WWSUcalendar(socket, meta, noReq, directorReq, djReq);
  var subscriptions = new WWSUsubscriptions(socket, noReq);
  var disciplinedb = new WWSUdiscipline(socket, noReq, directorReq, meta);
  var wwsuutil = new WWSUutil();
  var navigation = new WWSUNavigation();
  var device = wwsuutil.getUrlParameter(`device`);
  var isMobile = device !== null;
  var notificationsSupported = false;
  var OneSignal;

  var disciplineModal;
} catch (e) {
  console.error(e);
  $(document).Toasts("create", {
    class: "bg-danger",
    title: "Error initializing",
    body:
      "There was an error initializing the website. Please report this to the engineer.",
    autoHide: true,
    delay: 10000,
    icon: "fas fa-skull-crossbones fa-lg",
  });
}

// Initialize
$(document).ready(function () {
  // Construct calendar
  var calendarEl = document.getElementById("calendar");

  calendar = new FullCalendar.Calendar(calendarEl, {
    plugins: ["interaction", "dayGrid", "timeGrid", "bootstrap"],
    header: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    defaultView: "timeGridWeek",
    navLinks: true, // can click day/week names to navigate views
    selectable: false,
    selectMirror: true,
    nowIndicator: true,
    editable: false,
    startEditable: false,
    durationEditable: false,
    resourceEditable: false,
    themeSystem: "bootstrap",
    eventLimit: true, // allow "more" link when too many events
    events: function (info, successCallback, failureCallback) {
      $("#calendar").block({
        message: "<h1>Loading...</h1>",
        css: { border: "3px solid #a00" },
        timeout: 30000,
        onBlock: () => {
          calendardb.getEvents(
            (events) => {
              events = events.map((event) => {
                var borderColor;
                if (event.scheduleType === "canceled-changed") return false;
                if (
                  ["canceled", "canceled-system"].indexOf(
                    event.scheduleType
                  ) !== -1
                ) {
                  borderColor = "#ff0000";
                } else if (
                  ["updated", "updated-system"].indexOf(event.scheduleType) !==
                  -1
                ) {
                  borderColor = "#ffff00";
                } else if (["unscheduled"].indexOf(event.scheduleType) !== -1) {
                  borderColor = "#00ff00";
                } else {
                  borderColor = "#0000ff";
                }
                return {
                  id: event.unique,
                  groupId: event.calendarID,
                  start: moment.parseZone(event.start).toISOString(true),
                  end: moment.parseZone(event.end).toISOString(true),
                  title: `${event.type}: ${event.hosts} - ${event.name}`,
                  backgroundColor:
                    ["canceled", "canceled-system"].indexOf(
                      event.scheduleType
                    ) === -1
                      ? event.color
                      : "#161616",
                  textColor: "#e6e6e6",
                  borderColor: borderColor,
                  extendedProps: {
                    event: event,
                  },
                };
              });
              successCallback(events);
              calendar.updateSize();
              $("#calendar").unblock();
            },
            moment(info.start).subtract(1, "days").toISOString(true),
            moment(info.end).toISOString(true)
          );
        },
      });
    },
    // When rendering events, filter by active filters.
    eventRender: function eventRender(info) {
      if (info.event.extendedProps.event.scheduleType === "canceled-changed")
        return false;
      info.el.title = info.event.title;
      if (
        ["canceled", "canceled-system"].indexOf(
          info.event.extendedProps.event.scheduleType
        ) !== -1
      ) {
        info.el.title += ` (CANCELED)`;
      }
      if (
        ["updated", "updated-system"].indexOf(
          info.event.extendedProps.event.scheduleType
        ) !== -1
      ) {
        info.el.title += ` (edited on this occurrence)`;
      }
      var temp = document.getElementById(
        `filter-${info.event.extendedProps.event.type}`
      );
      if (temp !== null && temp.checked) {
        return true;
      } else {
        return false;
      }
    },

    eventClick: function (info) {
      calendardb.showClickedEvent(info.event.extendedProps.event);
    },
  });
  calendar.render();

  // Build navigation
  navigation.addItem(
    "#nav-timesheet",
    "#section-timesheet",
    "Director Timesheets - WWSU 106.9 FM",
    "/directors/timesheet",
    true,
    () => {
      filterDateTimesheet();
    }
  );

  navigation.addItem(
    "#nav-calendar",
    "#section-calendar",
    "Calendar - WWSU 106.9 FM",
    "/directors/calendar",
    false,
    () => {
      calendar.updateSize();
    }
  );

  // Add click events to the filter by switches
  [
    "show",
    "sports",
    "remote",
    "prerecord",
    "genre",
    "playlist",
    "event",
    "onair-booking",
    "prod-booking",
    "office-hours",
  ].map((type) => {
    var temp = document.getElementById(`filter-${type}`);
    if (temp !== null) {
      temp.addEventListener("click", (e) => {
        $("#calendar").block({
          message: "<h1>Loading...</h1>",
          css: { border: "3px solid #a00" },
          timeout: 30000,
          onBlock: () => {
            calendar.refetchEvents();
          },
        });
      });
    }
  });

  // Block UI elements
  $(".btn-manage-djs").block({
    message: "Loading...",
    css: { border: "3px solid #a00" },
    timeout: 30000,
  });

  // Add click events
  $(".btn-manage-djs").click(() => {
    djsdb.showDJs();
  });
  $(".btn-manage-events").click(() => {
    calendardb.showSimpleEvents();
  });
  $(".btn-calendar-definitions").click(() => {
    calendardb.definitionsModal.iziModal("open");
  });
  $(".btn-calendar-prerequisites").click(() => {
    calendardb.prerequisitesModal.iziModal("open");
  });
});

// Database event handlers
var calTimer;
calendardb.on("calendarUpdated", "renderer", () => {
  clearTimeout(calTimer);
  calTimer = setTimeout(() => {
    $("#calendar").block({
      message: "<h1>Loading...</h1>",
      css: { border: "3px solid #a00" },
      timeout: 30000,
      onBlock: () => {
        calendar.refetchEvents();
      },
    });
  }, 1000);
});

djsdb.on("replace", "renderer", () => {
  $(".btn-manage-djs").unblock();
});

// Socket handlers
socket.on("connect", () => {
  disciplinedb.checkDiscipline(() => {
    meta.init();
    directorsdb.init();
    djsdb.init();
    timesheetsdb.init();
    calendardb.init();
  });
});

socket.on("disconnect", () => {
  try {
    socket._raw.io._reconnection = true;
    socket._raw.io._reconnectionAttempts = Infinity;
  } catch (unusedE) {}
});

/*
  TIMESHEETS
  */

// Add database event handlers
timesheetsdb.on("change", "renderer", (data) => {
  filterDateTimesheet();
});

function filterDateTimesheet() {
  try {
    return null;
    var records = document.querySelector("#options-timesheets-records");
    var thedate = document.getElementById("weekly-date-picker");
    records.innerHTML = `<h2 class="text-warning" style="text-align: center;">PLEASE WAIT...</h4>`;
    noReq.request(
      {
        method: "POST",
        url: "/timesheet/get",
        data: { date: moment(thedate.value).toISOString(true) },
      },
      (response) => {
        records.innerHTML = ``;
        timesheets = response;
        var hours = {};
        timesheets.map((record) => {
          var newRow = document.getElementById(
            `options-timesheets-director-${record.name.replace(/\W/g, "")}`
          );

          // If there is not a row for this director yet, create one
          if (!newRow || newRow === null) {
            records.innerHTML += `<div id="options-timesheets-director-${record.name.replace(
              /\W/g,
              ""
            )}" class="card p-1 m-1 bg-light-1" style="width: 850px; position: relative;">
                      <div class="card-body">
                      <h5 class="card-title">${record.name}</h5>
                      <p class="card-text">
                      <div class="container">    
                          <div class="row shadow-2">
                              <div class="col text-dark">
                                  > Day <br>
                                  v Time
                              </div>
                              <div class="col text-dark border-left">
                                  Sun
                              </div>
                              <div class="col text-dark border-left">
                                  Mon
                              </div>
                              <div class="col text-dark border-left">
                                  Tue
                              </div>
                              <div class="col text-dark border-left">
                                  Wed
                              </div>
                              <div class="col text-dark border-left">
                                  Thu
                              </div>
                              <div class="col text-dark border-left">
                                  Fri
                              </div>
                              <div class="col text-dark border-left">
                                  Sat
                              </div>
                          </div>
                          <div class="row border border-dark" style="height: 240px;">
                              <div class="col text-dark" style="position: relative;">
                                  <div style="position: absolute; top: 8.5%;">3a</div>
                                  <div style="position: absolute; top: 21%;">6a</div>
                                  <div style="position: absolute; top: 33.5%;">9a</div>
                                  <div style="position: absolute; top: 46%;">12p</div>
                                  <div style="position: absolute; top: 58.5%;">3p</div>
                                  <div style="position: absolute; top: 71%;">6p</div>
                                  <div style="position: absolute; top: 83.5%;">9p</div>
                                  <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                              </div>
                              <div class="col text-dark border-left" id="options-timesheets-director-cell-0-${record.name.replace(
                                /\W/g,
                                ""
                              )}" style="position: relative;">
                                  <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                              </div>
                              <div class="col text-dark border-left" id="options-timesheets-director-cell-1-${record.name.replace(
                                /\W/g,
                                ""
                              )}" style="position: relative;">
                                  <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                              </div>
                              <div class="col text-dark border-left" id="options-timesheets-director-cell-2-${record.name.replace(
                                /\W/g,
                                ""
                              )}" style="position: relative;">
                                  <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                              </div>
                              <div class="col text-dark border-left" id="options-timesheets-director-cell-3-${record.name.replace(
                                /\W/g,
                                ""
                              )}" style="position: relative;">
                                  <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                              </div>
                              <div class="col text-dark border-left" id="options-timesheets-director-cell-4-${record.name.replace(
                                /\W/g,
                                ""
                              )}" style="position: relative;">
                                  <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                              </div>
                              <div class="col text-dark border-left" id="options-timesheets-director-cell-5-${record.name.replace(
                                /\W/g,
                                ""
                              )}" style="position: relative;">
                                  <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                              </div>
                              <div class="col text-dark border-left" id="options-timesheets-director-cell-6-${record.name.replace(
                                /\W/g,
                                ""
                              )}" style="position: relative;">
                                  <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                  <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                              </div>
                          </div>
                          <div class="row">
                              <div class="col-4 text-primary">
                              Weekly Hours
                              </div>
                              <div class="col-6 text-primary" id="options-timesheets-director-cell-h-${record.name.replace(
                                /\W/g,
                                ""
                              )}">
                              </div>
                          </div>
                      </div>
                      </p>
                      </div>
                      </div>
                      `;
            hours[record.name] = moment.duration();
          }

          // Prepare clock moments
          var clockin = record.timeIn !== null ? moment(record.timeIn) : null;
          var clockout =
            record.timeOut !== null ? moment(record.timeOut) : null;
          var scheduledin =
            record.scheduledIn !== null ? moment(record.scheduledIn) : null;
          var scheduledout =
            record.scheduledOut !== null ? moment(record.scheduledOut) : null;
          var clocknow = moment();
          var clockday = moment(
            clockin !== null ? clockin : scheduledin
          ).format("e");

          /* Determine status.
           * success = Approved and scheduled.
           * purple = Approved, but not scheduled
           * warning = Scheduled, but not approved
           * urgent = Not scheduled and not approved
           * info = Clocked in, but not clocked out
           * danger = Absent / did not clock in for scheduled hours
           * secondary = Canceled scheduled hours
           */
          var status = `urgent`;
          // LINT LIES: variable is used
          // eslint-disable-next-line no-unused-vars
          var status2 = `This record is NOT approved, and did not fall within a scheduled office hours time block.`;
          var inT = ``;
          var outT = ``;
          var sInT = ``;
          var sOutT = ``;
          var timeline = ``;
          var dayValue = 1000 * 60 * 60 * 24;
          var width = 0;
          var left = 0;
          var sWidth = 0;
          var sLeft = 0;

          if (clockin !== null && clockout === null) {
            status = `purple`;
            status2 = `This record / director is still clocked in.`;
            hours[record.name].add(clocknow.diff(clockin));
            if (scheduledin !== null && scheduledout !== null) {
              if (
                moment(scheduledin).isBefore(
                  moment(scheduledout).startOf("week")
                )
              ) {
                sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`);
                sLeft = 0;
              } else {
                sInT = moment(scheduledin).format(`h:mm A`);
                sLeft =
                  ((moment(scheduledin).valueOf() -
                    moment(scheduledin).startOf("day").valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(scheduledout).isAfter(
                  moment(scheduledin).startOf("week").add(1, "weeks")
                ) ||
                !moment(scheduledout).isSame(moment(scheduledin), "day")
              ) {
                sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`);
                sWidth = 100 - sLeft;
              } else {
                sOutT = moment(scheduledout).format(`h:mm A`);
                sWidth =
                  ((moment(scheduledout).valueOf() -
                    moment(scheduledin).valueOf()) /
                    dayValue) *
                  100;
              }
              timeline += `<div title="Scheduled Hours: ${sInT} - ${sOutT}" class="bg-secondary" style="position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`;
            }
            if (moment(clockin).isBefore(moment().startOf("week"))) {
              inT = moment(clockin).format(`YYYY-MM-DD h:mm A`);
              left = 0;
              width =
                ((moment().valueOf() - moment(clockin).valueOf()) / dayValue) *
                100;
              timeline += `<div title="Director still clocked in since ${inT}" id="timesheet-t-${record.ID}" class="bg-${status}" style="position: absolute; left: 20%; width: 75%; top: 0%; height: ${width}%;"></div>`;
            } else {
              inT = moment(clockin).format(`h:mm A`);
              width =
                ((moment().valueOf() - moment(clockin).valueOf()) / dayValue) *
                100;
              left =
                ((moment(clockin).valueOf() -
                  moment(clockin).startOf("day").valueOf()) /
                  dayValue) *
                100;
              timeline += `<div title="Director still clocked in since ${inT}" id="timesheet-t-${record.ID}" class="bg-${status}" style="position: absolute; left: 20%; width: 75%; top: ${left}%; height: ${width}%;"></div>`;
            }
            outT = "IN NOW";
          } else {
            if (
              clockin !== null &&
              clockout !== null &&
              scheduledin !== null &&
              scheduledout !== null &&
              record.approved === 1
            ) {
              status = `success`;
              status2 = `This record is approved and fell within a scheduled office hours block.`;
              hours[record.name].add(clockout.diff(clockin));
              if (moment(clockin).isBefore(moment(clockout).startOf("week"))) {
                inT = moment(clockin).format(`YYYY-MM-DD h:mm A`);
                left = 0;
              } else {
                inT = moment(clockin).format(`h:mm A`);
                left =
                  ((moment(clockin).valueOf() -
                    moment(clockin).startOf("day").valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(clockout).isAfter(
                  moment(clockin).startOf("week").add(1, "weeks")
                ) ||
                !moment(clockout).isSame(moment(clockin), "day")
              ) {
                outT = moment(clockout).format(`YYYY-MM-DD h:mm A`);
                width = 100 - left;
              } else {
                outT = moment(clockout).format(`h:mm A`);
                width =
                  ((moment(clockout).valueOf() - moment(clockin).valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(scheduledin).isBefore(
                  moment(scheduledout).startOf("week")
                )
              ) {
                sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`);
                sLeft = 0;
              } else {
                sInT = moment(scheduledin).format(`h:mm A`);
                sLeft =
                  ((moment(scheduledin).valueOf() -
                    moment(scheduledin).startOf("day").valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(scheduledout).isAfter(
                  moment(scheduledin).startOf("week").add(1, "weeks")
                ) ||
                !moment(scheduledout).isSame(moment(scheduledin), "day")
              ) {
                sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`);
                sWidth = 100 - sLeft;
              } else {
                sOutT = moment(scheduledout).format(`h:mm A`);
                sWidth =
                  ((moment(scheduledout).valueOf() -
                    moment(scheduledin).valueOf()) /
                    dayValue) *
                  100;
              }
              timeline += `<div title="Scheduled Hours: ${sInT} - ${sOutT}" class="bg-secondary" style="position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`;
              timeline += `<div id="timesheet-t-${record.ID}" title="Actual Hours (approved): ${inT} - ${outT}" class="bg-${status}" style="position: absolute; left: 20%; width: 75%; top: ${left}%; height: ${width}%;"></div>`;
            } else if (
              clockin !== null &&
              clockout !== null &&
              (scheduledin === null || scheduledout === null) &&
              record.approved === 1
            ) {
              status = `success`;
              status2 = `This record is approved, but did not fall within a scheduled office hours block.`;
              hours[record.name].add(clockout.diff(clockin));
              if (moment(clockin).isBefore(moment(clockout).startOf("week"))) {
                inT = moment(clockin).format(`YYYY-MM-DD h:mm A`);
                left = 0;
              } else {
                inT = moment(clockin).format(`h:mm A`);
                left =
                  ((moment(clockin).valueOf() -
                    moment(clockin).startOf("day").valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(clockout).isAfter(
                  moment(clockin).startOf("week").add(1, "weeks")
                ) ||
                !moment(clockout).isSame(moment(clockin), "day")
              ) {
                outT = moment(clockout).format(`YYYY-MM-DD h:mm A`);
                width = 100 - left;
              } else {
                outT = moment(clockout).format(`h:mm A`);
                width =
                  ((moment(clockout).valueOf() - moment(clockin).valueOf()) /
                    dayValue) *
                  100;
              }
              timeline += `<div id="timesheet-t-${record.ID}" title="Actual Unscheduled Hours (approved): ${inT} - ${outT}" class="bg-${status}" style="position: absolute; left: 20%; width: 75%; top: ${left}%; height: ${width}%;"></div>`;
            } else if (
              scheduledin !== null &&
              scheduledout !== null &&
              clockin === null &&
              clockout === null &&
              record.approved === -1
            ) {
              status = `secondary`;
              status2 = `This is NOT an actual timesheet; the director canceled scheduled office hours.`;
              if (
                moment(scheduledin).isBefore(
                  moment(scheduledout).startOf("week")
                )
              ) {
                sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`);
                sLeft = 0;
              } else {
                sInT = moment(scheduledin).format(`h:mm A`);
                sLeft =
                  ((moment(scheduledin).valueOf() -
                    moment(scheduledin).startOf("day").valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(scheduledout).isAfter(
                  moment(scheduledin).startOf("week").add(1, "weeks")
                ) ||
                !moment(scheduledout).isSame(moment(scheduledin), "day")
              ) {
                sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`);
                sWidth = 100 - sLeft;
              } else {
                sOutT = moment(scheduledout).format(`h:mm A`);
                sWidth =
                  ((moment(scheduledout).valueOf() -
                    moment(scheduledin).valueOf()) /
                    dayValue) *
                  100;
              }
              timeline += `<div title="Scheduled Hours (CANCELED): ${sInT} - ${sOutT}" class="" style="background-color: #787878; position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`;
            } else if (
              clockin !== null &&
              clockout !== null &&
              scheduledin !== null &&
              scheduledout !== null &&
              record.approved === 0
            ) {
              status = `warning`;
              status2 = `This record is NOT approved, but fell within a scheduled office hours block.`;
              if (moment(clockin).isBefore(moment(clockout).startOf("week"))) {
                inT = moment(clockin).format(`YYYY-MM-DD h:mm A`);
                left = 0;
              } else {
                inT = moment(clockin).format(`h:mm A`);
                left =
                  ((moment(clockin).valueOf() -
                    moment(clockin).startOf("day").valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(clockout).isAfter(
                  moment(clockin).startOf("week").add(1, "weeks")
                ) ||
                !moment(clockout).isSame(moment(clockin), "day")
              ) {
                outT = moment(clockout).format(`YYYY-MM-DD h:mm A`);
                width = 100 - left;
              } else {
                outT = moment(clockout).format(`h:mm A`);
                width =
                  ((moment(clockout).valueOf() - moment(clockin).valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(scheduledin).isBefore(
                  moment(scheduledout).startOf("week")
                )
              ) {
                sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`);
                sLeft = 0;
              } else {
                sInT = moment(scheduledin).format(`h:mm A`);
                sLeft =
                  ((moment(scheduledin).valueOf() -
                    moment(scheduledin).startOf("day").valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(scheduledout).isAfter(
                  moment(scheduledin).startOf("week").add(1, "weeks")
                ) ||
                !moment(scheduledout).isSame(moment(scheduledin), "day")
              ) {
                sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`);
                sWidth = 100 - sLeft;
              } else {
                sOutT = moment(scheduledout).format(`h:mm A`);
                sWidth =
                  ((moment(scheduledout).valueOf() -
                    moment(scheduledin).valueOf()) /
                    dayValue) *
                  100;
              }
              timeline += `<div title="Scheduled Hours: ${sInT} - ${sOutT}" class="bg-secondary" style="position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`;
              timeline += `<div id="timesheet-t-${record.ID}" title="Actual Hours (NEEDS REVIEW): ${inT} - ${outT}" class="bg-${status}" style="position: absolute; left: 20%; width: 75%; top: ${left}%; height: ${width}%;"></div>`;
            } else if (
              clockin !== null &&
              clockout !== null &&
              (scheduledin === null || scheduledout === null) &&
              record.approved === 0
            ) {
              status = `warning`;
              status2 = `This record is NOT approved and did not fall within a scheduled office hours block.`;
              if (moment(clockin).isBefore(moment(clockout).startOf("week"))) {
                inT = moment(clockin).format(`YYYY-MM-DD h:mm A`);
                left = 0;
              } else {
                inT = moment(clockin).format(`h:mm A`);
                left =
                  ((moment(clockin).valueOf() -
                    moment(clockin).startOf("day").valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(clockout).isAfter(
                  moment(clockin).startOf("week").add(1, "weeks")
                ) ||
                !moment(clockout).isSame(moment(clockin), "day")
              ) {
                outT = moment(clockout).format(`YYYY-MM-DD h:mm A`);
                width = 100 - left;
              } else {
                outT = moment(clockout).format(`h:mm A`);
                width =
                  ((moment(clockout).valueOf() - moment(clockin).valueOf()) /
                    dayValue) *
                  100;
              }
              timeline += `<div id="timesheet-t-${record.ID}" title="Actual Unscheduled Hours (NEEDS REVIEW): ${inT} - ${outT}" class="bg-${status}" style="position: absolute; left: 20%; width: 75%; top: ${left}%; height: ${width}%;"></div>`;
            } else if (
              scheduledin !== null &&
              scheduledout !== null &&
              clockin === null &&
              clockout === null &&
              record.approved === 0
            ) {
              status = `danger`;
              status2 = `This is NOT an actual timesheet; the director failed to clock in during scheduled office hours.`;
              if (
                moment(scheduledin).isBefore(
                  moment(scheduledout).startOf("week")
                )
              ) {
                sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`);
                sLeft = 0;
              } else {
                sInT = moment(scheduledin).format(`h:mm A`);
                sLeft =
                  ((moment(scheduledin).valueOf() -
                    moment(scheduledin).startOf("day").valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(scheduledout).isAfter(
                  moment(scheduledin).startOf("week").add(1, "weeks")
                ) ||
                !moment(scheduledout).isSame(moment(scheduledin), "day")
              ) {
                sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`);
                sWidth = 100 - sLeft;
              } else {
                sOutT = moment(scheduledout).format(`h:mm A`);
                sWidth =
                  ((moment(scheduledout).valueOf() -
                    moment(scheduledin).valueOf()) /
                    dayValue) *
                  100;
              }
              timeline += `<div title="Scheduled Hours (NO SHOW): ${sInT} - ${sOutT}" class="bg-danger" style="position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`;
            } else if (
              scheduledin !== null &&
              scheduledout !== null &&
              clockin === null &&
              clockout === null &&
              record.approved === 1
            ) {
              status = `secondary`;
              status2 = `This is NOT an actual timesheet; the director failed to clock in during scheduled office hours.`;
              if (
                moment(scheduledin).isBefore(
                  moment(scheduledout).startOf("week")
                )
              ) {
                sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`);
                sLeft = 0;
              } else {
                sInT = moment(scheduledin).format(`h:mm A`);
                sLeft =
                  ((moment(scheduledin).valueOf() -
                    moment(scheduledin).startOf("day").valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(scheduledout).isAfter(
                  moment(scheduledin).startOf("week").add(1, "weeks")
                ) ||
                !moment(scheduledout).isSame(moment(scheduledin), "day")
              ) {
                sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`);
                sWidth = 100 - sLeft;
              } else {
                sOutT = moment(scheduledout).format(`h:mm A`);
                sWidth =
                  ((moment(scheduledout).valueOf() -
                    moment(scheduledin).valueOf()) /
                    dayValue) *
                  100;
              }
              timeline += `<div title="Future Scheduled Hours: ${sInT} - ${sOutT}" class="bg-secondary" style="position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`;
            } else if (
              scheduledin !== null &&
              scheduledout !== null &&
              clockin === null &&
              clockout === null &&
              record.approved === 2
            ) {
              status = `secondary`;
              status2 = `This is NOT an actual timesheet; the director failed to clock in during scheduled office hours.`;
              if (
                moment(scheduledin).isBefore(
                  moment(scheduledout).startOf("week")
                )
              ) {
                sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`);
                sLeft = 0;
              } else {
                sInT = moment(scheduledin).format(`h:mm A`);
                sLeft =
                  ((moment(scheduledin).valueOf() -
                    moment(scheduledin).startOf("day").valueOf()) /
                    dayValue) *
                  100;
              }
              if (
                moment(scheduledout).isAfter(
                  moment(scheduledin).startOf("week").add(1, "weeks")
                ) ||
                !moment(scheduledout).isSame(moment(scheduledin), "day")
              ) {
                sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`);
                sWidth = 100 - sLeft;
              } else {
                sOutT = moment(scheduledout).format(`h:mm A`);
                sWidth =
                  ((moment(scheduledout).valueOf() -
                    moment(scheduledin).valueOf()) /
                    dayValue) *
                  100;
              }
              timeline += `<div title="Future Scheduled Hours (CHANGED): ${sInT} - ${sOutT}" class="bg-secondary" style="position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`;
            }
          }

          // Fill in the timesheet record
          var cell = document.getElementById(
            `options-timesheets-director-cell-${clockday}-${record.name.replace(
              /\W/g,
              ""
            )}`
          );
          if (cell !== null) {
            cell.innerHTML += timeline;
          }

          // Iterate through each director and list their hours worked.
          for (var key in hours) {
            if (Object.prototype.hasOwnProperty.call(hours, key)) {
              cell = document.getElementById(
                `options-timesheets-director-cell-h-${key.replace(/\W/g, "")}`
              );
              if (cell) {
                cell.innerHTML = `${hours[key].format("h", 1)}`;
              }
            }
          }
        });
      }
    );
  } catch (e) {
    console.error(e);
    iziToast.show({
      title: "An error occurred - Please check the logs",
      message: "Error occurred during loadTimesheets.",
    });
  }
}

// Edit a timesheet entry, or view a single entry
function editClock(clockID, save = false) {
  console.log(`editClock called.`);
  var modalBody = document.getElementById("clock-body");
  if (!save) {
    $("#clockModal").iziModal("open");
    modalBody.innerHTML = "Loading clock...";
  }

  // View an entry
  if (!save) {
    var opened = false;
    timesheets
      .filter((timesheet) => timesheet.ID === clockID)
      .map((timesheet) => {
        modalBody.innerHTML = `<form action="javascript:editClock(${clockID}, true)"><div class="form-group">
              <p><strong>Scheduled In:</strong> ${
                timesheet.scheduledIn !== null
                  ? moment(timesheet.scheduledIn).format("YYYY-MM-DD HH:mm:ss")
                  : `Not scheduled`
              }<br />
              <strong>Scheduled Out:</strong> ${
                timesheet.scheduledOut !== null
                  ? moment(timesheet.scheduledOut).format("YYYY-MM-DD HH:mm:ss")
                  : `Not scheduled`
              }</p>
          <label for="clock-in">Clock In:</label>
          <input type="text" class="form-control" id="clock-in" value="${
            timesheet.timeIn !== null
              ? moment(timesheet.timeIn).format("YYYY-MM-DD HH:mm:ss")
              : null
          }">
          <label for="clock-out">Clock Out:</label>
          <input type="text" class="form-control" id="clock-out" value="${
            timesheet.timeOut !== null
              ? moment(timesheet.timeOut).format("YYYY-MM-DD HH:mm:ss")
              : null
          }">
          <div class="form-group" title="Choose the status for this timesheet record">
                          <label for="clock-approved">Timesheet record status</label>
                          <select class="form-control" id="clock-approved">
                              <option value="delete">DELETE THIS ENTRY</option>
                              <option value="-1"${
                                timesheet.approved === -1 ? ` selected` : ``
                              }>Canceled Hours</option>
                              <option value="0"${
                                timesheet.approved === 0 ? ` selected` : ``
                              }>Not Approved / Absent</option>
                              <option value="1"${
                                timesheet.approved === 1 ? ` selected` : ``
                              }>Approved / Scheduled Hours</option>
                              <option value="2"${
                                timesheet.approved === 2 ? ` selected` : ``
                              }>Changed Scheduled Hours</option>
                          </select>
                      </div>
          <button type="submit" class="btn btn-primary">Edit</button>
          </form>`;
        opened = true;
        return null;
      });
    if (!opened) {
      modalBody.innerHTML = "There was an internal error loading that clock.";
    }
    // Editing an entry
  } else {
    var bclockin = document.getElementById("clock-in");
    var bclockout = document.getElementById("clock-out");
    var bapproved = document.getElementById("clock-approved");
    var selectedOption = bapproved.options[bapproved.selectedIndex].value;
    if (selectedOption !== `delete`) {
      adminDirectorReq.request(
        {
          db: directorsdb.db({ admin: true }),
          method: "POST",
          url: "/timesheet/edit",
          data: {
            ID: clockID,
            timeIn: moment(bclockin.value).toISOString(true),
            timeOut: moment(bclockout.value).toISOString(true),
            approved: selectedOption,
          },
        },
        (resHTML) => {}
      );
    } else {
      adminDirectorReq.request(
        {
          db: directorsdb.db({ admin: true }),
          method: "POST",
          url: "/timesheet/remove",
          data: { ID: clockID },
        },
        () => {}
      );
    }
  }
}
