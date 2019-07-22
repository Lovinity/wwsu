module.exports = {

  friendlyName: `Sportscats`,

  description: `Sportscats test.`,

  inputs: {

  },

  fn: async function (inputs, exits) {
    return exits.success(sails.config.custom.sportscats)
  }

}
