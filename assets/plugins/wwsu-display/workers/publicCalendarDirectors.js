/* global moment, importScripts */

importScripts(`../../../plugins/moment/moment.min.js`)
importScripts(`../../../plugins/lodash/js/lodash.min.js`)
importScripts(`../../../plugins/wwsu-sails/js/wwsu.js`)
importScripts(`../../../plugins/taffy/js/taffy-min.js`)
importScripts(`../../../plugins/later/js/later.min.js`)
importScripts(`../../../plugins/wwsu-calendar/js/wwsu-calendar-web.js`)

var calendardb = new CalendarDb();

onmessage = function (e) {

  if (e.data[ 0 ] === 'calendar' || e.data[ 0 ] === 'schedule')
    calendardb.query(e.data[ 0 ], e.data[ 1 ], e.data[ 2 ]);

  var directorHours = [];
  var tasks = [];

  var events = calendardb.getEvents(null, undefined, moment().add(7, 'days').toISOString(true));

  directorHours = events
    .filter(event => [ 'office-hours' ].indexOf(event.type) !== -1 && moment(event.end).isAfter(moment()))
    .sort((a, b) => moment(a.start).valueOf() - moment(b.start).valueOf());

  tasks = events
    .filter(event => [ 'tasks' ].indexOf(event.type) !== -1 && moment(event.end).isAfter(moment()))
    .sort((a, b) => moment(a.start).valueOf() - moment(b.start).valueOf());



  this.postMessage([ directorHours, tasks ])
}
