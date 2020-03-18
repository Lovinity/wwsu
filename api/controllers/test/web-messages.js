// TODO: Update with luxon

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

        var messages = await sails.models.messages.count({ status: 'active', or: [ { to: { startsWith: 'website-' } }, { to: 'DJ' }, { to: 'DJ-private' } ], createdAt: { '>=': moment(record.actualStart).toISOString(true), '<': moment(record.actualEnd).toISOString(true) } })

        await sails.models.attendance.update({ ID: record.ID }, { webMessages: messages })

      })

      await Promise.all(maps)
    }

    return exits.success()
  }

}
