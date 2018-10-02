/* global Meta, sails, _, moment, Calendar */

/**
 * Meta.js
 *
 * @description :: Meta manages the metadata of what is playing on WWSU Radio.
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
            type: 'string',
            allowNull: true
        },

        showstamp: {
            type: 'ref',
            columnType: 'datetime'
        },

        attendanceID: {
            type: 'number',
            allowNull: true
        },

        track: {
            type: 'string',
            allowNull: true
        },

        trackstamp: {
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

        djcontrols: {
            type: 'string',
            allowNull: true
        },

        webchat: {
            type: 'boolean'
        },

        playlist: {
            type: 'string',
            allowNull: true
        },

        playlist_position: {
            type: 'number',
            defaultsTo: -1
        },

        playlist_played: {
            type: 'ref',
            columnType: 'datetime'
        }

    },

    // API NOTE: Do not modify any of these directly; use the changeMeta function instead. That way, changes are pushed through web sockets.
    A: {
        state: '', // State of the WWSU system
        dj: '', // If someone is on the air, host name - show name
        showstamp: null, // When a show starts, this is the timestamp which the show began
        attendanceID: null, // The ID of the Attendance record the system is currently running under
        track: '', // Currently playing track either in automation or manually logged
        trackID: 0, // The ID of the track currently playing
        history: [], // An array of objects {ID: trackID, track: 'Artist - Title', likable: true if it can be liked} of the last 3 tracks that played 
        requested: false, // Whether or not this track was requested
        requestedBy: '', // The user who requested this track, if requested
        requestedMessage: '', // The provided message for this track request, if requested
        genre: '', // Name of the genre or rotation currently being played, if any
        trackstamp: null, // Use moment.toISOString() when changing in changeMeta! If you directly store a moment instance here, database updating will fail
        topic: '', // If the DJ specified a show topic, this is the topic.
        stream: '', // Meta for the internet radio stream
        artist: '', // Artist from the stream meta
        title: '', // Title from the stream meta
        radiodj: '', // REST IP of the RadioDJ instance currently in control
        djcontrols: 'EngineeringPC', // Hostname of the computer in which has activated the most recent live/sports/remote broadcast via DJ Controls
        line1: 'We are unable to provide now playing info at this time.', // First line of meta for display signs
        line2: '', // Second line of meta for display signs
        percent: 0, // Integer or float between 0 and 100 indicating how far in the current track in automation we are, for display signs
        time: moment().toISOString(true), // ISO string of the current WWSU time
        listeners: 0, // Number of current online listeners
        listenerpeak: 0, // Number of peak online listeners
        queueLength: 0, // Amount of audio queued in radioDJ in seconds (can be a float)
        queueMusic: false, // If returning from break, or going live, and there are music tracks in the queue not counted towards queueLength, this will be true
        playing: false, // Whether or not something is currently playing in the active RadioDJ
        changingState: null, // If not null, all clients should lock out of any state-changing (state/*) API hits until this is null again. Will be state changing string otherwise.
        breakneeded: false, // If the current DJ needs to take the FCC required top of the hour break, this will be true
        webchat: true, // Set to false to restrict the ability to send chat messages through the website
        playlist: null, // Name of the playlist we are currently airing
        playlist_position: -1, // Current position within the playlist
        playlist_played: null // Use moment.toISOString() when changing in changeMeta! If you directly store a moment instance here, database updating will fail
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
        return new Promise(async (resolve, reject) => {
            sails.log.debug(`Meta.changeMeta called.`);
            var push = {};
            var db = {};
            for (var key in obj)
            {
                if (obj.hasOwnProperty(key)) {
                    // Exit if the key provided does not exist in Meta.A, or if the value in obj did not change from the current value
                    if (typeof Meta['A'][key] === 'undefined' || Meta['A'][key] === obj[key])
                        continue;

                    // Do stuff if we are changing states, mainly with regards to genres, playlists, and prerecords.
                    if (key === "state" && obj[key] !== Meta['A'][key])
                    {
                        if (Meta['A'][key] === 'live_prerecord')
                            await sails.helpers.xp.addPrerecord();
                    }

                    Meta['A'][key] = obj[key];
                    push[key] = obj[key];

                    // Try updating the meta in the database
                    try {
                        if (key in Meta.attributes)
                            db[key] = obj[key];
                    } catch (e) {
                        return reject(e);
                    }

                    // If we're changing stream meta, push to history array, and send an API call to the stream to update the meta on the stream.
                    if (key === 'stream')
                    {
                        Meta.history.unshift(obj[key]);
                        Meta.history = Meta.history.slice(0, 5);
                        // TODO: Put stream metadata updating API query here
                    }
                }
            }

            var criteria = _.cloneDeep(db);

            await Meta.update({ID: 1}, criteria)
                    .tolerate((err) => {
                        return reject(err);
                    });
            // Do not push empty (no) changes through websockets
            if (_.isEmpty(push))
                return resolve();
            sails.log.silly(`meta socket: ${push}`);
            sails.sockets.broadcast('meta', 'meta', push);
            return resolve();
        });
    }
};

