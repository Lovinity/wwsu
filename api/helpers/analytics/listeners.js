module.exports = {

    friendlyName: 'analytics.listeners',
  
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
      sails.log.debug('Helper analytics.listeners called.')
  
      try {
        var records = []
        var start = DateTime.fromISO(inputs.start)
        var end = DateTime.fromISO(inputs.end)
  
        // First, get the listeners within the given range
        var records1 = await sails.models.listeners.find({ createdAt: { '>=': start.toISO(), '<': end.toISO() } }).sort('createdAt ASC')
  
        if (records1) { records = records.concat(records1) }
  
        // If the earliest returned record still falls after the provided start time, add the latest record before the provided start time as a baseline.
        if (typeof records1[0] === 'undefined' || start < DateTime.fromISO(records1[0].createdAt)) {
          var records2 = await sails.models.listeners.find({ createdAt: { '<': start.toISO() } }).sort('createdAt DESC').limit(1)
          if (records2) { records = records2.concat(records) }
        }
  
        return exits.success(records)
      } catch (e) {
        return exits.error(e)
      }
    }
  
  }