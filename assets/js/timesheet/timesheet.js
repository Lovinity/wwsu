/* global moment */

$(document).ready(function () {

    //Initialize the datePicker(I have taken format as mm-dd-yyyy, you can     //have your owh)
    $("#weekly-date-picker").datetimepicker({
        format: 'MM-DD-YYYY'
    });

    //Get the value of Start and End of Week
    $('#weekly-date-picker').on('dp.change', function (e) {
        var value = $("#weekly-date-picker").val();
        var firstDate = moment(value, "MM/DD/YYYY").day(0).format("MM/DD/YYYY");
        var lastDate = moment(value, "MM/DD/YYYY").day(6).format("MM/DD/YYYY");
        $("#weekly-date-picker").val(firstDate);
    });
});

var theopts = {};
var timesheets = [];

function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
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
    $.ajax('/timesheet/get?date=' + thedate.value, {})
            .then(
                    function success(resHTML) {
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
                            var clockin = moment(record.time_in);
                            var clockout = moment(record.time_out);
                            var clocknow = moment();
                            var clocknext = moment(thedate.value).add(1, 'weeks');
                            var clockday = moment(clockin).format('e');

                            // Determine status. 1 = approved, 2 = no time_out (clocked in), 0 = not approved.
                            var status = 1;
                            if (!record.approved)
                                status = 0;
                            if (record.time_out === null)
                                status = 2;

                            // If approved record, add its hours for the director. If clocked in record, add hours from time_in to current time.
                            if (status === 1)
                                hours[record.name].add(clockout.diff(clockin));
                            if (status === 2)
                                hours[record.name].add(clocknow.diff(clockin));


                            var inT = moment(clockin).format(`h:mm A`);
                            var outT = moment(clockout).format(`h:mm A`) || 'IN';

                            // For certain clock-ins and clock-outs, we may need to display the date as well, not just the time.
                            // If clock-in happened last week, show its date
                            if (moment(clockin).isBefore(moment(clockout).startOf('week')))
                            {
                                inT = moment(clockin).format(`YYYY-MM-DD h:mm A`);
                                clockday = moment(clockout).format('e');
                            }
                            // If clock-out happened next week, show its date
                            if (clockout !== null && moment(clockout).isAfter(moment(clockin).startOf('week').add(1, 'weeks')))
                            {
                                outT = moment(clockout).format(`YYYY-MM-DD h:mm A`);
                            }
                            // If clock-out was not on the same day as clock-in, show date for clock-out.
                            if (clockout !== null && !moment(clockout).isSame(moment(clockin), 'day'))
                            {
                                outT = moment(clockout).format(`YYYY-MM-DD h:mm A`);
                            }

                            // Fill in the timesheet records for clock-ins
                            var cell = document.getElementById(`cell${(clockday * 2) + 1}-${record.name.replace(/\W/g, '')}`);
                            if (cell !== null)
                            {
                                switch (status)
                                {
                                    case 0:
                                        cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-danger" id="timesheet-t-${record.ID}">${inT}</span><br />`;
                                        break;
                                    case 1:
                                        cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-primary" id="timesheet-t-${record.ID}">${inT}</span><br />`;
                                        break;
                                    case 2:
                                        cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-success" id="timesheet-t-${record.ID}">${inT}</span><br />`;
                                        break;
                                }
                            }

                            // Fill in the timesheet records for clock-outs
                            var cell = document.getElementById(`cell${(clockday * 2) + 2}-${record.name.replace(/\W/g, '')}`);
                            if (cell !== null)
                            {
                                switch (status)
                                {
                                    case 0:
                                        cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-danger" id="timesheet-t-${record.ID}">${outT}</span><br />`;
                                        break;
                                    case 1:
                                        cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-primary" id="timesheet-t-${record.ID}">${outT}</span><br />`;
                                        break;
                                    case 2:
                                        cell.innerHTML += `<span style="cursor: pointer;" class="badge badge-success" id="timesheet-t-${record.ID}">${outT}</span><br />`;
                                        break;
                                }
                            }
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
                    },
                    function fail(data, status) {
                        var newRow = tableRef.insertRow(tableRef.rows.length);
                        newRow.classList.add(`table-danger`);
                        var cell = newRow.insertCell(0);
                        cell.innerHTML = 'ERROR fetching timesheets';
                    }
            );
}

filterDate();


