module.exports = {

  friendlyName: 'attendance.calculateStats',

  description: 'Re-calculate weekly analytics and broadcast them through the websockets',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper attendance.calculateStats called.')

    try {
      // Get stats for the last 7 days
      var earliest = moment().subtract(1, 'weeks')

      // Prepare with a clean template
      sails.models.attendance.weeklyAnalytics = {
        topShows: [],
        topGenre: 'None',
        topPlaylist: 'None',
        onAir: 0,
        onAirListeners: 0,
        tracksLiked: 0,
        tracksRequested: 0,
        webMessagesExchanged: 0
      }

      // Define compare function for sorting records;
      var compare = function (a, b) {
        var ratioA = a.showTime > 0 ? a.listenerMinutes / a.showTime : 0
        var ratioB = b.showTime > 0 ? b.listenerMinutes / b.showTime : 0
        if (ratioA > ratioB) { return -1 }
        if (ratioB > ratioA) { return 1 }
        return 0
      }

      // Grab attendance records from the last 7 days
      var records = await sails.models.attendance.find({ showTime: { '!=': null }, listenerMinutes: { '!=': null }, actualEnd: { '>=': earliest.toISOString(true) } })

      var totals = {}
      var totalsG = {}
      var totalsP = {}

      // Prepare parallel function 1
      var f1 = async () => {
        // Grab count of liked tracks from last week
        sails.models.attendance.weeklyAnalytics.tracksLiked = await sails.models.songsliked.count({ createdAt: { '>=': earliest.toISOString(true) } })

        // Grab count of requested tracks
        sails.models.attendance.weeklyAnalytics.tracksRequested = await sails.models.requests.count({ createdAt: { '>=': earliest.toISOString(true) } })

        // Grab count of webMessagesExchanged
        sails.models.attendance.weeklyAnalytics.webMessagesExchanged = await sails.models.messages.count({ status: 'active', or: [{ from: { startsWith: 'website' } }, { to: { startsWith: 'website' } }], createdAt: { '>=': earliest.toISOString(true) } })
      }

      // Prepare parallel function 2
      var f2 = async () => {
        // Go through each record of attendance and populate topShows, onAir, and onAirListeners
        records
          .filter(attendance => attendance.calendarID !== null)
          .map(attendance => {
            var show = attendance.event
            show = show.substring(show.indexOf(': ') + 2)

            // OnAir programming of Sports, Show, Remote, or Prerecord counts as show time.
            if (attendance.event.toLowerCase().startsWith('sports:') || attendance.event.toLowerCase().startsWith('show:') || attendance.event.toLowerCase().startsWith('remote:') || attendance.event.toLowerCase().startsWith('prerecord:')) {
              sails.models.attendance.weeklyAnalytics.onAir += attendance.showTime
              sails.models.attendance.weeklyAnalytics.onAirListeners += attendance.listenerMinutes

              // Sports broadcasts should not count towards the top 3 shows
              if (!attendance.event.toLowerCase().startsWith('sports:')) {
                // Group showTime and listenerMinutes by show; we only want one record per show to use when comparing top shows
                if (typeof totals[show] === 'undefined') { totals[show] = { showTime: 0, listenerMinutes: 0 } }
                totals[show].showTime += attendance.showTime
                totals[show].listenerMinutes += attendance.listenerMinutes
              }
            } else if (attendance.event.toLowerCase().startsWith('genre:')) {
              if (typeof totalsG[show] === 'undefined') { totalsG[show] = { showTime: 0, listenerMinutes: 0 } }
              totalsG[show].showTime += attendance.showTime
              totalsG[show].listenerMinutes += attendance.listenerMinutes
            } else if (attendance.event.toLowerCase().startsWith('playlist:')) {
              if (typeof totalsP[show] === 'undefined') { totalsP[show] = { showTime: 0, listenerMinutes: 0 } }
              totalsP[show].showTime += attendance.showTime
              totalsP[show].listenerMinutes += attendance.listenerMinutes
            }
          })

        // Convert our show data into an array so we can sort it
        var totalsA = []
        for (var item in totals) {
          if (Object.prototype.hasOwnProperty.call(totals, item)) {
            totalsA.push({ name: item, showTime: totals[item].showTime, listenerMinutes: totals[item].listenerMinutes })
          }
        }

        // Gather the top shows into analytics. Push the first 3 into the topShows array.
        if (totalsA.length > 0) {
          totalsA
            .sort(compare)
            .map((show, index) => {
              if (index < 3) { sails.models.attendance.weeklyAnalytics.topShows.push(show.name) }
            })
        }

        // Convert genre data into an array so we can sort it
        totalsA = []
        for (var item2 in totalsG) {
          if (Object.prototype.hasOwnProperty.call(totalsG, item2)) {
            totalsA.push({ name: item2, showTime: totalsG[item2].showTime, listenerMinutes: totalsG[item2].listenerMinutes })
          }
        }

        // Use the first one as our top genre
        if (totalsA.length > 0) { sails.models.attendance.weeklyAnalytics.topGenre = totalsA.sort(compare)[0].name }

        // Convert our playlist data into an array so we can sort it
        totalsA = []
        for (var item3 in totalsP) {
          if (Object.prototype.hasOwnProperty.call(totalsP, item3)) {
            totalsA.push({ name: item3, showTime: totalsP[item3].showTime, listenerMinutes: totalsP[item3].listenerMinutes })
          }
        }

        // Use the first one as our top playlist
        if (totalsA.length > 0) { sails.models.attendance.weeklyAnalytics.topPlaylist = totalsA.sort(compare)[0].name }
      }

      // Execute our parallel functions and wait for them to resolve.
      await Promise.all([f1(), f2()])

      // Broadcast socket
      sails.sockets.broadcast('analytics-weekly-dj', 'analytics-weekly-dj', sails.models.attendance.weeklyAnalytics)

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
