const bcrypt = require('bcrypt')
module.exports = {

  friendlyName: 'djs / edit',

  description: 'Change the name or login of a DJ. If a DJ with the same name already exists, the two DJs will be merged.',

  inputs: {
    ID: {
      type: 'number',
      required: true,
      description: 'The ID of the dj to edit.'
    },
    name: {
      type: 'string',
      allowNull: true,
      description: 'The new name for the DJ.'
    },
    login: {
      type: 'string',
      allowNull: true,
      description: 'The new login for the DJ.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller djs/edit called.')

    try {
      // Determine what needs updating
      var criteria = {}
      if (inputs.name !== null && typeof inputs.name !== 'undefined' && inputs.name !== '') {
        criteria.name = inputs.name

        // Merge other DJ entries with the same name with this one
        var dj = await sails.models.djs.find({ name: inputs.name })
        if (dj && dj.length > 0) {
          var maps = dj
            .filter((record) => record.ID !== inputs.ID)
            .map(async record => {
            // Update all XP records
              await sails.models.xp.update({ dj: record.ID }, { dj: inputs.ID }).fetch()

              // Update all attendance records
              await sails.models.attendance.update({ dj: record.ID }, { dj: inputs.ID }).fetch()

              // Update all listeners records
              await sails.models.listeners.update({ dj: record.ID }, { dj: inputs.ID }).fetch()

              // Update lockToDJ in hosts
              await sails.models.hosts.update({ lockToDJ: record.ID }, { lockToDJ: inputs.ID }).fetch()

              // Remove the original record
              await sails.models.djs.destroy({ ID: record.ID }).fetch()

              // Edit meta if necessary
              if (sails.models.meta.memory.dj === record.ID) { sails.helpers.meta.change.with({ dj: inputs.ID }) }
            })
          await Promise.all(maps)
        }
      }

      // Encrypt login
      if (inputs.login !== null && typeof inputs.login !== 'undefined') { criteria.login = bcrypt.hashSync(inputs.login, 10) }

      // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
      var criteriaB = _.cloneDeep(criteria)

      // Edit it
      await sails.models.djs.update({ ID: inputs.ID }, criteriaB).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
