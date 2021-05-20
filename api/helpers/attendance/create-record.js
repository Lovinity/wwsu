module.exports = {
  friendlyName: "attendance.createRecord",

  description:
    "Create a new attendance record, or end the current one. Also manages stats / XP awarding when applicable.",

  inputs: {
    event: {
      type: "json",
      description:
        "Event object triggering the new attendance record. If undefined, the current attendance will be closed, but a new one will not be created. If null, an attendance record for default genre rotation will be started.",
    },
    useMeta: {
      type: "boolean",
      defaultsTo: false,
      description:
        "If true, will use the DJs and show name in the current meta information instead of in the provided event.",
    },
    unscheduled: {
      type: "boolean",
      defaultsTo: false,
      description: "If true, this is an unscheduled show.",
    },
    problemTerminated: {
      type: "boolean",
      defaultsTo: false,
      description:
        "If true, this attendance record is being changed because of a major system problem or lofi being activated. Accountability will not be logged.",
    },
  },

  fn: async function (inputs, exits) {
    sails.log.debug("Helper attendance.createRecord called.");

    try {
      var returnData = { newID: null, unique: null };

      // Store the current ID in a variable; we want to start a new record before processing the old one
      var currentID = sails.models.meta.memory.attendanceID;

      // Create default rotation if inputs.event is null
      if (inputs.event === null) {
        inputs.event = {
          type: "genre",
          hosts: "Unknown Hosts",
          name: "Default Rotation",
          hostDJ: null,
          cohostDJ1: null,
          cohostDJ2: null,
          cohostDJ3: null,
        };
      }

      // Add a new attendance record if event is specified.
      if (inputs.event) {
        // If useMeta provided, make a separate event using the info provided in meta
        var nowEvent = _.cloneDeep(inputs.event);
        if (inputs.useMeta) {
          nowEvent = Object.assign(nowEvent, {
            hostDJ: sails.models.meta.memory.dj,
            cohostDJ1: sails.models.meta.memory.cohostDJ1,
            cohostDJ2: sails.models.meta.memory.cohostDJ2,
            cohostDJ3: sails.models.meta.memory.cohostDJ3,
            logo: sails.models.meta.memory.showLogo,
            description: sails.models.meta.memory.topic,
          });

          nowEvent = Object.assign(nowEvent, {
            hosts: await sails.helpers.calendar.generateHosts(nowEvent),
          });
        }

        // Create the new attendance record
        var created = null;

        if (nowEvent.unique && nowEvent.calendarID) {
          returnData.unique = nowEvent.unique;
          created = await sails.models.attendance
            .create({
              calendarID: nowEvent.calendarID,
              unique: nowEvent.unique,
              dj: nowEvent.hostDJ,
              cohostDJ1: nowEvent.cohostDJ1,
              cohostDJ2: nowEvent.cohostDJ2,
              cohostDJ3: nowEvent.cohostDJ3,
              happened: inputs.unscheduled ? 2 : 1,
              event: `${nowEvent.type}: ${nowEvent.hosts} - ${nowEvent.name}`,
              scheduledStart: moment(nowEvent.start).toISOString(true),
              scheduledEnd: moment(nowEvent.end).toISOString(true),
              actualStart: moment().toISOString(true),
            })
            .fetch();

          // Log if any specified DJs do not match the DJs that were on the schedule
          let scheduledDJs = [];
          let onAirDJs = [];
          ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map((dj) => {
            if (inputs.event[dj]) scheduledDJs.push(inputs.event[dj]);
            if (sails.models.meta.memory[dj])
              onAirDJs.push(sails.models.meta.memory[dj]);
          });

          if (_.difference(onAirDJs, scheduledDJs)) {
            await sails.models.logs
              .create({
                attendanceID: created.ID,
                logtype: "unspecified-djs",
                loglevel: "info",
                logsubtype: `${nowEvent.hosts} - ${nowEvent.name}`,
                logIcon: sails.models.calendar.calendardb.getIconClass(
                  nowEvent
                ),
                title: `One or more specified DJs for this broadcast were not on the event schedule.`,
                event: `Listed on the schedule: ${inputs.event.hosts} - ${inputs.event.name}<br />Specified on the air: ${sails.models.meta.memory.show}`,
                createdAt: moment().toISOString(true),
              })
              .fetch()
              .tolerate((err) => {
                sails.log.error(err);
              });
          }

          // Log if actualStart was 5 or more minutes before scheduledStart
          if (
            moment()
              .add(5, "minutes")
              .isSameOrBefore(moment(nowEvent.start)) &&
            ["show", "sports", "remote", "prerecord", "playlist"].indexOf(
              nowEvent.type
            ) !== -1
          ) {
            await sails.models.logs
              .create({
                attendanceID: created.ID,
                logtype: "sign-on-early",
                loglevel: "orange",
                logsubtype: `${nowEvent.hosts} - ${nowEvent.name}`,
                logIcon: sails.models.calendar.calendardb.getIconClass(
                  nowEvent
                ),
                title: `The broadcast started 5 or more minutes early.`,
                event: `${nowEvent.type}: ${nowEvent.hosts} - ${nowEvent.name}`,
                createdAt: moment().toISOString(true),
              })
              .fetch()
              .tolerate((err) => {
                sails.log.error(err);
              });
          }

          // Log if actualStart was 10 or more minutes after scheduledStart
          if (
            moment()
              .subtract(10, "minutes")
              .isSameOrAfter(moment(nowEvent.start)) &&
            ["show", "sports", "remote", "prerecord", "playlist"].indexOf(
              nowEvent.type
            ) !== -1
          ) {
            await sails.models.logs
              .create({
                attendanceID: created.ID,
                logtype: "sign-on-late",
                loglevel: "warning",
                logsubtype: `${nowEvent.hosts} - ${nowEvent.name}`,
                logIcon: sails.models.calendar.calendardb.getIconClass(
                  nowEvent
                ),
                title: `The broadcast started 10 or more minutes late.`,
                event: `${nowEvent.type}: ${nowEvent.hosts} - ${nowEvent.name}`,
                createdAt: moment().toISOString(true),
              })
              .fetch()
              .tolerate((err) => {
                sails.log.error(err);
              });
          }
        } else {
          created = await sails.models.attendance
            .create({
              unique: "",
              dj: nowEvent.hostDJ,
              cohostDJ1: nowEvent.cohostDJ1,
              cohostDJ2: nowEvent.cohostDJ2,
              cohostDJ3: nowEvent.cohostDJ3,
              happened: inputs.unscheduled ? 2 : 1,
              event: `${nowEvent.type}: ${nowEvent.hosts} - ${nowEvent.name}`,
              actualStart: moment().toISOString(true),
              scheduledStart: null,
              scheduledEnd: null,
            })
            .fetch();
        }

        returnData.newID = created.ID;

        // Switch to the new record in the system
        await sails.helpers.meta.change.with({
          attendanceID: created.ID,
          calendarUnique: nowEvent.unique || null,
          calendarID: nowEvent.calendarID || null,
          scheduledStart: nowEvent.start || null,
          scheduledEnd: nowEvent.end || null,
        });
      } else if (inputs.event === null) {
        var created = await sails.models.attendance
          .create({
            unique: "",
            happened: 1,
            event: `genre: Unknown Hosts - Default Rotation`,
            actualStart: moment().toISOString(true),
          })
          .fetch();
        returnData.newID = created.ID;
        await sails.helpers.meta.change.with({
          attendanceID: created.ID,
          calendarUnique: null,
          calendarID: null,
          scheduledStart: null,
          scheduledEnd: null,
        });
      } else {
        returnData.newID = null;
        await sails.helpers.meta.change.with({
          attendanceID: null,
          calendarUnique: null,
          calendarID: null,
          scheduledStart: null,
          scheduledEnd: null,
        });
      }

      // Add actualEnd to the previous attendance record, calculate showTime, calculate listenerMinutes, and calculate new weekly DJ stats to broadcast
      if (currentID !== null) {
        // Add actualEnd
        var currentRecord = await sails.models.attendance.updateOne(
          { ID: currentID },
          { actualEnd: moment().toISOString(true) }
        );

        if (currentRecord) {
          var event = currentRecord.event.split(": ");
          if (!inputs.problemTerminated) {
            // Log if actualEnd was 10 or more minutes before scheduledEnd
            if (
              currentRecord &&
              currentRecord.scheduledEnd &&
              moment()
                .add(10, "minutes")
                .isSameOrBefore(moment(currentRecord.scheduledEnd)) &&
              (currentRecord.event.toLowerCase().startsWith("show:") ||
                currentRecord.event.toLowerCase().startsWith("sports:") ||
                currentRecord.event.toLowerCase().startsWith("remote:") ||
                currentRecord.event.toLowerCase().startsWith("prerecord:") ||
                currentRecord.event.toLowerCase().startsWith("playlist:"))
            ) {
              await sails.models.logs
                .create({
                  attendanceID: currentRecord.ID,
                  logtype: "sign-off-early",
                  loglevel: "warning",
                  logsubtype: `${event[1]}`,
                  logIcon: sails.models.calendar.calendardb.getIconClass({
                    type: event[0],
                  }),
                  title: `The broadcast signed off 10 or more minutes early.`,
                  event: `${currentRecord.event}`,
                  createdAt: moment().toISOString(true),
                })
                .fetch()
                .tolerate((err) => {
                  sails.log.error(err);
                });
            }

            // Log if actualEnd was 5 or more minutes after scheduledEnd
            if (
              currentRecord &&
              currentRecord.scheduledEnd &&
              moment()
                .subtract(5, "minutes")
                .isSameOrAfter(moment(currentRecord.scheduledEnd)) &&
              (currentRecord.event.toLowerCase().startsWith("show:") ||
                currentRecord.event.toLowerCase().startsWith("sports:") ||
                currentRecord.event.toLowerCase().startsWith("remote:") ||
                currentRecord.event.toLowerCase().startsWith("prerecord:") ||
                currentRecord.event.toLowerCase().startsWith("playlist:"))
            ) {
              await sails.models.logs
                .create({
                  attendanceID: currentRecord.ID,
                  logtype: "sign-off-late",
                  loglevel: "orange",
                  logsubtype: `${event[1]}`,
                  logIcon: sails.models.calendar.calendardb.getIconClass({
                    type: event[0],
                  }),
                  title: `The broadcast signed off 5 or more minutes late.`,
                  event: `${currentRecord.event}`,
                  createdAt: moment().toISOString(true),
                })
                .fetch()
                .tolerate((err) => {
                  sails.log.error(err);
                });
            }
          } else {
            await sails.models.logs
              .create({
                attendanceID: currentRecord.ID,
                logtype: "sign-off-problem",
                loglevel: "yellow",
                logsubtype: `${event[1]}`,
                logIcon: sails.models.calendar.calendardb.getIconClass({
                  type: event[0],
                }),
                title: `The broadcast was signed off due to a system problem or CRON being disabled.`,
                event: `${currentRecord.event}`,
                createdAt: moment().toISOString(true),
              })
              .fetch()
              .tolerate((err) => {
                sails.log.error(err);
              });
          }

          // Calculate attendance stats and weekly analytics in the background; this takes several seconds
          var temp = (async (cID) => {
            var stats = await sails.helpers.attendance.recalculate(cID);
            var topStats = await sails.helpers.attendance.calculateStats();
            var djStats = await sails.helpers.analytics.showtime([
              currentRecord.dj,
              currentRecord.cohostDJ1,
              currentRecord.cohostDJ2,
              currentRecord.cohostDJ3,
            ])[0];

            // Send analytic emails to DJs
            await sails.helpers.emails.queueDjs(
              {
                hostDJ: currentRecord.dj,
                cohostDJ1: currentRecord.cohostDJ1,
                cohostDJ2: currentRecord.cohostDJ2,
                cohostDJ3: currentRecord.cohostDJ3,
              },
              `Analytics for ${currentRecord.event}`,
              `<p>Hello!</p>
              
  <p>Congratulations on another successful episode of ${
    currentRecord.event
  }! Below, you will find analytics for this episode.</p>
  <ul>
  <li><strong>Signed On:</strong> ${moment(currentRecord.actualStart).format(
    "LLLL"
  )}</li>
  <li><strong>Signed Off:</strong> ${moment(currentRecord.actualEnd).format(
    "LLLL"
  )}</li>
  <li><strong>Showtime:</strong> ${moment
    .duration(stats.showTime, "minutes")
    .format("h [hours], m [minutes]")}</li>
  <li><strong>Online Listener Time*:</strong> ${moment
    .duration(stats.listenerMinutes, "minutes")
    .format("h [hours], m [minutes]")}</li>
  <li><strong>Listener to Showtime Ratio (higher ratio = better performing broadcast):</strong> ${
    stats.showTime > 0 ? stats.listenerMinutes / stats.showTime : 0
  }</li>
  <li><strong>Messages sent / received with listeners:</strong> ${
    stats.webMessages
  }</li>
  ${
    topStats[0].topShows.indexOf(event[1]) !== -1
      ? `<li><strong>Congratulations! Your broadcast placed number ${
          topStats[0].topShows.indexOf(event[1]) + 1
        } in the top ${
          topStats[0].topShows.length
        } shows of the last week!</strong></li>`
      : ``
  }
  </ul>

  <hr>
  
  <p>If any issues were discovered during your broadcast, they will be listed below. These issues were logged for the directors; repeat issues could result in intervention. If an issue was caused by a technical problem, please email the directors.</p>
  <ul>
  ${
    inputs.problemTerminated
      ? `<li><strong>This broadcast was terminated early automatically due to a critical system problem.</strong> This will not be held against you.</li>`
      : ``
  }
  ${
    stats.unauthorized
      ? `<li><strong>This broadcast was unscheduled / unauthorized.</strong> You should ensure the directors scheduled your show in and that you go on the air during your scheduled time (or request a re-schedule if applicable).</li>`
      : ``
  }
  ${
    stats.missedIDs.length > 0 && typeof stats.missedIDs.map === "function"
      ? `<li><strong>You failed to take a required top-of-the-hour ID break at these times</strong>; it is mandatory by the FCC to take a break at the top of every hour before :05 after. For prerecords and playlists, ensure your audio cut-offs allow for the top-of-hour ID break to air on time:<br />
  ${stats.missedIDs.map((record) => moment(record).format("LT")).join("<br />")}
  </li>`
      : ``
  }
  ${
    stats.silence.length > 0 && typeof stats.silence.map === "function"
      ? `<li><strong>There was excessive silence / very low audio at these times;</strong> please avoid excessive silence on the air as this violates FCC regulations:</strong><br />
  ${stats.silence.map((record) => moment(record).format("LT")).join("<br />")}
  </li>`
      : ``
  }
  ${
    stats.badPlaylist
      ? `<li><strong>The broadcast did not successfully air due to a bad playlist.</strong> Please ensure the tracks you added/uploaded for this broadcast were not corrupted. If they are not corrupt, please let the directors know.</li>`
      : ``
  }
  ${
    stats.signedOnEarly
      ? `<li><strong>You signed on 5 or more minutes early.</strong> Please avoid doing this, especially if there's a scheduled show before yours.</li>`
      : ``
  }
  ${
    stats.signedOnLate
      ? `<li><strong>You signed on 10 or more minutes late.</strong> Please inform directors in advance if you are going to be late for your show.</li>`
      : ``
  }
  ${
    stats.signedOffEarly
      ? `<li><strong>You signed off 10 or more minutes early.</strong> Please inform directors in advance if you are going to end your show early.</li>`
      : ``
  }
  ${
    stats.signedOffLate
      ? `<li><strong>You signed off 5 or more minutes late.</strong> Please avoid doing this, especially if there's a scheduled show after yours.</li>`
      : ``
  }
  </ul>

  <hr>
  
  <p>Here is a break-down of the number of online listeners tuned in during your broadcast and at what time:</p>
  <ul>${stats.listeners
    .map(
      (stat) =>
        `<li><strong>${moment(stat.time).format("LT")}</strong>: ${
          stat.listeners
        }</li>`
    )
    .join("")}</ul>

  <hr>

  <p>Here are the messages (if any) sent/received between you and online listeners:</p>
  <ul>${stats.messages
    .map(
      (message) =>
        `<li><strong>${moment(message.createdAt).format("LT")} by ${
          message.fromFriendly
        }</strong>: ${message.message}</li>`
    )
    .join("")}</ul>

  <hr>

  <p>Here is your full show log:</p>
  <ul>${stats.logs
    .map(
      (log) =>
        `<li><strong>${moment(log.createdAt).format("LT")}: ${
          log.title
        }</strong><br />${log.event}${
          log.trackArtist ? `<br />Artist: ${log.trackArtist}` : ``
        }${log.trackTitle ? `<br />Title: ${log.trackTitle}` : ``}${
          log.trackAlbum ? `<br />Album: ${log.trackAlbum}` : ``
        }${log.trackLabel ? `<br />Label: ${log.trackLabel}` : ``}</li>`
    )
    .join("")}</ul>

  <hr>
  
  ${
    topStats[1][currentRecord.calendarID]
      ? `<p>Here are analytics for ${
          currentRecord.event
        } for <strong>this semester</strong> so far:</p>
  <ul>
  <li><strong>On-air time:</strong> ${moment
    .duration(
      topStats[1][currentRecord.calendarID].semester.showtime,
      "minutes"
    )
    .format("h [hours], m [minutes]")}</li>
  <li><strong>Online listener time*:</strong> ${moment
    .duration(
      topStats[1][currentRecord.calendarID].semester.listeners,
      "minutes"
    )
    .format("h [hours], m [minutes]")}</li>\
  <li><strong>Listeners to Showtime Ratio (higher is better):</strong> ${
    topStats[1][currentRecord.calendarID].semester.ratio
  }</li>
  <li><strong>Live episodes aired:</strong> ${
    topStats[1][currentRecord.calendarID].semester.shows
  }</li>
  <li><strong>Prerecorded episodes aired:</strong> ${
    topStats[1][currentRecord.calendarID].semester.prerecords
  }</li>
  <li><strong>Remote episodes aired:</strong> ${
    topStats[1][currentRecord.calendarID].semester.remotes
  }</li>
  <li><strong>Sports broadcasts aired:</strong> ${
    topStats[1][currentRecord.calendarID].semester.sports
  }</li>
  <li><strong>Playlist airings:</strong> ${
    topStats[1][currentRecord.calendarID].semester.playlists
  }</li>
  <li><strong>Messages sent/received with online listeners:</strong> ${
    topStats[1][currentRecord.calendarID].semester.messages
  }</li>
  <li><strong>Remote credits earned:</strong> <ul>${djStats
    .map((stat) => `<li>${stat.name}: ${stat.semester.remoteCredits}</li>`)
    .join("")}</ul></li>
  </ul>

  <hr>
  
  <p>Here are analytics for ${
    currentRecord.event
  } for <strong>the past year</strong>:</p>
  <ul>
  <li><strong>On-air time:</strong> ${moment
    .duration(topStats[1][currentRecord.calendarID].overall.showtime, "minutes")
    .format("h [hours], m [minutes]")}</li>
  <li><strong>Online listener time*:</strong> ${moment
    .duration(
      topStats[1][currentRecord.calendarID].overall.listeners,
      "minutes"
    )
    .format("h [hours], m [minutes]")}</li>\
  <li><strong>Listeners to Showtime Ratio (higher is better):</strong> ${
    topStats[1][currentRecord.calendarID].overall.ratio
  }</li>
  <li><strong>Live episodes aired:</strong> ${
    topStats[1][currentRecord.calendarID].overall.shows
  }</li>
  <li><strong>Prerecorded episodes aired:</strong> ${
    topStats[1][currentRecord.calendarID].overall.prerecords
  }</li>
  <li><strong>Remote episodes aired:</strong> ${
    topStats[1][currentRecord.calendarID].overall.remotes
  }</li>
  <li><strong>Sports broadcasts aired:</strong> ${
    topStats[1][currentRecord.calendarID].overall.sports
  }</li>
  <li><strong>Playlist airings:</strong> ${
    topStats[1][currentRecord.calendarID].overall.playlists
  }</li>
  <li><strong>Messages sent/received with online listeners:</strong> ${
    topStats[1][currentRecord.calendarID].overall.messages
  }</li>
  <li><strong>Remote credits earned:</strong> <ul>${djStats
    .map((stat) => `<li>${stat.name}: ${stat.overall.remoteCredits}</li>`)
    .join("")}</ul></li>
  </ul>`
      : ``
  }

              <hr>
              
<p>*Online listener time is calculated per-listener, per-minute. For example, 5 online listeners tuned in for an entire 30 minute show is (5*30) 2 hours, 30 minutes listener time.</p>`,
              false,
              true
            );
          })(currentID);
        }
      }

      return exits.success(returnData);
    } catch (e) {
      sails.log.error(e);
      return exits.error(e);
    }
  },
};
