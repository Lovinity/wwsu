module.exports = {

  friendlyName: `error.reset helper`,

  description: `Resets an errorCheck counter to 0.`,

  inputs: {
    name: {
      type: `string`,
      required: true,
      custom: function (value) {
        if (typeof sails.models.status.errorCheck[value] === `object` && typeof sails.models.status.errorCheck[value].fn === `function`) { return true }
        return false
      },
      description: `Name of the sails.models.status.errorCheck key to reset.`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper error.reset called.`)

    try {
      // Reset the error check count to 0.
      sails.models.status.errorCheck[inputs.name].count = 0

      // All done.
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
