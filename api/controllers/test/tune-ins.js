module.exports = {

  friendlyName: 'tune ins',

  description: 're-calculate attendance tune-ins.',

  inputs: {
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    var records = await sails.models.attendance.find({ showTime: { '!=': null } })

    if (records.length > 0) {
      var maps = records.map(async (record) => {

        var connections = 0
        var prevListeners = 0
        var records2 = await sails.helpers.analytics.listeners(record.actualStart, record.actualEnd)

        if (records2.length > 0) {
          records2.map((record2) => {
            if (record2.dj === record.dj) {
              if (record2.listeners > prevListeners) { connections += (record2.listeners - prevListeners) }
              prevListeners = record2.listeners
            }
          })
        }

        await sails.models.attendance.update({ ID: record.ID }, { tuneIns: connections })

      })

      await Promise.all(maps)
    }

    return exits.success()
  }

}
