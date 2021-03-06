module.exports = {
  friendlyName: "playlists.start",

  description: "Begin a playlist in the active RadioDJ.",

  inputs: {
    event: {
      type: "json",
      description: "Event object triggering the playlist.",
    },
    ignoreChangingState: {
      type: "boolean",
      defaultsTo: false,
      description:
        "Set to true if we should ignore the sails.models.meta.changingState conflict check.",
    },
  },

  fn: async function (inputs, exits) {
    sails.log.debug("Helper playlists.start called.");
    try {
      var forced =
        inputs.event.type === "prerecord" &&
        sails.models.meta.memory.state.startsWith("prerecord_") &&
        sails.models.meta.memory.calendarUnique !== inputs.event.unique &&
        sails.models.meta.memory.calendarUnique !== null &&
        moment()
          .subtract(5, "minutes")
          .isSameOrAfter(moment(inputs.event.start));
      // Do not start the playlist if one is in the process of being queued, we're not in a proper automation state, we're in the middle of changing states and ignoreChangingState is false.
      if (
        !sails.models.playlists.queuing &&
        sails.models.meta.memory.calendarUnique !== inputs.event.unique &&
        (sails.models.meta.memory.changingState === null ||
          inputs.ignoreChangingState) &&
        (sails.models.meta.memory.state === "automation_on" ||
          sails.models.meta.memory.state === "automation_playlist" ||
          sails.models.meta.memory.state === "automation_genre" ||
          forced)
      ) {
        sails.log.verbose(`Processing helper.`);

        // For prerecords, if it already aired, do not air it again.
        if (!forced) {
          var records = await sails.models.attendance.count({
            unique: inputs.event.unique,
          });
          if (records && records > 0) {
            sails.log.verbose(`EXIT: Event already happened`);
            return exits.success(false);
          }
        }

        sails.models.playlists.queuing = true; // Mark that the playlist is being queued, to avoid app conflicts.

        sails.log.verbose(`Playlists.start: queuing`);

        // Lock state changes when necessary until we are done
        if (!inputs.ignoreChangingState) {
          await sails.helpers.meta.change.with({
            changingState: `Switching to playlist`,
          });
        }

        // Find the playlist
        var theplaylist = await sails.models.playlists.findOne({
          ID: inputs.event.playlistID,
        });
        sails.log.silly(`Playlist: ${theplaylist}`);

        // Bail and log if we cannot find the playlist
        if (!theplaylist) {
          if (!inputs.ignoreChangingState) {
            await sails.helpers.meta.change.with({ changingState: null });
          }
          sails.models.playlists.queuing = false;
          sails.log.verbose(`PLAYLIST ${inputs.event.playlistID} NOT FOUND`);
          var record = await sails.models.attendance
            .create({
              calendarID: inputs.event.calendarID,
              unique: inputs.event.unique,
              dj: inputs.event.hostDJ,
              cohostDJ1: inputs.event.cohostDJ1,
              cohostDJ2: inputs.event.cohostDJ2,
              cohostDJ3: inputs.event.cohostDJ3,
              event: `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}`,
              happened: 0,
              happenedReason: "Playlist was not found",
              scheduledStart: moment(inputs.event.start).toISOString(true),
              scheduledEnd: moment(inputs.event.end).toISOString(true),
              badPlaylist: true,
            })
            .fetch();
          await sails.models.logs
            .create({
              attendanceID: record.ID,
              logtype: "bad-playlist",
              loglevel: "orange",
              logsubtype: `${inputs.event.hosts} - ${inputs.event.name}`,
              logIcon: `fas fa-play-circle`,
              title: `A ${inputs.event.type} failed to air!`,
              event: `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}<br />The playlist assigned to this event did not exist in RadioDJ.`,
            })
            .fetch()
            .tolerate((err) => {
              // Do not throw for errors, but log them.
              sails.log.error(err);
            });
          await sails.helpers.onesignal.sendMass(
            "emergencies",
            `${inputs.event.type} failed to air!`,
            `${inputs.event.hosts} - ${
              inputs.event.name
            } failed to air on ${moment(inputs.event.start).format(
              "llll"
            )} - ${moment(inputs.event.end).format(
              "llll"
            )}; the playlist assigned to this event did not exist in RadioDJ.`
          );
          await sails.helpers.emails.queueDjs(
            inputs.event,
            `${inputs.event.type} failed to air: ${inputs.event.hosts} - ${inputs.event.name}`,
            `Dear ${inputs.event.hosts},<br /><br />
                            
          A scheduled ${inputs.event.type}, <strong>${inputs.event.name}</strong>, failed to air because the playlist aassigned to it did not exist. This is likely something the directors need to resolve, and they were included in this email.<br /><br />
          You can reply all to this email if you need assistance from the directors.`
          );

          return exits.error(new Error("Playlist not found!"));
        }

        // Load the playlist tracks into memory so CRON can check when the playlist has finished.
        // LINT: Playlists_list must NOT be camel case; this is how it is in the RadioDJ database.
        // eslint-disable-next-line camelcase
        var playlistTracks = await sails.models.playlists_list
          .find({ pID: theplaylist.ID })
          .sort("ord ASC");
        sails.log.verbose(
          `Playlists_list records retrieved: ${playlistTracks.length}`
        );

        // Bail and log if there are no tracks in this playlist
        if (playlistTracks.length < 1) {
          if (!inputs.ignoreChangingState) {
            await sails.helpers.meta.change.with({ changingState: null });
          }
          sails.models.playlists.queuing = false;
          sails.log.verbose(`playlists.start: NO TRACKS`);
          var record = await sails.models.attendance
            .create({
              calendarID: inputs.event.calendarID,
              unique: inputs.event.unique,
              dj: inputs.event.hostDJ,
              cohostDJ1: inputs.event.cohostDJ1,
              cohostDJ2: inputs.event.cohostDJ2,
              cohostDJ3: inputs.event.cohostDJ3,
              event: `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}`,
              happened: 0,
              happenedReason: "Playlist had no tracks",
              scheduledStart: moment(inputs.event.start).toISOString(true),
              scheduledEnd: moment(inputs.event.end).toISOString(true),
              badPlaylist: true,
            })
            .fetch();
          await sails.models.logs
            .create({
              attendanceID: record.ID,
              logtype: "bad-playlist",
              loglevel: "orange",
              logsubtype: `${inputs.event.hosts} - ${inputs.event.name}`,
              logIcon: `fas fa-play-circle`,
              title: `A ${inputs.event.type} failed to air!`,
              event: `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}<br />The playlist assigned to this event had no tracks to queue.`,
            })
            .fetch()
            .tolerate((err) => {
              // Do not throw for errors, but log them.
              sails.log.error(err);
            });
          await sails.helpers.onesignal.sendMass(
            "emergencies",
            `${inputs.event.type} failed to air!`,
            `${inputs.event.hosts} - ${
              inputs.event.name
            } failed to air on ${moment(inputs.event.start).format(
              "llll"
            )} - ${moment(inputs.event.end).format(
              "llll"
            )}; there were no tracks in the playlist to queue.`
          );
          await sails.helpers.emails.queueDjs(
            inputs.event,
            `${inputs.event.type} failed to air: ${inputs.event.hosts} - ${inputs.event.name}`,
            `Dear ${inputs.event.hosts},<br /><br />
                                    
                  A scheduled ${inputs.event.type}, <strong>${inputs.event.name}</strong>, failed to air because there were no tracks to queue in the playlist. This is likely something the directors need to resolve, and they were included in this email.<br /><br />
                  You can reply all to this email if you need assistance from the directors.`
          );
          return exits.error(new Error(`No playlist tracks were returned.`));
        }

        // Map all tracks in the playlist into memory.
        sails.models.playlists.active.tracks = [];
        playlistTracks.map((playlistTrack) =>
          sails.models.playlists.active.tracks.push(playlistTrack.sID)
        );

        // This private function will load the playlist and wait until deemed queued, then resolve.
        var loadPlaylist = function () {
          // LINT: async is required because await is necessary for Sails.js
          // eslint-disable-next-line no-async-promise-executor
          return new Promise(async (resolve, reject) => {
            try {
              sails.log.verbose(`playlists.start: loadPlaylist called.`);

              await sails.helpers.rest.cmd("LoadPlaylist", theplaylist.ID); // Queue the playlist

              var slot = 10;
              var prevLength = 0;
              sails.log.verbose(`Waiting for playlist queue...`);
              var bail = 60;
              var theFunction = async function () {
                try {
                  // Bail after waiting for a max of 60 seconds.
                  bail -= 1;
                  if (bail < 1) {
                    sails.models.playlists.queuing = false;
                    if (!inputs.ignoreChangingState) {
                      sails.helpers.meta.change.with({ changingState: null });
                    }
                    sails.log.verbose(
                      `Failed to queue playlist after 60 seconds.`
                    );
                    var record = await sails.models.attendance
                      .create({
                        calendarID: inputs.event.calendarID,
                        unique: inputs.event.unique,
                        dj: inputs.event.hostDJ,
                        cohostDJ1: inputs.event.cohostDJ1,
                        cohostDJ2: inputs.event.cohostDJ2,
                        cohostDJ3: inputs.event.cohostDJ3,
                        event: `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}`,
                        happened: 0,
                        happenedReason:
                          "Playlist queue timed out after 60 seconds",
                        scheduledStart: moment(inputs.event.start).toISOString(
                          true
                        ),
                        scheduledEnd: moment(inputs.event.end).toISOString(
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
                        logsubtype: `${inputs.event.hosts} - ${inputs.event.name}`,
                        logIcon: `fas fa-play-circle`,
                        title: `A ${inputs.event.type} failed to air!`,
                        event: `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}<br />The playlist took too long to queue in RadioDJ (timed out after 60 seconds).`,
                      })
                      .fetch()
                      .tolerate((err) => {
                        // Do not throw for errors, but log them.
                        sails.log.error(err);
                      });
                    await sails.helpers.onesignal.sendMass(
                      "emergencies",
                      `${inputs.event.type} failed to air!`,
                      `${inputs.event.hosts} - ${
                        inputs.event.name
                      } failed to air on ${moment(inputs.event.start).format(
                        "llll"
                      )} - ${moment(inputs.event.end).format(
                        "llll"
                      )}; playlist took too long to queue (timed out after 60 seconds)`
                    );
                    await sails.helpers.emails.queueDjs(
                      inputs.event,
                      `${inputs.event.type} failed to air: ${inputs.event.hosts} - ${inputs.event.name}`,
                      `Dear ${inputs.event.hosts},<br /><br />
                                      
                    A scheduled ${inputs.event.type}, <strong>${inputs.event.name}</strong>, failed to air because the playlist took too long (60 seconds) to queue in RadioDJ. This is likely something the directors need to resolve, and they were included in this email.<br /><br />
                    You can reply all to this email if you need assistance from the directors.`
                    );
                    return reject(
                      new Error(
                        "The playlist was not considered queued after 60 seconds."
                      )
                    );
                  }

                  var tracks = sails.models.meta.automation;

                  // If the number of tracks detected in queue is less than or equal to the previous check, count down on the slot counter.
                  if (tracks.length <= prevLength) {
                    slot -= 1;
                    // Consider playlist as finished queuing if counter reaches zero.
                    if (slot <= 0) {
                      sails.models.playlists.queuing = false;
                      if (!inputs.ignoreChangingState) {
                        sails.helpers.meta.change.with({ changingState: null });
                      }
                      sails.log.verbose(
                        `Considered playlist as queued. Proceeding.`
                      );
                      return resolve();
                    } else {
                      setTimeout(theFunction, 1000);
                    }
                    // Otherwise, reset the slot counter to 10 as we assume playlist is still queuing.
                  } else {
                    slot = 10;
                    setTimeout(theFunction, 1000);
                  }
                  prevLength = tracks.length;
                } catch (unusedE) {
                  setTimeout(theFunction, 1000);
                }
              };
              theFunction();
            } catch (e) {
              return reject(e);
            }
          });
        };

        // Regular playlist
        if (inputs.event.type === "playlist") {
          await sails.helpers.songs.queue(
            sails.config.custom.subcats.IDs,
            "Top",
            1
          );
          sails.log.verbose(`playlists.start: Type playlist`);
          await sails.helpers.rest.cmd("EnableAutoDJ", 0);
          sails.log.verbose(`playlists.start: clear queue`);
          await sails.helpers.songs.remove(
            true,
            sails.config.custom.subcats.noClearGeneral,
            false
          );
          await sails.helpers.rest.cmd("EnableAssisted", 0);
          await sails.helpers.meta.changeDjs(
            `${inputs.event.hosts} - ${inputs.event.name}`
          );
          sails.log.verbose(`playlists.start: Changed DJs`);
          await sails.helpers.meta.change.with({
            state: "automation_playlist",
            playlist: inputs.event.name,
            playlistID: theplaylist.ID,
            playlistPosition: -1,
            playlistPlayed: moment().toISOString(true),
            show: `${inputs.event.hosts} - ${inputs.event.name}`,
          });
          sails.log.verbose(`playlists.start: Changed Meta`);
          await sails.helpers.meta.newShow();
          sails.log.verbose(`playlists.start: Started new show`);
          await loadPlaylist();
          sails.log.verbose("playlists.start: Re-queuing other tracks");

          await sails.helpers.rest.cmd("EnableAutoDJ", 1);

          // Prerecords
        } else if (inputs.event.type === "prerecord") {
          sails.log.verbose(`playlists.start: Type prerecord`);
          // Queue a show opener if applicable
          if (
            typeof sails.config.custom.showcats[inputs.event.name] !==
            "undefined"
          ) {
            await sails.helpers.songs.queue(
              [sails.config.custom.showcats[inputs.event.name]["Show Openers"]],
              "Top",
              1
            );
          } else {
            await sails.helpers.songs.queue(
              [sails.config.custom.showcats["Default"]["Show Openers"]],
              "Top",
              1
            );
          }
          await sails.helpers.songs.queue(
            sails.config.custom.subcats.IDs,
            "Top",
            1
          );
          if (forced) {
            sails.log.verbose(`playlists.start: Forced`);
            await sails.models.logs
              .create({
                attendanceID: sails.models.meta.memory.attendanceID,
                logtype: "prerecord-terminated",
                loglevel: "primary",
                logsubtype: sails.models.meta.memory.playlist,
                logIcon: `fas fa-stop`,
                title: `A prerecord was terminated early as it ran over time into another prerecord.`,
                event: `Prerecord ending: ${sails.models.meta.memory.show}<br />Prerecord starting: ${inputs.event.hosts} - ${inputs.event.name}`,
              })
              .fetch()
              .tolerate((err) => {
                sails.log.error(err);
              });
          }
          sails.log.verbose(`playlists.start: Disable autodj`);
          await sails.helpers.rest.cmd("EnableAutoDJ", 0);
          sails.log.verbose(`playlists.start: clear queue`);
          await sails.helpers.songs.remove(
            true,
            sails.config.custom.subcats.noClearShow,
            false
          );
          sails.log.verbose(`playlists.start: Disable assisted`);
          await sails.helpers.rest.cmd("EnableAssisted", 0);
          sails.log.verbose(`playlists.start: Changing DJs`);
          await sails.helpers.meta.changeDjs(
            `${inputs.event.hosts} - ${inputs.event.name}`
          );
          sails.log.verbose(`playlists.start: Changing Meta`);
          await sails.helpers.meta.change.with({
            state: "automation_prerecord",
            playlist: inputs.event.name,
            playlistID: theplaylist.ID,
            playlistPosition: -1,
            playlistPlayed: moment().toISOString(true),
            show: `${inputs.event.hosts} - ${inputs.event.name}`,
            topic: await sails.helpers.truncateText(
              inputs.event.description,
              256
            ),
          });
          sails.log.verbose("playlists.start: Loading playlist");
          await loadPlaylist();
          sails.log.verbose("playlists.start: Re-queuing other tracks");

          // After loading playlist, determine if we should immediately skip the currently playing track to get the prerecord on the air sooner.
          var timeToFirstTrack = 0;
          var queue = await sails.helpers.rest.getQueue();
          var firstTrack = false;
          sails.log.verbose(
            `playlists.start: Checking if we have to skip current track`
          );
          queue.map((track) => {
            if (
              sails.models.playlists.active.tracks.indexOf(
                parseInt(track.ID)
              ) === -1 &&
              !firstTrack
            ) {
              timeToFirstTrack +=
                parseInt(track.Duration) - parseInt(track.Elapsed);
            } else {
              firstTrack = true;
            }
          });
          if (
            timeToFirstTrack >= sails.config.custom.queueCorrection.prerecord
          ) {
            if (
              sails.config.custom.subcats.noClearShow &&
              sails.config.custom.subcats.noClearShow.indexOf(
                sails.models.meta.memory.trackIDSubcat
              ) === -1
            ) {
              await sails.helpers.rest.cmd("PlayPlaylistTrack", 0);
            } // Skip currently playing track if it is not a noClearShow track
          }

          await sails.helpers.rest.cmd("EnableAutoDJ", 1);
        }
        sails.log.verbose(`playlists.start: DONE`);
        if (!inputs.ignoreChangingState) {
          await sails.helpers.meta.change.with({ changingState: null });
        }
        return exits.success(true);
      } else {
        sails.log.verbose("Helper SKIPPED.");
        return exits.success(false);
      }
    } catch (e) {
      if (!inputs.ignoreChangingState) {
        await sails.helpers.meta.change.with({ changingState: null });
      }
      sails.models.playlists.queuing = false;
      await sails.helpers.rest.cmd("EnableAutoDJ", 1);
      console.error(e);
      return exits.error(e);
    }
  },
};
