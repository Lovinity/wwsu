/* global moment, importScripts */

importScripts(`../../../js/moment.min.js`)

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

  var innercontent = ``
  var today = []

  // Run through the events for the next 24 hours and add them to the coming up panel
  var noEvents = true
  var activeEvents = 0
  e.data[0]
    .filter(event => !event.title.startsWith('Genre:') && !event.title.startsWith('Playlist:') && !event.title.startsWith('OnAir Studio Prerecord Bookings') && moment(event.start).isBefore(moment(e.data[1]).add(1, 'days')) && moment(event.end).isAfter(moment(e.data[1])))
    .sort(compare)
    .map(event => {
      try {
        // null start or end? Use a default to prevent errors.
        if (!moment(event.start).isValid()) { event.start = moment(e.data[1]).startOf('day') }
        if (!moment(event.end).isValid()) { event.end = moment(e.data[1]).add(1, 'days').startOf('day') }

        event.startT = moment(event.start).format('MM/DD hh:mm A')
        event.endT = moment(event.end).format('hh:mm A')

        if (moment(event.end).startOf('day').isAfter(moment(event.start).startOf('day'))) {
          event.endT = moment(event.end).format('MM/DD hh:mm A')
        }

        var color = hexRgb(event.color)
        var line1
        var line2
        var stripped
        var image
        var temp
        var type
        var eventName
        if (event.active < 1) { color = hexRgb(`#161616`) }
        color.red = Math.round(color.red / 3)
        color.green = Math.round(color.green / 3)
        color.blue = Math.round(color.blue / 3)
        var badgeInfo = ``
        if (event.active === 2) {
          badgeInfo = `<span class="text-white" style="font-size: 1vh;"><strong>TIME UPDATED</strong></span>`
        }
        if (event.active === -1) {
          badgeInfo = `<span class="text-white" style="font-size: 1vh;"><strong>CANCELED</strong></span>`
        } else {
          activeEvents++;
        }
        if (event.title.startsWith('Show: ')) {
          stripped = event.title.replace('Show: ', '')
          eventName = stripped
          type = 'show'
          image = `<i class="fas fa-microphone text-white" style="font-size: 36px;"></i>`
          temp = stripped.split(' - ')
          if (temp.length === 2) {
            line1 = temp[0]
            line2 = temp[1]
          } else {
            line1 = 'Unknown DJ'
            line2 = temp
          }
        } else if (event.title.startsWith('Prerecord: ')) {
          stripped = event.title.replace('Prerecord: ', '')
          eventName = stripped
          type = 'prerecord'
          image = `<i class="fas fa-play-circle text-white" style="font-size: 36px;"></i>`
          temp = stripped.split(' - ')
          if (temp.length === 2) {
            line1 = temp[0]
            line2 = temp[1]
          } else {
            line1 = 'Unknown DJ'
            line2 = temp
          }
        } else if (event.title.startsWith('Remote: ')) {
          stripped = event.title.replace('Remote: ', '')
          eventName = stripped
          type = 'remote'
          image = `<i class="fas fa-broadcast-tower text-white" style="font-size: 36px;"></i>`
          temp = stripped.split(' - ')
          if (temp.length === 2) {
            line1 = temp[0]
            line2 = temp[1]
          } else {
            line1 = 'Unknown Host'
            line2 = temp
          }
        } else if (event.title.startsWith('Sports: ')) {
          stripped = event.title.replace('Sports: ', '')
          eventName = stripped
          type = 'sports'
          line1 = 'Raider Sports'
          line2 = stripped
          image = `<i class="fas fa-trophy text-white" style="font-size: 36px;"></i>`
        } else {
          type = 'event'
          line1 = ''
          line2 = event.title
          image = `<i class="fas fa-calendar text-white" style="font-size: 36px;"></i>`
        }
        color = `rgb(${color.red}, ${color.green}, ${color.blue});`
        innercontent += `
                    <div class="row shadow-2 m-1" style="background: ${color}; font-size: 1.5vh; border-color: #F9D91C;" id="calendar-event-${event.ID}">
                        <div class="col-2 text-white">
                            ${image}
                        </div>
                        <div class="col-10 text-white">
                            <strong>${line1}${line1 !== '' ? ` - ` : ``}${line2}</strong><br />
                            ${event.startT} - ${event.endT}<br />
                            ${badgeInfo}
                        </div>
                    </div>`
        noEvents = false
        today.push({ name: eventName, type: type, active: event.active, ID: `calendar-event-${event.ID}`, topic: event.description, time: `${event.startT} - ${event.endT}` })
      } catch (e) {
        console.error(e)
        innercontent = `
                <div class="row m-1" style="font-size: 1.5vh;">
                    <div class="col text-white">
                        <strong>Error fetching events!</strong>
                    </div>
                </div>`
      }
    })

  if (noEvents) {
    innercontent = `
                    <div class="row m-1" style="font-size: 1.5vh;">
                        <div class="col text-white">
                            <strong>No events next 24 hours</strong>
                        </div>
                    </div>`
  }

  this.postMessage([innercontent, today, activeEvents])
}

function hexRgb (hex, options = {}) {
  var hexChars = 'a-f\\d'
  var match3or4Hex = `#?[${hexChars}]{3}[${hexChars}]?`
  var match6or8Hex = `#?[${hexChars}]{6}([${hexChars}]{2})?`

  var nonHexChars = new RegExp(`[^#${hexChars}]`, 'gi')
  var validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, 'i')
  try {
    if (typeof hex !== 'string' || nonHexChars.test(hex) || !validHexSize.test(hex)) {
      throw new TypeError('Expected a valid hex string')
    }

    hex = hex.replace(/^#/, '')
    let alpha = 255

    if (hex.length === 8) {
      alpha = parseInt(hex.slice(6, 8), 16) / 255
      hex = hex.substring(0, 6)
    }

    if (hex.length === 4) {
      alpha = parseInt(hex.slice(3, 4).repeat(2), 16) / 255
      hex = hex.substring(0, 3)
    }

    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    }

    const num = parseInt(hex, 16)
    const red = num >> 16
    const green = (num >> 8) & 255
    const blue = num & 255

    return options.format === 'array'
      ? [red, green, blue, alpha]
      : { red, green, blue, alpha }
  } catch (e) {
    console.error(e)
  }
}
