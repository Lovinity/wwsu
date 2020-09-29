/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also do this by creating a hook.
 *
 * For more information on bootstrapping your app, check out:
 * https://sailsjs.com/config/bootstrap
 */

const CalendarDb = require("../assets/plugins/wwsu-calendar/js/wwsu-calendar.js");
var cron = require("node-cron");
var sh = require("shorthash");
const queryString = require("query-string");
const DarkSkyApi = require("dark-sky"); // DEPRECATED. TODO: remove
const cryptoRandomString = require("crypto-random-string");

module.exports.bootstrap = async function (done) {
  sails.log.verbose(`BOOTSTRAP: started; initializing variables`);

  const darksky = new DarkSkyApi(sails.config.custom.darksky.api);

  // Generate token secrets
  sails.log.verbose(`BOOTSTRAP: generating token secrets`);
  sails.config.custom.secrets = {};
  sails.config.custom.secrets.host = cryptoRandomString({ length: 256 });
  sails.config.custom.secrets.dj = cryptoRandomString({ length: 256 });
  sails.config.custom.secrets.director = cryptoRandomString({ length: 256 });
  sails.config.custom.secrets.adminDirector = cryptoRandomString({
    length: 256,
  });
  sails.config.custom.secrets.directorUab = cryptoRandomString({ length: 256 });
  sails.config.custom.secrets.adminDirectorUab = cryptoRandomString({
    length: 256,
  });

  // Load darksky
  // DEPRECATED. TODO: remove.
  sails.log.verbose(`BOOTSTRAP: Initiating Darksky`);
  await sails.models.darksky.findOrCreate(
    { ID: 1 },
    { ID: 1, currently: {}, minutely: {}, hourly: {}, daily: {} }
  );

  // Load calendardb
  sails.log.verbose(`BOOTSTRAP: Initiating calendar`);
  sails.models.calendar.calendardb = new CalendarDb(
    await sails.models.calendar.find({ active: true }),
    await sails.models.schedule.find(),
    await sails.models.clockwheels.find()
  );

  if (sails.config.custom.sports) {
    sails.log.verbose(`BOOTSTRAP: Initiating sports events in calendar`);

    // Add sports into the calendar as a non-scheduled event if they do not exist
    sails.config.custom.sports.map((sport) => {
      (async (_sport) => {
        sails.models.calendar
          .findOrCreate(
            { type: "sports", name: sport },
            {
              type: "sports",
              active: true,
              priority: sails.models.calendar.calendardb.getDefaultPriority({
                type: "sports",
              }),
              name: sport,
              startDate: moment().toISOString(true),
            }
          )
          .exec(async (err, record, wasCreated) => {
            if (!wasCreated)
              await sails.models.calendar
                .update(
                  { ID: record.ID },
                  {
                    active: true,
                    priority: sails.models.calendar.calendardb.getDefaultPriority(
                      { type: "sports" }
                    ),
                    startDate: moment().toISOString(true),
                  }
                )
                .fetch();
          });
      })(sport);
    });

    // De-activate main sports events that do not exist in the system configured list of sports
    await sails.models.calendar
      .update(
        { type: "sports", name: { nin: sails.config.custom.sports } },
        { active: false }
      )
      .fetch();
  }

  // Add directors in the calendar
  sails.log.verbose(`BOOTSTRAP: Initiating director events in calendar`);
  var records = await sails.models.directors.find();
  var IDs = [];
  records.map((director) => {
    IDs.push(director.ID);
    (async (_director) => {
      sails.models.calendar
        .findOrCreate(
          { type: "office-hours", director: _director.ID },
          {
            type: "office-hours",
            active: true,
            priority: sails.models.calendar.calendardb.getDefaultPriority({
              type: "office-hours",
            }),
            hosts: _director.name,
            name: _director.name,
            director: _director.ID,
            startDate: moment().toISOString(true),
          }
        )
        .exec(async (err, record, wasCreated) => {
          if (!wasCreated)
            await sails.models.calendar
              .update(
                { ID: record.ID },
                {
                  active: true,
                  priority: sails.models.calendar.calendardb.getDefaultPriority(
                    { type: "office-hours" }
                  ),
                  startDate: moment().toISOString(true),
                }
              )
              .fetch();
        });
    })(director);
  });

  // De-activate directors that do not exist anymore.
  await sails.models.calendar
    .update({ type: "office-hours", director: { nin: IDs } }, { active: false })
    .fetch();

  sails.log.verbose(`BOOTSTRAP: Initiating studio booking events in calendar`);
  await sails.models.calendar.findOrCreate(
    { type: "onair-booking" },
    {
      type: "onair-booking",
      active: true,
      priority: -1,
      name: "OnAir Studio Bookings",
      start: moment().toISOString(true),
      duration: 0,
      schedule: null,
    }
  );
  await sails.models.calendar.findOrCreate(
    { type: "prod-booking" },
    {
      type: "prod-booking",
      active: true,
      priority: -1,
      name: "Production Studio Bookings",
      start: moment().toISOString(true),
      duration: 0,
      schedule: null,
    }
  );

  // Load blank sails.models.meta template
  sails.log.verbose(`BOOTSTRAP: Generating sails.models.meta.memory`);
  var temp = {};
  for (var key in sails.models.meta.template) {
    if (Object.prototype.hasOwnProperty.call(sails.models.meta.template, key)) {
      temp = sails.models.meta.template[key];
      sails.models.meta.memory[key] =
        typeof temp.defaultsTo !== "undefined" ? temp.defaultsTo : null;
      sails.models.meta.memoryDefault[key] =
        typeof temp.defaultsTo !== "undefined" ? temp.defaultsTo : null;
      sails.log.verbose(
        `Meta memory ${key} set to ${
          typeof temp.defaultsTo !== "undefined" ? temp.defaultsTo : null
        }`
      );
    }
  }

  // Load default status template into memory. Add radioDJ and DJ Controls instances to template as well.
  sails.log.verbose(`BOOTSTRAP: Loading RadioDJ instances into template`);
  sails.config.custom.radiodjs.forEach((radiodj) => {
    sails.models.status.template.push({
      name: `radiodj-${radiodj.name}`,
      label: `RadioDJ ${radiodj.label}`,
      status: radiodj.level,
      data: "This RadioDJ has not reported online since initialization.",
      time: null,
    });
  });
  sails.log.verbose(`BOOTSTRAP: Loading Client instances into template`);
  var clients = await sails.models.hosts
    .find({ authorized: true })
    .tolerate((err) => {
      // Don't throw errors, but log them
      sails.log.error(err);
    });
  if (clients.length > 0) {
    clients.forEach((client) => {
      var offStatus = 4;
      if (client.silenceDetection || client.recordAudio || client.answerCalls) {
        if (client.silenceDetection || client.recordAudio) {
          offStatus = 2;
        } else {
          offStatus = 3;
        }
        sails.models.status.template.push({
          name: `computer-${sh.unique(
            client.host + sails.config.custom.hostSecret
          )}`,
          label: `Host ${client.friendlyname}`,
          status: offStatus,
          data: "This host has not reported online since initialization.",
          time: null,
        });
      }
    });
  }

  sails.log.verbose(`BOOTSTRAP: Loading Display Sign instances into template`);
  sails.config.custom.displaysigns.forEach((display) => {
    sails.models.status.template.push({
      name: `display-${display.name}`,
      label: `Display ${display.label}`,
      status: display.level,
      data: "This display sign has not reported online since initialization.",
      time: null,
    });
  });

  sails.log.verbose(
    `BOOTSTRAP: Adding sails.models.status template to database and checking for reported problems.`
  );
  await sails.models.status
    .createEach(sails.models.status.template)
    .tolerate((err) => {
      return done(err);
    });
  await sails.helpers.status.checkReported();

  // Load internal sails.models.recipients into memory
  sails.log.verbose(
    `BOOTSTRAP: Adding sails.models.recipients template to database.`
  );
  await sails.models.recipients
    .createEach(sails.models.recipients.template)
    .tolerate((err) => {
      return done(err);
    });

  // Generate sails.models.recipients based off of messages from the last hour... website only.
  sails.log.verbose(
    `BOOTSTRAP: Adding sails.models.recipients from messages sent within the last hour into database.`
  );
  var records = await sails.models.messages
    .find({
      status: "active",
      from: { startsWith: "website-" },
      createdAt: { ">": moment().subtract(1, "hours").toDate() },
    })
    .sort("createdAt DESC")
    .tolerate(() => {});
  if (records && records.length > 0) {
    var insertRecords = [];
    var hosts = [];
    records.forEach((record) => {
      if (hosts.indexOf(record.from) === -1) {
        hosts.push(record.from);
        insertRecords.push({
          host: record.from,
          group: "website",
          label: record.from_friendly,
          status: 0,
          time: record.createdAt,
        });
      }
    });

    await sails.models.recipients.createEach(insertRecords).tolerate((err) => {
      return done(err);
    });
  }

  try {
    // Load subcategories into config
    await sails.helpers.songs.reloadSubcategories();

    // Load metadata into memory
    sails.log.verbose(`BOOTSTRAP: Loading metadata.`);
    var meta = await sails.models.meta
      .find()
      .limit(1)
      .tolerate((err) => {
        sails.log.error(err);
      });
    meta = meta[0];
    meta.time = moment().toISOString(true);
    sails.log.silly(meta);
    await sails.helpers.meta.change.with(meta);
    if (meta.playlist !== null && meta.playlist !== "") {
      var theplaylist = await sails.models.playlists.findOne({
        ID: meta.playlistID,
      });
      // LINT: RadioDJ table; is not camel cased
      // eslint-disable-next-line camelcase
      var playlistTracks = await sails.models.playlists_list
        .find({ pID: theplaylist.ID })
        .tolerate(() => {});
      sails.models.playlists.active.tracks = [];
      if (typeof playlistTracks !== "undefined") {
        playlistTracks.forEach((playlistTrack) => {
          sails.models.playlists.active.tracks.push(playlistTrack.sID);
        });
      }
    }
  } catch (unusedE) {
    sails.log.error(unusedE);
  }

  // Load directors.
  sails.log.verbose(`BOOTSTRAP: Refreshing directors.`);
  await sails.helpers.directors.update();

  // Check calendar events and integrity
  sails.log.verbose(`BOOTSTRAP: Loading calendar events.`);
  await sails.helpers.meta.change.with({
    changingState: `Initializing program calendar`,
  });
  await sails.helpers.calendar.check(false, true);
  try {
    await sails.helpers.calendar.check(true);
    await sails.helpers.meta.change.with({ changingState: null });
  } catch (unusedE) {
    await sails.helpers.meta.change.with({ changingState: null });
  }

  // CRON JOBS

  // Automation / queue checks every second
  sails.log.verbose(`BOOTSTRAP: scheduling checks CRON.`);
  cron.schedule("* * * * * *", () => {
    // LINT: Must use async because of sails.js await
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      sails.log.debug(`CRON checks triggered.`);

      var queueLength = 0;
      var trackLength = 0;
      var countDown = 0;
      var theplaylist;
      var playlistTracks;
      var change = {}; // Instead of doing a bunch of changeMetas, put all non-immediate changes into this object and changeMeta at the end of this operation.

      // Skip all checks and use default meta template if lofi is activated or we have no healthy RadioDJs.
      if (
        sails.config.custom.lofi ||
        sails.models.status.errorCheck.waitForGoodRadioDJ
      ) {
        try {
          change = sails.models.meta.memoryDefault;
          change.time = moment().toISOString(true);
          await sails.helpers.meta.change.with(change);
        } catch (e) {
          sails.log.error(e);
          return resolve(e);
        }
        return resolve();
      }

      // If we do not know current state, we may need to populate the info from the database.
      if (
        sails.models.meta.memory.state === "" ||
        sails.models.meta.memory.state === "unknown"
      ) {
        try {
          sails.log.verbose(`Unknown meta. Retrieving from database.`);
          var meta = await sails.models.meta
            .find()
            .limit(1)
            .tolerate((err) => {
              sails.log.error(err);
              return resolve(err);
            });
          meta = meta[0];
          delete meta.createdAt;
          delete meta.updatedAt;
          delete meta.ID;
          meta.time = moment().toISOString(true);
          // sails.log.verbose(meta)
          await sails.helpers.meta.change.with(meta);
          if (meta.playlist !== null && meta.playlist !== "") {
            theplaylist = await sails.models.playlists.findOne({
              name: meta.playlist,
            });
            // LINT: RadioDJ table that is not camel case
            // eslint-disable-next-line camelcase
            playlistTracks = await sails.models.playlists_list
              .find({ pID: theplaylist.ID })
              .tolerate(() => {});
            sails.models.playlists.active.tracks = [];
            if (typeof playlistTracks !== "undefined") {
              playlistTracks.forEach((playlistTrack) => {
                sails.models.playlists.active.tracks.push(playlistTrack.sID);
              });
            }
          }
        } catch (e) {
          return resolve(e);
        }
      }

      // changingState error check
      if (sails.models.meta.memory.changingState !== null) {
        await sails.helpers.error.count("changingStateTookTooLong");
      } else {
        await sails.helpers.error.reset("changingStateTookTooLong");
      }

      var queue = [];

      // Only re-fetch the queue once every 5-10 seconds or when the system intelligently determines it is necessary to keep a real-time eye on the queue.
      // Should check whenever track length < 2 and something is playing, or time to check (every 5 seconds), or the genre might have run out of music, or there is not an accurate queue count, or something triggered for a queue check (such as duplicate track removal or change in state).
      if (
        (sails.models.status.errorCheck.prevTrackLength < 2 &&
          sails.models.meta.memory.playing) ||
        sails.models.status.errorCheck.queueWait < 1 ||
        (sails.models.meta.memory.state === "automation_genre" &&
          sails.models.status.errorCheck.prevQueueLength <= 20) ||
        sails.models.status.errorCheck.trueZero > 0
      ) {
        try {
          if (sails.models.meta.memory.changingState === null) {
            queue = await sails.helpers.rest.getQueue();

            if (!queue[0]) throw new Error("Queue returned 0 tracks.");

            if (sails.models.meta.memory.playing) {
              sails.models.status.errorCheck.queueWait = 10;
            } else {
              sails.models.status.errorCheck.queueWait = 5;
            }

            try {
              sails.log.silly(`queueCheck executed.`);
              var theTracks = [];
              change.trackID = parseInt(queue[0].ID);
              change.trackIDSubcat = parseInt(queue[0].IDSubcat) || 0;

              var breakQueueLength = -2;
              var firstNoMeta = 0;
              change.queueMusic = false;

              if (
                sails.models.meta.memory.state.includes("_returning") ||
                sails.models.meta.memory.state === "automation_live" ||
                sails.models.meta.memory.state === "automation_remote" ||
                sails.models.meta.memory.state === "automation_sports" ||
                sails.models.meta.memory.state === "automation_sportsremote"
              ) {
                breakQueueLength = -1;
                firstNoMeta = -1;
                queue.forEach((track, index) => {
                  if (
                    sails.config.custom.subcats.noMeta &&
                    sails.config.custom.subcats.noMeta.indexOf(
                      parseInt(track.IDSubcat)
                    ) === -1
                  ) {
                    if (firstNoMeta > -1 && breakQueueLength < 0) {
                      breakQueueLength = index;
                      change.queueMusic = true;
                    }
                  } else if (firstNoMeta < 0) {
                    firstNoMeta = index;
                  }
                });
              }

              // Determine if something is currently playing via whether or not track 0 has ID of 0.
              if (parseInt(queue[0].ID) === 0) {
                change.playing = false;
                change.trackFinish = null;
                trackLength = 0;
              } else {
                change.playing = true;
                change.trackArtist = queue[0].Artist || null;
                change.trackTitle = queue[0].Title || null;
                change.trackAlbum = queue[0].Album || null;
                change.trackLabel = queue[0].Label || null;
                trackLength =
                  parseFloat(queue[0].Duration) - parseFloat(queue[0].Elapsed);
                change.trackFinish = moment()
                  .add(trackLength, "seconds")
                  .toISOString(true);
              }

              // Remove duplicate tracks (ONLY remove one since cron goes every second; so one is removed each second). Do not remove any duplicates if changing states.
              if (sails.models.meta.memory.changingState === null) {
                sails.log.debug(
                  `Calling asyncForEach in cron checks for removing duplicate tracks`
                );
                await sails.helpers.asyncForEach(queue, (track, index) => {
                  // eslint-disable-next-line promise/param-names
                  return new Promise((resolve2) => {
                    var title = `${track.Artist} - ${track.Title}`;
                    // If there is a duplicate, remove the track, store for later queuing if necessary.
                    // Also, calculate length of the queue
                    if (theTracks.indexOf(title) > -1) {
                      sails.log.debug(
                        `Track ${
                          track.ID
                        } on index ${index} is a duplicate of index (${
                          theTracks[theTracks.indexOf(title)]
                        }. Removing!`
                      );
                      if (track.TrackType !== "Music") {
                        sails.models.songs.pending.push(track.ID);
                      }
                      sails.models.status.errorCheck.queueWait = 0;
                      sails.helpers.rest
                        .cmd("RemovePlaylistTrack", index - 1)
                        .then(() => {
                          theTracks = [];
                          sails.helpers.rest.getQueue().then((theQueue) => {
                            queue = theQueue;
                            queueLength = 0;
                            return resolve2(true);
                          });
                        });
                    } else {
                      theTracks.push(title);
                      queueLength += track.Duration - track.Elapsed;
                      if (
                        index < breakQueueLength ||
                        (breakQueueLength < 0 && firstNoMeta > -1)
                      ) {
                        countDown += track.Duration - track.Elapsed;
                      }
                      return resolve2(false);
                    }
                  });
                });
              }

              /* Every now and then, querying now playing queue happens when RadioDJ is in the process of queuing a track, resulting in an inaccurate reported queue length.
               * This results in false transitions in system state. Run a check to detect if the queuelength deviated by more than 2 seconds since last run.
               * If so, we assume this was an error, so do not treat it as accurate, and trigger a 3 second error resolution wait.
               */
              if (
                queueLength >
                  sails.models.status.errorCheck.prevQueueLength - 3 ||
                sails.models.status.errorCheck.trueZero > 0
              ) {
                // If the detected queueLength gets bigger, assume the issue resolved itself and immediately mark the queuelength as accurate
                if (
                  queueLength >
                  sails.models.status.errorCheck.prevQueueLength - 1
                ) {
                  sails.models.status.errorCheck.trueZero = 0;
                  change.queueCalculating = false;
                } else if (sails.models.status.errorCheck.trueZero > 0) {
                  sails.models.status.errorCheck.trueZero -= 1;
                  if (sails.models.status.errorCheck.trueZero < 1) {
                    sails.models.status.errorCheck.trueZero = 0;
                    change.queueCalculating = false;
                    // If not an accurate queue count, use previous queue - 1 instead
                  } else {
                    queueLength =
                      sails.models.status.errorCheck.prevQueueLength - 1;
                    trackLength =
                      sails.models.status.errorCheck.prevTrackLength - 1;
                    countDown =
                      sails.models.status.errorCheck.prevCountdown - 1;
                  }
                  if (queueLength < 0) {
                    queueLength = 0;
                  }
                  if (trackLength < 0) {
                    trackLength = 0;
                  }
                  if (countDown < 0) {
                    countDown = 0;
                  }
                } else {
                  // No error wait time [remaining]? Use actual detected queue time.
                }
              } else {
                sails.models.status.errorCheck.trueZero = 3; // Wait up to 3 seconds before considering the queue accurate
                change.queueCalculating = true;
                // Instead of using the actually recorded queueLength, use the previously detected length minus 1 second.
                queueLength =
                  sails.models.status.errorCheck.prevQueueLength - 1;
                trackLength =
                  sails.models.status.errorCheck.prevTrackLength - 1;
                countDown = sails.models.status.errorCheck.prevCountdown - 1;
                if (queueLength < 0) {
                  queueLength = 0;
                }
                if (trackLength < 0) {
                  trackLength = 0;
                }
                if (countDown < 0) {
                  countDown = 0;
                }
              }

              // Enable assisted if we are in a live show and just finished playing stuff in the queue
              if (
                (sails.models.meta.memory.state === "live_on" ||
                  sails.models.meta.memory.state === "sports_on") &&
                queueLength <= 0 &&
                sails.models.status.errorCheck.prevQueueLength > 0
              ) {
                await sails.helpers.rest.cmd("EnableAssisted", 1);
              }

              sails.models.status.errorCheck.prevQueueLength = queueLength;
              sails.models.status.errorCheck.prevTrackLength = trackLength;
              sails.models.status.errorCheck.prevCountdown = countDown;

              // When we are waiting to begin a broadcast, switch to the on state when all noMeta tracks have finished.
              if (
                sails.models.meta.memory.state.includes("_returning") ||
                sails.models.meta.memory.state === "automation_live" ||
                sails.models.meta.memory.state === "automation_remote" ||
                sails.models.meta.memory.state === "automation_sports" ||
                sails.models.meta.memory.state === "automation_sportsremote"
              ) {
                if (
                  firstNoMeta < 0 &&
                  breakQueueLength < 0 &&
                  sails.models.status.errorCheck.trueZero <= 0
                ) {
                  if (sails.models.meta.memory.state === "automation_live") {
                    await sails.helpers.meta.change.with({ state: "live_on" });
                    await sails.helpers.meta.newShow();
                  }
                  if (sails.models.meta.memory.state === "automation_sports") {
                    await sails.helpers.meta.change.with({
                      state: "sports_on",
                    });
                    await sails.helpers.meta.newShow();
                  }
                  if (sails.models.meta.memory.state === "automation_remote") {
                    await sails.helpers.meta.change.with({
                      state: "remote_on",
                    });
                    await sails.helpers.meta.newShow();
                  }
                  if (
                    sails.models.meta.memory.state === "automation_sportsremote"
                  ) {
                    await sails.helpers.meta.change.with({
                      state: "sportsremote_on",
                    });
                    await sails.helpers.meta.newShow();
                  }
                  if (sails.models.meta.memory.state.includes("_returning")) {
                    switch (sails.models.meta.memory.state) {
                      case "live_returning":
                        await sails.helpers.meta.change.with({
                          state: "live_on",
                        });
                        break;
                      case "remote_returning":
                        await sails.helpers.meta.change.with({
                          state: "remote_on",
                        });
                        break;
                      case "sports_returning":
                        await sails.helpers.meta.change.with({
                          state: "sports_on",
                        });
                        break;
                      case "sportsremote_returning":
                        await sails.helpers.meta.change.with({
                          state: "sportsremote_on",
                        });
                        break;
                    }
                  }
                }
              } else {
                sails.models.status.errorCheck.prevCountdown = 0;
                countDown = 0;
              }
            } catch (e) {
              sails.models.status.errorCheck.queueWait = 0;
              sails.log.error(e);
              return resolve(e);
            }

            // Do automation system error checking and handling
            if (
              ((queue.length > 0 &&
                queue[0].Duration ===
                  sails.models.status.errorCheck.prevFetchedDuration &&
                queue[0].Elapsed ===
                  sails.models.status.errorCheck.prevFetchedElapsed) ||
                queue.length < 1) &&
              (sails.models.meta.memory.state.startsWith("automation_") ||
                sails.models.meta.memory.state.endsWith("_break") ||
                sails.models.meta.memory.state.endsWith("_disconnected") ||
                sails.models.meta.memory.state.endsWith("_returning") ||
                sails.models.meta.memory.state.startsWith("prerecord_"))
            ) {
              await sails.helpers.error.count("frozen");
              sails.models.status.errorCheck.queueWait = 0;
            } else {
              sails.models.status.errorCheck.prevDuration = queue[0].Duration;
              sails.models.status.errorCheck.prevElapsed = queue[0].Elapsed;
              sails.models.status.errorCheck.prevFetchedDuration =
                queue[0].Duration;
              sails.models.status.errorCheck.prevFetchedElapsed =
                queue[0].Elapsed;
              await sails.helpers.error.reset("frozen");
            }

            // If we are in automation_genre, check to see if the queue is less than 20 seconds. If so, the genre rotation may be out of tracks to play.
            // In that case, flip to automation_on with Default rotation.
            if (
              sails.models.meta.memory.state === "automation_genre" &&
              queueLength <= 20
            ) {
              await sails.helpers.error.count("genreEmpty");
            } else {
              await sails.helpers.error.reset("genreEmpty");
            }

            // Playlist maintenance
            var thePosition = -1;
            if (
              sails.models.meta.memory.state === "automation_playlist" ||
              sails.models.meta.memory.state === "automation_prerecord" ||
              sails.models.meta.memory.state.startsWith("prerecord_")
            ) {
              // Go through each track in the queue and see if it is a track from our playlist. If so, log the lowest number as the position in our playlist
              sails.log.debug(
                `Calling asyncForEach in cron checks for checking if any tracks in queue are a part of an active playlist`
              );
              var playingTrack = false;
              await sails.helpers.asyncForEach(queue, (autoTrack, index) => {
                // eslint-disable-next-line promise/param-names
                return new Promise((resolve2) => {
                  try {
                    for (
                      var i = 0;
                      i < sails.models.playlists.active.tracks.length;
                      i++
                    ) {
                      var name = sails.models.playlists.active.tracks[i];
                      if (name === parseInt(autoTrack.ID)) {
                        // Waiting for the playlist to begin, and it has begun? Switch states.
                        if (
                          sails.models.meta.memory.state ===
                            "automation_prerecord" &&
                          index === 0 &&
                          !sails.models.playlists.queuing &&
                          sails.models.meta.memory.changingState === null &&
                          sails.models.status.errorCheck.trueZero <= 0
                        ) {
                          // State switching should be pushed in sockets
                          sails.helpers.meta.change
                            .with({ state: "prerecord_on" })
                            .then(() => {
                              sails.helpers.meta.newShow().then(() => {});
                            });
                        }

                        // Flip to prerecord_break if not currently playing a track from the prerecord playlist, and back to prerecord_on otherwise
                        if (index === 0) {
                          playingTrack = true;
                          if (
                            sails.models.meta.memory.state ===
                              "prerecord_break" &&
                            sails.models.status.errorCheck.trueZero <= 0
                          ) {
                            (async () => {
                              await sails.helpers.meta.change.with({
                                state: `prerecord_on`,
                              });
                            })();
                          }
                        } else if (
                          index > 0 &&
                          sails.models.meta.memory.state === "prerecord_on" &&
                          !playingTrack &&
                          sails.models.status.errorCheck.trueZero <= 0
                        ) {
                          (async () => {
                            await sails.helpers.meta.change.with({
                              state: `prerecord_break`,
                            });
                          })();
                        }
                        if (thePosition === -1 || i < thePosition) {
                          thePosition = i;
                        }
                        break;
                      }
                    }
                    return resolve2(false);
                  } catch (e) {
                    sails.log.error(e);
                    return resolve2(false);
                  }
                });
              });

              try {
                // Finished the playlist? Go back to automation.
                if (
                  thePosition === -1 &&
                  sails.models.status.errorCheck.trueZero <= 0 &&
                  ((queue[0].Duration > 0 &&
                    queue[0].Elapsed < queue[0].Duration &&
                    queue[0].Elapsed > 0) ||
                    (queue[0].Duration <= 0 && queue[0].Elapsed > 0)) &&
                  !sails.models.playlists.queuing &&
                  sails.models.meta.memory.changingState === null
                ) {
                  await sails.helpers.meta.change.with({
                    changingState: `Ending playlist`,
                  });
                  switch (sails.models.meta.memory.state) {
                    case "automation_playlist":
                      await sails.models.logs
                        .create({
                          attendanceID: sails.models.meta.memory.attendanceID,
                          logtype: "sign-off",
                          loglevel: "primary",
                          logsubtype: sails.models.meta.memory.playlist,
                          logIcon: `fas fa-play`,
                          title: `Playlist finished airing; no more tracks to play.`,
                          event: ``,
                        })
                        .fetch()
                        .tolerate((err) => {
                          // Do not throw for errors, but log it.
                          sails.log.error(err);
                        });
                      break;
                    case "prerecord_on":
                    case "prerecord_break":
                      await sails.models.logs
                        .create({
                          attendanceID: sails.models.meta.memory.attendanceID,
                          logtype: "sign-off",
                          loglevel: "primary",
                          logsubtype: sails.models.meta.memory.show,
                          logIcon: `fas fa-play-circle`,
                          title: `Prerecord finished airing; no more tracks to play.`,
                          event: ``,
                        })
                        .fetch()
                        .tolerate((err) => {
                          // Do not throw for errors, but log it.
                          sails.log.error(err);
                        });
                      break;

                    // Uh oh! This is a bad prerecord playlist! Log this and notify the directors.
                    case "automation_prerecord":
                      var eventNow = sails.models.calendar.calendardb.whatShouldBePlaying(
                        null,
                        false
                      );
                      eventNow = eventNow.find(
                        (event) =>
                          event.type === "prerecord" &&
                          sails.models.meta.memory.show ===
                            `${event.hosts} - ${event.name}` &&
                          [
                            "canceled",
                            "canceled-system",
                            "canceled-changed",
                          ].indexOf(event.scheduleType) === -1
                      );
                      if (eventNow) {
                        var record = await sails.models.attendance
                          .create({
                            calendarID: eventNow.calendarID,
                            unique: eventNow.unique,
                            dj: eventNow.hostDJ,
                            cohostDJ1: eventNow.cohostDJ1,
                            cohostDJ2: eventNow.cohostDJ2,
                            cohostDJ3: eventNow.cohostDJ3,
                            event: `prerecord: ${eventNow.hosts} - ${eventNow.name}`,
                            happened: 0,
                            happenedReason: "Bad Playlist",
                            scheduledStart: moment(eventNow.start).toISOString(
                              true
                            ),
                            scheduledEnd: moment(eventNow.end).toISOString(
                              true
                            ),
                            badPlaylist: true,
                          })
                          .fetch();
                        await sails.models.logs
                          .create({
                            attendanceID: record.ID,
                            logtype: "bad-playlist",
                            loglevel: "orange",
                            logsubtype: sails.models.meta.memory.show,
                            logIcon: `fas fa-play-circle`,
                            title: `A prerecord failed to air!`,
                            event: `Prerecord: ${sails.models.meta.memory.show}<br />This is probably because the tracks in the prerecord's radioDJ playlist are corrupt.`,
                          })
                          .fetch()
                          .tolerate((err) => {
                            // Do not throw for errors, but log them.
                            sails.log.error(err);
                          });
                        await sails.helpers.onesignal.sendMass(
                          "emergencies",
                          "Prerecord failed to air!",
                          `${eventNow.hosts} - ${
                            eventNow.name
                          } failed to air on ${moment(eventNow.start).format(
                            "llll"
                          )} - ${moment(eventNow.end).format(
                            "llll"
                          )}; most likely, the tracks in the playlist are corrupted.`
                        );
                        await sails.helpers.emails.queueDjs(
                          eventNow,
                          `Prerecord failed to air: ${eventNow.hosts} - ${eventNow.name}`,
                          `Dear ${eventNow.hosts},<br /><br />
                                    
                                    A scheduled prerecord, <strong>${eventNow.name}</strong>, tried to go on the air. However, it failed to broadcast, and the system immediately went back to automation. Please check to ensure the tracks uploaded to the system and/or in the RadioDJ Playlist are valid and not corrupt.<br /><br />
                          You can reply all to this email if you need assistance from the directors.`
                        );
                      }
                      break;
                  }
                  await sails.helpers.rest.cmd("EnableAssisted", 0);

                  // Add up to 3 track requests if any are pending
                  await sails.helpers.requests.queue(3, true, true);

                  // Switch back to automation
                  await sails.helpers.meta.change.with({
                    changingState: `Ending prerecord`,
                    state: "automation_on",
                    genre: "",
                    show: "",
                    topic: "",
                    playlist: null,
                    playlistPosition: 0,
                  });

                  // Re-check for programs that should begin.
                  await sails.helpers.calendar.check(true);

                  await sails.helpers.meta.change.with({ changingState: null });

                  // Did not finish the playlist? Ensure the position is updated in meta.
                } else if (thePosition !== -1) {
                  if (
                    thePosition !== sails.models.meta.memory.playlistPosition
                  ) {
                    change.playlistPosition = thePosition;
                  }
                }
              } catch (e) {
                await sails.helpers.meta.change.with({ changingState: null });
                sails.log.error(e);
              }
            }
          }

          // Error checks
          await sails.helpers.error.reset("queueFail");
          await sails.helpers.error.count("stationID", true);
        } catch (e) {
          sails.models.status.errorCheck.queueWait = 0;
          await sails.helpers.error.count("queueFail");
          sails.log.error(e);
          return resolve(e);
        }
      } else {
        queue = sails.models.meta.automation;
        change.playing = sails.models.meta.memory.playing;
        sails.models.status.errorCheck.queueWait -= 1;
        if (sails.models.meta.memory.playing) {
          queueLength = sails.models.status.errorCheck.prevQueueLength - 1;
          trackLength = sails.models.status.errorCheck.prevTrackLength - 1;
          countDown = sails.models.status.errorCheck.prevCountdown - 1;
          sails.models.status.errorCheck.prevQueueLength = queueLength;
          sails.models.status.errorCheck.prevTrackLength = trackLength;
          sails.models.status.errorCheck.prevCountdown = countDown;
          sails.models.status.errorCheck.prevElapsed += 1;
        }
      }

      // If we do not know active playlist, we need to populate the info
      if (
        sails.models.meta.memory.playlistID !== null &&
        sails.models.playlists.active.tracks.length <= 0 &&
        (sails.models.meta.memory.state === "automation_playlist" ||
          sails.models.meta.memory.state.startsWith("prerecord_"))
      ) {
        try {
          theplaylist = await sails.models.playlists
            .findOne({ ID: sails.models.meta.memory.playlistID })
            .tolerate(() => {});
          if (typeof theplaylist !== "undefined") {
            // LINT: RadioDJ table
            // eslint-disable-next-line camelcase
            playlistTracks = await sails.models.playlists_list
              .find({ pID: sails.models.meta.memory.playlistID })
              .tolerate(() => {});
            sails.models.playlists.active.tracks = [];
            if (typeof playlistTracks !== "undefined") {
              playlistTracks.forEach((playlistTrack) => {
                sails.models.playlists.active.tracks.push(playlistTrack.sID);
              });
            }
          } else {
            await sails.helpers.meta.change.with({
              playlist: null,
              playlistID: null,
            });
          }
        } catch (e) {
          sails.log.error(e);
        }
      }

      // Clear manual metadata if it is old
      if (
        sails.models.meta.memory.trackStamp !== null &&
        moment().isAfter(
          moment(sails.models.meta.memory.trackStamp).add(
            sails.config.custom.meta.clearTime,
            "minutes"
          )
        ) &&
        !sails.models.meta.memory.state.startsWith("automation_") &&
        !sails.models.meta.memory.state.startsWith("prerecord_")
      ) {
        change.trackStamp = null;
        change.trackArtist = null;
        change.trackTitle = null;
        change.trackAlbum = null;
        change.trackLabel = null;
      }

      try {
        var attendance;
        if (queue.length > 0) {
          // If we are preparing for live, so some stuff if queue is done
          if (
            sails.models.meta.memory.state === "automation_live" &&
            queueLength <= 0 &&
            sails.models.status.errorCheck.trueZero <= 0
          ) {
            await sails.helpers.meta.change.with({ state: "live_on" });
            await sails.helpers.rest.cmd("EnableAssisted", 1);
            await sails.helpers.meta.newShow();
          }
          // If we are preparing for sports, do some stuff if queue is done
          if (
            sails.models.meta.memory.state === "automation_sports" &&
            queueLength <= 0 &&
            sails.models.status.errorCheck.trueZero <= 0
          ) {
            await sails.helpers.meta.change.with({ state: "sports_on" });
            await sails.helpers.rest.cmd("EnableAssisted", 1);
            await sails.helpers.meta.newShow();
          }
          // If we are preparing for remote, do some stuff
          if (
            sails.models.meta.memory.state === "automation_remote" &&
            queueLength <= 0 &&
            sails.models.status.errorCheck.trueZero <= 0
          ) {
            await sails.helpers.meta.change.with({ state: "remote_on" });
            await sails.helpers.meta.newShow();
          }
          // If we are preparing for sportsremote, do some stuff if we are playing the stream track
          if (
            sails.models.meta.memory.state === "automation_sportsremote" &&
            queueLength <= 0 &&
            sails.models.status.errorCheck.trueZero <= 0
          ) {
            await sails.helpers.meta.change.with({ state: "sportsremote_on" });
            await sails.helpers.meta.newShow();
          }
          // If returning from break, do stuff once queue is empty
          if (
            sails.models.meta.memory.state.includes("_returning") &&
            queueLength <= 0 &&
            sails.models.status.errorCheck.trueZero <= 0
          ) {
            switch (sails.models.meta.memory.state) {
              case "live_returning":
                await sails.helpers.meta.change.with({ state: "live_on" });
                await sails.helpers.rest.cmd("EnableAssisted", 1);
                break;
              case "remote_returning":
                await sails.helpers.meta.change.with({ state: "remote_on" });
                break;
              case "sports_returning":
                await sails.helpers.meta.change.with({ state: "sports_on" });
                await sails.helpers.rest.cmd("EnableAssisted", 1);
                break;
              case "sportsremote_returning":
                await sails.helpers.meta.change.with({
                  state: "sportsremote_on",
                });
                break;
            }
          }

          // If we are in break, queue something if the queue is under 2 items to keep the break going, and if we are not changing states
          if (
            sails.models.meta.memory.changingState === null &&
            queue.length < 2
          ) {
            switch (sails.models.meta.memory.state) {
              case "automation_break":
                await sails.helpers.break.executeArray(
                  sails.config.custom.specialBreaks.automation.during
                );
                break;
              case "live_break":
                await sails.helpers.break.executeArray(
                  sails.config.custom.specialBreaks.live.during
                );
                break;
              case "remote_break":
                await sails.helpers.break.executeArray(
                  sails.config.custom.specialBreaks.remote.during
                );
                break;
              case "sports_break":
              case "sportsremote_break":
                await sails.helpers.break.executeArray(
                  sails.config.custom.specialBreaks.sports.during
                );
                break;
              case "sports_halftime":
              case "sportsremote_halftime":
                await sails.helpers.break.executeArray(
                  sails.config.custom.specialBreaks.sports.duringHalftime
                );
                break;
            }
          }

          // Counter to ensure automation break is not running for too long
          if (sails.models.meta.memory.state === "automation_break") {
            await sails.helpers.error.count("automationBreak");
          }

          // Manage breaks intelligently using track queue length. This gets complicated, so comments explain the process.

          // Do not run this process if we cannot get a duration for the currently playing track, we are changing states, or if we suspect the current queue duration to be inaccurate
          if (
            sails.models.status.errorCheck.trueZero <= 0 &&
            typeof queue[0] !== "undefined" &&
            typeof queue[0].Duration !== "undefined" &&
            typeof queue[0].Elapsed !== "undefined" &&
            sails.models.meta.memory.changingState === null
          ) {
            // Iterate through each configured break to see if it's time to do it
            for (var key in sails.config.custom.breaks) {
              if (
                Object.prototype.hasOwnProperty.call(
                  sails.config.custom.breaks,
                  key
                )
              ) {
                // Helps determine if we are due for the break
                var breakTime = moment().minutes(key);
                var breakTime2 = moment().minutes(key).add(1, "hours");

                // Determine when the current track in RadioDJ will finish.
                var endTime = moment().add(
                  queue[0].Duration - queue[0].Elapsed,
                  "seconds"
                );

                var doBreak = false;
                var distancebefore;
                var endtime2;
                var distanceafter;

                // If the current time is before scheduled break, but the currently playing track will finish after scheduled break, consider queuing the break.
                if (
                  (moment().isBefore(moment(breakTime)) &&
                    moment(endTime).isAfter(moment(breakTime))) ||
                  (moment().isBefore(moment(breakTime2)) &&
                    moment(endTime).isAfter(moment(breakTime2)))
                ) {
                  doBreak = true;
                }

                // If the currently playing track will not end after the scheduled break,
                // but the following track will end further after the scheduled break than the current track would,
                // queue the break early.
                if (
                  typeof queue[1] !== "undefined" &&
                  typeof queue[1].Duration !== "undefined"
                ) {
                  if (moment().isBefore(moment(breakTime))) {
                    distancebefore = moment(breakTime).diff(moment(endTime));
                    endtime2 = moment(endTime).add(
                      queue[1].Duration,
                      "seconds"
                    );
                    distanceafter = endtime2.diff(breakTime);
                    if (
                      moment(endtime2).isAfter(moment(breakTime)) &&
                      distanceafter > distancebefore
                    ) {
                      doBreak = true;
                    }
                  } else {
                    distancebefore = moment(breakTime2).diff(moment(endTime));
                    endtime2 = moment(endTime).add(
                      queue[1].Duration,
                      "seconds"
                    );
                    distanceafter = endtime2.diff(breakTime2);
                    if (
                      moment(endtime2).isAfter(moment(breakTime2)) &&
                      distanceafter > distancebefore
                    ) {
                      doBreak = true;
                    }
                  }
                }

                // Do not queue if we are not in automation, playlist, genre, or prerecord states, or if we are in a break already.
                if (
                  (sails.models.meta.memory.state !== "automation_on" &&
                    sails.models.meta.memory.state !== "automation_playlist" &&
                    sails.models.meta.memory.state !== "automation_genre" &&
                    !sails.models.meta.memory.state.startsWith("prerecord_")) ||
                  sails.models.meta.memory.state.endsWith("_break")
                ) {
                  doBreak = false;
                }

                // Do not queue if we queued a break less than the configured failsafe time, and this isn't the 0 break
                if (
                  key !== 0 &&
                  sails.models.status.errorCheck.prevBreak !== null &&
                  moment(sails.models.status.errorCheck.prevBreak).isAfter(
                    moment().subtract(sails.config.custom.breakCheck, "minutes")
                  )
                ) {
                  doBreak = false;
                }

                // The 0 break has its own hard coded failsafe of 10 minutes, separate from other breaks, since it's a FCC required break
                if (
                  key === 0 &&
                  sails.models.status.errorCheck.prevID !== null &&
                  moment(sails.models.status.errorCheck.prevID).isAfter(
                    moment().subtract(10, "minutes")
                  )
                ) {
                  doBreak = false;
                }

                // Do not queue anything yet if the current track has breakCheck minutes or more left (resolves a discrepancy with the previous logic)
                if (
                  key !== 0 &&
                  queue[0].Duration - queue[0].Elapsed >=
                    60 * sails.config.custom.breakCheck
                ) {
                  doBreak = false;
                }

                if (
                  key === 0 &&
                  queue[0].Duration - queue[0].Elapsed >= 60 * 10
                ) {
                  doBreak = false;
                }

                // Do the break if we are supposed to
                if (doBreak) {
                  // Reset the break clock
                  sails.models.status.errorCheck.prevBreak = moment();

                  // Reset the liner clock as well so liners do not play too close to breaks
                  sails.models.status.errorCheck.prevLiner = moment();

                  // enforce station ID for top of the hour breaks
                  if (key === 0) {
                    sails.models.status.errorCheck.prevID = moment();
                    await sails.helpers.error.count("stationID");
                  }

                  // Remove liners in the queue. Do not do the playlist re-queue method as there may be a big prerecord or playlist in the queue.
                  await sails.helpers.songs.remove(
                    false,
                    sails.config.custom.subcats.liners,
                    true,
                    true
                  );

                  // Execute the break array
                  await sails.helpers.break.executeArray(
                    sails.config.custom.breaks[key]
                  );

                  // If not doing a break, check to see if it's time to do a liner
                } else {
                  // Don't do a liner if it was too soon.
                  if (
                    sails.models.status.errorCheck.prevLiner === null ||
                    moment().diff(
                      moment(sails.models.status.errorCheck.prevLiner),
                      "minutes"
                    ) > sails.config.custom.linerTime
                  ) {
                    // Only do liners when in automation
                    if (
                      sails.models.meta.memory.state.startsWith("automation_")
                    ) {
                      // If there is at least 1 track in the queue, and both the current track and the next track are not noMeta tracks, queue a liner
                      if (
                        queue.length > 1 &&
                        parseInt(queue[0].ID) !== 0 &&
                        sails.config.custom.subcats.noMeta.indexOf(
                          parseInt(queue[0].IDSubcat)
                        ) === -1 &&
                        sails.config.custom.subcats.noMeta.indexOf(
                          parseInt(queue[1].IDSubcat)
                        ) === -1
                      ) {
                        sails.models.status.errorCheck.prevLiner = moment();
                        await sails.helpers.songs.queue(
                          sails.config.custom.subcats.liners,
                          "Top",
                          1
                        );
                        await sails.helpers.break.addUnderwritings(true);
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // Process queueFinish
        if (change.playing) {
          change.queueFinish = moment()
            .add(queueLength, "seconds")
            .toISOString(true);
        } else {
          change.queueFinish = null;
        }

        // Process countdown
        if (countDown > 0) {
          change.countdown = moment()
            .add(countDown, "seconds")
            .toISOString(true);
        } else {
          change.countdown = null;
        }

        // Change applicable meta
        await sails.helpers.meta.change.with(change);

        // All done
        return resolve();
      } catch (e) {
        // Uncomment once we confirmed this CRON is fully operational
        //  await sails.helpers.error.count('frozen');
        sails.log.error(e);
        return resolve(e);
      }
    });
  });

  // Every minute on second 02, check the calendar for events that should begin
  sails.log.verbose(`BOOTSTRAP: scheduling updateCalendar CRON.`);
  cron.schedule("2 * * * * *", async () => {
    sails.log.debug(`CRON updateCalendar triggered.`);
    try {
      await sails.helpers.calendar.check();
      return true;
    } catch (e) {
      sails.log.error(e);
    }
  });

  // Every 5 minutes on second 02, check calendar event integrity
  sails.log.verbose(`BOOTSTRAP: scheduling updateCalendarIntegrity CRON.`);
  cron.schedule("2 */5 * * * *", async () => {
    sails.log.debug(`CRON updateCalendarIntegrity triggered.`);
    try {
      await sails.helpers.calendar.check(false, true);
      return true;
    } catch (e) {
      sails.log.error(e);
    }
  });

  // Every minute at second 3 and 33, check the online status of the radio streams, and log listener count
  sails.log.verbose(`BOOTSTRAP: scheduling checkRadioStreams CRON.`);
  cron.schedule("3,33 * * * * *", async () => {
    sails.log.debug(`CRON checkRadioStreams triggered.`);
    // SHOUTCAST 2.6
    try {
      var resp = await needle(
        "get",
        sails.config.custom.stream + `/statistics?json=1`,
        {},
        { headers: { "Content-Type": "application/json" } }
      );
      if (
        resp &&
        typeof resp.body !== "undefined" &&
        typeof resp.body.streams !== "undefined"
      ) {
        var streams = resp.body.streams;

        // Check public stream
        if (
          typeof streams !== "undefined" &&
          typeof streams[0] !== "undefined" &&
          typeof streams[0].streamstatus !== "undefined" &&
          streams[0].streamstatus !== 0
        ) {
          // Mark stream as good
          await sails.helpers.status.change.with({
            name: "stream-public",
            label: "Radio Stream",
            data: "Stream is online.",
            status: 5,
          });

          // Log listeners if there are any changes
          if (
            sails.models.meta.memory.dj !== sails.models.listeners.memory.dj ||
            streams[0].uniquelisteners !==
              sails.models.listeners.memory.listeners
          ) {
            await sails.models.listeners
              .create({
                dj: sails.models.meta.memory.dj,
                listeners: streams[0].uniquelisteners,
              })
              .tolerate(() => {});
            await sails.helpers.meta.change.with({
              listeners: streams[0].uniquelisteners,
            });
          }
          sails.models.listeners.memory = {
            dj: sails.models.meta.memory.dj,
            listeners: streams[0].uniquelisteners,
          };
        } else {
          await sails.helpers.status.change.with({
            name: "stream-public",
            label: "Radio Stream",
            data: `Stream is offline. Please ensure the audio encoder is connected and streaming to the ${sails.config.custom.stream} Shoutcast server.`,
            status: 2,
          });
        }
        return true;
      } else {
        await sails.helpers.status.change.with({
          name: "stream-public",
          label: "Radio Stream",
          data: `Error parsing data from the Shoutcast server. Please ensure the Shoutcast server ${sails.config.custom.stream} is online and working properly.`,
          status: 2,
        });
        return false;
      }
    } catch (e) {
      await sails.helpers.status.change.with({
        name: "stream-public",
        label: "Radio Stream",
        data: "Error checking Shoutcast server. Please see node server logs.",
        status: 2,
      });
      sails.log.error(e);
      return false;
    }
  });

  // Every minute at second 4 and 34, check all RadioDJs for connectivity.
  sails.log.verbose(`BOOTSTRAP: scheduling checkRadioDJs CRON.`);
  cron.schedule("4,34 * * * * *", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON checkRadioDJs triggered.`);
      try {
        sails.log.debug(
          `Calling asyncForEach in cron checkRadioDJs for every radiodj in config to hit via REST`
        );
        await sails.helpers.asyncForEach(
          sails.config.custom.radiodjs,
          (radiodj) => {
            // eslint-disable-next-line promise/param-names
            return new Promise((resolve2) => {
              sails.models.status
                .findOne({ name: `radiodj-${radiodj.name}` })
                .then(async (status) => {
                  try {
                    var resp = await needle(
                      "get",
                      `${radiodj.rest}/p?auth=${sails.config.custom.rest.auth}`,
                      {},
                      { headers: { "Content-Type": "application/json" } }
                    );
                    if (
                      resp &&
                      typeof resp.body !== "undefined" &&
                      typeof resp.body.children !== "undefined"
                    ) {
                      await sails.helpers.status.change.with({
                        name: `radiodj-${radiodj.name}`,
                        label: `RadioDJ ${radiodj.label}`,
                        data: "RadioDJ is online.",
                        status: 5,
                      });
                      // We were waiting for a good RadioDJ to switch to. Switch to it immediately.
                      if (sails.models.status.errorCheck.waitForGoodRadioDJ) {
                        sails.models.status.errorCheck.waitForGoodRadioDJ = false;

                        // Get the current RadioDJ out of critical status if necessary
                        var maps = sails.config.custom.radiodjs
                          .filter(
                            (instance) =>
                              instance.rest ===
                                sails.models.meta.memory.radiodj &&
                              instance.name !== radiodj.name
                          )
                          .map(async (instance) => {
                            await sails.helpers.status.change.with({
                              name: `radiodj-${instance.name}`,
                              label: `RadioDJ ${instance.label}`,
                              status: instance.level,
                              data: `RadioDJ is not operational. Please ensure this RadioDJ is running and the REST server is online, configured properly, and accessible. When opening RadioDJ, you may have to start playing a track before REST begins working.`,
                            });
                            return true;
                          });
                        await Promise.all(maps);
                        var queue = sails.models.meta.automation;
                        await sails.helpers.meta.change.with({
                          radiodj: radiodj.rest,
                        });
                        await sails.helpers.rest.cmd("ClearPlaylist", 1);
                        await sails.helpers.error.post(queue);
                      }
                      // If this RadioDJ is inactive, check to see if it is playing anything
                      if (sails.models.meta.memory.radiodj !== radiodj.rest) {
                        var automation = [];
                        if (resp.body.name === "ArrayOfSongData") {
                          resp.body.children.map((trackA) => {
                            var theTrack = {};
                            trackA.children.map((track) => {
                              theTrack[track.name] = track.value;
                            });
                            automation.push(theTrack);
                          });
                        } else {
                          var theTrack = {};
                          resp.body.children.map((track) => {
                            theTrack[track.name] = track.value;
                          });
                          automation.push(theTrack);
                        }

                        // If this if condition passes, the RadioDJ is playing.
                        if (
                          typeof automation[0] !== "undefined" &&
                          parseInt(automation[0].ID) !== 0
                        ) {
                          // If the active radioDJ is playing something too, we should stop the inactive RadioDJ.
                          if (sails.models.meta.memory.queueFinish !== null) {
                            try {
                              // LINT: Necessary needle parameters
                              // eslint-disable-next-line camelcase
                              var resp2 = await needle(
                                "get",
                                radiodj.rest +
                                  "/opt?auth=" +
                                  sails.config.custom.rest.auth +
                                  "&command=StopPlayer&arg=1",
                                {},
                                {
                                  open_timeout: 10000,
                                  response_timeout: 10000,
                                  read_timeout: 10000,
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                }
                              );
                            } catch (unusedE3) {
                              // Ignore errors
                            }
                            // If the active RadioDJ is NOT playing anything, we should switch the active RadioDJ to the one playing something.
                          } else if (
                            sails.models.meta.memory.changingState === null
                          ) {
                            await sails.helpers.meta.change.with({
                              changingState: `Switching radioDJ instances`,
                            });
                            await sails.helpers.rest.cmd(
                              "EnableAssisted",
                              1,
                              0
                            );
                            await sails.helpers.rest.cmd("EnableAutoDJ", 1, 0);
                            await sails.helpers.rest.cmd("StopPlayer", 0, 0);
                            await sails.helpers.rest.changeRadioDj(
                              radiodj.rest
                            );
                            await sails.helpers.error.post();
                            await sails.helpers.meta.change.with({
                              changingState: null,
                            });
                          }
                        }
                      }
                    } else {
                      if (status && status.status !== 1) {
                        await sails.helpers.status.change.with({
                          name: `radiodj-${radiodj.name}`,
                          label: `RadioDJ ${radiodj.label}`,
                          data:
                            "RadioDJ REST did not return queue data. Please ensure the REST server is online, configured properly, and accessible. When opening RadioDJ, you may have to start playing a track before REST begins working.",
                          status: radiodj.level,
                        });
                      }
                    }
                    return resolve2(false);
                  } catch (unusedE) {
                    if (status && status.status !== 1) {
                      await sails.helpers.status.change.with({
                        name: `radiodj-${radiodj.name}`,
                        label: `RadioDJ ${radiodj.label}`,
                        data:
                          "RadioDJ REST returned an error or is not responding. Please ensure RadioDJ is open and functional, and the REST server is online, configured properly, and accessible. When opening RadioDJ, you may have to start playing a track before REST begins working.",
                        status: radiodj.level,
                      });
                    }
                    return resolve2(false);
                  }
                });
            });
          }
        );
        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // Every minute at second 5, check for connectivity to the website.
  sails.log.verbose(`BOOTSTRAP: scheduling checkWebsite CRON.`);
  cron.schedule("5 * * * * *", async () => {
    sails.log.debug(`CRON checkWebsite triggered.`);
    try {
      var resp = await needle(
        "get",
        sails.config.custom.website,
        {},
        { headers: { "Content-Type": "application/json" } }
      );
      if (resp && typeof resp.body !== "undefined") {
        await sails.helpers.status.change.with({
          name: `website`,
          label: `Website`,
          data: "Website is online.",
          status: 5,
        });
      } else {
        await sails.helpers.status.change.with({
          name: `website`,
          label: `Website`,
          data: `Website ${sails.config.custom.website} did not return body data. Please ensure the website is online.`,
          status: 2,
        });
      }
    } catch (e) {
      await sails.helpers.status.change.with({
        name: `website`,
        label: `Website`,
        data: `Error checking the status of the ${sails.config.custom.website} website. The website might be offline. Please check server logs.`,
        status: 2,
      });
      sails.log.error(e);
    }
  });

  // Every hour at minute 5, second 5, check if there was a missed top of hour ID break.
  sails.log.verbose("BOOTSTRAP: scheduling checkID CRON.");
  cron.schedule("5 5 * * * *", async () => {
    sails.log.debug("CRON checkID triggered.");
    if (
      moment()
        .startOf(`hour`)
        .subtract(5, `minutes`)
        .isAfter(moment(sails.models.meta.memory.lastID))
    ) {
      await sails.models.logs
        .create({
          attendanceID: sails.models.meta.memory.attendanceID,
          logtype: "id",
          loglevel: "orange",
          logsubtype:
            sails.models.meta.memory.show !== ""
              ? sails.models.meta.memory.show
              : sails.models.meta.memory.genre,
          logIcon: `fas fa-coffee`,
          title: `Required top-of-hour ID was not aired!`,
          event: `Broadcast: ${
            sails.models.meta.memory.show &&
            sails.models.meta.memory.show !== ""
              ? sails.models.meta.memory.show
              : sails.models.meta.memory.genre
          }`,
        })
        .fetch()
        .tolerate((err) => {
          sails.log.error(err);
        });

      if (!sails.models.meta.memory.state.startsWith("automation_"))
        await sails.helpers.onesignal.sendMass(
          "accountability-shows",
          "Broadcast did not air Top-of-hour ID!",
          `${sails.models.meta.memory.show} failed to air top of hour ID. This is an FCC violation.`
        );
    }
  });

  // Every minute on second 06, get NWS alerts for configured counties.
  sails.log.verbose(`BOOTSTRAP: scheduling EAS CRON.`);
  cron.schedule("6 * * * * *", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        // Initial procedure
        await sails.helpers.eas.preParse();

        // Iterate through every configured county and get their weather alerts
        var complete = 0;
        var bad = [];
        sails.log.debug(
          `Calling asyncLoop in cron EAS for checking every EAS source`
        );

        var asyncLoop = async function (array, callback) {
          for (let index = 0; index < array.length; index++) {
            // LINT: This is a loop; we do not want to return the callback.
            // eslint-disable-next-line callback-return
            await callback(array[index], index, array);
          }
        };

        await asyncLoop(sails.config.custom.EAS.NWSX, async (county) => {
          try {
            var resp = await needle(
              "get",
              `https://alerts.weather.gov/cap/wwaatmget.php?x=${
                county.code
              }&y=0&t=${moment().valueOf()}`,
              {},
              { headers: { "Content-Type": "application/json" } }
            );
            await sails.helpers.eas.parseCaps(county.name, resp.body);
            complete++;
          } catch (err) {
            bad.push(county.name);
            // Do not reject on error; just go to the next county
            sails.log.error(err);
          }
        });

        // If all counties succeeded, mark EAS-internal as operational
        if (complete >= sails.config.custom.EAS.NWSX.length) {
          await sails.helpers.status.change.with({
            name: "EAS-internal",
            label: "Internal EAS",
            data: `All NWS CAPS (${sails.config.custom.EAS.NWSX.map(
              (cap) => cap.name
            ).join()}) are online.`,
            status: 5,
          });
        } else {
          await sails.helpers.status.change.with({
            name: "EAS-internal",
            label: "Internal EAS",
            data: `Could not fetch the following NWS CAPS counties: ${bad.join(
              ", "
            )}. This is usually caused by a network issue, or the NWS CAPS server is experiencing a temporary service disruption.`,
            status: 3,
          });
        }

        // Finish up
        await sails.helpers.eas.postParse();
        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // Every minute at second 07, check to see if our databases are active and functional
  sails.log.verbose(`BOOTSTRAP: scheduling checkDB CRON.`);
  cron.schedule("7 * * * * *", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async () => {
      // TODO: More accurate way to test database.
      sails.log.debug(`CRON checkDB called`);
      try {
        // Make sure all models have a record at ID 1, even if it's a dummy.
        // TODO: Find a way to auto-populate these arrays.
        var checksMemory = [sails.models.recipients, sails.models.status];
        // LINT: RadioDJ tables cannot be changed
        // eslint-disable-next-line camelcase
        var checksRadioDJ = [
          sails.models.category,
          sails.models.events,
          sails.models.genre,
          sails.models.history,
          sails.models.playlists,
          sails.models.playlists_list,
          sails.models.requests,
          sails.models.settings,
          sails.models.subcategory,
        ];
        var checksNodebase = [
          sails.models.announcements,
          sails.models.calendar,
          sails.models.clockwheels,
          sails.models.discipline,
          sails.models.eas,
          sails.models.subscribers,
          sails.models.planner,
          sails.models.underwritings,
          sails.models.emails,
          sails.models.attendance,
          sails.models.darksky,
          sails.models.climacell,
          sails.models.listeners,
          sails.models.djs,
          sails.models.hosts,
          sails.models.logs,
          sails.models.messages,
          sails.models.meta,
          sails.models.nodeusers,
          sails.models.timesheet,
          sails.models.directors,
          sails.models.songsliked,
          sails.models.sports,
          sails.models.xp,
          sails.models.schedule,
          sails.models.version,
        ];
        var checksInventory = [sails.models.checkout, sails.models.items];
        // Memory checks
        var checkStatus = { data: ``, status: 5 };
        sails.log.debug(`CHECK: DB Memory`);
        sails.log.debug(
          `Calling asyncForEach in cron checkDB for memory tests`
        );
        await sails.helpers.asyncForEach(checksMemory, (check, index) => {
          // eslint-disable-next-line no-async-promise-executor
          return new Promise(async (resolve) => {
            try {
              var record = await check
                .find()
                .limit(1)
                .tolerate(() => {
                  checkStatus.status = 1;
                  checkStatus.data += `Model failure (query error): ${index}. Please ensure this table / the database is online and not corrupt. `;
                });
              if (
                typeof record[0] === "undefined" ||
                typeof record[0].ID === "undefined"
              ) {
                if (checkStatus.status > 3) {
                  checkStatus.status = 3;
                }
                checkStatus.data += `Model failure (No records returned): ${index}. Expected at least 1 row in this database table. Please ensure the table is not corrupt.`;
              }
              return resolve(false);
            } catch (err) {
              checkStatus.status = 1;
              checkStatus.data += `Model failure (internal error): ${index}. Please ensure the database is online, and check the server logs.`;
              sails.log.error(err);
              return resolve(false);
            }
          });
        });
        if (checkStatus.status === 5) {
          checkStatus.data = `This datastore is fully operational.`;
        }
        await sails.helpers.status.change.with({
          name: "db-memory",
          label: "DB Memory",
          data: checkStatus.data,
          status: checkStatus.status,
        });

        // RadioDJ checks
        sails.log.debug(`CHECK: DB RadioDJ`);
        checkStatus = { data: ``, status: 5 };
        sails.log.debug(
          `Calling asyncForEach in cron checkDB for RadioDJ database checks`
        );
        await sails.helpers.asyncForEach(checksRadioDJ, (check, index) => {
          // eslint-disable-next-line no-async-promise-executor
          return new Promise(async (resolve) => {
            try {
              var record = await check
                .find()
                .limit(1)
                .tolerate(() => {
                  checkStatus.status = 1;
                  checkStatus.data += `Model failure (query error): ${index}. Please ensure this table / the database is online and not corrupt. `;
                });
              if (
                typeof record[0] === "undefined" ||
                typeof record[0].ID === "undefined"
              ) {
                if (checkStatus.status > 3) {
                  checkStatus.status = 3;
                }
                checkStatus.data += `Model failure (No records returned): ${index}. Expected at least 1 row in this database table. Please ensure the table is not corrupt.`;
              }
              return resolve(false);
            } catch (err) {
              checkStatus.status = 1;
              checkStatus.data += `Model failure (internal error): ${index}. Please ensure the database is online, and check the server logs.`;
              sails.log.error(err);
              return resolve(false);
            }
          });
        });
        if (checkStatus.status === 5) {
          checkStatus.data = `This datastore is fully operational.`;
        }
        await sails.helpers.status.change.with({
          name: "db-radiodj",
          label: "DB RadioDJ",
          data: checkStatus.data,
          status: checkStatus.status,
        });

        // Nodebase checks
        sails.log.debug(`CHECK: DB Nodebase`);
        checkStatus = { data: ``, status: 5 };
        sails.log.debug(
          `Calling asyncForEach in cron checkDB for nodebase database checks`
        );
        await sails.helpers.asyncForEach(checksNodebase, (check, index) => {
          // eslint-disable-next-line no-async-promise-executor
          return new Promise(async (resolve) => {
            try {
              var record = await check
                .find()
                .limit(1)
                .tolerate(() => {
                  checkStatus.status = 1;
                  checkStatus.data += `Model failure (query error): ${index}. Please ensure this table / the database is online and not corrupt. `;
                });
              if (
                (typeof record[0] === "undefined" ||
                  typeof record[0].ID === "undefined") &&
                index > 8
              ) {
                if (checkStatus.status > 3) {
                  checkStatus.status = 3;
                }
                checkStatus.data += `Model failure (No records returned): ${index}. Expected at least 1 row in this database table. Please ensure the table is not corrupt.`;
              }
              return resolve(false);
            } catch (err) {
              checkStatus.status = 1;
              checkStatus.data += `Model failure (internal error): ${index}. Please ensure the database is online, and check the server logs.`;
              sails.log.error(err);
              return resolve(false);
            }
          });
        });
        if (checkStatus.status === 5) {
          checkStatus.data = `This datastore is fully operational.`;
        }
        await sails.helpers.status.change.with({
          name: "db-nodebase",
          label: "DB Nodebase",
          data: checkStatus.data,
          status: checkStatus.status,
        });

        // Inventory check
        sails.log.debug(`CHECK: DB inventory`);
        checkStatus = { data: ``, status: 5 };
        sails.log.debug(
          `Calling asyncForEach in cron checkDB for inventory database checks`
        );
        await sails.helpers.asyncForEach(checksInventory, (check, index) => {
          // eslint-disable-next-line no-async-promise-executor
          return new Promise(async (resolve) => {
            try {
              var record = await check
                .find()
                .limit(1)
                .tolerate(() => {
                  checkStatus.status = 1;
                  checkStatus.data += `Model failure (query error): ${index}. Please ensure this table / the database is online and not corrupt. `;
                });
              if (
                typeof record[0] === "undefined" ||
                typeof record[0].ID === "undefined"
              ) {
                if (checkStatus.status > 3) {
                  checkStatus.status = 3;
                }
                checkStatus.data += `Model failure (No records returned): ${index}. Expected at least 1 row in this database table. Please ensure the table is not corrupt.`;
              }
              return resolve(false);
            } catch (err) {
              checkStatus.status = 1;
              checkStatus.data += `Model failure (internal error): ${index}. Please ensure the database is online, and check the server logs.`;
              sails.log.error(err);
              return resolve(false);
            }
          });
        });
        if (checkStatus.status === 5) {
          checkStatus.data = `This datastore is fully operational.`;
        }
        await sails.helpers.status.change.with({
          name: "db-inventory",
          label: "DB Inventory",
          data: checkStatus.data,
          status: checkStatus.status,
        });

        return true;
      } catch (e) {
        await sails.helpers.status.change.with({
          name: "db-memory",
          label: "DB Memory",
          data:
            "The CRON checkDB failed. Please ensure the database is online and functional, and the credentials in config/datastores are correct.",
          status: 1,
        });
        await sails.helpers.status.change.with({
          name: "db-radiodj",
          label: "DB RadioDJ",
          data:
            "The CRON checkDB failed. Please ensure the database is online and functional, and the credentials in config/datastores are correct.",
          status: 1,
        });
        await sails.helpers.status.change.with({
          name: "db-nodebase",
          label: "DB Nodebase",
          data:
            "The CRON checkDB failed. Please ensure the database is online and functional, and the credentials in config/datastores are correct.",
          status: 1,
        });
        await sails.helpers.status.change.with({
          name: "db-inventory",
          label: "DB Inventory",
          data:
            "The CRON checkDB failed. Please ensure the database is online and functional, and the credentials in config/datastores are correct.",
          status: 1,
        });
        sails.log.error(e);
        return null;
      }
    });
  });

  // Every 5 minutes at second 08, reload the subcategory IDs in configuration, in case changes were made in RadioDJ
  sails.log.verbose(`BOOTSTRAP: scheduling reloadSubcats CRON.`);
  cron.schedule("8 */5 * * * *", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON reloadSubcats called.`);
      try {
        // Load subcategories into config
        await sails.helpers.songs.reloadSubcategories();

        return resolve(true);
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // Every minute at second 9, count the number of tracks disabled because they are invalid / corrupt / not accessible, and update Music Library status.
  sails.log.verbose(`BOOTSTRAP: scheduling disabledTracks CRON.`);
  cron.schedule("9 * * * * *", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON disabledTracks called.`);

      try {
        // Count the number of -1 enabled tracks

        var found = await sails.models.songs
          .count({ enabled: -1 })
          .tolerate(() => {});
        if (
          found &&
          found >= sails.config.custom.status.musicLibrary.verify.critical
        ) {
          await sails.helpers.status.change.with({
            name: `music-library`,
            status: 1,
            label: `Music Library`,
            data: `Music library has ${found} bad tracks. This is critically high and should be fixed immediately! Tracks are marked bad when either corrupt or cannot be accessed by RadioDJ. Please ensure all tracks used by RadioDJ are saved on a [network] drive that can be accessed by all RadioDJs. Run the "verify tracks" utility in RadioDJ to see which tracks are bad.`,
          });
        } else if (
          found &&
          found >= sails.config.custom.status.musicLibrary.verify.error
        ) {
          await sails.helpers.status.change.with({
            name: `music-library`,
            status: 2,
            label: `Music Library`,
            data: `Music library has ${found} bad tracks. This is quite high. Tracks are marked bad when either corrupt or cannot be accessed by RadioDJ. Please ensure all tracks used by RadioDJ are saved on a [network] drive that can be accessed by all RadioDJs. Run the "verify tracks" utility in RadioDJ to see which tracks are bad.`,
          });
        } else if (
          found &&
          found >= sails.config.custom.status.musicLibrary.verify.warn
        ) {
          await sails.helpers.status.change.with({
            name: `music-library`,
            status: 3,
            label: `Music Library`,
            data: `Music library has ${found} bad tracks. Tracks are marked bad when either corrupt or cannot be accessed by RadioDJ. Please ensure all tracks used by RadioDJ are saved on a [network] drive that can be accessed by all RadioDJs. Run the "verify tracks" utility in RadioDJ to see which tracks are bad.`,
          });
        } else {
          await sails.helpers.status.change.with({
            name: `music-library`,
            status: 5,
            label: `Music Library`,
            data: `Music library has ${found} bad tracks.`,
          });
        }

        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // Every minute at second 10, prune out sails.models.recipients that have been offline for 4 or more hours.
  sails.log.verbose(`BOOTSTRAP: scheduling sails.models.recipientsCheck CRON.`);
  cron.schedule("10 * * * * *", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON sails.models.recipientsCheck called.`);
      try {
        var records = await sails.models.recipients.find({
          host: { "!=": ["website"] },
          status: 0,
        });
        var destroyIt = [];
        var searchto = moment().subtract(4, "hours");
        records.forEach((record) => {
          if (moment(record.time).isBefore(moment(searchto))) {
            destroyIt.push(record.ID);
          }
        });
        if (destroyIt.length > 0) {
          await sails.models.recipients.destroy({ ID: destroyIt }).fetch();
        }

        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // Every fifth minute at second 11, refresh sails.models.darksky weather information
  // DEPRECATED. TODO: remove
  sails.log.verbose(`BOOTSTRAP: scheduling darksky CRON.`);
  cron.schedule("11 */5 * * * *", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON darksky called.`);
      try {
        darksky
          .latitude(sails.config.custom.darksky.position.latitude)
          .longitude(sails.config.custom.darksky.position.longitude)
          .exclude("alerts")
          .get()
          .then(async (resp) => {
            await sails.models.darksky
              .update(
                { ID: 1 },
                {
                  currently: resp.currently,
                  minutely: resp.minutely,
                  hourly: resp.hourly,
                  daily: resp.daily,
                }
              )
              .fetch();
          })
          .catch((err) => {
            sails.log.error(err);
            reject(err);
          });
        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // Every fifth minute at second 11, refresh sails.models.climacell weather information
  sails.log.verbose(`BOOTSTRAP: scheduling climacell CRON.`);
  cron.schedule("11 */5 * * * *", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON climacell called.`);
      try {
        await sails.helpers.climacell.update();
        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // every hour at second 12, check all noFade tracks and remove any fading.
  sails.log.verbose(
    `BOOTSTRAP: scheduling checkNoFadeAndNegativeDuration CRON.`
  );
  cron.schedule("12 0 * * * *", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON checkNoFadeAndNegativeDuration called.`);
      try {
        // Get all noFade tracks
        var records = await sails.models.songs.find({
          id_subcat: sails.config.custom.subcats.noFade,
        });

        if (records && records.length > 0) {
          records.map((record) => {
            var cueData = queryString.parse(record.cue_times);
            // If fade in and fade out are both 0 (treat when fade in or fade out is not specified as being 0), skip this track; nothing to do.
            if (
              (!cueData.fin || cueData.fin === 0) &&
              (!cueData.fou || cueData.fou === 0)
            ) {
              return null;
            }

            // Get rid of any fading, and reset the xta cue point
            cueData.fin = 0;
            cueData.fou = 0;
            cueData.xta = cueData.end || record.duration;

            cueData = `&${queryString.stringify(cueData)}`;

            // Update the track with the new cue points
            (async (record2, cueData2) => {
              // LINT: RadioDJ table
              // eslint-disable-next-line camelcase
              await sails.models.songs.update(
                { ID: record2.ID },
                { cue_times: cueData2 }
              );
            })(record, cueData);
          });
        }

        // Now, update tracks with a duration less than 0 and change their enabled status to -1; these are bad tracks that will crash RadioDJ.
        await sails.models.songs.update(
          { duration: { "<": 0 }, enabled: { "!=": -1 } },
          { enabled: -1 }
        );
        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // every minute at second 13, check for certain statuses
  sails.log.verbose(`BOOTSTRAP: scheduling checkStatuses CRON.`);
  cron.schedule("13 * * * * *", () => {
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON checkStatuses called.`);
      try {
        // Delay system; error if no status data for over 3 minutes
        var delay = await sails.models.status.findOne({ name: "delay-system" });
        if (
          moment(delay.time).add(3, "minutes").isBefore(moment()) &&
          delay.status > 3
        ) {
          await sails.helpers.status.change.with({
            name: "delay-system",
            label: "Delay System",
            data: `There has been no information received about the delay system for over 3 minutes. Please ensure the delay system is online, the serial port is properly connected to the responsible computer, and DJ Controls is running on the responsible computer.`,
            status: 1,
          });
          await sails.helpers.meta.change.with({ delaySystem: null });
        }

        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // every minute at second 14, send one queued email
  sails.log.verbose(`BOOTSTRAP: scheduling sendEmail CRON.`);
  cron.schedule("14 * * * * *", () => {
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON sendEmail called.`);
      try {
        var records = await sails.models.emails.find({ sent: false });
        if (records && records.length > 0) {
          await sails.helpers.emails.send(records[0].ID);
        }
        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // Every fifth minute at second 15, run inventory checks
  sails.log.verbose(`BOOTSTRAP: scheduling climacell CRON.`);
  cron.schedule("15 */5 * * * *", async () => {
    let status = 5;
    let issues = [];

    // Check for items not checked in yet that are overdue
    let records = await sails.models.checkout
      .find({
        checkInDate: null,
        checkInDue: { "!=": null },
      })
      .populate("item");
    records
      .filter((record) => moment(record.checkInDue).isBefore(moment()))
      .map((record) => {
        if (status > 4) status = 4;
        issues.push(
          `${record.name} checked out ${record.checkOutQuantity} ${
            record.item.name
          } (${record.item.location} / ${
            record.item.subLocation
          }). They were supposed to be returned on ${moment(
            record.checkInDue
          ).format("LLLL")}, but have still not been checked back in.`
        );
      });

    // Check for missing items
    let items = await sails.models.items.find();
    records = await sails.models.checkout
      .find({
        checkOutDate: { "!=": null },
        checkInDate: { "!=": null },
      })
      .populate("item");
    items.map((item) => {
      let quantity = item.quantity;
      let record = records.find((record) => record.item.ID === item.ID);
      if (record) quantity -= record.checkOutQuantity - record.checkInQuantity;
      if (quantity < item.quantity) {
        if (status > 4) status = 4;
        issues.push(
          `${item.name} (${item.location} / ${item.subLocation}) is missing items! Expected ${item.quantity} quantity, but only ${quantity} quantity was checked in.`
        );
      }
    });

    // Update status
    await sails.helpers.status.change.with({
      name: `inventory`,
      label: `Inventory`,
      status: status,
      data:
        issues.length === 0
          ? `No issues.`
          : `<ul>${issues.map((issue) => `<li>${issue}</li>`)}</ul>`,
    });
  });

  // Every minute at second 16, check server memory and CPU use.
  // ADVICE: It is advised that serverCheck is the last cron executed at the top of the minute. That way, the 1-minute CPU load will more likely detect issues.
  sails.log.verbose(`BOOTSTRAP: scheduling serverCheck CRON.`);
  cron.schedule("16 * * * * *", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON serverCheck called.`);
      try {
        var os = require("os");

        // Get CPU load and free memory
        var load = os.loadavg();
        var mem = os.freemem();

        if (
          load[0] >= sails.config.custom.status.server.load1.critical ||
          load[1] >= sails.config.custom.status.server.load5.critical ||
          load[2] >= sails.config.custom.status.server.load15.critical ||
          mem <= sails.config.custom.status.server.memory.critical
        ) {
          await sails.helpers.status.change.with({
            name: `server`,
            label: `Server`,
            status: 1,
            data: `Server resource use is dangerously high!!! CPU: 1-min ${load[0]}, 5-min: ${load[1]}, 15-min: ${load[2]}. Free memory: ${mem}`,
          });
        } else if (
          load[0] >= sails.config.custom.status.server.load1.error ||
          load[1] >= sails.config.custom.status.server.load5.error ||
          load[2] >= sails.config.custom.status.server.load15.error ||
          mem <= sails.config.custom.status.server.memory.error
        ) {
          await sails.helpers.status.change.with({
            name: `server`,
            label: `Server`,
            status: 2,
            data: `Server resource use is very high! CPU: 1-min ${load[0]}, 5-min: ${load[1]}, 15-min: ${load[2]}. Free memory: ${mem}`,
          });
        } else if (
          load[0] >= sails.config.custom.status.server.load1.warn ||
          load[1] >= sails.config.custom.status.server.load5.warn ||
          load[2] >= sails.config.custom.status.server.load15.warn ||
          mem <= sails.config.custom.status.server.memory.warn
        ) {
          await sails.helpers.status.change.with({
            name: `server`,
            label: `Server`,
            status: 3,
            data: `Server resource use is mildly high. CPU: 1-min ${load[0]}, 5-min: ${load[1]}, 15-min: ${load[2]}. Free memory: ${mem}`,
          });
        } else {
          await sails.helpers.status.change.with({
            name: `server`,
            label: `Server`,
            status: 5,
            data: `Server resource use is good. CPU: 1-min ${load[0]}, 5-min: ${load[1]}, 15-min: ${load[2]}. Free memory: ${mem}`,
          });
        }

        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // Every day at 11:59:50pm, clock out any directors still clocked in
  sails.log.verbose(`BOOTSTRAP: scheduling clockOutDirectors CRON.`);
  cron.schedule("50 59 23 * * *", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON clockOutDirectors called`);
      try {
        await sails.helpers.meta.change.with({
          time: moment().toISOString(true),
        });

        var records = await sails.models.timesheet
          .find({ timeIn: { "!=": null }, timeOut: null })
          .sort("scheduledIn ASC");
        var recordsX = [];
        if (records.length > 0) {
          var theStart;
          var theEnd;

          // Sequential async
          records.reduce(async (prevReturn, record) => {
            return await (async (recordB) => {
              if (!theEnd) {
                theStart = recordB.scheduledIn;
              } else {
                theStart = theEnd;
              }
              theEnd = recordB.scheduledOut;
              recordsX = recordsX.concat(
                await sails.models.timesheet
                  .update(
                    { ID: recordB.ID },
                    {
                      timeIn: moment(theStart).toISOString(true),
                      timeOut: moment(theEnd).toISOString(true),
                      approved: 0,
                    }
                  )
                  .fetch()
              );
            })(record);
          }, null);

          // Add special clock-out entry
          recordsX = recordsX.concat(
            await sails.models.timesheet
              .update(
                { timeIn: { "!=": null }, timeOut: null },
                {
                  timeIn: moment(theEnd).toISOString(true),
                  timeOut: moment().toISOString(true),
                  approved: 0,
                }
              )
              .fetch()
          );
        } else {
          // Add normal clock-out entry
          recordsX = recordsX.concat(
            await sails.models.timesheet
              .update(
                { timeIn: { "!=": null }, timeOut: null },
                { timeOut: moment().toISOString(true), approved: 0 }
              )
              .fetch()
          );
        }

        if (recordsX.length > 0) {
          recordsX.map((record) => {
            (async () => {
              await sails.helpers.onesignal.sendMass(
                "accountability-directors",
                "Timesheet needs approved in DJ Controls",
                `${record.name}'s timesheet, ending on ${moment().format(
                  "LLLL"
                )}, has been flagged and needs reviewed/approved because the director forgot to clock out at midnight.`
              );
            })();
          });
        }
        // Force reload all directors based on timesheets
        await sails.helpers.directors.update();

        // UAB DIRECTORS
        await sails.models.uabtimesheet
          .update(
            { timeIn: { "!=": null }, timeOut: null },
            { timeOut: moment().toISOString(true), approved: false }
          )
          .fetch()
          .tolerate((err) => {});
        await sails.helpers.uabdirectors.update();

        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // Every day at 11:59:51pm, check for minimum priorities on tracks and fix them as necessary
  sails.log.verbose(`BOOTSTRAP: scheduling priorityCheck CRON.`);
  cron.schedule("51 59 23 * * *", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON priorityCheck called`);
      try {
        // First, get the value of default priority
        var defaultPriority = await sails.models.settings
          .find({ source: "settings_general", setting: "DefaultTrackPriority" })
          .limit(1);

        if (
          typeof defaultPriority[0] === "undefined" ||
          defaultPriority === null ||
          defaultPriority[0] === null
        ) {
          throw new Error(
            "Could not find DefaultTrackPriority setting in the RadioDJ database"
          );
        }

        var songs = await sails.models.songs.find();

        sails.log.debug(
          `Calling asyncForEach in cron priorityCheck for every RadioDJ song`
        );
        songs.map((song) => {
          try {
            var minPriority =
              song.rating === 0 ? 0 : defaultPriority[0] * (song.rating / 9);
            minPriority = Math.round(minPriority * 10) / 10;
            if (song.weight < minPriority) {
              (async (song2, minPriority2) => {
                await sails.models.songs.update(
                  { ID: song2.ID },
                  { weight: minPriority2 }
                );
              })(song, minPriority);
            }
          } catch (e) {
            sails.log.error(e);
          }
        });

        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // Every Sunday at 12:00:01AM, send out weekly analytics to directors
  sails.log.verbose(`BOOTSTRAP: scheduling weeklyAnalyticsEmail CRON.`);
  cron.schedule("1 0 0 * * 0", () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON weeklyAnalyticsEmail called`);
      try {
        var stats = await sails.helpers.attendance.calculateStats();
        var weekly = stats[0];
        var overall = stats[1];
        var body = `<p>Dear directors,</p>
          <p>Here is the weekly analytic report for on-air programming.</p>
          
          <p><strong>Top 3 shows/remotes/prerecords for this week:</strong>
          <ul>
          <li>1. ${weekly.topShows[0]}</li>
          <li>2. ${weekly.topShows[1]}</li>
          <li>3. ${weekly.topShows[2]}</li>
          </ul>
          Top 3 shows are calculated based on listener:showtime ratio, web messages sent/received (interactivity), number of breaks taken in an hour (4 is best), and reputation (followed all on-air regulations, did show on-time, etc)</p>

          <p><strong>Top Genre of the week:</strong> ${weekly.topGenre}</p>
          <p><strong>Top Playlist of the week:</strong> ${
            weekly.topPlaylist
          }</p>
          <p><strong>Tracks liked on the website:</strong> ${
            weekly.tracksLiked
          }</p>
          <p><strong>Track requests placed on the website:</strong> ${
            weekly.tracksRequested
          }</p>
          <p><strong>Messages sent/received between listeners and DJs:</strong> ${
            weekly.webMessagesExchanged
          }</p>

          <p><strong>Live shows performed:</strong> ${
            overall[-1].week.shows
          }</p>
          <p><strong>Remote shows performed:</strong> ${
            overall[-1].week.remotes
          }</p>
          <p><strong>Prerecorded shows aired:</strong> ${
            overall[-1].week.prerecords
          }</p>
          <p><strong>Sports broadcasts performed:</strong> ${
            overall[-2].week.sports
          }</p>
          <p><strong>Playlists aired:</strong> ${overall[-4].week.playlists}</p>
          
          <p><strong>Total on-air minutes of shows/remotes/prerecords:</strong> ${
            overall[-1].week.showtime
          }</p>
          <p><strong>Total online listener minutes during shows/remotes/prerecords:</strong>: ${
            overall[-1].week.listeners
          }</p>
          <p><strong>Listener to showtime ratio of shows/remotes/prerecords (higher is better):</strong> ${
            overall[-1].week.ratio
          }</p>
          <p><strong>Total on-air minutes of sports broadcasts:</strong> ${
            overall[-2].week.showtime
          }</p>
          <p><strong>Total online listener minutes during sports:</strong>: ${
            overall[-2].week.listeners
          }</p>
          <p><strong>Listener to showtime ratio of sports (higher is better):</strong> ${
            overall[-2].week.ratio
          }</p>`;

        await sails.helpers.emails.queueDjsDirectors(
          `Weekly Analytics Report`,
          body
        );

        return resolve();
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // Every hour at xx:59:52, re-load calendardb cache in case it gets out of sync with the database.
  sails.log.verbose("BOOTSTRAP: scheduling calendardbCacheSync CRON.");
  cron.schedule("52 59 * * * *", () => {
    return new Promise(async (resolve, reject) => {
      sails.log.debug("CRON calendardbCacheSync called");
      try {
        // TODO: Temporarily disabled
        // sails.models.calendar.calendardb.query('calendar', await sails.models.calendar.find({ active: true }), true)
        // sails.models.calendar.calendardb.query('schedule', await sails.models.schedule.find(), true);
        // sails.models.calendar.calendardb.query('clockwheels', await sails.models.clockwheels.find(), true);
      } catch (e) {
        sails.log.error(e);
        return reject(e);
      }
    });
  });

  // Calculate weekly analytics in the background; this takes several seconds
  var temp = (async () => {
    await sails.helpers.attendance.calculateStats();
  })();

  sails.log.verbose(`Set a 30 second timer for display-refresh.`);
  setTimeout(() => {
    sails.sockets.broadcast("display-refresh", "display-refresh", true);
  }, 30000);

  // Log that the server was rebooted
  sails.log.verbose(`BOOTSTRAP: logging reboot`);
  await sails.models.logs
    .create({
      attendanceID: null,
      logtype: "reboot",
      loglevel: "warning",
      logsubtype: "automation",
      logIcon: `fas fa-exclamation-triangle`,
      title: `The Node server was started.`,
      event: `If this reboot was not intentional, please check the server and error logs.`,
    })
    .fetch()
    .tolerate((err) => {
      // Don't throw errors, but log them
      sails.log.error(err);
    });

  sails.log.verbose(`BOOTSTRAP: Done.`);

  return done();
};
