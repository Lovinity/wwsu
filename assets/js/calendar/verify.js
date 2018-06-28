
/* global events, moment */

var theopts = {};

function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

var tableData = document.getElementById('results-table');

function verifyEvents() {
    // Get events
    $.ajax('/calendar/verify-data', {})
            .then(
                    function success(resHTML) {
                        for (var i = tableData.rows.length; i > 0; i--)
                        {
                            tableData.deleteRow(i - 1);
                        }
                        var header = tableData.createTHead();
                        header.classList.add(`thead-dark`);
                        var newRow = header.insertRow(0);
                        var cell = newRow.insertCell(0);
                        cell.innerHTML = 'Date/Time';
                        var cell2 = newRow.insertCell(1);
                        cell2.innerHTML = 'Event Name';
                        var cell3 = newRow.insertCell(2);
                        cell3.innerHTML = 'Status';
                        var cell4 = newRow.insertCell(3);
                        cell4.innerHTML = 'Information';
                        resHTML.forEach(function (dodo) {
                            var newRow = tableData.insertRow(tableData.rows.length);
                            var cell = newRow.insertCell(0);
                            cell.innerHTML = `${moment(dodo.start).format("LLLL")} - ${moment(dodo.end).format("LLLL")}`;
                            var cell2 = newRow.insertCell(1);
                            cell2.innerHTML = dodo.title;
                            var cell3 = newRow.insertCell(2);
                            var cell4 = newRow.insertCell(3);
                            cell4.innerHTML = dodo.message;
                            if (dodo.type === 'Valid')
                            {
                                cell3.innerHTML = `<span class="badge badge-success">Valid</span>`;
                            } else if (dodo.type === 'Invalid')
                            {
                                cell3.innerHTML = `<span class="badge badge-danger">Invalid</span>`;
                            } else if (dodo.type === 'Check')
                            {
                                cell3.innerHTML = `<span class="badge badge-warning">Check</span>`;
                            } else {
                                cell3.innerHTML = `<span class="badge badge-dark">Manual</span>`;
                            }
                        });
                    },
                    function fail(data, status) {
                        var tableRef = tableData.createTHead();
                        var newRow = tableRef.insertRow(tableRef.rows.length);
                        newRow.classList.add(`table-danger`);
                        var cell = newRow.insertCell(0);
                        cell.innerHTML = 'ERROR fetching calendar verification data.';
                    }
            );
}

verifyEvents();


