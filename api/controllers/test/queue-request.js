module.exports = {

  friendlyName: `Queue request`,

  description: ``,

  inputs: {

  },

  exits: {

  },

  fn: async function (inputs, exits) {
    await sails.helpers.requests.queue(3, false, true)
    sails.log.verbose(`Test finished`)
    return exits.success()
  }

}
