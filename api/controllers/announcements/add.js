module.exports = {

  friendlyName: 'Announcements / Add',

  description: 'Add an announcement.',

  inputs: {
    type: {
      type: 'string',
      required: true,
      description: 'The type of announcement; determines which subsystems receive the announcement.'
    },

    level: {
      type: 'string',
      required: true,
      isIn: [ 'danger', 'warning', 'info', 'trivial' ],
      description: 'Announcement warning level. Must be danger, warning, info, or trivial.'
    },

    title: {
      type: 'string',
      required: true,
      description: 'The announcement title.'
    },

    announcement: {
      type: 'string',
      required: true,
      description: 'The announcement text.'
    },

    displayTime: {
      type: 'number',
      defaultsTo: 15,
      min: 5,
      max: 60
    },

    starts: {
      type: 'string',
      custom: function (value) {
        return DateTime.fromISO(value).isValid
      },
      allowNull: true,
      description: `ISO string of when the announcement starts.`
    },

    expires: {
      type: 'string',
      custom: function (value) {
        return DateTime.fromISO(value).isValid
      },
      allowNull: true,
      description: `ISO string of when the announcement expires.`
    }

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller announcements/add called.')

    try {
      // Add the announcement to the database
      await sails.models.announcements.create({ type: inputs.type, level: inputs.level, title: inputs.title, announcement: inputs.announcement, displayTime: inputs.displayTime, starts: inputs.starts !== null && typeof inputs.starts !== 'undefined' ? inputs.starts : DateTime.local().toISO(), expires: inputs.expires !== null && typeof inputs.expires !== 'undefined' ? inputs.expires : DateTime.fromObject({ year: 3000 }).toISO() }).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
