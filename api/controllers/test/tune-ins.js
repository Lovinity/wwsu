module.exports = {

  friendlyName: 'tune ins',

  description: 're-calculate attendance tune-ins.',

  inputs: {
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    var records = await sails.models.attendance.find({ showTime: { '!=': null }, actualStart: { '!=': null }, actualEnd: { '!=': null } })

    if (records.length > 0) {
      var maps = records.map(async (record) => {

        var connections = 0
        var records2 = await sails.models.listeners.find({ createdAt: { '>=': currentRecord.actualStart }, createdAt: { '<': currentRecord.actualEnd } }).sort('createdAt ASC')
        var prevListeners = await sails.models.listeners.find({ createdAt: { '<=': currentRecord.actualStart } }).sort('createdAt DESC').limit(1) || 0
        if (prevListeners[ 0 ]) { prevListeners = prevListeners[ 0 ].listeners || 0 }

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
