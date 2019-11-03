module.exports = {

  friendlyName: 'Underwritings / Edit',

  description: 'Edit an underwriting record.',

  inputs: {
    ID: {
      type: 'number',
      required: true,
      description: 'The ID of the underwriting record to edit.'
    },
    name: {
      type: 'string',
      description: 'New name for the underwriting entry.'
    },
    trackID: {
      type: 'number',
      description: 'Updated ID of the track in RadioDJ that this underwriting is associated with.'
    },
    mode: {
      type: 'json',
      custom: (value) => {
        if (typeof value.mode === `undefined` || (value.mode !== 0 && value.mode !== 1)) { return false }

        if (typeof value.schedule === `undefined`) { return false }

        if (typeof value.schedule.schedules === `undefined`) { return false }

        if (typeof value.scheduleForced === `undefined`) { return false }

        if (typeof value.scheduleForced.schedules === `undefined`) { return false }

        return true
      },
      description: 'Mode data for this underwriting.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller underwritings/edit called.')

    try {
      // Determine what needs updating
      var criteria = {}
      if (typeof inputs.name !== `undefined`) { criteria.name = inputs.name }
      if (typeof inputs.trackID !== `undefined`) { criteria.trackID = inputs.trackID }
      if (typeof inputs.mode !== `undefined`) {

        // If there are forced schedules, but no regular schedules, treat as forced schedule only rather than forced schedule + 24/7 regular schedule.
        if (inputs.mode.schedule.schedules.length === 0 && inputs.mode.scheduleForced.schedules.length > 0) {
          inputs.mode.schedule.schedules = null
        }

        // Never have 24/7 forced schedules
        if (inputs.mode.scheduleForced.schedules.length === 0) {
          inputs.mode.scheduleForced.schedules = null
        }

        criteria.mode = inputs.mode
      }

      var criteriaB = _.cloneDeep(criteria)

      // Update the underwriting
      await sails.models.underwritings.update({ ID: inputs.ID }, criteriaB).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
