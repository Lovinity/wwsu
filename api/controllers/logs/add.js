module.exports = {

  friendlyName: 'logs / add',

  description: 'Add a log entry into the system.',

  inputs: {
    date: {
      type: 'string',
      custom: function (value) {
        return moment(value).isValid()
      },
      allowNull: true,
      description: `moment() parsable string of a date in which this log took place. Defaults to now.`
    },
    logtype: {
      type: 'string',
      required: true,
      description: 'Category of log.'
    },
    loglevel: {
      type: 'string',
      required: true,
      isIn: ['danger', 'urgent', 'warning', 'info', 'success', 'primary', 'secondary'],
      description: 'Log severity: danger, urgent, warning, info, success, primary, or secondary.'
    },

    logsubtype: {
      type: 'string',
      allowNull: true,
      description: 'Log subcategory / subtype, such as a radio show name.'
    },

    event: {
      type: 'string',
      required: true,
      description: 'The log event / what happened, plus any data (other than track information).'
    },

    trackArtist: {
      type: 'string',
      allowNull: true,
      description: 'If a track was played, the artist of the track, used for spin counts.'
    },

    trackTitle: {
      type: 'string',
      allowNull: true,
      description: 'If a track was played, the title of the track, used for spin counts.'
    },

    trackAlbum: {
      type: 'string',
      allowNull: true,
      description: 'If a track was played, the album of the track.'
    },

    trackLabel: {
      type: 'string',
      allowNull: true,
      description: 'If a track was played, the record label of the track.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller logs/add called.')

    try {
      // Prevent adding manual logs if host is lockToDJ and the specified lockToDJ is not on the air
      if (inputs.logtype === 'manual' && this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj) { return exits.error(new Error('You are not authorized to add a log entry because you are not on the air.')) }

      // Create the log entry
      await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: inputs.logtype, loglevel: inputs.loglevel, logsubtype: inputs.logsubtype, event: inputs.event, trackArtist: inputs.trackArtist, trackTitle: inputs.trackTitle, trackAlbum: inputs.trackAlbum, trackLabel: inputs.trackLabel, createdAt: inputs.date !== null && typeof inputs.date !== 'undefined' ? moment(inputs.date).toISOString(true) : moment().toISOString(true) }).fetch()

      // Set manual meta if criteria matches
      if (inputs.logtype === 'manual' && inputs.trackArtist.length > 0 && inputs.trackTitle.length > 0) {
        await sails.helpers.meta.change.with({ trackArtist: inputs.trackArtist, trackTitle: inputs.trackTitle, trackAlbum: inputs.trackAlbum, trackLabel: inputs.trackLabel, trackStamp: inputs.date !== null && typeof inputs.date !== 'undefined' ? moment(inputs.date).toISOString(true) : moment().toISOString(true) })
      } else if (inputs.logtype === 'manual') {
        await sails.helpers.meta.change.with({ trackArtist: null, trackTitle: null, trackAlbum: null, trackLabel: null, trackStamp: null })
      }

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
