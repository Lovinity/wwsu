/* global moment, importScripts */

importScripts(`../../../js/moment.min.js`)
//importScripts(`../../../js/wwsu.js`)
importScripts(`../../../js/taffy-min.js`)
importScripts(`../../../js/later.min.js`)
importScripts(`../../../js/wwsu-calendar.js`)

var calendardb = new CalendarDb();

onmessage = function (e) {

  if (e.data[ 0 ] === 'calendar' || e.data[ 0 ] === 'calendarexceptions')
    calendardb.query(e.data[ 0 ], e.data[ 1 ], e.data[ 2 ]);

  var events = calendardb.getEvents();

  var noEvents = true
  var activeEvents = 0
  events
    .filter(event => ['genre', 'playlist', 'onair-booking', 'prod-booking', 'office-hours'].indexOf(event.type) === -1 && moment(event.end).isAfter(moment()))
    .sort(compare)
    .map(event => {
      try {

        event.startT = moment(event.start).format('MM/DD hh:mm A')
        event.endT = moment(event.end).format('MM/DD hh:mm A')

        var color = hexRgb(event.color)
        var line1
        var line2
        var image

        if (['canceled', 'canceled-system'].indexOf(event.exceptionType) !== -1) { color = hexRgb(`#161616`) }
        color.red = Math.round(color.red / 3)
        color.green = Math.round(color.green / 3)
        color.blue = Math.round(color.blue / 3)
        var badgeInfo = ``
        if (['updated', 'updated-system'].indexOf(event.exceptionType) !== -1) {
          badgeInfo = `<span class="text-white" style="font-size: 1vh;"><strong>TEMP TIME CHANGE</strong></span>`
        }
        if (['canceled', 'canceled-system'].indexOf(event.exceptionType) !== -1) {
          badgeInfo = `<span class="text-white" style="font-size: 1vh;"><strong>CANCELED</strong></span>`
        } else {
          activeEvents++;
        }
        line1 = event.hosts;
        line2 = event.name;
        if (event.type === 'show') {
          image = `<i class="fas fa-microphone text-white" style="font-size: 36px;"></i>`
        } else if (event.type === 'prerecord') {
          image = `<i class="fas fa-play-circle text-white" style="font-size: 36px;"></i>`
        } else if (event.type === 'remote') {
          image = `<i class="fas fa-broadcast-tower text-white" style="font-size: 36px;"></i>`
        } else if (event.type === 'sports') {
          image = `<i class="fas fa-trophy text-white" style="font-size: 36px;"></i>`
        } else {
          image = `<i class="fas fa-calendar text-white" style="font-size: 36px;"></i>`
        }

        color = `rgb(${color.red}, ${color.green}, ${color.blue});`
        innercontent += `
                    <div class="row shadow-2 m-1" style="background: ${color}; font-size: 1.5vh; border-color: #F9D91C;" id="calendar-event-${event.unique}">
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
        today.push({ name: event.name, type: event.type, active: ['canceled', 'canceled-system'].indexOf(event.exceptionType) === -1, ID: `calendar-event-${event.unique}`, topic: event.description, time: `${event.startT} - ${event.endT}` })
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

  this.postMessage([ innercontent, today, activeEvents ])
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
      hex = hex[ 0 ] + hex[ 0 ] + hex[ 1 ] + hex[ 1 ] + hex[ 2 ] + hex[ 2 ]
    }

    const num = parseInt(hex, 16)
    const red = num >> 16
    const green = (num >> 8) & 255
    const blue = num & 255

    return options.format === 'array'
      ? [ red, green, blue, alpha ]
      : { red, green, blue, alpha }
  } catch (e) {
    console.error(e)
  }
}
