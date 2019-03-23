/* global moment, io */

/*
 * DIRECTORS
 */

// Define the director class
class Director {

    constructor(data = {}) {
        this.ID = data.ID || Math.floor(1000000 + (Math.random() * 1000000));
        this._name = data.name || "Unknown";
        this._admin = data.admin || false;
        this._avatar = data.avatar || null;
        this._position = data.position || "Unknown";
        this._present = data.present || false;
        this._since = data.since || moment();
    }

    get id() {
        return this.ID;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get admin() {
        return this._admin;
    }

    set admin(value) {
        this._admin = value;
    }

    get avatar() {
        return this._avatar;
    }

    set avatar(value) {
        this._avatar = value;
    }

    get position() {
        return this._position;
    }

    set position(value) {
        this._position = value;
    }

    get present() {
        return this._present;
    }

    set present(value) {
        this._present = value;
    }

    get since() {
        return this._since;
    }

    set since(value) {
        this._since = value;
    }
}

// Directors variables
var Directors = [];
var directorsdb = new WWSUdb(TAFFY());

// Add database event handlers
directorsdb.setOnInsert((data, db) => {
    Directors[data.ID] = new Director(data);
});

directorsdb.setOnUpdate((data, db) => {
    if (typeof Directors[data.ID] === `undefined`)
    {
        Directors[data.ID] = new Director(data);
    } else {
        for (var key in data)
        {
            if (data.hasOwnProperty(key))
            {
                Directors[data.ID][key] = data[key];
            }
        }
    }
});

directorsdb.setOnRemove((data, db) => {
    if (typeof Directors[data] !== `undefined`)
        delete Directors[data];
});

directorsdb.setOnReplace((db) => {
    Directors = [];
    db.each((director) => {
        Directors[director.ID] = new Director(director);
    });
});

/*
 * TIMESHEETS
 */

// Define the timesheet class
class Timesheet {

    constructor(data = {}) {
        this.ID = data.ID || Math.floor(1000000 + (Math.random() * 1000000));
        this._unique = data.unique || null;
        this._name = data.name || "Unknown";
        this._scheduled_in = data.scheduled_in || null;
        this._scheduled_out = data.scheduled_in || null;
        this._time_in = data.time_in || null;
        this._time_out = data.time_out || null;
        this._approved = data.approved || false;
    }

    get id() {
        return this.ID;
    }

    get unique() {
        return this._unique;
    }

    set unique(value) {
        this._unique = value;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get scheduled_in() {
        return this._scheduled_in;
    }

    set scheduled_in(value) {
        this._scheduled_in = value;
    }

    get scheduled_out() {
        return this._scheduled_out;
    }

    set scheduled_out(value) {
        this._scheduled_out = value;
    }

    get time_in() {
        return this._time_in;
    }

    set time_in(value) {
        this._time_in = value;
    }

    get time_out() {
        return this._time_out;
    }

    set time_out(value) {
        this._time_out = value;
    }

    get approved() {
        return this._approved;
    }

    set approved(value) {
        this._approved = value;
    }
}

// Directors variables
var Timesheets = [];
var timesheetsdb = new WWSUdb(TAFFY());

// Add database event handlers
timesheetsdb.setOnInsert((data, db) => {
    Timesheets[data.ID] = new Timesheet(data);
    filterDate();
});

timesheetsdb.setOnUpdate((data, db) => {
    if (typeof Timesheets[data.ID] === `undefined`)
    {
        Timesheets[data.ID] = new Timesheet(data);
    } else {
        for (var key in data)
        {
            if (data.hasOwnProperty(key))
            {
                Timesheets[data.ID][key] = data[key];
            }
        }
    }
    filterDate();
});

timesheetsdb.setOnRemove((data, db) => {
    if (typeof Timesheets[data] !== `undefined`)
        delete Timesheets[data];
    filterDate();
});

timesheetsdb.setOnReplace((db) => {
    Timesheets = [];
    db.each((timesheet) => {
        Timesheets[timesheet.ID] = new Timesheet(timesheet);
    });
    filterDate();
});

var theopts = {};
var timesheets = [];

// connect the socket
var socket = io.sails.connect();

// Create request objects
var hostReq = new WWSUreq(socket, null, 'host', '/auth/host', 'Host');
var noReq = new WWSUreq(socket, null);
var adminDirectorReq = new WWSUreq(socket, null, 'name', '/auth/admin-director', 'Administrator Director');

// Register event handlers
socket.on('connect', function () {
    directorsdb.replaceData(noReq, '/directors/get');
    timesheetsdb.replaceData(noReq, '/timesheet/get');
});

directorsdb.assignSocketEvent('directors', socket);
timesheetsdb.assignSocketEvent('timesheet', socket);

$(document).ready(function () {
    document.querySelector(`#timesheet-records`).addEventListener("click", function (e) {
        try {
            if (e.target) {
                if (e.target.id.startsWith(`timesheet-t`))
                {
                    editClock(parseInt(e.target.id.replace(`timesheet-t-`, ``)));
                }
            }
        } catch (err) {
        }
    });

    $("#clockModal").iziModal({
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
    });
});

function closeModal() {
    $('#clockModal').iziModal(`close`);
}

function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// Edit a timesheet entry, or view a single entry
function editClock(clockID, save = false) {
    console.log(`editClock called.`);
    var modalBody = document.getElementById('clock-body');
    if (!save)
    {
        $('#clockModal').iziModal('open');
        modalBody.innerHTML = 'Loading clock...';
    }

    // View an entry
    if (!save)
    {
        var opened = false;
        timesheets
                .filter(timesheet => timesheet.ID === clockID)
                .map(timesheet => {
                    modalBody.innerHTML = `<form action="javascript:editClock(${clockID}, true)"><div class="form-group">
            <p><strong>Scheduled In:</strong> ${timesheet.scheduled_in !== null ? moment(timesheet.scheduled_in).format('YYYY-MM-DD HH:mm:ss') : `Not scheduled`}<br />
            <strong>Scheduled Out:</strong> ${timesheet.scheduled_out !== null ? moment(timesheet.scheduled_out).format('YYYY-MM-DD HH:mm:ss') : `Not scheduled`}</p>
        <label for="clock-in">Clock In:</label>
        <input type="text" class="form-control" id="clock-in" value="${timesheet.time_in !== null ? moment(timesheet.time_in).format('YYYY-MM-DD HH:mm:ss') : null}">
        <label for="clock-out">Clock Out:</label>
        <input type="text" class="form-control" id="clock-out" value="${timesheet.time_out !== null ? moment(timesheet.time_out).format('YYYY-MM-DD HH:mm:ss') : null}">
                <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="" id="clock-approved" ${(timesheet.approved) ? 'checked' : ''}>
                            <label class="form-check-label" for="clock-approved">
                                Approved Record
                            </label>
                        </div>
        <button type="submit" class="btn btn-primary">Edit</button>
        </form>`;
                    opened = true;
                    return null;
                });
        if (!opened)
            modalBody.innerHTML = 'There was an internal error loading that clock.';
        // Editing an entry
    } else {
        var bclockin = document.getElementById('clock-in');
        var bclockout = document.getElementById('clock-out');
        var bapproved = document.getElementById('clock-approved');
        adminDirectorReq.request({db: directorsdb.db({admin: true}), method: 'POST', url: '/timesheet/edit', data: {ID: clockID, time_in: moment(bclockin.value).toISOString(true), time_out: moment(bclockout.value).toISOString(true), approved: (bapproved.checked)}}, (resHTML) => {
        });
}
}

function filterDate() {
    var thedate = document.getElementById('weekly-date-picker');
    var tableRef = document.getElementById('timesheet-table').getElementsByTagName('tbody')[0];
    // Delete all table rows except the first (header) one
    for (var i = tableRef.rows.length; i > 0; i--)
    {
        tableRef.deleteRow(i - 1);
    }

    // Get timesheet records
    noReq.request({method: 'POST', url: '/timesheet/get', data: {date: moment(thedate.value).toISOString(true)}}, (resHTML) => {
        try {
            // Reset our timesheets array
            if (resHTML.length <= 0)
            {
                timesheets = [];
                return null;
            }

            // parse new timesheet
            timesheets = resHTML;

            // iterate through each timesheet record
            var hours = {};
            timesheets.map((record, index) => {
                var newRow = document.getElementById(`director-${record.name.replace(/\W/g, '')}`);
                // If there is not a row for this director yet, create one
                if (!newRow || newRow === null)
                {
                    var newRow = tableRef.insertRow(tableRef.rows.length);
                    newRow.classList.add(`table-info`);
                    hours[record.name] = moment.duration();
                    newRow.setAttribute("id", `director-${record.name.replace(/\W/g, '')}`);
                    // Create applicable cells
                    for (var i = 0; i < 16; i++)
                    {
                        var cell = newRow.insertCell(i);
                        cell.setAttribute('id', `cell${i}-${record.name.replace(/\W/g, '')}`);
                        // Cell 0 should be director name
                        if (i === 0)
                            cell.innerHTML = record.name;
                    }
                }

                // Prepare clock moments
                var clockin = record.time_in !== null ? moment(record.time_in) : null;
                var clockout = record.time_out !== null ? moment(record.time_out) : null;
                var scheduledin = record.scheduled_in !== null ? moment(record.scheduled_in) : null;
                var scheduledout = record.scheduled_out !== null ? moment(record.scheduled_out) : null;
                var clocknow = moment();
                var clocknext = moment(thedate.value).add(1, 'weeks');
                var clockday = moment(clockin !== null ? clockin : scheduledin).format('e');

                /* Determine status.
                 * success = Approved and scheduled.
                 * purple = Approved, but not scheduled
                 * warning = Scheduled, but not approved
                 * urgent = Not scheduled and not approved
                 * info = Clocked in, but not clocked out
                 * danger = Absent / did not clock in for scheduled hours
                 * secondary = Canceled scheduled hours
                 */
                var status = `urgent`;
                var inT = ``;
                var outT = ``;

                if (clockin !== null && clockout === null)
                {
                    status = `info`;
                    hours[record.name].add(clocknow.diff(clockin));
                    if (moment(clockin).isBefore(moment().startOf('week')))
                    {
                        inT = moment(clockin).format(`YYYY-MM-DD h:mm A`);
                    } else {
                        inT = moment(clockin).format(`h:mm A`);
                    }
                    outT = 'IN NOW';
                } else {
                    if (record.approved)
                    {
                        if (clockin !== null && clockout !== null && scheduledin !== null && scheduledout !== null)
                        {
                            status = `success`;
                            hours[record.name].add(clockout.diff(clockin));
                            if (moment(clockin).isBefore(moment().startOf('week')))
                            {
                                inT = moment(clockin).format(`YYYY-MM-DD h:mm A`);
                            } else {
                                inT = moment(clockin).format(`h:mm A`);
                            }
                            if (moment(clockout).isAfter(moment(clockin).startOf('week').add(1, 'weeks')) || !moment(clockout).isSame(moment(clockin), 'day'))
                            {
                                outT = moment(clockout).format(`YYYY-MM-DD h:mm A`);
                            } else {
                                outT = moment(clockout).format(`h:mm A`);
                            }
                        } else if (clockin !== null && clockout !== null && (scheduledin === null || scheduledout === null)) {
                            status = `purple`;
                            hours[record.name].add(clockout.diff(clockin));
                            if (moment(clockin).isBefore(moment().startOf('week')))
                            {
                                inT = moment(clockin).format(`YYYY-MM-DD h:mm A`);
                            } else {
                                inT = moment(clockin).format(`h:mm A`);
                            }
                            if (moment(clockout).isAfter(moment(clockin).startOf('week').add(1, 'weeks')) || !moment(clockout).isSame(moment(clockin), 'day'))
                            {
                                outT = moment(clockout).format(`YYYY-MM-DD h:mm A`);
                            } else {
                                outT = moment(clockout).format(`h:mm A`);
                            }
                        } else if (scheduledin !== null && scheduledout !== null && clockin === null && clockout === null) {
                            status = `secondary`;
                            if (moment(scheduledin).isBefore(moment().startOf('week')))
                            {
                                inT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`);
                            } else {
                                inT = moment(scheduledin).format(`h:mm A`);
                            }
                            if (moment(scheduledout).isAfter(moment(scheduledin).startOf('week').add(1, 'weeks')) || !moment(scheduledout).isSame(moment(scheduledin), 'day'))
                            {
                                outT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`);
                            } else {
                                outT = moment(scheduledout).format(`h:mm A`);
                            }
                        }
                    } else {
                        if (clockin !== null && clockout !== null && scheduledin !== null && scheduledout !== null)
                        {
                            status = `warning`;
                            if (moment(clockin).isBefore(moment().startOf('week')))
                            {
                                inT = moment(clockin).format(`YYYY-MM-DD h:mm A`);
                            } else {
                                inT = moment(clockin).format(`h:mm A`);
                            }
                            if (moment(clockout).isAfter(moment(clockin).startOf('week').add(1, 'weeks')) || !moment(clockout).isSame(moment(clockin), 'day'))
                            {
                                outT = moment(clockout).format(`YYYY-MM-DD h:mm A`);
                            } else {
                                outT = moment(clockout).format(`h:mm A`);
                            }
                        } else if (clockin !== null && clockout !== null && (scheduledin === null || scheduledout === null)) {
                            status = `urgent`;
                            if (moment(clockin).isBefore(moment().startOf('week')))
                            {
                                inT = moment(clockin).format(`YYYY-MM-DD h:mm A`);
                            } else {
                                inT = moment(clockin).format(`h:mm A`);
                            }
                            if (moment(clockout).isAfter(moment(clockin).startOf('week').add(1, 'weeks')) || !moment(clockout).isSame(moment(clockin), 'day'))
                            {
                                outT = moment(clockout).format(`YYYY-MM-DD h:mm A`);
                            } else {
                                outT = moment(clockout).format(`h:mm A`);
                            }
                        } else if (scheduledin !== null && scheduledout !== null && clockin === null && clockout === null) {
                            status = `danger`;
                            if (moment(scheduledin).isBefore(moment().startOf('week')))
                            {
                                inT = moment(scheduledin).format(`YYYY-MM-DD h:mm A`);
                            } else {
                                inT = moment(scheduledin).format(`h:mm A`);
                            }
                            if (moment(scheduledout).isAfter(moment(scheduledin).startOf('week').add(1, 'weeks')) || !moment(scheduledout).isSame(moment(scheduledin), 'day'))
                            {
                                outT = moment(scheduledout).format(`YYYY-MM-DD h:mm A`);
                            } else {
                                outT = moment(scheduledout).format(`h:mm A`);
                            }
                        }
                    }
                }

                // Fill in the timesheet records for clock-ins
                var cell = document.getElementById(`cell${(clockday * 2) + 1}-${record.name.replace(/\W/g, '')}`);
                if (cell !== null)
                    cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-${status}" id="timesheet-t-${record.ID}">${inT}</span><br />`;

                // Fill in the timesheet records for clock-outs
                var cell = document.getElementById(`cell${(clockday * 2) + 2}-${record.name.replace(/\W/g, '')}`);
                if (cell !== null)
                    cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-${status}" id="timesheet-t-${record.ID}">${outT}</span><br />`;
            });

            // Iterate through each director and list their hours worked.
            for (var key in hours)
            {
                if (hours.hasOwnProperty(key))
                {
                    var cell = document.getElementById(`cell15-${key.replace(/\W/g, '')}`);
                    if (cell)
                    {
                        cell.innerHTML = `${hours[key].format('h', 1)}`;
                    }
                }
            }
        } catch (e) {
            var newRow = tableRef.insertRow(tableRef.rows.length);
            newRow.classList.add(`table-danger`);
            var cell = newRow.insertCell(0);
            cell.innerHTML = 'ERROR fetching timesheets';
        }
    }
    );
}

filterDate();


