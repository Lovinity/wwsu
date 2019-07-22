module.exports = {

  friendlyName: `Requests pending`,

  description: ``,

  inputs: {

  },

  exits: {

  },

  fn: async function (inputs, exits) {
    return exits.success(sails.models.requests.pending)
  }

}
