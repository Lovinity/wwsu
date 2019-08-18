/**
 * sails.models.meta.js
 *
 * @description :: sails.models.meta manages the metadata of what is playing on WWSU Radio.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  // Some of the meta should persist, while other meta will not. But we want easy hack-editing (say, to force into a different state upon reboot). So use SQL.
  datastore: 'nodebase',
  attributes: {

    ID: {
      type: 'number',
      autoIncrement: true
    },

    state: {
      type: 'string'
    },

    dj: {
      type: 'number',
      allowNull: true
    },

    show: {
      type: 'string',
      allowNull: true
    },

    showStamp: {
      type: 'ref',
      columnType: 'datetime'
    },

    attendanceID: {
      type: 'number',
      allowNull: true
    },

    trackArtist: {
      type: 'string',
      allowNull: true
    },

    trackTitle: {
      type: 'string',
      allowNull: true
    },

    trackAlbum: {
      type: 'string',
      allowNull: true
    },

    trackLabel: {
      type: 'string',
      allowNull: true
    },

    trackStamp: {
      type: 'string',
      allowNull: true
    },

    topic: {
      type: 'string',
      allowNull: true
    },

    radiodj: {
      type: 'string'
    },

    webchat: {
      type: 'boolean'
    },

    playlist: {
      type: 'string',
      allowNull: true
    },

    playlistPosition: {
      type: 'number',
      defaultsTo: -1
    },

    playlistPlayed: {
      type: 'ref',
      columnType: 'datetime'
    }

  },

  // API NOTE: Do not modify any of these directly; use the changeMeta function instead. That way, changes are pushed through web sockets.
  A: {
    state: '', // State of the WWSU system
    dj: null, // The ID of the DJ currently on the air, or null if not applicable.
    show: '', // If someone is on the air, host name - show name, or name of sports for sports broadcasts
    showStamp: null, // When a show starts, this is the ISO timestamp which the show began
    attendanceID: null, // The ID of the Attendance record the system is currently running under
    track: '', // Currently playing track either in automation or manually logged
    trackID: 0, // The ID of the track currently playing
    trackIDSubcat: 0, // The ID of the subcategory the currently playing track falls in
    trackArtist: null, // The artist of the currently playing track
    trackTitle: null, // The title of the currently playing track
    trackAlbum: null, // The album name of the currently playing track
    trackLabel: null, // The label name of the currently playing track
    trackStamp: null, // ISO timestamp of when manual track meta was added
    history: [], // An array of objects {ID: trackID, track: 'Artist - Title', likable: true if it can be liked} of the last 3 tracks that played
    requested: false, // Whether or not this track was requested
    requestedBy: '', // The user who requested this track, if requested
    requestedMessage: '', // The provided message for this track request, if requested
    genre: '', // Name of the genre or rotation currently being played, if any
    topic: '', // If the DJ specified a show topic, this is the topic.
    stream: '', // sails.models.meta for the internet radio stream
    radiodj: '', // REST IP of the RadioDJ instance currently in control
    line1: 'We are unable to provide now playing info at this time.', // First line of meta for display signs
    line2: '', // Second line of meta for display signs
    time: moment().toISOString(true), // ISO string of the current WWSU time. NOTE: time is only pushed in websockets every night at 11:50pm for re-sync. Clients should keep their own time ticker in sync with this value.
    listeners: 0, // Number of current online listeners
    listenerpeak: 0, // Number of peak online listeners
    queueFinish: null, // An ISO timestamp of when the queue is expected to finish. NOTE: To conserve data, this is only pushed through websockets when the expected finish time changes by more than 1 second. Also, this will be null when not playing anything.
    trackFinish: null, // An ISO timestamp of when the current track is expected to finish. NOTE: To conserve data, this is only pushed through websockets when the expected finish time changes by more than 1 second. Also, this will be null when not playing anything.
    queueMusic: false, // If returning from break, or going live, and there are music tracks in the queue not counted towards queueFinish, this will be true
    playing: false, // Whether or not something is currently playing in the active RadioDJ
    changingState: null, // If not null, all clients should lock out of any state-changing (state/*) API hits until this is null again. Will be state changing string otherwise.
    lastID: null, // An ISO timestamp of when the last top of hour ID break was taken.
    webchat: true, // Set to false to restrict the ability to send chat messages through the website
    playlist: null, // Name of the playlist we are currently airing
    playlistPosition: -1, // Current position within the playlist
    playlistPlayed: null // Use moment.toISOString() when changing in changeMeta! If you directly store a moment instance here, database updating will fail
  },
  automation: [], // Tracks in automation, populated by sails.helpers.rest.getQueue().
  history: [], // track history array
  changingState: false, // Used to block out state changes when changing state

  /**
     * Change a meta attribute
     * @constructor
     * @param {object} obj - Object of meta to change.
     */

  changeMeta: function (obj) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        sails.log.debug(`sails.models.meta.changeMeta called.`)
        var push = {}
        var db = {}
        var push2 = {}
        var manual
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Exit if the key provided does not exist in sails.models.meta.A, or if the value in obj did not change from the current value
            if (typeof sails.models.meta['A'][key] === 'undefined' || sails.models.meta['A'][key] === obj[key]) { continue }

            // Do stuff if we are changing states, mainly with regards to genres, playlists, and prerecords.
            if (key === 'state') {
              // Changing out of a prerecord? Award XP.
              if (sails.models.meta['A'][key].startsWith('prerecord_') && !obj[key].startsWith('prerecord_')) { await sails.helpers.xp.addPrerecord() }

              // Enable webchat automatically when going into automation state
              if (obj[key] === 'automation_on' || obj[key] === 'automation_genre' || obj[key] === 'automation_playlist' || obj[key] === 'automation_prerecord') { push2.webchat = true }
            }

            // show key
            if (key === 'show') {
              // If show key includes " - ", this means the value before the - is a DJ. Get the DJ ID and update meta with it. Otherwise, set it to null.
              if (obj[key] !== null && obj[key].includes(' - ')) {
                var tmp = obj[key].split(' - ')[0]
                var dj = await sails.models.djs.findOrCreate({ name: tmp }, { name: tmp, lastSeen: moment().toISOString(true) })

                // Update lastSeen record for the DJ
                if (dj && dj !== null) { await sails.models.djs.update({ ID: dj.ID }, { lastSeen: moment().toISOString(true) }).fetch() }

                sails.models.meta['A'].dj = dj.ID
              } else {
                sails.models.meta['A'].dj = null
              }
              push.dj = sails.models.meta['A'].dj
            }

            // Do stuff if changing queueFinish and trackFinish
            if (key === 'queueFinish' || key === 'trackFinish') {
              // Set to null if nothing is playing
              if ((typeof obj.playing !== 'undefined' && !obj.playing) || !sails.models.meta['A'].playing) { obj[key] = null }

              // Do not update queueFinish nor trackFinish if null has not changed
              if (obj[key] === null && sails.models.meta['A'][key] === null) { continue }

              // Do not update queueFinish nor trackFinish if time difference is less than 1 second of what we have in memory.
              if (obj[key] !== null && (moment(sails.models.meta['A'][key]).diff(obj[key]) < 1000 && moment(sails.models.meta['A'][key]).diff(obj[key]) > -1000)) { continue }

              // If we are updating trackFinish or queueFinish, also include current time in update so clients are properly synced.
              obj.time = moment().toISOString(true)
              sails.models.meta['A'].time = obj.time
              push.time = obj.time
            }

            // Update meta in memory
            sails.models.meta['A'][key] = obj[key]
            push[key] = obj[key]
          }
        }

        // Changes in certain meta should warrant a re-processing of nowplaying metadata information
        if (typeof push.dj !== 'undefined' || typeof push.state !== 'undefined' || typeof push.playlist !== 'undefined' || typeof push.genre !== 'undefined' || typeof push.trackArtist !== 'undefined' || typeof push.trackTitle !== 'undefined' || typeof push.trackID !== 'undefined') {
          // New track playing in automation?
          if (sails.models.meta['A'].trackID !== 0) {
            // Always reset trackstamp when something plays in automation
            push2.trackStamp = null

            // If the currently playing track was a request, mark as played, update meta, and send a push notification
            if (typeof push.trackID !== 'undefined') {
              if (_.includes(sails.models.requests.pending, sails.models.meta['A'].trackID)) {
                var requested = await sails.models.requests.update({ songID: sails.models.meta['A'].trackID, played: 0 }, { played: 1 }).fetch()
                  .tolerate(() => {
                  })
                delete sails.models.requests.pending[sails.models.requests.pending.indexOf(sails.models.meta['A'].trackID)]
                if (requested && typeof requested[0] !== 'undefined') {
                  push2.requested = true
                  push2.requestedBy = (requested[0].username === '') ? 'Anonymous' : requested[0].username
                  push2.requestedMessage = requested[0].message
                }

                // If we are finished playing requests, clear request meta
              } else if (sails.models.meta['A'].requested) {
                push2.requested = false
                push2.requestedBy = ''
                push2.requestedMessage = ''
              }
            }

            // Manage metadata based on our current state when something is playing in automation

            // Regular automation
            if (sails.models.meta['A'].state.startsWith('automation_') && sails.models.meta['A'].state !== 'automation_playlist' && sails.models.meta['A'].state !== 'automation_genre') {
              // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
              if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta['A'].trackIDSubcat || 0) > -1) || sails.models.meta['A'].trackArtist.includes('Unknown Artist') || sails.models.meta['A'].trackArtist === null || sails.models.meta['A'].trackArtist === '') {
                push2.line1 = sails.config.custom.meta.alt.automation
                push2.line2 = ''
                push2.stream = `WWSU 106.9FM - ${sails.config.custom.meta.alt.automation}`
                push2.percent = 0
              } else {
                push2.line1 = await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.automation}${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'}`)
                push2.line2 = push2.requested ? await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'}`) : ''
                push2.stream = await sails.helpers.filterProfane(`${sails.models.meta['A'].trackArtist} - ${sails.models.meta['A'].trackTitle} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
              }

              // Playlist automation
            } else if (sails.models.meta['A'].state === 'automation_playlist') {
              // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
              if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta['A'].trackIDSubcat || 0) > -1) || sails.models.meta['A'].trackArtist.includes('Unknown Artist') || sails.models.meta['A'].trackArtist === null || sails.models.meta['A'].trackArtist === '') {
                push2.line1 = sails.config.custom.meta.alt.playlist
                push2.line2 = `${sails.config.custom.meta.prefix.playlist}${sails.models.meta['A'].playlist}`
                push2.stream = `WWSU 106.9FM - ${sails.config.custom.meta.alt.playlist}`
                push2.percent = 0
              } else {
                push2.line1 = await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.automation}${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'}`)
                push2.line2 = push2.requested ? await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'}`) : `${sails.config.custom.meta.prefix.playlist}${sails.models.meta['A'].playlist}`
                push2.stream = await sails.helpers.filterProfane(`${sails.models.meta['A'].trackArtist} - ${sails.models.meta['A'].trackTitle} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
              }

              // Genre automation
            } else if (sails.models.meta['A'].state === 'automation_genre') {
              // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
              if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta['A'].trackIDSubcat || 0) > -1) || sails.models.meta['A'].trackArtist.includes('Unknown Artist') || sails.models.meta['A'].trackArtist === null || sails.models.meta['A'].trackArtist === '') {
                push2.line1 = sails.config.custom.meta.alt.genre
                push2.line2 = `${sails.config.custom.meta.prefix.genre}${sails.models.meta['A'].genre}`
                push2.stream = `WWSU 106.9FM - ${sails.config.custom.meta.alt.genre}`
                push2.percent = 0
              } else {
                push2.line1 = await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.automation}${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'}`)
                push2.line2 = push2.requested ? await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'}`) : `${sails.config.custom.meta.prefix.genre}${sails.models.meta['A'].genre}`
                push2.stream = await sails.helpers.filterProfane(`${sails.models.meta['A'].trackArtist} - ${sails.models.meta['A'].trackTitle} ${push2.requested ? `(${sails.config.custom.meta.prefix.genre}${push2.requestedBy || 'Anonymous'})` : ``}`)
              }

              // Live shows
            } else if (sails.models.meta['A'].state.startsWith('live_')) {
              // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
              if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta['A'].trackIDSubcat || 0) > -1) || sails.models.meta['A'].trackArtist.includes('Unknown Artist') || sails.models.meta['A'].trackArtist === null || sails.models.meta['A'].trackArtist === '') {
                push2.line1 = `${sails.config.custom.meta.prefix.live}${sails.models.meta['A'].show}`
                push2.line2 = sails.config.custom.meta.alt.live
                push2.stream = `${sails.models.meta['A'].show} (${sails.config.custom.meta.alt.live})`
                push2.percent = 0
              } else {
                push2.line1 = `${sails.config.custom.meta.prefix.live}${sails.models.meta['A'].show}`
                push2.line2 = await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.playing}${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
                push2.stream = await sails.helpers.filterProfane(`${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
              }

              // Prerecorded shows
            } else if (sails.models.meta['A'].state.startsWith('prerecord_')) {
              // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
              if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta['A'].trackIDSubcat || 0) > -1) || sails.models.meta['A'].trackArtist.includes('Unknown Artist') || sails.models.meta['A'].trackArtist === null || sails.models.meta['A'].trackArtist === '') {
                push2.line1 = `${sails.config.custom.meta.prefix.prerecord}${sails.models.meta['A'].playlist}`
                push2.line2 = sails.config.custom.meta.alt.prerecord
                push2.stream = `${sails.models.meta['A'].playlist} (${sails.config.custom.meta.alt.prerecord})`
                push2.percent = 0
              } else {
                push2.line1 = `${sails.config.custom.meta.prefix.prerecord}${sails.models.meta['A'].playlist}`
                push2.line2 = await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.playing}${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
                push2.stream = await sails.helpers.filterProfane(`${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
              }

              // Remote broadcasts
            } else if (sails.models.meta['A'].state.startsWith('remote_')) {
              // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
              if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta['A'].trackIDSubcat || 0) > -1) || sails.models.meta['A'].trackArtist.includes('Unknown Artist') || sails.models.meta['A'].trackArtist === null || sails.models.meta['A'].trackArtist === '') {
                push2.line1 = `${sails.config.custom.meta.prefix.remote}${sails.models.meta['A'].show}`
                push2.line2 = sails.config.custom.meta.alt.remote
                push2.stream = `${sails.models.meta['A'].show} (${sails.config.custom.meta.alt.remote})`
                push2.percent = 0
              } else {
                push2.line1 = `${sails.config.custom.meta.prefix.remote}${sails.models.meta['A'].show}`
                push2.line2 = await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.playing}${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
                push2.stream = await sails.helpers.filterProfane(`${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
              }

              // Sports broadcasts
            } else if (sails.models.meta['A'].state.startsWith('sports_') || sails.models.meta['A'].state.startsWith('sportsremote_')) {
              // We do not ever want to display what we are playing when broadcasting sports; always use alt meta
              push2.line1 = `${sails.config.custom.meta.prefix.sports}${sails.models.meta['A'].show}`
              push2.line2 = sails.config.custom.meta.alt.sports
              push2.stream = `WWSU 106.9FM - ${sails.models.meta['A'].show} (${sails.config.custom.meta.alt.sports})`
              push2.percent = 0
            }

            // Overwrite line 2 of the metadata if a broadcast is about to begin
            if (sails.models.meta['A'].state === 'automation_live') {
              push2.line2 = `${sails.config.custom.meta.prefix.pendLive}${sails.models.meta['A'].show}`
              // Prerecord about to begin
            } else if (sails.models.meta['A'].state === 'automation_prerecord') {
              push2.line2 = `${sails.config.custom.meta.prefix.pendPrerecord}${sails.models.meta['A'].show}`
            } else if (sails.models.meta['A'].state === 'automation_remote') {
              push2.line2 = `${sails.config.custom.meta.prefix.pendRemote}${sails.models.meta['A'].show}`
            } else if (sails.models.meta['A'].state === 'automation_sports' || sails.models.meta['A'].state === 'automation_sportsremote') {
              push2.line2 = `${sails.config.custom.meta.prefix.pendSports}${sails.models.meta['A'].show}`
            }

            // Log the new track playing if the track was new
            if (typeof push.trackID !== 'undefined') {
              await sails.models.logs.create({ attendanceID: sails.models.meta['A'].attendanceID, logtype: 'track', loglevel: 'secondary', logsubtype: 'automation', event: `<strong>Track played in automation.</strong>${push2.requested ? `<br />Requested by: ${push2.requestedBy || `Unknown User`}` : ``}`, trackArtist: sails.models.meta['A'].trackArtist || null, trackTitle: sails.models.meta['A'].trackTitle || null, trackAlbum: sails.models.meta['A'].trackAlbum || null, trackLabel: sails.models.meta['A'].trackLabel || null }).fetch()
                .tolerate(() => {
                })

              // Push to the history array if not a track that falls under noMeta
              if (sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta['A'].trackIDSubcat) === -1) {
                push2.history = sails.models.meta['A'].history
                push2.history.unshift({ ID: sails.models.meta['A'].trackID, track: (sails.models.meta['A'].trackArtist || 'Unknown Artist') + ' - ' + (sails.models.meta['A'].trackTitle || 'Unknown Title'), likable: true })
                push2.history = push2.history.slice(0, 3)
              }
            }

            // Perform metadata for when nothing is playing in automation
          } else {
            // Erase track information if we stopped playing stuff in automation
            if (typeof push.trackID !== 'undefined' && push.trackID === 0) {
              push2.trackStamp = null
              push2.trackArtist = null
              push2.trackTitle = null
              push2.trackAlbum = null
              push2.trackLabel = null
              manual = false
            } else {
              // New track? push it to the history array
              if (typeof push.trackStamp !== 'undefined') {
                push2.history = sails.models.meta['A'].history
                push2.history.unshift({ ID: null, track: (sails.models.meta['A'].trackArtist || 'Unknown Artist') + ' - ' + (sails.models.meta['A'].trackTitle || 'Unknown Title'), likable: false })
                push2.history = push2.history.slice(0, 3)
              }
              // Determine if a manually logged track is playing
              manual = sails.models.meta['A'].trackArtist !== null && sails.models.meta['A'].trackArtist !== '' && sails.models.meta['A'].trackTitle !== null && sails.models.meta['A'].trackTitle !== ''
            }

            // Live shows
            if (sails.models.meta['A'].state.startsWith('live_')) {
              push2.line1 = `${sails.config.custom.meta.prefix.live}${sails.models.meta['A'].show}`
              push2.line2 = manual ? await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.playing}${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'}`) : ``
              push2.stream = manual ? await sails.helpers.filterProfane(`${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'}`) : await sails.helpers.filterProfane(`${sails.models.meta['A'].show} (LIVE)`)

              // Prerecorded shows (should never happen; this is an error!)
            } else if (sails.models.meta['A'].state.startsWith('prerecord_')) {
              push2.line1 = `${sails.config.custom.meta.prefix.prerecord}${sails.models.meta['A'].playlist}`
              push2.line2 = ``
              push2.stream = await sails.helpers.filterProfane(`${sails.models.meta['A'].show} (PRERECORD)`)

              // Remote Broadcasts
            } else if (sails.models.meta['A'].state.startsWith('remote_')) {
              push2.line1 = `${sails.config.custom.meta.prefix.remote}${sails.models.meta['A'].show}`
              push2.line2 = manual ? await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.playing}${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'}`) : ``
              push2.stream = manual ? await sails.helpers.filterProfane(`${sails.models.meta['A'].trackArtist || 'Unknown Artist'} - ${sails.models.meta['A'].trackTitle || 'Unknown Title'}`) : await sails.helpers.filterProfane(`${sails.models.meta['A'].show} (LIVE)`)

              // Sports; we don't want to ever display what we are playing
            } else if (sails.models.meta['A'].state.startsWith('sports_') || sails.models.meta['A'].state.startsWith('sportsremote_')) {
              push2.line1 = `${sails.config.custom.meta.prefix.sports}${sails.models.meta['A'].show}`
              push2.line2 = ``
              push2.stream = `WWSU 106.9FM - ${sails.models.meta['A'].show} (LIVE)`

              // Regular automation (should never happen; this is an error!)
            } else if (sails.models.meta['A'].state.startsWith('automation_') && sails.models.meta['A'].state !== 'automation_playlist' && sails.models.meta['A'].state !== 'automation_genre') {
              push2.line1 = ``
              push2.line2 = ``

              // Playlists (should never happen; this is an error!)
            } else if (sails.models.meta['A'].state === 'automation_playlist') {
              push2.line1 = ``
              push2.line2 = `${sails.config.custom.meta.prefix.playlist}${sails.models.meta['A'].playlist}`

              // Genre automation (should never happen; this is an error!)
            } else if (sails.models.meta['A'].state === 'automation_genre') {
              push2.line1 = ``
              push2.line2 = `${sails.config.custom.meta.prefix.genre}${sails.models.meta['A'].genre}`
            }
          }

          // Now, push notifications if this is a track request
          if (push2.requested && typeof requested[0] !== `undefined`) {
            var subscriptions = await sails.models.subscribers.destroy({ type: `request`, subtype: requested[0].ID }).fetch()
            var devices = []
            subscriptions.map((subscription) => devices.push(subscription.device))
            if (devices.length > 0) { await sails.helpers.onesignal.send(devices, `request`, `WWSU - Your Request is Playing!`, `The track you requested is now playing on WWSU: ` + await sails.helpers.filterProfane(`${sails.models.meta['A'].trackArtist} - ${sails.models.meta['A'].trackTitle}`), (60 * 15)) }
          }
        }

        // Cycle through all push2's and update metadata
        for (var key2 in push2) {
          if (Object.prototype.hasOwnProperty.call(push2, key2) && push2[key2] !== sails.models.meta['A'][key2]) {
            push[key2] = push2[key2]
            sails.models.meta['A'][key2] = push2[key2]
          }
        }

        // Finalize all meta changes and update ones in the database as necessary

        for (var key3 in push) {
          if (Object.prototype.hasOwnProperty.call(push, key3)) {
            try {
              if (key3 in sails.models.meta.attributes) { db[key3] = push[key3] }
            } catch (e) {
              return reject(e)
            }

            // If we're changing stream meta, push to history array, and send an API call to the stream to update the meta on the stream.
            if (key3 === 'stream') {
              sails.models.meta.history.unshift(push[key3])
              sails.models.meta.history = sails.models.meta.history.slice(0, 5)
              // TODO: Put stream metadata updating API query here
            }
          }
        }

        // Clone our changes due to a Sails discrepancy
        var criteria = _.cloneDeep(db)

        // Update meta in the database
        await sails.models.meta.update({ ID: 1 }, criteria)
          .tolerate((err) => {
            sails.log.error(err)
          })

        // Do not push empty (no) changes through websockets
        if (_.isEmpty(push)) { return resolve() }

        sails.log.silly(`meta socket: ${push}`)
        sails.sockets.broadcast('meta', 'meta', push)
        return resolve()
      } catch (e) {
        sails.log.error(e)
        return resolve()
      }
    })
  }
}
