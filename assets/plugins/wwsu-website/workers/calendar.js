/* global moment, importScripts */

importScripts(`/wp-content/themes/mesh-child/assets/js/moment.min.js`)

onmessage = function (e) {
  // Define a comparison function that will order calendar events by start time when we run the iteration
  var compare = function (a, b) {
    try {
      if (moment(a.start).valueOf() < moment(b.start).valueOf()) { return -1 }
      if (moment(a.start).valueOf() > moment(b.start).valueOf()) { return 1 }
      if (a.ID < b.ID) { return -1 }
      if (a.ID > b.ID) { return 1 }
      return 0
    } catch (e) {
      console.error(e)
    }
  }

  var response = {}

  // Run through the events for the next 24 hours and add them to the coming up panel
  e.data[0]
    .filter(event => !event.title.startsWith('Genre:') && !event.title.startsWith('Playlist:') && !event.title.startsWith('OnAir Studio Prerecord Bookings') && moment(event.start).isBefore(moment(e.data[1]).add(28, 'days')) && moment(event.end).isAfter(moment(e.data[1])))
    .sort(compare)
    .map(event => {
      var title
      // null start or end? Use a default to prevent errors.
      if (!DateTime.fromISO(event.start).isValid) { event.start = moment(e.data[1]).startOf('day') }
      if (!DateTime.fromISO(event.end).isValid) { event.end = moment(e.data[1]).add(1, 'days').startOf('day') }

      event.startT = moment(event.start).format('ddd MM/DD hh:mm A')
      event.endT = moment(event.end).format('hh:mm A')

      if (moment(event.end).startOf('day').isAfter(moment(event.start).startOf('day'))) {
        event.endT = moment(event.end).format('ddd MM/DD hh:mm A')
      }

      if (event.title.startsWith('Show: ')) {
        title = event.title.replace('Show: ', '')
      } else if (event.title.replace('Remote: ', '')) {
        title = event.title.replace('Remote: ', '')
      } else if (event.title.startsWith('Sports: ')) {
        title = `Raider Sports - ${event.title.replace('Sports: ', '')}`
      }

      if (title) {
        if (typeof response[title] === `undefined`) {
          response[title] = []
        }

        response[title].push({
          id: event.unique,
          topic: event.description,
          startT: event.startT,
          endT: event.endT,
          active: event.active
        })
      }
    })

  this.postMessage(response)
}
