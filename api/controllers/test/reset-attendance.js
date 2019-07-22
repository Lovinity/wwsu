module.exports = {

  friendlyName: 'reset attendance',

  description: 'attendance reset.',

  inputs: {
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    var records = await sails.models.attendance.find({ event: { contains: '{CANCELLED via Google Calendar}' } })

    records.map((record) => {
      var newEvent = record.event.replace(' {CANCELLED via Google Calendar}', '');
      (async (record2, newEvent2) => {
        await sails.models.attendance.update({ ID: record2.ID }, { happened: -1, event: newEvent2 })
      })(record, newEvent)
    })

    records = await sails.models.attendance.find({ happened: 1, actualStart: null, actualEnd: null })

    records.map((record) => {
      (async (record2) => {
        await sails.models.attendance.update({ ID: record2.ID }, { happened: 0 })
      })(record)
    })

    return exits.success()
  }

}
