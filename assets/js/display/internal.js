/* global io, moment, Infinity, iziToast */

try {

// Define data variables
    var Directors = TAFFY();
    var Directorhours = TAFFY();
    var Meta = {time: moment().toISOString()};
    var Status = TAFFY();

// Define HTML elements
    var noConnection = document.getElementById("no-connection");
    var slidebadges = document.getElementById('slide-badges');
    var statusBadges = document.getElementById('status-badges');
    var statusLine = document.getElementById('status-line');
    var content = document.getElementById('slide');
    var title = document.getElementById('title');
    var wrapper = document.getElementById("wrapper");
    wrapper.width = window.innerWidth;
    wrapper.height = window.innerHeight;
    var flashInterval = null;

// Define other variables
    var nodeURL = 'https://server.wwsu1069.org';
    var directorpresent = false;
    var disconnected = true;
    var slidetimer = false;
    var slide = 1;
    var lastBurnIn = null;

// Define initial slides
    var slides = {1: {
            name: 'WWSU', class: 'wwsu-red', do: true, function: function () {
                $('#slide').animateCss('fadeOutUp', function () {
                    content.innerHTML = `<div class="animated bounceIn">
                    <div style="text-align: center; width: 100%;"><img src="../../images/display/logo.png" style="max-height: 300px; width: auto;"></div>
                            <div id="thebottom">
                            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Website: <span class="text-primary">wwsu1069.org</span></h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Line: <span class="text-warning">937-775-5554</span></h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Request Line: <span class="text-warning">937-775-5555</span></h1>
            </div>
            </div>
            </div>
            `;
                    slidetimer = setTimeout(doSlide, 14000);
                });
            }
        }};

    var colors = ['#FF0000', '#00FF00', '#0000FF'], color = 0, delay = 300000, scrollDelay = 15000;

// burnGuard is a periodic line that sweeps across the screen to prevent burn-in. Define / construct it.
    var $burnGuard = $('<div>').attr('id', 'burnGuard').css({
        'background-color': 'rgba(0, 0, 0, 0)',
        'width': '10px',
        'height': $(document).height() + 'px',
        'position': 'absolute',
        'top': '0px',
        'left': '0px',
        'display': 'none',
        'z-index': 99
    }).appendTo('body');

// Construct a new LineJS instance (the periodic line marquee screensaver)
    var lines = new LinesJS({
        canvasId: 'wrapper',
        skipMin: 5,
        skipMax: 15,
        numLines: 30,
        timeInterval: 50
    });

    // Define default settings for iziToast (overlaying messages)
    iziToast.settings({
        titleColor: '#000000',
        messageColor: '#000000',
        backgroundColor: 'rgba(244, 67, 54, 0.8);',
        color: 'rgba(244, 67, 54);',
        close: false,
        progressBarColor: 'rgba(244, 67, 54, 1)',
        overlay: true,
        overlayColor: 'rgba(244, 67, 54, 0.1)',
        zindex: 1000,
        layout: 1,
        closeOnClick: true,
        position: 'center',
        timeout: 30000
    });

} catch (e) {
    iziToast.show({
        title: 'An error occurred - Please check the logs',
        message: 'Error occurred when trying to load initial variables and/or burn guard.'
    });
    console.error(e);
}

// This function triggers a burn guard sweep.
function burnGuardAnimate()
{
    try {
        color = ++color % 3;
        var rColor = colors[color];
        $burnGuard.css({
            'left': '0px',
            'background-color': rColor
        }).show().animate({
            'left': $(window).width() + 'px'
        }, scrollDelay, 'linear', function () {
            $(this).hide();
        });
        setTimeout(burnGuardAnimate, delay);
    } catch (e) {
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the burnGuardAnimate function.'
        });
        console.error(e);
    }
}

setTimeout(burnGuardAnimate, 5000);

$.fn.extend({
    // Add an animateCss function to JQuery to trigger an animation of an HTML element with animate.css
    animateCss: function (animationName, callback) {
        var animationEnd = (function (el) {
            var animations = {
                animation: 'animationend',
                OAnimation: 'oAnimationEnd',
                MozAnimation: 'mozAnimationEnd',
                WebkitAnimation: 'webkitAnimationEnd'
            };

            for (var t in animations) {
                if (el.style[t] !== undefined) {
                    return animations[t];
                }
            }
        })(document.createElement('div'));

        this.addClass('animated ' + animationName).one(animationEnd, function () {
            $(this).removeClass('animated ' + animationName);

            if (typeof callback === 'function')
                callback();
        });

        return this;
    }
});

// Define a reload timer; terminates if socket connection gets established. This ensures if no connection is made, page will refresh itself to try again.
var restart = setTimeout(function () {
    window.location.reload(true);
}, 15000);

function waitFor(check, callback, count = 0)
{
    if (!check())
    {
        if (count < 10000)
        {
            count++;
            window.requestAnimationFrame(function () {
                waitFor(check, callback, count);
            });
        } else {
        }
    } else {
        callback();
}
}

waitFor(function () {
    return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && io.socket.isConnected());
}, function () {
    // When a director is passed as an event, process it.
    io.socket.on('directors', function (data) {
        for (var key in data)
        {
            if (data.hasOwnProperty(key))
            {
                switch (key)
                {
                    case 'insert':
                        Directors.insert(data[key]);
                        break;
                    case 'update':
                        Directors({ID: data[key].ID}).update(data[key]);
                        break;
                    case 'remove':
                        Directors({ID: data[key]}).remove();
                        break;
                }
            }
        }
        processDirectors();
    });

    // When a director is passed as an event, process it.
    io.socket.on('directorhours', function (data) {
        for (var key in data)
        {
            if (data.hasOwnProperty(key))
            {
                switch (key)
                {
                    case 'insert':
                        Directorhours.insert(data[key]);
                        break;
                    case 'update':
                        Directorhours({ID: data[key].ID}).update(data[key]);
                        break;
                    case 'remove':
                        Directorhours({ID: data[key]}).remove();
                        break;
                }
            }
        }
        processDirectorHours();
    });

// When a socket connection is established
    io.socket.on('connect', function () {
        onlineSocket();
        metaSocket();
        directorSocket();
        directorHourSocket();
        statusSocket();
        // Remove the lost connection overlay
        if (disconnected)
        {
            //noConnection.style.display = "none";
            disconnected = false;
            clearTimeout(restart);
            clearTimeout(slidetimer);
            doSlide(true);
        }
    });

    onlineSocket();
    metaSocket();
    directorSocket();
    directorHoursSocket();
    statusSocket();
    if (disconnected)
    {
        //noConnection.style.display = "none";
        disconnected = false;
        clearTimeout(restart);
        clearTimeout(slidetimer);
        doSlide(true);
    }

// When a socket connection is lost
    io.socket.on('disconnect', function () {
        console.log('Lost connection');
        try {
            io.socket._raw.io._reconnection = true;
            io.socket._raw.io._reconnectionAttempts = Infinity;
        } catch (e) {
            iziToast.show({
                title: 'An error occurred - Please check the logs',
                message: 'Error occurred trying to make socket reconnect indefinitely.'
            });
            console.error(e);
        }
        // Show the lost connection overlay
        if (!disconnected)
        {
            //noConnection.style.display = "inline";
            disconnected = true;
            processStatus();
        }
    });

// Display sign reload event
    io.socket.on('display-refresh', function (data) {
        window.location.reload(true);
    });

// Update meta information when meta is provided
    io.socket.on('meta', function (data) {
        try {
            for (var key in data)
            {
                if (data.hasOwnProperty(key))
                {
                    Meta[key] = data[key];

                    // Do a status update if a state change was returned; this could impact power saving mode
                    if (key === 'state')
                        processStatus();
                }
            }
        } catch (e) {
            iziToast.show({
                title: 'An error occurred - Please check the logs',
                message: 'Error occurred on meta event.'
            });
            console.error(e);
        }
    });

// Update statuses when status events are passed
    io.socket.on('status', function (data) {
        for (var key in data)
        {
            if (data.hasOwnProperty(key))
            {
                switch (key)
                {
                    case 'insert':
                        Status.insert(data[key]);
                        break;
                    case 'update':
                        Status({ID: data[key].ID}).update(data[key]);
                        break;
                    case 'remove':
                        Status({ID: data[key]}).remove();
                        break;
                }
            }
        }
        processStatus();
    });
});

// Define data-specific functions
// Run through operations of each WWSU status
function processStatus()
{
    try {

        // Make a dim status bar if it is time for power saving
        if (typeof Meta.state === 'undefined' || ((moment().isAfter(moment({hour: 8, minute: 0})) && (moment().isBefore(moment({hour: 22, minute: 0})))) || !Meta.state.startsWith("automation_") || directorpresent || Meta.state === 'automation_live' || Meta.state === 'automation_sports' || Meta.state === 'automation_remote' || Meta.state === 'automation_sportsremote')) {
            statusBadges.style.opacity = '1';
        } else {
            statusBadges.style.opacity = '0.2';
        }

        statusBadges.innerHTML = '';

        var globalStatus = 4;

        // Make a badge for each status subsystem and display its status by color / class. Also check for current overall status.
        Status().each(function (thestatus) {
            try {
                switch (thestatus.status)
                {
                    case 1:
                        statusBadges.innerHTML += `<span class="m-1 btn btn-danger btn-sm">${thestatus.label}</span>`;
                        if (globalStatus > 1)
                            globalStatus = 1;
                        break;
                    case 2:
                        statusBadges.innerHTML += `<span class="m-1 btn btn-urgent btn-sm">${thestatus.label}</span>`;
                        if (globalStatus > 2)
                            globalStatus = 2;
                        break;
                    case 3:
                        statusBadges.innerHTML += `<span class="m-1 btn btn-warning btn-sm">${thestatus.label}</span>`;
                        if (globalStatus > 3)
                            globalStatus = 3;
                        break;
                    case 4:
                        statusBadges.innerHTML += `<span class="m-1 btn btn-outline-success btn-sm">${thestatus.label}</span>`;
                        break;
                    case 5:
                        statusBadges.innerHTML += `<span class="m-1 btn btn-success btn-sm">${thestatus.label}</span>`;
                        if (globalStatus > 3)
                            globalStatus = 5;
                        break;
                    default:
                        statusBadges.innerHTML += `<span class="m-1 btn btn-outline-secondary btn-sm">${thestatus.label}</span>`;
                }
            } catch (e) {
                iziToast.show({
                    title: 'An error occurred - Please check the logs',
                    message: `Error occurred during Status iteration in processStatus call.`
                });
                console.error(e);
            }
        });

        if (disconnected)
            globalStatus = 0;

        var status = document.getElementById('status-div');
        var color = 'rgba(158, 158, 158, 0.3)';
        clearInterval(flashInterval);
        switch (globalStatus)
        {
            case 0:
                color = 'rgba(244, 67, 54, 0.5)';
                statusLine.innerHTML = 'DISPLAY SIGN NOT CONNECTED TO WWSU';
                // Flash screen for major outages every second
                flashInterval = setInterval(function () {
                    $("html, body").css("background-color", "#D32F2F");
                    setTimeout(function () {
                        $("html, body").css("background-color", "#000000");
                    }, 250);
                }, 1000);
                break;
            case 1:
                color = 'rgba(244, 67, 54, 0.5)';
                statusLine.innerHTML = 'WWSU Status: Unstable';
                // Flash screen for major outages every second
                flashInterval = setInterval(function () {
                    $("html, body").css("background-color", "#D32F2F");
                    setTimeout(function () {
                        $("html, body").css("background-color", "#000000");
                    }, 250);
                }, 1000);
                break;
            case 2:
                color = 'rgba(245, 124, 0, 0.5)';
                statusLine.innerHTML = 'WWSU Status: Needs Attention';
                // Flash screen for partial outages every 5 seconds
                // Flash screen for major outages every second
                flashInterval = setInterval(function () {
                    $("html, body").css("background-color", "#FF9800");
                    setTimeout(function () {
                        $("html, body").css("background-color", "#000000");
                    }, 250);
                }, 5000);
                break;
            case 3:
                color = 'rgba(251, 192, 45, 0.5)';
                statusLine.innerHTML = 'WWSU Status: Minor Issue';
                break;
            case 5:
                color = 'rgba(76, 175, 80, 0.5)';
                statusLine.innerHTML = 'WWSU Status: Operational';
                break;
            default:
                color = 'rgba(158, 158, 158, 0.3)';
                statusLine.innerHTML = 'WWSU Status: Unknown';
        }

        // Have dim elements if we are to be in power saving mode
        if ((moment().isAfter(moment({hour: 8, minute: 0})) && (moment().isBefore(moment({hour: 22, minute: 0})))) || directorpresent) {
            status.style.backgroundColor = color;
            status.style.color = 'rgba(255, 255, 255, 1)';
            statusLine.style.color = 'rgba(255, 255, 255, 1)';
        } else {
            status.style.backgroundColor = 'rgba(0, 0, 0, 0)';
            status.style.color = 'rgba(255, 255, 255, 0.2)';
            statusLine.style.color = 'rgba(255, 255, 255, 0.2)';
        }
    } catch (e) {
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the call of Status[0].'
        });
        console.error(e);
    }
}

// Mark if a director is present or not
function processDirectors()
{
    try {
        directorpresent = false;

        // Slide 3 is a list of WWSU directors and whether or not they are currently clocked in
        slides[2] = {name: 'Directors', class: 'info', do: true, function: function () {
                $('#slide').animateCss('lightSpeedOut', function () {
                    content.innerHTML = `<div class="animated fadeInDown" ><h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Directors</h1>
            <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="directors"></div></div>`;
                    var innercontent = document.getElementById('directors');
                    Directors().each(function (dodo) {
                        try {
                            if (dodo.present)
                                directorpresent = true;
                            var color = 'rgba(211, 47, 47, 0.8)';
                            var text1 = 'OUT';
                            var theClass = 'danger';
                            var text2 = '';
                            if (dodo.since !== null && moment(dodo.since).isValid())
                                text2 = moment(dodo.since).from(moment(Meta.time), true);
                            if (dodo.present)
                            {
                                var color = 'rgba(56, 142, 60, 0.8)';
                                var text1 = 'IN';
                                var theClass = 'success';
                            }
                            /*
                             innercontent.innerHTML += `<div style="width: 49%; background-color: ${color};" class="d-flex align-items-stretch m-1 text-white">
                             <div class="m-1" style="width: 64px;"><img src="${dodo.avatar}" width="64" class="rounded-circle"></div>
                             <div class="container-fluid m-1" style="text-align: center;"><span style="font-size: 1.5em;">${dodo.name}</span><br /><span style="font-size: 1em;">${dodo.position}</span></div>
                             <div class="m-1" style="width: 128px;"><span style="font-size: 1.5em;">${text1}</span><br /><span style="font-size: 1em;">${text2}</span></div>
                             </div>
                             `;
                             */
                            innercontent.innerHTML += `<div style="width: 132px; position: relative; background-color: ${color}" class="m-2 text-white rounded">
    <div class="p-1 text-center" style="width: 100%;"><img src="../images/avatars/${dodo.avatar}" width="64" class="rounded-circle"></div>
    <span class="notification badge badge-${theClass}" style="font-size: 1em;">${text1}</span>
  <div class="m-1" style="text-align: center;"><span style="font-size: 1.25em;">${dodo.name}</span><br><span style="font-size: 0.8em;">${dodo.position}</span></div>`;
                        } catch (e) {
                            console.error(e);
                            iziToast.show({
                                title: 'An error occurred - Please check the logs',
                                message: `Error occurred in Directors iteration in doSlide.`
                            });
                        }
                    });
                    slidetimer = setTimeout(doSlide, 14000);
                });
            }};
        slides[1].do = false;

        if (slide === 2)
        {
            var innercontent = document.getElementById('directors');
            innercontent.innerHTML = '';
            Directors().each(function (dodo) {
                try {
                    if (dodo.present)
                        directorpresent = true;
                    var color = 'rgba(211, 47, 47, 0.8)';
                    var text1 = 'OUT';
                    var theClass = 'danger';
                    var text2 = '';
                    if (dodo.since !== null && moment(dodo.since).isValid())
                        text2 = moment(dodo.since).from(moment(Meta.time), true);
                    if (dodo.present)
                    {
                        var color = 'rgba(56, 142, 60, 0.8)';
                        var text1 = 'IN';
                        var theClass = 'success';
                    }
                    /*
                     innercontent.innerHTML += `<div style="width: 49%; background-color: ${color};" class="d-flex align-items-stretch m-1 text-white">
                     <div class="m-1" style="width: 64px;"><img src="${dodo.avatar}" width="64" class="rounded-circle"></div>
                     <div class="container-fluid m-1" style="text-align: center;"><span style="font-size: 1.5em;">${dodo.name}</span><br /><span style="font-size: 1em;">${dodo.position}</span></div>
                     <div class="m-1" style="width: 128px;"><span style="font-size: 1.5em;">${text1}</span><br /><span style="font-size: 1em;">${text2}</span></div>
                     </div>
                     `;
                     */
                    innercontent.innerHTML += `<div style="width: 132px; position: relative; background-color: ${color}" class="m-2 text-white rounded">
    <div class="p-1 text-center" style="width: 100%;"><img src="../images/avatars/${dodo.avatar}" width="64" class="rounded-circle"></div>
    <span class="notification badge badge-${theClass}" style="font-size: 1em;">${text1}</span>
  <div class="m-1" style="text-align: center;"><span style="font-size: 1.25em;">${dodo.name}</span><br><span style="font-size: 0.8em;">${dodo.position}</span></div>`;
                } catch (e) {
                    console.error(e);
                    iziToast.show({
                        title: 'An error occurred - Please check the logs',
                        message: `Error occurred in Directors iteration in doSlide.`
                    });
                }
            });
        }
    } catch (e) {
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the call of Directors[0].'
        });
        console.error(e);
    }
}

// Mark if a director is present or not
function processDirectorHours()
{
    try {
        // A list of Office Hours for the directors

        // Define a comparison function that will order calendar events by start time when we run the iteration
        var compare = function (a, b) {
            try {
                if (moment(a.start).valueOf() < moment(b.start).valueOf())
                    return -1;
                if (moment(a.start).valueOf() > moment(b.start).valueOf())
                    return 1;
                if (a.ID < b.ID)
                    return -1;
                if (a.ID > b.ID)
                    return 1;
                return 0;
            } catch (e) {
                console.error(e);
                iziToast.show({
                    title: 'An error occurred - Please check the logs',
                    message: `Error occurred in the compare function of Calendar.sort in the Calendar[0] call.`
                });
            }
        };

        // Prepare the formatted calendar variable for our formatted events
        var calendar = {};
        calendar[`Today ${moment(Meta.time).format('MM/DD')}`] = {};
        calendar[moment(Meta.time).add(1, 'days').format('dddd MM/DD')] = {};
        calendar[moment(Meta.time).add(2, 'days').format('dddd MM/DD')] = {};
        calendar[moment(Meta.time).add(3, 'days').format('dddd MM/DD')] = {};
        calendar[moment(Meta.time).add(4, 'days').format('dddd MM/DD')] = {};
        calendar[moment(Meta.time).add(5, 'days').format('dddd MM/DD')] = {};
        calendar[moment(Meta.time).add(6, 'days').format('dddd MM/DD')] = {};

        Directorhours().get().sort(compare).forEach(function (event)
        {
            // null start or end? Use a default to prevent errors.
            if (!moment(event.start).isValid())
                event.start = moment(Meta.time).startOf('day');
            if (!moment(event.end).isValid())
                event.end = moment(Meta.time).add(1, 'days').startOf('day');

            // Cycle through each day of the week, and add in director hours
            for (var i = 0; i < 7; i++) {
                var looptime = moment(Meta.time).startOf('day').add(i, 'days');
                var looptime2 = moment(Meta.time).startOf('day').add(i + 1, 'days');
                var start2;
                var end2;
                if (moment(event.start).isBefore(looptime))
                {
                    start2 = moment(looptime);
                } else {
                    start2 = moment(event.start);
                }
                if (moment(event.end).isAfter(looptime2))
                {
                    end2 = moment(looptime2);
                } else {
                    end2 = moment(event.end);
                }
                if ((moment(event.start).isSameOrAfter(looptime) && moment(event.start).isBefore(looptime2)) || (moment(event.start).isBefore(looptime) && moment(event.end).isAfter(looptime)))
                {
                    event.startT = moment(event.start).format('hh:mm A');
                    event.endT = moment(event.end).format('hh:mm A');

                    // Update strings if need be, if say, start time was before this day, or end time is after this day.
                    if (moment(event.end).isAfter(moment(Meta.time).startOf('day').add(i + 1, 'days')))
                    {
                        event.endT = moment(event.start).format('MM/DD hh:mm A');
                    }
                    if (moment(event.start).isBefore(moment(Meta.time).add(i, 'days').startOf('day')))
                    {
                        event.startT = moment(event.start).format('MM/DD hh:mm A');
                    }

                    // Push the final products into our formatted variable
                    if (i === 0)
                    {
                        if (typeof calendar[`Today ${moment(Meta.time).format('MM/DD')}`][event.director] === 'undefined')
                            calendar[`Today ${moment(Meta.time).format('MM/DD')}`][event.director] = [];
                        calendar[`Today ${moment(Meta.time).format('MM/DD')}`][event.director].push(event);
                    } else
                    {
                        if (typeof calendar[moment(Meta.time).add(i, 'days').format('dddd MM/DD')][event.director] === 'undefined')
                            calendar[moment(Meta.time).add(i, 'days').format('dddd MM/DD')][event.director] = [];
                        calendar[moment(Meta.time).add(i, 'days').format('dddd MM/DD')][event.director].push(event);
                    }
                }
            }
        });

        slides[3] = {name: 'Office Hours', class: 'info', do: true, function: function () {
                $('#slide').animateCss('lightSpeedOut', function () {
                    content.innerHTML = `<div class="animated fadeInDown"><h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours</h1>
            <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="office-hours"></div></div>`;
                    var innercontent = document.getElementById('office-hours');
                    for (var day in calendar)
                    {
                        if (calendar.hasOwnProperty(day))
                        {
                            var stuff = `<h4>${day}</h4>`;
                            for (var director in calendar[day])
                            {
                                if (calendar[day].hasOwnProperty(director))
                                {
                                    stuff += `<div class="p-1">
<div class="container">
                    <div class="row">
                      <div class="col-6 text-light">
                  		${director}:
                      </div>
                      <div class="col-6 text-info-light">`;
                                    if (calendar[day][director].length > 0)
                                    {
                                        calendar[day][director].forEach(function (event, index) {
                                            if (index > 0)
                                                stuff += `<br />`;
                                            stuff += `${event.startT} - ${event.endT}`;
                                        });
                                    }
                                    stuff += `</div></div></div></div>`;
                                }
                            }
                            innercontent.innerHTML += `<div style="width: 32%; min-width: 320px; position: relative;" class="m-2 bs-callout bs-callout-danger">${stuff}</div>`;
                        }
                    }
                    
                    slidetimer = setTimeout(doSlide, 14000);
                });
            }};
    } catch (e) {
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the call of office hours slide.'
        });
        console.error(e);
    }
}

function onlineSocket()
{
    console.log('attempting online socket');
    io.socket.post('/recipients/add-display', {host: 'display-internal'}, function serverResponded(body, JWR) {
        try {
        } catch (e) {
            console.log('FAILED ONLINE CONNECTION');
            setTimeout(onlineSocket, 10000);
        }
    });
}

// Called to replace all Directors data with body of request
function directorSocket()
{
    console.log('attempting director socket');
    io.socket.post('/directors/get', {}, function serverResponded(body, JWR) {
        try {
            Directors = TAFFY();
            Directors.insert(body);
            processDirectors();
        } catch (e) {
            console.error(e);
            console.log('FAILED DIRECTORS CONNECTION');
            setTimeout(directorSocket, 10000);
        }
    });
}

// Called to replace all Directors data with body of request
function directorHoursSocket()
{
    console.log('attempting director socket');
    io.socket.post('/directors/get-hours', {}, function serverResponded(body, JWR) {
        try {
            Directorhours = TAFFY();
            Directorhours.insert(body);
            processDirectorHours();
        } catch (e) {
            console.error(e);
            console.log('FAILED DIRECTOR HOURS CONNECTION');
            setTimeout(directorHoursSocket, 10000);
        }
    });
}

// Called to update all meta information with that of a body request
function metaSocket()
{
    console.log('attempting meta socket');
    io.socket.post('/meta/get', {}, function serverResponded(body, JWR) {
        try {
            temp = body;
            for (var key in temp)
            {
                if (temp.hasOwnProperty(key))
                {
                    Meta[key] = temp[key];
                }
            }
            processStatus();
        } catch (e) {
            console.error(e);
            console.log('FAILED META CONNECTION');
            setTimeout(metaSocket, 10000);
        }
    });
}

// Replace all Status data with that of body request
function statusSocket()
{
    console.log('attempting status socket');
    io.socket.post('/status/get', function serverResponded(body, JWR) {
        try {
            Status = TAFFY();
            Status.insert(body);
            processStatus();
        } catch (e) {
            console.error(e);
            console.log('FAILED STATUS CONNECTION');
            setTimeout(statusSocket, 10000);
        }
    });
}

// Process slides
function doSlide(same = false)
{
    try {
        var prevslide = slide;
        clearTimeout(slidetimer);
        slidetimer = true;
        if (!same)
            slide += 1;
        console.log(`Slide ${slide}.`);

        // Do slides if we are not to be in power saving mode
        if (typeof Meta.state === 'undefined' || ((moment().isAfter(moment({hour: 8, minute: 0})) && (moment().isBefore(moment({hour: 22, minute: 0})))) || !Meta.state.startsWith("automation_") || directorpresent || Meta.state === 'automation_live' || Meta.state === 'automation_sports' || Meta.state === 'automation_remote' || Meta.state === 'automation_sportsremote'))
        {
            slidebadges.innerHTML = ``;
            // Determine highest slide number so we know when we are done
            var highestslide = 0;
            for (var key in slides) {
                if (slides.hasOwnProperty(key)) {
                    if (slides[key].do)
                    {
                        if (highestslide < parseInt(key))
                            highestslide = parseInt(key);
                        slidebadges.innerHTML += `<span class="m-1 btn btn-outline-${slides[key].class} btn-sm" id="slidebadge-${key}">${slides[key].name}</span>`;
                    }
                }
            }

            var done = false;
            var restarted = false;

            // Iterate through each number until we find a slide with a matching number, or we exceed highestslide
            while (!done)
            {
                // Restart if we passed the highest slide number; do 30 second marquee screensaver first if it has been 15 minutes.
                if (slide > highestslide)
                {
                    slide = 1;
                    /*
                     if (restarted || lastBurnIn === null || moment().isAfter(moment(lastBurnIn).add(15, 'minutes')))
                     {
                     slide = 0;
                     lastBurnIn = moment();
                     if (restarted)
                     console.log(`Slide issue. Triggering marquee screensaver.`);
                     }
                     */
                    restarted = true;
                }

                // Do marquee screensaver
                if (slide === 0)
                {
                    done = true;
                    wrapper.style.display = "inline";
                    $('#wrapper').fadeIn(500, 'linear', function () {
                        lines.reset();
                        lines.start();
                        slidetimer = setTimeout(function () {
                            lines.stop();
                            $('#wrapper').fadeOut(500, 'linear', function () {
                                lines.clear();
                                wrapper.style.display = "none";
                                doSlide();
                            });
                        }, 30000);
                    });
                } else if (typeof slides[slide] !== 'undefined' && slides[slide].do)
                {
                    if (slide !== prevslide && !same)
                    {
                        done = true;
                        console.log(`Doing slide ${slide}`);
                        try {
                            slides[slide].function();
                        } catch (e) {
                            console.log(e);
                            iziToast.show({
                                title: 'An error occurred - Please check the logs',
                                message: 'Slide ' + slide + ' has an error in its function call. This slide was skipped.'
                            });
                            doSlide();
                            return null;
                        }
                    } else {
                        done = true;
                        console.log(`Slide ${slide} already active. Setting new 14-second timer.`);
                        slidetimer = setTimeout(doSlide, 14000);
                    }
                    var temp = document.getElementById(`slidebadge-${slide}`);
                    if (temp !== null)
                        temp.className = `m-1 btn btn-${slides[slide].class} btn-sm`;
                } else {
                    slide += 1;
                }
            }

            // Power saving slide
        } else {
            slidetimer = setTimeout(doSlide, 14000);
            slidebadges.innerHTML = ``;
            var afterFunction = function () {
                try {
                    console.log(`Doing inactive slide - WWSU`);
                    content.innerHTML = `<div style="opacity: 0.2;" id="dim-slide">
                    <div style="text-align: center; width: 100%;"><img src="../../images/display/logo.png" style="max-height: 300px; width: auto;"></div>
                            <div id="thebottom">
                            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Website: wwsu1069.org</h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Line: 937-775-5554</h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Request Line: 937-775-5555</h1>
            </div>
            </div>`;
                    slide = 1;
                } catch (e) {
                    iziToast.show({
                        title: 'An error occurred - Please check the logs',
                        message: `Error occurred in the afterFunction of doSlide.`
                    });
                    console.error(e);
                }
            };
            if (document.getElementById('dim-slide') === null)
            {
                $('#slide').animateCss('fadeOutUp', afterFunction);
            } else {
                afterFunction();
            }
        }
    } catch (e) {
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred on doSlide.'
        });
        console.error(e);
}
}