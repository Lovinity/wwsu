/* global Meta */

module.exports = {

  friendlyName: 'Automation',

  description: 'Automation test.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    return exits.success(Meta.automation)
  }

}
