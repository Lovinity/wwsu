module.exports = {

  friendlyName: 'planner / remove-all',

  description: 'Remove all records from the schedule planner.',

  inputs: {
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller planner/remove-all called.')

    try {
      await sails.models.planner.destroy({}).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
