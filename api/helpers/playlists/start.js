module.exports = {

  friendlyName: 'playlists.start',

  description: 'Begin a playlist in the active RadioDJ.',

  inputs: {
    name: {
      type: 'string',
      required: true,
      description: 'The name of the playlist to begin, as saved in RadioDJ.'
    },
    type: {
      type: 'number',
      defaultsTo: 0,
      min: 0,
      max: 1,
      description: '0 = standard playlist, 1 = prerecord'
    },
    topic: {
      type: 'string',
      defaultsTo: '',
      description: 'Topic to set on the metadata when this playlist plays (prerecord).'
    },
    ignoreChangingState: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Set to true if we should ignore the sails.models.meta.changingState conflict check.'
    },
    forced: {
      type: 'boolean',
      description: 'Set to true if we want the playlist or prerecord to start regardless of what state we are currently in.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper playlists.start called.')
    try {
      // Do not start the playlist if one is in the process of being queued, we're not in a proper automation state, we're in the middle of changing states and ignoreChangingState is false.
      if (!sails.models.playlists.queuing && (((sails.models.meta['A'].changingState === null || inputs.ignoreChangingState) && ((sails.models.meta['A'].state === 'automation_on' || sails.models.meta['A'].state === 'automation_playlist' || sails.models.meta['A'].state === 'automation_genre' || inputs.forced))))) {
        sails.log.verbose(`Processing helper.`)
        sails.models.playlists.queuing = true // Mark that the playlist is being queued, to avoid app conflicts.

        // Lock state changes when necessary until we are done
        if (!inputs.ignoreChangingState) { await sails.models.meta.changeMeta({ changingState: `Switching to playlist` }) }

        // Find the playlist
        var theplaylist = await sails.models.playlists.findOne({ name: inputs.name })
        sails.log.silly(`Playlist: ${theplaylist}`)

        // Error if we cannot find the playlist
        if (!theplaylist) {
          if (!inputs.ignoreChangingState) { await sails.models.meta.changeMeta({ changingState: null }) }
          sails.models.playlists.queuing = false
          return exits.error(new Error('Playlist not found!'))
        }

        // This private function will load the playlist from the variable theplaylist, gather playlist tracks in memory, wait until deemed queued, then resolve.
        var loadPlaylist = function () {
          // LINT: async is required because await is necessary for Sails.js
          // eslint-disable-next-line no-async-promise-executor
          return new Promise(async (resolve, reject) => {
            try {
              await sails.helpers.rest.cmd('LoadPlaylist', theplaylist.ID) // Queue the playlist

              // Load the playlist tracks into memory so CRON can check when the playlist has finished.
              // LINT: Playlists_list must NOT be camel case; this is how it is in the RadioDJ database.
              // eslint-disable-next-line camelcase
              var playlistTracks = await sails.models.playlists_list.find({ pID: theplaylist.ID }).sort('ord ASC')
              sails.log.verbose(`Playlists_list records retrieved: ${playlistTracks.length}`)

              // Bail if there are no tracks in this playlist
              if (!playlistTracks) {
                if (!inputs.ignoreChangingState) { await sails.models.meta.changeMeta({ changingState: null }) }
                sails.models.playlists.queuing = false
                return reject(new Error(`No playlist tracks were returned.`))
              }

              // Map all tracks in the playlist into memory.
              sails.models.playlists.active.tracks = []
              playlistTracks.map(playlistTrack => sails.models.playlists.active.tracks.push(playlistTrack.sID))

              var slot = 10
              var prevLength = 0
              sails.log.verbose(`Waiting for playlist queue...`)
              var bail = 60
              var theFunction = function () {
                try {
                  // Bail after waiting for a max of 60 seconds.
                  bail -= 1
                  if (bail < 1) {
                    sails.models.playlists.queuing = false
                    if (!inputs.ignoreChangingState) { sails.models.meta.changeMeta({ changingState: null }) }
                    sails.log.verbose(`Failed to queue playlist after 60 seconds.`)
                    return reject(new Error('The playlist was not considered queued after 60 seconds.'))
                  }

                  var tracks = sails.models.meta.automation

                  // If the number of tracks detected in queue is less than or equal to the previous check, count down on the slot counter.
                  if (tracks.length <= prevLength) {
                    slot -= 1
                    // Consider playlist as finished queuing if counter reaches zero.
                    if (slot <= 0) {
                      sails.models.playlists.queuing = false
                      if (!inputs.ignoreChangingState) { sails.models.meta.changeMeta({ changingState: null }) }
                      sails.log.verbose(`Considered playlist as queued. Proceeding.`)
                      return resolve()
                    } else {
                      setTimeout(theFunction, 1000)
                    }
                    // Otherwise, reset the slot counter to 10 as we assume playlist is still queuing.
                  } else {
                    slot = 10
                    setTimeout(theFunction, 1000)
                  }
                  prevLength = tracks.length
                } catch (unusedE) {
                  setTimeout(theFunction, 1000)
                }
              }
              theFunction()
            } catch (e) {
              return reject(e)
            }
          })
        }

        // Regular playlist
        if (inputs.type === 0) {
          await sails.helpers.rest.cmd('EnableAutoDJ', 0)
          await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearGeneral, true) // Leave requests in the queue for standard playlists.
          await sails.helpers.rest.cmd('EnableAssisted', 0)
          var attendance = await sails.models.attendance.createRecord(`Playlist: ${theplaylist.name}`)
          await sails.models.meta.changeMeta({ state: 'automation_playlist', playlist: theplaylist.name, playlistPosition: -1, playlistPlayed: moment().toISOString(true) })
          await sails.models.logs.create({ attendanceID: sails.models.meta['A'].attendanceID, logtype: 'primary', loglevel: 'success', logsubtype: 'playlist - ' + theplaylist.name, event: '<strong>Playlist started.</strong><br />Playlist: ' + inputs.name }).fetch()
            .tolerate((err) => {
              sails.log.error(err)
            })
          await loadPlaylist()
          await sails.helpers.rest.cmd('EnableAutoDJ', 1)
          await sails.helpers.onesignal.sendEvent(`Playlist: `, theplaylist.name, `Playlist`, attendance.unique)
          // Prerecords
        } else if (inputs.type === 1) {
          if (inputs.forced) {
            await sails.models.logs.create({ attendanceID: sails.models.meta['A'].attendanceID, logtype: 'sign-off', loglevel: 'primary', logsubtype: sails.models.meta['A'].playlist, event: `<strong>Prerecord forcefully terminated as it was interfering with another scheduled prerecord.</strong>` }).fetch()
              .tolerate((err) => {
                sails.log.error(err)
              })
          }
          await sails.helpers.rest.cmd('EnableAutoDJ', 0)
          await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, false)
          await sails.helpers.rest.cmd('EnableAssisted', 0)
          await sails.models.meta.changeMeta({ state: 'automation_prerecord', playlist: theplaylist.name, playlistPosition: -1, playlistPlayed: moment().toISOString(true), show: theplaylist.name, topic: await sails.helpers.truncateText(inputs.topic, 256) })
          await loadPlaylist()

          // After loading playlist, determine if we should immediately skip the currently playing track to get the prerecord on the air sooner.
          var timeToFirstTrack = 0
          var queue = await sails.helpers.rest.getQueue()
          var firstTrack = false
          queue.map((track) => {
            if (sails.models.playlists.active.tracks.indexOf(parseInt(track.ID)) === -1 && !firstTrack) {
              timeToFirstTrack += parseInt(track.Duration) - parseInt(track.Elapsed)
            } else {
              firstTrack = true
            }
          })
          if (timeToFirstTrack >= sails.config.custom.queueCorrection.prerecord) {
            if ((sails.config.custom.subcats.noClearShow && sails.config.custom.subcats.noClearShow.indexOf(sails.models.meta['A'].trackIDSubcat) === -1)) { await sails.helpers.rest.cmd('PlayPlaylistTrack', 0) } // Skip currently playing track if it is not a noClearShow track
          }

          await sails.helpers.rest.cmd('EnableAutoDJ', 1)
        }
        if (!inputs.ignoreChangingState) { await sails.models.meta.changeMeta({ changingState: null }) }
        return exits.success()
      } else {
        sails.log.verbose('Helper SKIPPED.')
        return exits.success()
      }
    } catch (e) {
      if (!inputs.ignoreChangingState) { await sails.models.meta.changeMeta({ changingState: null }) }
      sails.models.playlists.queuing = false
      return exits.error(e)
    }
  }

}
