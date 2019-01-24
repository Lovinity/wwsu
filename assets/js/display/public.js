/* global moment, ProgressBar, io, Infinity, iziToast, responsiveVoice */

try {

// Define hexrgb constants
    var hexChars = 'a-f\\d';
    var match3or4Hex = `#?[${hexChars}]{3}[${hexChars}]?`;
    var match6or8Hex = `#?[${hexChars}]{6}([${hexChars}]{2})?`;

    var nonHexChars = new RegExp(`[^#${hexChars}]`, 'gi');
    var validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, 'i');

// Define HTML elements
    var content = document.getElementById('slide');
    var djAlert = document.getElementById('dj-alert');
    var easAlert = document.getElementById('eas-alert');
    var nowplaying = document.getElementById('nowplaying');
    var nowplayingseek = document.getElementById('nowplaying-seek');
    var nowplayingtime = document.getElementById('nowplaying-time');
    var nowplayinglines = document.getElementById('nowplaying-lines');
    var nowplayingline1 = document.getElementById('nowplaying-line1');
    var nowplayingline2 = document.getElementById('nowplaying-line2');
    var slidebadges = document.getElementById('slide-badges');
    var noConnection = document.getElementById("no-connection");
    var background = document.getElementById("bg-canvas");
    var wrapper = document.getElementById("wrapper");
    var flashInterval = null;
// Define variables
    var disconnected = true;
    var slide = 1;
    var Meta = {time: moment().toISOString(true)};
    var Calendar = TAFFY();
    var Announcements = TAFFY();
    var slides = {};
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
    var nowPlayingTimer;
    var isStudio = window.location.search.indexOf('studio=true') !== -1;
    var queueReminder = false;

    wrapper.width = window.innerWidth;
    wrapper.height = window.innerHeight;

// Create restart function to restart the screen after 15 seconds if it does not connect.
    var restart = setTimeout(function () {
        window.location.reload(true);
    }, 15000);

    var afterSlide = function () {};

// Create a seek progress bar in the Meta box
// DEPRECATED: We no longer support Meta.percent in WWSU
    /*
     var bar = new ProgressBar.Line(nowplayingseek, {
     strokeWidth: 4,
     easing: 'easeInOut',
     duration: 1000,
     color: '#FFFFFF',
     trailColor: 'rgba(0, 0, 0, 0)',
     trailWidth: 1,
     svgStyle: {width: '100%', height: '100%'}
     });
     */

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
        'z-index': 9999
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

    generateBG();

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

// Define functions for the analog clock
function computeTimePositions($h, $m, $s) {
    console.log(`Compute Time`);
    var now = new Date(),
            h = now.getHours(),
            m = now.getMinutes(),
            s = now.getSeconds(),
            ms = now.getMilliseconds(),
            degS, degM, degH;

    degS = (s * 6) + (6 / 1000 * ms);
    degM = (m * 6) + (6 / 60 * s) + (6 / (60 * 1000) * ms);
    degH = (h * 30) + (30 / 60 * m);

    $s.css({"transform": "rotate(" + degS + "deg)"});
    $m.css({"transform": "rotate(" + degM + "deg)"});
    $h.css({"transform": "rotate(" + degH + "deg)"});

    requestAnimationFrame(function () {
        computeTimePositions($h, $m, $s);
    });
}

function setUpFace() {
    for (var x = 1; x <= 60; x += 1) {
        addTick(x);
    }

    function addTick(n) {
        var tickClass = "smallTick",
                tickBox = $("<div class=\"faceBox\"></div>"),
                tick = $("<div></div>"),
                tickNum = "";

        if (n % 5 === 0) {
            tickClass = (n % 15 === 0) ? "largeTick" : "mediumTick";
            tickNum = $("<div class=\"tickNum\"></div>").text(n / 5).css({"transform": "rotate(-" + (n * 6) + "deg)"});
            if (n >= 50) {
                tickNum.css({"left": "-0.5em"});
            }
        }


        tickBox.append(tick.addClass(tickClass)).css({"transform": "rotate(" + (n * 6) + "deg)"});
        tickBox.append(tickNum);

        $("#clock").append(tickBox);
    }
}

function setSize() {
    var b = $(this), //html, body
            w = b.width(),
            x = Math.floor(w / 30) - 1,
            px = (x > 25 ? 26 : x) + "px";

    $("#clock").css({"font-size": px});
}

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
        calendar = [{}, [{}, {}, {}], [{}, {}, {}]];
        calendar[0][`Today ${moment(Meta.time).format('MM/DD')}`] = [];
        calendar[1][0][moment(Meta.time).add(1, 'days').format('dddd MM/DD')] = [];
        calendar[1][1][moment(Meta.time).add(2, 'days').format('dddd MM/DD')] = [];
        calendar[1][2][moment(Meta.time).add(3, 'days').format('dddd MM/DD')] = [];
        calendar[2][0][moment(Meta.time).add(4, 'days').format('dddd MM/DD')] = [];
        calendar[2][1][moment(Meta.time).add(5, 'days').format('dddd MM/DD')] = [];
        calendar[2][2][moment(Meta.time).add(6, 'days').format('dddd MM/DD')] = [];

        // Run through every event in memory, sorted by the comparison function, and add appropriate ones into our formatted calendar variable.
        Calendar().get().sort(compare)
                .filter(event => !event.title.startsWith("Genre:") && !event.title.startsWith("Playlist:"))
                .map(event =>
                {
                    try {
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
                                if (moment(event.end).isAfter(moment(looptime2)))
                                {
                                    event.endT = moment(event.end).format('MM/DD hh:mm A');
                                    event.startT = moment(event.start).format('MM/DD hh:mm A');
                                }
                                if (moment(event.start).isBefore(moment(looptime)))
                                {
                                    event.endT = moment(event.end).format('MM/DD hh:mm A');
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
                if (!isStudio)
                    responsiveVoice.speak(`Attention guests! There is a new message. ${data[key].message}`);
            }
        }
    });


    io.socket.on('connect', function () {
        onlineSocket();
        MetaSocket();
        eventSocket();
        directorSocket();
        easSocket();
        announcementsSocket();
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
    announcementsSocket();
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
            doSlide();
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

function announcementsSocket()
{
    console.log('attempting announcements socket');
    io.socket.post('/announcements/get', {type: 'display-public'}, function serverResponded(body, JWR) {
        try {
            Announcements = TAFFY();
            Announcements.insert(body);
        } catch (e) {
            console.log('FAILED CONNECTION');
            setTimeout(announcementsSocket, 10000);
        }
    });
}

// This function is called whenever a change in Eas alerts is detected, or when we are finished displaying an alert. It checks to see if we should display something Eas-related.
function doEas()
{
    try {
        return null;
        console.log(`DO EAS called`);
        // Display the new alert if conditions permit
        if ((newEas.length > 0 && !easActive))
        {
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
                easAlert.style.display = "inline";
                easAlert.innerHTML = `<div class="animated wobble" id="slide-interrupt-eas"><div style="text-align: center; color: #ffffff;">
                    <h1 style="font-size: 3em;">WWSU Emergency Alert System</h1>
                    <div class="m-3" style="color: ${color4}; font-size: 6em;">${alert}</div>
                    <div class="m-1 text-info-light" style="font-size: 2em;">${moment(newEas[0]['starts']).isValid() ? moment(newEas[0]['starts']).format("MM/DD h:mmA") : 'UNKNOWN'} - ${moment(newEas[0]['expires']).isValid() ? moment(newEas[0]['expires']).format("MM/DD h:mmA") : 'UNKNOWN'}</div>
                    <div class="m-1 text-warning-light" style="font-size: 2em;">Counties: ${(typeof newEas[0]['counties'] !== 'undefined') ? newEas[0]['counties'] : 'Unknown Counties'}</div>
                    <div id="alert-marquee" class="marquee m-3" style="color: #FFFFFF; background: rgba(${Math.round(color2.red / 2)}, ${Math.round(color2.green / 2)}, ${Math.round(color2.blue / 2)}, 0.8); font-size: 2.5em;">${text}</div>
                    </div></div>`;
                if (!isStudio)
                    responsiveVoice.speak(`Attention! A ${alert} is in effect for the counties of ${(typeof newEas[0]['counties'] !== 'undefined') ? newEas[0]['counties'] : 'Unknown Counties'}. This is in effect until ${moment(newEas[0]['expires']).isValid() ? moment(newEas[0]['expires']).format("LLL") : 'UNKNOWN'}.`);
                if (easExtreme)
                {
                    easAlert.style.display = "inline";
                    easAlert.innerHTML += `<h2 style="text-align: center; font-size: 2em;" class="text-danger"><strong>Life-threatening alert(s) in effect!</strong> Please stand by...</h2>`;
                }
                $('#alert-marquee')
                        .bind('finished', function () {
                            try {
                                easActive = false;
                                var temp = document.getElementById('alert-marquee');
                                temp.innerHTML = '';
                                clearInterval(flashInterval);
                                newEas.shift();
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
                    $("#eas-alert").css("background-color", color3);
                    setTimeout(function () {
                        $("#eas-alert").css("background-color", "#000000");
                    }, 250);
                    if (easActive && document.getElementById('slide-interrupt-eas') === null)
                    {
                        easActive = false;
                        doEas();
                    }
                }, 1000);
            } else {
                easActive = false;
                newEas.shift();
                doEas();
            }
            // If there is an extreme alert in effect, we want it to be permanently on the screen while it is in effect
        } else if (easExtreme && !easActive)
        {
            // Stop marquee screensaver if it is running
            lines.stop();
            $('#wrapper').fadeOut(500, 'linear', function () {
                lines.clear();
                wrapper.style.display = "none";
            });

            // Make background flash red every second
            clearInterval(flashInterval);
            var voiceCount = 180;
            flashInterval = setInterval(function () {
                $("#eas-alert").css("background-color", "#D50000");
                setTimeout(function () {
                    $("#eas-alert").css("background-color", "#000000");
                    voiceCount++;
                    if (voiceCount > 179)
                    {
                        voiceCount = 0;
                        if (!isStudio)
                            responsiveVoice.speak(`Danger! Danger! Life threatening alerts are in effect. Seek shelter immediately.`);
                    }
                }, 250);
            }, 1000);

            // Display the extreme alerts
            easAlert.style.display = "inline";
            easAlert.innerHTML = `<div id="slide-interrupt-eas">
            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">WWSU Emergency Alert System</h1>
            <h2 style="text-align: center; font-size: 3em;" class="text-warning">Extreme Alerts in effect</h2>
            <h2 style="text-align: center; font-size: 3em;" class="text-danger">SEEK SHELTER NOW!!!</h2>
            <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="alerts"></div></div>`;
            var innercontent = document.getElementById('alerts');
            Eas({severity: "Extreme"}).each(function (dodo) {
                try {
                    var color = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(dodo.color) ? hexRgb(dodo.color) : hexRgb('#787878');
                    var borderclass = 'black';
                    var alpha = 0.8;
                    borderclass = 'danger';
                    color = `rgba(${Math.round(color.red / 2)}, ${Math.round(color.green / 2)}, ${Math.round(color.blue / 2)}, ${alpha});`;
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
            clearInterval(flashInterval);
            easAlert.style.display = "none";
            easAlert.innerHTML = ``;
            // If we are supposed to display an EAS alert, but it is not on the screen, this is an error; put it on the screen.
        } else if (easActive && document.getElementById('slide-interrupt-eas') === null)
        {
            easActive = false;
            doEas();
        }
    } catch (e) {
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during doEas.'
        });
    }
}

// Determine if something is overflowing
function isElementOverflowing(element) {
    var overflowX = element.offsetWidth < element.scrollWidth,
            overflowY = element.offsetHeight < element.scrollHeight;

    return (overflowX || overflowY);
}

// This function is called whenever meta is changed. The parameter response contains only the meta that has changed / to be updated.
function processNowPlaying(response)
{
    if (response)
    {
        try {
            // reset ticker timer on change to queue time
            if (typeof response.queueFinish !== 'undefined')
            {
                clearInterval(nowPlayingTimer);
                clearTimeout(nowPlayingTimer);
                nowPlayingTimer = setTimeout(function () {
                    nowPlayingTick();
                    nowPlayingTimer = setInterval(nowPlayingTick, 1000);
                }, moment(Meta.queueFinish).diff(moment(Meta.queueFinish).startOf('second')));
            }
            // Reset ticker when time is provided
            else if (typeof response.time !== 'undefined')
            {
                clearInterval(nowPlayingTimer);
                clearTimeout(nowPlayingTimer);
                nowPlayingTimer = setInterval(nowPlayingTick, 1000);
            }

            // First, process now playing information
            var color = 'rgba(158, 158, 158, 0.3)';
            var progress = 50;
            var statebadge = '';
            easDelay -= 1;
            if (disconnected || typeof Meta.state === 'undefined')
            {
                statebadge = `<span class="badge badge-secondary">OFFLINE</span>`;
                djAlert.style.display = "none";
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
            var queuelength = Meta.queueFinish !== null ? Math.round(moment(Meta.queueFinish).diff(moment(Meta.time), 'seconds')) : 0;
            if (queuelength < 0)
                queuelength = 0;
            if (queuelength > 29)
                queueReminder = false;
            if (typeof response.line1 !== 'undefined')
            {
                $('#nowplaying-line1').animateCss('fadeOut', function () {
                    nowplayingline1.innerHTML = Meta.line1;
                    if (Meta.line1.length >= 80)
                    {
                        $('#nowplaying-line1')
                                .marquee({
                                    //duration in milliseconds of the marquee
                                    speed: 100,
                                    //gap in pixels between the tickers
                                    gap: 100,
                                    //time in milliseconds before the marquee will start animating
                                    delayBeforeStart: 0,
                                    //'left' or 'right'
                                    direction: 'left',
                                    //true or false - should the marquee be duplicated to show an effect of continues flow
                                    duplicated: true
                                });
                    } else {
                        $('#nowplaying-line1').animateCss('fadeIn');
                    }
                });
            }
            if (typeof response.line2 !== 'undefined')
            {
                $('#nowplaying-line2').animateCss('fadeOut', function () {
                    nowplayingline2.innerHTML = Meta.line2;
                    if (Meta.line2.length >= 80)
                    {
                        $('#nowplaying-line2')
                                .marquee({
                                    //duration in milliseconds of the marquee
                                    speed: 100,
                                    //gap in pixels between the tickers
                                    gap: 100,
                                    //time in milliseconds before the marquee will start animating
                                    delayBeforeStart: 0,
                                    //'left' or 'right'
                                    direction: 'left',
                                    //true or false - should the marquee be duplicated to show an effect of continues flow
                                    duplicated: true
                                });
                    } else {
                        $('#nowplaying-line2').animateCss('fadeIn');
                    }
                });
            }
            if ((moment(Meta.time).isAfter(moment({hour: 8, minute: 0})) && (moment(Meta.time).isBefore(moment({hour: 22, minute: 0})))) || !Meta.state.startsWith("automation_") || Meta.state === 'automation_live' || Meta.state === 'automation_sports' || Meta.state === 'automation_remote' || Meta.state === 'automation_sportsremote') {
                nowplaying.style.backgroundColor = color;
                nowplaying.style.color = 'rgba(255, 255, 255, 1)';
                nowplayinglines.style.color = 'rgba(255, 255, 255, 1)';
                nowplayingtime.style.color = 'rgba(255, 235, 59, 1)';
            } else {
                statebadge = '';
                nowplaying.style.backgroundColor = '#000000';
                nowplaying.style.color = 'rgba(255, 255, 255, 0.2)';
                nowplayingtime.style.color = 'rgba(255, 235, 59, 0.2)';
                nowplayinglines.style.color = 'rgba(255, 255, 255, 0.2)';
            }
            nowplayingtime.innerHTML = `<div class="d-flex align-items-stretch">
                        <div class="m-1" style="width: 15%;">${statebadge}</div>
                        <div class="container-fluid m-1" style="text-align: center;">${disconnected ? 'DISPLAY DISCONNECTED FROM WWSU' : moment(Meta.time).format('LLLL') || 'Unknown WWSU Time'}</div>
                        <div class="m-1" style="width: 15%;">${statebadge}</div>
                        </div>`;
            if (Meta.state === 'automation_live' && queuelength < 60 && typeof response.state === 'undefined')
            {
                djAlert.style.display = "inline";
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
                    var temp = Meta.show.split(" - ");
                    djAlert.innerHTML = `<div class="animated flip" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em;" id="countdown-text"></h1>
                    <div class="m-3" style="color: #FFCDD2; font-size: 15em;" id="countdown-clock">?</div>
                    </div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-danger">${temp[0]}</span><br />is going live in`;
                    if (!isStudio)
                        responsiveVoice.speak(`Attention guests! ${temp[0]} is about to go on the air on WWSU radio: ${temp[1]}.`);
                }
                if (queuelength >= 15)
                {
                    countdownclock.style.color = "#FFCDD2";
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio)
                        responsiveVoice.speak(`DJ is going live in less than 15 seconds`);
                    queueReminder = true;
                    countdownclock.style.color = "#FFCDD2";
                    countdownclock.innerHTML = queuelength;
                    if (!isStudio)
                    {
                        $("#dj-alert").css("background-color", "#F44336");
                        setTimeout(function () {
                            $("#dj-alert").css("background-color", "#000000");
                        }, 250);
                    }
                }

                // When a remote broadcast is about to start
            } else if (Meta.state === 'automation_remote' && queuelength < 60 && typeof response.state === 'undefined')
            {
                djAlert.style.display = "inline";
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
                    var temp = Meta.show.split(" - ");
                    djAlert.innerHTML = `<div class="animated flip" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em;" id="countdown-text"></h1>
                    <div class="m-3" style="color: #FFCDD2; font-size: 15em;" id="countdown-clock">?</div>
                    </div>
                    </div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = "Remote Broadcast starting in";
                    if (!isStudio)
                        responsiveVoice.speak(`Attention guests! A remote broadcast hosted by ${temp[0]} is about to go on the air on WWSU radio: ${temp[1]}.`);
                }
                if (queuelength >= 15)
                {
                    countdownclock.style.color = "#E1BEE7";
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio)
                        responsiveVoice.speak(`Producer is going live in less than 15 seconds`);
                    queueReminder = true;
                    countdownclock.style.color = "#E1BEE7";
                    countdownclock.innerHTML = queuelength;
                    if (!isStudio)
                    {
                        $("#dj-alert").css("background-color", "#9C27B0");
                        setTimeout(function () {
                            $("#dj-alert").css("background-color", "#000000");
                        }, 250);
                    }
                }
                // Sports broadcast about to begin
            } else if ((Meta.state === 'automation_sports' || Meta.state === 'automation_sportsremote') && queuelength < 60 && typeof response.state === 'undefined')
            {
                djAlert.style.display = "inline";
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
                    djAlert.innerHTML = `<div class="animated flip" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em;" id="countdown-text"></h1>
                    <div class="m-3" style="color: #FFCDD2; font-size: 15em;" id="countdown-clock">?</div>
                    </div>
                    </div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-success">${Meta.show}</span><br />about to broadcast in`;
                    if (!isStudio)
                        responsiveVoice.speak(`Raider up! Wright State sports, ${Meta.show}, is about to begin on WWSU radio.`);
                }
                if (queuelength >= 15)
                {
                    countdownclock.style.color = "#C8E6C9";
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio)
                        responsiveVoice.speak(`Producer is going live in less than 15 seconds`);
                    queueReminder = true;
                    countdownclock.style.color = "#C8E6C9";
                    countdownclock.innerHTML = queuelength;
                    if (!isStudio)
                    {
                        $("#dj-alert").css("background-color", "#4CAF50");
                        setTimeout(function () {
                            $("#dj-alert").css("background-color", "#000000");
                        }, 250);
                    }
                }
                // DJ is returning from a break
            } else if (Meta.state === 'live_returning' && queuelength < 60 && typeof response.state === 'undefined')
            {
                djAlert.style.display = "inline";
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
                    var temp = Meta.show.split(" - ");
                    djAlert.innerHTML = `<div class="animated flip" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em;" id="countdown-text"></h1>
                    <div class="m-3" style="color: #FFCDD2; font-size: 15em;" id="countdown-clock">?</div>
                    </div>
                    </div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-danger">${temp[0]}</span><br />is returning live in`;
                    if (!isStudio)
                        responsiveVoice.speak(`Attention guests! ${temp[0]} is about to go back on the air.`);
                }
                if (queuelength >= 15)
                {
                    countdownclock.style.color = "#FFCDD2";
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio)
                        responsiveVoice.speak(`DJ is returning live in less than 15 seconds`);
                    queueReminder = true;
                    countdownclock.style.color = "#FFCDD2";
                    countdownclock.innerHTML = queuelength;
                    if (!isStudio)
                    {
                        $("#dj-alert").css("background-color", "#F44336");
                        setTimeout(function () {
                            $("#dj-alert").css("background-color", "#000000");
                        }, 250);
                    }
                }
                // Remote broadcast is returning from a break
            } else if (Meta.state === 'remote_returning' && queuelength < 60 && typeof response.state === 'undefined')
            {
                djAlert.style.display = "inline";
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
                    djAlert.innerHTML = `<div class="animated flip" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em;" id="countdown-text"></h1>
                    <div class="m-3" style="color: #FFCDD2; font-size: 15em;" id="countdown-clock">?</div>
                    </div>
                    </div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = "Returning to remote broadcast in";
                    if (!isStudio)
                        responsiveVoice.speak(`Attention guests! ${temp[0]} is about to go back on the air.`);
                }
                if (queuelength >= 15)
                {
                    countdownclock.style.color = "#E1BEE7";
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio)
                        responsiveVoice.speak(`Producer is returning live in less than 15 seconds`);
                    queueReminder = true;
                    countdownclock.style.color = "#E1BEE7";
                    countdownclock.innerHTML = queuelength;
                    if (!isStudio)
                    {
                        $("#dj-alert").css("background-color", "#9C27B0");
                        setTimeout(function () {
                            $("#dj-alert").css("background-color", "#000000");
                        }, 250);
                    }
                }
                // Returning to a sports broadcast
            } else if ((Meta.state === 'sports_returning' || Meta.state === 'sportsremote_returning') && queuelength < 60 && typeof response.state === 'undefined')
            {
                djAlert.style.display = "inline";
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
                    djAlert.innerHTML = `<div class="animated flip" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em;" id="countdown-text"></h1>
                    <div class="m-3" style="color: #FFCDD2; font-size: 15em;" id="countdown-clock">?</div>
                    </div>
                    </div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-success">${Meta.show}</span></br>returning in`;
                    if (!isStudio)
                        responsiveVoice.speak(`Raider up! The broadcast of ${Meta.show} is about to resume.`);
                }
                if (queuelength >= 15)
                {
                    countdownclock.style.color = "#C8E6C9";
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio)
                        responsiveVoice.speak(`Producer is returning live in less than 15 seconds`);
                    queueReminder = true;
                    countdownclock.style.color = "#C8E6C9";
                    countdownclock.innerHTML = queuelength;
                    if (!isStudio)
                    {
                        $("#dj-alert").css("background-color", "#4CAF50");
                        setTimeout(function () {
                            $("#dj-alert").css("background-color", "#000000");
                        }, 250);
                    }
                }
                // Nothing special to show
            } else {
                djAlert.style.display = "none";
                djAlert.innerHTML = ``;
            }
        } catch (e) {
            console.error(e);
            iziToast.show({
                title: 'An error occurred - Please check the logs',
                message: 'Error occurred during processNowPlaying.'
            });
        }
    }
}

function nowPlayingTick()
{
    Meta.time = moment(Meta.time).add(1, 'seconds');
    processNowPlaying({});
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
        console.log(`Do Slide Called`);

        // Failsafes
        clearTimeout(slidetimer);
        slidetimer = true;

        if (!same)
            slide += 1;

        // Each call, we need to re-generate our collection of slides
        // Slide 1 is the WWSU logo and standard information
        slides[1] = {name: 'WWSU', class: 'wwsu-red', do: true, function: function () {
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
            }};
        // Slide 2 is only visible if we are not in automation, and displays who is on the air, as well as the topic if one is set.
        slides[2] = {name: 'On the Air', class: 'light', do: false, function() {
                $('#slide').animateCss('lightSpeedOut', function () {
                    var innercontent = ``;
                    if (Meta.topic.length > 2)
                    {
                        innercontent = `<h2 style="text-align: center; font-size: 3em;" class="text-danger">${Meta.show}</h2>`;
                        if ('webchat' in Meta && Meta.webchat)
                        {
                            innercontent += '<h3 style="text-align: center; font-size: 2em; color: #FFFFFF;">Tune in & Chat with the DJ: <span class="text-primary">wwsu1069.org</span></h3>';
                        } else {
                            innercontent += '<h3 style="text-align: center; font-size: 2em; color: #FFFFFF;">Tune in: <span class="text-primary">wwsu1069.org</span></h3>';
                        }
                        innercontent += `<div style="overflow-y: hidden; font-size: 3em; color: #FFFFFF; height: 320px;" class="bg-dark text-white border border-primary p-1 m-1">${Meta.topic}</div>`;
                    } else {
                        innercontent = `<h2 style="text-align: center; font-size: 3em;" class="text-danger">${Meta.show}</h2>`;
                        if ('webchat' in Meta && Meta.webchat)
                        {
                            innercontent += '<h3 style="text-align: center; font-size: 2em; color: #FFFFFF;">Tune in & Chat with the DJ: <span class="text-primary">wwsu1069.org</span></h3>';
                        } else {
                            innercontent += '<h3 style="text-align: center; font-size: 2em; color: #FFFFFF;">Tune in: <span class="text-primary">wwsu1069.org</span></h3>';
                        }
                    }
                    content.innerHTML = `<div class="animated fadeInDown">
                        <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">On the Air Right Now</h1>${innercontent}</div>`;
                    slidetimer = setTimeout(doSlide, 14000);
                });
            }};
        // Slide 4 is today's events
        slides[4] = {name: 'Events Today', class: 'success', do: true, function: function () {
                $('#slide').animateCss('fadeOutUp', function () {
                    content.innerHTML = `<div class="animated fadeInDown">
             <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Events Today</h1>
             <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="events"></div></div>`;
                    var innercontent = document.getElementById('events');
                    if (typeof calendar[0][`Today ${moment(Meta.time).format('MM/DD')}`] !== 'undefined')
                    {
                        if (calendar[0][`Today ${moment(Meta.time).format('MM/DD')}`].length > 0)
                        {
                            calendar[0][`Today ${moment(Meta.time).format('MM/DD')}`].map((dodo, index) => {
                                try {
                                    var color = hexRgb(dodo.color);
                                    var borderColor = '#000000';
                                    var timeleft = '';
                                    if (moment(Meta.time).isBefore(moment(dodo.start)))
                                    {
                                        timeleft = `Starts ${moment(Meta.time).to(moment(dodo.start))}`;
                                        color.red = Math.round(color.red / 1.5);
                                        color.green = Math.round(color.green / 1.5);
                                        color.blue = Math.round(color.blue / 1.5);
                                        borderColor = "#FFEB3B";
                                    } else if (moment(Meta.time).isAfter(moment(dodo.end)))
                                    {
                                        color.red = Math.round(color.red / 1.5);
                                        color.green = Math.round(color.green / 1.5);
                                        color.blue = Math.round(color.blue / 1.5);
                                        timeleft = `Ended ${moment(dodo.ends).from(moment(Meta.time))}`;
                                        borderColor = "#f44336";
                                    } else {
                                        color.red = Math.round(color.red / 1.5);
                                        color.green = Math.round(color.green / 1.5);
                                        color.blue = Math.round(color.blue / 1.5);
                                        timeleft = `Ends ${moment(Meta.time).to(moment(dodo.ends))}`;
                                        borderColor = "#4CAF50";
                                    }
                                    if (dodo.title.startsWith("Show: "))
                                    {
                                        var stripped = dodo.title.replace("Show: ", "");
                                        var eventType = "SHOW";
                                        var eventClass = "danger";
                                        var image = `<i class="fas fa-microphone" style="font-size: 96px;"></i>`;
                                        var temp = stripped.split(" - ");
                                        if (temp.length === 2)
                                        {
                                            var line1 = temp[0];
                                            var line2 = temp[1];
                                        } else {
                                            var line1 = "Unknown DJ"
                                            var line2 = temp;
                                        }
                                    } else if (dodo.title.startsWith("Prerecord: "))
                                    {
                                        var stripped = dodo.title.replace("Prerecord: ", "");
                                        var eventType = "PRERECORD";
                                        var eventClass = "danger-light";
                                        var image = `<i class="fas fa-play-circle" style="font-size: 96px;"></i>`;
                                        var temp = stripped.split(" - ");
                                        if (temp.length === 2)
                                        {
                                            var line1 = temp[0];
                                            var line2 = temp[1];
                                        } else {
                                            var line1 = "Unknown DJ"
                                            var line2 = temp;
                                        }
                                    } else if (dodo.title.startsWith("Remote: "))
                                    {
                                        var stripped = dodo.title.replace("Remote: ", "");
                                        var eventType = "REMOTE";
                                        var eventClass = "purple";
                                        var image = `<i class="fas fa-broadcast-tower" style="font-size: 96px;"></i>`;
                                        var temp = stripped.split(" - ");
                                        if (temp.length === 2)
                                        {
                                            var line1 = temp[0];
                                            var line2 = temp[1];
                                        } else {
                                            var line1 = "Unknown Host"
                                            var line2 = temp;
                                        }
                                    } else if (dodo.title.startsWith("Sports: "))
                                    {
                                        var stripped = dodo.title.replace("Sports: ", "");
                                        var eventType = "SPORTS";
                                        var eventClass = "success";
                                        var line1 = "Raider Sports";
                                        var line2 = stripped;
                                        var image = `<i class="fas fa-trophy" style="font-size: 96px;"></i>`;
                                    } else {
                                        var eventType = "Event";
                                        var eventClass = "secondary";
                                        var line1 = "";
                                        var line2 = dodo.title;
                                        var image = `<i class="fas fa-calendar" style="font-size: 96px;"></i>`;
                                    }
                                    color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.8);`;
                                    innercontent.innerHTML += `<div style="width: 190px; position: relative; background-color: ${color}; box-shadow: 0 0 12px 4px ${borderColor};" class="m-2 text-white rounded">
             <div class="p-1 text-center" style="width: 100%;">${image}
             <span class="notification badge badge-${eventClass}" style="font-size: 1em;">${eventType}</span>
             <div class="m-1" style="text-align: center;"><span class="text-warning-light" style="font-size: 1em;">${line1}</span><br><span style="font-size: 1.25em;">${line2}</span><br /><span class="text-info-light" style="font-size: 1em;">${dodo.startT} - ${dodo.endT}</span></div>`;
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
                            innercontent.innerHTML += `<div style="text-danger font-size: 2em; text-align: center; background-color: #363636, color: #ffffff;">There are no events today.</div>`;
                        }
                    } else {
                        innercontent.className = '';
                        innercontent.innerHTML += `<div style="text-danger font-size: 2em; text-align: center; background-color: #360000, color: #ffffff;">There was an error getting today's events.</div>`;
                    }
                    slidetimer = setTimeout(doSlide, 14000);
                });
            }};
        // Slide 5 are events for days 2-4
        slides[5] = {name: 'Days 2-4', class: 'success', do: true, function: function () {
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
                            calendar[1][0][moment(Meta.time).add(1, 'days').format('dddd MM/DD')].map((dodo, index) => {
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
                                    color.red = Math.round(color.red / 1.5);
                                    color.green = Math.round(color.green / 1.5);
                                    color.blue = Math.round(color.blue / 1.5);
                                    color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.8);`;
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
                            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.8);">
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
                        innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.8);">
             Error loading events for this day.
             </div>`;
                    }
                    if (calendar[1][1][moment(Meta.time).add(2, 'days').format('dddd MM/DD')] !== 'undefined')
                    {
                        if (calendar[1][1][moment(Meta.time).add(2, 'days').format('dddd MM/DD')].length > 0)
                        {
                            calendar[1][1][moment(Meta.time).add(2, 'days').format('dddd MM/DD')].map((dodo, index) => {
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
                                    color.red = Math.round(color.red / 1.5);
                                    color.green = Math.round(color.green / 1.5);
                                    color.blue = Math.round(color.blue / 1.5);
                                    color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.8);`;
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
                            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.8);">
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
                        innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.8);">
             Error loading events for this day.
             </div>`;
                    }
                    if (calendar[1][2][moment(Meta.time).add(3, 'days').format('dddd MM/DD')] !== 'undefined')
                    {
                        if (calendar[1][2][moment(Meta.time).add(3, 'days').format('dddd MM/DD')].length > 0)
                        {
                            calendar[1][2][moment(Meta.time).add(3, 'days').format('dddd MM/DD')].map((dodo, index) => {
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
                                    color.red = Math.round(color.red / 1.5);
                                    color.green = Math.round(color.green / 1.5);
                                    color.blue = Math.round(color.blue / 1.5);
                                    color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.8);`;
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
                            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.8);">
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
                        innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.8);">
             Error loading events for this day.
             </div>`;
                    }
                    slidetimer = setTimeout(doSlide, 14000);
                });
            }};
        slides[6] = {name: 'Days 5-7', class: 'success', do: true, function() {
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
                            calendar[2][0][moment(Meta.time).add(4, 'days').format('dddd MM/DD')].map((dodo, index) => {
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
                                    color.red = Math.round(color.red / 1.5);
                                    color.green = Math.round(color.green / 1.5);
                                    color.blue = Math.round(color.blue / 1.5);
                                    color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.8);`;
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
                            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.8);">
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
                        innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.8);">
             Error loading events for this day.
             </div>`;
                    }
                    if (calendar[2][1][moment(Meta.time).add(5, 'days').format('dddd MM/DD')] !== 'undefined')
                    {
                        if (calendar[2][1][moment(Meta.time).add(5, 'days').format('dddd MM/DD')].length > 0)
                        {
                            calendar[2][1][moment(Meta.time).add(5, 'days').format('dddd MM/DD')].map((dodo, index) => {
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
                                    color.red = Math.round(color.red / 1.5);
                                    color.green = Math.round(color.green / 1.5);
                                    color.blue = Math.round(color.blue / 1.5);
                                    color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.8);`;
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
                            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.8);">
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
                        innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.8);">
             Error loading events for this day.
             </div>`;
                    }
                    if (calendar[2][2][moment(Meta.time).add(6, 'days').format('dddd MM/DD')] !== 'undefined')
                    {
                        if (calendar[2][2][moment(Meta.time).add(6, 'days').format('dddd MM/DD')].length > 0)
                        {
                            calendar[2][2][moment(Meta.time).add(6, 'days').format('dddd MM/DD')].map((dodo, index) => {
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
                                    color.red = Math.round(color.red / 1.5);
                                    color.green = Math.round(color.green / 1.5);
                                    color.blue = Math.round(color.blue / 1.5);
                                    color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.8);`;
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
                            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.8);">
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
                        innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.8);">
             Error loading events for this day.
             </div>`;
                    }
                    slidetimer = setTimeout(doSlide, 14000);
                });
            }};
        slides[101] = {name: 'Be a DJ', class: 'purple', do: true, function() {
                $('#slide').animateCss('fadeOutUp', function () {
                    if (Meta.state.startsWith("live_"))
                    {
                        var temp = Meta.show.split(" - ");
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
            }};
        // AAUP Strike Counter
        slides[1777] = {name: 'AAUP-WSU Strike Counter', class: 'danger', do: false, function() {
                try {
                    content.innerHTML = `
            <h1 style="text-align: center; font-size: 3em; color: #FF7878">AAUP-WSU Strike</h1>
            <div style="text-align: center; font-size: 6em; color: #ff7878" id="aaup-day" class="border border-danger">Day ${moment.duration(moment(Meta.time).diff(moment("2019-01-22 00:00:00"))).format("d")}</div>
            <div style="text-align: center; font-size: 3em; color: #ffff78" id="aaup-total">Since 8am 1/22: ${moment.duration(moment(Meta.time).add(1, 'days').diff(moment("2019-01-22 08:00:00"))).format("h [hours], m [minutes], s [seconds]")}</div>
            ${directorpresent ? `<div style="text-align: center; font-size: 4em; color: #FFFFFF" class="m-3" id="aaup-strike2">Has the strike impacted you?</div><div style="text-align: center; font-size: 4em; color: #7878ff" id="aaup-strike2">Come in to make a quick recording.</div>` : ``}`;
                } catch (e) {
                    console.error(e);
                    iziToast.show({
                        title: 'An error occurred - Please check the logs',
                        message: `Error occurred in Eas iteration in doSlide.`
                    });
                }
                slidetimer = setTimeout(doSlide, 1000);
            }};

        slides[101] = {name: 'Be a DJ', class: 'purple', do: true, function() {
                $('#slide').animateCss('fadeOutUp', function () {
                    if (Meta.state.startsWith("live_"))
                    {
                        var temp = Meta.show.split(" - ");
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
            }};

        // This slide is for active Eas alerts
        slides[102] = {name: 'Weather Alerts', class: 'danger', do: false, function() {
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
                            color.red = Math.round(color.red / 1.5);
                            color.green = Math.round(color.green / 1.5);
                            color.blue = Math.round(color.blue / 1.5);
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
                            color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.8);`;
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
            }};

        if (isStudio)
        {
            slides[1777].do = true;
            slide = 1777;
            slides[slide].function();
            var temp = document.getElementById(`slidebadge-${slide}`);
            if (temp !== null)
                temp.className = `m-1 btn btn-${slides[slide].class} btn-sm`;
            return true;
        }

        // If not in power saving mode...
        if ((moment(Meta.time).isAfter(moment({hour: 8, minute: 0})) && (moment(Meta.time).isBefore(moment({hour: 22, minute: 0})))) || !Meta.state.startsWith("automation_") || Meta.state === 'automation_live' || Meta.state === 'automation_sports' || Meta.state === 'automation_remote' || Meta.state === 'automation_sportsremote')
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
                    if (!restarted)
                    {
                        processAnnouncements();
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
                        generateBG();
                    } else { // Should never happen! Trigger marquee screensaver if this happens.
                        slide = 0;
                    }
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
                    if (easActive || easExtreme)
                        return null;
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
                                color.red = Math.round(color.red / 2);
                                color.green = Math.round(color.green / 2);
                                color.blue = Math.round(color.blue / 2);
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
                                color = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.2);`;
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
    var tempslide = 10;

    // Remove all slides with announcements so as to refresh them
    for (var i = 10; i < 100; i++)
    {
        if (typeof slides[i] !== 'undefined')
            delete slides[i];
    }

    var anncCount = 0;
    Announcements({type: 'display-public'}).get().sort(compare)
            .filter(announcement => moment(Meta.time).isSameOrAfter(moment(announcement.starts)) && moment(Meta.time).isBefore(moment(announcement.expires)))
            .map(announcement =>
            {
                anncCount++;
                slides[tempslide] = {name: announcement.title, class: announcement.level, do: true, function: function () {
                        $('#slide').animateCss('slideOutUp', function () {
                            content.innerHTML = `<div class="animated fadeIn scale-wrapper" id="scale-wrapper">
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
                                    setTimeout(function () {
                                        getPageSize();
                                        scalePages($page, pageWidth, pageHeight);
                                    }, 500);
                                });

                                function getPageSize() {
                                    pageHeight = $('#scale-wrapper').height();
                                    pageWidth = $('#scale-wrapper').width();
                                }

                                function scalePages(page, maxWidth, maxHeight) {
                                    page.attr("width", `${(($('#scaled-content').height() / maxHeight) * 70)}%`);
                                    var scaleX = 1, scaleY = 1;
                                    scaleX = (maxWidth / $('#scaled-content').width()) * 0.95;
                                    scaleY = (maxHeight / $('#scaled-content').height()) * 0.70;
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

    // If there are more than 2 announcement slides, disable the days 2-4 and days 5-7 calendar slides to reduce clutter.
    if (anncCount > 2)
    {
        if (typeof slides[5] !== 'undefined')
            slides[5].do = false;
        if (typeof slides[6] !== 'undefined')
            slides[6].do = false;
    } else {
        if (typeof slides[5] !== 'undefined')
            slides[5].do = true;
        if (typeof slides[6] !== 'undefined')
            slides[6].do = true;
    }
}