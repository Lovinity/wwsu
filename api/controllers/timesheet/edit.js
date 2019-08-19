
module.exports = {

  friendlyName: 'Timesheet / Edit',

  description: 'Edit a timesheet entry.',

  inputs: {
    ID: {
      type: 'number',
      required: true,
      description: 'The ID number of the Timesheet being edited.'
    },

    timeIn: {
      type: 'string',
      required: true,
      custom: function (value) {
        return moment(value).isValid()
      },
      description: 'A moment.js compatible timestamp for when the director clocked in.'
    },

    timeOut: {
      type: 'string',
      allowNull: true,
      custom: function (value) {
        return value === null || value === '' || moment(value).isValid()
      },
      description: 'A moment.js compatible timestamp for when the director clocked out. Use null or blank string to indicate the director is still clocked in.'
    },

    approved: {
      type: 'boolean',
      required: true,
      description: 'If true, this timesheet is approved. If false, this timesheet is flagged for approval.'
    }
  },

  exits: {
    forbidden: {
      statusCode: 403
    },
    success: {
      statusCode: 200
    },
    notFound: {
      statusCode: 404
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller timesheet/edit called.')

    try {
      // Update the timesheet record
      var records = await sails.models.timesheet.update({ ID: inputs.ID }, { timeIn: moment(inputs.timeIn).toISOString(true), timeOut: moment(inputs.timeOut).toISOString(true), approved: inputs.approved }).fetch()

      // Update director calendar
      var IDs = []
      records.map((record) => IDs.push(record.unique))

      if (IDs.length > 0) {
        if (inputs.approved === -1) { await sails.models.directorhours.update({ unique: IDs, active: [1, 2] }, { active: -1 }).fetch() }

        if (inputs.approved === 0 || inputs.approved === 1) { await sails.models.directorhours.update({ unique: IDs, active: [-1, 2] }, { active: 1 }).fetch() }

        if (inputs.approved === 2) { await sails.models.directorhours.update({ unique: IDs, active: [-1, 1] }, { active: 2 }).fetch() }
      }

      // Force a re-load of all directors to update any possible changes in presence
      await sails.helpers.directors.update()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
