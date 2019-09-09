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

      months[moment(start).format('MMMM YYYY')] = { streamHits: 0, listenerHoursTotal: 0, listenerHoursShows: 0, listenerToShowtimeRatioTotal: 0, listenerToShowtimeRatioShows: 0, tracksLiked: 0, webMessages: 0, requestsPlaced: 0 }

      var records = await sails.models.listeners.find({ createdAt: { '>=': moment(start).toISOString(true), '<': moment(end).toISOString(true) } }).sort(`createdAt ASC`)
      var prevAmount = 0
      records.map((record) => {
        if (record.listeners > prevAmount) {
          months[moment(start).format('MMMM YYYY')].streamHits += (record.listeners - prevAmount)
        }
        prevAmount = record.listeners
      })
      months[moment(start).format('MMMM YYYY')].listenerHoursTotal = await sails.models.attendance.sum('listenerMinutes', { createdAt: { '>=': moment(start).toISOString(true), '<': moment(end).toISOString(true) } }) / 60
      var showTime = await sails.models.attendance.sum('showTime', { createdAt: { '>=': moment(start).toISOString(true), '<': moment(end).toISOString(true) } }) / 60
      months[moment(start).format('MMMM YYYY')].listenerToShowtimeRatioTotal = (showTime > 0) ? months[moment(start).format('MMMM YYYY')].listenerHoursTotal / showTime : 0
      months[moment(start).format('MMMM YYYY')].listenerHoursShows = await sails.models.attendance.sum('listenerMinutes', { dj: { '!=': null }, createdAt: { '>=': moment(start).toISOString(true), '<': moment(end).toISOString(true) } }) / 60
      var showTimeB = await sails.models.attendance.sum('showTime', { dj: { '!=': null }, createdAt: { '>=': moment(start).toISOString(true), '<': moment(end).toISOString(true) } }) / 60
      months[moment(start).format('MMMM YYYY')].listenerToShowtimeRatioShows = (showTime > 0) ? months[moment(start).format('MMMM YYYY')].listenerHoursShows / showTimeB : 0
      months[moment(start).format('MMMM YYYY')].tracksLiked = await sails.models.songsliked.count({ createdAt: { '>=': moment(start).toISOString(true), '<': moment(end).toISOString(true) } })
      months[moment(start).format('MMMM YYYY')].webMessages = await sails.models.messages.count({ or: [{ from: { startsWith: 'website-' } }, { to: ['DJ', 'DJ-private'] }], createdAt: { '>=': moment(start).toISOString(true), '<': moment(end).toISOString(true) } })
      months[moment(start).format('MMMM YYYY')].requestsPlaced = await sails.models.requests.count({ createdAt: { '>=': moment(start).toISOString(true), '<': moment(end).toISOString(true) } })
    }

    return exits.success(months)
  }

}
