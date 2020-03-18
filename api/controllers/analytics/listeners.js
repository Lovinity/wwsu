module.exports = {

  friendlyName: 'analytics / listeners',

  description: 'Get an array of listener counts between a specified time period.',

  inputs: {
    start: {
      type: 'string',
      custom: function (value) {
        return DateTime.fromISO(value).isValid
      },
      required: true,
      description: `ISO string of the earliest point in time to get listener counts (system may return one record before this time as a baseline).`
    },

    end: {
      type: 'string',
      custom: function (value) {
        return DateTime.fromISO(value).isValid
      },
      required: true,
      description: `ISO string of the latest point in time to get listener counts.`
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
