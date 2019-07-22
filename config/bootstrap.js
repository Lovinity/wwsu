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

module.exports.bootstrap = async function (done) {
  var cron = require(`node-cron`)
  var sh = require(`shorthash`)
  const queryString = require(`query-string`)
  const DarkSkyApi = require(`dark-sky`)
  const darksky = new DarkSkyApi(sails.config.custom.darksky.api)

  // By convention, this is a good place to set up fake data during development.
  //
  // For example:
  // ```
  // // Set up fake development data (or if we already have some, avast)
  // if (await User.count() > 0) {
  //   return done();
  // }
  //
  // await User.createEach([
  //   { emailAddress: 'ry@example.com', fullName: 'Ryan Dahl', },
  //   { emailAddress: 'rachael@example.com', fullName: 'Rachael Shaw', },
  //   // etc.
  // ]);
  // ```

  // Don't forget to trigger `done()` when this bootstrap function's logic is finished.
  // (otherwise your server will never lift, since it's waiting on the bootstrap)

  // Log that the server was rebooted
  await Logs.create({ attendanceID: null, logtype: `reboot`, loglevel: `warning`, logsubtype: `automation`, event: `<strong>The Node server was rebooted.</strong>` }).fetch()
    .tolerate((err) => {
      // Don't throw errors, but log them
      sails.log.error(err)
    })

  // Generate token secrets
  sails.log.verbose(`BOOTSTRAP: generating token secrets`)
  var cryptoRandomString = require(`crypto-random-string`)
  sails.config.custom.secrets = {}
  sails.config.custom.secrets.host = cryptoRandomString(256)
  sails.config.custom.secrets.dj = cryptoRandomString(256)
  sails.config.custom.secrets.director = cryptoRandomString(256)
  sails.config.custom.secrets.adminDirector = cryptoRandomString(256)
  sails.config.custom.secrets.directorUab = cryptoRandomString(256)
  sails.config.custom.secrets.adminDirectorUab = cryptoRandomString(256)

  // Load darksky
  await Darksky.findOrCreate({ ID: 1 }, { ID: 1, currently: {}, minutely: {}, hourly: {}, daily: {} })

  // Load blank Meta template
  sails.log.verbose(`BOOTSTRAP: Cloning Meta.A to Meta.template`)
  Meta.template = _.cloneDeep(Meta[`A`])

  // Load default status template into memory. Add radioDJ and DJ Controls instances to template as well.
  sails.log.verbose(`BOOTSTRAP: Loading RadioDJ instances into template`)
  sails.config.custom.radiodjs.forEach((radiodj) => {
    Status.template.push({ name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, status: radiodj.level, data: `This RadioDJ has not reported online since initialization.`, time: null })
  })
  sails.log.verbose(`BOOTSTRAP: Loading Client instances into template`)
  var clients = await Hosts.find({ authorized: true })
    .tolerate((err) => {
      // Don't throw errors, but log them
      sails.log.error(err)
    })
  if (clients.length > 0) {
    clients.forEach((client) => {
      var offStatus = 4
      if (client.silenceDetection || client.recordAudio || client.answerCalls) {
        if (client.silenceDetection || client.recordAudio) {
          offStatus = 2
        } else {
          offStatus = 3
        }
        Status.template.push({ name: `host-${sh.unique(client.host + sails.config.custom.hostSecret)}`, label: `Host ${client.friendlyname}`, status: offStatus, data: `This host has not reported online since initialization.`, time: null })
      }
    })
  }

  sails.log.verbose(`BOOTSTRAP: Loading Display Sign instances into template`)
  sails.config.custom.displaysigns.forEach((display) => {
    Status.template.push({ name: `display-${display.name}`, label: `Display ${display.label}`, status: display.level, data: `This display sign has not reported online since initialization.`, time: null })
  })

  sails.log.verbose(`BOOTSTRAP: Adding Status template to database.`)
  await Status.createEach(Status.template)
    .tolerate((err) => {
      return done(err)
    })

  // Load internal recipients into memory
  sails.log.verbose(`BOOTSTRAP: Adding recipients template to database.`)
  await Recipients.createEach(Recipients.template)
    .tolerate((err) => {
      return done(err)
    })

  // Generate recipients based off of messages from the last hour... website only.
  sails.log.verbose(`BOOTSTRAP: Adding recipients from messages sent within the last hour into database.`)
  var records = await Messages.find({ status: `active`, from: { startsWith: `website-` }, createdAt: { '>': moment().subtract(1, `hours`).toDate() } }).sort(`createdAt DESC`)
    .tolerate(() => {
    })
  if (records && records.length > 0) {
    var insertRecords = []
    var hosts = []
    records.forEach((record) => {
      if (hosts.indexOf(record.from) === -1) {
        hosts.push(record.from)
        insertRecords.push({ host: record.from, group: `website`, label: record.from_friendly, status: 0, time: record.createdAt })
      }
    })

    await Recipients.createEach(insertRecords)
      .tolerate((err) => {
        return done(err)
      })
  }

  try {
    // Load subcategories into config
    await sails.helpers.songs.reloadSubcategories()

    // Load metadata into memory
    sails.log.verbose(`BOOTSTRAP: Loading metadata.`)
    var meta = await Meta.find().limit(1)
      .tolerate((err) => {
        sails.log.error(err)
      })
    meta = meta[0]
    meta.time = moment().toISOString(true)
    sails.log.silly(meta)
    await Meta.changeMeta(meta)
    if (meta.playlist !== null && meta.playlist !== ``) {
      var theplaylist = await Playlists.findOne({ name: meta.playlist })
      // LINT: RadioDJ table; is not camel cased
      // eslint-disable-next-line camelcase
      var playlistTracks = await Playlists_list.find({ pID: theplaylist.ID })
        .tolerate(() => {
        })
      Playlists.active.tracks = []
      if (typeof playlistTracks !== `undefined`) {
        playlistTracks.forEach((playlistTrack) => {
          Playlists.active.tracks.push(playlistTrack.sID)
        })
      }
    }
  } catch (unusedE) {
  }

  // Load directors.
  sails.log.verbose(`BOOTSTRAP: Refreshing directors.`)
  await Directors.updateDirectors()
  await Uabdirectors.updateDirectors()

  // Load Google Calendar.
  sails.log.verbose(`BOOTSTRAP: Loading calendar events.`)
  await Meta.changeMeta({ changingState: `Initializing program calendar` })
  try {
    await Calendar.preLoadEvents(true)
    await Meta.changeMeta({ changingState: null })
  } catch (unusedE) {
    await Meta.changeMeta({ changingState: null })
  }

  // CRON JOBS

  // Automation / queue checks every second
  sails.log.verbose(`BOOTSTRAP: scheduling checks CRON.`)
  cron.schedule(`* * * * * *`, () => {
    new Promise(async (resolve) => {
      sails.log.debug(`CRON checks triggered.`)

      var queueLength = 0
      var theplaylist
      var playlistTracks
      var change = { queueFinish: null, trackFinish: null } // Instead of doing a bunch of changeMetas, put all non-immediate changes into this object and changeMeta at the end of this operation.
      //
      // Skip all checks and use default meta template if sails.config.custom.lofi = true
      if (sails.config.custom.lofi) {
        try {
          change = Meta.template
          change.time = moment().toISOString(true)
          await Meta.changeMeta(change)
        } catch (e) {
          sails.log.error(e)
          return resolve(e)
        }
        return resolve()
      }

      // If we do not know current state, we may need to populate the info from the database.
      if (Meta[`A`].state === `` || Meta[`A`].state === `unknown`) {
        try {
          sails.log.verbose(`Unknown meta. Retrieving from database.`)
          var meta = await Meta.find().limit(1)
            .tolerate((err) => {
              sails.log.error(err)
              return resolve(err)
            })
          meta = meta[0]
          meta.time = moment().toISOString(true)
          sails.log.silly(meta)
          await Meta.changeMeta(meta)
          if (meta.playlist !== null && meta.playlist !== ``) {
            theplaylist = await Playlists.findOne({ name: meta.playlist })
            // LINT: RadioDJ table that is not camel case
            // eslint-disable-next-line camelcase
            playlistTracks = await Playlists_list.find({ pID: theplaylist.ID })
              .tolerate(() => {
              })
            Playlists.active.tracks = []
            if (typeof playlistTracks !== `undefined`) {
              playlistTracks.forEach((playlistTrack) => {
                Playlists.active.tracks.push(playlistTrack.sID)
              })
            }
          }
        } catch (e) {
          return resolve(e)
        }
      }

      try {
        // Try to get the current RadioDJ queue.
        var queue = await sails.helpers.rest.getQueue()

        try {
          sails.log.silly(`queueCheck executed.`)
          var theTracks = []
          change.trackID = parseInt(queue[0].ID)
          change.trackIDSubcat = parseInt(queue[0].IDSubcat) || 0

          // Determine if something is currently playing via whether or not track 0 has ID of 0.
          if (parseInt(queue[0].ID) === 0) {
            change.playing = false
            change.trackFinish = null
          } else {
            change.playing = true
            change.trackArtist = queue[0].Artist || null
            change.trackTitle = queue[0].Title || null
            change.trackAlbum = queue[0].Album || null
            change.trackLabel = queue[0].Label || null
            change.trackFinish = moment().add(parseFloat(queue[0].Duration) - parseFloat(queue[0].Elapsed), `seconds`).toISOString(true)
          }

          // When on queue to go live or return from break, search for the position of the last noMeta track
          var breakQueueLength = -2
          var firstNoMeta = 0
          change.queueMusic = false
          if ((Meta[`A`].state.includes(`_returning`) || Meta[`A`].state === `automation_live` || Meta[`A`].state === `automation_remote` || Meta[`A`].state === `automation_sports` || Meta[`A`].state === `automation_sportsremote`)) {
            breakQueueLength = -1
            firstNoMeta = -1
            queue.forEach((track, index) => {
              if (sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(parseInt(track.IDSubcat)) === -1) {
                if (firstNoMeta > -1 && breakQueueLength < 0) {
                  breakQueueLength = index
                  change.queueMusic = true
                }
              } else if (firstNoMeta < 0) {
                firstNoMeta = index
              }
            })
          }

          // Remove duplicate tracks (ONLY remove one since cron goes every second; so one is removed each second). Do not remove any duplicates if changing states.
          if (Meta[`A`].changingState === null) {
            sails.log.debug(`Calling asyncForEach in cron checks for removing duplicate tracks`)
            await sails.helpers.asyncForEach(queue, (track, index) => {
              return new Promise(async (resolve2) => {
                var title = `${track.Artist} - ${track.Title}`
                // If there is a duplicate, remove the track, store for later queuing if necessary.
                // Also, calculate length of the queue
                if (theTracks.indexOf(title) > -1) {
                  sails.log.debug(`Track ${track.ID} on index ${index} is a duplicate of index (${theTracks[theTracks.indexOf(title)]}. Removing!`)
                  if (track.TrackType !== `Music`) { Songs.pending.push(track.ID) }
                  await sails.helpers.rest.cmd(`RemovePlaylistTrack`, index - 1)
                  theTracks = []
                  queue = await sails.helpers.rest.getQueue()
                  queueLength = 0
                  return resolve2(true)
                } else {
                  theTracks.push(title)

                  if (index < breakQueueLength || (breakQueueLength < 0 && firstNoMeta > -1)) {
                    queueLength += (track.Duration - track.Elapsed)
                  }

                  return resolve2(false)
                }
              })
            })
          }
        } catch (e) {
          sails.log.error(e)
          return resolve(e)
        }

        // Error checks
        await sails.helpers.error.reset(`queueFail`)
        await sails.helpers.error.count(`stationID`, true)
      } catch (e) {
        await sails.helpers.error.count(`queueFail`)
        sails.log.error(e)
        return resolve(e)
      }

      /* Every now and then, querying now playing queue happens when RadioDJ is in the process of queuing a track, resulting in an inaccurate reported queue length.
             * This results in false transitions in system state. Run a check to detect if the queuelength deviated by more than 2 seconds since last run.
             * If so, we assume this was an error, so do not treat it as accurate, and trigger a 5 second error resolution wait.
             */
      if (queueLength > (Status.errorCheck.prevQueueLength - 3) || Status.errorCheck.trueZero > 0) {
        // If the detected queueLength gets bigger, assume the issue resolved itself and immediately mark the queuelength as accurate
        if (queueLength > (Status.errorCheck.prevQueueLength)) {
          Status.errorCheck.trueZero = 0
        } else if (Status.errorCheck.trueZero > 0) {
          Status.errorCheck.trueZero -= 1
          if (Status.errorCheck.trueZero < 1) {
            Status.errorCheck.trueZero = 0
          } else {
            // Statemeta.final.queueLength = (Statesystem.errors.prevqueuelength - 1);
          }
          if (queueLength < 0) { queueLength = 0 }
        } else { // No error wait time [remaining]? Use actual detected queue time.
        }
      } else {
        Status.errorCheck.trueZero = 5 // Wait up to 5 seconds before considering the queue accurate
        // Instead of using the actually recorded queueLength, use the previously detected length minus 1 second.
        if (queueLength < 0) { queueLength = 0 }
      }

      Status.errorCheck.prevQueueLength = queueLength

      // If we do not know active playlist, we need to populate the info
      if (Meta[`A`].playlist !== null && Meta[`A`].playlist !== `` && Playlists.active.tracks.length <= 0 && (Meta[`A`].state === `automation_playlist` || Meta[`A`].state === `live_prerecord`)) {
        try {
          theplaylist = await Playlists.findOne({ name: Meta[`A`].playlist })
            .tolerate(() => {
            })
          if (typeof theplaylist !== `undefined`) {
            // LINT: RadioDJ table
            // eslint-disable-next-line camelcase
            playlistTracks = await Playlists_list.find({ pID: Playlists.active.ID })
              .tolerate(() => {
              })
            Playlists.active.tracks = []
            if (typeof playlistTracks !== `undefined`) {
              playlistTracks.forEach((playlistTrack) => {
                Playlists.active.tracks.push(playlistTrack.sID)
              })
            }
          } else {
            await Meta.changeMeta({ playlist: null })
          }
        } catch (e) {
          sails.log.error(e)
        }
      }

      // If we are in automation_genre, check to see if the queue is less than 20 seconds. If so, the genre rotation may be out of tracks to play.
      // In that case, flip to automation_on with Default rotation.
      if (Meta[`A`].state === `automation_genre` && queueLength <= 20) {
        await sails.helpers.error.count(`genreEmpty`)
      } else {
        await sails.helpers.error.reset(`genreEmpty`)
      }

      // Clear manual metadata if it is old
      if (Meta[`A`].trackStamp !== null && (moment().isAfter(moment(Meta[`A`].trackStamp).add(sails.config.custom.meta.clearTime, `minutes`)) && !Meta[`A`].state.startsWith(`automation_`) && Meta[`A`].state !== `live_prerecord`)) {
        change.trackStamp = null
        change.trackArtist = null
        change.trackTitle = null
        change.trackAlbum = null
        change.trackLabel = null
      }

      // Playlist maintenance
      var thePosition = -1
      if ((Meta[`A`].state === `automation_playlist` || Meta[`A`].state === `automation_prerecord` || Meta[`A`].state === `live_prerecord`)) {
        // Go through each track in the queue and see if it is a track from our playlist. If so, log the lowest number as the position in our playlist
        sails.log.debug(`Calling asyncForEach in cron checks for checking if any tracks in queue are a part of an active playlist`)
        await sails.helpers.asyncForEach(queue, (autoTrack, index) => {
          return new Promise(async (resolve2) => {
            try {
              for (var i = 0; i < Playlists.active.tracks.length; i++) {
                var name = Playlists.active.tracks[i]
                if (name === parseInt(autoTrack.ID)) {
                  // Waiting for the playlist to begin, and it has begun? Switch states.
                  if (Meta[`A`].state === `automation_prerecord` && index === 0 && !Playlists.queuing && Meta[`A`].changingState === null) {
                    // State switching should be pushed in sockets
                    await Meta.changeMeta({ state: `live_prerecord`, showStamp: moment().toISOString(true) })
                    var attendance = await Attendance.createRecord(`Prerecord: ${Meta[`A`].playlist}`)
                    await Logs.create({ attendanceID: Meta[`A`].attendanceID, logtype: `sign-on`, loglevel: `primary`, logsubtype: Meta[`A`].playlist, event: `<strong>A prerecord started airing.</strong><br />Prerecord: ${Meta[`A`].playlist}` }).fetch()
                      .tolerate((err) => {
                        // Do not throw for errors, but log it.
                        sails.log.error(err)
                      })
                    await sails.helpers.onesignal.sendEvent(`Prerecord: `, Meta[`A`].playlist, `Prerecorded Show`, attendance.unique)
                  }
                  if (index === 0) {
                  } else {
                  }
                  if (thePosition === -1 || i < thePosition) {
                    thePosition = i
                  }
                  break
                }
              }
              return resolve2(false)
            } catch (e) {
              sails.log.error(e)
              return resolve2(false)
            }
          })
        })

        try {
          // Finished the playlist? Go back to automation.
          if (thePosition === -1 && Status.errorCheck.trueZero <= 0 && !Playlists.queuing && Meta[`A`].changingState === null) {
            await Meta.changeMeta({ changingState: `Ending playlist` })
            switch (Meta[`A`].state) {
              case `automation_playlist`:
                await Logs.create({ attendanceID: Meta[`A`].attendanceID, logtype: `sign-off`, loglevel: `primary`, logsubtype: Meta[`A`].playlist, event: `<strong>A playlist finished airing.</strong>` }).fetch()
                  .tolerate((err) => {
                    // Do not throw for errors, but log it.
                    sails.log.error(err)
                  })
                break
              case `live_prerecord`:
                await Logs.create({ attendanceID: Meta[`A`].attendanceID, logtype: `sign-off`, loglevel: `primary`, logsubtype: Meta[`A`].playlist, event: `<strong>A prerecord finished airing.</strong>` }).fetch()
                  .tolerate((err) => {
                    // Do not throw for errors, but log it.
                    sails.log.error(err)
                  })
                break
            }
            await sails.helpers.rest.cmd(`EnableAssisted`, 0)

            // Add up to 3 track requests if any are pending
            await sails.helpers.requests.queue(3, true, true)

            // Switch back to automation
            await Meta.changeMeta({ changingState: null, state: `automation_on`, genre: ``, show: ``, topic: ``, playlist: null, playlist_position: 0 })

            // Re-load google calendar events to check for, and execute, any playlists/genres/etc that are scheduled.
            await Calendar.preLoadEvents()

            // Did not finish the playlist? Ensure the position is updated in meta.
          } else if (thePosition !== -1) {
            if (thePosition !== Meta[`A`].playlist_position) {
              change.playlist_position = thePosition
            }
          }
        } catch (e) {
          sails.log.error(e)
        }
      }

      try {
        var attendance
        if (queue.length > 0) {
          // If we are preparing for live, so some stuff if queue is done
          if (Meta[`A`].state === `automation_live` && queueLength <= 0 && Status.errorCheck.trueZero <= 0) {
            await Meta.changeMeta({ state: `live_on`, showStamp: moment().toISOString(true) })
            await sails.helpers.rest.cmd(`EnableAssisted`, 1)
            attendance = await Attendance.createRecord(`Show: ${Meta[`A`].show}`)
            await Logs.create({ attendanceID: Meta[`A`].attendanceID, logtype: `sign-on`, loglevel: `primary`, logsubtype: Meta[`A`].show, event: `<strong>DJ is now live.</strong><br />DJ - Show: ` + Meta[`A`].show + `<br />Topic: ` + Meta[`A`].topic }).fetch()
              .tolerate((err) => {
                // Do not throw for errors, but log it.
                sails.log.error(err)
              })
            await sails.helpers.onesignal.sendEvent(`Show: `, Meta[`A`].show, `Live Show`, attendance.unique)
          }
          // If we are preparing for sports, do some stuff if queue is done
          if (Meta[`A`].state === `automation_sports` && queueLength <= 0 && Status.errorCheck.trueZero <= 0) {
            await Meta.changeMeta({ state: `sports_on`, showStamp: moment().toISOString(true) })
            await sails.helpers.rest.cmd(`EnableAssisted`, 1)
            attendance = await Attendance.createRecord(`Sports: ${Meta[`A`].show}`)
            await Logs.create({ attendanceID: Meta[`A`].attendanceID, logtype: `sign-on`, loglevel: `primary`, logsubtype: Meta[`A`].show, event: `<strong>A sports broadcast has started.</strong><br />Sport: ` + Meta[`A`].show + `<br />Topic: ` + Meta[`A`].topic }).fetch()
              .tolerate((err) => {
                // Do not throw for errors, but log it.
                sails.log.error(err)
              })
            await sails.helpers.onesignal.sendEvent(`Sports: `, Meta[`A`].show, `Sports Broadcast`, attendance.unique)
          }
          // If we are preparing for remote, do some stuff
          if (Meta[`A`].state === `automation_remote` && queueLength <= 0 && Status.errorCheck.trueZero <= 0) {
            await Meta.changeMeta({ state: `remote_on`, showStamp: moment().toISOString(true) })
            attendance = await Attendance.createRecord(`Remote: ${Meta[`A`].show}`)
            await Logs.create({ attendanceID: Meta[`A`].attendanceID, logtype: `sign-on`, loglevel: `primary`, logsubtype: Meta[`A`].show, event: `<strong>A remote broadcast is now on the air.</strong><br />Host - Show: ` + Meta[`A`].show + `<br />Topic: ` + Meta[`A`].topic }).fetch()
              .tolerate((err) => {
                // Do not throw for errors, but log it.
                sails.log.error(err)
              })
            await sails.helpers.onesignal.sendEvent(`Remote: `, Meta[`A`].show, `Remote Broadcast`, attendance.unique)
          }
          // If we are preparing for sportsremote, do some stuff if we are playing the stream track
          if (Meta[`A`].state === `automation_sportsremote` && queueLength <= 0 && Status.errorCheck.trueZero <= 0) {
            await Meta.changeMeta({ state: `sportsremote_on`, showStamp: moment().toISOString(true) })
            attendance = await Attendance.createRecord(`Sports: ${Meta[`A`].show}`)
            await Logs.create({ attendanceID: Meta[`A`].attendanceID, logtype: `sign-on`, loglevel: `primary`, logsubtype: Meta[`A`].show, event: `<strong>A remote sports broadcast has started.</strong><br />Sport: ` + Meta[`A`].show + `<br />Topic: ` + Meta[`A`].topic }).fetch()
              .tolerate((err) => {
                // Do not throw for errors, but log it.
                sails.log.error(err)
              })
            await sails.helpers.onesignal.sendEvent(`Sports: `, Meta[`A`].show, `Sports Broadcast`, attendance.unique)
          }
          // If returning from break, do stuff once queue is empty
          if (Meta[`A`].state.includes(`_returning`) && queueLength <= 0 && Status.errorCheck.trueZero <= 0) {
            switch (Meta[`A`].state) {
              case `live_returning`:
                await Meta.changeMeta({ state: `live_on` })
                if (!change.queueMusic) { await sails.helpers.rest.cmd(`EnableAssisted`, 1) }
                break
              case `remote_returning`:
                await Meta.changeMeta({ state: `remote_on` })
                break
              case `sports_returning`:
                await Meta.changeMeta({ state: `sports_on` })
                if (!change.queueMusic) { await sails.helpers.rest.cmd(`EnableAssisted`, 1) }
                break
              case `sportsremote_returning`:
                await Meta.changeMeta({ state: `sportsremote_on` })
                break
            }
          }

          // If we are in break, queue something if the queue is under 2 items to keep the break going, and if we are not changing states
          if (Meta[`A`].changingState === null && queue.length < 2) {
            switch (Meta[`A`].state) {
              case `automation_break`:
                await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.automation.during)
                break
              case `live_break`:
                await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.live.during)
                break
              case `remote_break`:
                await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.during)
                break
              case `sports_break`:
              case `sportsremote_break`:
                await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.during)
                break
              case `sports_halftime`:
              case `sportsremote_halftime`:
                await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.duringHalftime)
                break
            }
          }

          // Counter to ensure automation break is not running for too long
          if (Meta[`A`].state === `automation_break`) { await sails.helpers.error.count(`automationBreak`) }

          // Check if a DJ neglected the required top of the hour break (passes :05 after)
          var d = new Date()
          var n = d.getMinutes()
          if (n > 5 && moment().startOf(`hour`).subtract(5, `minutes`).isAfter(moment(Meta[`A`].lastID)) && !Meta[`A`].state.startsWith(`automation_`) && Meta[`A`].state !== `live_prerecord`) {
            await Meta.changeMeta({ lastID: moment().toISOString(true) })
            await Logs.create({ attendanceID: Meta[`A`].attendanceID, logtype: `id`, loglevel: `urgent`, logsubtype: Meta[`A`].show, event: `<strong>Required top of the hour break was not taken!</strong><br />Show: ${Meta[`A`].show}` }).fetch()
              .tolerate((err) => {
                sails.log.error(err)
              })

            if (Meta[`A`].attendanceID !== null) {
              var attendanceRecord = await Attendance.findOne({ ID: Meta[`A`].attendanceID })
              if (attendanceRecord) {
                await Attendance.update({ ID: Meta[`A`].attendanceID }, { missedIDs: attendanceRecord.missedIDs + 1 }).fetch()
                  .tolerate((err) => {
                    sails.log.error(err)
                  })
              }
            }
          }

          // Do automation system error checking and handling
          if (queue.length > 0 && queue[0].Duration === Status.errorCheck.prevDuration && queue[0].Elapsed === Status.errorCheck.prevElapsed && (Meta[`A`].state.startsWith(`automation_`) || Meta[`A`].state.endsWith(`_break`) || Meta[`A`].state.endsWith(`_disconnected`) || Meta[`A`].state.endsWith(`_returning`) || Meta[`A`].state === `live_prerecord`)) {
            await sails.helpers.error.count(`frozen`)
          } else {
            Status.errorCheck.prevDuration = queue[0].Duration
            Status.errorCheck.prevElapsed = queue[0].Elapsed
            await sails.helpers.error.reset(`frozen`)
          }

          // Manage breaks intelligently using track queue length. This gets complicated, so comments explain the process.

          // Do not run this process if we cannot get a duration for the currently playing track, or if we suspect the current queue duration to be inaccurate
          if (Status.errorCheck.trueZero <= 0 && typeof queue[0] !== `undefined` && typeof queue[0].Duration !== `undefined` && typeof queue[0].Elapsed !== `undefined`) {
            // Iterate through each configured break to see if it's time to do it
            for (var key in sails.config.custom.breaks) {
              if (sails.config.custom.breaks.hasOwnProperty(key)) {
                // Helps determine if we are due for the break
                var breakTime = moment().minutes(key)
                var breakTime2 = moment().minutes(key).add(1, `hours`)

                // Determine when the current track in RadioDJ will finish.
                var endTime = moment().add((queue[0].Duration - queue[0].Elapsed), `seconds`)

                var doBreak = false
                var distancebefore
                var endtime2
                var distanceafter

                // If the current time is before scheduled break, but the currently playing track will finish after scheduled break, consider queuing the break.
                if ((moment().isBefore(moment(breakTime)) && moment(endTime).isAfter(moment(breakTime))) || (moment().isBefore(moment(breakTime2)) && moment(endTime).isAfter(moment(breakTime2)))) { doBreak = true }

                // If the currently playing track will not end after the scheduled break,
                // but the following track will end further after the scheduled break than the current track would,
                // queue the break early.
                if (typeof queue[1] !== `undefined` && typeof queue[1].Duration !== `undefined`) {
                  if (moment().isBefore(moment(breakTime))) {
                    distancebefore = moment(breakTime).diff(moment(endTime))
                    endtime2 = moment(endTime).add(queue[1].Duration, `seconds`)
                    distanceafter = endtime2.diff(breakTime)
                    if (moment(endtime2).isAfter(moment(breakTime)) && distanceafter > distancebefore) { doBreak = true }
                  } else {
                    distancebefore = moment(breakTime2).diff(moment(endTime))
                    endtime2 = moment(endTime).add(queue[1].Duration, `seconds`)
                    distanceafter = endtime2.diff(breakTime2)
                    if (moment(endtime2).isAfter(moment(breakTime2)) && distanceafter > distancebefore) { doBreak = true }
                  }
                }

                // Do not queue if we are not in automation, playlist, genre, or prerecord states
                if (Meta[`A`].state !== `automation_on` && Meta[`A`].state !== `automation_playlist` && Meta[`A`].state !== `automation_genre` && Meta[`A`].state !== `live_prerecord`) { doBreak = false }

                // Do not queue if we queued a break less than the configured failsafe time, and this isn't the 0 break
                if (key !== 0 && Status.errorCheck.prevBreak !== null && moment(Status.errorCheck.prevBreak).isAfter(moment().subtract(sails.config.custom.breakCheck, `minutes`))) { doBreak = false }

                // The 0 break has its own hard coded failsafe of 10 minutes, separate from other breaks, since it's a FCC required break
                if (key === 0 && Status.errorCheck.prevID !== null && moment(Status.errorCheck.prevID).isAfter(moment().subtract(10, `minutes`))) { doBreak = false }

                // Do not queue anything yet if the current track has breakCheck minutes or more left (resolves a discrepancy with the previous logic)
                if (key !== 0 && (queue[0].Duration - queue[0].Elapsed) >= (60 * sails.config.custom.breakCheck)) { doBreak = false }

                if (key === 0 && (queue[0].Duration - queue[0].Elapsed) >= (60 * 10)) { doBreak = false }

                // Do the break if we are supposed to
                if (doBreak) {
                  // Reset the break clock
                  Status.errorCheck.prevBreak = moment()

                  // Reset the liner clock as well so liners do not play too close to breaks
                  Status.errorCheck.prevLiner = moment()

                  // enforce station ID for top of the hour breaks
                  if (key === 0) {
                    Status.errorCheck.prevID = moment()
                    await sails.helpers.error.count(`stationID`)
                    await Meta.changeMeta({ lastID: moment().toISOString(true) })
                  }

                  // Add XP for prerecords
                  if (Meta[`A`].state === `live_prerecorded`) {
                    await Xp.create({ dj: Meta[`A`].dj, type: `xp`, subtype: `id`, amount: sails.config.custom.XP.prerecordBreak, description: `A break was able to be queued during the prerecord.` })
                      .tolerate((err) => {
                        // Do not throw for error, but log it
                        sails.log.error(err)
                      })
                  }

                  // Remove liners in the queue. Do not do the playlist re-queue method as there may be a big prerecord or playlist in the queue.
                  await sails.helpers.songs.remove(false, sails.config.custom.subcats.liners, true, true)

                  // Execute the break array
                  await sails.helpers.break.executeArray(sails.config.custom.breaks[key])

                  // If not doing a break, check to see if it's time to do a liner
                } else {
                  // Don't do a liner if it was too soon.
                  if (Status.errorCheck.prevLiner === null || moment().diff(moment(Status.errorCheck.prevLiner), `minutes`) > sails.config.custom.linerTime) {
                    // Only do liners when in automation
                    if (Meta[`A`].state.startsWith(`automation_`)) {
                      // If there is at least 1 track in the queue, and both the current track and the next track are not noMeta tracks, queue a liner
                      if (queue.length > 1 && parseInt(queue[0].ID) !== 0 && sails.config.custom.subcats.noMeta.indexOf(parseInt(queue[0].IDSubcat)) === -1 && sails.config.custom.subcats.noMeta.indexOf(parseInt(queue[1].IDSubcat)) === -1) {
                        Status.errorCheck.prevLiner = moment()
                        await sails.helpers.songs.queue(sails.config.custom.subcats.liners, `Top`, 1)
                        await sails.helpers.break.addUnderwritings(true)
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          // We have no queue... which should never happen because RadioDJ always returns a dummy track in position 0. This is an error.
          if (Meta[`A`].state.startsWith(`automation_`) || Meta[`A`].state.endsWith(`_break`) || Meta[`A`].state.endsWith(`_disconnected`) || Meta[`A`].state.endsWith(`_returning`) || Meta[`A`].state === `live_prerecord`) {
            await sails.helpers.error.count(`frozen`)
          }
        }

        // Process queueFinish
        if (change.playing) {
          change.queueFinish = moment().add(queueLength, `seconds`).toISOString(true)
        } else {
          change.queueFinish = null
        }

        // Change applicable meta
        await Meta.changeMeta(change)

        // All done
        return resolve()
      } catch (e) {
        // Uncomment once we confirmed this CRON is fully operational
        //  await sails.helpers.error.count('frozen');
        sails.log.error(e)
        return resolve(e)
      }
    })
  })

  // Every 5 minutes on second 02, update Calendar.
  sails.log.verbose(`BOOTSTRAP: scheduling updateCalendar CRON.`)
  cron.schedule(`2 */5 * * * *`, () => {
    sails.log.debug(`CRON updateCalendar triggered.`)
    try {
      Calendar.preLoadEvents()
    } catch (e) {
      sails.log.error(e)
    }
  })

  // Four times per minute, at 03, 18, 33, and 48 past the minute, check the online status of the radio streams, and log listener count
  sails.log.verbose(`BOOTSTRAP: scheduling checkRadioStreams CRON.`)
  cron.schedule(`3,18,33,48 * * * * *`, () => {
    sails.log.debug(`CRON checkRadioStreams triggered.`)
    try {
      // SHOUTCAST 2.6
      needle(`get`, sails.config.custom.stream + `/statistics?json=1`, {}, { headers: { 'Content-Type': `application/json` } })
        .then(async (resp) => {
          try {
            var streams = resp.body.streams

            // Check public stream
            if (typeof streams !== `undefined` && typeof streams[0] !== `undefined` && typeof streams[0].streamstatus !== `undefined` && streams[0].streamstatus !== 0) {
              // Mark stream as good
              Status.changeStatus([{ name: `stream-public`, label: `Radio Stream`, data: `Stream is online.`, status: 5 }])

              // Log listeners if there are any changes
              if (Meta[`A`].dj !== Listeners.memory.dj || streams[0].uniquelisteners !== Listeners.memory.listeners) {
                await Listeners.create({ dj: Meta[`A`].dj, listeners: streams[0].uniquelisteners })
                  .tolerate(() => {
                  })
              }
              Listeners.memory = { dj: Meta[`A`].dj, listeners: streams[0].uniquelisteners }
            } else {
              Status.changeStatus([{ name: `stream-public`, label: `Radio Stream`, data: `Stream is offline. It should be online!`, status: 2 }])
            }
          } catch (e) {
            sails.log.error(e)
            Status.changeStatus([{ name: `stream-public`, label: `Radio Stream`, data: `Error parsing data from internet stream server.`, status: 2 }])
          }
        })
        .catch(err => {
          Status.changeStatus([{ name: `stream-public`, label: `Radio Stream`, data: `Internet stream server is offline.`, status: 2 }])
          sails.log.error(err)
        })
      /* ICECAST 2.3
             // Get the JSON status from Icecast
             needle('get', sails.config.custom.stream + `/status-json.xsl`, {}, {headers: {'Content-Type': 'application/json'}})
             .then(async function (resp) {
             var publicStream = false;
             var remoteStream = false;
             if (typeof resp.body.icestats.source !== 'undefined')
             {
             // Parse source data
             var sources = [];
             if (!_.isArray(resp.body.icestats.source))
             {
             sources.push(resp.body.icestats.source);
             } else {
             sources = resp.body.icestats.source;
             }
             // Go through each source
             sails.log.debug(`Calling asyncForEach in cron checkRadioStreams for each source returned`);
             await sails.helpers.asyncForEach(sources, function (source, index) {
             return new Promise(async (resolve2, reject2) => {
             try {
             if (typeof source.listenurl !== 'undefined')
             {
             // Source is mountpoint /public?
             if (source.listenurl.endsWith("/public"))
             {
             // Mark stream as good
             Status.changeStatus([{name: 'stream-public', label: 'Radio Stream', data: 'Operational.', status: 5}]);
             publicStream = true;

             // Log listeners
             if (typeof source.listeners !== 'undefined')
             {
             var dj = '';

             // Do not tie DJ with listener count unless DJ is actually on the air
             if (!Meta['A'].state.startsWith("automation_"))
             {
             dj = Meta['A'].dj;
             if (dj.includes(" - "))
             {
             dj = dj.split(" - ")[0];
             }
             }
             if (dj !== Listeners.memory.dj || source.listeners !== Listeners.memory.listeners)
             {
             await Listeners.create({dj: dj, listeners: source.listeners})
             .tolerate((err) => {
             });
             }
             Listeners.memory = {dj: dj, listeners: source.listeners};
             }
             }

             // Source is mountpoint /remote?
             if (source.listenurl.endsWith("/remote"))
             {
             Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Operational.', status: 5}]);
             remoteStream = true;
             }
             }
             return resolve2(false);
             } catch (e) {
             sails.log.error(e);
             return resolve2(false);
             }
             });
             });
             }
             if (!publicStream)
             Status.changeStatus([{name: 'stream-public', label: 'Radio Stream', data: 'Offline.', status: 2}]);
             if (!remoteStream)
             {
             if (Meta['A'].state.includes("remote_"))
             {
             // TODO: send system into disconnected mode (if not already) if remote stream is disconnected
             Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Offline.', status: 2}]);
             } else { // If we are not doing a remote broadcast, remote stream being offline is a non-issue
             Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Offline (OK, as we do not need it right now).', status: 4}]);
             }
             }
             })
             .catch(function (err) {
             Status.changeStatus([{name: 'stream-public', label: 'Radio Stream', data: 'Internet stream server connection error.', status: 2}]);
             if (Meta['A'].state.includes("remote"))
             {
             Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Internet stream server connection error.', status: 2}]);
             } else { // If we are not doing a remote broadcast, remote stream being offline is a non-issue
             Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Internet stream server connection error (OK, as we do not need remote stream right now)', status: 4}]);
             }
             sails.log.error(err);
             });
             */
    } catch (e) {
      Status.changeStatus([{ name: `stream-public`, label: `Radio Stream`, data: `Error checking internet stream server.`, status: 2 }])
      sails.log.error(e)
    }
  })

  // Twice per minute at 04 and 34 seconds, check all RadioDJs for connectivity.
  sails.log.verbose(`BOOTSTRAP: scheduling checkRadioDJs CRON.`)
  cron.schedule(`4,34 * * * * *`, () => {
    new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON checkRadioDJs triggered.`)
      try {
        sails.log.debug(`Calling asyncForEach in cron checkRadioDJs for every radiodj in config to hit via REST`)
        await sails.helpers.asyncForEach(sails.config.custom.radiodjs, (radiodj) => {
          return new Promise(async (resolve2) => {
            var status = await Status.findOne({ name: `radiodj-${radiodj.name}` })
            try {
              needle(`get`, `${radiodj.rest}/p?auth=${sails.config.custom.rest.auth}`, {}, { headers: { 'Content-Type': `application/json` } })
                .then(async (resp) => {
                  if (typeof resp.body !== `undefined` && typeof resp.body.children !== `undefined`) {
                    Status.changeStatus([{ name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: `RadioDJ is online.`, status: 5 }])

                    // We were waiting for a good RadioDJ to switch to. Switch to it immediately.
                    if (Status.errorCheck.waitForGoodRadioDJ) {
                      Status.errorCheck.waitForGoodRadioDJ = false

                      // Get the current RadioDJ out of critical status if necessary
                      var maps = sails.config.custom.radiodjs
                        .filter((instance) => instance.rest === Meta[`A`].radiodj && instance.name !== radiodj.name)
                        .map(async (instance) => {
                          await Status.changeStatus([{ name: `radiodj-${instance.name}`, label: `RadioDJ ${instance.label}`, status: instance.level, data: `RadioDJ is not operational.` }])
                          return true
                        })
                      await Promise.all(maps)
                      var queue = Meta.automation
                      await Meta.changeMeta({ radiodj: radiodj.rest })
                      await sails.helpers.rest.cmd(`ClearPlaylist`, 1)
                      await sails.helpers.error.post(queue)
                    }

                    // If this RadioDJ is inactive, check to see if it is playing anything and send a stop command if so.
                    if (Meta[`A`].radiodj !== radiodj.rest) {
                      var automation = []
                      if (resp.body.name === `ArrayOfSongData`) {
                        resp.body.children.map(trackA => {
                          var theTrack = {}
                          trackA.children.map(track => { theTrack[track.name] = track.value })
                          automation.push(theTrack)
                        })
                      } else {
                        var theTrack = {}
                        resp.body.children.map(track => { theTrack[track.name] = track.value })
                        automation.push(theTrack)
                      }

                      // If this if condition passes, the RadioDJ is playing when it shouldn't be. Stop it!
                      if (typeof automation[0] !== `undefined` && parseInt(automation[0].ID) !== 0) {
                        try {
                          // LINT: Necessary needle parameters
                          // eslint-disable-next-line camelcase
                          needle(`get`, radiodj.rest + `/opt?auth=` + sails.config.custom.rest.auth + `&command=StopPlayer&arg=1`, {}, { open_timeout: 10000, response_timeout: 10000, read_timeout: 10000, headers: { 'Content-Type': `application/json` } })
                            .catch(() => {
                              // Ignore errors
                            })
                        } catch (unusedE3) {
                          // Ignore errors
                        }
                      }
                    }
                  } else {
                    if (status && status.status !== 1) { Status.changeStatus([{ name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: `RadioDJ REST did not return queue data.`, status: radiodj.level }]) }
                  }
                  return resolve2(false)
                })
                .catch(() => {
                  if (status && status.status !== 1) { Status.changeStatus([{ name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: `RadioDJ is offline.`, status: radiodj.level }]) }
                  return resolve2(false)
                })
            } catch (unusedE) {
              if (status && status.status !== 1) { Status.changeStatus([{ name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: `RadioDJ REST returned an error or is not responding.`, status: radiodj.level }]) }
              return resolve2(false)
            }
          })
        })
        return resolve()
      } catch (e) {
        sails.log.error(e)
        return reject(e)
      }
    })
  })

  // Twice per minute at 05 and 35 seconds, check for connectivity to the website.
  sails.log.verbose(`BOOTSTRAP: scheduling checkWebsite CRON.`)
  cron.schedule(`5,35 * * * * *`, () => {
    sails.log.debug(`CRON checkWebsite triggered.`)
    try {
      needle(`get`, sails.config.custom.website, {}, { headers: { 'Content-Type': `application/json` } })
        .then(async (resp) => {
          if (typeof resp.body !== `undefined`) {
            Status.changeStatus([{ name: `website`, label: `Website`, data: `Website is online.`, status: 5 }])
          } else {
            Status.changeStatus([{ name: `website`, label: `Website`, data: `Website did not return body data.`, status: 2 }])
          }
        })
        .catch(() => {
          Status.changeStatus([{ name: `website`, label: `Website`, data: `Website is offline.`, status: 2 }])
        })
    } catch (e) {
      Status.changeStatus([{ name: `website`, label: `Website`, data: `Error checking website.`, status: 2 }])
      sails.log.error(e)
    }
  })

  // Every minute on second 06, get NWS alerts for configured counties.
  sails.log.verbose(`BOOTSTRAP: scheduling EAS CRON.`)
  cron.schedule(`6 * * * * *`, () => {
    new Promise(async (resolve, reject) => {
      try {
        // Initial procedure
        await sails.helpers.eas.preParse()

        // Iterate through every configured county and get their weather alerts
        var complete = 0
        var bad = []
        sails.log.debug(`Calling asyncLoop in cron EAS for checking every EAS source`)

        var asyncLoop = async function (array, callback) {
          for (let index = 0; index < array.length; index++) {
            // LINT: This is a loop; we do not want to return the callback.
            // eslint-disable-next-line callback-return
            await callback(array[index], index, array)
          }
        }

        await asyncLoop(sails.config.custom.EAS.NWSX, async (county) => {
          try {
            var resp = await needle(`get`, `https://alerts.weather.gov/cap/wwaatmget.php?x=${county.code}&y=0&t=${moment().valueOf()}`, {}, { headers: { 'Content-Type': `application/json` } })
            await sails.helpers.eas.parseCaps(county.name, resp.body)
            complete++
          } catch (err) {
            bad.push(county.name)
            // Do not reject on error; just go to the next county
            sails.log.error(err)
          }
        })

        // If all counties succeeded, mark EAS-internal as operational
        if (complete >= sails.config.custom.EAS.NWSX.length) {
          Status.changeStatus([{ name: `EAS-internal`, label: `Internal EAS`, data: `All NWS CAPS are online.`, status: 5 }])
        } else {
          Status.changeStatus([{ name: `EAS-internal`, label: `Internal EAS`, data: `Could not fetch the following NWS CAPS counties: ${bad.join(`, `)}`, status: 3 }])
        }

        // Finish up
        await sails.helpers.eas.postParse()
        return resolve()
      } catch (e) {
        sails.log.error(e)
        return reject(e)
      }
    })
  })

  // Every minute at second 07, check to see if our databases are active and functional
  sails.log.verbose(`BOOTSTRAP: scheduling checkDB CRON.`)
  cron.schedule(`7 * * * * *`, () => {
    new Promise(async () => {
      // TODO: More accurate way to test database.
      sails.log.debug(`CRON checkDB called`)
      try {
        // Make sure all models have a record at ID 1, even if it's a dummy.
        // TODO: Find a way to auto-populate these arrays.
        var checksMemory = [Recipients, Status]
        // LINT: RadioDJ tables cannot be changed
        // eslint-disable-next-line camelcase
        var checksRadioDJ = [Category, Events, Genre, History, Playlists, Playlists_list, Requests, Settings, Subcategory]
        var checksNodebase = [Announcements, Calendar, Discipline, Eas, Subscribers, Planner, Underwritings, Attendance, Darksky, Listeners, Djs, Hosts, Logs, Messages, Meta, Nodeusers, Timesheet, Directors, Songsliked, Sports, Xp]
        // Memory checks
        var checkStatus = { data: ``, status: 5 }
        sails.log.debug(`CHECK: DB Memory`)
        sails.log.debug(`Calling asyncForEach in cron checkDB for memory tests`)
        await sails.helpers.asyncForEach(checksMemory, (check, index) => {
          return new Promise(async (resolve) => {
            try {
              var record = await check.find().limit(1)
                .tolerate(() => {
                  checkStatus.status = 1
                  checkStatus.data += `Model failure (query error): ${index}. `
                })
              if (typeof record[0] === `undefined` || typeof record[0].ID === `undefined`) {
                if (checkStatus.status > 3) { checkStatus.status = 3 }
                checkStatus.data += `Model failure (No records returned): ${index}. `
              }
              return resolve(false)
            } catch (unusedE) {
              checkStatus.status = 1
              checkStatus.data += `Model failure (internal error): ${index}. `
              return resolve(false)
            }
          })
        })
        if (checkStatus.status === 5) { checkStatus.data = `This datastore is fully operational.` }
        Status.changeStatus([{ name: `db-memory`, label: `DB Memory`, data: checkStatus.data, status: checkStatus.status }])

        // RadioDJ checks
        sails.log.debug(`CHECK: DB RadioDJ`)
        checkStatus = { data: ``, status: 5 }
        sails.log.debug(`Calling asyncForEach in cron checkDB for RadioDJ database checks`)
        await sails.helpers.asyncForEach(checksRadioDJ, (check, index) => {
          return new Promise(async (resolve) => {
            try {
              var record = await check.find().limit(1)
                .tolerate(() => {
                  checkStatus.status = 1
                  checkStatus.data += `Model failure (query error): ${index}. `
                })
              if (typeof record[0] === `undefined` || typeof record[0].ID === `undefined`) {
                if (checkStatus.status > 3) { checkStatus.status = 3 }
                checkStatus.data += `Model failure (No records returned): ${index}. `
              }
              return resolve(false)
            } catch (unusedE) {
              checkStatus.status = 1
              checkStatus.data += `Model failure (internal error): ${index}. `
              return resolve(false)
            }
          })
        })
        if (checkStatus.status === 5) { checkStatus.data = `This datastore is fully operational.` }
        Status.changeStatus([{ name: `db-radiodj`, label: `DB RadioDJ`, data: checkStatus.data, status: checkStatus.status }])

        // Nodebase checks
        sails.log.debug(`CHECK: DB Nodebase`)
        checkStatus = { data: ``, status: 5 }
        sails.log.debug(`Calling asyncForEach in cron checkDB for nodebase database checks`)
        await sails.helpers.asyncForEach(checksNodebase, (check, index) => {
          return new Promise(async (resolve) => {
            try {
              var record = await check.find().limit(1)
                .tolerate(() => {
                  checkStatus.status = 1
                  checkStatus.data += `Model failure (query error): ${index}. `
                })
              if ((typeof record[0] === `undefined` || typeof record[0].ID === `undefined`) && index > 6) {
                if (checkStatus.status > 3) { checkStatus.status = 3 }
                checkStatus.data += `Model failure (No records returned): ${index}. `
              }
              return resolve(false)
            } catch (unusedE) {
              checkStatus.status = 1
              checkStatus.data += `Model failure (internal error): ${index}. `
              return resolve(false)
            }
          })
        })
        if (checkStatus.status === 5) { checkStatus.data = `This datastore is fully operational.` }
        Status.changeStatus([{ name: `db-nodebase`, label: `DB Nodebase`, data: checkStatus.data, status: checkStatus.status }])

        return true
      } catch (e) {
        Status.changeStatus([{ name: `db-memory`, label: `DB Memory`, data: `The CRON checkDB failed.`, status: 1 }])
        Status.changeStatus([{ name: `db-radiodj`, label: `DB RadioDJ`, data: `The CRON checkDB failed.`, status: 1 }])
        Status.changeStatus([{ name: `db-nodebase`, label: `DB Nodebase`, data: `The CRON checkDB failed.`, status: 1 }])
        sails.log.error(e)
        return null
      }
    })
  })

  // Every 5 minutes at second 08, reload the subcategory IDs in configuration, in case changes were made in RadioDJ
  sails.log.verbose(`BOOTSTRAP: scheduling reloadSubcats CRON.`)
  cron.schedule(`8 */5 * * * *`, () => {
    new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON reloadSubcats called.`)
      try {
        // Load subcategories into config
        await sails.helpers.songs.reloadSubcategories()

        return resolve(true)
      } catch (e) {
        sails.log.error(e)
        return reject(e)
      }
    })
  })

  // Every minute at second 9, count the number of tracks disabled because they are invalid / corrupt / not accessible, and update Music Library status.
  sails.log.verbose(`BOOTSTRAP: scheduling disabledTracks CRON.`)
  cron.schedule(`9 * * * * *`, () => {
    new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON disabledTracks called.`)

      try {
        // Count the number of -1 enabled tracks

        var found = await Songs.count({ enabled: -1 })
          .tolerate(() => {
          })
        if (found && found >= sails.config.custom.status.musicLibrary.verify.critical) {
          Status.changeStatus([{ name: `music-library`, status: 1, label: `Music Library`, data: `Music library has ${found} bad tracks. This is critically high and should be fixed immediately! Run the verify tracks utility in RadioDJ.` }])
        } else if (found && found >= sails.config.custom.status.musicLibrary.verify.error) {
          Status.changeStatus([{ name: `music-library`, status: 2, label: `Music Library`, data: `Music library has ${found} bad tracks. This is quite high. Run the verify tracks utility in RadioDJ.` }])
        } else if (found && found >= sails.config.custom.status.musicLibrary.verify.warn) {
          Status.changeStatus([{ name: `music-library`, status: 3, label: `Music Library`, data: `Music library has ${found} bad tracks. Run the verify tracks utility in RadioDJ.` }])
        } else {
          Status.changeStatus([{ name: `music-library`, status: 5, label: `Music Library`, data: `Music library has ${found} bad tracks.` }])
        }

        return resolve()
      } catch (e) {
        sails.log.error(e)
        return reject(e)
      }
    })
  })

  // Every minute at second 10, prune out recipients that have been offline for 4 or more hours.
  sails.log.verbose(`BOOTSTRAP: scheduling recipientsCheck CRON.`)
  cron.schedule(`10 * * * * *`, () => {
    new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON recipientsCheck called.`)
      try {
        var records = await Recipients.find({ host: { '!=': [`website`] }, status: 0 })
        var destroyIt = []
        var searchto = moment().subtract(4, `hours`)
        records.forEach((record) => {
          if (moment(record.time).isBefore(moment(searchto))) { destroyIt.push(record.ID) }
        })
        if (destroyIt.length > 0) { await Recipients.destroy({ ID: destroyIt }).fetch() }

        return resolve()
      } catch (e) {
        sails.log.error(e)
        return reject(e)
      }
    })
  })

  // Every fifth minute at second 11, refresh Darksky weather information
  sails.log.verbose(`BOOTSTRAP: scheduling darksky CRON.`)
  cron.schedule(`11 */5 * * * *`, () => {
    new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON darksky called.`)
      try {
        darksky
          .latitude(sails.config.custom.darksky.position.latitude)
          .longitude(sails.config.custom.darksky.position.longitude)
          .exclude(`alerts`)
          .get()
          .then(async (resp) => {
            await Darksky.update({ ID: 1 }, { currently: resp.currently, minutely: resp.minutely, hourly: resp.hourly, daily: resp.daily }).fetch()
          })
          .catch(err => {
            sails.log.error(err)
            reject(err)
          })
        return resolve()
      } catch (e) {
        sails.log.error(e)
        return reject(e)
      }
    })
  })

  // every hour at second 12, check all noFade tracks and remove any fading.
  sails.log.verbose(`BOOTSTRAP: scheduling checkNoFadeAndNegativeDuration CRON.`)
  cron.schedule(`12 0 * * * *`, () => {
    new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON checkNoFadeAndNegativeDuration called.`)
      try {
        // Get all noFade tracks
        var records = await Songs.find({ id_subcat: sails.config.custom.subcats.noFade })

        if (records && records.length > 0) {
          records
            .map((record) => {
              var cueData = queryString.parse(record.cue_times)
              // If fade in and fade out are both 0 (treat when fade in or fade out is not specified as being 0), skip this track; nothing to do.
              if ((!cueData.fin || cueData.fin === 0) && (!cueData.fou || cueData.fou === 0)) { return null }

              // Get rid of any fading, and reset the xta cue point
              cueData.fin = 0
              cueData.fou = 0
              cueData.xta = cueData.end || record.duration

              cueData = `&${queryString.stringify(cueData)}`;

              // Update the track with the new cue points
              (async (record2, cueData2) => {
                // LINT: RadioDJ table
                // eslint-disable-next-line camelcase
                await Songs.update({ ID: record2.ID }, { cue_times: cueData2 })
              })(record, cueData)
            })
        }

        // Now, update tracks with a duration less than 0 and change their enabled status to -1; these are bad tracks that will crash RadioDJ.
        await Songs.update({ duration: { '<': 0 }, enabled: { '!=': -1 } }, { enabled: -1 })
        return resolve()
      } catch (e) {
        sails.log.error(e)
        return reject(e)
      }
    })
  })

  // Every minute at second 13, check server memory and CPU use.
  // ADVICE: It is advised that serverCheck is the last cron executed at the top of the minute. That way, the 1-minute CPU load will more likely detect issues.
  sails.log.verbose(`BOOTSTRAP: scheduling serverCheck CRON.`)
  cron.schedule(`13 * * * * *`, () => {
    new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON serverCheck called.`)
      try {
        var os = require(`os`)

        // Get CPU load and free memory
        var load = os.loadavg()
        var mem = os.freemem()

        if (load[0] >= sails.config.custom.status.server.load1.critical || load[1] >= sails.config.custom.status.server.load5.critical || load[2] >= sails.config.custom.status.server.load15.critical || mem <= sails.config.custom.status.server.memory.critical) {
          Status.changeStatus([{ name: `server`, label: `Server`, status: 1, data: `Server resource use is dangerously high!!! CPU: 1-min ${load[0]}, 5-min: ${load[1]}, 15-min: ${load[2]}. Free memory: ${mem}` }])
        } else if (load[0] >= sails.config.custom.status.server.load1.error || load[1] >= sails.config.custom.status.server.load5.error || load[2] >= sails.config.custom.status.server.load15.error || mem <= sails.config.custom.status.server.memory.error) {
          Status.changeStatus([{ name: `server`, label: `Server`, status: 2, data: `Server resource use is very high! CPU: 1-min ${load[0]}, 5-min: ${load[1]}, 15-min: ${load[2]}. Free memory: ${mem}` }])
        } else if (load[0] >= sails.config.custom.status.server.load1.warn || load[1] >= sails.config.custom.status.server.load5.warn || load[2] >= sails.config.custom.status.server.load15.warn || mem <= sails.config.custom.status.server.memory.warn) {
          Status.changeStatus([{ name: `server`, label: `Server`, status: 3, data: `Server resource use is mildly high. CPU: 1-min ${load[0]}, 5-min: ${load[1]}, 15-min: ${load[2]}. Free memory: ${mem}` }])
        } else {
          Status.changeStatus([{ name: `server`, label: `Server`, status: 5, data: `Server resource use is good. CPU: 1-min ${load[0]}, 5-min: ${load[1]}, 15-min: ${load[2]}. Free memory: ${mem}` }])
        }

        return resolve()
      } catch (e) {
        sails.log.error(e)
        return reject(e)
      }
    })
  })

  // Every day at 11:59:50pm, clock out any directors still clocked in, and re-sync station time to all clients
  sails.log.verbose(`BOOTSTRAP: scheduling clockOutDirectors CRON.`)
  cron.schedule(`50 59 23 * * *`, () => {
    new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON clockOutDirectors called`)
      try {
        await Meta.changeMeta({ time: moment().toISOString(true) })

        await Timesheet.update({ time_in: { '!=': null }, time_out: null }, { time_out: moment().toISOString(true), approved: false }).fetch()
          .tolerate(() => {
          })
        await Uabtimesheet.update({ time_in: { '!=': null }, time_out: null }, { time_out: moment().toISOString(true), approved: false }).fetch()
          .tolerate(() => {
          })
        // Force reload all directors based on timesheets
        await Directors.updateDirectors()
        await Uabdirectors.updateDirectors()

        return resolve()
      } catch (e) {
        sails.log.error(e)
        return reject(e)
      }
    })
  })

  // Every day at 11:59:51pm, check for minimum priorities on tracks and fix them as necessary
  sails.log.verbose(`BOOTSTRAP: scheduling priorityCheck CRON.`)
  cron.schedule(`51 59 23 * * *`, () => {
    new Promise(async (resolve, reject) => {
      sails.log.debug(`CRON priorityCheck called`)
      try {
        // First, get the value of default priority
        var defaultPriority = await Settings.find({ source: `settings_general`, setting: `DefaultTrackPriority` }).limit(1)

        if (typeof defaultPriority[0] === `undefined` || defaultPriority === null || defaultPriority[0] === null) { throw new Error(`Could not find DefaultTrackPriority setting in the RadioDJ database`) }

        var songs = await Songs.find()

        sails.log.debug(`Calling asyncForEach in cron priorityCheck for every RadioDJ song`)
        songs
          .map((song) => {
            try {
              var minPriority = song.rating === 0 ? 0 : (defaultPriority[0] * (song.rating / 9))
              minPriority = Math.round(minPriority * 10) / 10
              if (song.weight < minPriority) {
                (async (song2, minPriority2) => {
                  await Songs.update({ ID: song2.ID }, { weight: minPriority2 })
                })(song, minPriority)
              }
            } catch (e) {
              sails.log.error(e)
            }
          })

        return resolve()
      } catch (e) {
        sails.log.error(e)
        return reject(e)
      }
    })
  })

  sails.log.verbose(`BOOTSTRAP: calculate weekly analytics.`)
  await sails.helpers.attendance.calculateStats()

  sails.log.verbose(`Set a 30 second timer for display-refresh.`)
  setTimeout(() => {
    sails.sockets.broadcast(`display-refresh`, `display-refresh`, true)
  }, 30000)

  sails.log.verbose(`BOOTSTRAP: Done.`)

  return done()
}
