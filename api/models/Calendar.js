/* global Calendar, sails, Playlists, Meta, Genre, moment */

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
    datastore: 'memory',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        unique: {
            type: 'string'
        },

        title: {
            type: 'string'
        },

        description: {
            type: 'string',
            defaultsTo: ''
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

        color: {
            type: 'string'
        }
    },

    // Google auth does not seem to support async/promises yet, so we need to have a sync function for that
    preLoadEvents: function () {
        var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
        var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
                process.env.USERPROFILE) + '/.credentials/';
        var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

        var authenticate = function () {
            return new Promise(async (resolve, reject) => {
                try {
                    var credentials = await getClientSecret();
                    if (typeof credentials === 'undefined' || credentials === null)
                        return reject(new Error('Empty credentials file.'));
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
                .then((auth) => {
                    Calendar.loadEvents(auth);
                })
                .catch(err => {
                    sails.log.error(err);
                    return null;
                });
    },

    loadEvents: function (auth) {
        return new Promise(async (resolve, reject) => {
            sails.log.verbose(`Calendar.loadEvents called`);
            try {
                var {google} = require('googleapis');
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
                sails.log.silly(events);
                if (events.length === 0) {
                    return resolve();
                } else {
                    // Iterate through each returned event from Google Calendar
                    var eventIds = []; // Used for determining which events in memory no longer exist, and therefore should be destroyed
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
                        sails.log.silly(`Event criteria: ${criteria}`);
                        // Find existing record of event. If does not exist, create it.
                        Calendar.findOrCreate({unique: event.id}, criteria)
                                .exec(function (err2, theEvent, wasCreated) {
                                    if (err2)
                                        return reject(err2);

                                    if (!wasCreated)
                                    {
                                        // Check if the event changed. If so, update it and push it out to clients.
                                        var needsUpdate = false;
                                        for (var key in theEvent)
                                        {
                                            if (theEvent.hasOwnProperty(key))
                                            {
                                                if (typeof criteria[key] !== 'undefined' && theEvent[key] !== criteria[key])
                                                {
                                                    needsUpdate = true;
                                                    break;
                                                }
                                            }
                                        }
                                        if (needsUpdate)
                                        {
                                            Calendar.update({unique: event.id}, criteria).fetch().exec(function () {});
                                        }
                                    }

                                });


                        // Check to see if any of the events are triggering events, and it is time to trigger them.
                        if (moment(criteria.start).isBefore() && moment(criteria.end).isAfter())
                        {
                            if (moment(criteria.start).isAfter(Playlists.played))
                            {
                                if (event.summary.startsWith("Playlist: "))
                                {
                                    await sails.helpers.playlists.start(event.summary.replace('Playlist: ', ''), false, criteria.end, 0);
                                }
                                if (event.summary.startsWith("Prerecord: "))
                                {
                                    await sails.helpers.playlists.start(event.summary.replace('Prerecord: ', ''), false, criteria.end, 1, criteria.description);
                                }
                            }
                            if (event.summary.startsWith("Genre: "))
                            {
                                genreActive = true;
                                if ((Meta['A'].state === 'automation_on' || (Meta['A'].state === 'automation_genre' && Meta['A'].genre !== event.summary.replace('Genre: ', ''))))
                                {
                                    await sails.helpers.genre.start(event.summary.replace('Genre: ', ''));
                                }
                            }
                        }
                    }
                    
                    // No genre events active right now? Switch back to regular automation.
                    if (!genreActive && Meta['A'].state === 'automation_genre')
                    {
                        await Meta.changeMeta({genre: '', state: 'automation_on'});
                        await sails.helpers.genre.start('Default');
                    }

                    // Destroy events in the database that no longer exist on the Google Calendar
                    await Calendar.destroy({unique: {'!=': eventIds}})
                            .intercept((err) => {
                            })
                            .fetch();

                    return resolve();
                }
            } catch (e) {
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

