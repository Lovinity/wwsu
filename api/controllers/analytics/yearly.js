module.exports = {

  friendlyName: 'tune-in',

  description: 'tune-in test.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    var months = {}

    for (var i = 12; i > 0; i--) {
      var start = moment().subtract(i, 'months')
      var end = moment().subtract(i - 1, 'months')

      months[moment(start).format('MMMM YYYY')] = { streamHits: 0, tracksLiked: 0, webMessages: 0, requestsPlaced: 0 }

      var records = await sails.models.listeners.find({ createdAt: { '>=': moment(start).toISOString(true), '<': moment(end).toISOString(true) } }).sort(`createdAt ASC`)
      var prevAmount = 0
      records.map((record) => {
        if (record.listeners > prevAmount) {
          months[moment(start).format('MMMM YYYY')].streamHits += (record.listeners - prevAmount)
        }
        prevAmount = record.listeners
      })

      months[moment(start).format('MMMM YYYY')].tracksLiked = await sails.models.songsliked.count({ createdAt: { '>=': moment(start).toISOString(true), '<': moment(end).toISOString(true) } })
      months[moment(start).format('MMMM YYYY')].webMessages = await sails.models.messages.count({ or: [{ from: { startsWith: 'website-' } }, { to: ['DJ', 'DJ-private'] }], createdAt: { '>=': moment(start).toISOString(true), '<': moment(end).toISOString(true) } })
      months[moment(start).format('MMMM YYYY')].requestsPlaced = await sails.models.requests.count({ createdAt: { '>=': moment(start).toISOString(true), '<': moment(end).toISOString(true) } })
    }

    return exits.success(months)
  }

}
