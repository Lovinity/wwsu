module.exports = {

  friendlyName: 'analytics / showtime',

  description: 'Get analytics about the amount of show time and listenership every DJ had since the beginning of startOfSemester.',

  inputs: {
    djs: {
      type: 'json',
      required: false,
      custom: function (value) {
        var valid = true;
        if (value.length > 0) {
          value.map((val) => {
            if (isNaN(val))
              valid = false;
          })
        }
        return valid;
      },
      description: `Array of DJ IDs if you want showtime records for specific DJs. If not provided, will return all applicable DJs.`
    },
    calendarIDs: {
      type: 'json',
      required: false,
      custom: function (value) {
        var valid = true;
        if (value.length > 0) {
          value.map((val) => {
            if (isNaN(val))
              valid = false;
          })
        }
        return valid;
      },
      description: `Array of calendar IDs of a calendar if you only want showtime records for specific shows/calendars. If not provided, will return all applicable shows.`
    },
    start: {
      type: 'string',
      custom: function (value) {
        return moment(value).isValid()
      },
      description: `moment() parsable string of the start date/time for range analytics. Defaults to the year 2002.`
    },
    end: {
      type: 'string',
      custom: function (value) {
        return moment(value).isValid()
      },
      description: `moment() parsable string of the end date/time for range analytics. Defaults to now.`
    }
  },

  fn: async function (inputs, exits) {
    var data = await sails.helpers.analytics.showtime(inputs.djs, inputs.calendarIDs, inputs.start, inputs.end)
    return exits.success(data)
  }

}
