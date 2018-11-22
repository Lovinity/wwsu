/* global moment */

$(document).ready(function () {

    //Initialize the datePicker(I have taken format as mm-dd-yyyy, you can     //have your owh)
    $("#weekly-date-picker").datetimepicker({
        format: 'MM-DD-YYYY'
    });

    //Get the value of Start and End of Week
    $('#weekly-date-picker').on('dp.change', function (e) {
        var value = $("#weekly-date-picker").val();
        var firstDate = moment(value, "MM-DD-YYYY").format("MM-DD-YYYY");
        $("#weekly-date-picker").val(firstDate);
    });
});

var theopts = {};

function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// Show logs
function filterLogs(subtype = null) {
    var datePicker = document.getElementById('weekly-date-picker');
    var tableData = document.getElementById('results-table');

    // Remove all but the first table row
    for (var i = tableData.rows.length; i > 0; i--)
    {
        tableData.deleteRow(i - 1);
    }

    // No subtype? get the groups to display
    if (subtype === null)
    {
        $.ajax({
            type: "POST",
            url: '/logs/get-subtypes',
            data: {date: datePicker.value}
        })
                .then(
                        function success(resHTML) {
                            var header = tableData.createTHead();
                            header.classList.add(`thead-dark`);
                            var newRow = header.insertRow(0);
                            var cell = newRow.insertCell(0);
                            cell.innerHTML = 'Choose a log for this day';
                            var newRow = tableData.insertRow(tableData.rows.length);
                            var cell = newRow.insertCell(0);
                            cell.innerHTML = `<a href="javascript:filterLogs(\`\`)" title="Show the log" role="button" class="btn btn-success">View all logs for this day</a>`;
                            var newRow = tableData.insertRow(tableData.rows.length);
                            var cell = newRow.insertCell(0);
                            cell.innerHTML = `<a href="javascript:filterLogs(\`ISSUES\`)" title="Show the log" role="button" class="btn btn-warning">View logged problems/issues for this day</a>`;
                            resHTML.map(logtype => {
                                var newRow = tableData.insertRow(tableData.rows.length);
                                var cell = newRow.insertCell(0);
                                cell.innerHTML = `<a href="javascript:filterLogs(\`${logtype.logsubtype}\`)" title="Show the log" role="button" class="btn btn-primary">${logtype.logsubtype}</a>`;
                            });
                        },
                        function fail(data, status) {
                        }
                );

        // subtype? Display logs by date and selected subtype
    } else {
        $.ajax({
            type: "POST",
            url: '/logs/get',
            data: {date: datePicker.value, subtype: subtype}
        })
                .then(
                        function success(resHTML) {
                            var header = tableData.createTHead();
                            header.classList.add(`thead-dark`);
                            var newRow = header.insertRow(0);
                            var cell = newRow.insertCell(0);
                            cell.innerHTML = 'Date/Time';
                            var cell2 = newRow.insertCell(1);
                            cell2.innerHTML = 'Event';
                            var cell3 = newRow.insertCell(2);
                            cell3.innerHTML = 'Artist';
                            var cell4 = newRow.insertCell(3);
                            cell4.innerHTML = 'Title';
                            resHTML.forEach(function (thelog) {
                                var newRow = tableData.insertRow(tableData.rows.length);
                                newRow.classList.add(`table-${thelog.loglevel}`);
                                var cell = newRow.insertCell(0);
                                cell.innerHTML = moment(thelog.createdAt).format("LL hh:mm:ss A");
                                var cell2 = newRow.insertCell(1);
                                thelog.event = thelog.event.replace(/(?:\r\n|\r|\n)/g, '<br />');
                                cell2.innerHTML = thelog.event;
                                var cell3 = newRow.insertCell(2);
                                cell3.innerHTML = thelog.trackArtist;
                                var cell4 = newRow.insertCell(3);
                                cell4.innerHTML = thelog.trackTitle;
                            });
                        },
                        function fail(data, status) {
                        }
                );
}
}

filterLogs(null);