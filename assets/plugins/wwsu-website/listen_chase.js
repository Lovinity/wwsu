/* global moment, iziToast, jdenticon, TAFFY, $, Quill, jQuery, WWSUdb, WWSUreq */

// JS NOTE: This file is not meant to be re-loaded on every page load; it is meant to be loaded once and continue running as long as the client is on the website.

/*
DEFINE TAFFY DATABASES WITH WWSUDB CONSTRUCTOR (requires wwsu.js and taffydb)
*/

// Used for calendar events and shows.
var Calendar = new WWSUdb(TAFFY())

// Used for storing the push notification subscriptions of the connected client.
var Subscriptions = new WWSUdb(TAFFY())

/*
DEFINE VARIABLES
*/

// Initialize Meta with the current time, empty history, true webchat, and unknown state until websockets responds. This prevents errors.
var Meta = { time: moment().toISOString(true), history: [], webchat: true, state: 'unknown' }

// When new messages are received, the ID should be stored in this array.
// Any received messages whose ID already exists in this array are NOT new to the client. This might happen when re-connecting to the websocket and refreshing all the data.
// (Do not alert the client of new messages if the ID already exists in this array upon receipt.)
var messageIDs = []

// When new announcements are received, the ID should be stored in this array.
// Any received announcements whose ID already exists in this array are NOT new to the client. This might happen when re-connecting to the websocket and refreshing all the data.
// (Do not alert the client of announcements if the ID already exists in this array upon receipt.)
var announcementIDs = []

// Used to store which tracks the connected client has liked; prevents the client from re-liking tracks.
var likedTracks = []

// Used to store last known radio state and compare it to new "state" received from Meta. If they are different, some actions need to be performed.
var automationpost = null

// Used to determine the index at which the client is browsing tracks in the request system
var skipIt = -1

// When websockets are initialized for the first time, we do not want to bombard the client with message notifications from the last hour.
var firstTime = true

// Used to "tick" Meta.time every second; the server does not return the current WWSU time every second in order to conserve on data use.
// The server will, however, send a new Meta.time periodically to ensure clients are in sync. clockTimer should be reset with a new 1000ms timer whenever this happens.
var clockTimer

// Set to true when websockets initialization has finished completely.
var onlineSocketDone = false

// Used by the OneSignal push notification SDK.
var OneSignal

// A "device" parameter should be provided in the URL by the WWSU mobile app to identify the mobile device for push notification purposes.
var device = getUrlParameter(`device`)
var isMobile = device !== null

// Set by OneSignal; if false, this client does not support push notifications in their browser / on their device.
var notificationsSupported = false

/*
DEFINE FUNCTIONS
*/

/**
 * FUNCTION getUrlParameter.
 *
 * Try to pull and return the value of the key name from the URL query string.
 *
 * @param {string} name          name of the key to which the function should return its value.
 *
 * @return {string || null}      Value of the key, or null if the key does not exist in the query string.
 */
function getUrlParameter (name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]')
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)')
  var results = regex.exec(window.location.search)
  return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '))
}
