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
  var timesheets = new WWSUtimesheet(socket, noReq, adminDirectorReq, meta);
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
    "#nav-timesheets",
    "#section-timesheets",
    "Director Timesheets - WWSU 106.9 FM",
    "/directors/timesheets",
    true
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

  // Init timesheet tables
  timesheets.init(
		`#section-timesheets-hours`,
		`#section-timesheets-records`,
		`#section-timesheets-start`,
		`#section-timesheets-end`,
		`#section-timesheets-browse`
	);
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
    calendardb.init();
  });
});

socket.on("disconnect", () => {
  try {
    socket._raw.io._reconnection = true;
    socket._raw.io._reconnectionAttempts = Infinity;
  } catch (unusedE) {}
});