// TODO: Modify for new calendar system

module.exports = {

  friendlyName: 'sails.models.planner / add-calendar',

  description: 'Add all of the shows and prerecords that currently exist on the Google sails.models.calendar in the next 7 days.',

  inputs: {
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller planner/add-calendar called.')
    try {
      // Get calendar records
      var records = await sails.models.calendar.find({ or: [{ title: { startsWith: 'Show: ' } }, { title: { startsWith: 'Prerecord: ' } }], start: { '<=': moment().add(7, 'days').toISOString(true) } })
      var maps = records.map(async (record) => {
        // Determine DJ and show name
        var dj = `Unknown`
        var show = record.title
        if (record.title !== null && record.title.includes(' - ')) {
          var temp = record.title.replace(`Show: `, ``).replace(`Prerecord: `, ``).split(` - `)
          dj = temp[0]
          show = temp[1]
        }

        // Covert start and end times to week integers
        var start = await sails.helpers.weekToInt(moment(record.start).day(), moment(record.start).hour(), moment(record.start).minute())
        var end = await sails.helpers.weekToInt(moment(record.end).day(), moment(record.end).hour(), moment(record.end).minute())

        // Create the planner record
        await sails.models.planner.create({ dj: dj, show: show, actual: { start: start, end: end } }).fetch()
      })

      await Promise.all(maps)

      return exits.success(await sails.models.planner.find())
    } catch (e) {
      return exits.error(e)
    }
  }

}
