module.exports = {

  friendlyName: 'djs / remove',

  description: 'Remove a DJ from the system.',

  inputs: {
    ID: {
      type: 'number',
      required: true,
      description: 'The DJ ID to remove.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller djs/remove called.')

    try {
      // Update all attendance records to null DJ
      await sails.models.attendance.update({ dj: inputs.ID }, { dj: null }).fetch()

      // Update all listeners records to null DJ
      await sails.models.listeners.update({ dj: inputs.ID }, { dj: null }).fetch()

      // Update lockToDJ in hosts to 0, which means the host cannot start any broadcasts at all
      await sails.models.hosts.update({ lockToDJ: inputs.ID }, { lockToDJ: 0 }).fetch()

      // Destroy XP records
      await sails.models.xp.destroy({ dj: inputs.ID }).fetch()

      // Destroy DJ
      await sails.models.djs.destroy({ ID: inputs.ID }).fetch()

      // Edit meta if necessary
      if (sails.models.meta.memory.dj === inputs.ID) { sails.helpers.meta.change.with({ dj: null }) }

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
