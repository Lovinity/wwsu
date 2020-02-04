/* global moment, importScripts */

importScripts(`../../../js/moment.min.js`)
importScripts(`../../../js/wwsu.js`)
importScripts(`../../../js/taffy-min.js`)
importScripts(`../../../js/later.min.js`)
importScripts(`../../../js/wwsu-calendar-web.js`)

var calendardb = new CalendarDb();

onmessage = function (e) {

  if (e.data[ 0 ] === 'calendar' || e.data[ 0 ] === 'calendarexceptions')
    calendardb.query(e.data[ 0 ], e.data[ 1 ], e.data[ 2 ]);

  var directorHours = [];
  var tasks = [];

  var events = calendardb.getEvents(undefined, moment().add(7, 'days').toISOString(true));

  directorHours = events.filter(event => [ 'office-hours' ].indexOf(event.type) !== -1 && moment(event.end).isAfter(moment()));
  tasks = events.filter(event => [ 'office-hours' ].indexOf(event.type) !== -1 && moment(event.end).isAfter(moment()));


  this.postMessage([ directorHours, tasks ])
}
