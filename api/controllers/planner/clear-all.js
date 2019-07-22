module.exports = {

  friendlyName: 'planner / clear-all',

  description: 'Remove all actual timeslots all planner records.',

  inputs: {
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller planner/clear-all called.')

    try {
      await sails.models.planner.update({}, { actual: {} }).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
