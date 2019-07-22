module.exports = {

  friendlyName: 'tune-in',

  description: 'tune-in test.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    var months = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

    var records = await sails.models.listeners.find().sort(`createdAt ASC`)
    var prevAmount = 0

    records.map((record) => {
      if (record.listeners > prevAmount) {
        months[moment(record.createdAt).month()] += (record.listeners - prevAmount)
      }
      prevAmount = record.listeners
    })

    return exits.success(months)
  }

}
