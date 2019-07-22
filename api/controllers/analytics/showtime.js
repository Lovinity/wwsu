module.exports = {

  friendlyName: `analytics / showtime`,

  description: `Get analytics about the amount of show time and listenership every DJ had since the beginning of startOfSemester.`,

  inputs: {
    dj: {
      type: `number`,
      required: false,
      description: `Provide the ID of a dj if you only want showtime records for a specific DJ.`
    }
  },

  fn: async function (inputs, exits) {
    var data = await sails.helpers.analytics.showtime(inputs.dj)
    return exits.success(data)
  }

}
