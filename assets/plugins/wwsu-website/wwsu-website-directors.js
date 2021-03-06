"use strict";

// Machine ID
var machineID = null;
let hosts = false;
$(".connecting-id").html(machineID);

// Connection
io.sails.url = "https://server.wwsu1069.org";
io.sails.query = `host=${machineID}`;
io.sails.reconnectionAttempts = 3;
var socket = io.sails.connect();
$("#connecting").removeClass("d-none");
$("#loading").addClass("d-none");

// Add WWSU modules
let wwsumodules = new WWSUmodules(socket);
wwsumodules
  .add("WWSUanimations", WWSUanimations)
  .add(`WWSUutil`, WWSUutil)
  .add("WWSUhosts", WWSUhosts, { machineID: machineID })
  .add("WWSUNavigation", WWSUNavigation)
  .add("noReq", WWSUreq, { host: null })
  .add("WWSUMeta", WWSUMeta)
  .add("WWSUrecipients", WWSUrecipients)
  .add("WWSUdirectors", WWSUdirectors, { host: machineID })
  .add("directorReq", WWSUreq, {
    host: machineID,
    db: "WWSUdirectors",
    filter: null,
    usernameField: "name",
    authPath: "/auth/director",
    authName: "Director"
  })
  .add("adminDirectorReq", WWSUreq, {
    host: machineID,
    db: "WWSUdirectors",
    filter: { admin: true },
    usernameField: "name",
    authPath: "/auth/admin-director",
    authName: "Administrator Director"
  })
  .add("masterDirectorReq", WWSUreq, {
    host: machineID,
    db: "WWSUdirectors",
    filter: { ID: 1 },
    usernameField: "name",
    authPath: "/auth/admin-director",
    authName: "Master Director"
  })
  .add("WWSUdjs", WWSUdjs)
  .add("djReq", WWSUreq, {
    host: machineID,
    db: "WWSUdjs",
    filter: null,
    usernameField: "name",
    authPath: "/auth/dj",
    authName: "DJ"
  })
  .add("WWSUannouncements", WWSUannouncements, { types: ["timesheet"] })
  .add("WWSUcalendar", WWSUcalendar)
  .add("WWSUdiscipline", WWSUdiscipline)
  .add("WWSUtimesheet", WWSUtimesheet)
  .add("WWSUmessages", WWSUmessages)
  .add("WWSUshootout", WWSUshootout, {
    username: "#shootout-username",
    password: "#shootout-password"
  });

// Reference modules to variables
var navigation = wwsumodules.get("WWSUNavigation"); // Navigation must be global so it can be accessed by other ejs scripts

let animations = wwsumodules.get("WWSUanimations");
let util = wwsumodules.get("WWSUutil");
let meta = wwsumodules.get("WWSUMeta");
let directors = wwsumodules.get("WWSUdirectors");
let djs = wwsumodules.get("WWSUdjs");
let announcements = wwsumodules.get("WWSUannouncements");
let recipients = wwsumodules.get("WWSUrecipients");
let calendar = wwsumodules.get("WWSUcalendar");
let discipline = wwsumodules.get("WWSUdiscipline");
let timesheets = wwsumodules.get("WWSUtimesheet");
let messages = wwsumodules.get("WWSUmessages");
let shootout = wwsumodules.get("WWSUshootout");

timesheets.init(
  `#section-timesheets-hours`,
  `#section-timesheets-records`,
  `#section-timesheets-start`,
  `#section-timesheets-end`,
  `#section-timesheets-browse`
);

// navigation
navigation.addItem(
  "#nav-home",
  "#section-home",
  "Home - WWSU Timesheets",
  "/",
  true
);
navigation.addItem(
  "#nav-calendar",
  "#section-calendar",
  "Manage Calendar - WWSU Timesheets",
  "/directors/calendar",
  false,
  () => {
    fullCalendar.updateSize();
  }
);
navigation.addItem(
  "#nav-inventory",
  "#section-inventory",
  "Manage Inventory - WWSU Timesheets",
  "/directors/inventory",
  false
);
navigation.addItem(
  "#nav-timesheets",
  "#section-timesheets",
  "Director timesheets - WWSU Timesheets",
  "/directors/timesheets",
  false
);
navigation.addItem(
  "#nav-shootout",
  "#section-shootout",
  "Basketball Scoreboard Control - WWSU Timesheets",
  "/directors/shootout",
  false
);

/*
        CALENDAR
    */

// Initialize Calendar
var calendarEl = document.getElementById("calendar");

let fullCalendar = new FullCalendar.Calendar(calendarEl, {
	headerToolbar: {
		start: "prev,next today",
		center: "title",
		end: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
	},
	initialView: "timeGridWeek",
	navLinks: true, // can click day/week names to navigate views
	selectable: true,
	selectMirror: true,
	nowIndicator: true,
	editable: true,
	eventResourceEditable: false,
	themeSystem: "bootstrap",
	dayMaxEvents: 5,
	slotDuration: "00:15:00",
	events: function (info, successCallback, failureCallback) {
		animations.add("calendar-update", () => {
			$("#calendar").block({
				message: "<h1>Loading...</h1>",
				css: { border: "3px solid #a00" },
				timeout: 30000,
				onBlock: () => {
					calendar.getEvents(
						(events) => {
							events = events
								.filter((event) => {
									// Filter out events by filters
									if (event.scheduleType === "canceled-changed") return false;
									let temp = document.getElementById(`filter-${event.type}`);
									if (temp !== null && temp.checked) {
										return true;
									} else {
										return false;
									}
								})
								.map((event) => {
									let borderColor;
									let title = `${event.type}: ${event.hosts} - ${event.name}`;
									if (
										["canceled", "canceled-system"].indexOf(
											event.scheduleType
										) !== -1
									) {
										borderColor = "#ff0000";
										title += ` (CANCELED)`;
									} else if (
										["updated", "updated-system"].indexOf(
											event.scheduleType
										) !== -1
									) {
										borderColor = "#ffff00";
										title += ` (changed this occurrence)`;
									} else if (
										["unscheduled"].indexOf(event.scheduleType) !== -1
									) {
										borderColor = "#00ff00";
										title += ` (unscheduled/unauthorized)`;
									} else {
										borderColor = "#0000ff";
									}
									return {
										id: event.unique,
										start: moment.parseZone(event.start).toISOString(true),
										end: moment.parseZone(event.end).toISOString(true),
										title: title,
										backgroundColor:
											["canceled", "canceled-system"].indexOf(
												event.scheduleType
											) === -1
												? event.color
												: "#161616",
										textColor: util.getContrastYIQ(event.color)
											? "#161616"
											: "#e6e6e6",
										borderColor: borderColor,
										extendedProps: {
											event: event,
										},
									};
								});
							successCallback(events);
							fullCalendar.updateSize();
							$("#calendar").unblock();
						},
						moment(info.start).subtract(1, "days").toISOString(true),
						moment(info.end).toISOString(true)
					);
				},
			});
		});
	},

	eventClick: function (info) {
		calendar.showClickedEvent(info.event.extendedProps.event);
	},

	select: function (info) {
		calendar.newOccurrence(info.startStr, info.endStr);
	},

	eventDrop: function (info) {
		let duration = moment(info.event.end).diff(info.event.start, "minutes");
		if (duration > 60 * 24) {
			$(document).Toasts("create", {
				class: "bg-warning",
				title: "Multi-day Events Not Allowed",
				body:
					"Occurrences may not last more than 24 hours. Consider setting up a recurring schedule.",
				autohide: true,
				delay: 15000,
			});
			return;
		}
		calendar.showOccurrenceForm(
			info.event.extendedProps.event,
			info.event.startStr,
			duration
		);
		info.revert();
	},

	eventResize: function (info) {
		let duration = moment(info.event.end).diff(info.event.start, "minutes");
		if (duration > 60 * 24) {
			$(document).Toasts("create", {
				class: "bg-warning",
				title: "Multi-day Events Not Allowed",
				body:
					"Occurrences may not last more than 24 hours. Consider setting up a recurring schedule.",
				autohide: true,
				delay: 15000,
			});
			return;
		}
		calendar.showOccurrenceForm(
			info.event.extendedProps.event,
			info.event.startStr,
			duration
		);
		info.revert();
	},
});
fullCalendar.render();

// Click events for tasks buttons
$(".btn-calendar-definitions").click(() => {
  calendar.definitionsModal.iziModal("open");
});
$(".btn-calendar-prerequisites").click(() => {
  calendar.prerequisitesModal.iziModal("open");
});
$(".btn-manage-events").click(() => {
  calendar.showSimpleEvents();
});

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
  "office-hours"
].map(type => {
  var temp = document.getElementById(`filter-${type}`);
  if (temp !== null) {
    temp.addEventListener("click", e => {
      fullCalendar.refetchEvents();
    });
  }
});
// Add click events to filter group buttons
$("#filter-group-broadcasts").on("click", (e) => {
	[
		"genre",
		"event",
		"onair-booking",
		"prod-booking",
		"office-hours",
	].map((type) => $(`#filter-${type}`).prop("checked", false));
	["show", "sports", "remote", "prerecord", "playlist"].map((type) =>
		$(`#filter-${type}`).prop("checked", true)
	);
	fullCalendar.refetchEvents();
});
$("#filter-group-bookings").on("click", (e) => {
	[
		"show",
		"sports",
		"remote",
		"prerecord",
		"genre",
		"playlist",
		"event",
		"office-hours",
	].map((type) => $(`#filter-${type}`).prop("checked", false));
	["onair-booking", "prod-booking"].map((type) =>
		$(`#filter-${type}`).prop("checked", true)
	);
	fullCalendar.refetchEvents();
});
$("#filter-group-clear").on("click", (e) => {
	[
		"show",
		"sports",
		"remote",
		"prerecord",
		"genre",
		"playlist",
		"event",
		"office-hours",
		"onair-booking",
		"prod-booking",
	].map((type) => $(`#filter-${type}`).prop("checked", false));
	fullCalendar.refetchEvents();
});

// execute updateCalendar function each time calendar has been changed, but add a 1-second buffer so we don't update a million times at once.
let calTimer;
calendar.on("calendarUpdated", "renderer", () => {
  clearTimeout(calTimer);
  calTimer = setTimeout(() => {
    fullCalendar.refetchEvents();
  }, 1000);
});

announcements.on("change", "renderer", () => {
  processAnnouncements();
});

/*
        SOCKET EVENTS AND FUNCTIONS
    */

// Connected to WWSU
socket.on("connect", () => {
  $("#reconnecting").addClass("d-none");
  $("#connecting").addClass("d-none");
  $("#unauthorized").addClass("d-none");
  $("#content").removeClass("d-none");
  socket._raw.io._reconnectionAttempts = Infinity;

  discipline.checkDiscipline(() => {
    meta.init();
    directors.init();
    djs.init();
    calendar.init();
    announcements.init();
    shootout.init();
  });
});

// Disconnected from WWSU
socket.on("disconnect", () => {
  $("#reconnecting").removeClass("d-none");
  $("#connecting").addClass("d-none");
  $("#unauthorized").addClass("d-none");
  $("#content").addClass("d-none");
});

// Connection error
socket.on("reconnect_failed", error => {
  $("#unauthorized").removeClass("d-none");
  $("#connecting").addClass("d-none");
  $("#reconnecting").addClass("d-none");
  $("#content").addClass("d-none");
});

socket.on("error", () => {
  if (!hosts.connectedBefore) {
    $("#unauthorized").removeClass("d-none");
    $("#connecting").addClass("d-none");
    $("#reconnecting").addClass("d-none");
    $("#content").addClass("d-none");
  }
});

/*
        META
    */

// Meta ticker
meta.on("metaTick", "renderer", fullMeta => {
  // Update station time
  animations.add("meta-time", () => {
    $(".meta-time").html(moment.parseZone(fullMeta.time).format("llll"));

    if (moment(fullMeta.time).minute() === 0) {
      processAnnouncements();
    }
  });
});

/*
        DIRECTORS
    */

directors.on("change", "renderer", db => {
  animations.add("update-directors", () => {
    // Remove all director sections
    $(`#sections-directors`).html("");

    // Erase menu html
    $("#nav-directors").html("");
    $("#nav-assistants").html("");

    // Add sections and menu items for each director
    db.get().map(director => {
      $(`#nav-${director.assistant ? "assistants" : "directors"}`).append(`
                <li class="nav-item">
                    <a
                        href="#"
                        class="nav-link"
                        id="nav-director-${director.ID}"
                        title="Clock in/out ${director.name}"
                    >
                        <i class="nav-icon fas fa-user text-${
                          director.present
                            ? director.present === 2
                              ? `indigo`
                              : `success`
                            : `danger`
                        }"></i>
                        <p>
                            ${director.name}
                        </p>
                    </a>
                </li>`);

      $(`#sections-directors`).append(`
                <section id="section-director-${director.ID}">
                    <div class="content-wrapper">
                        <div class="content-header">
                            <div class="container-fluid">
                                <div class="row mb-2">
                                    <div class="col-12">
                                        <h1 class="m-0 text-dark">Director - ${
                                          director.name
                                        }</h1>
                                    </div>
                                    <!-- /.col -->
                                </div>
                                <!-- /.row -->
                            </div>
                            <!-- /.container-fluid -->
                        </div>

                        <div class="content">

						
                            <div class="card card-widget widget-user-2">
                                <div class="widget-user-header bg-${
                                  director.present
                                    ? director.present === 2
                                      ? `indigo`
                                      : `success`
                                    : `danger`
                                }">
                                <div class="row">
                                    <div class="col">
                                    <div class="widget-user-image">${
                                      director.avatar && director.avatar !== ``
                                        ? director.avatar
                                        : jdenticon.toSvg(
                                            `Director ${director.name}`,
                                            64
                                          )
                                    }
                                    </div>
                                    </div>
                                    <div class="col">
                                    <!-- /.widget-user-image -->
                                    <h3 class="widget-user-username">${
                                      director.present
                                        ? director.present === 2
                                          ? `Clocked In remotely Since`
                                          : `Clocked In Since`
                                        : `Last Seen`
                                    }</h3>
                                    <h5 class="widget-user-desc">
                                        ${moment
                                          .tz(
                                            director.since,
                                            meta.meta.timezone
                                              ? meta.meta.timezone
                                              : moment.tz.guess()
                                          )
                                          .format("llll")}
                                    </h5>
                                    </div>
                                </div>
                                </div>
							</div>
							${
                !hosts || !hosts.client || !hosts.client.authorized
                  ? `<div class="callout callout-warning">
							<h5>Remote Hours</h5>

							<p>
							You are not using the in-office timesheet computer. Therefore, if you clock in, your hours will be logged as remote hours.
							</p>
						</div>`
                  : ``
              }

							<div class="card card-danger elevation-2">
							<div class="card-header">
								<h3 class="card-title">Announcements</h3>
							</div>
							<!-- /.card-header -->
							<div class="card-body">
							  <div class="announcements-timesheet"></div>
							</div>
							<!-- /.card-body -->
						</div>
						<div class="card card-warning elevation-2">
							<div class="card-header">
								<h3 class="card-title">Tasks Due</h3>
							</div>
							<!-- /.card-header -->
							<div class="card-body">
							  <div class="tasks-director-${director.ID}"></div>
							</div>
							<!-- /.card-body -->
						</div>


                            <div class="card card-primary elevation-2">
                                <div class="card-header">
                                    <h3 class="card-title">Actions</h3>
                                </div>
                                <!-- /.card-header -->
                                <div class="card-body">
                                    <button
                                        class="btn btn-app bg-${
                                          director.present
                                            ? director.present === 2
                                              ? `indigo`
                                              : `success`
                                            : `danger`
                                        }"
                                        id="section-director-${
                                          director.ID
                                        }-clock"
                                        style="height: 6em; font-size: 1em;"
                                        title="Clock ${
                                          director.present ? `Out` : `In`
                                        }"
                                    >
                                        <i class="fas fa-clock"></i> Clock ${
                                          director.present ? `Out` : `In`
                                        }
                                    </button>
                                    <button
                                        class="btn btn-app bg-warning"
                                        id="section-director-${
                                          director.ID
                                        }-schedule"
                                        style="height: 6em; font-size: 1em;"
                                        title="Manage recurring office hours"
                                    >
                                        <i class="fas fa-calendar"></i> Edit Schedule
                                    </button>
                                </div>
                                <!-- /.card-body -->
                            </div>
                        </div>
                    </div>
                </section>
                `);

      navigation.addItem(
        `#nav-director-${director.ID}`,
        `#section-director-${director.ID}`,
        `Director ${director.name} - WWSU Timesheets`,
        `/director/${director.ID}`,
        false
      );

      window.requestAnimationFrame(() => {
        $(`#section-director-${director.ID}-clock`).unbind("click");
        $(`#section-director-${director.ID}-clock`).click(() => {
          (_director => {
            timesheets.clockForm(_director.ID);
          })(director);
        });

        $(`#section-director-${director.ID}-schedule`).unbind("click");
        $(`#section-director-${director.ID}-schedule`).click(() => {
          (_director => {
            let record = calendar.calendar.find(
              { director: _director.ID },
              true
            );
            if (record) {
              calendar.showSchedules(record.ID);
            }
          })(director);
        });
      });
    });
  });
});

/**
 *  Update all announcements.
 */
function processAnnouncements() {
  animations.add("update-announcements", () => {
    // Process all announcements
    var html = "";
    announcements.db().each(announcement => {
      if (
        announcement.type === "timesheet" &&
        moment(meta.meta.time).isAfter(moment(announcement.starts)) &&
        moment(meta.meta.time).isBefore(moment(announcement.expires))
      ) {
        html += `<div class="alert alert-${announcement.level}">
                    <p class="h5">${announcement.title}</p>
                    ${announcement.announcement}
                  </div>`;
      }
    });

    // Display announcements on website
    $(".announcements-timesheet").html(html);
  });
}

// Click events for shootout
$(`#shootout-active`).on("click", event => {
  shootout.set(`active`, 1);
});
$(`#shootout-inactive`).on("click", event => {
  shootout.set(`active`, 0);
});

$(`#shootout-round`).on("change", event => {
  shootout.set(`round`, event.target.value);
});
$(`#shootout-roundadd`).on("click", event => {
  shootout.set(`round`, parseInt($(`#shootout-round`).val()) + 1);
});

$(`#shootout-time`).on("change", event => {
  shootout.set(`time`, event.target.value);
});
$(`#shootout-timestart`).on("click", event => {
  shootout.set(`timeStart`, moment().valueOf());
});
$(`#shootout-timestop`).on("click", event => {
  shootout.set(`timeStop`, moment().valueOf());
});
$(`#shootout-timeresume`).on("click", event => {
  shootout.set(`timeResume`, moment().valueOf());
});

for (let i = 1; i <= 4; i++) {
  $(`#shootout-name${i}`).on("change", event => {
    shootout.set(`name${i}`, event.target.value);
  });

  $(`#shootout-score${i}`).on("change", event => {
    shootout.set(`score${i}`, event.target.value);
  });

  for (let i2 = 1; i2 <= 3; i2++) {
    $(`#shootout-score${i}-add${i2}`).on("click", event => {
      shootout.set(`score${i}`, parseInt($(`#shootout-score${i}`).val()) + i2);
    });
  }

  $(`#shootout-name${i}-turn`).on("click", event => {
    shootout.set(`turn`, i);
  });
}

shootout.on("change", "website", db => {
  db.get().map(record => {
    if (record.name.startsWith("name")) {
      let name = record.name.replace("name", "");
      $(`#shootout-name${name}`).val(record.value);
    } else if (record.name.startsWith("score")) {
      let score = record.name.replace("score", "");
      $(`#shootout-score${score}`).val(record.value);
    } else if (record.name === "time") {
      $(`#shootout-time`).val(record.value);
    } else if (record.name === "round") {
      $(`#shootout-round`).val(record.value);
    }
  });
});
