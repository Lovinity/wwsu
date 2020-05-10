module.exports = {

  friendlyName: 'analytics / showtime',

  description: 'Get analytics about the amount of show time and listenership every DJ had since the beginning of startOfSemester.',

  inputs: {
    dj: {
      type: 'number',
      required: false,
      description: `Provide the ID of a dj if you only want showtime records for a specific DJ.`
    },
    calendarID: {
      type: 'number',
      required: false,
      description: `Provide the ID of a calendar if you only want showtime records for a specific show/calendar. If not provided, will return all applicable shows.`
    }
  },

  fn: async function (inputs, exits) {
    var data = await sails.helpers.analytics.showtime(inputs.dj, inputs.calendarID)
    return exits.success(data)
  }

}
