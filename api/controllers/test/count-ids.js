module.exports = {

  friendlyName: 'Count IDs',

  description: '',

  inputs: {

  },

  fn: async function (inputs, exits) {
    try {
      var records3 = await sails.models.logs.find({ logtype: 'id' })
      var records4 = {}
      records3
        .filter((record) => record.attendanceID !== null)
        .map((record) => {
          if (typeof records4[record.attendanceID] === 'undefined') { records4[record.attendanceID] = 0 }
          records4[record.attendanceID] += 1
        })

      for (var record in records4) {
        if (Object.prototype.hasOwnProperty.call(records4, record)) {
          await sails.models.attendance.update({ ID: record }, { missedIDs: records4[record] }).fetch()
        }
      }

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
