/* global moment, io */

/*
 * DIRECTORS
 */

// Define the director class
class Director {
  constructor (data = {}) {
    this.ID = data.ID || Math.floor(1000000 + (Math.random() * 1000000))
    this._name = data.name || `Unknown`
    this._admin = data.admin || false
    this._avatar = data.avatar || null
    this._position = data.position || `Unknown`
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
directorsdb.setOnInsert((data, db) => {
  Directors[data.ID] = new Director(data)
})

directorsdb.setOnUpdate((data, db) => {
  if (typeof Directors[data.ID] === `undefined`) {
    Directors[data.ID] = new Director(data)
  } else {
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        Directors[data.ID][key] = data[key]
      }
    }
  }
})

directorsdb.setOnRemove((data, db) => {
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
    this._name = data.name || `Unknown`
    this._time_in = data.time_in || null
    this._time_out = data.time_out || null
    this._approved = data.approved || false
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

  get time_in () {
    return this._time_in
  }

  set time_in (value) {
    this._time_in = value
  }

  get time_out () {
    return this._time_out
  }

  set time_out (value) {
    this._time_out = value
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
timesheetsdb.setOnInsert((data, db) => {
  Timesheets[data.ID] = new Timesheet(data)
  filterDate()
})

timesheetsdb.setOnUpdate((data, db) => {
  if (typeof Timesheets[data.ID] === `undefined`) {
    Timesheets[data.ID] = new Timesheet(data)
  } else {
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        Timesheets[data.ID][key] = data[key]
      }
    }
  }
  filterDate()
})

timesheetsdb.setOnRemove((data, db) => {
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

var theopts = {}
var timesheets = []

// connect the socket
var socket = io.sails.connect()

// Create request objects
var hostReq = new WWSUreq(socket, null, `host`, `/auth/host`, `Host`)
var adminDirectorReq = new WWSUreq(socket, null, `name`, `/auth/admin-director-uab`, `Administrator UAB Director`)

// Register event handlers
socket.on(`connect`, () => {
  directorsdb.replaceData(hostReq, `/uab/directors/get`)
  timesheetsdb.replaceData(hostReq, `/uab/timesheet/get`)
})

directorsdb.assignSocketEvent(`uabdirectors`, socket)
timesheetsdb.assignSocketEvent(`uabtimesheet`, socket)

$(document).ready(() => {
  document.querySelector(`#timesheet-records`).addEventListener(`click`, (e) => {
    try {
      if (e.target) {
        if (e.target.id.startsWith(`timesheet-t`)) {
          editClock(parseInt(e.target.id.replace(`timesheet-t-`, ``)))
        }
      }
    } catch (err) {
    }
  })
})

function closeModal () {
  $(`#clockModal`).modal(`hide`)
}

function escapeHTML (str) {
  var div = document.createElement(`div`)
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}

// Edit a timesheet entry, or view a single entry
function editClock (clockID, save = false) {
  console.log(`editClock called.`)
  var modalBody = document.getElementById(`clock-body`)
  if (!save) {
    $(`#clockModal`).modal(`show`)
    modalBody.innerHTML = `Loading clock...`
  }

  // View an entry
  if (!save) {
    var opened = false
    timesheets
      .filter(timesheet => timesheet.ID === clockID)
      .map(timesheet => {
        modalBody.innerHTML = `<form action="javascript:editClock(${clockID}, true)"><div class="form-group">
        <label for="clock-in">Clock In:</label>
        <input type="text" class="form-control" id="clock-in" value="${moment(timesheet.time_in).format(`YYYY-MM-DD HH:mm:ss`)}">
        <label for="clock-out">Clock Out:</label>
        <input type="text" class="form-control" id="clock-out" value="${moment(timesheet.time_out).format(`YYYY-MM-DD HH:mm:ss`)}">
                <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="" id="clock-approved" ${(timesheet.approved) ? `checked` : ``}>
                            <label class="form-check-label" for="clock-approved">
                                Approved Record
                            </label>
                        </div>
        <button type="submit" class="btn btn-primary">Edit</button>
        </form>`
        opened = true
        return null
      })
    if (!opened) { modalBody.innerHTML = `There was an internal error loading that clock.` }
    $(`#clockModal`).modal(`handleUpdate`)
    // Editing an entry
  } else {
    var bclockin = document.getElementById(`clock-in`)
    var bclockout = document.getElementById(`clock-out`)
    var bapproved = document.getElementById(`clock-approved`)
    adminDirectorReq.request({ db: directorsdb.db({ admin: true }), method: `POST`, url: `/timesheet/edit`, data: { ID: clockID, time_in: moment(bclockin.value).toISOString(true), time_out: moment(bclockout.value).toISOString(true), approved: (bapproved.checked) } }, (resHTML) => {
      $(`#clockModal`).modal(`handleUpdate`)
    })
  }
}

function filterDate () {
  var thedate = document.getElementById(`weekly-date-picker`)
  var tableRef = document.getElementById(`timesheet-table`).getElementsByTagName(`tbody`)[0]
  // Delete all table rows except the first (header) one
  for (var i = tableRef.rows.length; i > 0; i--) {
    tableRef.deleteRow(i - 1)
  }

  // Get timesheet records
  hostReq.request({ method: `POST`, url: `/uab/timesheet/get`, data: { date: moment(thedate.value).toISOString(true) } }, (resHTML) => {
    try {
      // Reset our timesheets array
      if (resHTML.length <= 0) {
        timesheets = []
        return null
      }

      // parse new timesheet
      timesheets = resHTML

      // iterate through each timesheet record
      var hours = {}
      timesheets.map((record, index) => {
        var newRow = document.getElementById(`director-${record.name.replace(/\W/g, ``)}`)
        // If there is not a row for this director yet, create one
        if (!newRow || newRow === null) {
          var newRow = tableRef.insertRow(tableRef.rows.length)
          newRow.classList.add(`table-info`)
          hours[record.name] = moment.duration()
          newRow.setAttribute(`id`, `director-${record.name.replace(/\W/g, ``)}`)
          // Create applicable cells
          for (var i = 0; i < 16; i++) {
            var cell = newRow.insertCell(i)
            cell.setAttribute(`id`, `cell${i}-${record.name.replace(/\W/g, ``)}`)
            // Cell 0 should be director name
            if (i === 0) { cell.innerHTML = record.name }
          }
        }

        // Prepare clock moments
        var clockin = moment(record.time_in)
        var clockout = moment(record.time_out)
        var clocknow = moment()
        var clocknext = moment(thedate.value).add(1, `weeks`)
        var clockday = moment(clockin).format(`e`)

        // Determine status. 1 = approved, 2 = no time_out (clocked in), 0 = not approved.
        var status = 1
        if (!record.approved) { status = 0 }
        if (record.time_out === null) { status = 2 }

        // If approved record, add its hours for the director. If clocked in record, add hours from time_in to current time.
        if (status === 1) { hours[record.name].add(clockout.diff(clockin)) }
        if (status === 2) { hours[record.name].add(clocknow.diff(clockin)) }

        var inT = moment(clockin).format(`h:mm A`)
        var outT = moment(clockout).format(`h:mm A`) || `IN`

        // For certain clock-ins and clock-outs, we may need to display the date as well, not just the time.
        // If clock-in happened last week, show its date
        if (moment(clockin).isBefore(moment(clockout).startOf(`week`))) {
          inT = moment(clockin).format(`YYYY-MM-DD h:mm A`)
          clockday = moment(clockout).format(`e`)
        }
        // If clock-out happened next week, show its date
        if (clockout !== null && moment(clockout).isAfter(moment(clockin).startOf(`week`).add(1, `weeks`))) {
          outT = moment(clockout).format(`YYYY-MM-DD h:mm A`)
        }
        // If clock-out was not on the same day as clock-in, show date for clock-out.
        if (clockout !== null && !moment(clockout).isSame(moment(clockin), `day`)) {
          outT = moment(clockout).format(`YYYY-MM-DD h:mm A`)
        }

        // Fill in the timesheet records for clock-ins
        var cell = document.getElementById(`cell${(clockday * 2) + 1}-${record.name.replace(/\W/g, ``)}`)
        if (cell !== null) {
          switch (status) {
            case 0:
              cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-danger" id="timesheet-t-${record.ID}">${inT}</span><br />`
              break
            case 1:
              cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-primary" id="timesheet-t-${record.ID}">${inT}</span><br />`
              break
            case 2:
              cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-success" id="timesheet-t-${record.ID}">${inT}</span><br />`
              break
          }
        }

        // Fill in the timesheet records for clock-outs
        var cell = document.getElementById(`cell${(clockday * 2) + 2}-${record.name.replace(/\W/g, ``)}`)
        if (cell !== null) {
          switch (status) {
            case 0:
              cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-danger" id="timesheet-t-${record.ID}">${outT}</span><br />`
              break
            case 1:
              cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-primary" id="timesheet-t-${record.ID}">${outT}</span><br />`
              break
            case 2:
              cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-success" id="timesheet-t-${record.ID}">${outT}</span><br />`
              break
          }
        }
      })

      // Iterate through each director and list their hours worked.
      for (var key in hours) {
        if (hours.hasOwnProperty(key)) {
          var cell = document.getElementById(`cell15-${key.replace(/\W/g, ``)}`)
          if (cell) {
            cell.innerHTML = `${hours[key].format(`h`, 1)}`
          }
        }
      }
    } catch (e) {
      var newRow = tableRef.insertRow(tableRef.rows.length)
      newRow.classList.add(`table-danger`)
      var cell = newRow.insertCell(0)
      cell.innerHTML = `ERROR fetching timesheets`
    }
  }
  )
}

filterDate()
