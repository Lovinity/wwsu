/* global moment, ProgressBar, io, Infinity, iziToast */

try {

// Define hexrgb constants
    var hexChars = 'a-f\\d';
    var match3or4Hex = `#?[${hexChars}]{3}[${hexChars}]?`;
    var match6or8Hex = `#?[${hexChars}]{6}([${hexChars}]{2})?`;

    var nonHexChars = new RegExp(`[^#${hexChars}]`, 'gi');
    var validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, 'i');

// Define HTML elements
    var content = document.getElementById('slide');
    var nowplaying = document.getElementById('nowplaying');
    var nowplayingseek = document.getElementById('nowplaying-seek');
    var nowplayingtime = document.getElementById('nowplaying-time');
    var nowplayinglines = document.getElementById('nowplaying-lines');
    var nowplayingline1 = document.getElementById('nowplaying-line1');
    var nowplayingline2 = document.getElementById('nowplaying-line2');
    var slidebadges = document.getElementById('slide-badges');
    var noConnection = document.getElementById("no-connection");
    var background = document.getElementById("bg");
    var wrapper = document.getElementById("wrapper");
    var flashInterval = null;
// Define variables
    var disconnected = true;
    var slide = 1;
    var Meta = {time: moment().toISOString(true)};
    var Calendar = TAFFY();
// calendar is an array of arrays. calendar[0] contains an object of today's events {"label": [array of events]}. Calendar[1] contains an array of objects for days 2-4 (one object per day, {"label": [array of events]}), calendar[2] contains an array of objects for days 5-7 (one object per day, {"label": [array of events]}).
    var calendar = [{}, [{}, {}, {}], [{}, {}, {}]];
    var Directors = TAFFY();
    var directorpresent = false;
    var slidetimer = null;
    var prevline1 = '';
    var prevline2 = '';
    var prevstate = '';
    var npwait = false;
    var Eas = TAFFY();
    var newEas = [];
    var easActive = false;
    var easDelay = 5;
    var color3 = "#787878";
    var lastBurnIn = null;
    var easExtreme = false;

    wrapper.width = window.innerWidth;
    wrapper.height = window.innerHeight;

// Create restart function to restart the screen after 15 seconds if it does not connect.
    var restart = setTimeout(function () {
        window.location.reload(true);
    }, 15000);

    var afterSlide = function () {};

// Create a seek progress bar in the Meta box
    var bar = new ProgressBar.Line(nowplayingseek, {
        strokeWidth: 4,
        easing: 'easeInOut',
        duration: 1000,
        color: '#FFFFFF',
        trailColor: 'rgba(0, 0, 0, 0)',
        trailWidth: 1,
        svgStyle: {width: '100%', height: '100%'}
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

// Burnguard is the line that sweeps across the screen to prevent screen burn-in
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

    // lines is the periodic line marquee screensaver that also helps prevent burn-in
    var lines = new LinesJS({
        canvasId: 'wrapper',
        skipMin: 5,
        skipMax: 15,
        numLines: 30,
        timeInterval: 50
    });

    var colors = ['#FF0000', '#00FF00', '#0000FF'], Scolor = 0, delay = 300000, scrollDelay = 15000;
} catch (e) {
    console.error(e);
    iziToast.show({
        title: 'An error occurred - Please check the logs',
        message: 'Error occurred when setting up initial variables and/or burnguard.'
    });
}

function burnGuardAnimate()
{
    try {
        Scolor = ++Scolor % 3;
        var rColor = colors[Scolor];
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
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during burnGuardAnimate.'
        });
    }
}
setTimeout(burnGuardAnimate, 5000);

$.fn.extend({
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

// Process Director data when received by updating local database and marking if a director is present.
function processDirectors(data, replace = false)
{
    // Run data manipulation process
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

        // Check for present directors
        directorpresent = false;
        Directors().each(function (director) {
            try {
                if (key === 0)
                    return null;
                if (director.present)
                    directorpresent = true;
            } catch (e) {
                console.error(e);
                iziToast.show({
                    title: 'An error occurred - Please check the logs',
                    message: `Error occurred during Directors iteration in processDirectors.`
                });
            }
        });
    } catch (e) {
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the call of processDirectors.'
        });
}
}

// When new calendar data is received, update the information in memory.
function processCalendar(data, replace = false)
{
    try {

        // Run data processing
        if (replace)
        {
            Calendar = TAFFY();
            Calendar.insert(data);
            console.log(`Calendar Replace`);
            console.dir(Calendar);
        } else {
            for (var key in data)
            {
                if (data.hasOwnProperty(key))
                {
                    switch (key)
                    {
                        case 'insert':
                            Calendar.insert(data[key]);
                            break;
                        case 'update':
                            Calendar({ID: data[key].ID}).update(data[key]);
                            break;
                        case 'remove':
                            Calendar({ID: data[key]}).remove();
                            break;
                    }
                    console.log(`Calendar ${key}`);
                    console.dir(data[key]);
                }
            }
        }

        // Define a comparison function that will order calendar events by start time when we run the iteration
        var compare = function (a, b) {
            try {
                if (moment(a.start).valueOf() < moment(b.start).valueOf())
                    return -1;
                if (moment(a.start).valueOf() > moment(b.start).valueOf())
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
        calendar = [{}, [{}, {}, {}], [{}, {}, {}]];
        calendar[0][`Today ${moment(Meta.time).format('MM/DD')}`] = [];
        calendar[1][0][moment(Meta.time).add(1, 'days').format('dddd MM/DD')] = [];
        calendar[1][1][moment(Meta.time).add(2, 'days').format('dddd MM/DD')] = [];
        calendar[1][2][moment(Meta.time).add(3, 'days').format('dddd MM/DD')] = [];
        calendar[2][0][moment(Meta.time).add(4, 'days').format('dddd MM/DD')] = [];
        calendar[2][1][moment(Meta.time).add(5, 'days').format('dddd MM/DD')] = [];
        calendar[2][2][moment(Meta.time).add(6, 'days').format('dddd MM/DD')] = [];

        // Run through every event in memory, sorted by the comparison function, and add appropriate ones into our formatted calendar variable.
        Calendar().get().sort(compare).forEach(function (event)
        {
            try {
                // Do not show genre nor playlist events
                if (event.title.startsWith("Genre:") || event.title.startsWith("Playlist:"))
                    return null;

                // null start or end? Use a default to prevent errors.
                if (!moment(event.start).isValid())
                    event.start = moment(Meta.time).startOf('day');
                if (!moment(event.end).isValid())
                    event.end = moment(Meta.time).add(1, 'days').startOf('day');

                // Determine which day(s) of the week that this event belongs to, and add them in those days. Also, re-format startT and endT if necessary.
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
                            calendar[0][`Today ${moment(Meta.time).format('MM/DD')}`].push(event);
                        } else if (i > 0 && i < 4)
                        {
                            calendar[1][i - 1][moment(Meta.time).add(i, 'days').format('dddd MM/DD')].push(event);
                        } else if (i < 7)
                        {
                            calendar[2][i - 4][moment(Meta.time).add(i, 'days').format('dddd MM/DD')].push(event);
                        }
                    }
                }
            } catch (e) {
                console.error(e);
                iziToast.show({
                    title: 'An error occurred - Please check the logs',
                    message: `Error occurred during calendar iteration in processCalendar.`
                });
            }
        });
    } catch (e) {
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the call of processCalendar.'
        });
}
}

// Check for new Eas alerts and push them out when necessary.
function processEas(data, replace = false)
{
    // Data processing
    try {
        var prev = [];
        if (replace)
        {
            // Get all the EAS IDs currently in memory before replacing the data
            prev = Eas().select("ID");

            Eas = TAFFY();
            Eas.insert(data);

            // Go through the new data. If any IDs exists that did not exist before, consider it a new alert.
            Eas().each(function (record)
            {
                if (prev.indexOf(record.ID) === -1)
                    newEas.push(record);
            });

        } else {
            for (var key in data)
            {
                if (data.hasOwnProperty(key))
                {
                    switch (key)
                    {
                        case 'insert':
                            Eas.insert(data[key]);
                            newEas.push(data[key]);
                            break;
                        case 'update':
                            Eas({ID: data[key].ID}).update(data[key]);
                            break;
                        case 'remove':
                            Eas({ID: data[key]}).remove();
                            break;
                    }
                }
            }
        }

        // Check to see if any alerts are extreme
        easExtreme = false;

        Eas().each(function (alert) {
            try {
                if (alert.severity === 'Extreme')
                    easExtreme = true;
            } catch (e) {
                console.error(e);
                iziToast.show({
                    title: 'An error occurred - Please check the logs',
                    message: `Error occurred during Eas iteration in processEas.`
                });
            }
        });

        // Do EAS events
        doEas();
    } catch (e) {
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the call of Eas[0].'
        });
}
}

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
    // When new Meta is received, update it in our memory and then run the process function.
    io.socket.on('meta', function (data) {
        try {
            for (var key in data)
            {
                if (data.hasOwnProperty(key))
                {
                    Meta[key] = data[key];
                }
            }
            processNowPlaying(data);
        } catch (e) {
            console.error(e);
            iziToast.show({
                title: 'An error occurred - Please check the logs',
                message: 'Error occurred during the meta event.'
            });
        }
    });

// On new calendar data, update our calendar memory and run the process function.
    io.socket.on('calendar', function (data) {
        processCalendar(data);
    });

// On new directors data, update our directors memory and run the process function.
    io.socket.on('directors', function (data) {
        processDirectors(data);
    });

// on messages, display message if event is an insert
    io.socket.on('messages', function (data) {
        for (var key in data)
        {
            if (data.hasOwnProperty(key) && key === 'insert')
            {
                iziToast.show({
                    title: 'DJ says',
                    message: data[key].message,
                    timeout: 60000,
                    backgroundColor: '#FFF59D',
                    color: '#FFF59D',
                    progressBarColor: '#FFF59D',
                    overlayColor: 'rgba(255, 255, 54, 0.1)',
                    closeOnClick: true,
                    titleSize: '2em',
                    messageSize: '1.5em',
                    balloon: true
                });
            }
        }
    });


    io.socket.on('connect', function () {
        onlineSocket();
        MetaSocket();
        eventSocket();
        directorSocket();
        easSocket();
        if (disconnected)
        {
            //noConnection.style.display = "none";
            disconnected = false;
            clearTimeout(restart);
        }
    });

    onlineSocket();
    MetaSocket();
    eventSocket();
    directorSocket();
    easSocket();
    if (disconnected)
    {
        //noConnection.style.display = "none";
        disconnected = false;
        clearTimeout(restart);
    }

    io.socket.on('disconnect', function () {
        console.log('Lost connection');
        try {
            io.socket._raw.io._reconnection = true;
            io.socket._raw.io._reconnectionAttempts = Infinity;
        } catch (e) {
            console.error(e);
            iziToast.show({
                title: 'An error occurred - Please check the logs',
                message: 'Error occurred trying to make socket reconnect indefinitely.'
            });
        }
        if (!disconnected)
        {
            //noConnection.style.display = "inline";
            disconnected = true;
            // process now playing so that it displays that we are disconnected.
            processNowPlaying(Meta);
            /*
             restart = setTimeout(function () {
             window.location.reload(true);
             }, 300000);
             */
        }
    });

// On new eas data, update our eas memory and run the process function.
    io.socket.on('eas', function (data) {
        processEas(data);
    });

    io.socket.on('display-refresh', function (data) {
        window.location.reload(true);
    });
});

function onlineSocket()
{
    console.log('attempting online socket');
    io.socket.post('/recipients/add-display', {host: 'display-public'}, function serverResponded(body, JWR) {
        try {
        } catch (e) {
            console.log('FAILED ONLINE CONNECTION');
            setTimeout(onlineSocket, 10000);
        }
    });
}

function easSocket()
{
    console.log('attempting eas socket');
    io.socket.post('/eas/get', {}, function serverResponded(body, JWR) {
        try {
            processEas(body, true);
        } catch (e) {
            console.log('FAILED CONNECTION');
            setTimeout(easSocket, 10000);
        }
    });
}

function MetaSocket()
{
    console.log('attempting Meta socket');
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
            processNowPlaying(temp);
        } catch (e) {
            console.log('FAILED CONNECTION');
            setTimeout(MetaSocket, 10000);
        }
    });
}

function eventSocket()
{
    console.log('attempting event socket');
    io.socket.post('/calendar/get', {}, function serverResponded(body, JWR) {
        try {
            processCalendar(body, true);
        } catch (e) {
            console.log(e);
            console.log('FAILED CONNECTION');
            setTimeout(eventSocket, 10000);
        }
    });
}

function directorSocket()
{
    console.log('attempting director socket');
    io.socket.post('/directors/get', {}, function serverResponded(body, JWR) {
        try {
            processDirectors(body, true);
        } catch (e) {
            console.log('FAILED CONNECTION');
            setTimeout(directorSocket, 10000);
        }
    });
}

// This function is called whenever a change in Eas alerts is detected, or when we are finished displaying an alert. It checks to see if we should display something Eas-related.
function doEas()
{
    try {
        // Display the new alert if conditions permit
        if ((newEas.length > 0 && !easActive))
        {
            // Stop slide timers
            clearTimeout(slidetimer);
            slidetimer = null;
            slidebadges.innerHTML = ``;
            // Make sure alert is valid
            if (typeof newEas[0] !== 'undefined')
            {
                easActive = true;

                // Stop marquee screensaver if it is running
                lines.stop();
                $('#wrapper').fadeOut(500, 'linear', function () {
                    lines.clear();
                    wrapper.style.display = "none";
                });
                var alert = (typeof newEas[0]['alert'] !== 'undefined') ? newEas[0]['alert'] : 'Unknown Alert';
                var text = (typeof newEas[0]['information'] !== 'undefined') ? newEas[0]['information'].replace(/[\r\n]+/g, ' ') : 'There was an error attempting to retrieve information about this alert. Please check the National Weather Service or your local civil authorities for details about this alert.';
                var color2 = (typeof newEas[0]['color'] !== 'undefined' && /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(newEas[0]['color'])) ? hexRgb(newEas[0]['color']) : hexRgb('#787878');
                var color3 = (typeof newEas[0]['color'] !== 'undefined' && /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(newEas[0]['color'])) ? hexRgb(newEas[0]['color']) : hexRgb('#787878');
                color3.red = Math.round(color3.red / 2);
                color3.green = Math.round(color3.green / 2);
                color3.blue = Math.round(color3.blue / 2);
                color3 = `rgb(${color3.red}, ${color3.green}, ${color3.blue})`;
                var color4 = (typeof newEas[0]['color'] !== 'undefined' && /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(newEas[0]['color'])) ? hexRgb(newEas[0]['color']) : hexRgb('#787878');
                color4.red = Math.round((color4.red / 2) + 127);
                color4.green = Math.round((color4.green / 2) + 127);
                color4.blue = Math.round((color4.blue / 2) + 127);
                color4 = `rgb(${color4.red}, ${color4.green}, ${color4.blue})`;
                content.innerHTML = `<div class="animated wobble" id="slide-interrupt-eas"><div style="text-align: center; color: #ffffff;">
                    <h1 style="font-size: 3em;">WWSU Emergency Alert System</h1>
                    <div class="m-3" style="color: ${color4}; font-size: 6em;">${alert}</div>
                    <div class="m-1 text-info-light" style="font-size: 2em;">${moment(newEas[0]['starts']).isValid() ? moment(newEas[0]['starts']).format("MM/DD h:mmA") : 'UNKNOWN'} - ${moment(newEas[0]['expires']).isValid() ? moment(newEas[0]['expires']).format("MM/DD h:mmA") : 'UNKNOWN'}</div>
                    <div class="m-1 text-warning-light" style="font-size: 2em;">Counties: ${(typeof newEas[0]['counties'] !== 'undefined') ? newEas[0]['counties'] : 'Unknown Counties'}</div>
                    <div id="alert-marquee" class="marquee m-3" style="color: #FFFFFF; background: rgba(${Math.round(color2.red / 2)}, ${Math.round(color2.green / 2)}, ${Math.round(color2.blue / 2)}, 0.5); font-size: 2.5em;">${text}</div>
                    </div></div>`;
                if (easExtreme)
                {
                    content.innerHTML += `<h2 style="text-align: center; font-size: 2em;" class="text-danger"><strong>Life-threatening alert(s) in effect!</strong> Please stand by...</h2>`;
                }
                $('#alert-marquee')
                        .bind('finished', function () {
                            try {
                                easActive = false;
                                var temp = document.getElementById('alert-marquee');
                                temp.innerHTML = '';
                                clearInterval(flashInterval);
                                doEas();
                            } catch (e) {
                                console.error(e);
                                iziToast.show({
                                    title: 'An error occurred - Please check the logs',
                                    message: `Error occurred in the finished bind of #alert-marquee in doEas.`
                                });
                            }
                        })
                        .marquee({
                            //duration in milliseconds of the marquee
                            speed: 180,
                            //gap in pixels between the tickers
                            gap: 50,
                            //time in milliseconds before the marquee will start animating
                            delayBeforeStart: 2000,
                            //'left' or 'right'
                            direction: 'left',
                            //true or false - should the marquee be duplicated to show an effect of continues flow
                            duplicated: false
                        });
                clearInterval(flashInterval);
                flashInterval = setInterval(function () {
                    $("html, body").animate({
                        backgroundColor: color3
                    }, 250, function () {
                        $("html, body").animate({
                            backgroundColor: "#000000"
                        }, 250);
                    });
                }, 1000);
                newEas.shift();
            } else {
                easActive = false;
                newEas.shift();
                doEas();
            }
            // If there is an extreme alert in effect, we want it to be permanently on the screen while it is in effect
        } else if (easExtreme && !easActive)
        {
            // Stop slide timers
            clearTimeout(slidetimer);
            slidetimer = null;
            slidebadges.innerHTML = ``;

            // Stop marquee screensaver if it is running
            lines.stop();
            $('#wrapper').fadeOut(500, 'linear', function () {
                lines.clear();
                wrapper.style.display = "none";
            });

            // Make background flash red every second
            clearInterval(flashInterval);
            flashInterval = setInterval(function () {
                $("html, body").animate({
                    backgroundColor: "#D50000"
                }, 250, function () {
                    $("html, body").animate({
                        backgroundColor: "#000000"
                    }, 250);
                });
            }, 1000);

            // Display the extreme alerts
            content.innerHTML = `<div id="slide-interrupt-eas">
            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">WWSU Emergency Alert System</h1>
            <h2 style="text-align: center; font-size: 3em;" class="text-warning">Extreme Alerts in effect</h2>
            <h2 style="text-align: center; font-size: 3em;" class="text-danger">SEEK SHELTER NOW!!!</h2>
            <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="alerts"></div></div>`;
            var innercontent = document.getElementById('alerts');
            Eas({severity: "Extreme"}).each(function (dodo) {
                try {
                    var color = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(dodo.color) ? hexRgb(dodo.color) : hexRgb('#787878');
                    var borderclass = 'black';
                    var alpha = 0.7;
                    borderclass = 'danger';
                    color = `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha});`;
                    innercontent.innerHTML += `<div style="width: 32%; background-color: ${color};" class="d-flex align-items-stretch m-1 text-white border border-${borderclass}">
                        <div class="m-1" style="text-align: center; width: 100%"><span style="font-size: 1.5em;">${(typeof dodo['alert'] !== 'undefined') ? dodo['alert'] : 'Unknown Alert'}</span><br />
                        <span style="font-size: 1em;" class="text-info-light">${moment(dodo['starts']).isValid() ? moment(dodo['starts']).format("MM/DD h:mmA") : 'UNKNOWN'} - ${moment(dodo['expires']).isValid() ? moment(dodo['expires']).format("MM/DD h:mmA") : 'UNKNOWN'}</span><br />
<span style="font-size: 1em;" class="text-warning-light">${(typeof dodo['counties'] !== 'undefined') ? dodo['counties'] : 'Unknown Counties'}</span><br />
                        </div>
                        `;
                } catch (e) {
                    console.error(e);
                    iziToast.show({
                        title: 'An error occurred - Please check the logs',
                        message: `Error occurred during Eas iteration in doEas.`
                    });
                }
            });
            // Resume regular slides when no extreme alerts are in effect anymore
        } else if (!easExtreme && !easActive && document.getElementById('slide-interrupt-eas') !== null)
        {
            doSlide(true);
        }
    } catch (e) {
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during doEas.'
        });
    }
}

// This function is called whenever meta is changed. The parameter response contains only the meta that has changed / to be updated.
function processNowPlaying(response)
{
    if (response)
    {
        try {
            // First, process now playing information
            var color = 'rgba(158, 158, 158, 0.3)';
            var progress = 50;
            var statebadge = '';
            easDelay -= 1;
            if (disconnected || typeof Meta.state === 'undefined')
            {
                statebadge = `<span class="badge badge-secondary">DISCONNECTED</span>`;
            } else if (Meta.state.startsWith("automation_"))
            {
                statebadge = `<span class="badge badge-primary">MUSIC</span>`;
                color = 'rgba(33, 150, 243, 0.5)';
            } else if (Meta.state.startsWith("live_"))
            {
                statebadge = `<span class="badge badge-danger">SHOW</span>`;
                color = 'rgba(244, 67, 54, 0.5)';
            } else if (Meta.state.startsWith("remote_"))
            {
                statebadge = `<span class="badge badge-purple">REMOTE</span>`;
                color = 'rgba(103, 58, 183, 0.5)';
            } else if (Meta.state.startsWith("sports_") || Meta.state.startsWith("sportsremote_"))
            {
                statebadge = `<span class="badge badge-success">SPORTS</span>`;
                color = 'rgba(76, 175, 80, 0.5)';
            }
            var queuelength = Math.round(Meta.queueLength);
            if (queuelength < 0)
                queuelength = 0;
            if (typeof response.line1 !== 'undefined')
            {
                $('#nowplaying-line1').animateCss('fadeOut', function () {
                    nowplayingline1.innerHTML = text_truncate(Meta.line1, 80);
                    $('#nowplaying-line1').animateCss('fadeIn');
                });
            }
            if (typeof response.line2 !== 'undefined')
            {
                $('#nowplaying-line2').animateCss('fadeOut', function () {
                    nowplayingline2.innerHTML = text_truncate(Meta.line2, 80);
                    $('#nowplaying-line2').animateCss('fadeIn');
                });
            }
            if ((moment(Meta.time).isAfter(moment({hour: 8, minute: 0})) && (moment(Meta.time).isBefore(moment({hour: 22, minute: 0})))) || !Meta.state.startsWith("automation_") || directorpresent || Meta.state === 'automation_live' || Meta.state === 'automation_sports' || Meta.state === 'automation_remote' || Meta.state === 'automation_sportsremote') {
                nowplaying.style.backgroundColor = color;
                nowplaying.style.color = 'rgba(255, 255, 255, 1)';
                nowplayinglines.style.color = 'rgba(255, 255, 255, 1)';
                nowplayingtime.style.color = 'rgba(255, 235, 59, 1)';
                bar.animate(Meta.percent);  // Number from 0.0 to 1.0
            } else {
                statebadge = '';
                nowplaying.style.backgroundColor = '#000000';
                nowplaying.style.color = 'rgba(255, 255, 255, 0.2)';
                nowplayingtime.style.color = 'rgba(255, 235, 59, 0.2)';
                nowplayinglines.style.color = 'rgba(255, 255, 255, 0.2)';
                bar.animate(0);
            }
            nowplayingtime.innerHTML = `<div class="d-flex align-items-stretch">
                        <div class="m-1" style="width: 15%;">${statebadge}</div>
                        <div class="container-fluid m-1" style="text-align: center;">${disconnected ? 'DISPLAY DISCONNECTED FROM WWSU' : moment(Meta.time).format('LLLL') || 'Unknown WWSU Time'}</div>
                        <div class="m-1" style="width: 15%;">${statebadge}</div>
                        </div>
                        `;
            if (easActive || easExtreme)
            {
                // Do nothing with slides if we are displaying anything Eas related

                // DJ about to go live and less than 60 seconds until they do so; display a big countdown
            } else if (Meta.state === 'automation_live' && queuelength < 60)
            {
                clearTimeout(slidetimer);
                slidetimer = null;
                slidebadges.innerHTML = ``;
                var countdown = document.getElementById('countdown');
                var countdowntext = document.getElementById('countdown-text');
                var countdownclock = document.getElementById('countdown-clock');
                if (!countdown || !countdowntext || !countdownclock)
                {
                    // Stop marquee screensaver if it is running
                    lines.stop();
                    $('#wrapper').fadeOut(500, 'linear', function () {
                        lines.clear();
                        wrapper.style.display = "none";
                    });
                    var temp = Meta.dj.split(" - ");
                    content.innerHTML = `<div class="animated flip" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em;" id="countdown-text"></h1>
                    <div class="m-3" style="color: #FFCDD2; font-size: 15em;" id="countdown-clock">?</div>
                    </div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-danger">${temp[0]}</span><br />is going live in`;
                }
                if (queuelength >= 15)
                {
                    countdownclock.style.color = "#FFCDD2";
                    countdownclock.innerHTML = queuelength;
                } else {
                    countdownclock.style.color = "#FFCDD2";
                    countdownclock.innerHTML = queuelength;
                    $("html, body").animate({
                        backgroundColor: "#F44336"
                    }, 250, function () {
                        $("html, body").animate({
                            backgroundColor: "#000000"
                        }, 250);
                    });
                }

                // When a remote broadcast is about to start
            } else if (Meta.state === 'automation_remote' && queuelength < 60)
            {
                clearTimeout(slidetimer);
                slidetimer = null;
                slidebadges.innerHTML = ``;
                var countdown = document.getElementById('countdown');
                var countdowntext = document.getElementById('countdown-text');
                var countdownclock = document.getElementById('countdown-clock');
                if (!countdown || !countdowntext || !countdownclock)
                {
                    // Stop marquee screensaver if it is running
                    lines.stop();
                    $('#wrapper').fadeOut(500, 'linear', function () {
                        lines.clear();
                        wrapper.style.display = "none";
                    });
                    content.innerHTML = `<div class="animated flip" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em;" id="countdown-text"></h1>
                    <div class="m-3" style="color: #FFCDD2; font-size: 15em;" id="countdown-clock">?</div>
                    </div>
                    </div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = "Remote Broadcast starting in";
                }
                if (queuelength >= 15)
                {
                    countdownclock.style.color = "#E1BEE7";
                    countdownclock.innerHTML = queuelength;
                } else {
                    countdownclock.style.color = "#E1BEE7";
                    countdownclock.innerHTML = queuelength;
                    $("html, body").animate({
                        backgroundColor: "#9C27B0"
                    }, 250, function () {
                        $("html, body").animate({
                            backgroundColor: "#000000"
                        }, 250);
                    });
                }
                // Sports broadcast about to begin
            } else if ((Meta.state === 'automation_sports' || Meta.state === 'automation_sportsremote') && queuelength < 60)
            {
                clearTimeout(slidetimer);
                slidetimer = null;
                slidebadges.innerHTML = ``;
                var countdown = document.getElementById('countdown');
                var countdowntext = document.getElementById('countdown-text');
                var countdownclock = document.getElementById('countdown-clock');
                if (!countdown || !countdowntext || !countdownclock)
                {
                    // Stop marquee screensaver if it is running
                    lines.stop();
                    $('#wrapper').fadeOut(500, 'linear', function () {
                        lines.clear();
                        wrapper.style.display = "none";
                    });
                    content.innerHTML = `<div class="animated flip" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em;" id="countdown-text"></h1>
                    <div class="m-3" style="color: #FFCDD2; font-size: 15em;" id="countdown-clock">?</div>
                    </div>
                    </div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-success">${Meta.dj}</span><br />about to broadcast in`;
                }
                if (queuelength >= 15)
                {
                    countdownclock.style.color = "#C8E6C9";
                    countdownclock.innerHTML = queuelength;
                } else {
                    countdownclock.style.color = "#C8E6C9";
                    countdownclock.innerHTML = queuelength;
                    $("html, body").animate({
                        backgroundColor: "#4CAF50"
                    }, 250, function () {
                        $("html, body").animate({
                            backgroundColor: "#000000"
                        }, 250);
                    });
                }
                // DJ is returning from a break
            } else if (Meta.state === 'live_returning' && queuelength < 60)
            {
                clearTimeout(slidetimer);
                slidetimer = null;
                slidebadges.innerHTML = ``;
                var countdown = document.getElementById('countdown');
                var countdowntext = document.getElementById('countdown-text');
                var countdownclock = document.getElementById('countdown-clock');
                if (!countdown || !countdowntext || !countdownclock)
                {
                    // Stop marquee screensaver if it is running
                    lines.stop();
                    $('#wrapper').fadeOut(500, 'linear', function () {
                        lines.clear();
                        wrapper.style.display = "none";
                    });
                    var temp = Meta.dj.split(" - ");
                    content.innerHTML = `<div class="animated flip" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em;" id="countdown-text"></h1>
                    <div class="m-3" style="color: #FFCDD2; font-size: 15em;" id="countdown-clock">?</div>
                    </div>
                    </div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-danger">${temp[0]}</span><br />is returning live in`;
                }
                if (queuelength >= 15)
                {
                    countdownclock.style.color = "#FFCDD2";
                    countdownclock.innerHTML = queuelength;
                } else {
                    countdownclock.style.color = "#FFCDD2";
                    countdownclock.innerHTML = queuelength;
                    $("html, body").animate({
                        backgroundColor: "#F44336"
                    }, 250, function () {
                        $("html, body").animate({
                            backgroundColor: "#000000"
                        }, 250);
                    });
                }
                // Remote broadcast is returning from a break
            } else if (Meta.state === 'remote_returning' && queuelength < 60)
            {
                clearTimeout(slidetimer);
                slidetimer = null;
                slidebadges.innerHTML = ``;
                var countdown = document.getElementById('countdown');
                var countdowntext = document.getElementById('countdown-text');
                var countdownclock = document.getElementById('countdown-clock');
                if (!countdown || !countdowntext || !countdownclock)
                {
                    // Stop marquee screensaver if it is running
                    lines.stop();
                    $('#wrapper').fadeOut(500, 'linear', function () {
                        lines.clear();
                        wrapper.style.display = "none";
                    });
                    content.innerHTML = `<div class="animated flip" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em;" id="countdown-text"></h1>
                    <div class="m-3" style="color: #FFCDD2; font-size: 15em;" id="countdown-clock">?</div>
                    </div>
                    </div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = "Returning to remote broadcast in";
                }
                if (queuelength >= 15)
                {
                    countdownclock.style.color = "#E1BEE7";
                    countdownclock.innerHTML = queuelength;
                } else {
                    countdownclock.style.color = "#E1BEE7";
                    countdownclock.innerHTML = queuelength;
                    $("html, body").animate({
                        backgroundColor: "#9C27B0"
                    }, 250, function () {
                        $("html, body").animate({
                            backgroundColor: "#000000"
                        }, 250);
                    });
                }
                // Returning to a sports broadcast
            } else if ((Meta.state === 'sports_returning' || Meta.state === 'sportsremote_returning') && queuelength < 60)
            {
                clearTimeout(slidetimer);
                slidetimer = null;
                slidebadges.innerHTML = ``;
                var countdown = document.getElementById('countdown');
                var countdowntext = document.getElementById('countdown-text');
                var countdownclock = document.getElementById('countdown-clock');
                if (!countdown || !countdowntext || !countdownclock)
                {
                    // Stop marquee screensaver if it is running
                    lines.stop();
                    $('#wrapper').fadeOut(500, 'linear', function () {
                        lines.clear();
                        wrapper.style.display = "none";
                    });
                    content.innerHTML = `<div class="animated flip" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em;" id="countdown-text"></h1>
                    <div class="m-3" style="color: #FFCDD2; font-size: 15em;" id="countdown-clock">?</div>
                    </div>
                    </div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-success">${Meta.dj}</span></br>returning in`;
                }
                if (queuelength >= 15)
                {
                    countdownclock.style.color = "#C8E6C9";
                    countdownclock.innerHTML = queuelength;
                } else {
                    countdownclock.style.color = "#C8E6C9";
                    countdownclock.innerHTML = queuelength;
                    $("html, body").animate({
                        backgroundColor: "#4CAF50"
                    }, 250, function () {
                        $("html, body").animate({
                            backgroundColor: "#000000"
                        }, 250);
                    });
                }
                // Nothing special to show
            } else {
                if ((moment(Meta.time).isAfter(moment({hour: 8, minute: 0})) && (moment(Meta.time).isBefore(moment({hour: 22, minute: 0})))) || !Meta.state.startsWith("automation_") || directorpresent || Meta.state === 'automation_live' || Meta.state === 'automation_sports' || Meta.state === 'automation_remote' || Meta.state === 'automation_sportsremote' || (Meta.state.includes("_returning") && queuelength >= 60)) {
                    if (document.getElementById('dim-slide') !== null || content.innerHTML === 'TESTING' || document.getElementById('slide-interrupt') !== null || document.getElementById('slide-interrupt-eas') !== null)
                    {
                        doSlide(true);
                    }
                } else {
                    if (document.getElementById('dim-slide') === null)
                    {
                        clearTimeout(slidetimer);
                        slidetimer = null;
                        slidebadges.innerHTML = ``;
                        doSlide();
                    }
                }
            }
        } catch (e) {
            if (easActive)
            {
                easActive = false;
                newEas.shift();
            }

            console.error(e);
            console.error(e);
            iziToast.show({
                title: 'An error occurred - Please check the logs',
                message: 'Error occurred during processNowPlaying.'
            });
        }
    }
}


function text_truncate(str, length = 100, ending = '...') {
    try {
        if (str.length > length) {
            return str.substring(0, length - ending.length) + ending;
        } else {
            return str;
        }
    } catch (e) {
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during text_truncate.'
        });
}
}

// This function is called to change the slide that we are on. If same = true, we will re-process the slide number we were on
function doSlide(same = false)
{
    try {
        // Failsafes
        clearTimeout(slidetimer);
        slidetimer = true;
        if ((document.getElementById('slide-interrupt') !== null && (Meta.state.startsWith("automation_") || Meta.state.includes("returning"))) || (document.getElementById('slide-interrupt-eas') !== null && easActive))
        {
            lines.stop();
            $('#wrapper').fadeOut(500, 'linear', function () {
                lines.clear();
                wrapper.style.display = "none";
            });
            slidetimer = setTimeout(doSlide, 10000);
            return null;
        }

        if (!same)
            slide += 1;

        // Each call, we need to re-generate our collection of slides
        var slides = {
            // Slide 1 is the WWSU logo and standard information
            1: {name: 'WWSU', class: 'wwsu-red', do: true, function: function () {
                    if (content.innerHTML === "TESTING")
                    {
                        content.innerHTML = `<div class="animated bounceIn">
                    <div style="text-align: center; width: 100%;"><img src="../images/display/logo.png" style="max-height: 300px; width: auto;"></div>
                            <div id="thebottom">
                            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Website: <span class="text-primary">wwsu1069.org</span></h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Line: <span class="text-warning">937-775-5554</span></h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Request Line: <span class="text-warning">937-775-5555</span></h1>
            </div>
            </div>
            </div>
            `;
                        slidetimer = setTimeout(function () {
                            $('#thebottom').animateCss('fadeOut', function () {
                                var temp = document.getElementById('thebottom');
                                if (temp !== null)
                                {
                                    temp.innerHTML = `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Follow Us <span class="text-warning">@wwsu1069</span> On</h1>
            <div style="width: 100%; align-items: center; justify-content: center;" class="d-flex flex-nowrap p-3 m-3">
            <div class="flex-item m-1" style="width: 20%; text-align: center;"><img src="../images/display/facebook.png"></div>
            <div class="flex-item m-1" style="width: 20%; text-align: center;"><img src="../images/display/twitter.png"></div>
            <div class="flex-item m-1" style="width: 20%; text-align: center;"><img src="../images/display/instagram.png"></div>`;
                                    $('#thebottom').animateCss('fadeIn');
                                }
                                slidetimer = setTimeout(doSlide, 7000);
                            });
                        }, 7000);
                    } else {
                        $('#slide').animateCss('fadeOutUp', function () {
                            content.innerHTML = `<div class="animated bounceIn">
                    <div style="text-align: center; width: 100%;"><img src="../images/display/logo.png" style="max-height: 300px; width: auto;"></div>
                            <div id="thebottom">
                            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Website: <span class="text-primary">wwsu1069.org</span></h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Line: <span class="text-warning">937-775-5554</span></h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Request Line: <span class="text-warning">937-775-5555</span></h1>
            </div>
            </div>
            </div>
            `;
                            slidetimer = setTimeout(function () {
                                $('#thebottom').animateCss('fadeOut', function () {
                                    var temp = document.getElementById('thebottom');
                                    if (temp !== null)
                                    {
                                        temp.innerHTML = `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Follow Us <span class="text-warning">@wwsu1069</span> On</h1>
            <div style="width: 100%; align-items: center; justify-content: center;" class="d-flex flex-nowrap p-3 m-3">
            <div class="flex-item m-1" style="width: 20%; text-align: center;"><img src="../images/display/facebook.png"></div>
            <div class="flex-item m-1" style="width: 20%; text-align: center;"><img src="../images/display/twitter.png"></div>
            <div class="flex-item m-1" style="width: 20%; text-align: center;"><img src="../images/display/instagram.png"></div>`;
                                        $('#thebottom').animateCss('fadeIn');
                                    }
                                    slidetimer = setTimeout(doSlide, 7000);
                                });
                            }, 7000);
                        });
                    }
                }},
            // Slide 2 is only visible if we are not in automation, and displays who is on the air, as well as the topic if one is set.
            2: {name: 'On the Air', class: 'light', do: false, function() {
                    $('#slide').animateCss('lightSpeedOut', function () {
                        if (Meta.topic.length > 2)
                        {
                            content.innerHTML = `<div class="animated fadeInDown">
            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">On the Air Right Now</h1>
            <h2 style="text-align: center; font-size: 3em;" class="text-danger">${Meta.dj}</h2>`;
                            if ('webchat' in Meta && Meta.webchat)
                            {
                                content.innerHTML += '<h3 style="text-align: center; font-size: 2em; color: #FFFFFF;">Tune in & Chat with the DJ: <span class="text-primary">wwsu1069.org</span></h3>';
                            } else {
                                content.innerHTML += '<h3 style="text-align: center; font-size: 2em; color: #FFFFFF;">Tune in: <span class="text-primary">wwsu1069.org</span></h3>';
                            }
                            content.innerHTML += `<div style="overflow-y: hidden; font-size: 3em; color: #FFFFFF; height: 320px;" class="bg-dark text-white border border-primary p-1 m-1">${Meta.topic.replace(/[\r\n]+/g, ' ')}</div></div>`;
                        } else {
                            content.innerHTML = `<div class="animated fadeInDown">
            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">On the Air Right Now</h1>
            <h2 style="text-align: center; font-size: 3em;" class="text-danger">${Meta.dj}</h2>`;
                            if ('webchat' in Meta && Meta.webchat)
                            {
                                content.innerHTML += '<h3 style="text-align: center; font-size: 2em; color: #FFFFFF;">Tune in & Chat with the DJ: <span class="text-primary">wwsu1069.org</span></h3>';
                            } else {
                                content.innerHTML += '<h3 style="text-align: center; font-size: 2em; color: #FFFFFF;">Tune in: <span class="text-primary">wwsu1069.org</span></h3>';
                            }
                            content.innerHTML += `</div>`;
                        }
                        slidetimer = setTimeout(doSlide, 14000);
                    });
                }},
            // Slide 3 is a list of WWSU directors and whether or not they are currently clocked in
            3: {name: 'Directors', class: 'info', do: true, function: function () {
                    $('#slide').animateCss('lightSpeedOut', function () {
                        content.innerHTML = `<div class="animated fadeInDown" ><h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Directors</h1>
            <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="directors"></div></div>`;
                        var innercontent = document.getElementById('directors');
                        Directors().each(function (dodo) {
                            try {
                                var color = 'rgba(244, 67, 54, 0.5)';
                                var text1 = 'OUT';
                                var text2 = '';
                                if (dodo.since !== null && moment(dodo.since).isValid())
                                    text2 = moment(dodo.since).from(moment(Meta.time), true);
                                if (dodo.present)
                                {
                                    var color = 'rgba(76, 175, 80, 0.5)';
                                    var text1 = 'IN';
                                }
                                innercontent.innerHTML += `<div style="width: 49%; background-color: ${color};" class="d-flex align-items-stretch m-1 text-white">
                        <div class="container-fluid m-1" style="text-align: center;"><span style="font-size: 1.5em;">${dodo.name}</span><br /><span style="font-size: 1em;">${dodo.position}</span></div>
                        <div class="m-1" style="width: 96px;"><span style="font-size: 1.5em;">${text1}</span><br /><span style="font-size: 1em;">${text2}</span></div>
                        </div>
                        `;
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
                }},
            // Slide 4 is today's events
            4: {name: 'Events Today', class: 'success', do: true, function: function () {
                    $('#slide').animateCss('fadeOutUp', function () {
                        content.innerHTML = `<div class="animated fadeInDown">
            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Events Today</h1>
            <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="events"></div></div>`;
                        var innercontent = document.getElementById('events');
                        if (typeof calendar[0][`Today ${moment(Meta.time).format('MM/DD')}`] !== 'undefined')
                        {
                            if (calendar[0][`Today ${moment(Meta.time).format('MM/DD')}`].length > 0)
                            {
                                calendar[0][`Today ${moment(Meta.time).format('MM/DD')}`].forEach(function (dodo, index) {
                                    try {
                                        var color = hexRgb(dodo.color);
                                        var borderclass = 'black';
                                        var alpha = 0.3;
                                        var timeleft = '';
                                        if (moment(Meta.time).isBefore(moment(dodo.start)))
                                        {
                                            timeleft = `Starts ${moment(Meta.time).to(moment(dodo.start))}`;
                                            alpha = 0.3;
                                            borderclass = 'warning';
                                        } else if (moment(Meta.time).isAfter(moment(dodo.end)))
                                        {
                                            timeleft = `Ended ${moment(dodo.ends).from(moment(Meta.time))}`;
                                            alpha = 0.1;
                                            borderclass = 'danger';
                                        } else {
                                            timeleft = `Ends ${moment(Meta.time).to(moment(dodo.ends))}`;
                                            alpha = 0.5;
                                            borderclass = 'success';
                                        }
                                        color = `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha});`;
                                        innercontent.innerHTML += `<div style="width: 32%; background-color: ${color};" class="d-flex align-items-stretch m-1 text-white border border-${borderclass}">
                        <div class="m-1" style="text-align: center; width: 100%"><span style="font-size: 1.5em;"><string>${dodo.title}</strong></span><br /><span class="text-warning-light" style="font-size: 1em;">${dodo.startT} - ${dodo.endT}</span><br /><span class="text-danger-light" style="font-size: 1em;">${timeleft}</span><br /><span class="text-light" style="font-size: 0.75em; text-align: left;">${text_truncate(dodo.description, 140)}</div>
                        </div>
                        `;
                                    } catch (e) {
                                        console.error(e);
                                        iziToast.show({
                                            title: 'An error occurred - Please check the logs',
                                            message: `Error occurred in iteration ${index} of calendar[0].`
                                        });
                                    }
                                });
                            } else {
                                innercontent.className = '';
                                innercontent.innerHTML += `<div style="text-danger font-size: 2em; text-align: center;">There are no events today.</div>`;
                            }
                        } else {
                            innercontent.className = '';
                            innercontent.innerHTML += `<div style="text-danger font-size: 2em; text-align: center;">There was an error getting today's events.</div>`;
                        }
                        slidetimer = setTimeout(doSlide, 14000);
                    });
                }},
            // Slide 5 are events for days 2-4
            5: {name: 'Days 2-4', class: 'success', do: true, function: function () {
                    $('#slide').animateCss('fadeOutUp', function () {
                        content.innerHTML = `<div class="animated fadeInDown">
                                <div class="table-responsive">
                                <table style="overflow-y: hidden; text-align: center; background: rgba(0, 0, 0, 0);" class="table table-sm table-dark border-0" id="events">
                                <thead>
                                <tr style="border-style: none;">
                                <th scope="col" width="32%" id="events-rowh-col1" style="border-style: none; font-size: 1.5em;">${moment(Meta.time).add(1, 'days').format('dddd MM/DD')}</th>
                                <th scope="col" width="32%" id="events-rowh-col2" style="border-style: none; font-size: 1.5em;">${moment(Meta.time).add(2, 'days').format('dddd MM/DD')}</th>
                                <th scope="col" width="32%" id="events-rowh-col3" style="border-style: none; font-size: 1.5em;">${moment(Meta.time).add(3, 'days').format('dddd MM/DD')}</th>
                                </tr>
                                </thead>
                                <tbody id="events-body">
                                </tbody>
                                </table>
                                </div></div>`;
                        var innercontent = document.getElementById('events-body');
                        if (calendar[1][0][moment(Meta.time).add(1, 'days').format('dddd MM/DD')] !== 'undefined')
                        {
                            if (calendar[1][0][moment(Meta.time).add(1, 'days').format('dddd MM/DD')].length > 0)
                            {
                                calendar[1][0][moment(Meta.time).add(1, 'days').format('dddd MM/DD')].forEach(function (dodo, index) {
                                    try {
                                        var color = null;
                                        var temp2 = document.getElementById(`events-row-${index}`);
                                        if (temp2 === null)
                                        {
                                            innercontent.innerHTML += `<tr id="events-row-${index}" style="border-style: none;">
                                                <td width="32%" id="events-row${index}-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row${index}-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row${index}-col3" style="border-style: none;"></td>
                                                </tr>`;
                                            temp2 = document.getElementById(`events-row-${index}`);
                                        }
                                        var innercontent2 = document.getElementById(`events-row${index}-col1`);
                                        color = hexRgb(dodo.color);
                                        color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.5);`;
                                        innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; background: ${color}">
                                            <div class="row">
                                            <div class="col-8" style="text-align: left;">
                                            <span class="m-1 text-light" style="font-size: 1em;"><strong>${dodo.title}</strong></span>
                                            </div>
                                            <div class="col" style="text-align: right;">
                                            <span class="m-2 text-light" style="font-size: 0.75em;">${dodo.startT} to<br />${dodo.endT}</span>
                                            </div>
                                            </div>
                                            </div>`;
                                    } catch (e) {
                                        console.error(e);
                                        iziToast.show({
                                            title: 'An error occurred - Please check the logs',
                                            message: `Error occurred in iteration ${index} of calendar[1][0].`
                                        });
                                    }
                                });
                            } else {
                                var temp2 = document.getElementById(`events-row-0`);
                                if (temp2 === null)
                                {
                                    innercontent.innerHTML += `<tr id="events-row-0" style="border-style: none;">
                                                <td width="32%" id="events-row0-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col3" style="border-style: none;"></td>
                                                </tr>`;
                                    temp2 = document.getElementById(`events-row-0`);
                                }
                                var innercontent2 = document.getElementById(`events-row0-col1`);
                                innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.5);">
                                            No events this day.
                                            </div>`;
                            }
                        } else {
                            var temp2 = document.getElementById(`events-row-0`);
                            if (temp2 === null)
                            {
                                innercontent.innerHTML += `<tr id="events-row-0" style="border-style: none;">
                                                <td width="32%" id="events-row0-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col3" style="border-style: none;"></td>
                                                </tr>`;
                                temp2 = document.getElementById(`events-row-0`);
                            }
                            var innercontent2 = document.getElementById(`events-row0-col1`);
                            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.5);">
                                            Error loading events for this day.
                                            </div>`;
                        }
                        if (calendar[1][1][moment(Meta.time).add(2, 'days').format('dddd MM/DD')] !== 'undefined')
                        {
                            if (calendar[1][1][moment(Meta.time).add(2, 'days').format('dddd MM/DD')].length > 0)
                            {
                                calendar[1][1][moment(Meta.time).add(2, 'days').format('dddd MM/DD')].forEach(function (dodo, index) {
                                    try {
                                        var color = null;
                                        var temp2 = document.getElementById(`events-row-${index}`);
                                        if (temp2 === null)
                                        {
                                            innercontent.innerHTML += `<tr id="events-row-${index}" style="border-style: none;">
                                                <td width="32%" id="events-row${index}-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row${index}-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row${index}-col3" style="border-style: none;"></td>
                                                </tr>`;
                                            temp2 = document.getElementById(`events-row-${index}`);
                                        }
                                        var innercontent2 = document.getElementById(`events-row${index}-col2`);
                                        color = hexRgb(dodo.color);
                                        color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.5);`;
                                        innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; background: ${color}">
                                            <div class="row">
                                            <div class="col-8" style="text-align: left;">
                                            <span class="m-1 text-light" style="font-size: 1em;"><strong>${dodo.title}</strong></span>
                                            </div>
                                            <div class="col" style="text-align: right;">
                                            <span class="m-2 text-light" style="font-size: 0.75em;">${dodo.startT} to<br />${dodo.endT}</span>
                                            </div>
                                            </div>
                                            </div>`;
                                    } catch (e) {
                                        console.error(e);
                                        iziToast.show({
                                            title: 'An error occurred - Please check the logs',
                                            message: `Error occurred in iteration ${index} of calendar[1][1].`
                                        });
                                    }
                                });
                            } else {
                                var temp2 = document.getElementById(`events-row-0`);
                                if (temp2 === null)
                                {
                                    innercontent.innerHTML += `<tr id="events-row-0" style="border-style: none;">
                                                <td width="32%" id="events-row0-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col3" style="border-style: none;"></td>
                                                </tr>`;
                                    temp2 = document.getElementById(`events-row-0`);
                                }
                                var innercontent2 = document.getElementById(`events-row0-col2`);
                                innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.5);">
                                            No events this day.
                                            </div>`;
                            }
                        } else {
                            var temp2 = document.getElementById(`events-row-0`);
                            if (temp2 === null)
                            {
                                innercontent.innerHTML += `<tr id="events-row-0" style="border-style: none;">
                                                <td width="32%" id="events-row0-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col3" style="border-style: none;"></td>
                                                </tr>`;
                                temp2 = document.getElementById(`events-row-0`);
                            }
                            var innercontent2 = document.getElementById(`events-row0-col2`);
                            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.5);">
                                            Error loading events for this day.
                                            </div>`;
                        }
                        if (calendar[1][2][moment(Meta.time).add(3, 'days').format('dddd MM/DD')] !== 'undefined')
                        {
                            if (calendar[1][2][moment(Meta.time).add(3, 'days').format('dddd MM/DD')].length > 0)
                            {
                                calendar[1][2][moment(Meta.time).add(3, 'days').format('dddd MM/DD')].forEach(function (dodo, index) {
                                    try {
                                        var color = null;
                                        var temp2 = document.getElementById(`events-row-${index}`);
                                        if (temp2 === null)
                                        {
                                            innercontent.innerHTML += `<tr id="events-row-${index}" style="border-style: none;">
                                                <td width="32%" id="events-row${index}-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row${index}-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row${index}-col3" style="border-style: none;"></td>
                                                </tr>`;
                                            temp2 = document.getElementById(`events-row-${index}`);
                                        }
                                        var innercontent2 = document.getElementById(`events-row${index}-col3`);
                                        color = hexRgb(dodo.color);
                                        color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.5);`;
                                        innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; background: ${color}">
                                            <div class="row">
                                            <div class="col-8" style="text-align: left;">
                                            <span class="m-1 text-light" style="font-size: 1em;"><strong>${dodo.title}</strong></span>
                                            </div>
                                            <div class="col" style="text-align: right;">
                                            <span class="m-2 text-light" style="font-size: 0.75em;">${dodo.startT} to<br />${dodo.endT}</span>
                                            </div>
                                            </div>
                                            </div>`;
                                    } catch (e) {
                                        console.error(e);
                                        iziToast.show({
                                            title: 'An error occurred - Please check the logs',
                                            message: `Error occurred in iteration ${index} of calendar[1][2].`
                                        });
                                    }
                                });
                            } else {
                                var temp2 = document.getElementById(`events-row-0`);
                                if (temp2 === null)
                                {
                                    innercontent.innerHTML += `<tr id="events-row-0" style="border-style: none;">
                                                <td width="32%" id="events-row0-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col3" style="border-style: none;"></td>
                                                </tr>`;
                                    temp2 = document.getElementById(`events-row-0`);
                                }
                                var innercontent2 = document.getElementById(`events-row0-col3`);
                                innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.5);">
                                            No events this day.
                                            </div>`;
                            }
                        } else {
                            var temp2 = document.getElementById(`events-row-0`);
                            if (temp2 === null)
                            {
                                innercontent.innerHTML += `<tr id="events-row-0" style="border-style: none;">
                                                <td width="32%" id="events-row0-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col3" style="border-style: none;"></td>
                                                </tr>`;
                                temp2 = document.getElementById(`events-row-0`);
                            }
                            var innercontent2 = document.getElementById(`events-row0-col3`);
                            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.5);">
                                            Error loading events for this day.
                                            </div>`;
                        }
                        slidetimer = setTimeout(doSlide, 14000);
                    });
                }},
            6: {name: 'Days 5-7', class: 'success', do: true, function() {
                    $('#slide').animateCss('fadeOutUp', function () {
                        content.innerHTML = `<div class="animated fadeInDown">
                                <div class="table-responsive">
                                <table style="overflow-y: hidden; text-align: center; background: rgba(0, 0, 0, 0);" class="table table-sm table-dark border-0" id="events">
                                <thead>
                                <tr style="border-style: none;">
                                <th scope="col" width="32%" id="events-rowh-col1" style="border-style: none; font-size: 1.5em;">${moment(Meta.time).add(4, 'days').format('dddd MM/DD')}</th>
                                <th scope="col" width="32%" id="events-rowh-col2" style="border-style: none; font-size: 1.5em;">${moment(Meta.time).add(5, 'days').format('dddd MM/DD')}</th>
                                <th scope="col" width="32%" id="events-rowh-col3" style="border-style: none; font-size: 1.5em;">${moment(Meta.time).add(6, 'days').format('dddd MM/DD')}</th>
                                </tr>
                                </thead>
                                <tbody id="events-body">
                                </tbody>
                                </table>
                                </div></div>`;
                        var innercontent = document.getElementById('events-body');
                        if (calendar[2][0][moment(Meta.time).add(4, 'days').format('dddd MM/DD')] !== 'undefined')
                        {
                            if (calendar[2][0][moment(Meta.time).add(4, 'days').format('dddd MM/DD')].length > 0)
                            {
                                calendar[2][0][moment(Meta.time).add(4, 'days').format('dddd MM/DD')].forEach(function (dodo, index) {
                                    try {
                                        var color = null;
                                        var temp2 = document.getElementById(`events-row-${index}`);
                                        if (temp2 === null)
                                        {
                                            innercontent.innerHTML += `<tr id="events-row-${index}" style="border-style: none;">
                                                <td width="32%" id="events-row${index}-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row${index}-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row${index}-col3" style="border-style: none;"></td>
                                                </tr>`;
                                            temp2 = document.getElementById(`events-row-${index}`);
                                        }
                                        var innercontent2 = document.getElementById(`events-row${index}-col1`);
                                        color = hexRgb(dodo.color);
                                        color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.5);`;
                                        innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; background: ${color}">
                                            <div class="row">
                                            <div class="col-8" style="text-align: left;">
                                            <span class="m-1 text-light" style="font-size: 1em;"><strong>${dodo.title}</strong></span>
                                            </div>
                                            <div class="col" style="text-align: right;">
                                            <span class="m-2 text-light" style="font-size: 0.75em;">${dodo.startT} to<br />${dodo.endT}</span>
                                            </div>
                                            </div>
                                            </div>`;
                                    } catch (e) {
                                        console.error(e);
                                        iziToast.show({
                                            title: 'An error occurred - Please check the logs',
                                            message: `Error occurred in iteration ${index} of calendar[2][0].`
                                        });
                                    }
                                });
                            } else {
                                var temp2 = document.getElementById(`events-row-0`);
                                if (temp2 === null)
                                {
                                    innercontent.innerHTML += `<tr id="events-row-0" style="border-style: none;">
                                                <td width="32%" id="events-row0-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col3" style="border-style: none;"></td>
                                                </tr>`;
                                    temp2 = document.getElementById(`events-row-0`);
                                }
                                var innercontent2 = document.getElementById(`events-row0-col1`);
                                innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.5);">
                                            No events this day.
                                            </div>`;
                            }
                        } else {
                            var temp2 = document.getElementById(`events-row-0`);
                            if (temp2 === null)
                            {
                                innercontent.innerHTML += `<tr id="events-row-0" style="border-style: none;">
                                                <td width="32%" id="events-row0-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col3" style="border-style: none;"></td>
                                                </tr>`;
                                temp2 = document.getElementById(`events-row-0`);
                            }
                            var innercontent2 = document.getElementById(`events-row0-col1`);
                            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.5);">
                                            Error loading events for this day.
                                            </div>`;
                        }
                        if (calendar[2][1][moment(Meta.time).add(5, 'days').format('dddd MM/DD')] !== 'undefined')
                        {
                            if (calendar[2][1][moment(Meta.time).add(5, 'days').format('dddd MM/DD')].length > 0)
                            {
                                calendar[2][1][moment(Meta.time).add(5, 'days').format('dddd MM/DD')].forEach(function (dodo, index) {
                                    try {
                                        var color = null;
                                        var temp2 = document.getElementById(`events-row-${index}`);
                                        if (temp2 === null)
                                        {
                                            innercontent.innerHTML += `<tr id="events-row-${index}" style="border-style: none;">
                                                <td width="32%" id="events-row${index}-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row${index}-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row${index}-col3" style="border-style: none;"></td>
                                                </tr>`;
                                            temp2 = document.getElementById(`events-row-${index}`);
                                        }
                                        var innercontent2 = document.getElementById(`events-row${index}-col2`);
                                        color = hexRgb(dodo.color);
                                        color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.5);`;
                                        innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; background: ${color}">
                                            <div class="row">
                                            <div class="col-8" style="text-align: left;">
                                            <span class="m-1 text-light" style="font-size: 1em;"><strong>${dodo.title}</strong></span>
                                            </div>
                                            <div class="col" style="text-align: right;">
                                            <span class="m-2 text-light" style="font-size: 0.75em;">${dodo.startT} to<br />${dodo.endT}</span>
                                            </div>
                                            </div>
                                            </div>`;
                                    } catch (e) {
                                        console.error(e);
                                        iziToast.show({
                                            title: 'An error occurred - Please check the logs',
                                            message: `Error occurred in iteration ${index} of calendar[2][1].`
                                        });
                                    }
                                });
                            } else {
                                var temp2 = document.getElementById(`events-row-0`);
                                if (temp2 === null)
                                {
                                    innercontent.innerHTML += `<tr id="events-row-0" style="border-style: none;">
                                                <td width="32%" id="events-row0-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col3" style="border-style: none;"></td>
                                                </tr>`;
                                    temp2 = document.getElementById(`events-row-0`);
                                }
                                var innercontent2 = document.getElementById(`events-row0-col2`);
                                innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.5);">
                                            No events this day.
                                            </div>`;
                            }
                        } else {
                            var temp2 = document.getElementById(`events-row-0`);
                            if (temp2 === null)
                            {
                                innercontent.innerHTML += `<tr id="events-row-0" style="border-style: none;">
                                                <td width="32%" id="events-row0-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col3" style="border-style: none;"></td>
                                                </tr>`;
                                temp2 = document.getElementById(`events-row-0`);
                            }
                            var innercontent2 = document.getElementById(`events-row0-col2`);
                            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.5);">
                                            Error loading events for this day.
                                            </div>`;
                        }
                        if (calendar[2][2][moment(Meta.time).add(6, 'days').format('dddd MM/DD')] !== 'undefined')
                        {
                            if (calendar[2][2][moment(Meta.time).add(6, 'days').format('dddd MM/DD')].length > 0)
                            {
                                calendar[2][2][moment(Meta.time).add(6, 'days').format('dddd MM/DD')].forEach(function (dodo, index) {
                                    try {
                                        var color = null;
                                        var temp2 = document.getElementById(`events-row-${index}`);
                                        if (temp2 === null)
                                        {
                                            innercontent.innerHTML += `<tr id="events-row-${index}" style="border-style: none;">
                                                <td width="32%" id="events-row${index}-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row${index}-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row${index}-col3" style="border-style: none;"></td>
                                                </tr>`;
                                            temp2 = document.getElementById(`events-row-${index}`);
                                        }
                                        var innercontent2 = document.getElementById(`events-row${index}-col3`);
                                        color = hexRgb(dodo.color);
                                        color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.5);`;
                                        innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; background: ${color}">
                                            <div class="row">
                                            <div class="col-8" style="text-align: left;">
                                            <span class="m-1 text-light" style="font-size: 1em;"><strong>${dodo.title}</strong></span>
                                            </div>
                                            <div class="col" style="text-align: right;">
                                            <span class="m-2 text-light" style="font-size: 0.75em;">${dodo.startT} to<br />${dodo.endT}</span>
                                            </div>
                                            </div>
                                            </div>`;
                                    } catch (e) {
                                        console.error(e);
                                        iziToast.show({
                                            title: 'An error occurred - Please check the logs',
                                            message: `Error occurred in iteration ${index} of calendar[2][2].`
                                        });
                                    }
                                });
                            } else {
                                var temp2 = document.getElementById(`events-row-0`);
                                if (temp2 === null)
                                {
                                    innercontent.innerHTML += `<tr id="events-row-0" style="border-style: none;">
                                                <td width="32%" id="events-row0-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col3" style="border-style: none;"></td>
                                                </tr>`;
                                    temp2 = document.getElementById(`events-row-0`);
                                }
                                var innercontent2 = document.getElementById(`events-row0-col3`);
                                innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.5);">
                                            No events this day.
                                            </div>`;
                            }
                        } else {
                            var temp2 = document.getElementById(`events-row-0`);
                            if (temp2 === null)
                            {
                                innercontent.innerHTML += `<tr id="events-row-0" style="border-style: none;">
                                                <td width="32%" id="events-row0-col1" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col2" style="border-style: none;"></td>
                                                <td width="32%" id="events-row0-col3" style="border-style: none;"></td>
                                                </tr>`;
                                temp2 = document.getElementById(`events-row-0`);
                            }
                            var innercontent2 = document.getElementById(`events-row0-col3`);
                            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.5);">
                                            Error loading events for this day.
                                            </div>`;
                        }
                        slidetimer = setTimeout(doSlide, 14000);
                    });
                }},
            101: {name: 'Be a DJ', class: 'purple', do: true, function() {
                    $('#slide').animateCss('fadeOutUp', function () {
                        if (Meta.state.startsWith("live_"))
                        {
                            var temp = Meta.dj.split(" - ");
                            content.innerHTML = `<div class="animated bounceIn">
                    <div style="text-align: center; width: 100%; font-size: 4em; color: #FFFFFF;">Interested in being <div class="text-warning jump-text">on the air</div>just like <span class="text-danger">${temp[0]}</span>?</div>
                            <div id="thebottom">
                            <div style="text-align: center; font-size: 3em; color: #FFFFFF">Send an email to <span class="text-primary">production@wwsu1069.org</span>!</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF">Class/training is free, is online, and generally only takes a few weeks.</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF">You must be enrolled in at least 6 credit hours (3 for graduates) at Wright State.</div>
            </div>
            </div>
            </div>`;
                        } else if (Meta.state.startsWith("sports_") || Meta.state.startsWith("sportsremote_"))
                        {
                            content.innerHTML = `<div class="animated bounceIn">
                    <div style="text-align: center; width: 100%; font-size: 4em; color: #FFFFFF;">Want to be a <div class="text-success jump-text">sports broadcaster?</div></div>
                            <div id="thebottom">
                            <div style="text-align: center; font-size: 3em; color: #FFFFFF">Send an email to <span class="text-primary">sports@wwsu1069.org</span>!</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF">Class/training is free and generally only takes a couple weeks.</div>
            </div>
            </div>
            </div>`;
                        } else
                        {
                            content.innerHTML = `<div class="animated bounceIn">
                    <div style="text-align: center; width: 100%; font-size: 4em; color: #FFFFFF;">Interested in becoming a<div class="text-warning jump-text">DJ / radio personality?</div></div>
                            <div id="thebottom">
                            <div style="text-align: center; font-size: 3em; color: #FFFFFF">Send an email to <span class="text-primary">production@wwsu1069.org</span>!</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF">Class/training is free, is online, and generally only takes a few weeks.</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF">You must be enrolled in at least 6 credit hours (3 for graduates) at Wright State.</div>
            </div>
            </div>
            </div>`;
                        }
                        setTimeout(function () {
                            $('.jump-text').animateCss('tada');
                        }, 1500);
                        setTimeout(function () {
                            $('.jump-text').animateCss('tada');
                        }, 3500);
                        setTimeout(function () {
                            $('.jump-text').animateCss('tada');
                        }, 5500);
                        slidetimer = setTimeout(doSlide, 14000);
                    });
                }},
            // This slide is for active Eas alerts
            102: {name: 'Weather Alerts', class: 'danger', do: false, function() {
                    $('#slide').animateCss('fadeOutUp', function () {
                        content.innerHTML = `<div class="animated fadeInDown">
            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">WWSU EAS - Active Alerts</h1>
            <h2 style="text-align: center; font-size: 1.5em; color: #FFFFFF">Clark, Greene, and Montgomery counties</h2>
            <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="alerts"></div></div>`;
                        var innercontent = document.getElementById('alerts');
                        Eas().each(function (dodo) {
                            try {
                                var color = (typeof dodo.color !== 'undefined' && /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(dodo.color)) ? hexRgb(dodo.color) : hexRgb('#787878');
                                var borderclass = 'black';
                                var alpha = 0.7;
                                if (typeof dodo['severity'] !== 'undefined')
                                {
                                    if (dodo['severity'] === 'Extreme')
                                    {
                                        borderclass = 'danger';
                                    } else if (dodo['severity'] === 'Severe')
                                    {
                                        borderclass = 'warning';
                                    } else if (dodo['severity'] === 'Moderate')
                                    {
                                        borderclass = 'primary';
                                    }
                                }
                                var timeleft = '';
                                if (moment(Meta.time).isBefore(moment(dodo.starts)))
                                {
                                    timeleft = `Effective ${moment(Meta.time).to(moment(dodo.starts))}`;
                                } else if (moment(Meta.time).isAfter(moment(dodo.expires)))
                                {
                                    timeleft = `Expired ${moment(dodo.expires).from(moment(Meta.time))}`;
                                } else {
                                    timeleft = `Expires ${moment(Meta.time).to(moment(dodo.expires))}`;
                                }
                                color = `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha});`;
                                innercontent.innerHTML += `<div style="width: 32%; background-color: ${color};" class="d-flex align-items-stretch m-1 text-white border border-${borderclass}">
                        <div class="m-1" style="text-align: center; width: 100%"><span style="font-size: 1.5em;">${(typeof dodo['alert'] !== 'undefined') ? dodo['alert'] : 'Unknown Alert'}</span><br />
                        <span style="font-size: 1em;" class="text-info-light">${moment(dodo['starts']).isValid() ? moment(dodo['starts']).format("MM/DD h:mmA") : 'UNKNOWN'} - ${moment(dodo['expires']).isValid() ? moment(dodo['expires']).format("MM/DD h:mmA") : 'UNKNOWN'}</span><br />
<span style="font-size: 1em;" class="text-warning-light">${(typeof dodo['counties'] !== 'undefined') ? dodo['counties'] : 'Unknown Counties'}</span><br />
<span style="font-size: 1em;" class="text-danger-light">${timeleft}</span></div>
                        </div>
                        `;
                            } catch (e) {
                                console.error(e);
                                iziToast.show({
                                    title: 'An error occurred - Please check the logs',
                                    message: `Error occurred in Eas iteration in doSlide.`
                                });
                            }
                        });
                        slidetimer = setTimeout(doSlide, 14000);
                    });
                }}
        };

        // If not in power saving mode...
        if ((moment(Meta.time).isAfter(moment({hour: 8, minute: 0})) && (moment(Meta.time).isBefore(moment({hour: 22, minute: 0})))) || !Meta.state.startsWith("automation_") || directorpresent || Meta.state === 'automation_live' || Meta.state === 'automation_sports' || Meta.state === 'automation_remote' || Meta.state === 'automation_sportsremote')
        {
            // Activate Eas alerts slide if there are alerts
            if (Eas().count() < 1)
            {
                slides[102].do = false;
            } else {
                slides[102].do = true;
            }
            // Activate "on the air" slide if someone is on the air
            if (Meta.state.startsWith("live_"))
            {
                slides[2].do = true;
            } else {
                slides[2].do = false;
            }

            // Generate the badge indications for each slide, and determine which slide is our highest in number (last)
            slidebadges.innerHTML = ``;
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

            // Determine which slide to show
            var done = false;
            var restarted = false;
            while (!done)
            {
                // If we passed the last slide, reset. If we reset twice in a row, this is an error; trigger marquee screensaver.
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

                // Slide 0 is marquee screensaver for 30 seconds
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

                    // If determined slide is active and exists, do it
                } else if (typeof slides[slide] !== 'undefined' && slides[slide].do)
                {
                    try {
                        done = true;
                        console.log(`Doing slide ${slide}`);
                        slides[slide].function();
                        var temp = document.getElementById(`slidebadge-${slide}`);
                        if (temp !== null)
                            temp.className = `m-1 btn btn-${slides[slide].class} btn-sm`;
                        // Error? Continue the loop and find a different slide.
                    } catch (e)
                    {
                        iziToast.show({
                            title: 'An error occurred - Please check the logs',
                            message: 'Slide ' + slide + ' has an error in its function call. The slide was skipped.'
                        });
                        done = false;
                    }
                } else {
                    slide += 1;
                }
            }
            background.style.display = "inline";
            // Power saving mode
        } else {
            slidetimer = setTimeout(doSlide, 14000);
            slidebadges.innerHTML = ``;
            var afterFunction = function () {
                try {
                    background.style.display = "none";
                    // If there are weather alerts, show those instead of the logo
                    if (Eas().count() > 0)
                    {
                        console.log(`Doing inactive slide - weather alerts`);
                        content.innerHTML = `<div style="opacity: 0.2" id="dim-slide">
            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">WWSU EAS - Active Alerts</h1>
            <h2 style="text-align: center; font-size: 1.5em; color: #FFFFFF">Clark, Greene, and Montgomery counties</h2>
            <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="alerts"></div></div>`;
                        var innercontent = document.getElementById('alerts');
                        Eas().each(function (dodo) {
                            try {
                                var color = (typeof dodo.color !== 'undefined' && /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(dodo.color)) ? hexRgb(dodo.color) : hexRgb('#787878');
                                var borderclass = 'black';
                                var alpha = 0.3;
                                if (typeof dodo['severity'] !== 'undefined')
                                {
                                    if (dodo['severity'] === 'Extreme')
                                    {
                                        borderclass = 'danger';
                                    } else if (dodo['severity'] === 'Severe')
                                    {
                                        borderclass = 'warning';
                                    } else if (dodo['severity'] === 'Moderate')
                                    {
                                        borderclass = 'primary';
                                    }
                                }
                                var timeleft = '';
                                if (moment(Meta.time).isBefore(moment(dodo.starts)))
                                {
                                    timeleft = `Effective ${moment(Meta.time).to(moment(dodo.starts))}`;
                                } else if (moment(Meta.time).isAfter(moment(dodo.expires)))
                                {
                                    timeleft = `Expired ${moment(dodo.expires).from(moment(Meta.time))}`;
                                } else {
                                    timeleft = `Expires ${moment(Meta.time).to(moment(dodo.expires))}`;
                                }
                                color = `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha});`;
                                innercontent.innerHTML += `<div style="width: 32%; background-color: ${color};" class="d-flex align-items-stretch m-1 text-white border border-${borderclass}">
                        <div class="m-1" style="text-align: center; width: 100%"><span style="font-size: 1.5em;">${(typeof dodo['alert'] !== 'undefined') ? dodo['alert'] : 'Unknown Alert'}</span><br />
                        <span style="font-size: 1em;">${moment(dodo['starts']).isValid() ? moment(dodo['starts']).format("MM/DD h:mmA") : 'UNKNOWN'} - ${moment(dodo['expires']).isValid() ? moment(dodo['expires']).format("MM/DD h:mmA") : 'UNKNOWN'}</span><br />
<span style="font-size: 1em;">${(typeof dodo['counties'] !== 'undefined') ? dodo['counties'] : 'Unknown Counties'}</span><br />
<span style="font-size: 1em;">${timeleft}</span></div>
                        </div>
                        `;
                            } catch (e) {
                                console.error(e);
                                iziToast.show({
                                    title: 'An error occurred - Please check the logs',
                                    message: `Error occurred in iteration Eas in the doSlide power saving area.`
                                });
                            }
                        });
                        // Otherwise, display the logo
                    } else {
                        console.log(`Doing inactive slide - WWSU`);
                        content.innerHTML = `<div style="opacity: 0.2;" id="dim-slide">
                    <div style="text-align: center; width: 100%;"><img src="../images/display/logo.png" style="max-height: 300px; width: auto;"></div>
                            <div id="thebottom">
                            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Website: wwsu1069.org</h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Line: 937-775-5554</h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Request Line: 937-775-5555</h1>
            </div>
            </div>`;
                    }
                } catch (e) {
                    console.error(e);
                    iziToast.show({
                        title: 'An error occurred - Please check the logs',
                        message: `Error occurred in the doSlide afterFunction.`
                    });
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
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during doSlide.'
        });
}
}

function hexRgb(hex, options = {}) {
    try {
        if (typeof hex !== 'string' || nonHexChars.test(hex) || !validHexSize.test(hex)) {
            throw new TypeError('Expected a valid hex string');
        }

        hex = hex.replace(/^#/, '');
        let alpha = 255;

        if (hex.length === 8) {
            alpha = parseInt(hex.slice(6, 8), 16) / 255;
            hex = hex.substring(0, 6);
        }

        if (hex.length === 4) {
            alpha = parseInt(hex.slice(3, 4).repeat(2), 16) / 255;
            hex = hex.substring(0, 3);
        }

        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        const num = parseInt(hex, 16);
        const red = num >> 16;
        const green = (num >> 8) & 255;
        const blue = num & 255;

        return options.format === 'array' ?
                [red, green, blue, alpha] :
                {red, green, blue, alpha};
    } catch (e) {
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during hexRgb.'
        });
}
}