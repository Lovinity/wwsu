/* global Meta, sails, _, moment, Calendar, Logs, Requests */

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
        dj: '', // If someone is on the air, host name - show name, or name of sports for sports broadcasts
        showStamp: null, // When a show starts, this is the timestamp which the show began
        attendanceID: null, // The ID of the Attendance record the system is currently running under
        track: '', // Currently playing track either in automation or manually logged
        trackID: 0, // The ID of the track currently playing
        trackIDSubcat: 0, // The ID of the subcategory the currently playing track falls in
        trackArtist: null, // The artist of the currently playing track
        trackTitle: null, // The title of the currently playing track
        trackAlbum: null, // The album name of the currently playing track
        trackLabel: null, // The label name of the currently playing track
        trackStamp: null, // Use moment.toISOString() when changing in changeMeta! If you directly store a moment instance here, database updating will fail
        history: [], // An array of objects {ID: trackID, track: 'Artist - Title', likable: true if it can be liked} of the last 3 tracks that played 
        requested: false, // Whether or not this track was requested
        requestedBy: '', // The user who requested this track, if requested
        requestedMessage: '', // The provided message for this track request, if requested
        genre: '', // Name of the genre or rotation currently being played, if any
        topic: '', // If the DJ specified a show topic, this is the topic.
        stream: '', // Meta for the internet radio stream
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
            var push2 = {};
            for (var key in obj)
            {
                if (obj.hasOwnProperty(key)) {
                    // Exit if the key provided does not exist in Meta.A, or if the value in obj did not change from the current value
                    if (typeof Meta['A'][key] === 'undefined' || Meta['A'][key] === obj[key])
                        continue;

                    // Do stuff if we are changing states, mainly with regards to genres, playlists, and prerecords.
                    if (key === "state")
                    {
                        if (Meta['A'][key] === 'live_prerecord')
                            await sails.helpers.xp.addPrerecord();

                        // Enable webchat automatically when going into automation state
                        if (obj[key] === 'automation_on' || obj[key] === 'automation_genre' || obj[key] === 'automation_playlist' || obj[key] === 'automation_prerecord')
                            push2.webchat = true;
                    }

                    // Update meta in memory
                    Meta['A'][key] = obj[key];
                    push[key] = obj[key];
                }
            }

            // Changes in certain meta should warrant a re-processing of metadata information
            if (typeof push.dj !== 'undefined' || typeof push.state !== 'undefined' || typeof push.playlist !== 'undefined' || typeof push.genre !== 'undefined' || typeof push.trackArtist !== 'undefined' || typeof push.trackTitle !== 'undefined' || typeof push.trackID !== 'undefined')
            {
                // New track playing in automation?
                if (Meta['A'].trackID !== 0)
                {
                    // Always reset trackstamp when something plays in automation
                    push2.trackStamp = null;

                    // If the currently playing track was a request, mark as played and update meta
                    if (typeof push.trackID !== 'undefined')
                    {
                        if (_.includes(Requests.pending, Meta['A'].trackID))
                        {
                            var requested = await Requests.update({songID: Meta['A'].trackID, played: 0}, {played: 1}).fetch()
                                    .tolerate((err) => {
                                    });
                            delete Requests.pending[Requests.pending.indexOf(Meta['A'].trackID)];
                            if (requested && typeof requested[0] !== 'undefined')
                            {
                                push2.requested = true;
                                push2.requestedBy = (requested[0].username === '') ? 'Anonymous' : requested[0].username;
                                push2.requestedMessage = requested[0].message;
                            }

                            // If we are finished playing requests, clear request meta
                        } else if (Meta['A'].requested)
                        {
                            push2.requested = false;
                            push2.requestedBy = '';
                            push2.requestedMessage = '';
                        }
                    }

                    // Manage metadata based on our current state when something is playing in automation

                    // Regular automation
                    if (Meta['A'].state.startsWith("automation_") && Meta['A'].state !== 'automation_playlist' && Meta['A'].state !== 'automation_genre')
                    {
                        // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
                        if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(Meta['A'].trackIDSubcat || 0) > -1) || Meta['A'].trackArtist.includes("Unknown Artist") || Meta['A'].trackArtist === null || Meta['A'].trackArtist === '')
                        {
                            push2.line1 = sails.config.custom.meta.alt.automation;
                            push2.line2 = '';
                            push2.stream = `WWSU 106.9FM - ${sails.config.custom.meta.alt.automation}`;
                            push2.percent = 0;
                        } else {
                            push2.line1 = await sails.helpers.filterProfane(`Now playing: ${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"}`);
                            push2.line2 = push2.requested ? await sails.helpers.filterProfane(`Requested by: ${push2.requestedBy || "Anonymous"}`) : '';
                            push2.stream = await sails.helpers.filterProfane(`${Meta['A'].trackArtist} - ${Meta['A'].trackTitle} ${push2.requested ? `(Requested by: ${push2.requestedBy || "Anonymous"})` : ``}`);
                        }

                        // Playlist automation
                    } else if (Meta['A'].state === 'automation_playlist')
                    {
                        // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
                        if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(Meta['A'].trackIDSubcat || 0) > -1) || Meta['A'].trackArtist.includes("Unknown Artist") || Meta['A'].trackArtist === null || Meta['A'].trackArtist === '')
                        {
                            push2.line1 = sails.config.custom.meta.alt.playlist;
                            push2.line2 = `Playlist: ${Meta['A'].playlist}`;
                            push2.stream = `WWSU 106.9FM - ${sails.config.custom.meta.alt.playlist}`;
                            push2.percent = 0;
                        } else {
                            push2.line1 = await sails.helpers.filterProfane(`Now playing: ${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"}`);
                            push2.line2 = push2.requested ? await sails.helpers.filterProfane(`Requested by: ${push2.requestedBy || "Anonymous"}`) : `Playlist: ${Meta['A'].playlist}`;
                            push2.stream = await sails.helpers.filterProfane(`${Meta['A'].trackArtist} - ${Meta['A'].trackTitle} ${push2.requested ? `(Requested by: ${push2.requestedBy || "Anonymous"})` : ``}`);
                        }

                        // Genre automation
                    } else if (Meta['A'].state === 'automation_genre')
                    {
                        // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
                        if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(Meta['A'].trackIDSubcat || 0) > -1) || Meta['A'].trackArtist.includes("Unknown Artist") || Meta['A'].trackArtist === null || Meta['A'].trackArtist === '')
                        {
                            push2.line1 = sails.config.custom.meta.alt.genre;
                            push2.line2 = `Genre: ${Meta['A'].genre}`;
                            push2.stream = `WWSU 106.9FM - ${sails.config.custom.meta.alt.genre}`;
                            push2.percent = 0;
                        } else {
                            push2.line1 = await sails.helpers.filterProfane(`Now playing: ${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"}`);
                            push2.line2 = push2.requested ? await sails.helpers.filterProfane(`Requested by: ${push2.requestedBy || "Anonymous"}`) : `Genre: ${Meta['A'].genre}`;
                            push2.stream = await sails.helpers.filterProfane(`${Meta['A'].trackArtist} - ${Meta['A'].trackTitle} ${push2.requested ? `(Requested by: ${push2.requestedBy || "Anonymous"})` : ``}`);
                        }

                        // Live shows
                    } else if (Meta['A'].state.startsWith("live_") && Meta['A'].state !== 'live_prerecord')
                    {
                        // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
                        if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(Meta['A'].trackIDSubcat || 0) > -1) || Meta['A'].trackArtist.includes("Unknown Artist") || Meta['A'].trackArtist === null || Meta['A'].trackArtist === '')
                        {
                            push2.line1 = `On the Air: ${Meta['A'].dj}`;
                            push2.line2 = sails.config.custom.meta.alt.live;
                            push2.stream = `${Meta['A'].dj} (${sails.config.custom.meta.alt.live})`;
                            push2.percent = 0;
                        } else {
                            push2.line1 = `On the Air: ${Meta['A'].dj}`;
                            push2.line2 = await sails.helpers.filterProfane(`Playing: ${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"} ${push2.requested ? `(Requested by: ${push2.requestedBy || "Anonymous"})` : ``}`);
                            push2.stream = await sails.helpers.filterProfane(`${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"} ${push2.requested ? `(Requested by: ${push2.requestedBy || "Anonymous"})` : ``}`);
                        }

                        // Prerecorded shows
                    } else if (Meta['A'].state === 'live_prerecord')
                    {
                        // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
                        if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(Meta['A'].trackIDSubcat || 0) > -1) || Meta['A'].trackArtist.includes("Unknown Artist") || Meta['A'].trackArtist === null || Meta['A'].trackArtist === '')
                        {
                            push2.line1 = `Prerecorded Show: ${Meta['A'].playlist}`;
                            push2.line2 = sails.config.custom.meta.alt.prerecord;
                            push2.stream = `${Meta['A'].playlist} (${sails.config.custom.meta.alt.prerecord})`;
                            push2.percent = 0;
                        } else {
                            push2.line1 = `Prerecorded Show: ${Meta['A'].playlist}`;
                            push2.line2 = await sails.helpers.filterProfane(`Playing: ${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"} ${push2.requested ? `(Requested by: ${push2.requestedBy || "Anonymous"})` : ``}`);
                            push2.stream = await sails.helpers.filterProfane(`${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"} ${push2.requested ? `(Requested by: ${push2.requestedBy || "Anonymous"})` : ``}`);
                        }

                        // Remote broadcasts
                    } else if (Meta['A'].state.startsWith("remote_"))
                    {
                        // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
                        if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(Meta['A'].trackIDSubcat || 0) > -1) || Meta['A'].trackArtist.includes("Unknown Artist") || Meta['A'].trackArtist === null || Meta['A'].trackArtist === '')
                        {
                            push2.line1 = `Broadcasting: ${Meta['A'].dj}`;
                            push2.line2 = sails.config.custom.meta.alt.remote;
                            push2.stream = `${Meta['A'].dj} (${sails.config.custom.meta.alt.remote})`;
                            push2.percent = 0;
                        } else {
                            push2.line1 = `Broadcasting: ${Meta['A'].dj}`;
                            push2.line2 = await sails.helpers.filterProfane(`Playing: ${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"} ${push2.requested ? `(Requested by: ${push2.requestedBy || "Anonymous"})` : ``}`);
                            push2.stream = await sails.helpers.filterProfane(`${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"} ${push2.requested ? `(Requested by: ${push2.requestedBy || "Anonymous"})` : ``}`);
                        }

                        // Sports broadcasts
                    } else if (Meta['A'].state.startsWith("sports_") || Meta['A'].state.startsWith("sportsremote_"))
                    {
                        // We do not ever want to display what we are playing when broadcasting sports; always use alt meta
                        push2.line1 = `Raider Sports: ${Meta['A'].dj}`;
                        push2.line2 = sails.config.custom.meta.alt.sports;
                        push2.stream = `Raider Sports - ${Meta['A'].dj} (${sails.config.custom.meta.alt.sports})`;
                        push2.percent = 0;
                    }

                    // Overwrite line 2 of the metadata if a broadcast is about to begin
                    if (Meta['A'].state === 'automation_live')
                    {
                        push2.line2 = `About to go live: ${Meta['A'].dj}`;
                        // Prerecord about to begin
                    } else if (Meta['A'].state === 'automation_prerecord')
                    {
                        push2.line2 = `Prerecord about to start: ${Meta['A'].dj}`;
                    } else if (Meta['A'].state === 'automation_remote')
                    {
                        push2.line2 = `About to begin broadcast: ${Meta['A'].dj}`;
                    } else if (Meta['A'].state === 'automation_sports' || Meta['A'].state === 'automation_sportsremote')
                    {
                        push2.line2 = `About to begin Raider Sports: ${Meta['A'].dj}`;
                    }

                    // Log the new track playing if the track was new
                    if (typeof push.trackID !== 'undefined')
                    {
                        await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'track', loglevel: 'secondary', logsubtype: 'automation', event: `Track played in automation.${push2.requested ? `<br />Requested by: ${push2.requestedBy || `Unknown User`}` : ``}`, trackArtist: Meta['A'].trackArtist || null, trackTitle: Meta['A'].trackTitle || null, trackAlbum: Meta['A'].trackAlbum || null, trackLabel: Meta['A'].trackLabel || null})
                                .tolerate((err) => {
                                });

                        // Push to the history array if not a track that falls under noMeta
                        if (sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(Meta['A'].trackIDSubcat) === -1)
                        {
                            push2.history = Meta['A'].history;
                            push2.history.unshift({ID: Meta['A'].trackID, track: (Meta['A'].trackArtist || "Unknown Artist") + ' - ' + (Meta['A'].trackTitle || "Unknown Title"), likable: true});
                            push2.history = push2.history.slice(0, 3);
                        }
                    }

                    // Perform metadata for when nothing is playing in automation
                } else {

                    // Erase track information if we stopped playing stuff in automation
                    if (typeof push.trackID !== 'undefined' && push.trackID === 0)
                    {
                        push2.trackStamp = null;
                        push2.trackArtist = null;
                        push2.trackTitle = null;
                        push2.trackAlbum = null;
                        push2.trackLabel = null;
                        var manual = false;
                    } else {

                        // New track? push it to the history array
                        if (typeof push.trackStamp !== 'undefined')
                        {
                            push2.history = Meta['A'].history;
                            push2.history.unshift({ID: null, track: (Meta['A'].trackArtist || "Unknown Artist") + ' - ' + (Meta['A'].trackTitle || "Unknown Title"), likable: false});
                            push2.history = push2.history.slice(0, 3);
                        }
                        // Determine if a manually logged track is playing
                        var manual = Meta['A'].trackArtist !== null && Meta['A'].trackArtist !== '' && Meta['A'].trackTitle !== null && Meta['A'].trackTitle !== '';
                    }

                    // Live shows
                    if (Meta['A'].state.startsWith("live_") && Meta['A'].state !== 'live_prerecord')
                    {
                        push2.line1 = `On the Air: ${Meta['A'].dj}`;
                        push2.line2 = manual ? await sails.helpers.filterProfane(`Playing: ${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"}`) : ``;
                        push2.stream = manual ? await sails.helpers.filterProfane(`${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"}`) : await sails.helpers.filterProfane(`${Meta['A'].dj} (LIVE)`);

                        // Prerecorded shows (should never happen; this is an error!)
                    } else if (Meta['A'].state === 'live_prerecord')
                    {
                        push2.line1 = `Prerecorded Show: ${Meta['A'].playlist}`;
                        push2.line2 = `Error! No audio playing.`;
                        push2.stream = await sails.helpers.filterProfane(`${Meta['A'].dj} (PRERECORD)`);

                        // Remote Broadcasts
                    } else if (Meta['A'].state.startsWith("remote_"))
                    {
                        push2.line1 = `Broadcasting: ${Meta['A'].dj}`;
                        push2.line2 = manual ? await sails.helpers.filterProfane(`Playing: ${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"}`) : ``;
                        push2.stream = manual ? await sails.helpers.filterProfane(`${Meta['A'].trackArtist || "Unknown Artist"} - ${Meta['A'].trackTitle || "Unknown Title"}`) : await sails.helpers.filterProfane(`${Meta['A'].dj} (LIVE)`);

                        // Sports; we don't want to ever display what we are playing
                    } else if (Meta['A'].state.startsWith("sports_") || Meta['A'].state.startsWith("sportsremote_"))
                    {
                        push2.line1 = `Raider Sports: ${Meta['A'].dj}`;
                        push2.line2 = ``;
                        push2.stream = `Raider Sports - ${Meta['A'].dj} (LIVE)`;

                        // Regular automation (should never happen; this is an error!)
                    } else if (Meta['A'].state.startsWith("automation_") && Meta['A'].state !== 'automation_playlist' && Meta['A'].state !== 'automation_genre')
                    {
                        push2.line1 = `Error! No audio playing.`;
                        push2.line2 = ``;

                        // Playlists (should never happen; this is an error!)
                    } else if (Meta['A'].state === 'automation_playlist')
                    {
                        push2.line1 = `Error! No audio playing.`;
                        push2.line2 = `Playlist: ${Meta['A'].playlist}`;

                        // Genre automation (should never happen; this is an error!)
                    } else if (Meta['A'].state === 'automation_playlist')
                    {
                        push2.line1 = `Error! No audio playing.`;
                        push2.line2 = `Genre: ${Meta['A'].genre}`;
                    }
                }
            }

            // Cycle through all push2's and update metadata
            for (var key in push2)
            {
                if (push2.hasOwnProperty(key) && push2[key] !== Meta['A'][key])
                {
                    push[key] = push2[key];
                    Meta['A'][key] = push2[key];
                }
            }

            // Finalize all meta changes and update ones in the database as necessary

            for (var key in push)
            {
                if (push.hasOwnProperty(key))
                {
                    try {
                        if (key in Meta.attributes)
                            db[key] = push[key];
                    } catch (e) {
                        return reject(e);
                    }

                    // If we're changing stream meta, push to history array, and send an API call to the stream to update the meta on the stream.
                    if (key === 'stream')
                    {
                        Meta.history.unshift(push[key]);
                        Meta.history = Meta.history.slice(0, 5);
                        // TODO: Put stream metadata updating API query here
                    }
                }
            }

            // Clone our changes due to a Sails discrepancy
            var criteria = _.cloneDeep(db);

            // Update meta in the database
            await Meta.update({ID: 1}, criteria)
                    .tolerate((err) => {
                        sails.log.error(err);
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

