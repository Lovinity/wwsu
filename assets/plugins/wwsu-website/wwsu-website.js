/* global moment, WWSUdb, TAFFY, waitFor, WWSUreq, iziToast, waitForElement, Quill, jdenticon, jQuery */

// Define data
var Meta = {
  time: moment().toISOString(true),
  history: [],
  webchat: true,
  state: "unknown",
  line1: `WWSU`,
  line2: `106.9 FM`,
};
var Announcements = new WWSUdb(TAFFY());
var Calendar = new WWSUdb(TAFFY());
var Subscriptions = TAFFY();
var Directors = new WWSUdb(TAFFY());
var Directorhours = new WWSUdb(TAFFY());
var Messages = new WWSUdb(TAFFY());

// Define workers
var calendarWorker = new Worker(
  "/wp-content/themes/mesh-child/assets/js/workers/calendar.js"
);
var directorsWorker = new Worker(
  "/wp-content/themes/mesh-child/assets/js/workers/directors.js"
);

// Define variables
var socket;
var noReq;
var firstTime = true;
var device = getUrlParameter(`device`);
var isMobile = device !== null;
var OneSignal = window.OneSignal || [];
var metaLine2 = false;
var metaTime = 0;
var calendar = {};
var directors = {};
var processCalendarTimer;
var processDirectorTimer;
var announcementIDs = [];
var messageIDs = [];
var onlineSocketDone;
var automationpost;
var notificationsSupported = false;
var blocked = true;
var quill;

waitForElement("#messages-themessage", (element) => {
  quill = new Quill("#messages-themessage", {
    modules: {
      toolbar: [
        ["bold", "italic", "underline", "strike", { color: [] }],
        ["link"],
        ["clean"],
      ],
      keyboard: {
        bindings: {
          // Disable tab input (ADA compliance)
          tab: false,
        },
      },
    },
    theme: "snow",
  });
});

waitForElement("#messages-nickname", (element) => {
  element.addEventListener("change", () => {
    socket.post("/recipients/edit-web", { label: element.value }, () => {});
  });
});

waitFor(
  () => {
    return typeof io !== "undefined" && typeof io.sails !== "undefined";
  },
  () => {
    socket = io.sails.connect("https://server.wwsu1069.org");

    waitFor(
      () => {
        return (
          typeof socket !== "undefined" && typeof socket._raw !== "undefined"
        );
      },
      () => {
        socket._raw.io._reconnection = true;
        socket._raw.io._reconnectionAttempts = Infinity;
      }
    );

    noReq = new WWSUreq(socket, `display-public`);

    // Define socket events
    socket.on("connect", () => {
      doSockets(firstTime);
    });

    socket.on("meta", (data) => {
      for (var key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          Meta[key] = data[key];
        }
      }
      doMeta(data);
    });

    Calendar.assignSocketEvent("calendar", socket);
    Calendar.setOnUpdate((data, db) => {
      clearTimeout(processCalendarTimer);
      processCalendarTimer = setTimeout(() => {
        processCalendar(db);
      }, 1000);
    });
    Calendar.setOnInsert((data, db) => {
      clearTimeout(processCalendarTimer);
      processCalendarTimer = setTimeout(() => {
        processCalendar(db);
      }, 1000);
    });
    Calendar.setOnRemove((data, db) => {
      clearTimeout(processCalendarTimer);
      processCalendarTimer = setTimeout(() => {
        processCalendar(db);
      }, 1000);
    });
    Calendar.setOnReplace((db) => {
      clearTimeout(processCalendarTimer);
      processCalendarTimer = setTimeout(() => {
        processCalendar(db);
      }, 1000);
    });

    Directorhours.assignSocketEvent("directorhours", socket);
    Directorhours.setOnUpdate((data, db) => {
      clearTimeout(processDirectorTimer);
      processDirectorTimer = setTimeout(() => {
        processDirectors();
      }, 1000);
    });
    Directorhours.setOnInsert((data, db) => {
      clearTimeout(processDirectorTimer);
      processDirectorTimer = setTimeout(() => {
        processDirectors();
      }, 1000);
    });
    Directorhours.setOnRemove((data, db) => {
      clearTimeout(processDirectorTimer);
      processDirectorTimer = setTimeout(() => {
        processDirectors();
      }, 1000);
    });
    Directorhours.setOnReplace((db) => {
      clearTimeout(processDirectorTimer);
      processDirectorTimer = setTimeout(() => {
        processDirectors();
      }, 1000);
    });

    Directors.assignSocketEvent("directors", socket);
    Directors.setOnUpdate((data, db) => {
      clearTimeout(processDirectorTimer);
      processDirectorTimer = setTimeout(() => {
        processDirectors();
      }, 1000);
    });
    Directors.setOnInsert((data, db) => {
      clearTimeout(processDirectorTimer);
      processDirectorTimer = setTimeout(() => {
        processDirectors();
      }, 1000);
    });
    Directors.setOnRemove((data, db) => {
      clearTimeout(processDirectorTimer);
      processDirectorTimer = setTimeout(() => {
        processDirectors();
      }, 1000);
    });
    Directors.setOnReplace((db) => {
      clearTimeout(processDirectorTimer);
      processDirectorTimer = setTimeout(() => {
        processDirectors();
      }, 1000);
    });

    Announcements.assignSocketEvent("announcements", socket);
    Announcements.setOnInsert((data, db) => {
      try {
        if (announcementIDs.indexOf(data.ID) === -1) {
          addAnnouncement(data);
        }
      } catch (unusedE) {}
    });
    Announcements.setOnReplace((db) => {
      db.get()
        .filter(
          (announcement) => announcementIDs.indexOf(announcement.ID) === -1
        )
        .map((announcement) => addAnnouncement(announcement));
    });

    Messages.assignSocketEvent("messages", socket);
    Messages.setOnReplace((db) => {
      db.get()
        .filter((message) => messageIDs.indexOf(message.ID) === -1)
        .map((message) => addMessage(message, firstTime));
      firstTime = false;
    });
    Messages.setOnInsert((data, db) => {
      addMessage(data, firstTime);
    });
    Messages.setOnRemove((data, db) => {
      var temp = document.getElementById(`msg-${data}`);
      if (temp !== null) {
        temp.innerHTML = "XXX This message was deleted XXX";
      }
    });
  }
);

function doSockets(firsttime = false) {
  // Mobile devices and web devices where device parameter was passed, start sockets immediately.
  if (isMobile || !firsttime || (!isMobile && device !== null)) {
    // tracksLikedSocket();
    metaSocket();
    announcementsSocket();
    calendarSocket();
    directorSocket();
    directorHoursSocket();
    // loadGenres();
    onlineSocket();
    // web devices without device parameter, connect to OneSignal first and get the ID, then start sockets.
  } else {
    // tracksLikedSocket();
    metaSocket();
    announcementsSocket();
    calendarSocket();
    directorSocket();
    directorHoursSocket();
    // loadGenres();
    onlineSocket(true);
  }
}

function doMeta(response) {
  // If a false was returned for web chatting, then disable it
  if ("webchat" in response && !response.webchat) {
    blocked = true;
    if (document.querySelector("#messages-sendmessage") !== null) {
      document.querySelector("#messages-sendmessage").disabled = true;
    }
    if (document.querySelector("#messages-sendmessagep") !== null) {
      document.querySelector("#messages-sendmessagep").disabled = true;
    }
    if (
      onlineSocketDone &&
      document.querySelector("#messages-status") !== null
    ) {
      document.querySelector(
        "#messages-status"
      ).innerHTML = `<div class="p-3 bs-callout bs-callout-danger shadow-4 text-light"><strong>The host of the current show, or a director, has disabled the chat.</strong> The chat might be re-enabled after this show ends.</div>`;
    }
  } else if (Meta.webchat) {
    blocked = false;
    if (document.querySelector("#messages-sendmessage") !== null) {
      document.querySelector("#messages-sendmessage").disabled = false;
    }
    if (document.querySelector("#messages-sendmessagep") !== null) {
      document.querySelector("#messages-sendmessagep").disabled = false;
    }
  }

  var temp;
  if ("state" in response) {
    if (response.state.includes("automation_") || Meta.state === "unknown") {
      if (automationpost !== "automation") {
        if (
          onlineSocketDone &&
          document.querySelector("#messages-status") !== null
        ) {
          document.querySelector(
            "#messages-status"
          ).innerHTML = `<div class="p-3 bs-callout bs-callout-default shadow-4 text-light"><strong>No one is on the air at this time.</strong> There might not be anyone in the studio at this time to read your message.</div>`;
        }
        automationpost = "automation";
      }
      temp = document.querySelector(`#show-subscribe`);
      if (temp !== null) {
        temp.style.display = "none";
      }
    } else if (response.state === "live_prerecord") {
      if (automationpost !== response.live) {
        if (
          onlineSocketDone &&
          document.querySelector("#messages-status") !== null
        ) {
          document.querySelector(
            "#messages-status"
          ).innerHTML = `<div class="p-3 bs-callout bs-callout-warning shadow-4 text-light"><strong>The current show airing is prerecorded.</strong> There might not be anyone in the studio at this time to read your message.</div>`;
        }
        automationpost = response.live;
      }
    } else {
      if (automationpost !== response.live) {
        temp = document.getElementById("msg-state");
        if (temp) {
          temp.remove();
        }
        if (
          onlineSocketDone &&
          document.querySelector("#messages-status") !== null
        ) {
          document.querySelector(
            "#messages-status"
          ).innerHTML = `<div class="p-3 bs-callout bs-callout-success shadow-4 text-light"><strong>The show airing now is live.</strong> Your messages should be received by the DJ / host.</div>`;
        }
        automationpost = response.live;
      }
    }
  }
}

function getUrlParameter(name) {
  name = name.replace(/[[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(window.location.search);
  return results === null
    ? null
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function metaSocket() {
  noReq.request({ method: "POST", url: "/meta/get", data: {} }, (body) => {
    // console.log(body);
    try {
      for (var key in body) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          Meta[key] = body[key];
        }
      }
      doMeta(body);
    } catch (unusedE) {
      setTimeout(metaSocket, 10000);
    }
  });
}

function calendarSocket() {
  try {
    Calendar.replaceData(noReq, "/calendar/get");
  } catch (e) {
    console.log(e);
    console.log("FAILED CALENDAR CONNECTION");
    setTimeout(calendarSocket, 10000);
  }
}

function messagesSocket() {
  try {
    Messages.replaceData(noReq, "/messages/get-web");
  } catch (e) {
    console.log(e);
    console.log("FAILED MESSAGES CONNECTION");
    setTimeout(messagesSocket, 10000);
  }
}

function announcementsSocket() {
  try {
    Calendar.replaceData(noReq, "/announcements/get", { type: "website" });
  } catch (e) {
    console.log(e);
    console.log("FAILED ANNOUNCEMENTS CONNECTION");
    setTimeout(announcementsSocket, 10000);
  }
}

function directorSocket() {
  try {
    Directors.replaceData(noReq, "/directors/get");
  } catch (e) {
    console.log(e);
    console.log("FAILED DIRECTORS CONNECTION");
    setTimeout(directorSocket, 10000);
  }
}

function directorHoursSocket() {
  try {
    Directorhours.replaceData(noReq, "/directors/get-hours");
  } catch (e) {
    console.log(e);
    console.log("FAILED DIRECTORHOURS CONNECTION");
    setTimeout(directorHoursSocket, 10000);
  }
}

function updateNowPlaying() {
  metaTime++;
  if (metaTime >= 5) {
    metaTime = 0;
    metaLine2 = !metaLine2;
    if (metaLine2 && Meta.line2 === ``) {
      metaLine2 = false;
    }
  }
  var temp = document.querySelector(`.mesh-title`);
  if (temp !== null) {
    if (metaLine2) {
      temp.innerHTML = Meta.line2;
    } else {
      temp.innerHTML = Meta.line1;
    }
  }

  temp = document.querySelector(`#slider-meta`);
  if (temp !== null) {
    temp.innerHTML = `${Meta.line1}<br />${Meta.line2}`;
  }
}

function updateCalendar() {
  var temp = document.querySelector(`#radio-show-title`);
  var temp2 = document.querySelector(`#radio-show-host`);
  var temp3 = document.querySelector(`#radio-show-schedule`);

  if (
    temp !== null &&
    temp2 !== null &&
    temp3 !== null &&
    temp3.innerHTML === `Loading...`
  ) {
    if (
      typeof calendar[`${temp2.innerHTML} - ${temp.innerHTML}`] !== `undefined`
    ) {
      temp3.innerHTML = ``;
      calendar[`${temp2.innerHTML} - ${temp.innerHTML}`].map((event) => {
        var activeStatus = `Past`;
        switch (event.active) {
          case 2:
            activeStatus = `Scheduled (Changed from original date/time)`;
            break;
          case 1:
            activeStatus = `Scheduled`;
            break;
          case -1:
            activeStatus = `CANCELED`;
            break;
        }
        if (
          event.active >= 1 &&
          notificationsSupported &&
          (device !== null || isMobile)
        ) {
          var subscribed = Subscriptions([
            { type: `calendar-once`, subtype: event.id },
            {
              type: `calendar-all`,
              subtype: `${temp2.innerHTML} - ${temp.innerHTML}`,
            },
          ]).get().length;
          if (subscribed === 0) {
            activeStatus += `   <a class="btn btn-primary" onclick="subscribe('calendar-once', '${event.id}')">Subscribe this date only</a>`;
          }
        }
        temp3.innerHTML += `<p><strong>${event.startT} - ${event.endT}</strong>: ${activeStatus}</p>`;
      });
      if (!notificationsSupported) {
        temp3.innerHTML += `<p><strong>Your browser does not support push notifications for radio shows.</strong> Do not worry! A WWSU mobile app will be released soon.</p>`;
      } else {
        if (device === null && !isMobile) {
          temp3.innerHTML += `<p style="font-size: 1.5em;">Want to subscribe to push notifications? <a class="btn btn-primary" onclick="OneSignal.showNativePrompt()">Allow Notifications</a> in your browser first.</p>`;
        } else {
          if (subscribe !== 0) {
            temp3.innerHTML += `<p style="font-size: 1.5em;">Want push notifications whenever this show goes on the air? <a class="btn btn-primary" onclick="subscribe('calendar-all', '${escapeHTML(
              temp2.innerHTML
            )} - ${escapeHTML(temp.innerHTML)}')">Subscribe</a></p>`;
          } else {
            temp3.innerHTML += `<p style="font-size: 1.5em;">Tired of push notifications? <a class="btn btn-primary" onclick="unsubscribe('${
              event.id
            }', '${escapeHTML(temp2.innerHTML)} - ${escapeHTML(
              temp.innerHTML
            )}')">Un-subscribe from all dates</a></p>`;
          }
        }
      }
    } else {
      temp3.innerHTML = `Official schedule for this show could not be loaded.`;
    }
  }
}

function updateDirectors() {
  var temp = document.querySelector(`#director-name`);
  var temp2 = document.querySelector(`#director-schedule`);

  if (temp !== null && temp2 !== null && temp2.innerHTML === `Loading...`) {
    if (typeof directors[temp.innerHTML] !== `undefined`) {
      temp2.innerHTML = `<h3>${
        directors[temp.innerHTML].present
          ? directors[temp.innerHTML].present === 2
            ? `Director is <strong>doing hours remotely</strong> right now.`
            : `Director is <strong>in the office at WWSU</strong> right now.`
          : `Director is <strong>out of the office</strong> right now.`
      }</h3>`;
      directors[temp.innerHTML].hours.map((event) => {
        var activeStatus = `Past`;
        switch (event.active) {
          case 2:
            activeStatus = `Scheduled (Changed from original date/time)`;
            break;
          case 1:
            activeStatus = `Scheduled`;
            break;
          case -1:
            activeStatus = `CANCELED`;
            break;
        }
        temp2.innerHTML += `<p><strong>${event.startT} - ${event.endT}</strong>: ${activeStatus}</p>`;
      });
    } else {
      temp2.innerHTML = `Office hours for this director could not be loaded.`;
    }
  }
}

setInterval(() => {
  updateNowPlaying();
  updateCalendar();
  updateDirectors();
}, 1000);

// Update the calendar slides
function processCalendar(db) {
  try {
    calendarWorker.postMessage([db.get(), moment(Meta.time).toISOString(true)]);
  } catch (e) {
    console.error(e);
  }
}

calendarWorker.onmessage = function (e) {
  calendar = e.data;
  var temp3 = document.querySelector(`#radio-show-schedule`);
  if (temp3 !== null) {
    temp3.innerHTML = `Loading...`;
  }
  updateCalendar();
};

function processDirectors() {
  try {
    directorsWorker.postMessage([
      Directors.db().get(),
      Directorhours.db().get(),
      moment(Meta.time).toISOString(true),
    ]);
  } catch (e) {
    console.error(e);
  }
}

directorsWorker.onmessage = function (e) {
  directors = e.data;
  var temp3 = document.querySelector(`#director-schedule`);
  if (temp3 !== null) {
    temp3.innerHTML = `Loading...`;
  }
  updateDirectors();
};

function addAnnouncement(announcement) {
  if (
    moment(Meta.time).isAfter(moment(announcement.starts)) &&
    moment(Meta.time).isBefore(moment(announcement.expires))
  ) {
    var color = "info";
    if (announcement.level === "success") {
      color = "green";
    }
    if (announcement.level === "danger" || announcement.level === "urgent") {
      color = "red";
    }
    if (announcement.level === "warning") {
      color = "yellow";
    }
    announcementIDs.push(announcement.ID);
    iziToast.show({
      title: announcement.title,
      message: announcement.announcement,
      color: color,
      zindex: 100,
      layout: 1,
      closeOnClick: true,
      pauseOnHover: true,
      close: true,
      position: "bottomCenter",
      timeout: announcement.displayTime * 1000 || 15000,
    });
  }
}

function onlineSocket(doOneSignal = false) {
  socket.post(
    "/recipients/add-web",
    { device: device },
    function serverResponded(body) {
      try {
        var nickname = document.querySelector("#messages-nickname");
        if (nickname) {
          nickname.value = body.label;
          nickname.value = nickname.value.replace("Web ", "");
          nickname.value = nickname.value.match(/\(([^)]+)\)/)[1];
        }
        onlineSocketDone = true;
        automationpost = ``;
        doMeta({ webchat: Meta.webchat, state: Meta.state });
        if (doOneSignal) {
          OneSignal.push(() => {
            try {
              OneSignal.init({
                appId: "150c0123-e224-4e5b-a8b2-fc202d78e2f1",
                autoResubscribe: true,
              });
            } catch (unusedE) {
              iziToast.show({
                title: "OneSignal Error",
                message:
                  "There was an error with OneSignal. Subscriptions and push notifications will not work at this time on the website.",
                color: "red",
                zindex: 100,
                layout: 2,
                closeOnClick: true,
                position: "bottomCenter",
                timeout: 10000,
              });
            }

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
                  device = userId;
                  onlineSocket();
                });
              } else if (currentPermission === "denied" && device !== null) {
                device = null;
                onlineSocket();
              }
            });

            // On changes to web notification subscriptions; update subscriptions and device.
            OneSignal.on("subscriptionChange", (isSubscribed) => {
              if (isSubscribed && device === null) {
                OneSignal.getUserId().then((userId) => {
                  device = userId;
                  onlineSocket();
                });
              } else if (!isSubscribed && device !== null) {
                device = null;
                onlineSocket();
              }
            });
          });
        }
        messagesSocket();
      } catch (unusedE) {
        setTimeout(onlineSocket, 10000);
      }
    }
  );

  if (device && device !== null) {
    socket.post(
      "/subscribers/get-web",
      { device: device },
      function serverResponded(body) {
        try {
          Subscriptions = TAFFY();
          Subscriptions.insert(body);
          doMeta({ state: Meta.state });
        } catch (unusedE) {
          setTimeout(metaSocket, 10000);
        }
      }
    );
  }

  var temp = document.querySelector(`#track-info-subscribe`);
  if (temp !== null) {
    if (device === null && !isMobile) {
      temp.style.display = "block";
    } else {
      temp.style.display = "none";
    }
  }

  temp = document.querySelector(`#messages-subscribe`);
  if (temp !== null) {
    if (device === null && !isMobile) {
      temp.style.display = "block";
    } else {
      temp.style.display = "none";
    }
  }
}

// LINT: used in HTML
// eslint-disable-next-line no-unused-vars
function subscribe(type, subtype) {
  socket.post(
    "/subscribers/add",
    { device: device, type: type, subtype: subtype },
    function serverResponded(response) {
      try {
        if (response !== "OK") {
          iziToast.show({
            title: "Subscription failed",
            message:
              "Unable to subscribe you to this event at this time. Please try again later. If this problem continues, please email engineer@wwsu1069.org.",
            color: "red",
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: "center",
            timeout: 15000,
            pauseOnHover: true,
          });
        } else {
          iziToast.show({
            title: "Subscribed!",
            message: `You successfully subscribed to that event. You will receive a push notification when it goes live. To un-subscribe and stop receiving notifications, go to the show page and click the appropriate "unsubscribe" button. <strong>WWSU may remove notification subscriptions of users who do not visit WWSU for more than a month, at their discretion.</strong>`,
            color: "green",
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: "center",
            timeout: 30000,
            pauseOnHover: true,
          });
          Subscriptions.insert({ type: type, subtype: subtype });
          var temp = document.querySelector(`#show-subscribe`);
          if (
            temp !== null &&
            (subtype === Meta.show || subtype === `Sports: ${Meta.show}`)
          ) {
            temp.style.display = "none";
          }
          var temp3 = document.querySelector(`#radio-show-schedule`);
          temp3.innerHTML = `Loading...`;
        }
      } catch (unusedE) {
        iziToast.show({
          title: "Subscription failed",
          message:
            "Unable to subscribe you to this event at this time: internal error. Please try again later. Please email engineer@wwsu1069.org if this problem continues.",
          color: "red",
          zindex: 100,
          layout: 1,
          closeOnClick: true,
          position: "center",
          timeout: 15000,
          pauseOnHover: true,
        });
      }
    }
  );
}

// LINT: Used in HTML
// eslint-disable-next-line no-unused-vars
function unsubscribe(ID, event) {
  socket.post(
    "/subscribers/remove",
    { device: device, type: `calendar-once`, subtype: ID },
    function serverResponded(response) {
      try {
        if (response !== "OK") {
          iziToast.show({
            title: "Failed to unsubscribe",
            message:
              "Unable to un-subscribe you to this event at this time. Please try again later. If this problem continues, please email engineer@wwsu1069.org.",
            color: "red",
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: "center",
            timeout: 15000,
          });
        } else {
          socket.post(
            "/subscribers/remove",
            { device: device, type: `calendar-all`, subtype: event },
            function serverResponded(response) {
              try {
                if (response !== "OK") {
                  iziToast.show({
                    title: "Failed to unsubscribe",
                    message:
                      "Unable to un-subscribe you to this event at this time. Please try again later. If this problem continues, please email engineer@wwsu1069.org.",
                    color: "red",
                    zindex: 100,
                    layout: 1,
                    closeOnClick: true,
                    position: "center",
                    timeout: 15000,
                    pauseOnHover: true,
                  });
                } else {
                  iziToast.show({
                    title: "Un-subscribed!",
                    message:
                      "You successfully un-subscribed from that event. You will no longer receive push notifications for it.",
                    color: "green",
                    zindex: 100,
                    layout: 1,
                    closeOnClick: true,
                    position: "center",
                    timeout: 10000,
                  });
                  Subscriptions({
                    type: `calendar-once`,
                    subtype: ID,
                  }).remove();
                  Subscriptions({
                    type: `calendar-all`,
                    subtype: event,
                  }).remove();
                  var temp3 = document.querySelector(`#radio-show-schedule`);
                  temp3.innerHTML = `Loading...`;
                }
              } catch (unusedE) {
                iziToast.show({
                  title: "Failed to unsubscribe",
                  message:
                    "Unable to un-subscribe you to this event at this time. Please try again later. If this problem continues, please email engineer@wwsu1069.org.",
                  color: "red",
                  zindex: 100,
                  layout: 1,
                  closeOnClick: true,
                  position: "center",
                  timeout: 15000,
                  pauseOnHover: true,
                });
              }
            }
          );
        }
      } catch (unusedE) {
        iziToast.show({
          title: "Failed to unsubscribe",
          message:
            "Unable to un-subscribe you to this event at this time due to an internal error. Please email engineer@wwsu1069.org.",
          color: "red",
          zindex: 100,
          layout: 1,
          closeOnClick: true,
          position: "center",
          timeout: 15000,
          pauseOnHover: true,
        });
      }
    }
  );
}

function escapeHTML(str) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Send a message through the system
// USED in html
// eslint-disable-next-line no-unused-vars
function sendMessage(privateMsg) {
  if (
    blocked ||
    document.querySelector("#messages-nickname") === null ||
    !quill
  ) {
    return null;
  }
  var message = quillGetHTML(quill.getContents());
  socket.post(
    "/messages/send-web",
    {
      message: message,
      nickname: document.querySelector("#messages-nickname").value,
      private: privateMsg,
    },
    function serverResponded(response) {
      try {
        // response = JSON.parse(response);
        if (response !== "OK") {
          iziToast.show({
            title: "Could not send message",
            message:
              "You might be sending messages too fast, are banned from sending messages, or there was a network issue. Please try again in a few minutes. Please email engineer@wwsu1069.org if this problem continues.",
            color: "red",
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: "center",
            timeout: 15000,
            pauseOnHover: true,
          });
        }
        quill.setText("");
      } catch (unusedE) {
        iziToast.show({
          title: "Could not send message",
          message:
            "There was an internal error when trying to send a message. Please try clearing your browser cache and refreshing the website. If this continues, email engineer@wwsu1069.org.",
          color: "red",
          zindex: 100,
          layout: 1,
          closeOnClick: true,
          position: "center",
          timeout: 15000,
          pauseOnHover: true,
        });
      }
    }
  );
}

function quillGetHTML(inputDelta) {
  var tempCont = document.createElement("div");
  new Quill(tempCont).setContents(inputDelta);
  return tempCont.getElementsByClassName("ql-editor")[0].innerHTML;
}

// Used to empty the chat box
// USED in html
// eslint-disable-next-line no-unused-vars
function clearChat() {
  if (document.querySelector("#messages") === null) {
    document.querySelector("#messages").innerHTML = "";
  }
}

function addMessage(data, firsttime = false) {
  var messageBox = document.querySelector("#messages");
  var shouldScroll = false;
  if (messageBox !== null) {
    shouldScroll =
      messageBox.scrollTop + messageBox.clientHeight ===
      messageBox.scrollHeight;
  }

  messageIDs.push(data.ID);

  var position =
    data.fromFriendly !==
    (document.querySelector("#messages-nickname") !== null
      ? `Web (${document.querySelector("#messages-nickname").value})`
      : "")
      ? "left"
      : "right";
  var ago = moment(data.createdAt).format("hh:mm A");
  var from = `from-website`;
  if (!data.from.startsWith("website")) {
    if (
      data.to_friendly ===
      (document.querySelector("#messages-nickname") !== null
        ? `Web (${document.querySelector("#messages-nickname").value})`
        : "")
    ) {
      from = `from-dj-you`;
    } else {
      from = `from-dj-general`;
    }
  }

  document.querySelector("#messages").innerHTML += `
  <div class="answer ${position}">
                <div class="avatar">
                ${jdenticon.toSvg(data.from, 36)}
                </div>
                <div class="name">${data.fromFriendly}${
    data.to === `DJ-private` || data.to.startsWith("website-")
      ? " (Private Message)"
      : ""
  }</div>
                <div class="text ${from}">
                  ${data.message}
                </div>
                <div class="time">${ago}</div>
              </div>
  `;

  if (data.to.startsWith("website-") && !firsttime) {
    iziToast.show({
      title: "Private message from " + data.fromFriendly,
      message: data.message,
      color: "yellow",
      zindex: 100,
      layout: 2,
      closeOnClick: true,
      position: "bottomCenter",
      timeout: 15000,
      balloon: true,
      pauseOnHover: true,
    });
  }

  if (data.to === "website" && !firsttime) {
    iziToast.show({
      title: "Message from " + data.fromFriendly,
      message: data.message,
      color: "yellow",
      zindex: 100,
      layout: 2,
      closeOnClick: true,
      position: "bottomCenter",
      timeout: 15000,
      balloon: true,
      pauseOnHover: true,
    });
  }

  if (shouldScroll && document.querySelector("#messages")) {
    jQuery("#messages").animate(
      { scrollTop: jQuery("#messages").prop("scrollHeight") },
      1000
    );
  }
}
