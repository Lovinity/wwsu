/* global Calendar, sails, Playlists, Meta, Genre, moment, _, Status, Playlists_list, Songs, Events, Logs, Attendance */

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

    loadEvents: function (auth, ignoreChangingState) {
        return new Promise(async (resolve, reject) => {
            sails.log.verbose(`Calendar.loadEvents called`);
            try {
                var {google} = require('googleapis');
                var toTrigger = null;
                var calendar = google.calendar({version: 'v3', auth: auth});
                var currentdate = moment().startOf('day');
                var nextWeekDate = moment().startOf('day').add(7, 'days');
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
                if (events.length === 0) {
                    Status.changeStatus([{name: 'google-calendar', label: 'Google Calendar', data: 'Google Calendar is operational, but there are no events in the calendar in the next 7 days.', status: 3}]);
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
                    sails.log.debug(`Calling asyncForEach in Calendar for determining duration of playlists`);
                    await sails.helpers.asyncForEach(playlistsR, function (playlist, index) {
                        return new Promise(async (resolve2, reject2) => {
                            try {
                                var playlistSongs = [];
                                var playlistDuplicates = 0;
                                var duplicateTracks = [];

                                var pTracks = await Playlists_list.find({pID: playlist.ID});
                                sails.log.verbose(`Retrieved Playlists_list records: ${pTracks.length}`);
                                sails.log.silly(pTracks);

                                var temp = [];
                                pTracks.forEach(function (track) {
                                    if (temp.indexOf(track.sID) > -1)
                                        playlistDuplicates++;
                                    temp.push(track.sID);
                                });

                                var songs = await Songs.find({ID: temp});
                                sails.log.verbose(`Retrieved Songs records: ${songs.length}`);
                                sails.log.silly(songs);

                                var duration = 0;
                                songs.forEach(function (song) {
                                    if (playlistSongs.indexOf(`${song.artist} - ${song.title}`) > -1)
                                    {
                                        playlistDuplicates++;
                                        duplicateTracks.push(`${song.artist} - ${song.title}`);
                                    } else {
                                        duration += song.duration;
                                    }
                                    playlistSongs.push(`${song.artist} - ${song.title}`);
                                });

                                playlists[playlist.name] = ({ID: playlist.ID, name: playlist.name, duration: duration, duplicates: playlistDuplicates, duplicateTracks: duplicateTracks.join("<br />")});
                                return resolve2(false);
                            } catch (e) {
                                return reject2(e);
                            }
                        });
                    });

                    // Load all manual RadioDJ events into memory
                    var djeventsR = await Events.find({type: 3});
                    sails.log.verbose(`Retrieved Events records: ${djeventsR.length}`);
                    sails.log.silly(djeventsR);

                    djeventsR.forEach(function (event) {
                        djevents[event.name] = event;
                    });

                    var badEvent = false;
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
                                criteria.verify_message = `This is a valid live show. Detected DJ handle in yellow, show name in green.`;
                            } else {
                                badEvent = true;
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Show</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                                criteria.verify = 'Invalid';
                                criteria.verify_message = `Although this was detected as a show, system could not determine what the DJ handle is versus what the show name is. <strong>Ensure the event title separates DJ handle from show name with a space hyphen space (" - ")</strong>. There should only be one of these in the title.`;
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
                                criteria.verify_message = `This is a valid remote broadcast. Detected host / organization in yellow, broadcast name in green.`;
                            } else {
                                badEvent = true;
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Remote</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                                criteria.verify = 'Invalid';
                                criteria.verify_message = `Although this was detected as a remote broadcast, system could not determine what the host / organization is versus what the name of the broadcast is. <strong>Ensure the event title separates host / organization from broadcast name with a space hyphen space (" - ")</strong>. There should only be one of these in the title.`;
                            }

                            // Sports broadcast
                        } else if (criteria.title.startsWith("Sports: ")) {
                            var summary = criteria.title.replace('Sports: ', '');

                            // Ensure the name of the sport is one that is implemented in the system.
                            if (sails.config.custom.sports.indexOf(summary) > -1)
                            {
                                criteria.verify_titleHTML.title = `<span style="background: rgba(0, 0, 255, 0.2);">Sports</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`;
                                criteria.verify = 'Valid';
                                criteria.verify_message = `This is a valid sports broadcast. Sport in green.`;
                            } else {
                                badEvent = true;
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Sports</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                                criteria.verify = 'Invalid';
                                criteria.verify_message = `Although this was detected as a sports broadcast, the sport provided was not detected as a valid sport in the system. <strong>Please ensure you spelled the sport correctly, began the gender and the sport each with a capital letter, and the sport exists in the system</strong>. Please contact the engineer if this is a sport we have not programmed into the system yet. If this is not fixed, appropriate openers, closers, and liners may not play during the broadcast!`;
                            }

                            // Prerecord (via RadioDJ Playlists)
                        } else if (criteria.title.startsWith("Prerecord: ")) {
                            var summary = criteria.title.replace('Prerecord: ', '');
                            var eventLength = (moment(criteria.end).diff(moment(criteria.start)) / 1000);
                            criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Prerecord</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                            criteria.verify = 'Invalid';
                            criteria.verify_message = `Although this was detected as a prerecord, the playlist name highlighted in red does not exist in RadioDJ. <strong>Please ensure the playlist exists and that you spelled it correctly</strong>. If this is not fixed, the prerecord probably will not air!`;

                            // Check to see a playlist exists
                            if (typeof playlists[summary] !== 'undefined')
                            {
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Prerecord</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`;

                                // Check to see if the length of the playlists are over 15 minutes too short
                                if ((eventLength - 900) >= (playlists[summary].duration * 1.05)) // * 1.05 because this assumes 1 minute of break for every 20 minutes of programming
                                {
                                    criteria.verify = 'Check';
                                    criteria.verify_message = `This is a valid prerecord, and the playlist highlighted in green exists in RadioDJ. However, the duration of the tracks in the saved playlist is significantly short. To avoid this segment ending early, <strong>add about ${moment.duration((eventLength - (playlists[summary].duration * 1.05)), 'seconds').humanize()} more audio</strong> to the playlist. ${playlists[summary].duplicates > 0 ? `There were ${playlists[summary].duplicates} duplicate tracks detected. Since duplicates get filtered out in the queue, they were not counted towards the playlist duration. <strong>You may want to remove duplicates from this playlist since they will not play</strong>. The duplicate tracks detected are the following: <br>${playlists[summary].duplicateTracks}` : ''}`;

                                    // Check to see if the playlist is over 5 minutes too long
                                } else if ((eventLength + 300) <= (playlists[summary].duration * 1.05))
                                {
                                    criteria.verify = 'Check';
                                    criteria.verify_message = `This is a valid prerecord, and the playlist highlighted in green exists in RadioDJ. However, the duration of the tracks in the saved playlist is too long. This could prevent other DJs from signing on the air, or other segments from playing. If this is not fixed, <strong>the prerecord could run over the end time by about ${moment.duration(((playlists[summary].duration * 1.05) - eventLength), 'seconds').humanize()}</strong>. ${playlists[summary].duplicates > 0 ? `There were ${playlists[summary].duplicates} duplicate tracks detected. Since duplicates get filtered out in the queue, they were not counted towards the playlist duration. <strong>You may want to remove duplicates from this playlist since they will not play</strong>. The duplicate tracks detected are the following: <br>${playlists[summary].duplicateTracks}` : ''}`;
                                } else if (playlists[summary].duplicates > 0) {
                                    criteria.verify = 'Check';
                                    criteria.verify_message = `This is a valid prerecord, and the playlist highlighted in green exists in RadioDJ. However, there were ${playlists[summary].duplicates} duplicate tracks detected. Since duplicates get filtered out in the queue, they were not counted towards the playlist duration. <strong>You may want to remove duplicates from this playlist since they will not play</strong>. The duplicate tracks detected are the following: <br>${playlists[summary].duplicateTracks}`;
                                } else {
                                    criteria.verify = 'Valid';
                                    criteria.verify_message = `This is a valid prerecord, and the playlist highlighted in green exists in RadioDJ.`;
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
                            criteria.verify_message = `Although this was detected as a playlist, the playlist name highlighted in red does not exist in RadioDJ. <strong>Please ensure the playlist exists and that you spelled it correctly</strong>. If this is not fixed, the playlist probably will not air!`;

                            // Check to see that playlist exists
                            if (typeof playlists[summary] !== 'undefined')
                            {
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Playlist</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`;

                                // Check to see if the playlist duration is shorter than the event duration
                                if (eventLength <= (playlists[summary].duration * 1.05) && playlists[summary].duplicates === 0)
                                {
                                    criteria.verify = 'Valid';
                                    criteria.verify_message = `This is a valid playlist, and the playlist highlighted in green exists in RadioDJ.`;
                                } else if (playlists[summary].duplicates === 0) {
                                    criteria.verify = 'Check';
                                    criteria.verify_message = `This is a valid playlist, and the playlist highlighted in green exists in RadioDJ. However, the duration of the tracks in the saved playlist is less than the duration of this event. To avoid this segment ending early, <strong>add about ${moment.duration((eventLength - (playlists[summary].duration * 1.05)), 'seconds').humanize()} more audio</strong> to the playlist.`;
                                } else if (eventLength <= (playlists[summary].duration * 1.05)) {
                                    criteria.verify = 'Check';
                                    criteria.verify_message = `This is a valid playlist, and the playlist highlighted in green exists in RadioDJ. However, ${playlists[summary].duplicates > 0 ? `There were ${playlists[summary].duplicates} duplicate tracks detected. Since duplicates get filtered out in the queue, they were not counted towards the playlist duration. <strong>You may want to remove duplicates from this playlist since they will not play</strong>. The duplicate tracks detected are the following: <br>${playlists[summary].duplicateTracks}` : ''}`;
                                } else {
                                    criteria.verify = 'Check';
                                    criteria.verify_message = `This is a valid playlist, and the playlist highlighted in green exists in RadioDJ. However, the duration of the tracks in the saved playlist is less than the duration of this event. To avoid this segment ending early, <strong>add about ${moment.duration((eventLength - (playlists[summary].duration * 1.05)), 'seconds').humanize()} more audio</strong> to the playlist. In addition, ${playlists[summary].duplicates > 0 ? `There were ${playlists[summary].duplicates} duplicate tracks detected. Since duplicates get filtered out in the queue, they were not counted towards the playlist duration. <strong>You may want to remove duplicates from this playlist since they will not play</strong>. The duplicate tracks detected are the following: <br>${playlists[summary].duplicateTracks}` : ''}`;
                                }
                            }

                            if (criteria.verify === 'Invalid')
                                badEvent = true;

                            // Genre rotations (via manual events in RadioDJ)
                        } else if (criteria.title.startsWith("Genre: ")) {
                            var summary = criteria.title.replace('Genre: ', '');
                            criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Genre</span>: <span style="background: rgba(255, 0, 0, 0.5);">${summary}</span>`;
                            criteria.verify = 'Invalid';
                            criteria.verify_message = `Although this was detected as a genre, a manual event was not detected in RadioDJ matching the name of this genre. <strong>Please ensure the RadioDJ event exists.</strong>. The event should trigger a rotation change in RadioDJ when executed.`;

                            // Check to see if the manual event exists in RadioDJ
                            if (typeof djevents[summary] !== 'undefined')
                            {
                                criteria.verify_titleHTML = `<span style="background: rgba(0, 0, 255, 0.2);">Genre</span>: <span style="background: rgba(0, 255, 0, 0.2);">${summary}</span>`;

                                // Check to see the event is active, and there is a "Load Rotation" action in the event
                                if (djevents[summary].data.includes("Load Rotation") && djevents[summary].enabled === "True")
                                {
                                    criteria.verify = `Valid`;
                                    criteria.verify_message = `This is a valid genre, and the manual RadioDJ event highlighted in green exists.`;

                                    // Event is enabled, but does not have a Load Rotation event
                                } else if (djevents[summary].enabled === "True") {
                                    criteria.verify = 'Invalid';
                                    criteria.verify_message = `This is a valid genre, and the manual RadioDJ event highlighted in green exists. However, a "Load Rotation" action was not defined in this event. No rotation changes will happen when this genre executes. <strong>To ensure rotation changes, make sure the RadioDJ event has a "Load Rotation" action.</strong>`;

                                    // Event is not enabled
                                } else {
                                    criteria.verify = 'Invalid';
                                    criteria.verify_message = `This is a valid genre, and the manual RadioDJ event highlighted in green exists. However, the manual event is disabled. <strong>Please enable the manual event in RadioDJ</strong>, or the rotation will not change.`;
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
                        if (moment(criteria.start).isBefore() && moment(criteria.end).isAfter())
                        {
                            try {
                                if (moment(criteria.start).isAfter(Playlists.played) || ignoreChangingState)
                                {
                                    if (event.summary.startsWith("Playlist: ") && (toTrigger === null || toTrigger.priority >= 2))
                                    {
                                        toTrigger = {priority: 2, event: event.summary.replace('Playlist: ', ''), resume: false, type: 0, description: ''};
                                    }
                                    if (event.summary.startsWith("Prerecord: ") && (toTrigger === null || toTrigger.priority >= 1))
                                    {
                                        toTrigger = {priority: 1, event: event.summary.replace('Prerecord: ', ''), resume: false, type: 1, description: criteria.description};
                                    }
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
                    if (!genreActive && Meta['A'].state === 'automation_genre' && Meta['A'].changingState === null)
                    {
                        await sails.helpers.genre.start('Default');
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
                        sails.log.debug(`Calling asyncForEach in Calendar for looping through calendar records that expires.`);
                        await sails.helpers.asyncForEach(destroyed, function (event, index) {
                            return new Promise(async (resolve2, reject2) => {
                                try {
                                    var dj = event.title;
                                    if (dj.includes(" - ") && dj.includes(": "))
                                    {
                                        dj = dj.split(" - ")[0];
                                        dj = dj.substring(dj.indexOf(": ") + 2);
                                    } else {
                                        dj = null;
                                    }
                                    // Do not attendance-track events which did not get a Valid or Check mark on the verification system (for example, Invalid or Manual events)
                                    if (event.verify === "Valid" || event.verify === "Check")
                                    {
                                        Attendance.findOrCreate({unique: event.unique}, {unique: event.unique, DJ: dj, event: event.title, scheduledStart: moment(event.start).toISOString(true), scheduledEnd: moment(event.end).toISOString(true)})
                                                .exec(async(err, record, wasCreated) => {
                                                    // if wasCreated, then the event never aired; Log an absence.
                                                    if (wasCreated)
                                                    {
                                                        if (record.event.startsWith("Show: "))
                                                        {
                                                            await Logs.create({attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace("Show: ", ""), event: `It appears ${record.event.replace("Show: ", "")} was scheduled to do a show from ${moment(record.scheduledStart).format("LL hh:mm A")} to ${moment(record.scheduledEnd).format("LL hh:mm A")}, but did not do so.`, createdAt: moment(record.scheduledStart).toISOString(true)})
                                                                    .tolerate((err) => {
                                                                        sails.log.error(err);
                                                                    });
                                                        }

                                                        if (record.event.startsWith("Prerecord: "))
                                                        {
                                                            await Logs.create({attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace("Prerecord: ", ""), event: `It appears ${record.event.replace("Prerecord: ", "")} had a scheduled prerecord from ${moment(record.scheduledStart).format("LL hh:mm A")} to ${moment(record.scheduledEnd).format("LL hh:mm A")}, but did not air.`, createdAt: moment(record.scheduledStart).toISOString(true)})
                                                                    .tolerate((err) => {
                                                                        sails.log.error(err);
                                                                    });
                                                        }

                                                        if (record.event.startsWith("Remote: "))
                                                        {
                                                            await Logs.create({attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace("Remote: ", ""), event: `It appears the remote ${record.event.replace("Remote: ", "")} was scheduled to broadcast from ${moment(record.scheduledStart).format("LL hh:mm A")} to ${moment(record.scheduledEnd).format("LL hh:mm A")}, but did not do so.`, createdAt: moment(record.scheduledStart).toISOString(true)})
                                                                    .tolerate((err) => {
                                                                        sails.log.error(err);
                                                                    });
                                                        }

                                                        if (record.event.startsWith("Sports: "))
                                                        {
                                                            await Logs.create({attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace("Sports: ", ""), event: `It appears sports broadcast ${record.event.replace("Sports: ", "")} was scheduled from ${moment(record.scheduledStart).format("LL hh:mm A")} to ${moment(record.scheduledEnd).format("LL hh:mm A")}, but did not air.`, createdAt: moment(record.scheduledStart).toISOString(true)})
                                                                    .tolerate((err) => {
                                                                        sails.log.error(err);
                                                                    });
                                                        }

                                                        if (record.event.startsWith("Playlist: "))
                                                        {
                                                            await Logs.create({attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: record.event.replace("Playlist: ", ""), event: `It appears the playlist ${record.event.replace("Playlist: ", "")} was scheduled to air from ${moment(record.scheduledStart).format("LL hh:mm A")} to ${moment(record.scheduledEnd).format("LL hh:mm A")}, but did not do so.`, createdAt: moment(record.scheduledStart).toISOString(true)})
                                                                    .tolerate((err) => {
                                                                        sails.log.error(err);
                                                                    });
                                                        }

                                                        // We do not care about genres
                                                    }
                                                    return resolve2(false);
                                                });
                                    } else {
                                        return resolve2(false);
                                    }
                                } catch (e) {
                                    sails.log.error(e);
                                    return resolve2(false);
                                }
                            });
                        });
                    }


                    if (badEvent)
                    {
                        Status.changeStatus([{name: 'google-calendar', label: 'Google Calendar', data: 'There are bad events in the Google Calendar. Please see DJ Controls administration / Calendar Verification.', status: 3}]);
                    } else {
                        Status.changeStatus([{name: 'google-calendar', label: 'Google Calendar', data: 'The Google Calendar is operational, and there are no significant issues with the scheduled events.', status: 5}]);
                    }
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

