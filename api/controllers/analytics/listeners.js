module.exports = {

  friendlyName: 'analytics / listeners',

  description: 'Get an array of listener counts between a specified time period.',

  inputs: {
    start: {
      type: 'string',
      custom: function (value) {
        return moment(value).isValid()
      },
      required: true,
      description: `moment() parsable string of the earliest point in time to get listener counts (system may return one record before this time as a baseline). Recommended ISO string.`
    },

    end: {
      type: 'string',
      custom: function (value) {
        return moment(value).isValid()
      },
      required: true,
      description: `moment() parsable string of the latest point in time to get listener counts. Recommended ISO string.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller analytics/listeners called.')

    try {

      var returnData = await sails.helpers.analytics.listeners(inputs.start, inputs.end)

      return exits.success(returnData)
    } catch (e) {
      return exits.error(e)
    }
  }

}
