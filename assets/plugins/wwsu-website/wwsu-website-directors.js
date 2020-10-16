"use strict";
window.addEventListener("DOMContentLoaded", () => {
  var machineID = null;

  // Animation queue
  var animations = new WWSUanimations();

  // Connection
  io.sails.url = "https://server.wwsu1069.org";
  io.sails.reconnectionAttempts = 3;
  var socket = io.sails.connect();

  // WWSU Plugins
  var wwsuutil = new WWSUutil();
  var navigation = new WWSUNavigation();

  // WWSU Requests and Endpoint managers
  var noReq = new WWSUreq(socket, null);
  var meta = new WWSUMeta(socket, noReq);
  var directors = new WWSUdirectors(socket, noReq);
  var directorReq = new WWSUreq(
    socket,
    machineID,
    directors,
    null,
    "name",
    "/auth/director",
    "Director"
  );
  var adminDirectorReq = new WWSUreq(
    socket,
    machineID,
    directors,
    { admin: true },
    "name",
    "/auth/admin-director",
    "Administrator Director"
  );
  var djs = new WWSUdjs(socket, noReq, directorReq, null, null, meta);
  var djReq = new WWSUreq(
    socket,
    machineID,
    djs,
    null,
    "name",
    "/auth/dj",
    "DJ"
  );
  var announcements = new WWSUannouncements(
    socket,
    noReq,
    ["timesheet"],
    meta,
    directorReq
  );
  var calendar = new WWSUcalendar(socket, meta, noReq, directorReq, djReq);
  var discipline = new WWSUdiscipline(socket, noReq, directorReq, meta);
  var timesheets = new WWSUtimesheet(
    socket,
    noReq,
    directorReq,
    adminDirectorReq,
    meta,
    null
  );

  timesheets.init(
    `#section-timesheets-hours`,
    `#section-timesheets-records`,
    `#section-timesheets-start`,
    `#section-timesheets-end`,
    `#section-timesheets-browse`
  );

  // navigation
  var navigation = new WWSUNavigation();
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
    "#nav-timesheets",
    "#section-timesheets",
    "Director timesheets - WWSU DJ Controls",
    "/directors/timesheets",
    false
  );

  /*
        CALENDAR
    */

  // Initialize Calendar
  var calendarEl = document.getElementById("calendar");

  var fullCalendar = new FullCalendar.Calendar(calendarEl, {
    headerToolbar: {
      start: "prev,next today",
      center: "title",
      end: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
    },
    initialView: "timeGridWeek",
    navLinks: true, // can click day/week names to navigate views
    selectable: false,
    selectMirror: true,
    nowIndicator: true,
    editable: false,
    eventStartEditable: false,
    eventDurationEditable: false,
    eventResourceEditable: false,
    themeSystem: "bootstrap",
    dayMaxEvents: 5,
    events: function (info, successCallback, failureCallback) {
      animations.add("calendar-refetch", () => {
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
                    var temp = document.getElementById(`filter-${event.type}`);
                    if (temp !== null && temp.checked) {
                      return true;
                    } else {
                      return false;
                    }
                  })
                  .map((event) => {
                    var borderColor;
                    var title = `${event.type}: ${event.hosts} - ${event.name}`;
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
                      groupId: event.calendarID,
                      start: moment.parseZone(event.start).toISOString(true),
                      end: moment.parseZone(event.end).toISOString(true),
                      title: title,
                      backgroundColor:
                        ["canceled", "canceled-system"].indexOf(
                          event.scheduleType
                        ) === -1
                          ? event.color
                          : "#161616",
                      textColor: wwsuutil.getContrastYIQ(event.color)
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
    "office-hours",
  ].map((type) => {
    var temp = document.getElementById(`filter-${type}`);
    if (temp !== null) {
      temp.addEventListener("click", (e) => {
        fullCalendar.refetchEvents();
      });
    }
  });

  // execute updateCalendar function each time calendar has been changed, but add a 1-second buffer so we don't update a million times at once.
  let calTimer;
  calendar.on("calendarUpdated", "renderer", () => {
    clearTimeout(calTimer);
    calTimer = setTimeout(() => {
      fullCalendar.refetchEvents();
    }, 1000);
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
      version.init();
    });
  });

  /*
        META
    */

  // Meta ticker
  meta.on("metaTick", "renderer", (fullMeta) => {
    // Update station time
    animations.add("meta-time", () => {
      $(".meta-time").html(moment.parseZone(fullMeta.time).format("llll"));
    });
  });

  /*
        DIRECTORS
    */

  directors.on("change", "renderer", (db) => {
    animations.add("update-directors", () => {
      // Remove all director sections
      $(`#sections-directors`).html("");

      // Erase menu html
      $("#nav-directors").html("");
      $("#nav-assistants").html("");

      // Add sections and menu items for each director
      db.get().map((director) => {
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
            ((_director) => {
              timesheets.clockForm(_director.ID);
            })(director);
          });

          $(`#section-director-${director.ID}-schedule`).unbind("click");
          $(`#section-director-${director.ID}-schedule`).click(() => {
            ((_director) => {
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
});
