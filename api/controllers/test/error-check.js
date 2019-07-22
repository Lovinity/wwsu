module.exports = {

  friendlyName: 'Error check',

  description: '',

  inputs: {

  },

  fn: async function (inputs, exits) {
    return exits.success(sails.models.status.errorCheck)
  }

}
