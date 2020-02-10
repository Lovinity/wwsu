/* global moment, importScripts */

importScripts(`/wp-content/themes/mesh-child/assets/js/moment.min.js`)

onmessage = function (e) {
  var directors = {}

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

  if (e.data[0].length > 0) {
    e.data[0].map((director) => {
      if (typeof directors[director.name] === 'undefined') {
        directors[director.name] = director
        directors[director.name].hours = []
      }
    })

    e.data[1]
      .sort(compare)
      .map((hour) => {
        if (typeof directors[hour.director] !== 'undefined') {
          if (!moment(hour.start).isValid()) { hour.start = moment(e.data[2]).startOf('day') }
          if (!moment(hour.end).isValid()) { hour.end = moment(e.data[2]).add(1, 'days').startOf('day') }

          hour.startT = moment(hour.start).format('ddd MM/DD hh:mm A')
          hour.endT = moment(hour.end).format('hh:mm A')

          if (moment(hour.end).startOf('day').isAfter(moment(hour.start).startOf('day'))) {
            hour.endT = moment(hour.end).format('ddd MM/DD hh:mm A')
          }
          directors[hour.director].hours.push(hour)
        }
      })
  }

  this.postMessage(directors)
}
