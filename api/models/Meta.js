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

  // Used for sails.helpers.meta.change when changing meta.memory
  // Update sails.helpers.meta.update.inputs whenever you change any of these!
  template: {
    state: {
      type: 'string',
      defaultsTo: 'unknown',
      description: 'State of the WWSU system'
    },
    dj: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the DJ currently on the air, or null if not applicable.'
    },
    attendanceID: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the Attendance record the system is currently running under'
    },
    show: {
      type: 'string',
      defaultsTo: '',
      description: 'If someone is on the air, host name - show name, or name of sports for sports broadcasts'
    },
    showStamp: {
      type: 'string',
      allowNull: true,
      description: 'When a show starts, this is the ISO timestamp which the show began',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    track: {
      type: 'string',
      defaultsTo: '',
      description: 'Currently playing track either in automation or manually logged'
    },
    trackID: {
      type: 'number',
      defaultsTo: 0,
      description: 'The ID of the track currently playing'
    },
    trackIDSubcat: {
      type: 'number',
      defaultsTo: 0,
      description: 'The ID of the subcategory the currently playing track falls in'
    },
    trackArtist: {
      type: 'string',
      allowNull: true,
      description: 'The artist of the currently playing track'
    },
    trackTitle: {
      type: 'string',
      allowNull: true,
      description: 'The title of the currently playing track'
    },
    trackAlbum: {
      type: 'string',
      allowNull: true,
      description: 'The album of the currently playing track'
    },
    trackLabel: {
      type: 'string',
      allowNull: true,
      description: 'The label of the currently playing track'
    },
    trackStamp: {
      type: 'string',
      allowNull: true,
      description: 'ISO timestamp of when manual track meta was added',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    history: {
      type: 'json',
      defaultsTo: [],
      custom: (value) => _.isArray(value),
      description: 'An array of objects {ID: trackID, track: Artist - Title, likable: true if it can be liked} of the last 3 tracks that played'
    },
    requested: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Whether or not this track was requested'
    },
    requestedBy: {
      type: 'string',
      defaultsTo: '',
      description: 'The user who requested this track, if requested'
    },
    requestedMessage: {
      type: 'string',
      defaultsTo: '',
      description: 'The provided message for this track request, if requested'
    },
    genre: {
      type: 'string',
      defaultsTo: '',
      description: 'Name of the genre or rotation currently being played, if any'
    },
    playlist: {
      type: 'string',
      allowNull: true,
      description: 'Name of the playlist we are currently airing'
    },
    playlistPosition: {
      type: 'number',
      defaultsTo: -1,
      description: 'Current position within the playlist'
    },
    playlistPlayed: {
      type: 'string',
      allowNull: true,
      description: 'ISO timestamp of when the playlist was started',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    topic: {
      type: 'string',
      defaultsTo: '',
      description: 'If the DJ specified a show topic, this is the topic.'
    },
    stream: {
      type: 'string',
      defaultsTo: '',
      description: 'sails.models.meta for the internet radio stream'
    },
    radiodj: {
      type: 'string',
      isIn: sails.config.custom.radiodjs,
      defaultsTo: '',
      description: 'REST IP of the RadioDJ instance currently in control'
    },
    line1: {
      type: 'string',
      defaultsTo: 'We are unable to provide now playing info at this time.',
      description: 'First line of meta for display signs'
    },
    line2: {
      type: 'string',
      defaultsTo: '',
      description: 'Second line of meta for display signs'
    },
    time: {
      type: 'string',
      defaultsTo: moment().toISOString(true),
      description: 'ISO string of the current WWSU time. NOTE: time is only pushed periodically in websockets. Clients should keep their own time ticker in sync with this value.',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    listeners: {
      type: 'number',
      defaultsTo: 0,
      description: 'Number of current online listeners'
    },
    listenerPeak: {
      type: 'number',
      defaultsTo: 0,
      description: 'Number of peak online listeners'
    },
    queueFinish: {
      type: 'string',
      allowNull: true,
      description: 'An ISO timestamp of when the queue is expected to finish. NOTE: To conserve data, this is only pushed through websockets when the expected finish time changes by more than 1 second. Also, this will be null when not playing anything.',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    trackFinish: {
      type: 'string',
      allowNull: true,
      description: 'An ISO timestamp of when the current track is expected to finish. NOTE: To conserve data, this is only pushed through websockets when the expected finish time changes by more than 1 second. Also, this will be null when not playing anything.',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    queueMusic: {
      type: 'boolean',
      defaultsTo: false,
      description: 'If returning from break, or going live, and there are music tracks in the queue not counted towards queueFinish, this will be true'
    },
    playing: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Whether or not something is currently playing in the active RadioDJ'
    },
    changingState: {
      type: 'string',
      allowNull: true,
      description: 'If not null, all clients should lock out of any state-changing (state/*) API hits until this is null again. Will be state changing string otherwise.'
    },
    lastID: {
      type: 'string',
      allowNull: true,
      description: 'An ISO timestamp of when the last top of hour ID break was taken.',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    webchat: {
      type: 'boolean',
      defaultsTo: true,
      description: 'Set to false to restrict the ability to send chat messages through the website'
    }
  },

  // DO NOT change any values in meta.memory directly! Instead, use sails.helpers.meta.change. This is populated in bootstrap.js via meta.template
  memory: {},

  automation: [], // Tracks in automation, populated by sails.helpers.rest.getQueue().
  history: [], // track history array
  changingState: false // Used to block out state changes when changing state
}
