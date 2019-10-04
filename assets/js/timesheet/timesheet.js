/* global moment, WWSUdb, TAFFY, WWSUreq, $, iziToast */

/*
 * DIRECTORS
 */

// Define the director class
class Director {
  constructor (data = {}) {
    this.ID = data.ID || Math.floor(1000000 + (Math.random() * 1000000))
    this._name = data.name || 'Unknown'
    this._admin = data.admin || false
    this._avatar = data.avatar || null
    this._position = data.position || 'Unknown'
    this._present = data.present || false
    this._since = data.since || moment()
  }

  get id () {
    return this.ID
  }

  get name () {
    return this._name
  }

  set name (value) {
    this._name = value
  }

  get admin () {
    return this._admin
  }

  set admin (value) {
    this._admin = value
  }

  get avatar () {
    return this._avatar
  }

  set avatar (value) {
    this._avatar = value
  }

  get position () {
    return this._position
  }

  set position (value) {
    this._position = value
  }

  get present () {
    return this._present
  }

  set present (value) {
    this._present = value
  }

  get since () {
    return this._since
  }

  set since (value) {
    this._since = value
  }
}

// Directors variables
var Directors = []
var directorsdb = new WWSUdb(TAFFY())

// Add database event handlers
directorsdb.setOnInsert((data) => {
  Directors[data.ID] = new Director(data)
})

directorsdb.setOnUpdate((data) => {
  if (typeof Directors[data.ID] === `undefined`) {
    Directors[data.ID] = new Director(data)
  } else {
    for (var key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        Directors[data.ID][key] = data[key]
      }
    }
  }
})

directorsdb.setOnRemove((data) => {
  if (typeof Directors[data] !== `undefined`) { delete Directors[data] }
})

directorsdb.setOnReplace((db) => {
  Directors = []
  db.each((director) => {
    Directors[director.ID] = new Director(director)
  })
})

/*
 * TIMESHEETS
 */

// Define the timesheet class
class Timesheet {
  constructor (data = {}) {
    this.ID = data.ID || Math.floor(1000000 + (Math.random() * 1000000))
    this._unique = data.unique || null
    this._name = data.name || 'Unknown'
    this._scheduledIn = data.scheduledIn || null
    this._scheduledOut = data.scheduledOut || null
    this._timeIn = data.timeIn || null
    this._timeOut = data.timeOut || null
    this._approved = data.approved || false
  }

  get id () {
    return this.ID
  }

  get unique () {
    return this._unique
  }

  set unique (value) {
    this._unique = value
  }

  get name () {
    return this._name
  }

  set name (value) {
    this._name = value
  }

  // eslint-disable-next-line camelcase
  get scheduledIn () {
    return this._scheduledIn
  }

  // eslint-disable-next-line camelcase
  set scheduledIn (value) {
    this._scheduledIn = value
  }

  // eslint-disable-next-line camelcase
  get scheduledOut () {
    return this._scheduledOut
  }

  // eslint-disable-next-line camelcase
  set scheduledOut (value) {
    this._scheduledOut = value
  }

  // eslint-disable-next-line camelcase
  get timeIn () {
    return this._timeIn
  }

  // eslint-disable-next-line camelcase
  set timeIn (value) {
    this._timeIn = value
  }

  // eslint-disable-next-line camelcase
  get timeOut () {
    return this._timeOut
  }

  // eslint-disable-next-line camelcase
  set timeOut (value) {
    this._timeOut = value
  }

  get approved () {
    return this._approved
  }

  set approved (value) {
    this._approved = value
  }
}

// Directors variables
var Timesheets = []
var timesheetsdb = new WWSUdb(TAFFY())

// Add database event handlers
timesheetsdb.setOnInsert((data) => {
  Timesheets[data.ID] = new Timesheet(data)
  filterDate()
})

timesheetsdb.setOnUpdate((data) => {
  if (typeof Timesheets[data.ID] === `undefined`) {
    Timesheets[data.ID] = new Timesheet(data)
  } else {
    for (var key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        Timesheets[data.ID][key] = data[key]
      }
    }
  }
  filterDate()
})

timesheetsdb.setOnRemove((data) => {
  if (typeof Timesheets[data] !== `undefined`) { delete Timesheets[data] }
  filterDate()
})

timesheetsdb.setOnReplace((db) => {
  Timesheets = []
  db.each((timesheet) => {
    Timesheets[timesheet.ID] = new Timesheet(timesheet)
  })
  filterDate()
})

var timesheets = []

// connect the socket
var socket = io.sails.connect()

// Create request objects
var noReq = new WWSUreq(socket, null)
var adminDirectorReq = new WWSUreq(socket, null, 'name', '/auth/admin-director', 'Administrator Director')

// Register event handlers
socket.on('connect', () => {
  checkDiscipline(() => {
    directorsdb.replaceData(noReq, '/directors/get')
    timesheetsdb.replaceData(noReq, '/timesheet/get')
  })
})

directorsdb.assignSocketEvent('directors', socket)
timesheetsdb.assignSocketEvent('timesheet', socket)

$(document).ready(() => {
  document.querySelector(`#options-timesheets-records`).addEventListener('click', (e) => {
    try {
      if (e.target) {
        if (e.target.id.startsWith(`timesheet-t`)) {
          editClock(parseInt(e.target.id.replace(`timesheet-t-`, ``)))
        }
      }
    } catch (unusedE) {
    }
  })

  $('#clockModal').iziModal({
    title: 'Timesheet Record',
    headerColor: '#88A0B9',
    width: 640,
    focusInput: true,
    arrowKeys: false,
    navigateCaption: false,
    navigateArrows: false, // Boolean, 'closeToModal', 'closeScreenEdge'
    overlayClose: false,
    overlayColor: 'rgba(0, 0, 0, 0.75)',
    timeout: false,
    timeoutProgressbar: true,
    pauseOnHover: true,
    timeoutProgressbarColor: 'rgba(255,255,255,0.5)',
    zindex: 5
  })
})

// Edit a timesheet entry, or view a single entry
function editClock (clockID, save = false) {
  console.log(`editClock called.`)
  var modalBody = document.getElementById('clock-body')
  if (!save) {
    $('#clockModal').iziModal('open')
    modalBody.innerHTML = 'Loading clock...'
  }

  // View an entry
  if (!save) {
    var opened = false
    timesheets
      .filter(timesheet => timesheet.ID === clockID)
      .map(timesheet => {
        modalBody.innerHTML = `<form action="javascript:editClock(${clockID}, true)"><div class="form-group">
            <p><strong>Scheduled In:</strong> ${timesheet.scheduledIn !== null ? moment(timesheet.scheduledIn).format('YYYY-MM-DD HH:mm:ss') : `Not scheduled`}<br />
            <strong>Scheduled Out:</strong> ${timesheet.scheduledOut !== null ? moment(timesheet.scheduledOut).format('YYYY-MM-DD HH:mm:ss') : `Not scheduled`}</p>
        <label for="clock-in">Clock In:</label>
        <input type="text" class="form-control" id="clock-in" value="${timesheet.timeIn !== null ? moment(timesheet.timeIn).format('YYYY-MM-DD HH:mm:ss') : null}">
        <label for="clock-out">Clock Out:</label>
        <input type="text" class="form-control" id="clock-out" value="${timesheet.timeOut !== null ? moment(timesheet.timeOut).format('YYYY-MM-DD HH:mm:ss') : null}">
        <div class="form-group" title="Choose the status for this timesheet record">
                        <label for="clock-approved">Timesheet record status</label>
                        <select class="form-control" id="clock-approved">
                            <option value="delete">DELETE THIS ENTRY</option>
                            <option value="-1"${timesheet.approved === -1 ? ` selected` : ``}>Canceled Hours</option>
                            <option value="0"${timesheet.approved === 0 ? ` selected` : ``}>Not Approved / Absent</option>
                            <option value="1"${timesheet.approved === 1 ? ` selected` : ``}>Approved / Scheduled Hours</option>
                            <option value="2"${timesheet.approved === 2 ? ` selected` : ``}>Changed Scheduled Hours</option>
                        </select>
                    </div>
        <button type="submit" class="btn btn-primary">Edit</button>
        </form>`
        opened = true
        return null
      })
    if (!opened) { modalBody.innerHTML = 'There was an internal error loading that clock.' }
    // Editing an entry
  } else {
    var bclockin = document.getElementById('clock-in')
    var bclockout = document.getElementById('clock-out')
    var bapproved = document.getElementById('clock-approved')
    var selectedOption = bapproved.options[bapproved.selectedIndex].value
    if (selectedOption !== `delete`) {
      adminDirectorReq.request({ db: directorsdb.db({ admin: true }), method: 'POST', url: '/timesheet/edit', data: { ID: clockID, timeIn: moment(bclockin.value).toISOString(true), timeOut: moment(bclockout.value).toISOString(true), approved: selectedOption } }, (resHTML) => {
      })
    } else {
      adminDirectorReq.request({ db: directorsdb.db({ admin: true }), method: 'POST', url: '/timesheet/remove', data: { ID: clockID } }, () => {
      })
    }
  }
}

function filterDate () {
  try {
    var records = document.querySelector('#options-timesheets-records')
    var thedate = document.getElementById('weekly-date-picker')
    records.innerHTML = `<h2 class="text-warning" style="text-align: center;">PLEASE WAIT...</h4>`
    noReq.request({ method: 'POST', url: '/timesheet/get', data: { date: moment(thedate.value).toISOString(true) } }, (response) => {
      records.innerHTML = ``
      timesheets = response
      var hours = {}
      timesheets.map((record) => {
        var newRow = document.getElementById(`options-timesheets-director-${record.name.replace(/\W/g, '')}`)

        // If there is not a row for this director yet, create one
        if (!newRow || newRow === null) {
          records.innerHTML += `<div id="options-timesheets-director-${record.name.replace(/\W/g, '')}" class="card p-1 m-1 bg-light-1" style="width: 850px; position: relative;">
                    <div class="card-body">
                    <h5 class="card-title">${record.name}</h5>
                    <p class="card-text">
                    <div class="container">    
                        <div class="row shadow-2">
                            <div class="col text-dark">
                                > Day <br>
                                v Time
                            </div>
                            <div class="col text-dark border-left">
                                Sun
                            </div>
                            <div class="col text-dark border-left">
                                Mon
                            </div>
                            <div class="col text-dark border-left">
                                Tue
                            </div>
                            <div class="col text-dark border-left">
                                Wed
                            </div>
                            <div class="col text-dark border-left">
                                Thu
                            </div>
                            <div class="col text-dark border-left">
                                Fri
                            </div>
                            <div class="col text-dark border-left">
                                Sat
                            </div>
                        </div>
                        <div class="row border border-dark" style="height: 240px;">
                            <div class="col text-dark" style="position: relative;">
                                <div style="position: absolute; top: 8.5%;">3a</div>
                                <div style="position: absolute; top: 21%;">6a</div>
                                <div style="position: absolute; top: 33.5%;">9a</div>
                                <div style="position: absolute; top: 46%;">12p</div>
                                <div style="position: absolute; top: 58.5%;">3p</div>
                                <div style="position: absolute; top: 71%;">6p</div>
                                <div style="position: absolute; top: 83.5%;">9p</div>
                                <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                            </div>
                            <div class="col text-dark border-left" id="options-timesheets-director-cell-0-${record.name.replace(/\W/g, '')}" style="position: relative;">
                                <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                            </div>
                            <div class="col text-dark border-left" id="options-timesheets-director-cell-1-${record.name.replace(/\W/g, '')}" style="position: relative;">
                                <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                            </div>
                            <div class="col text-dark border-left" id="options-timesheets-director-cell-2-${record.name.replace(/\W/g, '')}" style="position: relative;">
                                <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                            </div>
                            <div class="col text-dark border-left" id="options-timesheets-director-cell-3-${record.name.replace(/\W/g, '')}" style="position: relative;">
                                <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                            </div>
                            <div class="col text-dark border-left" id="options-timesheets-director-cell-4-${record.name.replace(/\W/g, '')}" style="position: relative;">
                                <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                            </div>
                            <div class="col text-dark border-left" id="options-timesheets-director-cell-5-${record.name.replace(/\W/g, '')}" style="position: relative;">
                                <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                            </div>
                            <div class="col text-dark border-left" id="options-timesheets-director-cell-6-${record.name.replace(/\W/g, '')}" style="position: relative;">
                                <div class="border-top" style="position: absolute; top: 4.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 8.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 12.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 16.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 20.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 25%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 29.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 33.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 37.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 41.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 45.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 50%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 54.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 58.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 62.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 66.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 70.83%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 75%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 79.16%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 83.33%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 87.5%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 91.66%; width: 100%;"></div>
                                <div class="border-top" style="position: absolute; top: 95.83%; width: 100%;"></div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-4 text-primary">
                            Weekly Hours
                            </div>
                            <div class="col-6 text-primary" id="options-timesheets-director-cell-h-${record.name.replace(/\W/g, '')}">
                            </div>
                        </div>
                    </div>
                    </p>
                    </div>
                    </div>
                    `
          hours[record.name] = moment.duration()
        }

        // Prepare clock moments
        var clockin = record.timeIn !== null ? moment(record.timeIn) : null
        var clockout = record.timeOut !== null ? moment(record.timeOut) : null
        var scheduledin = record.scheduledIn !== null ? moment(record.scheduledIn) : null
        var scheduledout = record.scheduledOut !== null ? moment(record.scheduledOut) : null
        var clocknow = moment()
        var clockday = moment(clockin !== null ? clockin : scheduledin).format('e')

        /* Determine status.
                 * success = Approved and scheduled.
                 * purple = Approved, but not scheduled
                 * warning = Scheduled, but not approved
                 * urgent = Not scheduled and not approved
                 * info = Clocked in, but not clocked out
                 * danger = Absent / did not clock in for scheduled hours
                 * secondary = Canceled scheduled hours
                 */
        var status = `urgent`
        // LINT LIES: variable is used
        // eslint-disable-next-line no-unused-vars
        var status2 = `This record is NOT approved, and did not fall within a scheduled office hours time block.`
        var inT = ``
        var outT = ``
        var sInT = ``
        var sOutT = ``
        var timeline = ``
        var dayValue = (1000 * 60 * 60 * 24)
        var width = 0
        var left = 0
        var sWidth = 0
        var sLeft = 0

        if (clockin !== null && clockout === null) {
          status = `purple`
          status2 = `This record / director is still clocked in.`
          hours[record.name].add(clocknow.diff(clockin))
          if (scheduledin !== null && scheduledout !== null) {
            if (moment(scheduledin).isBefore(moment(scheduledout).startOf('week'))) {
              sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`)
              sLeft = 0
            } else {
              sInT = moment(scheduledin).format(`h:mm A`)
              sLeft = ((moment(scheduledin).valueOf() - moment(scheduledin).startOf('day').valueOf()) / dayValue) * 100
            }
            if (moment(scheduledout).isAfter(moment(scheduledin).startOf('week').add(1, 'weeks')) || !moment(scheduledout).isSame(moment(scheduledin), 'day')) {
              sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`)
              sWidth = 100 - sLeft
            } else {
              sOutT = moment(scheduledout).format(`h:mm A`)
              sWidth = (((moment(scheduledout).valueOf() - moment(scheduledin).valueOf()) / dayValue) * 100)
            }
            timeline += `<div title="Scheduled Hours: ${sInT} - ${sOutT}" class="bg-secondary" style="position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`
          }
          if (moment(clockin).isBefore(moment().startOf('week'))) {
            inT = moment(clockin).format(`YYYY-MM-DD h:mm A`)
            left = 0
            width = (((moment().valueOf() - moment(clockin).valueOf()) / dayValue) * 100)
            timeline += `<div title="Director still clocked in since ${inT}" id="timesheet-t-${record.ID}" class="bg-${status}" style="position: absolute; left: 20%; width: 75%; top: 0%; height: ${width}%;"></div>`
          } else {
            inT = moment(clockin).format(`h:mm A`)
            width = (((moment().valueOf() - moment(clockin).valueOf()) / dayValue) * 100)
            left = ((moment(clockin).valueOf() - moment(clockin).startOf('day').valueOf()) / dayValue) * 100
            timeline += `<div title="Director still clocked in since ${inT}" id="timesheet-t-${record.ID}" class="bg-${status}" style="position: absolute; left: 20%; width: 75%; top: ${left}%; height: ${width}%;"></div>`
          }
          outT = 'IN NOW'
        } else {
          if (clockin !== null && clockout !== null && scheduledin !== null && scheduledout !== null && record.approved === 1) {
            status = `success`
            status2 = `This record is approved and fell within a scheduled office hours block.`
            hours[record.name].add(clockout.diff(clockin))
            if (moment(clockin).isBefore(moment(clockout).startOf('week'))) {
              inT = moment(clockin).format(`YYYY-MM-DD h:mm A`)
              left = 0
            } else {
              inT = moment(clockin).format(`h:mm A`)
              left = ((moment(clockin).valueOf() - moment(clockin).startOf('day').valueOf()) / dayValue) * 100
            }
            if (moment(clockout).isAfter(moment(clockin).startOf('week').add(1, 'weeks')) || !moment(clockout).isSame(moment(clockin), 'day')) {
              outT = moment(clockout).format(`YYYY-MM-DD h:mm A`)
              width = 100 - left
            } else {
              outT = moment(clockout).format(`h:mm A`)
              width = (((moment(clockout).valueOf() - moment(clockin).valueOf()) / dayValue) * 100)
            }
            if (moment(scheduledin).isBefore(moment(scheduledout).startOf('week'))) {
              sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`)
              sLeft = 0
            } else {
              sInT = moment(scheduledin).format(`h:mm A`)
              sLeft = ((moment(scheduledin).valueOf() - moment(scheduledin).startOf('day').valueOf()) / dayValue) * 100
            }
            if (moment(scheduledout).isAfter(moment(scheduledin).startOf('week').add(1, 'weeks')) || !moment(scheduledout).isSame(moment(scheduledin), 'day')) {
              sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`)
              sWidth = 100 - sLeft
            } else {
              sOutT = moment(scheduledout).format(`h:mm A`)
              sWidth = (((moment(scheduledout).valueOf() - moment(scheduledin).valueOf()) / dayValue) * 100)
            }
            timeline += `<div title="Scheduled Hours: ${sInT} - ${sOutT}" class="bg-secondary" style="position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`
            timeline += `<div id="timesheet-t-${record.ID}" title="Actual Hours (approved): ${inT} - ${outT}" class="bg-${status}" style="position: absolute; left: 20%; width: 75%; top: ${left}%; height: ${width}%;"></div>`
          } else if (clockin !== null && clockout !== null && (scheduledin === null || scheduledout === null) && record.approved === 1) {
            status = `success`
            status2 = `This record is approved, but did not fall within a scheduled office hours block.`
            hours[record.name].add(clockout.diff(clockin))
            if (moment(clockin).isBefore(moment(clockout).startOf('week'))) {
              inT = moment(clockin).format(`YYYY-MM-DD h:mm A`)
              left = 0
            } else {
              inT = moment(clockin).format(`h:mm A`)
              left = ((moment(clockin).valueOf() - moment(clockin).startOf('day').valueOf()) / dayValue) * 100
            }
            if (moment(clockout).isAfter(moment(clockin).startOf('week').add(1, 'weeks')) || !moment(clockout).isSame(moment(clockin), 'day')) {
              outT = moment(clockout).format(`YYYY-MM-DD h:mm A`)
              width = 100 - left
            } else {
              outT = moment(clockout).format(`h:mm A`)
              width = (((moment(clockout).valueOf() - moment(clockin).valueOf()) / dayValue) * 100)
            }
            timeline += `<div id="timesheet-t-${record.ID}" title="Actual Unscheduled Hours (approved): ${inT} - ${outT}" class="bg-${status}" style="position: absolute; left: 20%; width: 75%; top: ${left}%; height: ${width}%;"></div>`
          } else if (scheduledin !== null && scheduledout !== null && clockin === null && clockout === null && record.approved === -1) {
            status = `secondary`
            status2 = `This is NOT an actual timesheet; the director canceled scheduled office hours.`
            if (moment(scheduledin).isBefore(moment(scheduledout).startOf('week'))) {
              sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`)
              sLeft = 0
            } else {
              sInT = moment(scheduledin).format(`h:mm A`)
              sLeft = ((moment(scheduledin).valueOf() - moment(scheduledin).startOf('day').valueOf()) / dayValue) * 100
            }
            if (moment(scheduledout).isAfter(moment(scheduledin).startOf('week').add(1, 'weeks')) || !moment(scheduledout).isSame(moment(scheduledin), 'day')) {
              sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`)
              sWidth = 100 - sLeft
            } else {
              sOutT = moment(scheduledout).format(`h:mm A`)
              sWidth = (((moment(scheduledout).valueOf() - moment(scheduledin).valueOf()) / dayValue) * 100)
            }
            timeline += `<div title="Scheduled Hours (CANCELED): ${sInT} - ${sOutT}" class="" style="background-color: #787878; position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`
          } else if (clockin !== null && clockout !== null && scheduledin !== null && scheduledout !== null && record.approved === 0) {
            status = `warning`
            status2 = `This record is NOT approved, but fell within a scheduled office hours block.`
            if (moment(clockin).isBefore(moment(clockout).startOf('week'))) {
              inT = moment(clockin).format(`YYYY-MM-DD h:mm A`)
              left = 0
            } else {
              inT = moment(clockin).format(`h:mm A`)
              left = ((moment(clockin).valueOf() - moment(clockin).startOf('day').valueOf()) / dayValue) * 100
            }
            if (moment(clockout).isAfter(moment(clockin).startOf('week').add(1, 'weeks')) || !moment(clockout).isSame(moment(clockin), 'day')) {
              outT = moment(clockout).format(`YYYY-MM-DD h:mm A`)
              width = 100 - left
            } else {
              outT = moment(clockout).format(`h:mm A`)
              width = (((moment(clockout).valueOf() - moment(clockin).valueOf()) / dayValue) * 100)
            }
            if (moment(scheduledin).isBefore(moment(scheduledout).startOf('week'))) {
              sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`)
              sLeft = 0
            } else {
              sInT = moment(scheduledin).format(`h:mm A`)
              sLeft = ((moment(scheduledin).valueOf() - moment(scheduledin).startOf('day').valueOf()) / dayValue) * 100
            }
            if (moment(scheduledout).isAfter(moment(scheduledin).startOf('week').add(1, 'weeks')) || !moment(scheduledout).isSame(moment(scheduledin), 'day')) {
              sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`)
              sWidth = 100 - sLeft
            } else {
              sOutT = moment(scheduledout).format(`h:mm A`)
              sWidth = (((moment(scheduledout).valueOf() - moment(scheduledin).valueOf()) / dayValue) * 100)
            }
            timeline += `<div title="Scheduled Hours: ${sInT} - ${sOutT}" class="bg-secondary" style="position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`
            timeline += `<div id="timesheet-t-${record.ID}" title="Actual Hours (NEEDS REVIEW): ${inT} - ${outT}" class="bg-${status}" style="position: absolute; left: 20%; width: 75%; top: ${left}%; height: ${width}%;"></div>`
          } else if (clockin !== null && clockout !== null && (scheduledin === null || scheduledout === null) && record.approved === 0) {
            status = `warning`
            status2 = `This record is NOT approved and did not fall within a scheduled office hours block.`
            if (moment(clockin).isBefore(moment(clockout).startOf('week'))) {
              inT = moment(clockin).format(`YYYY-MM-DD h:mm A`)
              left = 0
            } else {
              inT = moment(clockin).format(`h:mm A`)
              left = ((moment(clockin).valueOf() - moment(clockin).startOf('day').valueOf()) / dayValue) * 100
            }
            if (moment(clockout).isAfter(moment(clockin).startOf('week').add(1, 'weeks')) || !moment(clockout).isSame(moment(clockin), 'day')) {
              outT = moment(clockout).format(`YYYY-MM-DD h:mm A`)
              width = 100 - left
            } else {
              outT = moment(clockout).format(`h:mm A`)
              width = (((moment(clockout).valueOf() - moment(clockin).valueOf()) / dayValue) * 100)
            }
            timeline += `<div id="timesheet-t-${record.ID}" title="Actual Unscheduled Hours (NEEDS REVIEW): ${inT} - ${outT}" class="bg-${status}" style="position: absolute; left: 20%; width: 75%; top: ${left}%; height: ${width}%;"></div>`
          } else if (scheduledin !== null && scheduledout !== null && clockin === null && clockout === null && record.approved === 0) {
            status = `danger`
            status2 = `This is NOT an actual timesheet; the director failed to clock in during scheduled office hours.`
            if (moment(scheduledin).isBefore(moment(scheduledout).startOf('week'))) {
              sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`)
              sLeft = 0
            } else {
              sInT = moment(scheduledin).format(`h:mm A`)
              sLeft = ((moment(scheduledin).valueOf() - moment(scheduledin).startOf('day').valueOf()) / dayValue) * 100
            }
            if (moment(scheduledout).isAfter(moment(scheduledin).startOf('week').add(1, 'weeks')) || !moment(scheduledout).isSame(moment(scheduledin), 'day')) {
              sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`)
              sWidth = 100 - sLeft
            } else {
              sOutT = moment(scheduledout).format(`h:mm A`)
              sWidth = (((moment(scheduledout).valueOf() - moment(scheduledin).valueOf()) / dayValue) * 100)
            }
            timeline += `<div title="Scheduled Hours (NO SHOW): ${sInT} - ${sOutT}" class="bg-danger" style="position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`
          } else if (scheduledin !== null && scheduledout !== null && clockin === null && clockout === null && record.approved === 1) {
            status = `secondary`
            status2 = `This is NOT an actual timesheet; the director failed to clock in during scheduled office hours.`
            if (moment(scheduledin).isBefore(moment(scheduledout).startOf('week'))) {
              sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`)
              sLeft = 0
            } else {
              sInT = moment(scheduledin).format(`h:mm A`)
              sLeft = ((moment(scheduledin).valueOf() - moment(scheduledin).startOf('day').valueOf()) / dayValue) * 100
            }
            if (moment(scheduledout).isAfter(moment(scheduledin).startOf('week').add(1, 'weeks')) || !moment(scheduledout).isSame(moment(scheduledin), 'day')) {
              sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`)
              sWidth = 100 - sLeft
            } else {
              sOutT = moment(scheduledout).format(`h:mm A`)
              sWidth = (((moment(scheduledout).valueOf() - moment(scheduledin).valueOf()) / dayValue) * 100)
            }
            timeline += `<div title="Future Scheduled Hours: ${sInT} - ${sOutT}" class="bg-secondary" style="position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`
          } else if (scheduledin !== null && scheduledout !== null && clockin === null && clockout === null && record.approved === 2) {
            status = `secondary`
            status2 = `This is NOT an actual timesheet; the director failed to clock in during scheduled office hours.`
            if (moment(scheduledin).isBefore(moment(scheduledout).startOf('week'))) {
              sInT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`)
              sLeft = 0
            } else {
              sInT = moment(scheduledin).format(`h:mm A`)
              sLeft = ((moment(scheduledin).valueOf() - moment(scheduledin).startOf('day').valueOf()) / dayValue) * 100
            }
            if (moment(scheduledout).isAfter(moment(scheduledin).startOf('week').add(1, 'weeks')) || !moment(scheduledout).isSame(moment(scheduledin), 'day')) {
              sOutT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`)
              sWidth = 100 - sLeft
            } else {
              sOutT = moment(scheduledout).format(`h:mm A`)
              sWidth = (((moment(scheduledout).valueOf() - moment(scheduledin).valueOf()) / dayValue) * 100)
            }
            timeline += `<div title="Future Scheduled Hours (CHANGED): ${sInT} - ${sOutT}" class="bg-secondary" style="position: absolute; left: 5%; width: 15%; top: ${sLeft}%; height: ${sWidth}%;"></div>`
          }
        }

        // Fill in the timesheet record
        var cell = document.getElementById(`options-timesheets-director-cell-${clockday}-${record.name.replace(/\W/g, '')}`)
        if (cell !== null) { cell.innerHTML += timeline }

        // Iterate through each director and list their hours worked.
        for (var key in hours) {
          if (Object.prototype.hasOwnProperty.call(hours, key)) {
            cell = document.getElementById(`options-timesheets-director-cell-h-${key.replace(/\W/g, '')}`)
            if (cell) {
              cell.innerHTML = `${hours[key].format('h', 1)}`
            }
          }
        }
      })
    })
  } catch (e) {
    console.error(e)
    iziToast.show({
      title: 'An error occurred - Please check the logs',
      message: 'Error occurred during loadTimesheets.'
    })
  }
}

function checkDiscipline (cb) {
  io.socket.post('/discipline/get-web', {}, function serverResponded (body) {
    try {
      var docb = true
      if (body.length > 0) {
        body.map((discipline) => {
          var activeDiscipline = (discipline.active && (discipline.action !== 'dayban' || moment(discipline.createdAt).add(1, 'days').isAfter(moment())))
          if (activeDiscipline) { docb = false }
          if (activeDiscipline || !discipline.acknowledged) {
            iziToast.show({
              title: `Disciplinary action ${activeDiscipline ? `active against you` : `was issued in the past against you`}`,
              message: `On ${moment(discipline.createdAt).format('LLL')}, disciplinary action was issued against you for the following reason: ${discipline.message}. <br /><br />
              ${activeDiscipline ? `A ${discipline.action} is currently active, and you are not allowed to use WWSU's services at this time.` : `The discipline has expired, but you must acknowledge this message before you may use WWSU's services. Further issues may warrant more severe disciplinary action.`}<br />
              Please contact gm@wwsu1069.org if you have any questions or concerns.`,
              timeout: false,
              close: false,
              color: 'red',
              drag: false,
              position: 'center',
              closeOnClick: false,
              overlay: true,
              zindex: 1000,
              layout: 2,
              maxWidth: 480,
              buttons: [
                [ '<button>Acknowledge</button>', function (instance, toast, button, e, inputs) {
                  if (activeDiscipline) {
                    io.socket.post('/discipline/acknowledge', { ID: discipline.ID }, function serverResponded (body) { })
                  }
                  instance.hide({}, toast, 'button')
                } ]
              ]
            })
          }
        })
        if (docb) {
          cb()
        }
      }
    } catch (e) {
      iziToast.show({
        title: 'Failed to check discipline',
        message: 'Unable to connect to WWSU because we could not determine if you are banned. Please try again later.',
        color: 'red',
        zindex: 100,
        layout: 1,
        closeOnClick: true,
        position: 'center',
        timeout: 10000
      })
    }
  })
}

filterDate()
