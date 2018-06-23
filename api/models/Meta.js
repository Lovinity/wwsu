/* global Meta, sails, _ */

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
            type: 'string'
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

    // API NOTE: Do not modify any of these directly; use the changeMeta function instead.
    A: {
        state: 'unknown', // State of the WWSU system
        dj: '', // If someone is on the air, host name - show name
        track: '', // Currently playing track either in automation or manually logged
        genre: '', // Name of the genre or rotation currently being played, if any
        trackstamp: null, // Use moment.toISOString() when changing in changeMeta! If you directly store a moment instance here, database updating will fail
        topic: '', // If the DJ specified a show topic, this is the topic.
        stream: '', // Meta for the internet radio stream
        artist: '', // Artist from the stream meta
        title: '', // Title from the stream meta
        radiodj: '', // REST IP of the RadioDJ instance currently in control
        djcontrols: '', // Hostname of the computer in which has activated the most recent live/sports/remote broadcast via DJ Controls
        line1: 'We are unable to provide now playing info at this time.', // First line of meta for display signs
        line2: '', // Second line of meta for display signs
        percent: 0, // Integer or float between 0 and 100 indicating how far in the current track in automation we are, for display signs
        time: '', // Human readable date and time for display signs
        listeners: 0, // Number of current online listeners
        listenerpeak: 0, // Number of peak online listeners
        queueLength: 0, // Amount of audio queued in radioDJ in seconds (can be a float)
        breakneeded: false, // If the current DJ needs to take the FCC required top of the hour break, this will be true
        webchat: true, // Set to false to restrict the ability to send chat messages through the website
        playlist: null, // Name of the playlist we are currently airing
        playlist_position: -1, // Current position within the playlist
        playlist_played: null // Use moment.toISOString() when changing in changeMeta! If you directly store a moment instance here, database updating will fail
    },
    automation: [], // Tracks in automation
    history: [], // track history array

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
                    if (typeof Meta['A'][key] === 'undefined' || Meta['A'][key] === obj[key])
                        continue;

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
            await Meta.update({ID: 1}).set(db)
                    .tolerate((err) => {
                        return reject(err);
                    });
            sails.log.silly(`meta socket: ${push}`);
            sails.sockets.broadcast('meta', 'meta', push);
            return resolve();
        });
    }
};

