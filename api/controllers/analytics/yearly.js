module.exports = {

  friendlyName: 'tune-in',

  description: 'tune-in test.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    var months = {}

    for (var i = 12; i > 0; i--) {
      var start = DateTime.local().minus({months: i})
      var end = DateTime.local().minus({months: i - 1})

      months[start.toFormat('MMMM yyyy')] = { streamHits: 0, listenerHoursTotal: 0, listenerHoursShows: 0, listenerToShowtimeRatioTotal: 0, listenerToShowtimeRatioShows: 0, tracksLiked: 0, webMessages: 0, requestsPlaced: 0 }

      var records = await sails.models.listeners.find({ createdAt: { '>=': start.toISO(), '<': end.toISO() } }).sort(`createdAt ASC`)
      var prevAmount = 0
      records.map((record) => {
        if (record.listeners > prevAmount) {
          months[start.toFormat('MMMM yyyy')].streamHits += (record.listeners - prevAmount)
        }
        prevAmount = record.listeners
      })
      months[start.toFormat('MMMM yyyy')].listenerHoursTotal = await sails.models.attendance.sum('listenerMinutes', { createdAt: { '>=': start.toISO(), '<': end.toISO() } }) / 60
      var showTime = await sails.models.attendance.sum('showTime', { createdAt: { '>=': start.toISO(), '<': end.toISO() } }) / 60
      months[start.toFormat('MMMM yyyy')].listenerToShowtimeRatioTotal = (showTime > 0) ? months[start.toFormat('MMMM yyyy')].listenerHoursTotal / showTime : 0
      months[start.toFormat('MMMM yyyy')].listenerHoursShows = await sails.models.attendance.sum('listenerMinutes', { dj: { '!=': null }, createdAt: { '>=': start.toISO(), '<': end.toISO() } }) / 60
      var showTimeB = await sails.models.attendance.sum('showTime', { dj: { '!=': null }, createdAt: { '>=': start.toISO(), '<': end.toISO() } }) / 60
      months[start.toFormat('MMMM yyyy')].listenerToShowtimeRatioShows = (showTime > 0) ? months[start.toFormat('MMMM yyyy')].listenerHoursShows / showTimeB : 0
      months[start.toFormat('MMMM yyyy')].tracksLiked = await sails.models.songsliked.count({ createdAt: { '>=': start.toISO(), '<': end.toISO() } })
      months[start.toFormat('MMMM yyyy')].webMessages = await sails.models.messages.count({ or: [{ from: { startsWith: 'website-' } }, { to: ['DJ', 'DJ-private'] }], createdAt: { '>=': start.toISO(), '<': end.toISO() } })
      months[start.toFormat('MMMM yyyy')].requestsPlaced = await sails.models.requests.count({ createdAt: { '>=': start.toISO(), '<': end.toISO() } })
    }

    return exits.success(months)
  }

}
