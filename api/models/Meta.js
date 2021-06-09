/**
 * sails.models.meta.js
 *
 * @description :: sails.models.meta manages the metadata of what is playing on WWSU Radio.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'nodebase',
  attributes: {

    ID: {
      type: 'number',
      autoIncrement: true
    },

    state: {
      type: 'string'
    },

    host: {
      type: 'number',
      allowNull: true
    },

    dj: {
      type: 'number',
      allowNull: true
    },

    cohostDJ1: {
      type: 'number',
      allowNull: true
    },

    cohostDJ2: {
      type: 'number',
      allowNull: true
    },

    cohostDJ3: {
      type: 'number',
      allowNull: true
    },

    show: {
      type: 'string',
      allowNull: true
    },

    showLogo: {
      type: 'string',
      allowNull: true
    },

    attendanceID: {
      type: 'number',
      allowNull: true
    },

    attendanceChecked: {
      type: 'ref',
      columnType: 'datetime'
    },

    scheduledStart: {
      type: 'ref',
      columnType: 'datetime'
    },

    scheduledEnd: {
      type: 'ref',
      columnType: 'datetime'
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

    hostCalling: {
      type: "number",
      allowNull: true
    },

    hostCalled: {
      type: "number",
      allowNull: true
    },

    calendarID: {
      type: 'number',
      allowNull: true
    },

    calendarUnique: {
      type: 'string',
      allowNull: true
    },

    playlistID: {
      type: 'number',
      allowNull: true,
    },

    playlist: {
      type: 'string',
      allowNull: true
    },

    genre: {
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
    },

    lastID: {
      type: 'ref',
      columnType: 'datetime'
    },

    timeout: {
      type: 'ref',
      columnType: 'datetime'
    },

    discordChannel: {
      type: 'string',
      allowNull: true,
    },

  },

  // Used for sails.helpers.meta.change when changing meta.memory
  // Update sails.helpers.meta.change.inputs whenever you change any of these!
  template: {
    state: {
      type: 'string',
      defaultsTo: 'unknown',
      description: 'State of the WWSU system'
    },
    host: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the host currently controlling the broadcast.'
    },
    dj: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the DJ currently on the air, or null if not applicable.'
    },
    cohostDJ1: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the first cohost DJ on the air, or null if not applicable.'
    },
    cohostDJ2: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the second cohost DJ on the air, or null if not applicable.'
    },
    cohostDJ3: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the third cohost DJ on the air, or null if not applicable.'
    },
    attendanceID: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the Attendance record the system is currently running under'
    },
    attendanceChecked: {
      type: 'string',
      allowNull: true,
      description: 'ISO timestamp of when calendar attendance was last checked',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    scheduledStart: {
      type: 'string',
      allowNull: true,
      description: 'ISO timestamp of when the current programming was scheduled to start',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    scheduledEnd: {
      type: 'string',
      allowNull: true,
      description: 'ISO timestamp of when the current programming is scheduled to end',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    show: {
      type: 'string',
      defaultsTo: '',
      description: 'If someone is on the air, host name - show name, or name of sports for sports broadcasts'
    },
    showLogo: {
      type: 'string',
      allowNull: true,
      description: 'File name of the logo of the current broadcast (assets/uploads/calendar/logo)'
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
    calendarUnique: {
      type: 'string',
      allowNull: true,
      description: 'Google Calendar unique ID of the current program.'
    },
    genre: {
      type: 'string',
      defaultsTo: '',
      description: 'Name of the genre or rotation currently being played, if any'
    },
    calendarID: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the calendar event currently airing.'
    },
    playlistID: {
      type: 'number',
      allowNull: true,
      description: 'ID of the playlist currently running'
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
    queueCalculating: {
      type: 'boolean',
      defaultsTo: false,
      description: 'If true, do not consider queueFinish as accurate until this changes to false.'
    },
    trackFinish: {
      type: 'string',
      allowNull: true,
      description: 'An ISO timestamp of when the current track is expected to finish. NOTE: To conserve data, this is only pushed through websockets when the expected finish time changes by more than 1 second. Also, this will be null when not playing anything.',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    countdown: {
      type: 'string',
      allowNull: true,
      description: 'An ISO timestamp which to count down on the display signs for shows.',
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
      description: 'An ISO timestamp of when the last top of hour ID break was aired.',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    timeout: {
      type: 'string',
      allowNull: true,
      description: 'ISO timestamp of when the current break / state will time out.',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    delaySystem: {
      type: 'number',
      allowNull: true,
      description: 'Number of seconds currently on the delay system. Null means delay system might be offline or delay system is in bypass mode.'
    },
    webchat: {
      type: 'boolean',
      defaultsTo: true,
      description: 'Set to false to restrict the ability to send chat messages through the website'
    },
    hostCalling: {
      type: "number",
      allowNull: true,
      description: "The host ID who initiated the remote broadcast call (null: no calls in progress)"
    },
    hostCalled: {
      type: "number",
      allowNull: true,
      description: "The host ID who was called for the remote broadcast (null: no calls in progress)"
    },
    discordChannel: {
      type: 'string',
      allowNull: true,
      description: 'If not null, this is the discord channel pertaining to the current broadcast (the Discord bot should take these messages and publish them to internal chat system and count them in analytics).'
    },
  },

  // DO NOT change any values in meta.memory directly! Instead, use sails.helpers.meta.change. This is populated in bootstrap.js via meta.template.
  // DO NOT change anything in memoryDefault; this contains default template values generated by bootstrap when lofi (check disabling) is enabled.
  memory: {},
  memoryDefault: {},

  automation: [], // Tracks in automation, populated by sails.helpers.rest.getQueue().
  queueMemory: [], // Used when a DJ populates RadioDJ with tracks and initiates a break; will erase RadioDJ but re-populate the queue with the tracks once break is done
  history: [], // track history array
  changingState: false // Used to block out state changes when changing state
}
