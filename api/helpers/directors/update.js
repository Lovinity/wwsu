module.exports = {

  friendlyName: 'directors.update',

  description: 'Re-calculate director presence and clock status.',

  inputs: {
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper directors.update called.')
    try {
      var names = {}

      // Determine presence by analyzing timesheet records up to 14 days ago
      var records = await sails.models.timesheet.find({
        where: {
          or: [
            { timeOut: { '>=': moment().subtract(14, 'days').toDate() } },
            { timeOut: null }
          ]
        },
        sort: 'timeIn DESC'
      })
      sails.log.debug(`directors.update records`)
      if (records.length > 0) {
        // Update present and since entries in the Directors database
        var maps = records
          .map(async record => {
            if (typeof names[record.name] !== 'undefined') { return false }

            names[record.name] = true
            // If there's an entry with a null timeOut, then consider the director clocked in
            if (record.timeOut === null && record.timeIn !== null) {
              await sails.models.directors.update({ name: record.name }, { present: true, since: moment(record.timeIn).toISOString(true) })
                .tolerate(() => {
                })
                .fetch()
            } else {
              await sails.models.directors.update({ name: record.name }, { present: false, since: moment(record.timeOut).toISOString(true) })
                .tolerate(() => {
                })
                .fetch()
            }
          })
        await Promise.all(maps)
        sails.log.debug(`directors.update maps`)
      }
      sails.log.debug(`directors.update done`)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
