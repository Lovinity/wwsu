module.exports = {

  friendlyName: 'Timesheet / Remove',

  description: 'Remove a timesheet entry. Also removes directorhours if applicable.',

  inputs: {
    ID: {
      type: 'number',
      required: true,
      description: 'The ID number of the Timesheet to remove.'
    }
  },

  exits: {
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller timesheet/remove called.')

    try {
      // Update the timesheet record
      var records = await sails.models.timesheet.destroy({ ID: inputs.ID }).fetch()

      // If there are no more timesheet records for this Google Calendar entry, also remove the director hours entry
      var IDs = []
      records.map((record) => IDs.push(record.unique))
      if (IDs.length > 0) { await sails.models.directorhours.destroy({ unique: IDs }).fetch() }

      // Force a re-load of all directors to update any possible changes in presence
      await sails.helpers.directors.update()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
