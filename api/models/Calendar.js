/* global Calendar, sails, Playlists, Meta, Genre, moment, _, Status, Playlists_list, Songs, Events, Logs, Attendance, Directorhours, Timesheet */

/**
 * Calendar.js
 *
 * @description :: Container containing Google Calendar events.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

var fs = require('fs');
var readline = require('readline');
var {OAuth2Client} = require('google-auth-library');
var breakdance = require('breakdance');

module.exports = {
    // We do not want this data to be persistent as it is being grabbed from Google Calendar
    datastore: 'ram',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        unique: {
            type: 'string'
        },

        active: {
            type: 'boolean',
            defaultsTo: true
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

        verify_message: {
            type: 'string'
        },

        verify_titleHTML: {
            type: 'string'
        }
    },

    calendar: [],

    // Authenticate to Google Calendar
    // Google auth does not seem to support async/promises yet, so we need to have a sync function for that
    preLoadEvents: function (ignoreChangingState = false) {
        return new Promise((resolve, reject) => {
            var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
            var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
                    process.env.USERPROFILE) + '/.credentials/';
            var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

            var authenticate = function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        var credentials = await getClientSecret();
                        if (typeof credentials === 'undefined' || credentials === null)
                        {
                            return reject(new Error('Empty credentials file.'));
                        }
                    } catch (e) {
                        return reject(e);
                    }
                    var authorizePromise = authorize(credentials);
                    authorizePromise.then(resolve);
                    authorizePromise.catch(reject);
                });
            };

            var getNewToken = function (oauth2Client) {
                return new Promise((resolve, reject) => {
                    var authUrl = oauth2Client.generateAuthUrl({
                        access_type: 'offline',
                        scope: SCOPES
                    });
                    console.log('Authorize this app by visiting this url: \n ', authUrl);
                    var rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
                    rl.question('\n\nEnter the code from that page here: ', (code) => {
                        rl.close();
                        oauth2Client.getToken(code, (err, token) => {
                            if (err) {
                                console.log('Error while trying to retrieve access token', err);
                                return reject();
                            }
                            oauth2Client.credentials = token;
                            storeToken(token);
                            return resolve(oauth2Client);
                        });
                    });
                });
            };
            var authorize = function (credentials) {
                return new Promise((resolve, reject) => {
                    try {
                        var clientSecret = credentials.installed.client_secret;
                        var clientId = credentials.installed.client_id;
                        var redirectUrl = credentials.installed.redirect_uris[0];
                        var oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl);
                        // Check if we have previously stored a token.
                    } catch (e) {
                        return reject(e);
                    }
                    fs.readFile(TOKEN_PATH, (err, token) => {
                        if (err) {
                            getNewToken(oauth2Client).then((oauth2ClientNew) => {
                                return resolve(oauth2ClientNew);
                            }, (err) => {
                                return reject(err);
                            });
                        } else {
                            oauth2Client.credentials = JSON.parse(token);
                            return resolve(oauth2Client);
                        }
                    });
                });
            };

            var storeToken = function (token) {
                try {
                    fs.mkdirSync(TOKEN_DIR);
                } catch (err) {
                    if (err.code !== 'EEXIST') {
                        throw err;
                    }
                }
                fs.writeFile(TOKEN_PATH, JSON.stringify(token));
                console.log('Token stored to ' + TOKEN_PATH);
            };
            // Load client secrets from a local file.
            var getClientSecret = function () {
                return new Promise((resolve, reject) => {
                    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
                        if (err) {
                            return reject(err);
                        }

                        if (typeof content === 'undefined' || content === null)
                        {
                            return reject(new Error('Empty credentials file.'));
                        }
                        // Authorize a client with the loaded credentials, then call the
                        // Google Calendar API.
                        return resolve(JSON.parse(content));
                    });
                });
            };

            authenticate()
                    .then(async (auth) => {
                        await Calendar.loadEvents(auth, ignoreChangingState);
                        return resolve();
                    })
                    .catch(err => {
                        sails.log.error(err);
                        Status.changeStatus([{name: 'google-calendar', label: 'Google Calendar', data: 'Google Calendar Error: ' + err.message, status: 2}]);
                        return reject(err);
                    });
        });
    },

    // Get calendar events
    loadEvents: function (auth, ignoreChangingState) {
        return new Promise(async (resolve, reject) => {
            sails.log.verbose(`Calendar.loadEvents called`);
            try {

                // First, calendarID for WWSU Events
                var {google} = require('googleapis');
                var toTrigger = null;
                var calendar = google.calendar({version: 'v3', auth: auth});
                var currentdate = moment().startOf('day');
                var nextWeekDate = moment().startOf('day').add(8, 'days');
                var badEvent = false;
                //formatted.push(currentdate.format("YYYY-MM-DDTHH:mm:ssZ"));
                //formatted.push(tomorrowdate.format("YYYY-MM-DDTHH:mm:ssZ"));
                var colors = await calendar.colors.get();
                var genreActive = false;
                colors = colors.data.event;
                var events = await calendar.events.list({
                    calendarId: sails.config.custom.GoogleAPI.calendarId,
                    timeMin: currentdate.toISOString(),
                    timeMax: nextWeekDate.toISOString(),
                    singleEvents: true
                            //orderBy: 'startTime' does not work correctly, so ignoring as it's not a big deal if events are not in time order
                });
                events = events.data.items;
                Calendar.calendar = events;
                sails.log.silly(events);
                // Alert if no events returned; this may be a problem. Also exit.
                if (events.length === 0) {
                    Status.changeStatus([{name: 'google-calendar', label: 'Google Calendar', data: 'No events detected for the next 7 days. Is this normal?', status: 3}]);
                    return resolve();
                } else {
                    // Iterate through each returned event from Google Calendar
                    var eventIds = []; // Used for determining which events in memory no longer exist, and therefore should be destroyed

                    var playlists = {};
                    var djevents = {};
                    var retData = [];

                    // Load all the playlists into memory
                    var playlistsR = await Playlists.find();
                    sails.log.verbose(`Retrieved Playlists records: ${playlistsR.length}`);
                    sails.log.silly(playlistsR);

                    // Determine duration of the tracks in every playlist
                    var maps = playlistsR.map(async playlist => {
                        try {
                            var playlistSongs = [];
                            var playlistDuplicates = 0;
                            var duplicateTracks = [];

                            // Get the playlist tracks
                            var pTracks = await Playlists_list.find({pID: playlist.ID});
                            sails.log.verbose(`Retrieved Playlists_list records: ${pTracks.length}`);
                            sails.log.silly(pTracks);

                            var temp = [];

                            // Check for duplicates
                            pTracks.map(track => {
                                if (temp.indexOf(track.sID) > -1)
                                    playlistDuplicates++;
                                temp.push(track.sID);
                            });

                            // Get the song records for each playlist track
                            var songs = await Songs.find({ID: temp});
                            sails.log.verbose(`Retrieved Songs records: ${songs.length}`);
                            sails.log.silly(songs);

                            var duration = 0;

                            // Determine duration, ignoring duplicates
                            songs.map(song => {
                                if (playlistSongs.indexOf(`${song.artist} - ${song.title}`) > -1)
                                {
                                    playlistDuplicates++;
                                    duplicateTracks.push(`${song.artist} - ${song.title}`);
                                } else {
                                    duration += song.duration;
                                }
                                playlistSongs.push(`${song.artist} - ${song.title}`);
                            });

                            // Generate playlist object
                            playlists[playlist.name] = ({ID: playlist.ID, name: playlist.name, duration: duration, duplicates: playlistDuplicates, duplicateTracks: duplicateTracks.join("<br />")});
                            return true;
                        } catch (e) {
                            throw e;
                        }
                    });
                    await Promise.all(maps);

                    // Load all manual RadioDJ events into memory
                    var djeventsR = await Events.find({type: 3});
                    sails.log.verbose(`Retrieved Events records: ${djeventsR.length}`);
                    sails.log.silly(djeventsR);

                    djeventsR.map(event => djevents[event.name] = event);

                    // Loop through each calendar event
                    for (var i = 0; i < events.length; i++) {
                        var event = events[i];
                        eventIds.push(event.id);

                        // Skip events without a start time or without an end time or without a summary
                        if (typeof event.start === 'undefined' || typeof event.end === 'undefined' || typeof event.summary === 'undefined')
                        {
                            sails.log.verbose(`SKIPPING ${i}: invalid event parameters.`);
                            continue;
                        }

                        // Prepare data structure for event
                        var criteria = {
                            unique: event.id,
                            title: event.summary,
                            description: (typeof event.description !== 'undefined') ? breakdance(event.description) : '',
                            start: event.start.dateTime || event.start.date,
                            end: event.end.dateTime || event.end.date
                        };
                        criteria.allDay = (moment(criteria.start).isSameOrBefore(moment().startOf('day')) && moment(criteria.end).isSameOrAfter(moment().startOf('day').add(1, 'days')));
                        if (event.colorId && event.colorId in colors)
                        {
                            criteria.color = colors[event.colorId].background;
                        } else if (event.summary.startsWith("Show: ")) {
                            criteria.color = '#D50000';
                        } else {
                            criteria.color = '#607D8B';
                        }

                        // Verify the event
                        criteria.verify = 'Manual';
                        criteria.verify_message = 'This was not detected as an event dealing with OnAir programming. If this event was meant to trigger OnAir programming, <strong>please ensure the event title formatting is correct and that everything is spelled correctly</strong>.';
                        criteria.verify_titleHTML = event.summary;

                        // Live shows
                        if (criteria.title.startsWith("Show: ")) {
                            var summary = criteria.title.replace('Show: ', '');
                            var temp2 = summary.split(" - ");

                            // Check proper formatting so system can determine show host from show name
                            if (temp2.length === 2)
                            {
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Show</span>: <span style="background: rgba(255, 255, 0, 0.2);">${temp2[0]}</span> - <span style="background: rgba(0, 255, 0, 0.2);">${temp2[1]}</span>`;
                                criteria.verify = 'Valid';
                                criteria.verify_message = `Valid. DJ in yellow, show in green.`;
                            } else {
                                badEvent = true;
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Show</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                                criteria.verify = 'Invalid';
                                criteria.verify_message = `Invalid; cannot determine DJ and show. <strong>Ensure the event title separates DJ handle from show name with a space hyphen space (" - ")</strong>.`;
                            }

                            // Remote broadcasts
                        } else if (criteria.title.startsWith("Remote: ")) {
                            var summary = criteria.title.replace('Remote: ', '');
                            var temp2 = summary.split(" - ");

                            // Check proper formatting so system can determine broadcast host from broadcastn name
                            if (temp2.length === 2)
                            {
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Remote</span>: <span style="background: rgba(255, 255, 0, 0.2);">${temp2[0]}</span> - <span style="background: rgba(0, 255, 0, 0.2);">${temp2[1]}</span>`;
                                criteria.verify = 'Valid';
                                criteria.verify_message = `Valid. Host / org in yellow, show name in green.`;
                            } else {
                                badEvent = true;
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Remote</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                                criteria.verify = 'Invalid';
                                criteria.verify_message = `Invalid; cannot determine host and show. <strong>Ensure the event title separates host / organization from broadcast name with a space hyphen space (" - ")</strong>.`;
                            }

                            // Sports broadcast
                        } else if (criteria.title.startsWith("Sports: ")) {
                            var summary = criteria.title.replace('Sports: ', '');

                            // Ensure the name of the sport is one that is implemented in the system.
                            if (sails.config.custom.sports.indexOf(summary) > -1)
                            {
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Sports</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`;
                                criteria.verify = 'Valid';
                                criteria.verify_message = `Valid. Sport in green.`;
                            } else {
                                badEvent = true;
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Sports</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                                criteria.verify = 'Invalid';
                                criteria.verify_message = `Invalid; sport is not configured in Node. <strong>Please ensure you spelled the sport correctly (case sensitive), and the sport exists in the system</strong>.`;
                            }

                            // Prerecord (via RadioDJ Playlists)
                        } else if (criteria.title.startsWith("Prerecord: ")) {
                            var summary = criteria.title.replace('Prerecord: ', '');
                            var eventLength = (moment(criteria.end).diff(moment(criteria.start)) / 1000);
                            criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Prerecord</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                            criteria.verify = 'Invalid';
                            criteria.verify_message = `Invalid; playlist does not exist in RadioDJ. <strong>Please ensure the playlist in red exists in RadioDJ and that you spelled it correctly</strong>.`;

                            // Check to see a playlist exists
                            if (typeof playlists[summary] !== 'undefined')
                            {
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Prerecord</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`;

                                // Check to see if the length of the playlists are over 15 minutes too short
                                if ((eventLength - 900) >= (playlists[summary].duration * 1.05)) // * 1.05 because this assumes 1 minute of break for every 20 minutes of programming
                                {
                                    criteria.verify = 'Check';
                                    criteria.verify_message = `Valid, but duration is shorter than scheduled time. To fix, <strong>add about ${moment.duration((eventLength - (playlists[summary].duration * 1.05)), 'seconds').humanize()} more audio</strong> to the playlist. ${playlists[summary].duplicates > 0 ? `<strong>There were ${playlists[summary].duplicates} duplicate tracks detected.</strong> Duplicate tracks will get skipped.` : ''}`;

                                    // Check to see if the playlist is over 5 minutes too long
                                } else if ((eventLength + 300) <= (playlists[summary].duration * 1.05))
                                {
                                    criteria.verify = 'Check';
                                    criteria.verify_message = `Valid, but duration exceeds scheduled time. <strong>The prerecord could run over the end time by about ${moment.duration(((playlists[summary].duration * 1.05) - eventLength), 'seconds').humanize()}</strong>. ${playlists[summary].duplicates > 0 ? `<strong>There were ${playlists[summary].duplicates} duplicate tracks detected.</strong> Duplicate tracks will get skipped.` : ''}`;
                                } else if (playlists[summary].duplicates > 0) {
                                    criteria.verify = 'Check';
                                    criteria.verify_message = `Valid, but duplicates detected. <strong>There were ${playlists[summary].duplicates} duplicate tracks detected.</strong> Duplicate tracks will get skipped.`;
                                } else {
                                    criteria.verify = 'Valid';
                                    criteria.verify_message = `Valid; playlist in green.`;
                                }
                            }

                            if (criteria.verify === 'Invalid')
                                badEvent = true;

                            // Playlists (RadioDJ)
                        } else if (criteria.title.startsWith("Playlist: ")) {
                            var summary = criteria.title.replace('Playlist: ', '');
                            var eventLength = (moment(criteria.end).diff(moment(criteria.start)) / 1000);
                            criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Playlist</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                            criteria.verify = 'Invalid';
                            criteria.verify_message = `Invalid; playlist does not exist in RadioDJ. <strong>Please ensure the playlist in red exists in RadioDJ and that you spelled it correctly</strong>.`;

                            // Check to see that playlist exists
                            if (typeof playlists[summary] !== 'undefined')
                            {
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Playlist</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`;

                                // Check to see if the playlist duration is shorter than the event duration
                                if (eventLength <= (playlists[summary].duration * 1.05) && playlists[summary].duplicates === 0)
                                {
                                    criteria.verify = 'Valid';
                                    criteria.verify_message = `Valid; playlist in green.`;
                                } else if (playlists[summary].duplicates === 0) {
                                    criteria.verify = 'Check';
                                    criteria.verify_message = `Valid, but duration is shorter than scheduled time. To fix, <strong>add about ${moment.duration((eventLength - (playlists[summary].duration * 1.05)), 'seconds').humanize()} more audio</strong> to the playlist.`;
                                } else if (eventLength <= (playlists[summary].duration * 1.05)) {
                                    criteria.verify = 'Check';
                                    criteria.verify_message = `Valid, but duplicate tracks detected. ${playlists[summary].duplicates > 0 ? `<strong>There were ${playlists[summary].duplicates} duplicate tracks detected.</strong> Duplicate tracks will get skipped` : ''}`;
                                } else {
                                    criteria.verify = 'Check';
                                    criteria.verify_message = `Valid, but duration is shorter than scheduled time, and duplicate tracks detected. To fix, <strong>add about ${moment.duration((eventLength - (playlists[summary].duration * 1.05)), 'seconds').humanize()} more audio</strong> to the playlist. ${playlists[summary].duplicates > 0 ? `<strong>There were ${playlists[summary].duplicates} duplicate tracks detected.</strong> Duplicate tracks will get skipped.` : ''}`;
                                }
                            }

                            if (criteria.verify === 'Invalid')
                                badEvent = true;

                            // Genre rotations (via manual events in RadioDJ)
                        } else if (criteria.title.startsWith("Genre: ")) {
                            var summary = criteria.title.replace('Genre: ', '');
                            criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Genre</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                            criteria.verify = 'Invalid';
                            criteria.verify_message = `Invalid; event with same name does not exist in RadioDJ. <strong>Please ensure there is an event with the same name in RadioDJ.</strong>. The event should trigger a rotation change in RadioDJ when executed.`;

                            // Check to see if the manual event exists in RadioDJ
                            if (typeof djevents[summary] !== 'undefined')
                            {
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Genre</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`;

                                // Check to see the event is active, and there is a "Load Rotation" action in the event
                                if (djevents[summary].data.includes("Load Rotation") && djevents[summary].enabled === "True")
                                {
                                    criteria.verify = `Valid`;
                                    criteria.verify_message = `Valid; genre in green.`;

                                    // Event is enabled, but does not have a Load Rotation event
                                } else if (djevents[summary].enabled === "True") {
                                    criteria.verify = 'Invalid';
                                    criteria.verify_message = `Invalid; a "Load Rotation" action does not exist in the RadioDJ event. <strong>To ensure rotation changes, make sure the RadioDJ event has a "Load Rotation" action.</strong>`;

                                    // Event is not enabled
                                } else {
                                    criteria.verify = 'Invalid';
                                    criteria.verify_message = `Invalid; the event in RadioDJ is disabled. <strong>Please enable the manual event in RadioDJ</strong>.`;
                                }
                            }

                            if (criteria.verify === 'Invalid')
                                badEvent = true;
                        } else {
                            criteria.verify_titleHTML = `<span style="background: rgba(128, 128, 128, 0.2);">${criteria.verify_titleHTML}</span>`;
                        }


                        sails.log.silly(`Event criteria: ${JSON.stringify(criteria)}`);

                        // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
                        var criteriaB = _.cloneDeep(criteria);

                        // TODO: Make so that new records do not also trigger an update

                        // Find existing record of event. If does not exist, create it in the Calendar.
                        var theEvent = await Calendar.findOrCreate({unique: event.id}, criteriaB);

                        //sails.log.verbose(`WAS NOT created ${event.id} / ${event.summary}`);
                        // Check if the event changed. If so, update it and push it out to clients.
                        var needsUpdate = false;
                        for (var key in theEvent)
                        {
                            if (theEvent.hasOwnProperty(key))
                            {
                                if (typeof criteria[key] !== 'undefined' && theEvent[key] !== criteria[key] && key !== 'ID')
                                {
                                    needsUpdate = true;
                                    break;
                                }
                            }
                        }
                        if (needsUpdate)
                        {
                            await Calendar.update({unique: event.id}, criteria).fetch();
                        }

                        // Check to see if any of the events are triggering events, and if so, see if it trumps the priority of the current event to be triggered.
                        // Prerecords should take priority over playlists, which take priority over genres.
                        if (moment(criteria.start).isSameOrBefore() && moment(criteria.end).isAfter())
                        {
                            try {
                                // Do not trigger playlists or prerecords if they were already triggered, unless we are restarting them
                                if (moment(criteria.start).isAfter(moment(Meta['A'].playlist_played)) || ignoreChangingState)
                                {
                                    if (event.summary.startsWith("Playlist: ") && (toTrigger === null || toTrigger.priority >= 2))
                                    {
                                        toTrigger = {priority: 2, event: event.summary.replace('Playlist: ', ''), resume: false, type: 0, description: ''};
                                    }
                                    if (event.summary.startsWith("Prerecord: ") && (toTrigger === null || toTrigger.priority >= 1))
                                    {
                                        toTrigger = {priority: 1, event: event.summary.replace('Prerecord: ', ''), resume: false, type: 1, description: criteria.description};
                                    }
                                }
                                // Do not re-trigger an already active genre, unless we are restarting it
                                if (ignoreChangingState || Meta['A'].genre !== event.summary.replace('Genre: ', ''))
                                {
                                    if (event.summary.startsWith("Genre: ") && (toTrigger === null || toTrigger.priority >= 3))
                                    {
                                        toTrigger = {priority: 3, event: event.summary.replace('Genre: ', '')};
                                    }
                                }
                                // Mark when we are supposed to be in genre rotation
                                if (event.summary.startsWith("Genre: "))
                                    genreActive = true;
                            } catch (e) {
                                sails.log.error(e);
                            }
                        }
                    }

                    sails.log.debug(`toTrigger: ${JSON.stringify(toTrigger)}`);

                    // Trigger playlist or genre, if there is one to trigger
                    if (toTrigger !== null && toTrigger.priority < 3)
                    {
                        await sails.helpers.playlists.start(toTrigger.event, toTrigger.resume, toTrigger.type, toTrigger.description, ignoreChangingState);
                    } else if (toTrigger !== null && toTrigger.priority === 3)
                    {
                        await sails.helpers.genre.start(toTrigger.event, ignoreChangingState);
                    }

                    // No genre events active right now? Switch back to regular automation.
                    if (toTrigger === null && !genreActive && Meta['A'].genre !== 'Default')
                    {
                        await sails.helpers.genre.start('Default', ignoreChangingState);
                    }

                    // Update entries in the calendar which passed their end time
                    var destroyed = await Calendar.update({active: true, end: {"<=": moment().toISOString(true)}}, {active: false})
                            .tolerate((err) => {
                            })
                            .fetch();

                    // Destroy entries in the calendar which no longer exist on Google Calendar
                    if (events.length > 0)
                    {
                        await Calendar.destroy({unique: {'nin': eventIds}})
                                .tolerate((err) => {
                                })
                                .fetch();

                    }

                    // Go through every event record which passed the end time, and log absences where necessary.
                    if (destroyed && destroyed.length > 0)
                    {
                        var maps = destroyed
                                // Do not log attendance for invalid or manual events
                                .filter(event => event.verify === "Valid" || event.verify === "Check")
                                .map(async event => {
                                    try {
                                        var dj = event.title;
                                        if (dj.includes(" - ") && dj.includes(": "))
                                        {
                                            dj = dj.split(" - ")[0];
                                            dj = dj.substring(dj.indexOf(": ") + 2);
                                        } else {
                                            dj = null;
                                        }
                                        Attendance.findOrCreate({unique: event.unique}, {unique: event.unique, DJ: dj, event: event.title, scheduledStart: moment(event.start).toISOString(true), scheduledEnd: moment(event.end).toISOString(true)})
                                                .exec(async(err, record, wasCreated) => {
                                                    // if wasCreated, then the event never aired; Log an absence.
                                                    if (wasCreated)
                                                    {
                                                        if (record.event.startsWith("Show: "))
                                                        {
                                                            await Logs.create({attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace("Show: ", ""), event: `Show did not air!<br />Show: ${record.event.replace("Show: ", "")}<br />Scheduled time: ${moment(record.scheduledStart).format("hh:mm A")} - ${moment(record.scheduledEnd).format("hh:mm A")}`, createdAt: moment().toISOString(true)})
                                                                    .tolerate((err) => {
                                                                        sails.log.error(err);
                                                                    });
                                                        }

                                                        if (record.event.startsWith("Prerecord: "))
                                                        {
                                                            await Logs.create({attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace("Prerecord: ", ""), event: `Prerecord did not air!<br />Prerecord: ${record.event.replace("Prerecord: ", "")}<br />Scheduled time: ${moment(record.scheduledStart).format("hh:mm A")} - ${moment(record.scheduledEnd).format("hh:mm A")}`, createdAt: moment().toISOString(true)})
                                                                    .tolerate((err) => {
                                                                        sails.log.error(err);
                                                                    });
                                                        }

                                                        if (record.event.startsWith("Remote: "))
                                                        {
                                                            await Logs.create({attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace("Remote: ", ""), event: `Remote broadcast did not air!<br />Remote: ${record.event.replace("Remote: ", "")}<br />Scheduled time: ${moment(record.scheduledStart).format("hh:mm A")} - ${moment(record.scheduledEnd).format("hh:mm A")}`, createdAt: moment().toISOString(true)})
                                                                    .tolerate((err) => {
                                                                        sails.log.error(err);
                                                                    });
                                                        }

                                                        if (record.event.startsWith("Sports: "))
                                                        {
                                                            await Logs.create({attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace("Sports: ", ""), event: `Sports broadcast did not air!<br />Sport: ${record.event.replace("Sports: ", "")}<br />Scheduled time: ${moment(record.scheduledStart).format("hh:mm A")} - ${moment(record.scheduledEnd).format("hh:mm A")}`, createdAt: moment().toISOString(true)})
                                                                    .tolerate((err) => {
                                                                        sails.log.error(err);
                                                                    });
                                                        }

                                                        if (record.event.startsWith("Playlist: "))
                                                        {
                                                            await Logs.create({attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace("Playlist: ", ""), event: `Playlist did not air!<br />Playlist: ${record.event.replace("Playlist: ", "")}<br />Scheduled time: ${moment(record.scheduledStart).format("hh:mm A")} - ${moment(record.scheduledEnd).format("hh:mm A")}`, createdAt: moment().toISOString(true)})
                                                                    .tolerate((err) => {
                                                                        sails.log.error(err);
                                                                    });
                                                        }

                                                        // We do not care about genres
                                                    }
                                                    return true;
                                                });
                                    } catch (e) {
                                        sails.log.error(e);
                                        return true;
                                    }
                                });
                        await Promise.all(maps);
                    }


                    if (badEvent)
                    {
                        Status.changeStatus([{name: 'google-calendar', label: 'Google Calendar', data: 'Invalid events in Google Calendar. Please see DJ Controls administration / Calendar Verification.', status: 3}]);
                    } else {
                        Status.changeStatus([{name: 'google-calendar', label: 'Google Calendar', data: 'Operational', status: 5}]);
                    }
                }



                // Now, load Director hours google calendar
                var {google} = require('googleapis');
                var toTrigger = null;
                var calendar = google.calendar({version: 'v3', auth: auth});
                var currentdate = moment().startOf('day');
                var nextWeekDate = moment().startOf('day').add(8, 'days');
                var genreActive = false;
                var events = await calendar.events.list({
                    calendarId: sails.config.custom.GoogleAPI.directorHoursId,
                    timeMin: currentdate.toISOString(),
                    timeMax: nextWeekDate.toISOString(),
                    singleEvents: true
                });
                events = events.data.items;
                Directorhours.calendar = events;
                sails.log.silly(events);

                // Should have at least one event.
                if (events.length === 0) {
                    Status.changeStatus([{name: 'google-calendar', label: 'Google Calendar', data: 'No director hours are listed. Is this normal?', status: 3}]);
                    return resolve();
                } else {
                    var eventIds = []; // Used for determining which events in memory no longer exist, and therefore should be destroyed
                    var retData = [];

                    // Iterate through each returned event from Google Calendar
                    for (var i = 0; i < events.length; i++) {
                        var event = events[i];
                        eventIds.push(event.id);

                        // Skip events without a start time or without an end time or without a summary
                        if (typeof event.start === 'undefined' || typeof event.end === 'undefined' || typeof event.summary === 'undefined')
                        {
                            sails.log.verbose(`SKIPPING ${i}: invalid event parameters.`);
                            continue;
                        }

                        // Prepare data structure for event
                        var criteria = {
                            unique: event.id,
                            director: event.summary,
                            start: event.start.dateTime || event.start.date,
                            end: event.end.dateTime || event.end.date
                        };

                        sails.log.silly(`Directorhours criteria: ${JSON.stringify(criteria)}`);

                        // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
                        var criteriaB = _.cloneDeep(criteria);

                        // TODO: Make so that new records do not also trigger an update

                        // Find existing record of event. If does not exist, create it in the Calendar.
                        var theEvent = await Directorhours.findOrCreate({unique: event.id}, criteriaB);

                        //sails.log.verbose(`WAS NOT created ${event.id} / ${event.summary}`);
                        // Check if the event changed. If so, update it and push it out to clients.
                        var needsUpdate = false;
                        for (var key in theEvent)
                        {
                            if (theEvent.hasOwnProperty(key))
                            {
                                if (typeof criteria[key] !== 'undefined' && theEvent[key] !== criteria[key] && key !== 'ID')
                                {
                                    needsUpdate = true;
                                    break;
                                }
                            }
                        }
                        if (needsUpdate)
                        {
                            await Directorhours.update({unique: event.id}, criteria).fetch();
                        }
                    }

                    // Update entries in the calendar which passed their end time
                    var destroyed = await Directorhours.update({active: true, end: {"<=": moment().toISOString(true)}}, {active: false})
                            .tolerate((err) => {
                            })
                            .fetch();

                    // Destroy entries in the calendar which no longer exist on Google Calendar
                    if (events.length > 0)
                    {
                        await Directorhours.destroy({unique: {'nin': eventIds}})
                                .tolerate((err) => {
                                })
                                .fetch();

                    }

                    // Go through every event record which passed the end time, and log absences where necessary.
                    // TODO: DOES NOT WORK YET
                    /*
                     if (destroyed && destroyed.length > 0)
                     {
                     sails.log.debug(`Calling asyncForEach in Calendar for looping through calendar records that expires for Director Hours.`);
                     await sails.helpers.asyncForEach(destroyed, function (event, index) {
                     return new Promise(async (resolve2, reject2) => {
                     try {
                     var records = Timesheet.find({name: event.director, time_in: {'>=': moment().startOf('day').toISOString(true)}});
                     var absent = true;
                     if (records.length > 0)
                     {
                     records.forEach(function (therecord) {
                     if (moment(therecord.time_in).isSameOrAfter(moment(event.start)) && moment(therecord.time_in).isSameOrBefore(moment(event.end)))
                     {
                     absent = false;
                     }
                     if (moment(therecord.time_out).isSameOrBefore(moment(event.end)) && moment(therecord.time_out).isSameOrAfter(moment(event.start)))
                     {
                     absent = false;
                     }
                     });
                     }
                     if (absent)
                     {
                     await Logs.create({attendanceID: null, logtype: 'absent-director', loglevel: 'warning', logsubtype: event.director, event: `A director did not come in for scheduled office hours!<br />Director: ${event.director}<br />Scheduled time: ${moment(event.start).format("hh:mm A")} - ${moment(event.end).format("hh:mm A")}`, createdAt: moment().toISOString(true)})
                     .tolerate((err) => {
                     sails.log.error(err);
                     });
                     }
                     
                     return resolve2(false);
                     } catch (e) {
                     sails.log.error(e);
                     return resolve2(false);
                     }
                     });
                     });
                     }
                     */

                    if (!badEvent)
                        Status.changeStatus([{name: 'google-calendar', label: 'Google Calendar', data: 'Operational', status: 5}]);

                    return resolve();
                }
            } catch (e) {
                Status.changeStatus([{name: 'google-calendar', label: 'Google Calendar', data: 'Google Calendar error: ' + e.message, status: 2}]);
                sails.log.error(e);
                return reject(e);
            }
        });
    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`calendar socket: ${data}`);
        sails.sockets.broadcast('calendar', 'calendar', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.log.silly(`calendar socket: ${data}`);
        sails.sockets.broadcast('calendar', 'calendar', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`calendar socket: ${data}`);
        sails.sockets.broadcast('calendar', 'calendar', data);
        return proceed();
    }

};

