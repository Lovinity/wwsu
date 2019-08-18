/**
 * Calendar.js
 *
 * @description :: Container containing Google Calendar events.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

var fs = require('fs')
var readline = require('readline')
var { OAuth2Client } = require('google-auth-library')
var breakdance = require('breakdance')

module.exports = {
  datastore: 'nodebase',
  attributes: {

    ID: {
      type: 'number',
      autoIncrement: true
    },

    unique: {
      type: 'string'
    },

    active: {
      type: 'number',
      min: -1,
      max: 2,
      defaultsTo: 1
    },

    title: {
      type: 'string',
      defaultsTo: 'Unnamed Event'
    },

    description: {
      type: 'string',
      defaultsTo: ''
    },

    color: {
      type: 'string',
      defaultsTo: '#D50000'
    },

    allDay: {
      type: 'boolean',
      defaultsTo: false
    },

    start: {
      type: 'ref',
      columnType: 'datetime'
    },

    end: {
      type: 'ref',
      columnType: 'datetime'
    },

    verify: {
      type: 'string'
    },

    verifyMessage: {
      type: 'string'
    },

    verifyTitleHTML: {
      type: 'string'
    }
  },

  calendar: [],

  // Authenticate to Google Calendar
  // Google auth does not seem to support async/promises yet, so we need to have a sync function for that
  preLoadEvents: function (ignoreChangingState = false) {
    return new Promise((resolve, reject) => {
      var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
      var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
        process.env.USERPROFILE) + '/.credentials/'
      var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json'

      // Load client secrets from a local file.
      var getClientSecret = function () {
        // LINT: must be named resolve2 and reject2 because resolve and reject exists in a higher level
        // eslint-disable-next-line promise/param-names
        return new Promise((resolve2, reject2) => {
          fs.readFile('client_secret.json', function (err, content) {
            if (err) {
              return reject2(err)
            }

            if (typeof content === 'undefined' || content === null) {
              return reject2(new Error('Empty credentials file.'))
            }
            // Authorize a client with the loaded credentials, then call the
            // Google Calendar API.
            return resolve2(JSON.parse(content))
          })
        })
      }

      var storeToken = function (token) {
        try {
          fs.mkdirSync(TOKEN_DIR)
        } catch (err) {
          if (err.code !== 'EEXIST') {
            throw err
          }
        }
        fs.writeFile(TOKEN_PATH, JSON.stringify(token))
        console.log('Token stored to ' + TOKEN_PATH)
      }

      var getNewToken = function (oauth2Client) {
        // LINT: must be named resolve2 and reject2 because resolve and reject exists in a higher level
        // eslint-disable-next-line promise/param-names
        return new Promise((resolve2, reject2) => {
          var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
          })
          console.log('Authorize this app by visiting this url: \n ', authUrl)
          var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          })
          rl.question('\n\nEnter the code from that page here: ', (code) => {
            rl.close()
            oauth2Client.getToken(code, (err, token) => {
              if (err) {
                console.log('Error while trying to retrieve access token', err)
                return reject2(err)
              }
              oauth2Client.credentials = token
              storeToken(token)
              return resolve2(oauth2Client)
            })
          })
        })
      }

      var authorize = function (credentials) {
        // LINT: must be named resolve2 and reject2 because resolve and reject exists in a higher level
        // eslint-disable-next-line promise/param-names
        return new Promise((resolve2, reject2) => {
          try {
            var clientSecret = credentials.installed.client_secret
            var clientId = credentials.installed.client_id
            var redirectUrl = credentials.installed.redirect_uris[0]
            var oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl)
            // Check if we have previously stored a token.
          } catch (e) {
            return reject2(e)
          }
          fs.readFile(TOKEN_PATH, (err, token) => {
            if (err) {
              getNewToken(oauth2Client).then((oauth2ClientNew) => {
                return resolve2(oauth2ClientNew)
              }, (err) => {
                return reject2(err)
              })
            } else {
              oauth2Client.credentials = JSON.parse(token)
              return resolve2(oauth2Client)
            }
          })
        })
      }

      var authenticate = function () {
        // LINT: must be reject2 and resolve2 because resolve and reject exists in a higher level
        // eslint-disable-next-line promise/param-names
        return new Promise((resolve2, reject2) => {
          // Must be promise chain; cannot use async/await because of eslint rules.
          getClientSecret()
            .then(credentials => {
              if (typeof credentials === 'undefined' || credentials === null) {
                return reject2(new Error('Empty credentials file.'))
              }
              var authorizePromise = authorize(credentials)
              authorizePromise.then(resolve2)
              authorizePromise.catch(reject2)
            })
            .catch(err => {
              return reject2(err)
            })
        })
      }

      authenticate()
        .then(async (auth) => {
          await sails.models.calendar.loadEvents(auth, ignoreChangingState)
          return resolve()
        })
        .catch(err => {
          sails.log.error(err)
          sails.models.status.changeStatus([{ name: 'google-calendar', label: 'Google Calendar', data: `Google Calendar error: ${breakdance(err.message)}. This is likely a network problem or an issue with Google. Until resolved, modifications to the calendar will not reflect in the system; system will use the calendar stored in memory.`, status: 2 }])
          return reject(err)
        })
    })
  },

  // Get calendar events
  loadEvents: function (auth, ignoreChangingState) {
    // LINT: must be async because of Sails.js await
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      sails.log.verbose(`Calendar.loadEvents called`)
      try {
        var status = 5
        var issues = []
        var maps
        var event

        // First, calendarID for WWSU Events
        var { google } = require('googleapis')
        var toTrigger = null
        var criteria
        var criteriaB
        var criteriaC
        var theEvent
        var theEvent2
        var needsUpdate
        var isChanged
        var destroyed
        var cancelled
        var eventIds = [] // Used for determining which events in memory no longer exist, and therefore should be destroyed
        var calendar = google.calendar({ version: 'v3', auth: auth })
        var currentdate = moment().startOf('day')
        var nextWeekDate = moment().startOf('day').add(28, 'days')
        // formatted.push(currentdate.format("YYYY-MM-DDTHH:mm:ssZ"));
        // formatted.push(tomorrowdate.format("YYYY-MM-DDTHH:mm:ssZ"));
        var colors = await calendar.colors.get()
        var genreActive = false
        colors = colors.data.event
        var events = await calendar.events.list({
          calendarId: sails.config.custom.GoogleAPI.calendarId,
          timeMin: currentdate.toISOString(),
          timeMax: nextWeekDate.toISOString(),
          singleEvents: true,
          maxResults: 1000
          // orderBy: 'startTime' does not work correctly, so ignoring as it's not a big deal if events are not in time order
        })
        events = events.data.items
        sails.models.calendar.calendar = events
        sails.log.silly(events)

        // Alert if no events returned; this may be a problem. Also exit.
        if (events.length === 0) {
          if (status > 3) { status = 3 }
          issues.push(`WWSU Events Google Calendar returned no events for the next 28 days. Is this normal?`)
        } else {
          // Iterate through each returned event from Google Calendar

          var playlists = {}
          var djevents = {}

          // Load all the playlists into memory
          var playlistsR = await sails.models.playlists.find()
          sails.log.verbose(`Retrieved Playlists records: ${playlistsR.length}`)
          sails.log.silly(playlistsR)

          // Determine duration of the tracks in every playlist
          maps = playlistsR.map(async playlist => {
            var playlistSongs = []
            var playlistDuplicates = 0
            var duplicateTracks = []

            // Get the playlist tracks
            // LINT: Playlists_list is valid
            // eslint-disable-next-line camelcase
            var pTracks = await sails.models.playlists_list.find({ pID: playlist.ID })
            sails.log.verbose(`Retrieved Playlists_list records: ${pTracks.length}`)
            sails.log.silly(pTracks)

            var temp = []

            // Check for duplicates
            pTracks.map(track => {
              if (temp.indexOf(track.sID) > -1) { playlistDuplicates++ }
              temp.push(track.sID)
            })

            // Get the song records for each playlist track
            var songs = await sails.models.songs.find({ ID: temp })
            sails.log.verbose(`Retrieved Songs records: ${songs.length}`)
            sails.log.silly(songs)

            var duration = 0

            // Determine duration, ignoring duplicates
            songs.map(song => {
              if (playlistSongs.indexOf(`${song.artist} - ${song.title}`) > -1) {
                playlistDuplicates++
                duplicateTracks.push(`${song.artist} - ${song.title}`)
              } else {
                duration += song.duration
              }
              playlistSongs.push(`${song.artist} - ${song.title}`)
            })

            // Generate playlist object
            playlists[playlist.name] = ({ ID: playlist.ID, name: playlist.name, duration: duration, duplicates: playlistDuplicates, duplicateTracks: duplicateTracks.join('<br />') })
            return true
          })
          await Promise.all(maps)

          // Load all manual RadioDJ events into memory
          var djeventsR = await sails.models.events.find({ type: 3 })
          sails.log.verbose(`Retrieved Events records: ${djeventsR.length}`)
          sails.log.silly(djeventsR)

          // Load the current attendance record into memory
          var attendanceRecord = await sails.models.attendance.findOne({ ID: sails.models.meta['A'].attendanceID })

          djeventsR.map(event => { djevents[event.name] = event })

          // Loop through each calendar event
          for (var i = 0; i < events.length; i++) {
            event = events[i]
            var summary
            var temp2
            var temp
            var eventLength
            eventIds.push(event.id)

            // sails.log.error(event);

            // Skip events without a start time or without an end time or without a summary
            if (typeof event.start === 'undefined' || typeof event.end === 'undefined' || typeof event.summary === 'undefined') {
              sails.log.verbose(`SKIPPING ${i}: invalid event parameters.`)
              continue
            }

            // Prepare data structure for event
            criteria = {
              unique: event.id,
              title: event.summary,
              description: (typeof event.description !== 'undefined') ? breakdance(event.description) : '',
              start: event.start.dateTime || event.start.date,
              end: event.end.dateTime || event.end.date
            }
            criteria.allDay = (moment(criteria.start).isSameOrBefore(moment().startOf('day')) && moment(criteria.end).isSameOrAfter(moment().startOf('day').add(1, 'days')))
            if (event.colorId && event.colorId in colors) {
              criteria.color = colors[event.colorId].background
            } else if (event.summary.startsWith('Show: ')) {
              criteria.color = '#D50000'
            } else {
              criteria.color = '#607D8B'
            }

            // Verify the event
            criteria.verify = 'Manual'
            criteria.verifyMessage = 'This was not detected as an event dealing with OnAir programming. If this event was meant to trigger OnAir programming, <strong>please ensure the event title formatting is correct and that everything is spelled correctly</strong>.'
            criteria.verifyTitleHTML = event.summary

            // Live shows
            if (criteria.title.startsWith('Show: ')) {
              summary = criteria.title.replace('Show: ', '')
              temp2 = summary.split(' - ')

              // Check proper formatting so system can determine show host from show name
              if (temp2.length === 2) {
                criteria.verifyTitleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Show</span>: <span style="background: rgba(255, 255, 0, 0.2);">${temp2[0]}</span> - <span style="background: rgba(0, 255, 0, 0.2);">${temp2[1]}</span>`
                criteria.verify = 'Valid'
                criteria.verifyMessage = `Valid. DJ in yellow, show in green.`
              } else {
                if (status > 3) { status = 3 }
                issues.push(`The formatting of the live show "${summary}" is invalid; must have a " - " to separate DJ/handle from show name.`)
                criteria.verifyTitleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Show</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`
                criteria.verify = 'Invalid'
                criteria.verifyMessage = `Invalid; cannot determine DJ and show. <strong>Ensure the event title separates DJ handle from show name with a space hyphen space (" - ")</strong>.`
              }

              // Remote broadcasts
            } else if (criteria.title.startsWith('Remote: ')) {
              summary = criteria.title.replace('Remote: ', '')
              temp2 = summary.split(' - ')

              // Check proper formatting so system can determine broadcast host from broadcastn name
              if (temp2.length === 2) {
                criteria.verifyTitleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Remote</span>: <span style="background: rgba(255, 255, 0, 0.2);">${temp2[0]}</span> - <span style="background: rgba(0, 255, 0, 0.2);">${temp2[1]}</span>`
                criteria.verify = 'Valid'
                criteria.verifyMessage = `Valid. Host / org in yellow, show name in green.`
              } else {
                if (status > 3) { status = 3 }
                issues.push(`The formatting of the remote event "${summary}" is invalid; must have a " - " to separate DJ/host from show name.`)
                criteria.verifyTitleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Remote</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`
                criteria.verify = 'Invalid'
                criteria.verifyMessage = `Invalid; cannot determine host and show. <strong>Ensure the event title separates host / organization from broadcast name with a space hyphen space (" - ")</strong>.`
              }

              // Sports broadcast
            } else if (criteria.title.startsWith('Sports: ')) {
              summary = criteria.title.replace('Sports: ', '')
              // Strip " vs." in titles
              var summary2 = ``
              if (summary.indexOf(' vs.') > -1) {
                summary2 = summary.substring(summary.indexOf(' vs.'))
                summary = summary.substring(0, summary.indexOf(' vs.'))
              }

              // Ensure the name of the sport is one that is implemented in the system.
              if (sails.config.custom.sports.indexOf(summary) > -1) {
                criteria.verifyTitleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Sports</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>${summary2}`
                criteria.verify = 'Valid'
                criteria.verifyMessage = `Valid. Sport in green.`
              } else {
                if (status > 3) { status = 3 }
                issues.push(`A sport event "${summary}" is invalid; the specified sport does not exist in the system.`)
                criteria.verifyTitleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Sports</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>${summary2}`
                criteria.verify = 'Invalid'
                criteria.verifyMessage = `Invalid; sport marked in red is not configured in Node. <strong>Please ensure you spelled the sport correctly (case sensitive), and the sport exists in the system</strong>.`
              }

              // Prerecord (via RadioDJ Playlists)
            } else if (criteria.title.startsWith('Prerecord: ')) {
              summary = criteria.title.replace('Prerecord: ', '')
              eventLength = (moment(criteria.end).diff(moment(criteria.start)) / 1000)
              criteria.verifyTitleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Prerecord</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`
              criteria.verify = 'Invalid'
              criteria.verifyMessage = `Invalid; playlist does not exist in RadioDJ. <strong>Please ensure the playlist in red exists in RadioDJ and that you spelled it correctly</strong>.`

              // Check to see a playlist exists
              if (typeof playlists[summary] !== 'undefined') {
                criteria.verifyTitleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Prerecord</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`

                // Check to see if the length of the playlists are over 15 minutes too short
                if ((eventLength - 900) >= (playlists[summary].duration * 1.05)) {
                  criteria.verify = 'Check'
                  criteria.verifyMessage = `Valid, but duration is shorter than scheduled time. To fix, <strong>add about ${moment.duration((eventLength - (playlists[summary].duration * 1.05)), 'seconds').humanize()} more audio</strong> to the playlist. ${playlists[summary].duplicates > 0 ? `<strong>There were ${playlists[summary].duplicates} duplicate tracks detected.</strong> Duplicate tracks will get skipped.` : ''}`

                  // Check to see if the playlist is over 5 minutes too long
                } else if ((eventLength + 300) <= (playlists[summary].duration * 1.05)) {
                  criteria.verify = 'Check'
                  criteria.verifyMessage = `Valid, but duration exceeds scheduled time. <strong>The prerecord could run over the end time by about ${moment.duration(((playlists[summary].duration * 1.05) - eventLength), 'seconds').humanize()}</strong>. ${playlists[summary].duplicates > 0 ? `<strong>There were ${playlists[summary].duplicates} duplicate tracks detected.</strong> Duplicate tracks will get skipped.` : ''}`
                } else if (playlists[summary].duplicates > 0) {
                  criteria.verify = 'Check'
                  criteria.verifyMessage = `Valid, but duplicates detected. <strong>There were ${playlists[summary].duplicates} duplicate tracks detected.</strong> Duplicate tracks will get skipped.`
                } else {
                  criteria.verify = 'Valid'
                  criteria.verifyMessage = `Valid; playlist in green.`
                }
              }

              if (criteria.verify === 'Invalid') {
                if (status > 3) { status = 3 }
                issues.push(`Prerecord "${summary}" is invalid; a playlist with this name does not exist in RadioDJ.`)
              }

              // Playlists (RadioDJ)
            } else if (criteria.title.startsWith('Playlist: ')) {
              summary = criteria.title.replace('Playlist: ', '')
              eventLength = (moment(criteria.end).diff(moment(criteria.start)) / 1000)
              criteria.verifyTitleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Playlist</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`
              criteria.verify = 'Invalid'
              criteria.verifyMessage = `Invalid; playlist does not exist in RadioDJ. <strong>Please ensure the playlist in red exists in RadioDJ and that you spelled it correctly</strong>.`

              // Check to see that playlist exists
              if (typeof playlists[summary] !== 'undefined') {
                criteria.verifyTitleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Playlist</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`

                // Check to see if the playlist duration is shorter than the event duration
                if (eventLength <= (playlists[summary].duration * 1.05) && playlists[summary].duplicates === 0) {
                  criteria.verify = 'Valid'
                  criteria.verifyMessage = `Valid; playlist in green.`
                } else if (playlists[summary].duplicates === 0) {
                  criteria.verify = 'Check'
                  criteria.verifyMessage = `Valid, but duration is shorter than scheduled time. To fix, <strong>add about ${moment.duration((eventLength - (playlists[summary].duration * 1.05)), 'seconds').humanize()} more audio</strong> to the playlist.`
                } else if (eventLength <= (playlists[summary].duration * 1.05)) {
                  criteria.verify = 'Check'
                  criteria.verifyMessage = `Valid, but duplicate tracks detected. ${playlists[summary].duplicates > 0 ? `<strong>There were ${playlists[summary].duplicates} duplicate tracks detected.</strong> Duplicate tracks will get skipped` : ''}`
                } else {
                  criteria.verify = 'Check'
                  criteria.verifyMessage = `Valid, but duration is shorter than scheduled time, and duplicate tracks detected. To fix, <strong>add about ${moment.duration((eventLength - (playlists[summary].duration * 1.05)), 'seconds').humanize()} more audio</strong> to the playlist. ${playlists[summary].duplicates > 0 ? `<strong>There were ${playlists[summary].duplicates} duplicate tracks detected.</strong> Duplicate tracks will get skipped.` : ''}`
                }
              }

              if (criteria.verify === 'Invalid') {
                if (status > 3) { status = 3 }
                issues.push(`Playlist "${summary}" is invalid; a playlist with this name does not exist in RadioDJ.`)
              }

              // Genre rotations (via manual events in RadioDJ)
            } else if (criteria.title.startsWith('Genre: ')) {
              summary = criteria.title.replace('Genre: ', '')
              criteria.verifyTitleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Genre</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`
              criteria.verify = 'Invalid'
              criteria.verifyMessage = `Invalid; event with same name does not exist in RadioDJ. <strong>Please ensure there is an event with the same name in RadioDJ.</strong>. The event should trigger a rotation change in RadioDJ when executed.`

              // Check to see if the manual event exists in RadioDJ
              if (typeof djevents[summary] !== 'undefined') {
                criteria.verifyTitleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Genre</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`

                // Check to see the event is active, and there is a "Load Rotation" action in the event
                if (djevents[summary].data.includes('Load Rotation') && djevents[summary].enabled === 'True') {
                  criteria.verify = `Valid`
                  criteria.verifyMessage = `Valid; genre in green.`

                  // Event is enabled, but does not have a Load Rotation event
                } else if (djevents[summary].enabled === 'True') {
                  criteria.verify = 'Invalid'
                  criteria.verifyMessage = `Invalid; a "Load Rotation" action does not exist in the RadioDJ event. <strong>To ensure rotation changes, make sure the RadioDJ event has a "Load Rotation" action.</strong>`
                  if (status > 3) { status = 3 }
                  issues.push(`Genre "${summary}" is invalid; the event for this genre in RadioDJ does not contain a "Load Rotation" action.`)
                  // Event is not enabled
                } else {
                  criteria.verify = 'Invalid'
                  criteria.verifyMessage = `Invalid; the event in RadioDJ is disabled. <strong>Please enable the manual event in RadioDJ</strong>.`
                  if (status > 3) { status = 3 }
                  issues.push(`Genre "${summary}" is invalid; the event for this genre in RadioDJ is disabled.`)
                }
              } else {
                if (status > 3) { status = 3 }
                issues.push(`Genre "${summary}" is invalid; an event with this name does not exist in RadioDJ.`)
              }
            } else {
              criteria.verifyTitleHTML = `<span style="background: rgba(128, 128, 128, 0.2);">${criteria.verifyTitleHTML}</span>`
            }

            sails.log.silly(`Event criteria: ${JSON.stringify(criteria)}`)

            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
            criteriaB = _.cloneDeep(criteria)
            criteriaC = _.cloneDeep(criteria)
            // TODO: Make so that new records do not also trigger an update

            // Find existing record of event. If does not exist, create it in the Calendar.
            theEvent = await sails.models.calendar.findOrCreate({ unique: event.id }, criteriaB)

            // sails.log.verbose(`WAS NOT created ${event.id} / ${event.summary}`);
            // Check if the event changed. If so, update it and push it out to clients.
            needsUpdate = false
            isChanged = false
            for (var key in theEvent) {
              if (Object.prototype.hasOwnProperty.call(theEvent, key)) {
                if (typeof criteria[key] !== 'undefined' && theEvent[key] !== criteria[key] && key !== 'ID' && key !== 'createdAt' && key !== `updatedAt`) {
                  // MySQL returns differently for datetimes, so do a secondary check for those keys using moment().
                  if (key === `start` && moment(theEvent[key]).isSame(moment(criteria[key]))) { continue }
                  if (key === `end` && moment(theEvent[key]).isSame(moment(criteria[key]))) { continue }
                  if (key === `start` && !moment(theEvent[key]).isSame(moment(criteria[key]))) { isChanged = true }
                  if (key === `end` && !moment(theEvent[key]).isSame(moment(criteria[key]))) { isChanged = true }

                  needsUpdate = true
                  break
                }
              }
            }
            if (needsUpdate) {
              // The time/date for the event changed. Send out a push notification.
              if (isChanged && theEvent.active >= 1) {
                criteriaC.active = 2
                var dj = criteria.title
                if (dj.includes(' - ') && dj.includes(': ')) {
                  dj = dj.split(' - ')[0]
                  dj = dj.substring(dj.indexOf(': ') + 2)
                } else {
                  dj = null
                }
                if (criteria.title.startsWith('Show: ')) {
                  temp = criteria.title.replace('Show: ', '')
                  await sails.helpers.onesignal.sendEvent(`Show: `, temp, `Live Show`, criteria.unique, moment(criteria.start).format('LLL'), false)
                }
                if (criteria.title.startsWith('Remote: ')) {
                  temp = criteria.title.replace('Remote: ', '')
                  await sails.helpers.onesignal.sendEvent(`Remote: `, temp, `Remote Broadcast`, criteria.unique, moment(criteria.start).format('LLL'), false)
                }
                if (criteria.title.startsWith('Sports: ')) {
                  temp = criteria.title.replace('Sports: ', '')
                  await sails.helpers.onesignal.sendEvent(`Sports: `, temp, `Sports Broadcast`, criteria.unique, moment(criteria.start).format('LLL'), false)
                }
                if (criteria.title.startsWith('Prerecord: ')) {
                  temp = criteria.title.replace('Prerecord: ', '')
                  await sails.helpers.onesignal.sendEvent(`Prerecord: `, temp, `Prerecorded Show`, criteria.unique, moment(criteria.start).format('LLL'), false)
                }
                if (criteria.title.startsWith('Genre: ')) {
                  temp = criteria.title.replace('Genre: ', '')
                  await sails.helpers.onesignal.sendEvent(`Genre: `, temp, `Genre`, criteria.unique, moment(criteria.start).format('LLL'), false)
                }
                if (criteria.title.startsWith('Playlist: ')) {
                  temp = criteria.title.replace('Playlist: ', '')
                  await sails.helpers.onesignal.sendEvent(`Playlist: `, temp, `Playlist`, criteria.unique, moment(criteria.start).format('LLL'), false)
                }
              }
              await sails.models.calendar.update({ unique: event.id }, criteriaC).fetch()
            }

            // Check to see if any of the events are triggering events, and if so, see if it trumps the priority of the current event to be triggered.
            // Prerecords should take priority over playlists, which take priority over genres.
            if (moment(criteria.start).isSameOrBefore() && moment(criteria.end).isAfter()) {
              try {
                // Do not trigger playlists or prerecords if they were already triggered, unless we are restarting them
                if (moment(criteria.start).isAfter(moment(sails.models.meta['A'].playlist_played)) || ignoreChangingState) {
                  if (event.summary.startsWith('Playlist: ') && (toTrigger === null || toTrigger.priority >= 2)) {
                    toTrigger = { priority: 2, event: event.summary.replace('Playlist: ', ''), type: 0, description: '' }
                  }
                  if (event.summary.startsWith('Prerecord: ') && (toTrigger === null || toTrigger.priority >= 1)) {
                    toTrigger = { priority: 1, event: event.summary.replace('Prerecord: ', ''), type: 1, description: criteria.description }
                    // If there is a prerecord still airing now and this scheduled prerecord is 5 minutes late, force it to start
                    toTrigger.forced = moment(criteria.start).add(5, 'minutes').isSameOrBefore(moment()) && sails.models.meta['A'].state.startsWith('prerecord_')
                  }
                }
                // Do not re-trigger an already active genre, unless we are restarting it
                if (ignoreChangingState || sails.models.meta['A'].genre !== event.summary.replace('Genre: ', '')) {
                  if (event.summary.startsWith('Genre: ') && (toTrigger === null || toTrigger.priority >= 3)) {
                    toTrigger = { priority: 3, event: event.summary.replace('Genre: ', '') }
                  }
                }
                // Mark when we are supposed to be in genre rotation
                if (event.summary.startsWith('Genre: ')) { genreActive = true }

                // Check if the event started over 10 minutes prior to start time, and if so, update the attendance record accordingly.
                if (sails.models.meta['A'].attendanceID !== null) {
                  if (attendanceRecord.event === event.summary && event.active >= 1 && (attendanceRecord.unique === null || attendanceRecord.unique === ``)) {
                    await sails.models.attendance.update({ ID: sails.models.meta['A'].attendanceID }, { unique: event.id, scheduledStart: moment(criteria.start).toISOString(true), scheduledEnd: moment(criteria.end).toISOString(true) }).fetch()
                  }
                }
              } catch (e) {
                sails.log.error(e)
              }
            }
          }

          sails.log.debug(`toTrigger: ${JSON.stringify(toTrigger)}`)

          // Trigger playlist or genre, if there is one to trigger
          if (toTrigger !== null && toTrigger.priority < 3) {
            await sails.helpers.playlists.start(toTrigger.event, false, toTrigger.type, toTrigger.description, ignoreChangingState, toTrigger.forced)
          } else if (toTrigger !== null && toTrigger.priority === 3) {
            try {
              await sails.helpers.genre.start(toTrigger.event, ignoreChangingState)
            } catch (unusedE) {
              if (sails.models.meta['A'].state === `automation_genre`) { await sails.helpers.genre.start('Default', ignoreChangingState) }
            }
          }

          // No genre events active right now? Switch back to regular automation.
          if (toTrigger === null && !genreActive && sails.models.meta['A'].genre !== 'Default') {
            await sails.helpers.genre.start('Default', ignoreChangingState)
          }

          // Update entries in the calendar which passed their end time
          destroyed = await sails.models.calendar.update({ active: { '>=': 1 }, end: { '<=': moment().toISOString(true) } }, { active: 0 })
            .tolerate(() => {
            })
            .fetch()

          if (events.length > 0) {
            // Destroy events which ended before midnight of today's day.
            await sails.models.calendar.destroy({ end: { '<': moment().startOf('day').toISOString(true) } })
              .tolerate(() => {
              })
              .fetch()

            // Entries no longer in Google Calendar should be updated to active = -1 to indicate they were canceled.
            cancelled = await sails.models.calendar.update({ unique: { nin: eventIds }, active: { '>=': 1 } }, { active: -1 })
              .tolerate(() => {
              })
              .fetch()

            // Send out cancellation notifications for cancelled shows. Also add a log for cancelled shows.
            if (cancelled.length > 0) {
              maps = cancelled.map(async (cEvent) => {
                var dj = cEvent.title
                if (dj.includes(' - ') && dj.includes(': ')) {
                  dj = dj.split(' - ')[0]
                  dj = dj.substring(dj.indexOf(': ') + 2)
                } else {
                  dj = null
                }
                if (dj !== null) { dj = await sails.models.djs.findOrCreate({ name: dj }, { name: dj, lastSeen: moment('2002-01-01').toISOString(true) }) }
                sails.models.attendance.findOrCreate({ unique: cEvent.unique }, { unique: cEvent.unique, dj: dj !== null && typeof dj.ID !== 'undefined' ? dj.ID : null, event: cEvent.title, happened: -1, happenedReason: `Removed from Google Calendar`, scheduledStart: moment(cEvent.start).toISOString(true), scheduledEnd: moment(cEvent.end).toISOString(true) })
                  .exec(async (err, attendance, wasCreated) => {
                    var temp
                    if (err) {
                      sails.log.error(err)
                      return null
                    }

                    if (!wasCreated) {
                      attendance = await sails.models.attendance.update({ ID: attendance.ID, happened: 1 }, { unique: cEvent.unique, dj: dj !== null && typeof dj.ID !== 'undefined' ? dj.ID : null, event: cEvent.title, happened: -1, happenedReason: `Removed from Google Calendar`, scheduledStart: moment(cEvent.start).toISOString(true), scheduledEnd: moment(cEvent.end).toISOString(true) })
                    }
                    if (cEvent.title.startsWith('Show: ')) {
                      temp = cEvent.title.replace('Show: ', '')
                      await sails.helpers.onesignal.sendEvent(`Show: `, temp, `Live Show`, cEvent.unique, moment(cEvent.start).format('LLL'), true)
                      await sails.models.logs.create({ attendanceID: attendance.ID, logtype: 'cancellation', loglevel: 'info', logsubtype: temp, event: `<strong>Show was canceled!</strong><br />Show: ${temp}<br />Scheduled time: ${moment(cEvent.start).format('LLL')} - ${moment(cEvent.end).format('LT')}<br />Reason: Removed from Google Calendar`, createdAt: moment().toISOString(true) }).fetch()
                        .tolerate((err) => {
                          sails.log.error(err)
                        })
                    }
                    if (cEvent.title.startsWith('Remote: ')) {
                      temp = cEvent.title.replace('Remote: ', '')
                      await sails.helpers.onesignal.sendEvent(`Remote: `, temp, `Remote Broadcast`, cEvent.unique, moment(cEvent.start).format('LLL'), true)
                      await sails.models.logs.create({ attendanceID: attendance.ID, logtype: 'cancellation', loglevel: 'info', logsubtype: temp, event: `<strong>Remote broadcast was canceled!</strong><br />Remote: ${temp}<br />Scheduled time: ${moment(cEvent.start).format('LLL')} - ${moment(cEvent.end).format('LT')}<br />Reason: Removed from Google Calendar`, createdAt: moment().toISOString(true) }).fetch()
                        .tolerate((err) => {
                          sails.log.error(err)
                        })
                    }
                    if (cEvent.title.startsWith('Sports: ')) {
                      temp = cEvent.title.replace('Sports: ', '')
                      await sails.helpers.onesignal.sendEvent(`Sports: `, temp, `Sports Broadcast`, cEvent.unique, moment(cEvent.start).format('LLL'), true)
                      await sails.models.logs.create({ attendanceID: attendance.ID, logtype: 'cancellation', loglevel: 'info', logsubtype: temp, event: `<strong>Sports broadcast was canceled!</strong><br />Sports: ${temp}<br />Scheduled time: ${moment(cEvent.start).format('LLL')} - ${moment(cEvent.end).format('LT')}<br />Reason: Removed from Google Calendar`, createdAt: moment().toISOString(true) }).fetch()
                        .tolerate((err) => {
                          sails.log.error(err)
                        })
                    }
                    if (cEvent.title.startsWith('Prerecord: ')) {
                      temp = cEvent.title.replace('Prerecord: ', '')
                      await sails.helpers.onesignal.sendEvent(`Prerecord: `, temp, `Prerecorded Show`, cEvent.unique, moment(cEvent.start).format('LLL'), true)
                      await sails.models.logs.create({ attendanceID: attendance.ID, logtype: 'cancellation', loglevel: 'info', logsubtype: temp, event: `<strong>Prerecorded show was canceled!</strong><br />Prerecord: ${temp}<br />Scheduled time: ${moment(cEvent.start).format('LLL')} - ${moment(cEvent.end).format('LT')}<br />Reason: Removed from Google Calendar`, createdAt: moment().toISOString(true) }).fetch()
                        .tolerate((err) => {
                          sails.log.error(err)
                        })
                    }
                    // We don't care about logging cancelled genres nor playlists, but we still want to send notifications out.
                    if (cEvent.title.startsWith('Genre: ')) {
                      temp = cEvent.title.replace('Genre: ', '')
                      await sails.helpers.onesignal.sendEvent(`Genre: `, temp, `Genre`, cEvent.unique, moment(cEvent.start).format('LLL'), true)

                      // We do not want to maintain cancellation records of genres in the system.
                      await sails.models.calendar.destroy({ ID: cEvent.ID }).fetch()

                      // Also remove the attendance record if the genre never aired; we do not want a bunch of canceled attendance records for genres.
                      await sails.models.attendance.destroy({ ID: attendance.ID, actualStart: null }).fetch()
                    }
                    if (cEvent.title.startsWith('Playlist: ')) {
                      temp = cEvent.title.replace('Playlist: ', '')
                      await sails.helpers.onesignal.sendEvent(`Playlist: `, temp, `Playlist`, cEvent.unique, moment(cEvent.start).format('LLL'), true)
                    }
                  })
              })
              await Promise.all(maps)
            }
          }

          // Go through every event record which passed the end time, and log absences where necessary.
          if (destroyed && destroyed.length > 0) {
            maps = destroyed
              // Do not log attendance for invalid or manual events
              .filter(event => event.verify === 'Valid' || event.verify === 'Check')
              .map(async event => {
                try {
                  var dj = event.title
                  if (dj.includes(' - ') && dj.includes(': ')) {
                    dj = dj.split(' - ')[0]
                    dj = dj.substring(dj.indexOf(': ') + 2)
                  } else {
                    dj = null
                  }
                  if (dj !== null) { dj = await sails.models.djs.findOrCreate({ name: dj }, { name: dj, lastSeen: moment('2002-01-01').toISOString(true) }) }
                  sails.models.attendance.findOrCreate({ unique: event.unique }, { unique: event.unique, dj: dj !== null && typeof dj.ID !== 'undefined' ? dj.ID : null, event: event.title, happened: 0, scheduledStart: moment(event.start).toISOString(true), scheduledEnd: moment(event.end).toISOString(true) })
                    .exec(async (err, record, wasCreated) => {
                      if (err) { return false }
                      // if wasCreated, then the event never aired; Log an absence.
                      if (wasCreated) {
                        if (record.event.startsWith('Show: ')) {
                          await sails.models.logs.create({ attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace('Show: ', ''), event: `<strong>Show did not air!</strong><br />Show: ${record.event.replace('Show: ', '')}<br />Scheduled time: ${moment(record.scheduledStart).format('hh:mm A')} - ${moment(record.scheduledEnd).format('hh:mm A')}`, createdAt: moment().toISOString(true) }).fetch()
                            .tolerate((err) => {
                              sails.log.error(err)
                            })
                        }

                        if (record.event.startsWith('Prerecord: ')) {
                          await sails.models.logs.create({ attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace('Prerecord: ', ''), event: `<strong>Prerecord did not air!</strong><br />Prerecord: ${record.event.replace('Prerecord: ', '')}<br />Scheduled time: ${moment(record.scheduledStart).format('hh:mm A')} - ${moment(record.scheduledEnd).format('hh:mm A')}`, createdAt: moment().toISOString(true) }).fetch()
                            .tolerate((err) => {
                              sails.log.error(err)
                            })
                        }

                        if (record.event.startsWith('Remote: ')) {
                          await sails.models.logs.create({ attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace('Remote: ', ''), event: `<strong>Remote broadcast did not air!</strong><br />Remote: ${record.event.replace('Remote: ', '')}<br />Scheduled time: ${moment(record.scheduledStart).format('hh:mm A')} - ${moment(record.scheduledEnd).format('hh:mm A')}`, createdAt: moment().toISOString(true) }).fetch()
                            .tolerate((err) => {
                              sails.log.error(err)
                            })
                        }

                        if (record.event.startsWith('Sports: ')) {
                          await sails.models.logs.create({ attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace('Sports: ', ''), event: `<strong>Sports broadcast did not air!</strong><br />Sport: ${record.event.replace('Sports: ', '')}<br />Scheduled time: ${moment(record.scheduledStart).format('hh:mm A')} - ${moment(record.scheduledEnd).format('hh:mm A')}`, createdAt: moment().toISOString(true) }).fetch()
                            .tolerate((err) => {
                              sails.log.error(err)
                            })
                        }

                        if (record.event.startsWith('Playlist: ')) {
                          await sails.models.logs.create({ attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace('Playlist: ', ''), event: `<strong>Playlist did not air!</strong><br />Playlist: ${record.event.replace('Playlist: ', '')}<br />Scheduled time: ${moment(record.scheduledStart).format('hh:mm A')} - ${moment(record.scheduledEnd).format('hh:mm A')}`, createdAt: moment().toISOString(true) }).fetch()
                            .tolerate((err) => {
                              sails.log.error(err)
                            })
                        }

                        // We do not care about genres
                      }
                    })
                  return true
                } catch (e) {
                  sails.log.error(e)
                  return true
                }
              })
            await Promise.all(maps)
          }
        }

        // Now, load Director hours google calendar
        toTrigger = null
        calendar = google.calendar({ version: 'v3', auth: auth })
        currentdate = moment().startOf('day')
        nextWeekDate = moment().startOf('day').add(28, 'days')
        genreActive = false
        events = await calendar.events.list({
          calendarId: sails.config.custom.GoogleAPI.directorHoursId,
          timeMin: currentdate.toISOString(),
          timeMax: nextWeekDate.toISOString(),
          singleEvents: true,
          maxResults: 1000
        })
        events = events.data.items
        sails.models.directorhours.calendar = events
        sails.log.silly(events)

        // Should have at least one event.
        if (events.length === 0) {
          if (status > 3) { status = 3 }
          issues.push(`Google Calendar Office Hours returned no events for the next 28 days. Is this normal?`)
        } else {
          eventIds = [] // Used for determining which events in memory no longer exist, and therefore should be destroyed

          // Get all directors in the system so we can error if a nonexisting director is on the calendar
          var directorRecords = await sails.models.directors.find()
          var directors = []
          directorRecords.map((record) => directors.push(record.name))

          // Iterate through each returned event from Google Calendar
          for (var i2 = 0; i2 < events.length; i2++) {
            event = events[i2]
            eventIds.push(event.id)

            // Skip events without a start time or without an end time or without a summary
            if (typeof event.start === 'undefined' || typeof event.end === 'undefined' || typeof event.summary === 'undefined') {
              sails.log.verbose(`SKIPPING ${i2}: invalid event parameters.`)
              continue
            }

            if (directors.indexOf(event.summary) === -1 && issues.indexOf(`Office Hours for "${event.summary}" exists on the Office Hours Google Calendar, but this director does not exist in the system. These hours were ignored. Please add this director to the system under DJ Controls -> Manage Directors. Do not add anything other than director office hours to the Office Hours calendar.`) === -1) {
              if (status > 3) { status = 3 }
              issues.push(`Office Hours for "${event.summary}" exists on the Office Hours Google Calendar, but this director does not exist in the system. These hours were ignored. Please add this director to the system under DJ Controls -> Manage Directors. Do not add anything other than director office hours to the Office Hours calendar.`)
            } else {
              // Prepare data structure for event
              criteria = {
                unique: event.id,
                director: event.summary,
                start: event.start.dateTime || event.start.date,
                end: event.end.dateTime || event.end.date
              }

              sails.log.silly(`sails.models.directorhours criteria: ${JSON.stringify(criteria)}`)

              // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
              criteriaB = _.cloneDeep(criteria)
              criteriaC = _.cloneDeep(criteria)

              // Find existing record of event. If does not exist, create it in the Calendar.
              theEvent = await sails.models.directorhours.findOrCreate({ unique: event.id }, criteriaB)
              theEvent2 = await sails.models.timesheet.count({ unique: criteria.unique })
              if (theEvent2 === 0) { theEvent2 = await sails.models.timesheet.create({ unique: criteria.unique, name: criteria.director, scheduledIn: moment(criteria.start).toISOString(true), scheduledOut: moment(criteria.end).toISOString(true), approved: 1 }).fetch() }

              // sails.log.verbose(`WAS NOT created ${event.id} / ${event.summary}`);
              // Check if the event changed. If so, update it and push it out to clients.
              needsUpdate = false
              isChanged = false
              for (var key2 in theEvent) {
                if (Object.prototype.hasOwnProperty.call(theEvent, key2)) {
                  if (typeof criteria[key2] !== 'undefined' && theEvent[key2] !== criteria[key2] && key2 !== 'ID' && key2 !== 'createdAt' && key2 !== `updatedAt`) {
                    // MySQL returns differently for datetimes, so do a secondary check for those keys using moment().
                    if (key2 === `start` && moment(theEvent[key2]).isSame(moment(criteria[key2]))) { continue }
                    if (key2 === `end` && moment(theEvent[key2]).isSame(moment(criteria[key2]))) { continue }

                    if (key2 === `director` && theEvent[key2] !== criteria[key2]) { isChanged = true }
                    if (key2 === `start` && !moment(theEvent[key2]).isSame(moment(criteria[key2]))) { isChanged = true }
                    if (key2 === `end` && !moment(theEvent[key2]).isSame(moment(criteria[key2]))) { isChanged = true }

                    needsUpdate = true
                    break
                  }
                }
              }
              var toUpdate = {}
              if (needsUpdate) {
                // Director changed their hours
                if (isChanged && theEvent.active >= 1) {
                  criteriaC.active = 2
                  await sails.models.logs.create({ attendanceID: null, logtype: 'director-change', loglevel: 'info', logsubtype: criteria.director, event: `<strong>Director changed their office hours via Google Calendar!</strong><br />Director: ${criteria.director}<br />Old hours: ${moment(theEvent.start).format('LLL')} - ${moment(theEvent.end).format('LT')}<br />Updated hours: ${moment(criteria.start).format('LLL')} - ${moment(criteria.end).format('LT')}`, createdAt: moment().toISOString(true) }).fetch()
                    .tolerate((err) => {
                      sails.log.error(err)
                    })
                  toUpdate = { scheduledIn: moment(criteria.start).toISOString(true), scheduledOut: moment(criteria.end).toISOString(true), approved: 2 }
                }
                toUpdate.name = criteria.director
                await sails.models.timesheet.update({ unique: criteria.unique }, toUpdate).fetch()
                await sails.models.directorhours.update({ unique: event.id }, criteriaC).fetch()
              }

              // Check to see if any active timesheet records now fall within director hours. If so, update the timesheets.
              if (moment(criteria.start).isSameOrBefore() && moment(criteria.end).isAfter()) {
                try {
                  var record = await sails.models.timesheet.find({ timeIn: { '!=': null }, name: criteria.director, timeOut: null }).limit(1)
                  if (record.length > 0) {
                    // If the currently clocked in timesheet is not tied to any google calendar events, tie it to this event.
                    if (record[0].unique === null) {
                      // Try to find another record that may have already been created for these hours, and merge it if found.
                      var record2 = await sails.models.timesheet.find({ unique: criteria.unique, approved: { '>': -1 }, timeIn: null, timeOut: null }).limit(1)
                      if (record2.length > 0) { await sails.models.timesheet.destroy({ ID: record2[0].ID }).fetch() }

                      await sails.models.timesheet.update({ name: record[0].name, unique: null, timeIn: { '!=': null }, timeOut: null }, { unique: criteria.unique, scheduledIn: moment(criteria.start).toISOString(true), scheduledOut: moment(criteria.end).toISOString(true) }).fetch()

                      // If the currently clocked in timesheet is tied to a different google calendar event, clock that timesheet out and create a new clocked-in timesheet with the current google calendar event.
                    } else if (record[0].unique !== criteria.unique) {
                      var updater = await sails.models.timesheet.update({ name: criteria.director, timeIn: { '!=': null }, timeOut: null }, { timeOut: moment().toISOString(true) }).fetch()
                      await sails.models.timesheet.create({ unique: criteria.unique, name: criteria.director, scheduledIn: moment(criteria.start).toISOString(true), scheduledOut: moment(criteria.end).toISOString(true), timeIn: moment().toISOString(true), timeOut: null, approved: updater[0].approved }).fetch()
                    }
                  }
                } catch (e) {
                  sails.log.error(e)
                }
              }
            }
          }

          // Update entries in the calendar which passed their end time
          destroyed = await sails.models.directorhours.update({ active: { '>=': 1 }, end: { '<=': moment().toISOString(true) } }, { active: 0 })
            .tolerate(() => {
            })
            .fetch()

          // Destroy entries in the calendar which no longer exist on Google Calendar
          if (events.length > 0) {
            // Destroy events which ended before midnight of today's day.
            await sails.models.directorhours.destroy({ end: { '<': moment().startOf('day').toISOString(true) } })
              .tolerate(() => {
              })
              .fetch()

            // Entries no longer in Google Calendar should be updated to active = -1 to indicate they were canceled.
            cancelled = await sails.models.directorhours.update({ unique: { nin: eventIds }, active: { '>=': 1 } }, { active: -1 })
              .tolerate(() => {
              })
              .fetch()

            // Log office hours cancellations
            if (cancelled.length > 0) {
              maps = cancelled.map(async (cEvent) => {
                await sails.models.timesheet.update({ unique: cEvent.unique }, { unique: cEvent.unique, name: cEvent.director, scheduledIn: moment(cEvent.start).toISOString(true), scheduledOut: moment(cEvent.end).toISOString(true), approved: -1 }).fetch()
                await sails.models.logs.create({ attendanceID: null, logtype: 'director-cancellation', loglevel: 'info', logsubtype: cEvent.director, event: `<strong>Director office hours were cancelled via Google Calendar!</strong><br />Director: ${cEvent.director}<br />Cancelled time: ${moment(cEvent.start).format('LLL')} - ${moment(cEvent.end).format('LT')}`, createdAt: moment().toISOString(true) }).fetch()
                  .tolerate((err) => {
                    sails.log.error(err)
                  })
              })
              await Promise.all(maps)
            }
          }

          // Go through every event record which passed the end time, and log absences where necessary.
          if (destroyed && destroyed.length > 0) {
            maps = destroyed
              .map(async event => {
                try {
                  sails.models.timesheet.findOrCreate({ unique: event.unique }, { unique: event.unique, name: event.director, scheduledIn: moment(event.start).toISOString(true), scheduledOut: moment(event.end).toISOString(true), approved: 0 })
                    .exec(async (err, record, wasCreated) => {
                      if (err) { return false }
                      if (wasCreated || (!wasCreated && record.timeIn === null && record.approved === 1)) {
                        await sails.models.logs.create({ attendanceID: null, logtype: 'director-absent', loglevel: 'warning', logsubtype: record.name, event: `<strong>Director did not come in for scheduled office hours!</strong><br />Director: ${record.name}<br />Scheduled time: ${moment(record.scheduledIn).format('LLL')} - ${moment(record.scheduledOut).format('LT')}`, createdAt: moment().toISOString(true) }).fetch()
                          .tolerate((err) => {
                            sails.log.error(err)
                          })
                        await sails.models.timesheet.update({ ID: record.ID }, { approved: 0 }).fetch()
                      }
                    })
                  return true
                } catch (e) {
                  sails.log.error(e)
                  return true
                }
              })
            await Promise.all(maps)
          }
          if (issues.length === 0) {
            sails.models.status.changeStatus([{ name: 'google-calendar', label: 'Google Calendar', data: `Google Calendar is operational and all events are valid.`, status: 5 }])
          } else {
            // Remove duplicates
            issues = issues.filter((v, i, a) => a.indexOf(v) === i)
            sails.models.status.changeStatus([{ name: 'google-calendar', label: 'Google Calendar', data: issues.join(` `), status: status }])
          }
          return resolve()
        }
      } catch (e) {
        sails.models.status.changeStatus([{ name: 'google-calendar', label: 'Google Calendar', data: `Google Calendar error: ${breakdance(e.message)}. This is likely a network problem or an issue with Google. Until resolved, modifications to the calendar will not reflect in the system; system will use the calendar stored in memory.`, status: 2 }])
        sails.log.error(e)
        return reject(e)
      }
    })
  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`calendar socket: ${data}`)
    sails.sockets.broadcast('calendar', 'calendar', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord }
    sails.log.silly(`calendar socket: ${data}`)
    sails.sockets.broadcast('calendar', 'calendar', data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`calendar socket: ${data}`)
    sails.sockets.broadcast('calendar', 'calendar', data)
    return proceed()
  }

}
