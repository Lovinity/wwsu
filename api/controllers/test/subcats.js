module.exports = {

  friendlyName: `Subcats`,

  description: `Subcats test.`,

  inputs: {

  },

  fn: async function (inputs, exits) {
    return exits.success(sails.config.custom.subcats)
  }

}
