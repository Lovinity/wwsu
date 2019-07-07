/* global io, moment, Infinity, iziToast, responsiveVoice, jdenticon, Slides */

try {
    // Define default slide templates
    // Directors
    // DEPRECATED
    Slides.newSlide({
        name: `directors`,
        label: `Directors`,
        weight: 1000000,
        isSticky: false,
        color: `primary`,
        active: false,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 5,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Directors</h1><div style="overflow-y: hidden;" class="d-flex flex-wrap" id="directors"></div>`
    });

    // Director hours
    Slides.newSlide({
        name: `hours-directors`,
        label: `Directors`,
        weight: 999999,
        isSticky: false,
        color: `success`,
        active: true,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 5,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Directors</h1><div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1" id="office-hours-directors"></div><p class="p-2 m-2 text-white"><span class="m-3"><i class="fas fa-edit m-1"></i>: Changed office hours.</span> <span class="m-3"><i class="fas fa-ban m-1"></i>: Canceled office hours.</span></p>`
    });

    // Assistant Director hours
    Slides.newSlide({
        name: `hours-assistants`,
        label: `Assistants`,
        weight: 999998,
        isSticky: false,
        color: `success`,
        active: true,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 5,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Assistant Directors</h1><div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1" id="office-hours-assistants"></div><p class="p-2 m-2 text-white"><span class="m-3"><i class="fas fa-edit m-1"></i>: Changed office hours.</span> <span class="m-3"><i class="fas fa-ban m-1"></i>: Canceled office hours.</span></p>`
    });

    // Weekly Stats
    // DEPRECATED; TODO: Move to public sign
    Slides.newSlide({
        name: `weekly-stats`,
        label: `Weekly Stats`,
        weight: 900000,
        isSticky: false,
        color: `success`,
        active: false,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 15,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Analytics last 7 days</h1><div style="overflow-y: hidden; overflow-x: hidden; font-size: 1.5em;" class="container-full p-2 m-1 text-white scale-content" id="analytics"></div>`
    });

    // System Status
    Slides.newSlide({
        name: `system`,
        label: `System`,
        weight: -1000000,
        isSticky: false,
        color: `danger`,
        active: false,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 15,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">System Status</h1><div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1" id="system-status"></div>`
    });

    Slides.newSlide({
        name: `director-clockout`,
        label: `Director Auto Clock Out`,
        weight: 800000,
        isSticky: true,
        color: `danger`,
        active: false,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 60,
        fitContent: true,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Automatic Director Clockout at Midnight</h1><span style="color: #FFFFFF;">All directors who are still clocked in must clock out before midnight.<br>Otherwise, the system will automatically clock you out and flag your timesheet.<br>If you are still doing hours, you can clock back in after midnight.</span>`
    });

// Define data variables
    var Directors = new WWSUdb(TAFFY());
    var Directorhours = new WWSUdb(TAFFY());
    var Announcements = new WWSUdb(TAFFY());
    var Meta = {time: moment().toISOString()};
    var Status = new WWSUdb(TAFFY());

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
    var lastBurnIn = null;
    var prevStatus = 5;
    var stickySlides = false;
    var offlineTimer;
    var clockTimer;
    var globalStatus = 4;
    var noReq;
    var officeHoursTimer;
    var directorNotify;

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
            window.requestAnimationFrame(() => {
                waitFor(check, callback, count);
            });
        } else {
        }
    } else {
        callback();
}
}

// Wait for the socket to be connected before defining event handlers
waitFor(() => {
    return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && io.socket.isConnected());
}, () => {

    // Define a host requester
    noReq = new WWSUreq(io.socket, `display-internal`);

    // Assign socket events to data classes
    Directors.assignSocketEvent('directors', io.socket);
    Directorhours.assignSocketEvent('directorhours', io.socket);
    Announcements.assignSocketEvent('announcements', io.socket);
    Status.assignSocketEvent('status', io.socket);

    // Do stuff when status changes are made
    Status.setOnUpdate((data, db) => processStatus(db));
    Status.setOnInsert((data, db) => processStatus(db));
    Status.setOnRemove((data, db) => processStatus(db));
    Status.setOnReplace((db) => processStatus(db));

    Directors.setOnUpdate((data, db) => {
        clearTimeout(officeHoursTimer);
        officeHoursTimer = setTimeout(() => {
            processDirectors(Directors.db(), Directorhours.db());
        }, 5000);
    });
    Directors.setOnInsert((data, db) => {
        clearTimeout(officeHoursTimer);
        officeHoursTimer = setTimeout(() => {
            processDirectors(Directors.db(), Directorhours.db());
        }, 5000);
    });
    Directors.setOnRemove((data, db) => {
        clearTimeout(officeHoursTimer);
        officeHoursTimer = setTimeout(() => {
            processDirectors(Directors.db(), Directorhours.db());
        }, 5000);
    });
    Directors.setOnReplace((db) => {
        clearTimeout(officeHoursTimer);
        officeHoursTimer = setTimeout(() => {
            processDirectors(Directors.db(), Directorhours.db());
        }, 5000);
    });

    Directorhours.setOnUpdate((data, db) => {
        clearTimeout(officeHoursTimer);
        officeHoursTimer = setTimeout(() => {
            processDirectors(Directors.db(), Directorhours.db());
        }, 5000);
    });
    Directorhours.setOnInsert((data, db) => {
        clearTimeout(officeHoursTimer);
        officeHoursTimer = setTimeout(() => {
            processDirectors(Directors.db(), Directorhours.db());
        }, 5000);
    });
    Directorhours.setOnRemove((data, db) => {
        clearTimeout(officeHoursTimer);
        officeHoursTimer = setTimeout(() => {
            processDirectors(Directors.db(), Directorhours.db());
        }, 5000);
    });
    Directorhours.setOnReplace((db) => {
        clearTimeout(officeHoursTimer);
        officeHoursTimer = setTimeout(() => {
            processDirectors(Directors.db(), Directorhours.db());
        }, 5000);
    });

    // Do stuff when announcements changes are made
    Announcements.setOnUpdate((data, db) => {
        Slides.removeSlide(`attn-${data.ID}`);
        createAnnouncement(data);
    });
    Announcements.setOnInsert((data, db) => createAnnouncement(data));
    Announcements.setOnRemove((data, db) => Slides.removeSlide(`attn-${data}`));
    Announcements.setOnReplace((db) => {
        console.dir(db.get());
        // Remove all announcement slides
        Slides.allSlides()
                .filter((slide) => slide.name.startsWith(`attn-`))
                .map((slide) => Slides.removeSlide(slide.name));

        // Add slides for each announcement
        db.each((data) => createAnnouncement(data));
    });

    // Assign additional event handlers
    io.socket.on('display-refresh', function (data) {
        // Reload the display sign when this event is called
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
                        processStatus(Status.db());

                    if (key === 'time')
                    {
                        clearInterval(clockTimer);
                        clearTimeout(clockTimer);
                        clockTimer = setInterval(clockTick, 1000);
                    }

                    if (key === 'trackID')
                    {
                        // April Fool's
                        if (parseInt(data[key]) >= 74255 && parseInt(data[key]) <= 74259)
                        {
                            setTimeout(() => {
                                iziToast.show({
                                    title: '',
                                    message: `<img src="../../images/giphy.gif">`,
                                    timeout: 25000,
                                    close: true,
                                    color: 'blue',
                                    drag: false,
                                    position: 'center',
                                    closeOnClick: true,
                                    pauseOnHover: false,
                                    overlay: true,
                                    zindex: 250,
                                    layout: 2,
                                    image: ``,
                                    maxWidth: 480
                                });
                            }, 9500);
                        }
                    }
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

    // Update weekly analytics
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
            processStatus(Status.db());
        }
    });
});

function clockTick() {
    Meta.time = moment(Meta.time).add(1, 'seconds');
    if (moment(Meta.time).hour() === 23 && moment(Meta.time).minute() >= 55)
    {
        if (!directorNotify)
        {
            directorNotify = true;
            var directorMentions = [];
            Directors.db({present: true}).each((director) => {
                directorMentions.push(director.name);
            });
            Slides.slide(`director-clockout`).active = true;
            responsiveVoice.speak(`Attention all directors! Attention all directors! It is almost midnight. Any director who is still clocked in needs to clock out before midnight, and re-clock in after midnight. Guests in the lobby, please inform any directors still in the office about this. The following directors, if any, are still clocked in and need to clock out now: ${directorMentions.join(", ")}.`);
        }
    } else if (directorNotify) {
        Slides.slide(`director-clockout`).active = false;
        directorNotify = false;
    }
}

// Define data-specific functions
// Run through operations of each WWSU status
function processStatus(db)
{
    try {
        var doRow = false;
        var secondRow = false;
        globalStatus = 4;
        statusMarquee = `<div class="row bg-dark-1">
                      <div class="col-2 text-warning">
                  	<strong>System</strong>
                      </div>
                      <div class="col text-white">
                  	<strong>Status</strong>
                      </div>
                      <div class="col-2 text-warning">
                  	<strong>System</strong>
                      </div>
                      <div class="col text-white">
                  	<strong>Status</strong>
                      </div>
                    </div><div class="row ${secondRow ? `bg-dark-3` : `bg-dark-2`}">`;


        db.each(function (thestatus) {
            try {
                if (doRow)
                {
                    if (!secondRow)
                    {
                        secondRow = true;
                    } else {
                        secondRow = false;
                    }
                    statusMarquee += `</div><div class="row ${secondRow ? `bg-dark-3` : `bg-dark-2`}">`;
                    doRow = false;
                } else {
                    doRow = true;
                }

                switch (thestatus.status)
                {
                    case 1:
                        statusMarquee += `<div class="col-2">
                  	<span class="m-1 badge badge-danger">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>CRITICAL</strong>: ${thestatus.data}
                      </div>`;
                        if (globalStatus > 1)
                            globalStatus = 1;
                        break;
                    case 2:
                        statusMarquee += `<div class="col-2">
                  	<span class="m-1 badge badge-urgent">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>Urgent</strong>: ${thestatus.data}
                      </div>`;
                        if (globalStatus > 2)
                            globalStatus = 2;
                        break;
                    case 3:
                        statusMarquee += `<div class="col-2">
                  	<span class="m-1 badge badge-warning">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>Warning</strong>: ${thestatus.data}
                      </div>`;
                        if (globalStatus > 3)
                            globalStatus = 3;
                        break;
                    case 4:
                        statusMarquee += `<div class="col-2">
                  	<span class="m-1 badge badge-secondary">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>Offline</strong>: ${thestatus.data}
                      </div>`;
                        break;
                    case 5:
                        statusMarquee += `<div class="col-2">
                  	<span class="m-1 badge badge-success">${thestatus.label}</span>
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
                statusLine.innerHTML = 'No connection to WWSU! The server might be offline and WWSU not functional';
                if (globalStatus !== prevStatus)
                    offlineTimer = setTimeout(function () {
                        responsiveVoice.speak("Attention! The display sign has been disconnected from the server for one minute. This could indicate a network problem, the server crashed, or the server is rebooting.");
                    }, 60000);
                // Flash screen for major outages every second
                flashInterval = setInterval(function () {
                    $("html, body").css("background-color", "#D32F2F");
                    setTimeout(function () {
                        $("html, body").css("background-color", "#000000");
                    }, 250);
                }, 1000);

                Slides.slide(`system`).isSticky = true;
                Slides.slide(`system`).active = true;
                break;
            case 1:
                color = 'rgba(244, 67, 54, 0.5)';
                statusLine.innerHTML = 'WWSU is critically unstable and is not functioning properly!';
                clearTimeout(offlineTimer);
                if (globalStatus !== prevStatus)
                    responsiveVoice.speak("Warning! Warning! The WWSU system is in a critically unstable state. Please review the display sign and take action immediately to fix the problems.");
                // Flash screen for major outages every second
                flashInterval = setInterval(function () {
                    $("html, body").css("background-color", "#D32F2F");
                    setTimeout(function () {
                        $("html, body").css("background-color", "#000000");
                    }, 250);
                }, 1000);

                Slides.slide(`system`).isSticky = true;
                Slides.slide(`system`).active = true;
                break;
            case 2:
                color = 'rgba(245, 124, 0, 0.5)';
                statusLine.innerHTML = 'WWSU is experiencing issues that may impact operation';
                clearTimeout(offlineTimer);
                if (globalStatus !== prevStatus)
                    responsiveVoice.speak("Attention! The WWSU system is encountering issues at this time that need addressed.");
                // Flash screen for partial outages every 5 seconds
                // Flash screen for major outages every second
                flashInterval = setInterval(function () {
                    $("html, body").css("background-color", "#FF9800");
                    setTimeout(function () {
                        $("html, body").css("background-color", "#000000");
                    }, 250);
                }, 5000);

                Slides.slide(`system`).isSticky = false;
                Slides.slide(`system`).active = true;
                break;
            case 3:
                statusLine.innerHTML = 'WWSU is experiencing minor issues';
                clearTimeout(offlineTimer);
                color = 'rgba(251, 192, 45, 0.5)';

                Slides.slide(`system`).isSticky = false;
                Slides.slide(`system`).active = true;
                break;
            case 5:
                statusLine.innerHTML = 'WWSU is operational';
                clearTimeout(offlineTimer);
                color = 'rgba(76, 175, 80, 0.5)';
                Slides.slide(`system`).active = false;
                Slides.slide(`system`).isSticky = false;
                break;
            default:
                statusLine.innerHTML = 'WWSU status is unknown';
                color = 'rgba(158, 158, 158, 0.3)';
                Slides.slide(`system`).active = false;
                Slides.slide(`system`).isSticky = false;
        }

        prevStatus = globalStatus;

        status.style.backgroundColor = color;
        status.style.color = 'rgba(255, 255, 255, 1)';
        statusLine.style.color = 'rgba(255, 255, 255, 1)';

        // Update status html
        var innercontent = document.getElementById('system-status');
        if (innercontent)
            innercontent.innerHTML = statusMarquee;

    } catch (e) {
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the call of Status[0].'
        });
        console.error(e);
    }
}

// Mark if a director is present or not
function processDirectors(ddb, hdb)
{
    try {
        directorpresent = false;
        var directors = {};

        // Update directors html
        var innercontent = document.getElementById('directors');
        if (innercontent)
            innercontent.innerHTML = '';

        Slides.slide(`directors`).displayTime = 5;

        ddb.each(function (dodo) {
            try {
                directors[dodo.name] = dodo;
                if (dodo.present)
                    directorpresent = true;
                Slides.slide(`directors`).displayTime += 1;
                var color = 'rgba(211, 47, 47, 0.8)';
                var text1 = 'OUT';
                var theClass = 'danger';
                if (dodo.present)
                {
                    var color = 'rgba(56, 142, 60, 0.8)';
                    var text1 = 'IN';
                    var theClass = 'success';
                }
                if (innercontent)
                    innercontent.innerHTML += `<div style="width: 132px; position: relative; background-color: ${color}" class="m-2 text-white rounded shadow-8">
    <div class="p-1 text-center" style="width: 100%;">${dodo.avatar !== null && dodo.avatar !== '' ? `<img src="${dodo.avatar}" width="64" class="rounded-circle">` : jdenticon.toSvg(`Director ${dodo.name}`, 64)}</div>
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
        hdb.get()
                .filter(event => !moment(event.start).isAfter(moment(Meta.time).add(7, 'days').startOf('day')))
                .sort(compare)
                .map(event =>
                {
                    var temp = directors[event.director];
                    
                    // No temp record? Exit immediately.
                    if (typeof temp === `undefined`)
                        return null;
                    
                    if (typeof temp.assistant !== 'undefined')
                    {
                        var assistant = temp.assistant;
                    } else {
                        var assistant = true;
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
                        var bg;
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
                            event.startT = moment(event.start).minutes() === 0 ? moment(event.start).format('h') : moment(event.start).format('h:mm');
                            if ((moment(event.start).hours() < 12 && moment(event.end).hours() >= 12) || (moment(event.start).hours() >= 12) && moment(event.end).hours() < 12)
                                event.startT += moment(event.start).format('A');
                            event.endT = moment(event.end).minutes() === 0 ? moment(event.end).format('hA') : moment(event.end).format('h:mmA');

                            // Update strings if need be, if say, start time was before this day, or end time is after this day.
                            if (moment(event.end).isAfter(moment(Meta.time).startOf('day').add(i + 1, 'days')))
                            {
                                event.endT = moment(event.end).format('MM/DD h:mmA');
                            }
                            if (moment(event.start).isBefore(moment(Meta.time).add(i, 'days').startOf('day')))
                            {
                                event.startT = moment(event.start).format('MM/DD h:mmA');
                            }

                            var endText = `<span class="text-white">${event.startT} - ${event.endT}</span>`;
                            if (event.active === 2)
                            {
                                endText = `<span class="text-white">${event.startT} - ${event.endT}</span><i class="fas fa-edit m-1"></i>`;
                            }
                            if (event.active === -1)
                            {
                                endText = `<strike><span class="text-white">${event.startT} - ${event.endT}</span></strike><i class="fas fa-ban m-1"></i>`;
                            }

                            // Push the final products into our formatted variable
                            if (!assistant)
                                calendar[event.director][i] += `<div class="m-1 text-white" style="${bg ? bg : ``}">${endText}</div>`;
                            if (assistant)
                                asstcalendar[event.director][i] += `<div class="m-1 text-white" style="${bg ? bg : ``}">${endText}</div>`;
                        }
                    }
                });

        // Director hours slide
        var innercontent = document.getElementById('office-hours-directors');

        var stuff = `<div class="row shadow-2 bg-dark-1">
     <div class="col-3 text-info">
     <strong>Director</strong>
     </div>
     <div class="col text-info">
     <strong>Today</strong>
     </div>
     <div class="col text-info">
     <strong>${moment(Meta.time).add(1, 'days').format('ddd MM/DD')}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment(Meta.time).add(2, 'days').format('ddd MM/DD')}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment(Meta.time).add(3, 'days').format('ddd MM/DD')}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment(Meta.time).add(4, 'days').format('ddd MM/DD')}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment(Meta.time).add(5, 'days').format('ddd MM/DD')}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment(Meta.time).add(6, 'days').format('ddd MM/DD')}</strong>
     </div>
     </div>`;
        var doShade = false;
        var isActive = false;
        Slides.slide(`hours-directors`).displayTime = 7;
        for (var director in calendar)
        {
            if (calendar.hasOwnProperty(director))
            {
                isActive = true;
                var temp = directors[director] || null;
                Slides.slide(`hours-directors`).displayTime += 3;
                stuff += `<div class="row shadow-2 ${doShade ? `bg-dark-3` : `bg-dark-2`}">
     <div class="col-3 shadow-2" style="background-color: ${temp.present ? `rgba(56, 142, 60, 0.25)` : `rgba(211, 47, 47, 0.25)`};">
                <div class="container">
  <div class="row">
    <div class="col-4">
                ${temp.avatar && temp.avatar !== '' ? `<img src="${temp.avatar}" width="48" class="rounded-circle">` : jdenticon.toSvg(`Director ${director}`, 48)}
    </div>
    <div class="col-8">
      <span class="text-white">${director}</span><br />
      <span class="text-warning" style="font-size: 0.8em;">${temp.position}</span><br />
      ${temp.present ? `<span class="text-success"><strong>IN</strong></span>` : `<span class="text-danger"><strong>OUT</strong></span>`}
    </div>
  </div>
</div>
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
        
        Slides.slide(`hours-directors`).active = isActive;
        innercontent.innerHTML = stuff;

        // Assistant hours slide
        var innercontent = document.getElementById('office-hours-assistants');

        var stuff = `<div class="row shadow-2 bg-dark-1">
     <div class="col-3 text-info">
     <strong>Director</strong>
     </div>
     <div class="col text-info">
     <strong>Today</strong>
     </div>
     <div class="col text-info">
     <strong>${moment(Meta.time).add(1, 'days').format('ddd MM/DD')}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment(Meta.time).add(2, 'days').format('ddd MM/DD')}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment(Meta.time).add(3, 'days').format('ddd MM/DD')}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment(Meta.time).add(4, 'days').format('ddd MM/DD')}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment(Meta.time).add(5, 'days').format('ddd MM/DD')}</strong>
     </div>
     <div class="col text-info">
     <strong>${moment(Meta.time).add(6, 'days').format('ddd MM/DD')}</strong>
     </div>
     </div>`;
        var doShade = false;
        var isActive = false;
        Slides.slide(`hours-assistants`).displayTime = 7;
        for (var director in asstcalendar)
        {
            if (asstcalendar.hasOwnProperty(director))
            {
                isActive = true;
                var temp = directors[director] || null;
                Slides.slide(`hours-assistants`).displayTime += 3;
                stuff += `<div class="row shadow-2 ${doShade ? `bg-dark-3` : `bg-dark-2`}">
     <div class="col-3 shadow-2" style="background-color: ${temp.present ? `rgba(56, 142, 60, 0.25)` : `rgba(211, 47, 47, 0.25)`};">
                <div class="container">
  <div class="row">
    <div class="col-4">
                ${temp.avatar && temp.avatar !== '' ? `<img src="${temp.avatar}" width="48" class="rounded-circle">` : jdenticon.toSvg(`Director ${director}`, 48)}
    </div>
    <div class="col-8">
      <span class="text-white">${director}</span><br />
      <span class="text-warning" style="font-size: 0.8em;">${temp.position}</span><br />
      ${temp.present ? `<span class="text-success"><strong>IN</strong></span>` : `<span class="text-danger"><strong>OUT</strong></span>`}
    </div>
  </div>
</div>
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

        Slides.slide(`hours-assistants`).active = isActive;

        innercontent.innerHTML = stuff;
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
    noReq.request({method: 'POST', url: '/recipients/add-display', data: {host: 'display-internal'}}, function (body) {
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
    try {
        Directors.replaceData(noReq, '/directors/get');
        Directorhours.replaceData(noReq, '/directors/get-hours');
    } catch (e) {
        console.error(e);
        console.log('FAILED DIRECTORS CONNECTION');
        setTimeout(directorSocket, 10000);
    }
}

// Called to update all meta information with that of a body request
function metaSocket()
{
    console.log('attempting meta socket');
    noReq.request({method: 'POST', url: '/meta/get', data: {}}, function (body) {
        try {
            temp = body;
            for (var key in temp)
            {
                if (temp.hasOwnProperty(key))
                {
                    Meta[key] = temp[key];
                    if (key === 'time')
                    {
                        clearInterval(clockTimer);
                        clearTimeout(clockTimer);
                        clockTimer = setInterval(clockTick, 1000);
                        processStatus(Status.db());
                    }
                }
            }
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
    try {
        Status.replaceData(noReq, '/status/get');
    } catch (e) {
        console.error(e);
        console.log('FAILED STATUS CONNECTION');
        setTimeout(statusSocket, 10000);
    }
}

// Replace all Status data with that of body request
function weeklyDJSocket()
{
    console.log('attempting weeklyDJ socket');
    noReq.request({method: 'POST', url: '/analytics/weekly-dj', data: {}}, function (body) {
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
        var data = [];
        noReq.request({method: 'POST', url: '/announcements/get', data: {type: 'display-internal'}}, function (body) {
            data = data.concat(body);
            noReq.request({method: 'POST', url: '/announcements/get', data: {type: 'display-internal-sticky'}}, function (body) {
                data = data.concat(body);

                Announcements.query(data, true);
            });
        });
    } catch (e) {
        console.error(e);
        console.log('FAILED ANNOUNCEMENTS CONNECTION');
        setTimeout(announcementsSocket, 10000);
    }
}

function processWeeklyStats(data) {
    var temp = document.getElementById(`analytics`);
    if (temp !== null)
        temp.innerHTML = `<p style="text-shadow: 2px 4px 3px rgba(0,0,0,0.3);"><strong class="ql-size-large">Highest online listener to showtime ratio:</strong></p>
     <ol><li><strong class="ql-size-large" style="color: rgb(255, 235, 204); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">${data.topShows[0] ? data.topShows[0] : 'Unknown'}</strong></li><li>${data.topShows[1] ? data.topShows[1] : 'Unknown'}</li><li>${data.topShows[2] ? data.topShows[2] : 'Unknown'}</li></ol>
     <p><span style="color: rgb(204, 232, 232); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Top Genre: ${data.topGenre}</span></p><p><span style="color: rgb(204, 232, 232); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Top Playlist: ${data.topPlaylist}</span></p>
     <p><span style="color: rgb(204, 232, 204); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">OnAir programming: ${Math.round(((data.onAir / 60) / 24) * 1000) / 1000} days (${Math.round((data.onAir / (60 * 24 * 7)) * 1000) / 10}% of the week)</span></p><p><span style="color: rgb(204, 232, 204); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Online listenership during OnAir programming: ${Math.round(((data.onAirListeners / 60) / 24) * 1000) / 1000} days</span></p><p><span style="color: rgb(235, 214, 255); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Tracks liked on website: ${data.tracksLiked}</span></p><p><span style="color: rgb(204, 224, 245); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Messages sent to/from website visitors: ${data.webMessagesExchanged}</span></p><p><span style="color: rgb(255, 255, 204); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Track requests placed: ${data.tracksRequested}</span></p>`;
}

function createAnnouncement(data) {
    if (data.type.startsWith(`display-internal`))
    {
        Slides.newSlide({
            name: `attn-${data.ID}`,
            label: data.title,
            weight: 0,
            isSticky: data.type === `display-internal-sticky`,
            color: data.level,
            active: true,
            starts: moment(data.starts),
            expires: moment(data.expires),
            transitionIn: `fadeIn`,
            transitionOut: `fadeOut`,
            displayTime: data.displayTime || 15,
            fitContent: true,
            html: `<div style="overflow-y: hidden; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" class="text-white" id="content-attn-${data.ID}">${data.announcement}</div>`
        });
    }
}