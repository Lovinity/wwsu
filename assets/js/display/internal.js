/* global io, moment, Infinity, iziToast, responsiveVoice */

try {

// Define data variables
    var Directors = TAFFY();
    var Directorhours = TAFFY();
    var Announcements = TAFFY();
    var Meta = {time: moment().toISOString()};
    var Status = TAFFY();

// Define HTML elements
    var noConnection = document.getElementById("no-connection");
    var slidebadges = document.getElementById('slide-badges');
    var statusLine = document.getElementById('status-line');
    var content = document.getElementById('slide');
    var title = document.getElementById('title');
    var wrapper = document.getElementById("wrapper");
    var background = document.getElementById("bg-canvas");
    wrapper.width = window.innerWidth;
    wrapper.height = window.innerHeight;
    var flashInterval = null;
    var statusMarquee = ``;

// Define other variables
    var nodeURL = 'https://server.wwsu1069.org';
    var directorpresent = false;
    var disconnected = true;
    var slidetimer = false;
    var slide = 1;
    var lastBurnIn = null;
    var prevStatus = 5;
    var stickySlides = false

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
        'z-index': 9999
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

    function generateBG() {

        var hexValues = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e"];

        function populate(a) {
            for (var i = 0; i < 6; i++) {
                var x = Math.round(Math.random() * 14);
                var y = hexValues[x];
                a += y;
            }
            return a;
        }

        var newColor1 = populate('#');
        var newColor2 = populate('#');
        var angle = Math.round(Math.random() * 360);

        var gradient = "linear-gradient(" + angle + "deg, " + newColor1 + ", " + newColor2 + ")";

        background.style.background = gradient;

    }

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
        processDirectors(data);
    });

    // When a director is passed as an event, process it.
    io.socket.on('directorhours', function (data) {
        processDirectorHours(data);
    });

// When a socket connection is established
    io.socket.on('connect', function () {
        onlineSocket();
        metaSocket();
        directorSocket();
        statusSocket();
        announcementsSocket();
        weeklyDJSocket();
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
    statusSocket();
    announcementsSocket();
    weeklyDJSocket();
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

    // When an announcement comes through
    io.socket.on('announcements', function (data) {
        try {
            for (var key in data)
            {
                if (data.hasOwnProperty(key))
                {
                    switch (key)
                    {
                        case 'insert':
                            Announcements.insert(data[key]);
                            break;
                        case 'update':
                            Announcements({ID: data[key].ID}).update(data[key]);
                            break;
                        case 'remove':
                            Announcements({ID: data[key]}).remove();
                            break;
                    }
                }
            }
        } catch (e) {
            iziToast.show({
                title: 'An error occurred - Please check the logs',
                message: 'Error occurred on announcements event.'
            });
            console.error(e);
        }
    });

    // When an announcement comes through
    io.socket.on('analytics-weekly-dj', function (data) {
        try {
            processWeeklyStats(data);
        } catch (e) {
            iziToast.show({
                title: 'An error occurred - Please check the logs',
                message: 'Error occurred on analytics-weekly-dj event.'
            });
            console.error(e);
        }
    });
});

// Define data-specific functions
// Run through operations of each WWSU status
function processStatus()
{
    try {

        var globalStatus = 4;
        var doRow = false;
        var secondRow = false;
        statusMarquee = `<div class="row">
                      <div class="col-2 text-primary-light">
                  	<strong>System</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>Status</strong>
                      </div>
                      <div class="col-2 text-primary-light">
                  	<strong>System</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>Status</strong>
                      </div>
                    </div><div class="row" style="${secondRow ? `background: rgba(255, 255, 255, 0.1);` : ``}">`;


        Status().each(function (thestatus) {
            try {
                if (doRow)
                {
                    if (!secondRow)
                    {
                        secondRow = true;
                    } else {
                        secondRow = false;
                    }
                    statusMarquee += `</div><div class="row" style="${secondRow ? `background: rgba(255, 255, 255, 0.1);` : ``}">`;
                    doRow = false;
                } else {
                    doRow = true;
                }

                switch (thestatus.status)
                {
                    case 1:
                        statusMarquee += `<div class="col-2 text-primary-light">
                  	<span class="m-1 btn btn-danger btn-sm">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>CRITICAL</strong>: ${thestatus.data}
                      </div>`;
                        if (globalStatus > 1)
                            globalStatus = 1;
                        break;
                    case 2:
                        statusMarquee += `<div class="col-2 text-primary-light">
                  	<span class="m-1 btn btn-urgent btn-sm">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>Urgent</strong>: ${thestatus.data}
                      </div>`;
                        if (globalStatus > 2)
                            globalStatus = 2;
                        break;
                    case 3:
                        statusMarquee += `<div class="col-2 text-primary-light">
                  	<span class="m-1 btn btn-warning btn-sm">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>Warning</strong>: ${thestatus.data}
                      </div>`;
                        if (globalStatus > 3)
                            globalStatus = 3;
                        break;
                    case 4:
                        statusMarquee += `<div class="col-2 text-primary-light">
                  	<span class="m-1 btn btn-outline-success btn-sm">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>Offline</strong>: ${thestatus.data}
                      </div>`;
                        break;
                    case 5:
                        statusMarquee += `<div class="col-2 text-primary-light">
                  	<span class="m-1 btn btn-success btn-sm">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>Good</strong>: ${thestatus.data}
                      </div>`;
                        if (globalStatus > 3)
                            globalStatus = 5;
                        break;
                    default:
                }
            } catch (e) {
                iziToast.show({
                    title: 'An error occurred - Please check the logs',
                    message: `Error occurred during Status iteration in processStatus call.`
                });
                console.error(e);
            }
        });

        statusMarquee += `</div>`;

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
                if (globalStatus !== prevStatus)
                    responsiveVoice.speak("Attention! The display sign is not connected to WWSU. This could indicate the server has crashed or is rebooting.");
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
                statusLine.innerHTML = 'CRITICAL ISSUES DETECTED WITH WWSU';
                if (globalStatus !== prevStatus)
                    responsiveVoice.speak("Attention! Attention! The WWSU system is in a critically unstable state.");
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
                statusLine.innerHTML = 'Significant issues detected with WWSU';
                if (globalStatus !== prevStatus)
                    responsiveVoice.speak("Attention! The WWSU system needs attention.");
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
                statusLine.innerHTML = 'Minor issues detected with WWSU';
                color = 'rgba(251, 192, 45, 0.5)';
                break;
            case 5:
                statusLine.innerHTML = 'WWSU systems are operational';
                color = 'rgba(76, 175, 80, 0.5)';
                break;
            default:
                statusLine.innerHTML = 'WWSU status is unknown';
                color = 'rgba(158, 158, 158, 0.3)';
        }

        prevStatus = globalStatus;

        // Have dim elements if we are to be in power saving mode
        if (typeof Meta.state === 'undefined' || ((moment().isAfter(moment({hour: 8, minute: 0})) && (moment().isBefore(moment({hour: 22, minute: 0})))) || !Meta.state.startsWith("automation_") || directorpresent || Meta.state === 'automation_live' || Meta.state === 'automation_sports' || Meta.state === 'automation_remote' || Meta.state === 'automation_sportsremote'))
        {
            status.style.backgroundColor = color;
            status.style.color = 'rgba(255, 255, 255, 1)';
            statusLine.style.color = 'rgba(255, 255, 255, 1)';
        } else {
            status.style.backgroundColor = 'rgba(0, 0, 0, 0)';
            status.style.color = 'rgba(255, 255, 255, 0.2)';
            statusLine.style.color = 'rgba(255, 255, 255, 0.2)';
        }

        slides[6] = {
            name: 'System', class: 'wwsu-red', do: true, function: function () {
                $('#slide').animateCss('fadeOutUp', function () {
                    content.innerHTML = `<div class="animated fadeInDown"><h1 style="text-align: center; font-size: 3em; color: #FFFFFF">System Status</h1>
                    <div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1" id="system-status">${statusMarquee}</div></div>`;

                    slidetimer = setTimeout(doSlide, 14000);
                });
            }
        };

    } catch (e) {
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the call of Status[0].'
        });
        console.error(e);
    }
}

// Mark if a director is present or not
function processDirectors(data = {}, replace = false)
{
    try {
        if (replace)
        {
            Directors = TAFFY();
            Directors.insert(data);
        } else {
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
        }

        directorpresent = false;

        // Slide 3 is a list of WWSU directors and whether or not they are currently clocked in
        slides[2] = {name: 'Directors', class: 'primary', do: true, function: function () {
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
            if (innercontent)
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
                    if (innercontent)
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

        processDirectorHours();
    } catch (e) {
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the call of Directors[0].'
        });
        console.error(e);
}
}

// Mark if a director is present or not
function processDirectorHours(data = {}, replace = false)
{
    try {
        if (replace)
        {
            Directorhours = TAFFY();
            Directorhours.insert(data);
        } else {
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
        }

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
        var asstcalendar = {};
        Directorhours().get().sort(compare).map(event =>
        {
            var temp = Directors({name: event.director}).first();
            if (typeof temp.assistant !== 'undefined')
            {
                var assistant = temp.assistant;
                console.log(event.director + " " + assistant);
            } else {
                var assistant = true;
                console.log(event.director + " is an unknown assistant.");
            }
            // Format calendar for the director
            if (!assistant && typeof calendar[event.director] === 'undefined')
            {
                calendar[event.director] = {};
                calendar[event.director][0] = ``;
                calendar[event.director][1] = ``;
                calendar[event.director][2] = ``;
                calendar[event.director][3] = ``;
                calendar[event.director][4] = ``;
                calendar[event.director][5] = ``;
                calendar[event.director][6] = ``;
            }
            if (assistant && typeof asstcalendar[event.director] === 'undefined')
            {
                asstcalendar[event.director] = {};
                asstcalendar[event.director][0] = ``;
                asstcalendar[event.director][1] = ``;
                asstcalendar[event.director][2] = ``;
                asstcalendar[event.director][3] = ``;
                asstcalendar[event.director][4] = ``;
                asstcalendar[event.director][5] = ``;
                asstcalendar[event.director][6] = ``;
            }

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
                    if (!assistant)
                        calendar[event.director][i] += `<div class="m-1"><div class="m-1 text-success-light">IN ${event.startT}</div><div class="m-1 text-danger-light">OUT ${event.endT}</div></div>`;
                    if (assistant)
                        asstcalendar[event.director][i] += `<div class="m-1"><div class="m-1 text-success-light">IN ${event.startT}</div><div class="m-1 text-danger-light">OUT ${event.endT}</div></div>`;
                }
            }
        });

        slides[3] = {name: 'Hours', class: 'info', do: true, function: function () {
                $('#slide').animateCss('lightSpeedOut', function () {
                    content.innerHTML = `<div class="animated fadeInDown"><h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Directors</h1>
            <div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1" id="office-hours"></div></div>`;
                    var innercontent = document.getElementById('office-hours');

                    var stuff = `<div class="row">
                      <div class="col-3 text-primary-light">
                  	<strong>Director</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>Today</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>${moment(Meta.time).add(1, 'days').format('ddd MM/DD')}</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>${moment(Meta.time).add(2, 'days').format('ddd MM/DD')}</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>${moment(Meta.time).add(3, 'days').format('ddd MM/DD')}</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>${moment(Meta.time).add(4, 'days').format('ddd MM/DD')}</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>${moment(Meta.time).add(5, 'days').format('ddd MM/DD')}</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>${moment(Meta.time).add(6, 'days').format('ddd MM/DD')}</strong>
                      </div>
                    </div>`;
                    var doShade = false;
                    for (var director in calendar)
                    {
                        if (calendar.hasOwnProperty(director))
                        {
                            stuff += `<div class="row" style="${doShade ? `background: rgba(255, 255, 255, 0.1);` : ``}">
                      <div class="col-3 text-warning">
                  	${director}
                      </div>
                      <div class="col" style="font-size: 0.75em;">
                            ${calendar[director][0]}
                      </div>
                      <div class="col" style="font-size: 0.75em;">
                            ${calendar[director][1]}
                      </div>
                      <div class="col" style="font-size: 0.75em;">
                            ${calendar[director][2]}
                      </div>
                      <div class="col" style="font-size: 0.75em;">
                            ${calendar[director][3]}
                      </div>
                       <div class="col" style="font-size: 0.75em;">
                            ${calendar[director][4]}
                      </div>
                       <div class="col" style="font-size: 0.75em;">
                            ${calendar[director][5]}
                      </div>
                      <div class="col" style="font-size: 0.75em;">
                            ${calendar[director][6]}
                      </div>
                    </div>`;
                            if (doShade)
                            {
                                doShade = false;
                            } else {
                                doShade = true;
                            }
                        }
                    }

                    innercontent.innerHTML += stuff;

                    slidetimer = setTimeout(doSlide, 14000);
                });
            }};

        slides[4] = {name: 'Hours', class: 'info', do: true, function: function () {
                $('#slide').animateCss('lightSpeedOut', function () {
                    content.innerHTML = `<div class="animated fadeInDown"><h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Assistant Directors</h1>
            <div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1" id="office-hours"></div></div>`;
                    var innercontent = document.getElementById('office-hours');

                    var stuff = `<div class="row">
                      <div class="col-3 text-primary-light">
                  	<strong>Asst. Director</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>Today</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>${moment(Meta.time).add(1, 'days').format('ddd MM/DD')}</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>${moment(Meta.time).add(2, 'days').format('ddd MM/DD')}</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>${moment(Meta.time).add(3, 'days').format('ddd MM/DD')}</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>${moment(Meta.time).add(4, 'days').format('ddd MM/DD')}</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>${moment(Meta.time).add(5, 'days').format('ddd MM/DD')}</strong>
                      </div>
                      <div class="col text-primary-light">
                  	<strong>${moment(Meta.time).add(6, 'days').format('ddd MM/DD')}</strong>
                      </div>
                    </div>`;
                    var doShade = false;
                    for (var director in asstcalendar)
                    {
                        if (asstcalendar.hasOwnProperty(director))
                        {
                            stuff += `<div class="row" style="${doShade ? `background: rgba(255, 255, 255, 0.1);` : ``}">
                      <div class="col-3 text-warning">
                  	${director}
                      </div>
                      <div class="col" style="font-size: 0.75em;">
                            ${asstcalendar[director][0]}
                      </div>
                      <div class="col" style="font-size: 0.75em;">
                            ${asstcalendar[director][1]}
                      </div>
                      <div class="col" style="font-size: 0.75em;">
                            ${asstcalendar[director][2]}
                      </div>
                      <div class="col" style="font-size: 0.75em;">
                            ${asstcalendar[director][3]}
                      </div>
                       <div class="col" style="font-size: 0.75em;">
                            ${asstcalendar[director][4]}
                      </div>
                       <div class="col" style="font-size: 0.75em;">
                            ${asstcalendar[director][5]}
                      </div>
                      <div class="col" style="font-size: 0.75em;">
                            ${asstcalendar[director][6]}
                      </div>
                    </div>`;
                            if (doShade)
                            {
                                doShade = false;
                            } else {
                                doShade = true;
                            }
                        }
                    }

                    innercontent.innerHTML += stuff;

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
            processDirectors(body, true);
            io.socket.post('/directors/get-hours', {}, function serverResponded(body, JWR) {
                try {
                    processDirectorHours(body, true);
                } catch (e) {
                    console.error(e);
                    console.log('FAILED DIRECTOR CONNECTION');
                    setTimeout(directorSocket, 10000);
                }
            });
        } catch (e) {
            console.error(e);
            console.log('FAILED DIRECTORS CONNECTION');
            setTimeout(directorSocket, 10000);
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

// Replace all Status data with that of body request
function weeklyDJSocket()
{
    console.log('attempting weeklyDJ socket');
    io.socket.post('/analytics/weekly-dj', function serverResponded(body, JWR) {
        try {
            processWeeklyStats(body);
        } catch (e) {
            console.error(e);
            console.log('FAILED WEEKLYDJ CONNECTION');
            setTimeout(weeklyDJSocket, 10000);
        }
    });
}

function announcementsSocket()
{
    try {
        Announcements = TAFFY();
        io.socket.post('/announcements/get', {type: 'display-internal'}, function serverResponded(body, JWR) {
            Announcements.insert(body);
        });
        io.socket.post('/announcements/get', {type: 'display-internal-sticky'}, function serverResponded(body, JWR) {
            Announcements.insert(body);
        });
    } catch (e) {
        console.error(e);
        console.log('FAILED ANNOUNCEMENTS CONNECTION');
        setTimeout(announcementsSocket, 10000);
    }
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

        // Only do sticky slides when there are sticky slides
        if (stickySlides && slide < 1000)
            slide = 1000;

        // Do slides if we are not to be in power saving mode
        if (typeof Meta.state === 'undefined' || ((moment().isAfter(moment({hour: 8, minute: 0})) && (moment().isBefore(moment({hour: 22, minute: 0})))) || !Meta.state.startsWith("automation_") || directorpresent || Meta.state === 'automation_live' || Meta.state === 'automation_sports' || Meta.state === 'automation_remote' || Meta.state === 'automation_sportsremote'))
        {
            slidebadges.innerHTML = ``;
            // Determine highest slide number so we know when we are done
            var highestslide = 0;
            for (var key in slides) {
                if (slides.hasOwnProperty(key)) {
                    if (slides[key].do && (!stickySlides || key >= 1000))
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
                    if (!restarted)
                    {
                        processAnnouncements();
                        slide = 1;
                        if (stickySlides)
                            slide = 1000;
                        restarted = true;
                    } else { // We have a problem if we reach this point! Trigger marquee screensaver as failsafe
                        slide = 0;
                    }
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
                } else if (typeof slides[slide] !== 'undefined' && slides[slide].do && (!stickySlides || slide >= 1000))
                {
                    if (slide !== prevslide && !same)
                    {
                        done = true;
                        if (restarted)
                            generateBG();
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
                        slidetimer = setTimeout(doSlide, 14000);
                    }
                    var temp = document.getElementById(`slidebadge-${slide}`);
                    if (temp !== null)
                        temp.className = `m-1 btn btn-${slides[slide].class} btn-sm`;
                } else {
                    slide += 1;
                }
            }

            background.style.display = "inline";


            // Power saving slide
        } else {
            slidetimer = setTimeout(doSlide, 14000);
            slidebadges.innerHTML = ``;
            background.style.display = "none";
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

function processAnnouncements() {
    // Define a comparison function that will order announcements by createdAt
    var compare = function (a, b) {
        try {
            if (moment(a.createdAt).valueOf() < moment(b.createdAt).valueOf())
                return 1;
            if (moment(a.createdAt).valueOf() > moment(b.createdAt).valueOf())
                return -1;
            if (a.ID < b.ID)
                return -1;
            if (a.ID > b.ID)
                return 1;
            return 0;
        } catch (e) {
            console.error(e);
            iziToast.show({
                title: 'An error occurred - Please check the logs',
                message: `Error occurred in the compare function of processAnnouncements call.`
            });
        }
    };

    // Process non-sticky announcements first
    var tempslide = 100;

    // Remove all slides with announcements so as to refresh them
    for (var i = 100; i < 2000; i++)
    {
        if (typeof slides[i] !== 'undefined')
            delete slides[i];
    }

    Announcements({type: 'display-internal'}).get().sort(compare)
            .filter(announcement => moment(Meta.time).isSameOrAfter(moment(announcement.starts)) && moment(Meta.time).isBefore(moment(announcement.expires)))
            .map(announcement =>
            {
                slides[tempslide] = {name: announcement.title, class: announcement.level, do: true, function: function () {
                        $('#slide').animateCss('slideOutUp', function () {
                            content.innerHTML = `<div class="animated fadeIn" id="scale-wrapper">
            <div style="overflow-y: hidden; overflow-x: hidden; font-size: 4em; color: #ffffff; text-align: left;" class="container-full p-2 m-1 scale-content text-white" id="scaled-content"><h1 style="text-align: center; font-size: 2em; color: #FFFFFF">${announcement.title}</h1>${announcement.announcement}</div></div>`;

                            var pageWidth, pageHeight;

                            var basePage = {
                                width: 1600,
                                height: 900,
                                scale: 1,
                                scaleX: 1,
                                scaleY: 1
                            };

                            $(function () {
                                var $page = $('.scale-content');

                                getPageSize();
                                scalePages($page, pageWidth, pageHeight);

                                window.requestAnimationFrame(function () {
                                    getPageSize();
                                    scalePages($page, pageWidth, pageHeight);
                                });


                                function getPageSize() {
                                    pageHeight = $('#scale-wrapper').height();
                                    pageWidth = $('#scale-wrapper').width();
                                }

                                function scalePages(page, maxWidth, maxHeight) {
                                    page.attr("width", `${(($('#scaled-content').height() / maxHeight) * 70)}%`);
                                    var scaleX = 1, scaleY = 1;
                                    scaleX = (maxWidth / $('#scaled-content').width()) * 0.95;
                                    scaleY = (maxHeight / $('#scaled-content').height()) * 0.80;
                                    basePage.scaleX = scaleX;
                                    basePage.scaleY = scaleY;
                                    basePage.scale = (scaleX > scaleY) ? scaleY : scaleX;

                                    var newLeftPos = Math.abs(Math.floor((($('#scaled-content').width() * basePage.scale) - maxWidth) / 2));
                                    var newTopPos = Math.abs(Math.floor((($('#scaled-content').height() * basePage.scale) - maxHeight) / 2));

                                    page.attr('style', '-webkit-transform:scale(' + basePage.scale + ');left:' + newLeftPos + 'px;top:0px;');
                                }
                            });

                            slidetimer = setTimeout(doSlide, 14000);

                        });
                    }};

                tempslide++;
            });
    tempslide = 1000;
    stickySlides = false;
    Announcements({type: 'display-internal-sticky'}).get().sort(compare)
            .filter(announcement => moment(Meta.time).isSameOrAfter(moment(announcement.starts)) && moment(Meta.time).isBefore(moment(announcement.expires)))
            .map(announcement =>
            {
                stickySlides = true;

                slides[tempslide] = {name: announcement.title, class: announcement.level, do: true, function: function () {
                        $('#slide').animateCss('slideOutUp', function () {
                            content.innerHTML = `<div class="animated fadeIn scaleable-wrapper" id="scale-wrapper">
            <div style="overflow-y: hidden; overflow-x: hidden; font-size: 4em; color: #ffffff; text-align: left;" class="container-full p-2 m-1 scale-content text-white" id="scaled-content"><h1 style="text-align: center; font-size: 2em; color: #FFFFFF">${announcement.title}</h1>${announcement.announcement}</div></div>`;

                            var pageWidth, pageHeight;

                            var basePage = {
                                width: 1600,
                                height: 900,
                                scale: 1,
                                scaleX: 1,
                                scaleY: 1
                            };

                            $(function () {
                                var $page = $('.scale-content');

                                getPageSize();
                                scalePages($page, pageWidth, pageHeight);

                                window.requestAnimationFrame(function () {
                                    getPageSize();
                                    scalePages($page, pageWidth, pageHeight);
                                });


                                function getPageSize() {
                                    pageHeight = $('#scale-wrapper').height();
                                    pageWidth = $('#scale-wrapper').width();
                                }

                                function scalePages(page, maxWidth, maxHeight) {
                                    page.attr("width", `${(($('#scaled-content').height() / maxHeight) * 70)}%`);
                                    var scaleX = 1, scaleY = 1;
                                    scaleX = (maxWidth / $('#scaled-content').width()) * 0.95;
                                    scaleY = (maxHeight / $('#scaled-content').height()) * 0.80;
                                    basePage.scaleX = scaleX;
                                    basePage.scaleY = scaleY;
                                    basePage.scale = (scaleX > scaleY) ? scaleY : scaleX;

                                    var newLeftPos = Math.abs(Math.floor((($('#scaled-content').width() * basePage.scale) - maxWidth) / 2));
                                    var newTopPos = Math.abs(Math.floor((($('#scaled-content').height() * basePage.scale) - maxHeight) / 2));

                                    page.attr('style', '-webkit-transform:scale(' + basePage.scale + ');left:' + newLeftPos + 'px;top:0px;');
                                }
                            });

                            slidetimer = setTimeout(doSlide, 14000);

                        });
                    }};

                tempslide++;
            });
}

function processWeeklyStats(data) {
    slides[5] = {name: 'Weekly Stats', class: 'success', do: true, function: function () {
            $('#slide').animateCss('lightSpeedOut', function () {
                content.innerHTML = `<div class="animated fadeInDown"><h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Analytics last 7 days</h1>
            <div style="overflow-y: hidden; overflow-x: hidden; font-size: 1.5em;" class="container-full p-2 m-1 text-white scale-content" id="analytics">
                <p><strong class="ql-size-large">Highest online listener to showtime ratio:</strong></p>
                <ol><li><strong class="ql-size-large" style="color: rgb(255, 235, 204);">${data.topShows[0] ? data.topShows[0] : 'Unknown'}</strong></li><li>${data.topShows[1] ? data.topShows[1] : 'Unknown'}</li><li>${data.topShows[2] ? data.topShows[2] : 'Unknown'}</li></ol>
                <p><span style="color: rgb(204, 232, 232);">Top Genre: ${data.topGenre}</span></p><p><span style="color: rgb(204, 232, 232);">Top Playlist: ${data.topPlaylist}</span></p>
                <p><span style="color: rgb(204, 232, 204);">OnAir programming: ${Math.round(((data.onAir / 60) / 24) * 1000) / 1000} days (${Math.round((data.onAir / (60 * 24 * 7)) * 1000) / 10}% of the week)</span></p><p><span style="color: rgb(204, 232, 204);">Online listenership during OnAir programming: ${Math.round(((data.onAirListeners / 60) / 24) * 1000) / 1000} days</span></p><p><span style="color: rgb(235, 214, 255);">Tracks liked on website: ${data.tracksLiked}</span></p><p><span style="color: rgb(204, 224, 245);">Messages sent to/from website visitors: ${data.webMessagesExchanged}</span></p><p><span style="color: rgb(255, 255, 204);">Track requests placed: ${data.tracksRequested}</span></p>
            </div></div>`;

                slidetimer = setTimeout(doSlide, 14000);
            });
        }};
}