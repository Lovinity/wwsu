module.exports = {

  friendlyName: 'Calendar / View',

  description: 'Loads the HTML calendar page',

  inputs: {

  },

  exits: {
    success: {
      responseType: 'view',
      viewTemplatePath: 'calendar/home'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller calendar/view called.')
    return exits.success()
  }

}
