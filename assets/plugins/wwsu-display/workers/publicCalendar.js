/* global moment, importScripts */

// Worker for processing calendar events

importScripts(`../../../plugins/moment/moment.min.js`)
importScripts(`../../../plugins/lodash/js/lodash.min.js`)
importScripts(`../../../plugins/wwsu-sails/js/wwsu.js`)
importScripts(`../../../plugins/taffy/js/taffy-min.js`)
importScripts(`../../../plugins/later/js/later.min.js`)
importScripts(`../../../plugins/wwsu-calendar/js/wwsu-calendar-web.js`)

var calendardb = new CalendarDb();

/**
 * Process calendar information.
 * 
 * @param {object} e Event
 * @param {array} e.data [0: calendar or schedule database change, 1: object or array of data for WWSUdb query, 2: boolean whether or not to replace all current data with this]
 */
onmessage = function (e) {

  if (e.data[ 0 ] === 'calendar' || e.data[ 0 ] === 'schedule')
    calendardb.query(e.data[ 0 ], e.data[ 1 ], e.data[ 2 ]);

  

  this.postMessage([ innercontent, today, activeEvents ])
}

/**
 * Convert a color hex to rgb values.
 * 
 * @param {string} hex Hex color code
 * @param {object} options Options
 * @param {string} options.format Specify array if return should be in array instead of object
 * @returns {object|array} red, green, blue, alpha values
 */
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
