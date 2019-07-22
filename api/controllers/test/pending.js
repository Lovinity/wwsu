module.exports = {

  friendlyName: `Pending`,

  description: `Pending test.`,

  inputs: {

  },

  exits: {

  },

  fn: async function (inputs, exits) {
    return exits.success(sails.models.songs.pending)
  }

}
