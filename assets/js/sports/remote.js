/* global io */

var sportsdb = new WWSUdb(TAFFY());

var changeData = (data) => {
    console.dir(data);
    switch (data.name)
    {
        case `wsuScore`:
            document.querySelector('#wsu-score').value = data.value;
            break;
        case `oppScore`:
            document.querySelector('#opp-score').value = data.value;
            break;
        case `wsuNum`:
            document.querySelector('#wsu-num').value = data.value;
            break;
        case `oppNum`:
            document.querySelector('#opp-num').value = data.value;
            break;
        case `wsuText`:
            document.querySelector('#wsu-text').value = data.value;
            break;
        case `oppText`:
            document.querySelector('#opp-text').value = data.value;
            break;
        case `wsuTimeouts`:
            document.querySelector('#wsu-timeouts').value = data.value;
            break;
        case `oppTimeouts`:
            document.querySelector('#opp-timeouts').value = data.value;
            break;
        case `wsuFouls`:
            document.querySelector('#wsu-fouls').value = data.value;
            break;
        case `oppFouls`:
            document.querySelector('#opp-fouls').value = data.value;
            break;
    }
};

sportsdb.setOnInsert((data, db) => {
    changeData(data);
});

sportsdb.setOnUpdate((data, db) => {
    changeData(data);
});

sportsdb.setOnReplace((db) => {
    db.each((record) => {
        changeData(record);
    });
});

var socket = io.sails.connect();

var noReq = new WWSUreq(socket, null);

socket.on('connect', function () {
    sportsdb.replaceData(noReq, '/sports/get');
});

socket.on('disconnect', function () {
    console.log('Lost connection');
    try {
        socket._raw.io._reconnection = true;
        socket._raw.io._reconnectionAttempts = Infinity;
    } catch (e) {
        console.error(e);
    }
});

sportsdb.assignSocketEvent('sports', socket);

function updateValue(name, value)
{
    var temp = sportsdb.db({name: name}).first();
    if (!temp || typeof temp.value === `undefined` || temp.value !== value)
        noReq.request({method: 'POST', url: '/sports/update', data: {name: name, value: value}}, (resHTML) => {
        });
}

function wsuScore(amount)
{
    updateValue(`wsuScore`, parseInt(document.querySelector('#wsu-score').value) + amount);
}

function oppScore(amount)
{
    updateValue(`oppScore`, parseInt(document.querySelector('#opp-score').value) + amount);
}

function clearAlt()
{
    updateValue(`wsuText`, ``);
    updateValue(`oppText`, ``);
    updateValue(`wsuNum`, ``);
    updateValue(`oppNum`, ``);
}

function showAlt()
{
    updateValue(`wsuText`, document.querySelector('#wsu-text').value);
    updateValue(`oppText`, document.querySelector('#opp-text').value);
    updateValue(`wsuNum`, document.querySelector('#wsu-num').value);
    updateValue(`oppNum`, document.querySelector('#opp-num').value);
}

function wsuTimeout()
{
    document.querySelector('#wsu-timeouts').value = parseInt(document.querySelector('#wsu-timeouts').value) - 1;
    updateValue(`wsuTimeouts`, document.querySelector('#wsu-timeouts').value);
    updateValue(`wsuText`, `TIMEOUT TAKEN`);
    updateValue(`oppText`, ``);
    updateValue(`wsuNum`, document.querySelector('#wsu-timeouts').value);
    updateValue(`oppNum`, document.querySelector('#opp-timeouts').value);
}

function oppTimeout()
{
    document.querySelector('#opp-timeouts').value = parseInt(document.querySelector('#opp-timeouts').value) - 1;
    updateValue(`oppTimeouts`, document.querySelector('#opp-timeouts').value);
    updateValue(`wsuText`, ``);
    updateValue(`oppText`, `TIMEOUT TAKEN`);
    updateValue(`wsuNum`, document.querySelector('#wsu-timeouts').value);
    updateValue(`oppNum`, document.querySelector('#opp-timeouts').value);
}

function mediaTimeout()
{
    updateValue(`wsuText`, `MEDIA TIMEOUT`);
    updateValue(`oppText`, `MEDIA TIMEOUT`);
    updateValue(`wsuNum`, ``);
    updateValue(`oppNum`, ``);
}

function refReview()
{
    updateValue(`wsuText`, `REFEREE REVIEW`);
    updateValue(`oppText`, `REFEREE REVIEW`);
    updateValue(`wsuNum`, ``);
    updateValue(`oppNum`, ``);
}

function wsuInjury()
{
    updateValue(`wsuText`, `INJURY TIMEOUT`);
    updateValue(`oppText`, ``);
    updateValue(`wsuNum`, ``);
    updateValue(`oppNum`, ``);
}

function oppInjury()
{
    updateValue(`wsuText`, ``);
    updateValue(`oppText`, `INJURY TIMEOUT`);
    updateValue(`wsuNum`, ``);
    updateValue(`oppNum`, ``);
}

function wsuFoul()
{
    document.querySelector('#wsu-fouls').value = parseInt(document.querySelector('#wsu-fouls').value) + 1;
    updateValue(`wsuFouls`, document.querySelector('#wsu-fouls').value);
    updateValue(`wsuText`, `FOUL`);
    updateValue(`oppText`, ``);
    updateValue(`wsuNum`, document.querySelector('#wsu-fouls').value);
    updateValue(`oppNum`, document.querySelector('#opp-fouls').value);
}

function oppFoul()
{
    document.querySelector('#opp-fouls').value = parseInt(document.querySelector('#opp-fouls').value) + 1;
    updateValue(`oppFouls`, document.querySelector('#opp-fouls').value);
    updateValue(`wsuText`, ``);
    updateValue(`oppText`, `FOUL`);
    updateValue(`wsuNum`, document.querySelector('#wsu-fouls').value);
    updateValue(`oppNum`, document.querySelector('#opp-fouls').value);
}