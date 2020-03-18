module.exports = {

  friendlyName: 'Announcements / Edit',

  description: 'Edit an existing announcement.',

  inputs: {
    ID: {
      type: 'number',
      required: true,
      description: 'The ID of the record to edit.'
    },

    type: {
      type: 'string',
      description: 'The type of announcement; determines which subsystems receive the announcement.'
    },

    level: {
      type: 'string',
      isIn: ['danger', 'warning', 'info', 'trivial'],
      description: 'Announcement warning level. Must be danger, warning, info, or trivial.'
    },

    title: {
      type: 'string',
      required: true,
      description: 'The announcement title.'
    },

    announcement: {
      type: 'string',
      description: 'The announcement text.'
    },

    displayTime: {
      type: 'number',
      min: 5,
      max: 60
    },

    starts: {
      type: 'string',
      custom: function (value) {
        return value === null || DateTime.fromISO(value).isValid
      },
      allowNull: true,
      description: `ISO string of when the announcement starts.`
    },

    expires: {
      type: 'string',
      custom: function (value) {
        return value === null || DateTime.fromISO(value).isValid
      },
      allowNull: true,
      description: `ISO string of when the announcement expires. Defaults to the year 3000.`
    }

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller announcements/edit called.')

    try {
      // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
      var criteriaB = _.cloneDeep(inputs)

      if (inputs.type !== null && typeof inputs.type !== 'undefined') {
        // If the type changed, issue a remove websocket event to the previous type.
        var record = await sails.models.announcements.findOne({ ID: inputs.ID })
        if (record && record.type !== inputs.type) { sails.sockets.broadcast(`announcements-${record.type}`, 'announcements', { remove: inputs.ID }) }
      }

      // Update the announcement
      await sails.models.announcements.update({ ID: inputs.ID }, criteriaB).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
