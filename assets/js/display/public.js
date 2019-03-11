/* global moment, ProgressBar, io, Infinity, iziToast, responsiveVoice, Slides */

// Define the scoreboard class
class Scoreboard {

    constructor(main, wsuScore, oppScore, wsuNum, oppNum, wsuText, oppText) {

        this.ID = Math.floor(1000000 + (Math.random() * 1000000));
        this._main = main;
        this._wsuScore = wsuScore;
        this._wsuScoreValue = 0;
        this._oppScore = oppScore;
        this._oppScoreValue = 0;
        this._wsuNum = wsuNum;
        this._wsuNumValue = null;
        this._oppNum = oppNum;
        this._oppNumValue = null;
        this._wsuText = wsuText;
        this._wsuTextValue = null;
        this._oppText = oppText;
        this._oppTextValue = null;
    }

    hide() {
        $(this._main).fadeTo(500, 0);
    }

    show() {
        $(this._main).fadeTo(500, 1);
    }

    set wsuScore(value) {
        var temp = document.querySelector(this._wsuScore);
        if (temp !== null)
        {
            temp.innerHTML = value;
            if (value === null || value === ``)
                $(this._wsuScore).fadeTo(500, 0);
            if (value !== null && value !== `` && (this._wsuScoreValue === null || this._wsuScoreValue === ``))
                $(this._wsuScore).fadeTo(500, 1);
            if (value > this._wsuScoreValue)
                $(this._wsuScore).animateCss('heartBeat slower');
        }
        this._wsuScoreValue = value;
    }

    set oppScore(value) {
        var temp = document.querySelector(this._oppScore);
        if (temp !== null)
        {
            temp.innerHTML = value;
            if (value === null || value === ``)
                $(this._oppScore).fadeTo(500, 0);
            if (value !== null && value !== `` && (this._oppScoreValue === null || this._oppScoreValue === ``))
                $(this._oppScore).fadeTo(500, 1);
            if (value > this._oppScoreValue)
                $(this._oppScore).animateCss('heartBeat slower');
        }
        this._oppScoreValue = value;
    }

    set wsuNum(value) {
        var temp = document.querySelector(this._wsuNum);
        if (temp !== null)
        {
            var _this = this;
            $(this._wsuNum).fadeTo(500, 0, () => {
                temp.innerHTML = value;
                if (value !== null && value !== ``)
                    $(_this._wsuNum).fadeTo(500, 1);
            });
        }
        this._wsuNumValue = value;
    }

    set oppNum(value) {
        var temp = document.querySelector(this._oppNum);
        if (temp !== null)
        {
            var _this = this;
            $(this._oppNum).fadeTo(500, 0, () => {
                temp.innerHTML = value;
                if (value !== null && value !== ``)
                    $(_this._oppNum).fadeTo(500, 1);
            });
        }
        this._oppNumValue = value;
    }

    set wsuText(value) {
        var temp = document.querySelector(this._wsuText);
        if (temp !== null)
        {
            var _this = this;
            $(this._wsuText).fadeTo(500, 0, () => {
                temp.innerHTML = value;
                if (value !== null && value !== ``)
                    $(_this._wsuText).fadeTo(500, 1);
            });
        }
        this._wsuTextValue = value;
    }

    set oppText(value) {
        var temp = document.querySelector(this._oppText);
        if (temp !== null)
        {
            var _this = this;
            $(this._oppText).fadeTo(500, 0, () => {
                temp.innerHTML = value;
                if (value !== null && value !== ``)
                    $(_this._oppText).fadeTo(500, 1);
            });
        }
        this._oppTextValue = value;
    }

    hideTextNums() {
        $(this._wsuNum).fadeTo(500, 0);
        $(this._oppNum).fadeTo(500, 0);
        $(this._wsuText).fadeTo(500, 0);
        $(this._oppText).fadeTo(500, 0);
    }
}

try {

    // Create a new scoreboard class
    var ascoreboard = new Scoreboard('#scoreboard', '#score-wsu', '#score-opp', '#num-wsu', '#num-opp', '#text-wsu', '#text-opp');

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
    var scoreboard = document.getElementById('scoreboard');
    var nowplayingtime = document.getElementById('nowplaying-time');
    var nowplayinglines = document.getElementById('nowplaying-lines');
    var nowplayingline1 = document.getElementById('nowplaying-line1');
    var nowplayingline2 = document.getElementById('nowplaying-line2');
    var slidebadges = document.getElementById('slide-badges');
    var noConnection = document.getElementById("no-connection");
    var background = document.getElementById("bg-canvas");
    var wrapper = document.getElementById("wrapper");

    // Define data sources
    var Meta = {time: moment().toISOString(true)};
    var Calendar = new WWSUdb(TAFFY());
    // calendar is an array of arrays. calendar[0] contains an object of today's events {"label": [array of events]}. Calendar[1] contains an array of objects for days 2-4 (one object per day, {"label": [array of events]}), calendar[2] contains an array of objects for days 5-7 (one object per day, {"label": [array of events]}).
    var calendar = [{}, [{}, {}, {}], [{}, {}, {}]];
    var Announcements = new WWSUdb(TAFFY());
    var Directors = new WWSUdb(TAFFY());
    var Eas = new WWSUdb(TAFFY());
    var sportsdb = new WWSUdb(TAFFY());
    var newEas = [];
    var prevEas = [];
    var easActive = false;
    var easDelay = 5;
    var easExtreme = false;

    // Define request object; this will be populated on socket connection
    var noReq;

    // Define additional variables
    var flashInterval = null;
    var disconnected = true;
    var slide = 1;
    var slides = {};
    var directorpresent = false;
    var slidetimer = null;
    var prevline1 = '';
    var prevline2 = '';
    var prevstate = '';
    var npwait = false;
    var color3 = "#787878";
    var lastBurnIn = null;
    var nowPlayingTimer;
    var isStudio = window.location.search.indexOf('studio=true') !== -1;
    var queueReminder = false;

    wrapper.width = window.innerWidth;
    wrapper.height = window.innerHeight;

    // Define slides
    // WWSU
    Slides.newSlide({
        name: `wwsu`,
        label: `WWSU`,
        weight: 1000000,
        isSticky: false,
        color: `primary`,
        active: true,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 14,
        fitContent: false,
        html: `<div style="text-align: center; width: 100%;"><img src="../images/display/logo_true.png" style="max-height: 300px; width: auto;"></div>
                            <div id="slide-wwsu-bottom">
                            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Website: <span class="text-primary">wwsu1069.org</span></h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Line: <span class="text-warning">937-775-5554</span></h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Request Line: <span class="text-warning">937-775-5555</span></h1>
            </div>
            </div>`,
        reset: true,
        fn: ((slide) => {
            setTimeout((slide) => {
                $('#slide-wwsu-bottom').animateCss('fadeOut', function () {
                    var temp = document.getElementById('slide-wwsu-bottom');
                    if (temp !== null)
                    {
                        temp.innerHTML = `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Follow Us <span class="text-warning">@wwsu1069</span> On</h1>
            <div style="width: 100%; align-items: center; justify-content: center;" class="d-flex flex-nowrap p-3 m-3">
            <div class="flex-item m-1" style="width: 20%; text-align: center;"><img src="../images/display/facebook.png"></div>
            <div class="flex-item m-1" style="width: 20%; text-align: center;"><img src="../images/display/twitter.png"></div>
            <div class="flex-item m-1" style="width: 20%; text-align: center;"><img src="../images/display/instagram.png"></div>`;
                        $('#slide-wwsu-bottom').animateCss('fadeIn');
                    }
                });
            }, 7000);
        })
    });

    // On the Air
    Slides.newSlide({
        name: `on-air`,
        label: `On the Air`,
        weight: 999999,
        isSticky: false,
        color: `primary`,
        active: false,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 10,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">On the Air Right Now</h1><div id="ontheair"></div>`,
    });

    // Events Today
    Slides.newSlide({
        name: `events-today`,
        label: `Events Today`,
        weight: 899999,
        isSticky: false,
        color: `success`,
        active: true,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 15,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Events Today</h1><h2 style="text-align: center; font-size: 2em; color: #FFFFFF">Go to wwsu1069.org for the full weekly schedule.</h2><div style="overflow-y: hidden;" class="d-flex flex-wrap" id="events-today"></div>`,
    });

    // Events 2-4
    // Deprecated for now
    Slides.newSlide({
        name: `events-2-4`,
        label: `Days 2-4`,
        weight: 899998,
        isSticky: false,
        color: `success`,
        active: false,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 15,
        fitContent: false,
        html: `<div class="table-responsive" id="events-2-4"></div>`,
    });
    Slides.slide(`events-2-4`).active = false;

    // Events 5-7
    // Deprecated for now
    Slides.newSlide({
        name: `events-5-7`,
        label: `Days 5-7`,
        weight: 899998,
        isSticky: false,
        color: `success`,
        active: false,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 15,
        fitContent: false,
        html: `<div class="table-responsive" id="events-5-7"></div>`,
    });
    Slides.slide(`events-5-7`).active = false;

    // Be a DJ
    // WWSU
    Slides.newSlide({
        name: `be-a-dj`,
        label: `Be a DJ`,
        weight: -500000,
        isSticky: false,
        color: `purple`,
        active: true,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 14,
        fitContent: false,
        html: ``,
        reset: false,
        fn: ((slide) => {
            setTimeout(function () {
                $('.jump-text').animateCss('tada');
            }, 1500);
            setTimeout(function () {
                $('.jump-text').animateCss('tada');
            }, 3500);
            setTimeout(function () {
                $('.jump-text').animateCss('tada');
            }, 5500);
        })
    });

    // Weather alerts
    Slides.newSlide({
        name: `eas-alerts`,
        label: `EAS Alerts`,
        weight: -800000,
        isSticky: false,
        color: `danger`,
        active: false,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 15,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">WWSU EAS - Active Alerts</h1><h2 style="text-align: center; font-size: 1.5em; color: #FFFFFF">Clark, Greene, and Montgomery counties</h2><div style="overflow-y: hidden;" class="d-flex flex-wrap" id="eas-alerts"></div>`,
    });

    //scoreboard
    var changeData = (data) => {
        console.dir(data);
        switch (data.name)
        {
            case `wsuScore`:
                ascoreboard.wsuScore = data.value;
                break;
            case `oppScore`:
                ascoreboard.oppScore = data.value;
                break;
            case `wsuNum`:
                ascoreboard.wsuNum = data.value;
                break;
            case `oppNum`:
                ascoreboard.oppNum = data.value;
                break;
            case `wsuText`:
                ascoreboard.wsuText = data.value;
                break;
            case `oppText`:
                ascoreboard.oppText = data.value;
                break;
        }
    };


// Create restart function to restart the screen after 15 seconds if it does not connect.
    var restart = setTimeout(function () {
        window.location.reload(true);
    }, 15000);

    var afterSlide = function () {};

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
function processDirectors(db)
{
    // Run data manipulation process
    try {
        // Check for present directors
        directorpresent = false;
        db.each(function (director) {
            try {
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
function processCalendar(db)
{
    try {

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
        db.get()
                .sort(compare)
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

        // Process events today slide
        var innercontent = document.getElementById('events-today');
        innercontent.innerHTML = ``;
        if (typeof calendar[0][`Today ${moment(Meta.time).format('MM/DD')}`] !== 'undefined')
        {
            if (calendar[0][`Today ${moment(Meta.time).format('MM/DD')}`].length > 0)
            {
                Slides.slide(`events-today`).displayTime = 5 + (calendar[0][`Today ${moment(Meta.time).format('MM/DD')}`].length * 3);
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
                            var eventClass = "primary";
                            var image = `<i class="fas fa-microphone" style="font-size: 96px;"></i>`;
                            var temp = stripped.split(" - ");
                            if (temp.length === 2)
                            {
                                var line1 = temp[0];
                                var line2 = temp[1];
                            } else {
                                var line1 = "Unknown DJ";
                                var line2 = temp;
                            }
                        } else if (dodo.title.startsWith("Prerecord: "))
                        {
                            var stripped = dodo.title.replace("Prerecord: ", "");
                            var eventType = "PRERECORD";
                            var eventClass = "danger";
                            var image = `<i class="fas fa-play-circle" style="font-size: 96px;"></i>`;
                            var temp = stripped.split(" - ");
                            if (temp.length === 2)
                            {
                                var line1 = temp[0];
                                var line2 = temp[1];
                            } else {
                                var line1 = "Unknown DJ";
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
                                var line1 = "Unknown Host";
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
                        color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
                        innercontent.innerHTML += `<div style="width: 190px; position: relative; background-color: ${color}; border: 3px solid ${borderColor};" class="m-2 text-white rounded shadow-8">
             <div class="p-1 text-center" style="width: 100%;">${image}
             <span class="notification badge badge-${eventClass} shadow-2" style="font-size: 1em;">${eventType}</span>
             <div class="m-1" style="text-align: center;"><span class="text-warning" style="font-size: 1em; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">${line1}</span><br><span style="font-size: 1.25em; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">${line2}</span><br /><span class="text-info" style="font-size: 1em; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">${dodo.startT} - ${dodo.endT}</span></div>`;
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
                innercontent.innerHTML += `<div style="text-danger font-size: 2em; text-align: center; background-color: #363636, color: #ffffff; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">There are no events today.</div>`;
            }
        } else {
            innercontent.className = '';
            innercontent.innerHTML += `<div style="text-danger font-size: 2em; text-align: center; background-color: #360000, color: #ffffff; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">There was an error getting today's events.</div>`;
        }

        // Process days 2-4
        var temp = document.getElementById(`events-2-4`);
        temp.innerHTML = `<table style="overflow-y: hidden; text-align: center; background: rgba(0, 0, 0, 0);" class="table table-sm table-dark border-0" id="events-2-4-table">
             <thead>
             <tr style="border-style: none;">
             <th scope="col" width="32%" id="events-2-4-rowh-col1" style="border-style: none; font-size: 1.5em;">${moment(Meta.time).add(1, 'days').format('dddd MM/DD')}</th>
             <th scope="col" width="32%" id="events-2-4-rowh-col2" style="border-style: none; font-size: 1.5em;">${moment(Meta.time).add(2, 'days').format('dddd MM/DD')}</th>
             <th scope="col" width="32%" id="events-2-4-rowh-col3" style="border-style: none; font-size: 1.5em;">${moment(Meta.time).add(3, 'days').format('dddd MM/DD')}</th>
             </tr>
             </thead>
             <tbody id="events-2-4-table-body">
             </tbody>
             </table>`;
        var innercontent = document.getElementById('events-2-4-table-body');
        var displayTime = 7;
        if (calendar[1][0][moment(Meta.time).add(1, 'days').format('dddd MM/DD')] !== 'undefined')
        {
            if (calendar[1][0][moment(Meta.time).add(1, 'days').format('dddd MM/DD')].length > 0)
            {
                displayTime += calendar[1][0][moment(Meta.time).add(1, 'days').format('dddd MM/DD')].length;
                calendar[1][0][moment(Meta.time).add(1, 'days').format('dddd MM/DD')].map((dodo, index) => {
                    try {
                        var color = null;
                        var temp2 = document.getElementById(`events-2-4-row-${index}`);
                        if (temp2 === null)
                        {
                            innercontent.innerHTML += `<tr id="events-2-4-row-${index}" style="border-style: none;">
             <td width="32%" id="events-2-4-row${index}-col1" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row${index}-col2" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row${index}-col3" style="border-style: none;"></td>
             </tr>`;
                            temp2 = document.getElementById(`events-2-4-row-${index}`);
                        }
                        var innercontent2 = document.getElementById(`events-2-4-row${index}-col1`);
                        color = hexRgb(dodo.color);
                        color.red = Math.round(color.red);
                        color.green = Math.round(color.green);
                        color.blue = Math.round(color.blue);
                        color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
                        var color2 = hexRgb(dodo.color);
                        color2.red = Math.round(color2.red / 2);
                        color2.green = Math.round(color2.green / 2);
                        color2.blue = Math.round(color2.blue / 2);
                        color2 = `rgb(${color2.red}, ${color2.green}, ${color2.blue});`;
                        innercontent2.innerHTML += `<div class="container shadow-4" style="width: 100%; text-align: center; background-color: ${color2}; border: 0px solid ${color}; border-left-width: 5px;">
             <div class="row">
             <div class="col-8" style="text-align: left;">
             <span class="m-1 text-white" style="font-size: 1em;"><strong>${dodo.title}</strong></span>
             </div>
             <div class="col" style="text-align: right;">
             <span class="m-2 text-white" style="font-size: 0.75em;">${dodo.startT} to<br />${dodo.endT}</span>
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
                var temp2 = document.getElementById(`events-2-4-row-0`);
                if (temp2 === null)
                {
                    innercontent.innerHTML += `<tr id="events-2-4-row-0" style="border-style: none;">
             <td width="32%" id="events-2-4-row0-col1" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row0-col2" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row0-col3" style="border-style: none;"></td>
             </tr>`;
                    temp2 = document.getElementById(`events-2-4-row-0`);
                }
                var innercontent2 = document.getElementById(`events-2-4-row0-col1`);
                innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.8);">
             No events this day.
             </div>`;
            }
        } else {
            var temp2 = document.getElementById(`events-2-4-row-0`);
            if (temp2 === null)
            {
                innercontent.innerHTML += `<tr id="events-2-4-row-0" style="border-style: none;">
             <td width="32%" id="events-2-4-row0-col1" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row0-col2" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row0-col3" style="border-style: none;"></td>
             </tr>`;
                temp2 = document.getElementById(`events-2-4-row-0`);
            }
            var innercontent2 = document.getElementById(`events-2-4-row0-col1`);
            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.8);">
             Error loading events for this day.
             </div>`;
        }
        if (calendar[1][1][moment(Meta.time).add(2, 'days').format('dddd MM/DD')] !== 'undefined')
        {
            if (calendar[1][1][moment(Meta.time).add(2, 'days').format('dddd MM/DD')].length > 0)
            {
                displayTime += calendar[1][1][moment(Meta.time).add(2, 'days').format('dddd MM/DD')].length;
                calendar[1][1][moment(Meta.time).add(2, 'days').format('dddd MM/DD')].map((dodo, index) => {
                    try {
                        var color = null;
                        var temp2 = document.getElementById(`events-2-4-row-${index}`);
                        if (temp2 === null)
                        {
                            innercontent.innerHTML += `<tr id="events-2-4-row-${index}" style="border-style: none;">
             <td width="32%" id="events-2-4-row${index}-col1" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row${index}-col2" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row${index}-col3" style="border-style: none;"></td>
             </tr>`;
                            temp2 = document.getElementById(`events-2-4-row-${index}`);
                        }
                        var innercontent2 = document.getElementById(`events-2-4-row${index}-col2`);
                        color = hexRgb(dodo.color);
                        color.red = Math.round(color.red);
                        color.green = Math.round(color.green);
                        color.blue = Math.round(color.blue);
                        color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
                        var color2 = hexRgb(dodo.color);
                        color2.red = Math.round(color2.red / 2);
                        color2.green = Math.round(color2.green / 2);
                        color2.blue = Math.round(color2.blue / 2);
                        color2 = `rgb(${color2.red}, ${color2.green}, ${color2.blue});`;
                        innercontent2.innerHTML += `<div class="container shadow-4" style="width: 100%; text-align: center; background-color: ${color2}; border: 0px solid ${color}; border-left-width: 5px;">
             <div class="row">
             <div class="col-8" style="text-align: left;">
             <span class="m-1 text-white" style="font-size: 1em;"><strong>${dodo.title}</strong></span>
             </div>
             <div class="col" style="text-align: right;">
             <span class="m-2 text-white" style="font-size: 0.75em;">${dodo.startT} to<br />${dodo.endT}</span>
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
                var temp2 = document.getElementById(`events-2-4-row-0`);
                if (temp2 === null)
                {
                    innercontent.innerHTML += `<tr id="events-2-4-row-0" style="border-style: none;">
             <td width="32%" id="events-2-4-row0-col1" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row0-col2" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row0-col3" style="border-style: none;"></td>
             </tr>`;
                    temp2 = document.getElementById(`events-2-4-row-0`);
                }
                var innercontent2 = document.getElementById(`events-2-4-row0-col2`);
                innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.8);">
             No events this day.
             </div>`;
            }
        } else {
            var temp2 = document.getElementById(`events-2-4-row-0`);
            if (temp2 === null)
            {
                innercontent.innerHTML += `<tr id="events-2-4-row-0" style="border-style: none;">
             <td width="32%" id="events-2-4-row0-col1" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row0-col2" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row0-col3" style="border-style: none;"></td>
             </tr>`;
                temp2 = document.getElementById(`events-2-4-row-0`);
            }
            var innercontent2 = document.getElementById(`events-2-4-row0-col2`);
            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.8);">
             Error loading events for this day.
             </div>`;
        }
        if (calendar[1][2][moment(Meta.time).add(3, 'days').format('dddd MM/DD')] !== 'undefined')
        {
            if (calendar[1][2][moment(Meta.time).add(3, 'days').format('dddd MM/DD')].length > 0)
            {
                displayTime += calendar[1][2][moment(Meta.time).add(3, 'days').format('dddd MM/DD')].length;
                calendar[1][2][moment(Meta.time).add(3, 'days').format('dddd MM/DD')].map((dodo, index) => {
                    try {
                        var color = null;
                        var temp2 = document.getElementById(`events-2-4-row-${index}`);
                        if (temp2 === null)
                        {
                            innercontent.innerHTML += `<tr id="events-2-4-row-${index}" style="border-style: none;">
             <td width="32%" id="events-2-4-row${index}-col1" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row${index}-col2" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row${index}-col3" style="border-style: none;"></td>
             </tr>`;
                            temp2 = document.getElementById(`events-2-4-row-${index}`);
                        }
                        var innercontent2 = document.getElementById(`events-2-4-row${index}-col3`);
                        color = hexRgb(dodo.color);
                        color.red = Math.round(color.red);
                        color.green = Math.round(color.green);
                        color.blue = Math.round(color.blue);
                        color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
                        var color2 = hexRgb(dodo.color);
                        color2.red = Math.round(color2.red / 2);
                        color2.green = Math.round(color2.green / 2);
                        color2.blue = Math.round(color2.blue / 2);
                        color2 = `rgb(${color2.red}, ${color2.green}, ${color2.blue});`;
                        innercontent2.innerHTML += `<div class="container shadow-4" style="width: 100%; text-align: center; background-color: ${color2}; border: 0px solid ${color}; border-left-width: 5px;">
             <div class="row">
             <div class="col-8" style="text-align: left;">
             <span class="m-1 text-white" style="font-size: 1em;"><strong>${dodo.title}</strong></span>
             </div>
             <div class="col" style="text-align: right;">
             <span class="m-2 text-white" style="font-size: 0.75em;">${dodo.startT} to<br />${dodo.endT}</span>
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
                var temp2 = document.getElementById(`events-2-4-row-0`);
                if (temp2 === null)
                {
                    innercontent.innerHTML += `<tr id="events-2-4-row-0" style="border-style: none;">
             <td width="32%" id="events-2-4-row0-col1" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row0-col2" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row0-col3" style="border-style: none;"></td>
             </tr>`;
                    temp2 = document.getElementById(`events-2-4-row-0`);
                }
                var innercontent2 = document.getElementById(`events-2-4-row0-col3`);
                innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.8);">
             No events this day.
             </div>`;
            }
        } else {
            var temp2 = document.getElementById(`events-2-4-row-0`);
            if (temp2 === null)
            {
                innercontent.innerHTML += `<tr id="events-2-4-row-0" style="border-style: none;">
             <td width="32%" id="events-2-4-row0-col1" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row0-col2" style="border-style: none;"></td>
             <td width="32%" id="events-2-4-row0-col3" style="border-style: none;"></td>
             </tr>`;
                temp2 = document.getElementById(`events-2-4-row-0`);
            }
            var innercontent2 = document.getElementById(`events-2-4-row0-col3`);
            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.8);">
             Error loading events for this day.
             </div>`;
        }
        Slides.slide(`events-2-4`).displayTime = displayTime;

        // Process days 5-7
        var temp = document.getElementById(`events-5-7`);
        temp.innerHTML = `<table style="overflow-y: hidden; text-align: center; background: rgba(0, 0, 0, 0);" class="table table-sm table-dark border-0" id="events-5-7-table">
             <thead>
             <tr style="border-style: none;">
             <th scope="col" width="32%" id="events-5-7-rowh-col1" style="border-style: none; font-size: 1.5em;">${moment(Meta.time).add(4, 'days').format('dddd MM/DD')}</th>
             <th scope="col" width="32%" id="events-5-7-rowh-col2" style="border-style: none; font-size: 1.5em;">${moment(Meta.time).add(5, 'days').format('dddd MM/DD')}</th>
             <th scope="col" width="32%" id="events-5-7-rowh-col3" style="border-style: none; font-size: 1.5em;">${moment(Meta.time).add(6, 'days').format('dddd MM/DD')}</th>
             </tr>
             </thead>
             <tbody id="events-5-7-table-body">
             </tbody>
             </table>`;
        var innercontent = document.getElementById('events-5-7-table-body');
        var displayTime = 7;
        if (calendar[2][0][moment(Meta.time).add(4, 'days').format('dddd MM/DD')] !== 'undefined')
        {
            if (calendar[2][0][moment(Meta.time).add(4, 'days').format('dddd MM/DD')].length > 0)
            {
                displayTime += calendar[2][0][moment(Meta.time).add(4, 'days').format('dddd MM/DD')].length;
                calendar[2][0][moment(Meta.time).add(4, 'days').format('dddd MM/DD')].map((dodo, index) => {
                    try {
                        var color = null;
                        var temp2 = document.getElementById(`events-5-7-row-${index}`);
                        if (temp2 === null)
                        {
                            innercontent.innerHTML += `<tr id="events-5-7-row-${index}" style="border-style: none;">
             <td width="32%" id="events-5-7-row${index}-col1" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row${index}-col2" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row${index}-col3" style="border-style: none;"></td>
             </tr>`;
                            temp2 = document.getElementById(`events-5-7-row-${index}`);
                        }
                        var innercontent2 = document.getElementById(`events-5-7-row${index}-col1`);
                        color = hexRgb(dodo.color);
                        color.red = Math.round(color.red);
                        color.green = Math.round(color.green);
                        color.blue = Math.round(color.blue);
                        color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
                        var color2 = hexRgb(dodo.color);
                        color2.red = Math.round(color2.red / 2);
                        color2.green = Math.round(color2.green / 2);
                        color2.blue = Math.round(color2.blue / 2);
                        color2 = `rgb(${color2.red}, ${color2.green}, ${color2.blue});`;
                        innercontent2.innerHTML += `<div class="container shadow-4" style="width: 100%; text-align: center; background-color: ${color2}; border: 0px solid ${color}; border-left-width: 5px;">
             <div class="row">
             <div class="col-8" style="text-align: left;">
             <span class="m-1 text-white" style="font-size: 1em;"><strong>${dodo.title}</strong></span>
             </div>
             <div class="col" style="text-align: right;">
             <span class="m-2 text-white" style="font-size: 0.75em;">${dodo.startT} to<br />${dodo.endT}</span>
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
                var temp2 = document.getElementById(`events-5-7-row-0`);
                if (temp2 === null)
                {
                    innercontent.innerHTML += `<tr id="events-5-7-row-0" style="border-style: none;">
             <td width="32%" id="events-5-7-row0-col1" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row0-col2" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row0-col3" style="border-style: none;"></td>
             </tr>`;
                    temp2 = document.getElementById(`events-5-7-row-0`);
                }
                var innercontent2 = document.getElementById(`events-5-7-row0-col1`);
                innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.8);">
             No events this day.
             </div>`;
            }
        } else {
            var temp2 = document.getElementById(`events-5-7-row-0`);
            if (temp2 === null)
            {
                innercontent.innerHTML += `<tr id="events-5-7-row-0" style="border-style: none;">
             <td width="32%" id="events-5-7-row0-col1" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row0-col2" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row0-col3" style="border-style: none;"></td>
             </tr>`;
                temp2 = document.getElementById(`events-5-7-row-0`);
            }
            var innercontent2 = document.getElementById(`events-5-7-row0-col1`);
            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.8);">
             Error loading events for this day.
             </div>`;
        }
        if (calendar[2][1][moment(Meta.time).add(5, 'days').format('dddd MM/DD')] !== 'undefined')
        {
            if (calendar[2][1][moment(Meta.time).add(5, 'days').format('dddd MM/DD')].length > 0)
            {
                displayTime += calendar[2][1][moment(Meta.time).add(5, 'days').format('dddd MM/DD')].length;
                calendar[2][1][moment(Meta.time).add(5, 'days').format('dddd MM/DD')].map((dodo, index) => {
                    try {
                        var color = null;
                        var temp2 = document.getElementById(`events-5-7-row-${index}`);
                        if (temp2 === null)
                        {
                            innercontent.innerHTML += `<tr id="events-5-7-row-${index}" style="border-style: none;">
             <td width="32%" id="events-5-7-row${index}-col1" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row${index}-col2" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row${index}-col3" style="border-style: none;"></td>
             </tr>`;
                            temp2 = document.getElementById(`events-5-7-row-${index}`);
                        }
                        var innercontent2 = document.getElementById(`events-5-7-row${index}-col2`);
                        color = hexRgb(dodo.color);
                        color.red = Math.round(color.red);
                        color.green = Math.round(color.green);
                        color.blue = Math.round(color.blue);
                        color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
                        var color2 = hexRgb(dodo.color);
                        color2.red = Math.round(color2.red / 2);
                        color2.green = Math.round(color2.green / 2);
                        color2.blue = Math.round(color2.blue / 2);
                        color2 = `rgb(${color2.red}, ${color2.green}, ${color2.blue});`;
                        innercontent2.innerHTML += `<div class="container shadow-4" style="width: 100%; text-align: center; background-color: ${color2}; border: 0px solid ${color}; border-left-width: 5px;">
             <div class="row">
             <div class="col-8" style="text-align: left;">
             <span class="m-1 text-white" style="font-size: 1em;"><strong>${dodo.title}</strong></span>
             </div>
             <div class="col" style="text-align: right;">
             <span class="m-2 text-white" style="font-size: 0.75em;">${dodo.startT} to<br />${dodo.endT}</span>
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
                var temp2 = document.getElementById(`events-5-7-row-0`);
                if (temp2 === null)
                {
                    innercontent.innerHTML += `<tr id="events-5-7-row-0" style="border-style: none;">
             <td width="32%" id="events-5-7-row0-col1" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row0-col2" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row0-col3" style="border-style: none;"></td>
             </tr>`;
                    temp2 = document.getElementById(`events-5-7-row-0`);
                }
                var innercontent2 = document.getElementById(`events-5-7-row0-col2`);
                innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.8);">
             No events this day.
             </div>`;
            }
        } else {
            var temp2 = document.getElementById(`events-5-7-row-0`);
            if (temp2 === null)
            {
                innercontent.innerHTML += `<tr id="events-5-7-row-0" style="border-style: none;">
             <td width="32%" id="events-5-7-row0-col1" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row0-col2" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row0-col3" style="border-style: none;"></td>
             </tr>`;
                temp2 = document.getElementById(`events-5-7-row-0`);
            }
            var innercontent2 = document.getElementById(`events-5-7-row0-col2`);
            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.8);">
             Error loading events for this day.
             </div>`;
        }
        if (calendar[2][2][moment(Meta.time).add(6, 'days').format('dddd MM/DD')] !== 'undefined')
        {
            if (calendar[2][2][moment(Meta.time).add(6, 'days').format('dddd MM/DD')].length > 0)
            {
                displayTime += calendar[2][2][moment(Meta.time).add(6, 'days').format('dddd MM/DD')].length;
                calendar[2][2][moment(Meta.time).add(6, 'days').format('dddd MM/DD')].map((dodo, index) => {
                    try {
                        var color = null;
                        var temp2 = document.getElementById(`events-5-7-row-${index}`);
                        if (temp2 === null)
                        {
                            innercontent.innerHTML += `<tr id="events-5-7-row-${index}" style="border-style: none;">
             <td width="32%" id="events-5-7-row${index}-col1" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row${index}-col2" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row${index}-col3" style="border-style: none;"></td>
             </tr>`;
                            temp2 = document.getElementById(`events-5-7-row-${index}`);
                        }
                        var innercontent2 = document.getElementById(`events-5-7-row${index}-col3`);
                        color = hexRgb(dodo.color);
                        color.red = Math.round(color.red);
                        color.green = Math.round(color.green);
                        color.blue = Math.round(color.blue);
                        color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
                        var color2 = hexRgb(dodo.color);
                        color2.red = Math.round(color2.red / 2);
                        color2.green = Math.round(color2.green / 2);
                        color2.blue = Math.round(color2.blue / 2);
                        color2 = `rgb(${color2.red}, ${color2.green}, ${color2.blue});`;
                        innercontent2.innerHTML += `<div class="container shadow-4" style="width: 100%; text-align: center; background-color: ${color2}; border: 0px solid ${color}; border-left-width: 5px;">
             <div class="row">
             <div class="col-8" style="text-align: left;">
             <span class="m-1 text-white" style="font-size: 1em;"><strong>${dodo.title}</strong></span>
             </div>
             <div class="col" style="text-align: right;">
             <span class="m-2 text-white" style="font-size: 0.75em;">${dodo.startT} to<br />${dodo.endT}</span>
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
                var temp2 = document.getElementById(`events-5-7-row-0`);
                if (temp2 === null)
                {
                    innercontent.innerHTML += `<tr id="events-5-7-row-0" style="border-style: none;">
             <td width="32%" id="events-5-7-row0-col1" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row0-col2" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row0-col3" style="border-style: none;"></td>
             </tr>`;
                    temp2 = document.getElementById(`events-5-7-row-0`);
                }
                var innercontent2 = document.getElementById(`events-5-7-row0-col3`);
                innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(0, 0, 0, 0.8);">
             No events this day.
             </div>`;
            }
        } else {
            var temp2 = document.getElementById(`events-5-7-row-0`);
            if (temp2 === null)
            {
                innercontent.innerHTML += `<tr id="events-5-7-row-0" style="border-style: none;">
             <td width="32%" id="events-5-7-row0-col1" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row0-col2" style="border-style: none;"></td>
             <td width="32%" id="events-5-7-row0-col3" style="border-style: none;"></td>
             </tr>`;
                temp2 = document.getElementById(`events-5-7-row-0`);
            }
            var innercontent2 = document.getElementById(`events-5-7-row0-col3`);
            innercontent2.innerHTML += `<div class="container" style="width: 100%; text-align: center; font-size: 1em; background: rgba(255, 0, 0, 0.8);">
             Error loading events for this day.
             </div>`;
        }
        Slides.slide(`events-5-7`).displayTime = displayTime;
    } catch (e) {
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the call of processCalendar.'
        });
    }
}

// Check for new Eas alerts and push them out when necessary.
function processEas(db)
{
    // Data processing
    try {

        // First, check for new alerts and add them
        db.each(function (record)
        {
            if (prevEas.indexOf(record.ID) === -1)
                newEas.push(record);
        });

        // Check to see if any alerts are extreme, and update our previous Eas ID array
        easExtreme = false;

        prevEas = [];
        var innercontent = document.getElementById('eas-alerts');
        innercontent.innerHTML = ``;

        var makeActive = false;
        var displayTime = 7;

        db.each(function (dodo) {
            try {
                prevEas.push(dodo.ID);

                makeActive = true;
                displayTime += 4;

                if (dodo.severity === 'Extreme')
                    easExtreme = true;

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
                color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
                innercontent.innerHTML += `<div style="width: 32%; background-color: ${color};" class="d-flex align-items-stretch m-1 text-white border border-${borderclass} rounded shadow-4">
                        <div class="m-1" style="text-align: center; width: 100%"><span style="font-size: 1.5em; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">${(typeof dodo['alert'] !== 'undefined') ? dodo['alert'] : 'Unknown Alert'}</span><br />
                        <span style="font-size: 1em; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);" class="text-info">${moment(dodo['starts']).isValid() ? moment(dodo['starts']).format("MM/DD h:mmA") : 'UNKNOWN'} - ${moment(dodo['expires']).isValid() ? moment(dodo['expires']).format("MM/DD h:mmA") : 'UNKNOWN'}</span><br />
<span style="font-size: 1em; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);" class="text-warning">${(typeof dodo['counties'] !== 'undefined') ? dodo['counties'] : 'Unknown Counties'}</span><br />
<span style="font-size: 1em; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);" class="text-danger">${timeleft}</span></div>
                        </div>
                        `;

            } catch (e) {
                console.error(e);
                iziToast.show({
                    title: 'An error occurred - Please check the logs',
                    message: `Error occurred during Eas iteration in processEas.`
                });
            }
        });

        Slides.slide(`eas-alerts`).active = makeActive;
        Slides.slide(`eas-alerts`).displayTime = displayTime;
        checkSlideCounts();

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
            window.requestAnimationFrame(() => {
                waitFor(check, callback, count);
            });
        } else {
        }
    } else {
        callback();
}
}

waitFor(() => {
    return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && io.socket.isConnected());
}, () => {

    // Define hostReq object
    noReq = new WWSUreq(io.socket, `display-public`);

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
    Calendar.assignSocketEvent('calendar', io.socket);
    Calendar.setOnUpdate((data, db) => processCalendar(db));
    Calendar.setOnInsert((data, db) => processCalendar(db));
    Calendar.setOnRemove((data, db) => processCalendar(db));
    Calendar.setOnReplace((db) => processCalendar(db));

// On new directors data, update our directors memory and run the process function.
    Directors.assignSocketEvent('directors', io.socket);
    Directors.setOnUpdate((data, db) => processDirectors(db));
    Directors.setOnInsert((data, db) => processDirectors(db));
    Directors.setOnRemove((data, db) => processDirectors(db));
    Directors.setOnReplace((db) => processDirectors(db));

    // scoreboard
    sportsdb.assignSocketEvent('sports', io.socket);
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
    Eas.assignSocketEvent('eas', io.socket);
    Eas.setOnUpdate((data, db) => processEas(db));
    Eas.setOnInsert((data, db) => processEas(db));
    Eas.setOnRemove((data, db) => processEas(db));
    Eas.setOnReplace((db) => processEas(db));

    io.socket.on('display-refresh', function (data) {
        window.location.reload(true);
    });

    // When an announcement comes through
    Announcements.assignSocketEvent('announcements', io.socket);
    // Do stuff when announcements changes are made
    Announcements.setOnUpdate((data, db) => {
        Slides.removeSlide(`attn-${data.ID}`);
        createAnnouncement(data);
        checkSlideCounts();
    });
    Announcements.setOnInsert((data, db) => {
        createAnnouncement(data);
        checkSlideCounts();
    });
    Announcements.setOnRemove((data, db) => {
        Slides.removeSlide(`attn-${data}`);
        checkSlideCounts();
    });
    Announcements.setOnReplace((db) => {
        console.dir(db.get());
        // Remove all announcement slides
        Slides.allSlides()
                .filter((slide) => slide.name.startsWith(`attn-`))
                .map((slide) => Slides.removeSlide(slide.name));

        // Add slides for each announcement
        db.each((data) => createAnnouncement(data));
        checkSlideCounts();
    });
});

function onlineSocket()
{
    console.log('attempting online socket');
    noReq.request({method: 'POST', url: '/recipients/add-display', data: {host: 'display-public'}}, function (body) {
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
    try {
        Eas.replaceData(noReq, '/eas/get');
    } catch (e) {
        console.log('FAILED CONNECTION');
        setTimeout(easSocket, 10000);
    }
}

function MetaSocket()
{
    console.log('attempting Meta socket');
    noReq.request({method: 'POST', url: '/meta/get', data: {}}, function (body) {
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
    // scoreboard
    sportsdb.replaceData(noReq, '/sports/get');
}

function eventSocket()
{
    console.log('attempting event socket');
    try {
        Calendar.replaceData(noReq, '/calendar/get');
    } catch (e) {
        console.log(e);
        console.log('FAILED CONNECTION');
        setTimeout(eventSocket, 10000);
    }
}

function directorSocket()
{
    console.log('attempting director socket');
    try {
        Directors.replaceData(noReq, '/directors/get');
    } catch (e) {
        console.log('FAILED CONNECTION');
        setTimeout(directorSocket, 10000);
    }
}

function announcementsSocket()
{
    try {
        var data = [];
        noReq.request({method: 'POST', url: '/announcements/get', data: {type: 'display-public'}}, function (body) {
            data = data.concat(body);
            noReq.request({method: 'POST', url: '/announcements/get', data: {type: 'display-public-sticky'}}, function (body) {
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

// This function is called whenever a change in Eas alerts is detected, or when we are finished displaying an alert. It checks to see if we should display something Eas-related.
function doEas()
{
    try {
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
                easAlert.innerHTML = `<div class="animated heartBeat" id="slide-interrupt-eas"><div style="text-align: center; color: #ffffff;">
                    <h1 style="font-size: 3em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">WWSU Emergency Alert System</h1>
                    <div id="eas-alert-text" class="m-3" style="color: ${color4}; font-size: 6em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">${alert}</div>
                    <div class="m-1 text-info" style="font-size: 2em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">${moment(newEas[0]['starts']).isValid() ? moment(newEas[0]['starts']).format("MM/DD h:mmA") : 'UNKNOWN'} - ${moment(newEas[0]['expires']).isValid() ? moment(newEas[0]['expires']).format("MM/DD h:mmA") : 'UNKNOWN'}</div>
                    <div class="m-1 text-warning" style="font-size: 2em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Counties: ${(typeof newEas[0]['counties'] !== 'undefined') ? newEas[0]['counties'] : 'Unknown Counties'}</div>
                    <div id="alert-marquee" class="marquee m-3 shadow-4" style="color: #FFFFFF; background: rgb(${Math.round(color2.red / 2)}, ${Math.round(color2.green / 2)}, ${Math.round(color2.blue / 2)}); font-size: 2.5em;">${text}</div>
                    </div></div>`;
                if (!isStudio)
                    responsiveVoice.speak(`Attention! A ${alert} is in effect for the counties of ${(typeof newEas[0]['counties'] !== 'undefined') ? newEas[0]['counties'] : 'Unknown Counties'}. This is in effect until ${moment(newEas[0]['expires']).isValid() ? moment(newEas[0]['expires']).format("LLL") : 'UNKNOWN'}.`);
                if (easExtreme)
                {
                    easAlert.style.display = "inline";
                    easAlert.innerHTML += `<h2 style="text-align: center; font-size: 2em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" class="text-danger"><strong>Life-threatening alert(s) in effect!</strong> Please stand by...</h2>`;
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
                    var temp = document.querySelector(`#eas-alert-text`);
                    if (temp !== null)
                        temp.className = "m-3 animated pulse fast";
                    setTimeout(() => {
                        var temp = document.querySelector(`#eas-alert-text`);
                        if (temp !== null)
                            temp.className = "m-3";
                    }, 900);
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
                    $("#eas-alert").css("background-color", "#320000");
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
            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">WWSU Emergency Alert System</h1>
            <h2 style="text-align: center; font-size: 3em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" class="text-warning">Extreme Alerts in effect</h2>
            <h2 style="text-align: center; font-size: 3em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" class="text-danger">SEEK SHELTER NOW!!!</h2>
            <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="alerts"></div></div>`;
            var innercontent = document.getElementById('alerts');
            Eas({severity: "Extreme"}).each(function (dodo) {
                try {
                    var color = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(dodo.color) ? hexRgb(dodo.color) : hexRgb('#787878');
                    var borderclass = 'black';
                    borderclass = 'danger';
                    color = `rgb(${Math.round(color.red / 2)}, ${Math.round(color.green / 2)}, ${Math.round(color.blue / 2)});`;
                    innercontent.innerHTML += `<div style="width: 32%; background-color: ${color};" class="d-flex align-items-stretch m-1 text-white border border-${borderclass} rounded shadow-4">
                        <div class="m-1" style="text-align: center; width: 100%"><span style="font-size: 1.5em; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">${(typeof dodo['alert'] !== 'undefined') ? dodo['alert'] : 'Unknown Alert'}</span><br />
                        <span style="font-size: 1em; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);" class="text-info">${moment(dodo['starts']).isValid() ? moment(dodo['starts']).format("MM/DD h:mmA") : 'UNKNOWN'} - ${moment(dodo['expires']).isValid() ? moment(dodo['expires']).format("MM/DD h:mmA") : 'UNKNOWN'}</span><br />
<span style="font-size: 1em; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);" class="text-warning">${(typeof dodo['counties'] !== 'undefined') ? dodo['counties'] : 'Unknown Counties'}</span><br />
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
            var color = 'rgba(121, 85, 72, 0.3)';
            var progress = 50;
            var statebadge = '';
            easDelay -= 1;

            // scoreboard
            if (Meta.state.startsWith("sports"))
            {
                scoreboard.style.display = "inline";
                nowplaying.style.display = "none";

                if (Meta.show === "Women's Basketball")
                {
                    scoreboard.style.backgroundImage = "url(../../images/sports/mcm_womensemifinals.png)";
                } else if (Meta.show === "Men's Basketball") {
                    scoreboard.style.backgroundImage = "url(../../images/sports/mcm_mensemifinals.png)";
                }
            } else {
                nowplaying.style.display = "block";
                scoreboard.style.display = "none";
            }

            if (disconnected || typeof Meta.state === 'undefined')
            {
                statebadge = `<span class="badge badge-secondary shadow-2">OFFLINE</span>`;
                djAlert.style.display = "none";
            } else if (Meta.state.startsWith("automation_"))
            {
                statebadge = `<span class="badge badge-info shadow-2">MUSIC</span>`;
                color = 'rgba(3, 169, 244, 0.5)';
            } else if (Meta.state.startsWith("live_"))
            {
                statebadge = `<span class="badge badge-primary shadow-2">SHOW</span>`;
                color = 'rgba(231, 13, 47, 0.5)';
            } else if (Meta.state.startsWith("remote_"))
            {
                statebadge = `<span class="badge badge-purple shadow-2">REMOTE</span>`;
                color = 'rgba(103, 58, 183, 0.5)';
            } else if (Meta.state.startsWith("sports_") || Meta.state.startsWith("sportsremote_"))
            {
                statebadge = `<span class="badge badge-success shadow-2">SPORTS</span>`;
                color = 'rgba(76, 175, 80, 0.5)';
            }
            if (typeof response.state !== `undefined` || typeof response.topic !== `undefined` || typeof response.show !== `undefined`)
            {
                if (Meta.state.startsWith("live_") || Meta.state.startsWith("remote_"))
                {
                    var temp = Meta.show.split(" - ");
                    Slides.slide(`be-a-dj`).html = `<div style="text-align: center; width: 100%; font-size: 4em; color: #FFFFFF; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Interested in being <div class="text-warning jump-text">on the air</div>just like <span class="text-danger">${temp[0]}</span>?</div>
                            <div id="thebottom">
                            <div style="text-align: center; font-size: 3em; color: #FFFFFF; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Send an email to <span class="text-primary">production@wwsu1069.org</span>!</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">Class/training is free, is online, and generally only takes a few weeks.</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">You must be enrolled in at least 6 credit hours (3 for graduates) at Wright State.</div>
            </div>
            </div>`;
                } else if (Meta.state.startsWith("sports_") || Meta.state.startsWith("sportsremote_"))
                {
                    Slides.slide(`be-a-dj`).html = `<div style="text-align: center; width: 100%; font-size: 4em; color: #FFFFFF; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Want to be a <div class="text-success jump-text">sports broadcaster?</div></div>
                            <div id="thebottom">
                            <div style="text-align: center; font-size: 3em; color: #FFFFFF; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Send an email to <span class="text-primary">sports@wwsu1069.org</span>!</div>
            </div>
            </div>`;
                } else {
                    Slides.slide(`be-a-dj`).html = `<div style="text-align: center; width: 100%; font-size: 4em; color: #FFFFFF; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Interested in becoming a<div class="text-warning jump-text">DJ / radio personality?</div></div>
                            <div id="thebottom">
                            <div style="text-align: center; font-size: 3em; color: #FFFFFF; 2px 4px 3px rgba(0,0,0,0.3);">Send an email to <span class="text-primary">production@wwsu1069.org</span>!</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF; 1px 2px 2px rgba(0,0,0,0.3);">Class/training is free, is online, and generally only takes a few weeks.</div>
                            <div style="text-align: center; font-size: 1.5em; color: #FFFFFF; 1px 2px 2px rgba(0,0,0,0.3);">You must be enrolled in at least 6 credit hours (3 for graduates) at Wright State.</div>
            </div>
            </div>`
                }
                if (Meta.state.startsWith("live_") || Meta.state.startsWith("remote_") || Meta.state.startsWith("sports_") || Meta.state.startsWith("sportsremote_"))
                {
                    Slides.slide(`on-air`).active = true;
                    checkSlideCounts();
                    var innercontent = ``;
                    if (Meta.topic.length > 2)
                    {
                        Slides.slide(`on-air`).displayTime = 20;
                        innercontent = `<h2 style="text-align: center; font-size: 3em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" class="text-danger">${Meta.show}</h2>`;
                        if ('webchat' in Meta && Meta.webchat)
                        {
                            innercontent += '<h3 style="text-align: center; font-size: 2em; color: #FFFFFF; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">Tune in & Chat with the DJ: <span class="text-primary">wwsu1069.org</span></h3>';
                        } else {
                            innercontent += '<h3 style="text-align: center; font-size: 2em; color: #FFFFFF; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">Tune in: <span class="text-primary">wwsu1069.org</span></h3>';
                        }
                        innercontent += `<div style="overflow-y: hidden; font-size: 3em; color: #FFFFFF; height: 320px;" class="bg-dark-4 text-white p-1 m-1 shadow-8">${Meta.topic}</div>`;
                    } else {
                        Slides.slide(`on-air`).displayTime = 10;
                        innercontent = `<h2 style="text-align: center; font-size: 3em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" class="text-danger">${Meta.show}</h2>`;
                        if ('webchat' in Meta && Meta.webchat)
                        {
                            innercontent += '<h3 style="text-align: center; font-size: 2em; color: #FFFFFF; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">Tune in & Chat with the DJ: <span class="text-primary">wwsu1069.org</span></h3>';
                        } else {
                            innercontent += '<h3 style="text-align: center; font-size: 2em; color: #FFFFFF; text-shadow: 1px 2px 2px rgba(0,0,0,0.3);">Tune in: <span class="text-primary">wwsu1069.org</span></h3>';
                        }
                    }
                    var temp = document.getElementById(`ontheair`);
                    if (temp)
                        temp.innerHTML = innercontent;
                } else {
                    Slides.slide(`on-air`).active = false;
                    checkSlideCounts();
                }
            }
            var queuelength = Meta.queueFinish !== null ? Math.round(moment(Meta.queueFinish).diff(moment(Meta.time), 'seconds')) : 0;
            if (queuelength < 0)
                queuelength = 0;
            if (queuelength > 29)
                queueReminder = false;
            if (typeof response.line1 !== 'undefined')
            {
                var line1Timer = setTimeout(() => {
                    nowplayingline1.innerHTML = Meta.line1;
                    nowplayingline1.className = ``;
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
                    }
                }, 5000);
                $('#nowplaying-line1').animateCss('fadeOut', function () {
                    clearTimeout(line1Timer);
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
                var line2Timer = setTimeout(() => {
                    nowplayingline2.innerHTML = Meta.line2;
                    nowplayingline2.className = ``;
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
                    }
                }, 5000);
                $('#nowplaying-line2').animateCss('fadeOut', function () {
                    clearTimeout(line2Timer);
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
            nowplaying.style.backgroundColor = color;
            nowplaying.style.color = 'rgba(255, 255, 255, 1)';
            nowplayinglines.style.color = 'rgba(255, 255, 255, 1)';
            nowplayingtime.style.color = 'rgba(255, 235, 59, 1)';
            nowplayingtime.innerHTML = `<div class="d-flex align-items-stretch">
                        <div class="m-1" style="width: 15%;">${statebadge}</div>
                        <div class="container-fluid m-1" style="text-align: center; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">${disconnected ? 'DISPLAY DISCONNECTED FROM WWSU' : moment(Meta.time).format('LLLL') || 'Unknown WWSU Time'}</div>
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
                    djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" id="countdown-text"></h1>
                    <div class="m-3 bg-primary text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div>
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
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio)
                        responsiveVoice.speak(`DJ is going live in less than 15 seconds`);
                    queueReminder = true;
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
                    djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-purple text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div>                    </div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = "Remote Broadcast starting in";
                    if (!isStudio)
                        responsiveVoice.speak(`Attention guests! A remote broadcast hosted by ${temp[0]} is about to go on the air on WWSU radio: ${temp[1]}.`);
                }
                if (queuelength >= 15)
                {
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio)
                        responsiveVoice.speak(`Producer is going live in less than 15 seconds`);
                    queueReminder = true;
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
                    djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-success text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div>                      </div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-success">${Meta.show}</span><br />about to broadcast in`;
                    if (!isStudio)
                        responsiveVoice.speak(`Raider up! Wright State sports, ${Meta.show}, is about to begin on WWSU radio.`);
                }
                if (queuelength >= 15)
                {
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio)
                        responsiveVoice.speak(`Producer is going live in less than 15 seconds`);
                    queueReminder = true;
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
                    djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-primary text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div>                      </div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-danger">${temp[0]}</span><br />is returning live in`;
                    if (!isStudio)
                        responsiveVoice.speak(`Attention guests! ${temp[0]} is about to go back on the air.`);
                }
                if (queuelength >= 15)
                {
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio)
                        responsiveVoice.speak(`DJ is returning live in less than 15 seconds`);
                    queueReminder = true;
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
                    var temp = Meta.show.split(" - ");
                    djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-purple text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div>                      </div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = "Returning to remote broadcast in";
                    if (!isStudio)
                        responsiveVoice.speak(`Attention guests! ${temp[0]} is about to go back on the air.`);
                }
                if (queuelength >= 15)
                {
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio)
                        responsiveVoice.speak(`Producer is returning live in less than 15 seconds`);
                    queueReminder = true;
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
                    djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: #ffffff;" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 2px 4px 3px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-success text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div>                      </div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-success">${Meta.show}</span></br>returning in`;
                    if (!isStudio)
                        responsiveVoice.speak(`Raider up! The broadcast of ${Meta.show} is about to resume.`);
                }
                if (queuelength >= 15)
                {
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio)
                        responsiveVoice.speak(`Producer is returning live in less than 15 seconds`);
                    queueReminder = true;
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

function createAnnouncement(data) {
    if (data.type.startsWith(`display-public`))
    {
        Slides.newSlide({
            name: `attn-${data.ID}`,
            label: data.title,
            weight: 0,
            isSticky: data.type === `display-public-sticky`,
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

function checkSlideCounts() {
    /*
     var slideCount = 8;
     if (!Slides.slide(`events-2-4`).active)
     slideCount--;
     if (!Slides.slide(`events-5-7`).active)
     slideCount--;
     if (Slides.countActive() >= slideCount)
     {
     Slides.slide(`events-2-4`).active = false;
     Slides.slide(`events-5-7`).active = false;
     } else {
     Slides.slide(`events-2-4`).active = true;
     Slides.slide(`events-5-7`).active = true;
     }
     */
}