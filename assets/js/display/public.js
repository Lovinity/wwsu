/* eslint-disable linebreak-style */
/* global moment, iziToast, responsiveVoice, Slides, $, WWSUdb, TAFFY, WWSUreq */

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
        if (temp !== null) {
            temp.innerHTML = value;
            if (value === null || value === ``) { $(this._wsuScore).fadeTo(500, 0); }
            if (value !== null && value !== `` && (this._wsuScoreValue === null || this._wsuScoreValue === ``)) { $(this._wsuScore).fadeTo(500, 1); }
            if (value > this._wsuScoreValue) { $(this._wsuScore).animateCss('heartBeat slower'); }
        }
        this._wsuScoreValue = value;
    }

    set oppScore(value) {
        var temp = document.querySelector(this._oppScore);
        if (temp !== null) {
            temp.innerHTML = value;
            if (value === null || value === ``) { $(this._oppScore).fadeTo(500, 0); }
            if (value !== null && value !== `` && (this._oppScoreValue === null || this._oppScoreValue === ``)) { $(this._oppScore).fadeTo(500, 1); }
            if (value > this._oppScoreValue) { $(this._oppScore).animateCss('heartBeat slower'); }
        }
        this._oppScoreValue = value;
    }

    set wsuNum(value) {
        var temp = document.querySelector(this._wsuNum);
        if (temp !== null) {
            var _this = this;
            $(this._wsuNum).fadeTo(500, 0, () => {
                temp.innerHTML = value;
                if (value !== null && value !== ``) { $(_this._wsuNum).fadeTo(500, 1); }
            });
        }
        this._wsuNumValue = value;
    }

    set oppNum(value) {
        var temp = document.querySelector(this._oppNum);
        if (temp !== null) {
            var _this = this;
            $(this._oppNum).fadeTo(500, 0, () => {
                temp.innerHTML = value;
                if (value !== null && value !== ``) { $(_this._oppNum).fadeTo(500, 1); }
            });
        }
        this._oppNumValue = value;
    }

    set wsuText(value) {
        var temp = document.querySelector(this._wsuText);
        if (temp !== null) {
            var _this = this;
            $(this._wsuText).fadeTo(500, 0, () => {
                temp.innerHTML = value;
                if (value !== null && value !== ``) { $(_this._wsuText).fadeTo(500, 1); }
            });
        }
        this._wsuTextValue = value;
    }

    set oppText(value) {
        var temp = document.querySelector(this._oppText);
        if (temp !== null) {
            var _this = this;
            $(this._oppText).fadeTo(500, 0, () => {
                temp.innerHTML = value;
                if (value !== null && value !== ``) { $(_this._oppText).fadeTo(500, 1); }
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
    var nowplayingtime = document.getElementById('nowplaying-time');
    var nowplayinglines = document.getElementById('nowplaying-lines');
    var nowplayingline1 = document.getElementById('nowplaying-line1');
    var nowplayingline2 = document.getElementById('nowplaying-line2');
    var wrapper = document.getElementById('wrapper');

    // Define data sources
    var Meta = { time: moment().toISOString(true) };
    var Calendar = new WWSUdb(TAFFY());
    // calendar is an array of arrays. calendar[0] contains an object of today's events {"label": [array of events]}. Calendar[1] contains an array of objects for days 2-4 (one object per day, {"label": [array of events]}), calendar[2] contains an array of objects for days 5-7 (one object per day, {"label": [array of events]}).
    var Announcements = new WWSUdb(TAFFY());
    var Directors = new WWSUdb(TAFFY());
    var Eas = new WWSUdb(TAFFY());
    var Darksky = new WWSUdb(TAFFY());
    var sportsdb = new WWSUdb(TAFFY());
    var newEas = [];
    var prevEas = [];
    var easActive = false;
    // LINT LIES: easDelay is used.
    // eslint-disable-next-line no-unused-vars
    var easDelay = 5;
    var easExtreme = false;

    // Define request object; this will be populated on socket connection
    var noReq;

    // Define additional variables
    var flashInterval = null;
    var processCalendarTimer;
    var disconnected = true;
    var slides = {};
    // LINT LIES: directorpresent is used.
    // eslint-disable-next-line no-unused-vars
    var directorpresent = false;
    var nowPlayingTimer;
    var temp;
    var isStudio = window.location.search.indexOf('studio=true') !== -1;
    var isLightTheme = window.location.search.indexOf('light=true') !== -1;
    var weatherSlide = [
        { id: `weather`, icon: `fa-sun`, background: `#424242`, header: `Current Weather`, body: `Unknown`, show: true },
        { id: `precipitation`, icon: `fa-umbrella`, background: `#424242`, header: `Precipitation`, body: ``, show: false },
        { id: `wind`, icon: `fa-wind`, background: `#424242`, header: `Wind`, body: ``, show: false },
        { id: `uv`, icon: `fa-sun`, background: `#424242`, header: `UV Index`, body: ``, show: false },
        { id: `visibility`, icon: `fa-car`, background: `#424242`, header: `Visibility`, body: ``, show: false },
        { id: `windchill`, icon: `fa-temperature-low`, background: `#424242`, header: `Wind Chill`, body: ``, show: false },
        { id: `heatindex`, icon: `fa-temperature-high`, background: `#424242`, header: `Heat Index`, body: ``, show: false },
    ];
    var weatherSlideSlot = -1;

    setInterval(() => {
        var done = false;

        if (weatherSlide.length === 0) { return null; }

        while (!done) {
            weatherSlideSlot++;
            if (typeof weatherSlide[weatherSlideSlot] === `undefined`) { weatherSlideSlot = 0; }

            if (weatherSlide[weatherSlideSlot].show || weatherSlideSlot === 0) {
                document.querySelector(`#weather-background`).style.background = weatherSlide[weatherSlideSlot].background;
                document.querySelector(`#weather-icon`).innerHTML = `<i class="fas ${weatherSlide[weatherSlideSlot].icon}" style="font-size: 64px;"></i>`;
                document.querySelector(`#weather-header`).innerHTML = `<strong>${weatherSlide[weatherSlideSlot].header}</strong>`;
                document.querySelector(`#weather-body`).innerHTML = weatherSlide[weatherSlideSlot].body;
                done = true;
            }
        }
    }, 7000);

    if (isLightTheme) {
        document.body.style.backgroundColor = `#ffffff`;
        document.body.style.color = `#000000`;
        temp = document.querySelector(`#bg-canvas`);
        temp.style.opacity = 0.5;
        temp = document.querySelector(`#dj-alert`);
        temp.style.backgroundColor = `#ffffff`;
    }
    var queueReminder = false;

    wrapper.width = window.innerWidth;
    wrapper.height = window.innerHeight;

    Slides.newSlide({
        name: `weekly-stats`,
        label: `Weekly Stats`,
        weight: 1000000,
        isSticky: false,
        color: `success`,
        active: true,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 15,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 7vh; color: #FFFFFF">Analytics last 7 days</h1><div style="overflow-y: hidden; overflow-x: hidden; font-size: 3vh;" class="container-full p-2 m-1 text-white scale-content" id="analytics"></div>`
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
        html: `<h1 style="text-align: center; font-size: 3em; color: ${!isLightTheme ? `#ffffff` : `#000000`}">On the Air Right Now</h1><div id="ontheair"></div>`,
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
        fitContent: true,
        html: `<h1 style="text-align: center; font-size: 3em; color: ${!isLightTheme ? `#ffffff` : `#000000`}">WWSU EAS - Active Alerts</h1><h2 style="text-align: center; font-size: 1.5em; color: ${!isLightTheme ? `#ffffff` : `#000000`}">Clark, Greene, and Montgomery counties</h2><div style="overflow-y: hidden;" class="d-flex flex-wrap" id="eas-alerts"></div>`,
    });

    //scoreboard
    var changeData = (data) => {
        console.dir(data);
        switch (data.name) {
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
    var restart = setTimeout(() => {
        window.location.reload(true);
    }, 15000);

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

    var colors = ['#FF0000', '#00FF00', '#0000FF']; var Scolor = 0; var delay = 300000; var scrollDelay = 15000;

} catch (e) {
    console.error(e);
    iziToast.show({
        title: 'An error occurred - Please check the logs',
        message: 'Error occurred when setting up initial variables and/or burnguard.'
    });
}

function burnGuardAnimate() {
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
            // eslint-disable-next-line callback-return
            { callback(); }
        });

        return this;
    }
});

// Process Director data when received by updating local database and marking if a director is present.
function processDirectors(db) {
    // Run data manipulation process
    try {
        // Check for present directors
        directorpresent = false;
        db.each((director) => {
            try {
                if (director.present) { directorpresent = true; }
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

// Update the calendar slides
function processCalendar(db) {
    try {

        // Define a comparison function that will order calendar events by start time when we run the iteration
        var compare = function (a, b) {
            try {
                if (moment(a.start).valueOf() < moment(b.start).valueOf()) { return -1; }
                if (moment(a.start).valueOf() > moment(b.start).valueOf()) { return 1; }
                if (a.ID < b.ID) { return -1; }
                if (a.ID > b.ID) { return 1; }
                return 0;
            } catch (e) {
                console.error(e);
                iziToast.show({
                    title: 'An error occurred - Please check the logs',
                    message: `Error occurred in the compare function of Calendar.sort in the Calendar[0] call.`
                });
            }
        };

        var innercontent = document.getElementById('events-today');
        innercontent.innerHTML = ``;

        // Run through the events for the next 24 hours and add them to the coming up panel
        db.get()
            .filter(event => !event.title.startsWith('Genre:') && !event.title.startsWith('Playlist:') && !event.title.startsWith('OnAir Studio Prerecord Bookings') && moment(event.start).isBefore(moment(Meta.time).add(1, 'days')) && moment(event.end).isAfter(moment(Meta.time)))
            .sort(compare)
            .map(event => {
                try {
                    // null start or end? Use a default to prevent errors.
                    if (!moment(event.start).isValid()) { event.start = moment(Meta.time).startOf('day'); }
                    if (!moment(event.end).isValid()) { event.end = moment(Meta.time).add(1, 'days').startOf('day'); }

                    event.startT = moment(event.start).format('MM/DD hh:mm A');
                    event.endT = moment(event.end).format('hh:mm A');

                    if (moment(event.end).startOf('day').isAfter(moment(event.start).startOf('day'))) {
                        event.endT = moment(event.end).format('MM/DD hh:mm A');
                    }

                    var color = hexRgb(event.color);
                    var line1;
                    var line2;
                    var stripped;
                    var image;
                    var temp;
                    if (event.active < 1) { color = hexRgb(`#161616`); }
                    color.red = Math.round(color.red / 3);
                    color.green = Math.round(color.green / 3);
                    color.blue = Math.round(color.blue / 3);
                    var badgeInfo = ``;
                    if (event.active === 2) {
                        badgeInfo = `<span class="text-white" style="font-size: 1vh;"><strong>TIME UPDATED</strong></span>`;
                    }
                    if (event.active === -1) {
                        badgeInfo = `<span class="text-white" style="font-size: 1vh;"><strong>CANCELED</strong></span>`;
                    }
                    if (event.title.startsWith('Show: ')) {
                        stripped = event.title.replace('Show: ', '');
                        image = `<i class="fas fa-microphone ${!isLightTheme ? `text-white` : `text-primary`}" style="font-size: 36px;"></i>`;
                        temp = stripped.split(' - ');
                        if (temp.length === 2) {
                            line1 = temp[0];
                            line2 = temp[1];
                        } else {
                            line1 = 'Unknown DJ';
                            line2 = temp;
                        }
                    } else if (event.title.startsWith('Prerecord: ')) {
                        stripped = event.title.replace('Prerecord: ', '');
                        image = `<i class="fas fa-play-circle ${!isLightTheme ? `text-white` : `text-primary`}" style="font-size: 36px;"></i>`;
                        temp = stripped.split(' - ');
                        if (temp.length === 2) {
                            line1 = temp[0];
                            line2 = temp[1];
                        } else {
                            line1 = 'Unknown DJ';
                            line2 = temp;
                        }
                    } else if (event.title.startsWith('Remote: ')) {
                        stripped = event.title.replace('Remote: ', '');
                        image = `<i class="fas fa-broadcast-tower ${!isLightTheme ? `text-white` : `text-purple`}" style="font-size: 36px;"></i>`;
                        temp = stripped.split(' - ');
                        if (temp.length === 2) {
                            line1 = temp[0];
                            line2 = temp[1];
                        } else {
                            line1 = 'Unknown Host';
                            line2 = temp;
                        }
                    } else if (event.title.startsWith('Sports: ')) {
                        stripped = event.title.replace('Sports: ', '');
                        line1 = 'Raider Sports';
                        line2 = stripped;
                        image = `<i class="fas fa-trophy ${!isLightTheme ? `text-white` : `text-success`}" style="font-size: 36px;"></i>`;
                    } else {
                        line1 = '';
                        line2 = event.title;
                        image = `<i class="fas fa-calendar ${!isLightTheme ? `text-white` : `text-secondary`}" style="font-size: 36px;"></i>`;
                    }
                    color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
                    innercontent.innerHTML += `
                        <div class="row shadow-2 m-1" style="background: ${color}; font-size: 1.5vh;">
                            <div class="col-2 text-white">
                                ${image}
                            </div>
                            <div class="col-10 text-white">
                                <strong>${line1}${line1 !== '' ? ` - ` : ``}${line2}</strong><br />
                                ${event.startT} - ${event.endT}<br />
                                ${badgeInfo}
                            </div>
                        </div>`;

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
function processEas(db) {
    // Data processing
    try {

        // First, check for new alerts and add them
        db.each((record) => {
            if (prevEas.indexOf(record.ID) === -1) { newEas.push(record); }
        });

        // Check to see if any alerts are extreme, and update our previous Eas ID array
        easExtreme = false;

        prevEas = [];
        var innercontent = document.getElementById('eas-alerts');
        innercontent.innerHTML = ``;

        // eslint-disable-next-line no-unused-vars
        var makeActive = false;
        // eslint-disable-next-line no-unused-vars
        var displayTime = 7;

        db.each((dodo) => {
            try {
                prevEas.push(dodo.ID);

                makeActive = true;
                displayTime += 4;

                if (dodo.severity === 'Extreme') { easExtreme = true; }

                var color = (typeof dodo.color !== 'undefined' && /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(dodo.color)) ? hexRgb(dodo.color) : hexRgb('#787878');
                var borderclass = 'black';
                color.red = Math.round(color.red / 2);
                color.green = Math.round(color.green / 2);
                color.blue = Math.round(color.blue / 2);
                if (typeof dodo['severity'] !== 'undefined') {
                    if (dodo['severity'] === 'Extreme') {
                        borderclass = 'danger';
                    } else if (dodo['severity'] === 'Severe') {
                        borderclass = 'warning';
                    } else if (dodo['severity'] === 'Moderate') {
                        borderclass = 'primary';
                    }
                }
                // LINT LIES: This variable is used.
                // eslint-disable-next-line no-unused-vars
                var timeleft = '';
                if (moment(Meta.time).isBefore(moment(dodo.starts))) {
                    timeleft = `Effective ${moment(Meta.time).to(moment(dodo.starts))}`;
                } else if (moment(Meta.time).isAfter(moment(dodo.expires))) {
                    timeleft = `Expired ${moment(dodo.expires).from(moment(Meta.time))}`;
                } else {
                    timeleft = `Expires ${moment(Meta.time).to(moment(dodo.expires))}`;
                }
                color = `rgb(${color.red}, ${color.green}, ${color.blue});`;
                if (isLightTheme) {
                    color = `rgb(${(color.red / 4) + 191}, ${(color.green / 4) + 191}, ${(color.blue / 4) + 191});`;
                }
                innercontent.innerHTML += `<div style="width: 32%;" class="d-flex align-items-stretch m-1 ${!isLightTheme ? `text-white` : `text-dark`} border border-${borderclass} rounded shadow-4 ${!isLightTheme ? `bg-dark-4` : `bg-light-1`}">
                        <div class="m-1" style="text-align: center; width: 100%"><span class="${!isLightTheme ? `text-white` : `text-dark`}" style="font-size: 1.5em;">${(typeof dodo['alert'] !== 'undefined') ? dodo['alert'] : 'Unknown Alert'}</span><br />
                        <span style="font-size: 1em;" class="${!isLightTheme ? `text-white` : `text-dark`}">${moment(dodo['starts']).isValid() ? moment(dodo['starts']).format('MM/DD h:mmA') : 'UNKNOWN'} - ${moment(dodo['expires']).isValid() ? moment(dodo['expires']).format('MM/DD h:mmA') : 'UNKNOWN'}</span><br />
<span style="font-size: 1em;" class="${!isLightTheme ? `text-white` : `text-dark`}">${(typeof dodo['counties'] !== 'undefined') ? dodo['counties'] : 'Unknown Counties'}</span><br /></div>
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

        if (prevEas.length === 0) {
            innercontent.HTML = `<strong class="text-white">No active alerts</strong>`;
        }

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

function waitFor(check, callback, count = 0) {
    if (!check()) {
        if (count < 10000) {
            count++;
            window.requestAnimationFrame(() => {
                waitFor(check, callback, count);
            });
        } else {
        }
    } else {
        return callback();
    }
}

waitFor(() => {
    return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && io.socket.isConnected());
}, () => {

    // Define hostReq object
    noReq = new WWSUreq(io.socket, `display-public`);

    // When new Meta is received, update it in our memory and then run the process function.
    io.socket.on('meta', (data) => {
        try {
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
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

    // Update weekly analytics
    io.socket.on('analytics-weekly-dj', (data) => {
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

    // On new calendar data, update our calendar memory and run the process function in the next 5 seconds.
    Calendar.assignSocketEvent('calendar', io.socket);
    Calendar.setOnUpdate((data, db) => {
        clearTimeout(processCalendarTimer);
        processCalendarTimer = setTimeout(() => {
            processCalendar(db);
        }, 5000);
    });
    Calendar.setOnInsert((data, db) => {
        clearTimeout(processCalendarTimer);
        processCalendarTimer = setTimeout(() => {
            processCalendar(db);
        }, 5000);
    });
    Calendar.setOnRemove((data, db) => {
        clearTimeout(processCalendarTimer);
        processCalendarTimer = setTimeout(() => {
            processCalendar(db);
        }, 5000);
    });
    Calendar.setOnReplace((db) => {
        clearTimeout(processCalendarTimer);
        processCalendarTimer = setTimeout(() => {
            processCalendar(db);
        }, 5000);
    });

    // On new directors data, update our directors memory and run the process function.
    Directors.assignSocketEvent('directors', io.socket);
    Directors.setOnUpdate((data, db) => processDirectors(db));
    Directors.setOnInsert((data, db) => processDirectors(db));
    Directors.setOnRemove((data, db) => processDirectors(db));
    Directors.setOnReplace((db) => processDirectors(db));

    Darksky.assignSocketEvent('darksky', io.socket);
    Darksky.setOnUpdate((data, db) => processDarksky(db));
    Darksky.setOnInsert((data, db) => processDarksky(db));
    Darksky.setOnRemove((data, db) => processDarksky(db));
    Darksky.setOnReplace((db) => processDarksky(db));

    // scoreboard
    sportsdb.assignSocketEvent('sports', io.socket);
    sportsdb.setOnInsert((data) => {
        changeData(data);
    });

    sportsdb.setOnUpdate((data) => {
        changeData(data);
    });

    sportsdb.setOnReplace((db) => {
        db.each((record) => {
            changeData(record);
        });
    });

    // on messages, display message if event is an insert
    io.socket.on('messages', (data) => {
        for (var key in data) {
            if (data.hasOwnProperty(key) && key === 'insert') {
                iziToast.show({
                    title: 'Message',
                    message: data[key].message,
                    timeout: 60000,
                    backgroundColor: '#FFF59D',
                    color: '#FFF59D',
                    progressBarColor: '#FFF59D',
                    overlayColor: 'rgba(255, 255, 54, 0.1)',
                    closeOnClick: true,
                    titleSize: '2em',
                    messageSize: '1.5em',
                    balloon: true,
                    zindex: 999,
                });
                if (!isStudio) { responsiveVoice.speak(`Attention guests! There is a new message. ${data[key].message}`); }
            }
        }
    });


    io.socket.on('connect', () => {
        onlineSocket();
        MetaSocket();
        eventSocket();
        directorSocket();
        easSocket();
        announcementsSocket();
        darkskySocket();
        weeklyDJSocket();
        if (disconnected) {
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
    darkskySocket();
    weeklyDJSocket();
    if (disconnected) {
        //noConnection.style.display = "none";
        disconnected = false;
        clearTimeout(restart);
    }

    io.socket.on('disconnect', () => {
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
        if (!disconnected) {
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

    io.socket.on('display-refresh', () => {
        window.location.reload(true);
    });

    // When an announcement comes through
    Announcements.assignSocketEvent('announcements', io.socket);
    // Do stuff when announcements changes are made
    Announcements.setOnUpdate((data) => {
        Slides.removeSlide(`attn-${data.ID}`);
        createAnnouncement(data);
        checkSlideCounts();
    });
    Announcements.setOnInsert((data) => {
        createAnnouncement(data);
        checkSlideCounts();
    });
    Announcements.setOnRemove((data) => {
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

function onlineSocket() {
    console.log('attempting online socket');
    noReq.request({ method: 'POST', url: '/recipients/add-display', data: { host: 'display-public' } }, () => {
        try {
        } catch (unusedE) {
            console.log('FAILED ONLINE CONNECTION');
            setTimeout(onlineSocket, 10000);
        }
    });
}

function easSocket() {
    console.log('attempting eas socket');
    try {
        Eas.replaceData(noReq, '/eas/get');
    } catch (unusedE) {
        console.log('FAILED CONNECTION');
        setTimeout(easSocket, 10000);
    }
}

function MetaSocket() {
    console.log('attempting Meta socket');
    noReq.request({ method: 'POST', url: '/meta/get', data: {} }, (body) => {
        try {
            temp = body;
            for (var key in temp) {
                if (temp.hasOwnProperty(key)) {
                    Meta[key] = temp[key];
                }
            }
            processNowPlaying(temp);
        } catch (unusedE) {
            console.log('FAILED CONNECTION');
            setTimeout(MetaSocket, 10000);
        }
    });
    // scoreboard
    sportsdb.replaceData(noReq, '/sports/get');
}

function eventSocket() {
    console.log('attempting event socket');
    try {
        Calendar.replaceData(noReq, '/calendar/get');
    } catch (e) {
        console.log(e);
        console.log('FAILED CONNECTION');
        setTimeout(eventSocket, 10000);
    }
}

function directorSocket() {
    console.log('attempting director socket');
    try {
        Directors.replaceData(noReq, '/directors/get');
    } catch (unusedE) {
        console.log('FAILED CONNECTION');
        setTimeout(directorSocket, 10000);
    }
}

// Replace all Status data with that of body request
function weeklyDJSocket() {
    console.log('attempting weeklyDJ socket');
    noReq.request({ method: 'POST', url: '/analytics/weekly-dj', data: {} }, (body) => {
        try {
            processWeeklyStats(body);
        } catch (e) {
            console.error(e);
            console.log('FAILED WEEKLYDJ CONNECTION');
            setTimeout(weeklyDJSocket, 10000);
        }
    });
}

function darkskySocket() {
    console.log('attempting darksky socket');
    try {
        Darksky.replaceData(noReq, '/darksky/get');
    } catch (unusedE) {
        console.log('FAILED CONNECTION');
        setTimeout(darkskySocket, 10000);
    }
}

function announcementsSocket() {
    try {
        var data = [];
        noReq.request({ method: 'POST', url: '/announcements/get', data: { type: 'display-public' } }, (body) => {
            data = data.concat(body);
            noReq.request({ method: 'POST', url: '/announcements/get', data: { type: 'display-public-sticky' } }, (body) => {
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
function doEas() {
    try {
        console.log(`DO EAS called`);
        // Display the new alert if conditions permit
        if ((newEas.length > 0 && !easActive)) {
            // Make sure alert is valid. Also, only scroll severe and extreme alerts when there is an extreme alert in effect; ignore moderate and minor alerts.
            if (typeof newEas[0] !== 'undefined' && (!easExtreme || (easExtreme && (newEas[0]['severity'] === 'Extreme' || newEas[0]['severity'] === 'Severe')))) {
                easActive = true;

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
                easAlert.style.display = 'inline';
                easAlert.style.backgroundColor = `#0000ff`;
                easAlert.innerHTML = `<div class="animated heartBeat" id="slide-interrupt-eas"><div style="text-align: center; color: #ffffff;">
                    <h1 style="font-size: 3em;">WWSU Emergency Alert System</h1>
                    <div id="eas-alert-text" class="m-3 text-white" style="font-size: 6em;">${alert}</div>
                    <div class="m-1 text-white" style="font-size: 2em;">Effective ${moment(newEas[0]['starts']).isValid() ? moment(newEas[0]['starts']).format('MM/DD h:mmA') : 'UNKNOWN'} - ${moment(newEas[0]['expires']).isValid() ? moment(newEas[0]['expires']).format('MM/DD h:mmA') : 'UNKNOWN'}</div>
                    <div class="m-1 text-white" style="font-size: 2em;">for the counties ${(typeof newEas[0]['counties'] !== 'undefined') ? newEas[0]['counties'] : 'Unknown Counties'}</div>
                    <div id="alert-marquee" class="marquee m-3 shadow-4" style="color: #FFFFFF; background: rgb(${Math.round(color2.red / 4)}, ${Math.round(color2.green / 4)}, ${Math.round(color2.blue / 4)}); font-size: 2.5em;">${text}</div>
                    </div></div>`;
                if (isLightTheme) { responsiveVoice.speak(`Attention! A ${alert} is in effect for the counties of ${(typeof newEas[0]['counties'] !== 'undefined') ? newEas[0]['counties'] : 'Unknown Counties'}. This is in effect until ${moment(newEas[0]['expires']).isValid() ? moment(newEas[0]['expires']).format('LLL') : 'UNKNOWN'}.`); }
                if (easExtreme) {
                    easAlert.style.display = 'inline';
                    easAlert.innerHTML += `<h2 style="text-align: center; font-size: 2em;" class="text-white"><strong>LIFE-THREATENING ALERTS IN EFFECT!</strong> Please stand by for details...</h2>`;
                }
                $('#alert-marquee')
                    .bind('finished', () => {
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
                /*
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
        */
            } else {
                easActive = false;
                newEas.shift();
                doEas();
            }
            // If there is an extreme alert in effect, we want it to be permanently on the screen while it is in effect
        } else if (easExtreme && !easActive) {

            // Make background flash red every second
            clearInterval(flashInterval);
            var voiceCount = 180;
            flashInterval = setInterval(() => {
                $('#eas-alert').css('background-color', '#D50000');
                setTimeout(() => {
                    $('#eas-alert').css('background-color', !isLightTheme ? `#320000` : `#f6cccc`);
                    voiceCount++;
                    if (voiceCount > 179) {
                        voiceCount = 0;
                        if (!isStudio) { responsiveVoice.speak(`Danger! Danger! Life threatening alerts are in effect. Seek shelter immediately.`); }
                    }
                }, 250);
            }, 1000);

            // Display the extreme alerts
            easAlert.style.display = 'inline';
            easAlert.innerHTML = `<div id="slide-interrupt-eas">
            <h1 style="text-align: center; font-size: 3em; color: ${!isLightTheme ? `#ffffff` : `#000000`};">WWSU Emergency Alert System</h1>
            <h2 style="text-align: center; font-size: 3em;" class="${!isLightTheme ? `text-white` : `text-dark`}">Extreme Alerts in effect</h2>
            <h2 style="text-align: center; font-size: 3em;" class="${!isLightTheme ? `text-white` : `text-dark`}">SEEK SHELTER NOW!!!</h2>
            <div style="overflow-y: hidden;" class="d-flex flex-wrap" id="alerts"></div></div>`;
            var innercontent = document.getElementById('alerts');
            Eas.db({ severity: 'Extreme' }).each((dodo) => {
                try {
                    var color = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(dodo.color) ? hexRgb(dodo.color) : hexRgb('#787878');
                    var borderclass = 'black';
                    borderclass = 'danger';
                    color = `rgb(${Math.round(color.red / 4)}, ${Math.round(color.green / 4)}, ${Math.round(color.blue / 4)});`;
                    innercontent.innerHTML += `<div style="width: 32%;${!isLightTheme ? `background-color: ${color}` : ``}" class="d-flex align-items-stretch m-1 ${!isLightTheme ? `text-white` : `text-dark bg-light-1`} border border-${borderclass} rounded shadow-4">
                        <div class="m-1" style="text-align: center; width: 100%"><span style="font-size: 1.5em;">${(typeof dodo['alert'] !== 'undefined') ? dodo['alert'] : 'Unknown Alert'}</span><br />
                        <span style="font-size: 1em;" class="${!isLightTheme ? `text-white` : `text-dark`}">${moment(dodo['starts']).isValid() ? moment(dodo['starts']).format('MM/DD h:mmA') : 'UNKNOWN'} - ${moment(dodo['expires']).isValid() ? moment(dodo['expires']).format('MM/DD h:mmA') : 'UNKNOWN'}</span><br />
<span style="font-size: 1em;" class="${!isLightTheme ? `text-white` : `text-dark`}">${(typeof dodo['counties'] !== 'undefined') ? dodo['counties'] : 'Unknown Counties'}</span><br />
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
        } else if (!easExtreme && !easActive && document.getElementById('slide-interrupt-eas') !== null) {
            clearInterval(flashInterval);
            easAlert.style.display = 'none';
            easAlert.innerHTML = ``;
            // If we are supposed to display an EAS alert, but it is not on the screen, this is an error; put it on the screen.
        } else if (easActive && document.getElementById('slide-interrupt-eas') === null) {
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

// This function is called whenever meta is changed. The parameter response contains only the meta that has changed / to be updated.
function processNowPlaying(response) {
    if (response) {
        try {
            // reset ticker timer on change to queue time
            if (typeof response.queueFinish !== 'undefined') {
                clearInterval(nowPlayingTimer);
                clearTimeout(nowPlayingTimer);
                nowPlayingTimer = setTimeout(() => {
                    nowPlayingTick();
                    nowPlayingTimer = setInterval(nowPlayingTick, 1000);
                }, moment(Meta.queueFinish).diff(moment(Meta.queueFinish).startOf('second')));
            }
            // Reset ticker when time is provided
            else if (typeof response.time !== 'undefined') {
                clearInterval(nowPlayingTimer);
                clearTimeout(nowPlayingTimer);
                nowPlayingTimer = setInterval(nowPlayingTick, 1000);
            }

            // April Fool's
            if (typeof response.trackID !== `undefined` && parseInt(response.trackID) >= 74255 && parseInt(response.trackID) <= 74259) {
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

            // First, process now playing information
            var color = 'rgba(72, 51, 43, 1)';
            var statebadge = '';
            easDelay -= 1;
            var temp;
            var countdown;
            var countdowntext;
            var countdownclock;

            // scoreboard
            /*
             if (Meta.state.startsWith("sports"))
             {
             scoreboard.style.display = "inline";
             nowplaying.style.display = "none";

             if (Meta.show === "Women's Basketball")
             {
             scoreboard.style.backgroundImage = "url(../../images/sports/mcm_womenfinals.png)";
             } else if (Meta.show === "Men's Basketball") {
             scoreboard.style.backgroundImage = "url(../../images/sports/mcm_menfinals.png)";
             }
             } else {
             nowplaying.style.display = "block";
             scoreboard.style.display = "none";
             }
             */

            if (disconnected || typeof Meta.state === 'undefined') {
                statebadge = `<span class="badge badge-secondary shadow-2">OFFLINE</span>`;
                djAlert.style.display = 'none';
            } else if (Meta.state.startsWith('automation_')) {
                statebadge = `<span class="badge badge-info shadow-2">MUSIC</span>`;
                color = 'rgba(1, 84, 122, 1)';
            } else if (Meta.state.startsWith('live_')) {
                statebadge = `<span class="badge badge-primary shadow-2">SHOW</span>`;
                color = 'rgba(115, 6, 23, 1)';
            } else if (Meta.state.startsWith('remote_')) {
                statebadge = `<span class="badge badge-purple shadow-2">REMOTE</span>`;
                color = 'rgba(51, 29, 91, 1)';
            } else if (Meta.state.startsWith('sports_') || Meta.state.startsWith('sportsremote_')) {
                statebadge = `<span class="badge badge-success shadow-2">SPORTS</span>`;
                color = 'rgba(38, 87, 40, 1)';
            }
            if (typeof response.state !== `undefined` || typeof response.topic !== `undefined` || typeof response.show !== `undefined`) {
                /*
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
                */
                if (Meta.state.startsWith('live_') || Meta.state.startsWith('remote_') || Meta.state.startsWith('sports_') || Meta.state.startsWith('sportsremote_')) {
                    Slides.slide(`on-air`).active = true;
                    checkSlideCounts();
                    var innercontent = ``;
                    if (Meta.topic.length > 2) {
                        Slides.slide(`on-air`).displayTime = 20;
                        innercontent = `<h2 style="text-align: center; font-size: 3em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3); color: ${!isLightTheme ? `#ffffff` : `#000000`};"><strong>${Meta.show}</strong></h2>`;
                        if ('webchat' in Meta && Meta.webchat) {
                            innercontent += `<h3 style="text-align: center; font-size: 2em; color: ${!isLightTheme ? `#ffffff` : `#000000`}; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);">Tune in & Chat with the DJ: <string>wwsu1069.org</strong></h3>`;
                        } else {
                            innercontent += `<h3 style="text-align: center; font-size: 2em; color: ${!isLightTheme ? `#ffffff` : `#000000`}; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);">Tune in: <strong>wwsu1069.org</strong></h3>`;
                        }
                        innercontent += `<div style="overflow-y: hidden; font-size: 3em; color: ${!isLightTheme ? `#ffffff` : `#000000`}; height: 320px;" class="${!isLightTheme ? `bg-dark-4 text-white` : `bg-light-1 text-dark`} p-1 m-1 shadow-8">${Meta.topic}</div>`;
                    } else {
                        Slides.slide(`on-air`).displayTime = 10;
                        innercontent = `<h2 style="text-align: center; font-size: 3em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3); color: ${!isLightTheme ? `#ffffff` : `#000000`};"><strong>${Meta.show}</strong></h2>`;
                        if ('webchat' in Meta && Meta.webchat) {
                            innercontent += `<h3 style="text-align: center; font-size: 2em; color: ${!isLightTheme ? `#ffffff` : `#000000`}; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);">Tune in & Chat with the DJ: <strong>wwsu1069.org</strong></h3>`;
                        } else {
                            innercontent += `<h3 style="text-align: center; font-size: 2em; color: ${!isLightTheme ? `#ffffff` : `#000000`}; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);">Tune in: <strong>wwsu1069.org</strong></h3>`;
                        }
                    }
                    temp = document.getElementById(`ontheair`);
                    if (temp) { temp.innerHTML = innercontent; }
                } else {
                    Slides.slide(`on-air`).active = false;
                    checkSlideCounts();
                }
            }
            var queuelength = Meta.queueFinish !== null ? Math.round(moment(Meta.queueFinish).diff(moment(Meta.time), 'seconds')) : 0;
            if (queuelength < 0) { queuelength = 0; }
            if (queuelength > 29) { queueReminder = false; }
            if (typeof response.line1 !== 'undefined') {
                var line1Timer = setTimeout(() => {
                    nowplayingline1.innerHTML = Meta.line1;
                    nowplayingline1.className = ``;
                    if (Meta.line1.length >= 80) {
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
                $('#nowplaying-line1').animateCss('fadeOut', () => {
                    clearTimeout(line1Timer);
                    nowplayingline1.innerHTML = Meta.line1;
                    if (Meta.line1.length >= 80) {
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
            if (typeof response.line2 !== 'undefined') {
                var line2Timer = setTimeout(() => {
                    nowplayingline2.innerHTML = Meta.line2;
                    nowplayingline2.className = ``;
                    if (Meta.line2.length >= 80) {
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
                $('#nowplaying-line2').animateCss('fadeOut', () => {
                    clearTimeout(line2Timer);
                    nowplayingline2.innerHTML = Meta.line2;
                    if (Meta.line2.length >= 80) {
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
            nowplayingtime.innerHTML = `${disconnected ? 'DISPLAY DISCONNECTED FROM WWSU' : moment(Meta.time).format('LLLL') || 'Unknown WWSU Time'}`;
            if (Meta.state === 'automation_live' && queuelength < 60 && typeof response.state === 'undefined') {
                djAlert.style.display = 'inline';
                countdown = document.getElementById('countdown');
                countdowntext = document.getElementById('countdown-text');
                countdownclock = document.getElementById('countdown-clock');
                if (!countdown || !countdowntext || !countdownclock) {

                    temp = Meta.show.split(' - ');
                    djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: ${!isLightTheme ? `#ffffff` : `#000000`};" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="countdown-text"></h1>
                    <div class="m-3 bg-primary text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div>
                    </div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-danger">${temp[0]}</span><br />is going live in`;
                    if (!isStudio) { responsiveVoice.speak(`Attention guests! ${temp[0]} is about to go on the air on WWSU radio: ${temp[1]}.`); }
                }
                if (queuelength >= 15) {
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio) { responsiveVoice.speak(`DJ is going live in less than 15 seconds`); }
                    queueReminder = true;
                    countdownclock.innerHTML = queuelength;
                    if (!isStudio) {
                        $('#dj-alert').css('background-color', '#F44336');
                        setTimeout(() => {
                            $('#dj-alert').css('background-color', !isLightTheme ? `#000000` : `#ffffff`);
                        }, 250);
                    }
                }

                // When a remote broadcast is about to start
            } else if (Meta.state === 'automation_remote' && queuelength < 60 && typeof response.state === 'undefined') {
                djAlert.style.display = 'inline';
                countdown = document.getElementById('countdown');
                countdowntext = document.getElementById('countdown-text');
                countdownclock = document.getElementById('countdown-clock');
                if (!countdown || !countdowntext || !countdownclock) {

                    temp = Meta.show.split(' - ');
                    djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: ${!isLightTheme ? `#ffffff` : `#000000`};" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-purple text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div></div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = 'Remote Broadcast starting in';
                    if (!isStudio) { responsiveVoice.speak(`Attention guests! A remote broadcast hosted by ${temp[0]} is about to go on the air on WWSU radio: ${temp[1]}.`); }
                }
                if (queuelength >= 15) {
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio) { responsiveVoice.speak(`Producer is going live in less than 15 seconds`); }
                    queueReminder = true;
                    countdownclock.innerHTML = queuelength;
                    if (!isStudio) {
                        $('#dj-alert').css('background-color', '#9C27B0');
                        setTimeout(() => {
                            $('#dj-alert').css('background-color', !isLightTheme ? `#000000` : `#ffffff`);
                        }, 250);
                    }
                }
                // Sports broadcast about to begin
            } else if ((Meta.state === 'automation_sports' || Meta.state === 'automation_sportsremote') && queuelength < 60 && typeof response.state === 'undefined') {
                djAlert.style.display = 'inline';
                countdown = document.getElementById('countdown');
                countdowntext = document.getElementById('countdown-text');
                countdownclock = document.getElementById('countdown-clock');
                if (!countdown || !countdowntext || !countdownclock) {

                    djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: ${!isLightTheme ? `#ffffff` : `#000000`};" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-success text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div></div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-success">${Meta.show}</span><br />about to broadcast in`;
                    if (!isStudio) { responsiveVoice.speak(`Raider up! Wright State sports, ${Meta.show}, is about to begin on WWSU radio.`); }
                }
                if (queuelength >= 15) {
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio) { responsiveVoice.speak(`Producer is going live in less than 15 seconds`); }
                    queueReminder = true;
                    countdownclock.innerHTML = queuelength;
                    if (!isStudio) {
                        $('#dj-alert').css('background-color', '#4CAF50');
                        setTimeout(() => {
                            $('#dj-alert').css('background-color', !isLightTheme ? `#000000` : `#ffffff`);
                        }, 250);
                    }
                }
                // DJ is returning from a break
            } else if (Meta.state === 'live_returning' && queuelength < 60 && typeof response.state === 'undefined') {
                djAlert.style.display = 'inline';
                countdown = document.getElementById('countdown');
                countdowntext = document.getElementById('countdown-text');
                countdownclock = document.getElementById('countdown-clock');
                if (!countdown || !countdowntext || !countdownclock) {

                    temp = Meta.show.split(' - ');
                    djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: ${!isLightTheme ? `#ffffff` : `#000000`};" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-primary text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div></div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-danger">${temp[0]}</span><br />is returning live in`;
                    if (!isStudio) { responsiveVoice.speak(`Attention guests! ${temp[0]} is about to go back on the air.`); }
                }
                if (queuelength >= 15) {
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio) { responsiveVoice.speak(`DJ is returning live in less than 15 seconds`); }
                    queueReminder = true;
                    countdownclock.innerHTML = queuelength;
                    if (!isStudio) {
                        $('#dj-alert').css('background-color', '#F44336');
                        setTimeout(() => {
                            $('#dj-alert').css('background-color', !isLightTheme ? `#000000` : `#ffffff`);
                        }, 250);
                    }
                }
                // Remote broadcast is returning from a break
            } else if (Meta.state === 'remote_returning' && queuelength < 60 && typeof response.state === 'undefined') {
                djAlert.style.display = 'inline';
                countdown = document.getElementById('countdown');
                countdowntext = document.getElementById('countdown-text');
                countdownclock = document.getElementById('countdown-clock');
                if (!countdown || !countdowntext || !countdownclock) {

                    temp = Meta.show.split(' - ');
                    djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: ${!isLightTheme ? `#ffffff` : `#000000`};" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-purple text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div></div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = 'Returning to remote broadcast in';
                    if (!isStudio) { responsiveVoice.speak(`Attention guests! ${temp[0]} is about to go back on the air.`); }
                }
                if (queuelength >= 15) {
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio) { responsiveVoice.speak(`Producer is returning live in less than 15 seconds`); }
                    queueReminder = true;
                    countdownclock.innerHTML = queuelength;
                    if (!isStudio) {
                        $('#dj-alert').css('background-color', '#9C27B0');
                        setTimeout(() => {
                            $('#dj-alert').css('background-color', !isLightTheme ? `#000000` : `#ffffff`);
                        }, 250);
                    }
                }
                // Returning to a sports broadcast
            } else if ((Meta.state === 'sports_returning' || Meta.state === 'sportsremote_returning') && queuelength < 60 && typeof response.state === 'undefined') {
                djAlert.style.display = 'inline';
                countdown = document.getElementById('countdown');
                countdowntext = document.getElementById('countdown-text');
                countdownclock = document.getElementById('countdown-clock');
                if (!countdown || !countdowntext || !countdownclock) {

                    djAlert.innerHTML = `<div class="animated flash" id="slide-interrupt"><div style="text-align: center; color: ${!isLightTheme ? `#ffffff` : `#000000`};" id="countdown">
                    <h1 style="font-size: 5em; text-shadow: 1px 2px 1px rgba(0,0,0,0.3);" id="countdown-text"></h1>
<div class="m-3 bg-success text-white shadow-8 rounded-circle" style="font-size: 15em; text-shadow: 4px 8px 8px rgba(0,0,0,0.3);" id="countdown-clock">?</div></div></div>`;
                    countdown = document.getElementById('countdown');
                    countdowntext = document.getElementById('countdown-text');
                    countdownclock = document.getElementById('countdown-clock');
                    countdowntext.innerHTML = `<span class="text-success">${Meta.show}</span></br>returning in`;
                    if (!isStudio) { responsiveVoice.speak(`Raider up! The broadcast of ${Meta.show} is about to resume.`); }
                }
                if (queuelength >= 15) {
                    countdownclock.innerHTML = queuelength;
                } else {
                    if (!queueReminder && isStudio) { responsiveVoice.speak(`Producer is returning live in less than 15 seconds`); }
                    queueReminder = true;
                    countdownclock.innerHTML = queuelength;
                    if (!isStudio) {
                        $('#dj-alert').css('background-color', '#4CAF50');
                        setTimeout(() => {
                            $('#dj-alert').css('background-color', !isLightTheme ? `#000000` : `#ffffff`);
                        }, 250);
                    }
                }
                // Nothing special to show
            } else {
                djAlert.style.display = 'none';
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

function nowPlayingTick() {
    Meta.time = moment(Meta.time).add(1, 'seconds');
    processNowPlaying({});

    // Every 15 minutes, re-process the calendar
    if (moment(Meta.time).minute() % 15 === 0 && moment(Meta.time).second() < 5) {
        clearTimeout(processCalendarTimer);
        processCalendarTimer = setTimeout(() => {
            processCalendar(Calendar.db());
        }, 5000);
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
            { red, green, blue, alpha };
    } catch (e) {
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during hexRgb.'
        });
    }
}

// LINT LIES: This function is used.
// eslint-disable-next-line no-unused-vars
function processAnnouncements() {
    // Define a comparison function that will order announcements by createdAt
    var compare = function (a, b) {
        try {
            if (moment(a.createdAt).valueOf() < moment(b.createdAt).valueOf()) { return 1; }
            if (moment(a.createdAt).valueOf() > moment(b.createdAt).valueOf()) { return -1; }
            if (a.ID < b.ID) { return -1; }
            if (a.ID > b.ID) { return 1; }
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
    for (var i = 10; i < 100; i++) {
        if (typeof slides[i] !== 'undefined') { delete slides[i]; }
    }

    var anncCount = 0;
    Announcements({ type: 'display-public' }).get().sort(compare)
        .filter(announcement => moment(Meta.time).isSameOrAfter(moment(announcement.starts)) && moment(Meta.time).isBefore(moment(announcement.expires)))
        .map(announcement => {
            anncCount++;
            slides[tempslide] = {
                name: announcement.title, class: announcement.level, do: true, function: function () {
                    $('#slide').animateCss('slideOutUp', () => {
                        content.innerHTML = `<div class="animated fadeIn scale-wrapper" id="scale-wrapper">
            <div style="overflow-y: hidden; overflow-x: hidden; font-size: 4em; color: ${!isLightTheme ? `#ffffff` : `#000000`}; text-align: left;" class="container-full p-2 m-1 scale-content ${!isLightTheme ? `text-white` : `text-dark`}" id="scaled-content"><h1 style="text-align: center; font-size: 2em; color: ${!isLightTheme ? `#ffffff` : `#000000`}">${announcement.title}</h1>${announcement.announcement}</div></div>`;

                        var pageWidth; var pageHeight;

                        var basePage = {
                            width: 1600,
                            height: 900,
                            scale: 1,
                            scaleX: 1,
                            scaleY: 1
                        };

                        $(() => {
                            var $page = $('.scale-content');

                            getPageSize();
                            scalePages($page, pageWidth, pageHeight);

                            window.requestAnimationFrame(() => {
                                getPageSize();
                                scalePages($page, pageWidth, pageHeight);
                                setTimeout(() => {
                                    getPageSize();
                                    scalePages($page, pageWidth, pageHeight);
                                }, 500);
                            });

                            function getPageSize() {
                                pageHeight = $('#scale-wrapper').height();
                                pageWidth = $('#scale-wrapper').width();
                            }

                            function scalePages(page, maxWidth, maxHeight) {
                                page.attr('width', `${(($('#scaled-content').height() / maxHeight) * 70)}%`);
                                var scaleX = 1; var scaleY = 1;
                                scaleX = (maxWidth / $('#scaled-content').width()) * 0.95;
                                scaleY = (maxHeight / $('#scaled-content').height()) * 0.70;
                                basePage.scaleX = scaleX;
                                basePage.scaleY = scaleY;
                                basePage.scale = (scaleX > scaleY) ? scaleY : scaleX;

                                var newLeftPos = Math.abs(Math.floor((($('#scaled-content').width() * basePage.scale) - maxWidth) / 2));
                                page.attr('style', '-webkit-transform:scale(' + basePage.scale + ');left:' + newLeftPos + 'px;top:0px;');
                            }
                        });

                    });
                }
            };

            tempslide++;
        });

    // If there are more than 2 announcement slides, disable the days 2-4 and days 5-7 calendar slides to reduce clutter.
    if (anncCount > 2) {
        if (typeof slides[5] !== 'undefined') { slides[5].do = false; }
        if (typeof slides[6] !== 'undefined') { slides[6].do = false; }
    } else {
        if (typeof slides[5] !== 'undefined') { slides[5].do = true; }
        if (typeof slides[6] !== 'undefined') { slides[6].do = true; }
    }
}

function createAnnouncement(data) {
    if (data.type.startsWith(`display-public`)) {
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
            html: `<div style="overflow-y: hidden; box-shadow: 1px 2px 1px rgba(0, 0, 0, 0.3);" class="${!isLightTheme ? `text-white bg-dark-2` : `text-dark bg-light-3`}" id="content-attn-${data.ID}">${data.announcement}</div>`
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

function processDarksky(db) {
    // Run data manipulation process
    try {
        db.each((item) => {
            try {
                // Array of objects. {type: "clouds" || "rain" || "sleet" || "snow", amount: cloudCover || precipIntensity, temperature: tempreature, visibility: visibility}
                var conditions = [];

                // Current conditions
                setWeatherSlide(`weather`, true, `#424242`, `Current Weather`, getConditionIcon(item.currently.icon), `${item.currently.summary}; ${item.currently.temperature}°F`);

                // Determine when precipitation is going to fall
                var precipExpected = false;
                if (item.currently.precipType) {
                    precipExpected = true;
                    setWeatherSlide(`precipitation`, true, `#4F3C03`, `${item.currently.precipType || `precipitation`} falling!`, `fa-umbrella`, `Rate: ${item.currently.precipIntensity} fluid inches per hour).`);
                }
                if (!precipExpected) {
                    item.minutely.data.map((data, index) => {
                        if (!precipExpected) {
                            if (data.precipType && data.precipIntensity >= 0.005) {
                                precipExpected = true;
                                setWeatherSlide(`precipitation`, true, `#0C3B69`, `${data.precipType || `precipitation`} coming`, `fa-umbrella`, `${data.precipType || `precipitation`} expected to arrive around ${moment(Meta.time).add(index, 'minutes').format('h:mmA')}`);
                            }
                        }
                    });
                }

                // Determine if it will rain in the next 24 hours.
                // Also generate 48 hour forecast.
                item.hourly.data.map((data, index) => {
                    if (!precipExpected) {
                        if (index === 0) {
                            if (data.precipType && data.precipIntensity >= 0.005) {
                                precipExpected = true;
                                setWeatherSlide(`precipitation`, true, `#0C3B69`, `${data.precipType || `precipitation`} coming`, `fa-umbrella`, `${data.precipType || `precipitation`} expected to arrive soon.`);
                            }
                        }
                    }

                    if (data.precipType && data.precipIntensity >= 0.005) {
                        conditions[index] = { type: data.precipType, amount: data.precipIntensity, temperature: data.temperature, visibility: data.visibility };
                    } else {
                        conditions[index] = { type: 'clouds', amount: data.cloudCover, temperature: data.temperature, visibility: data.visibility };
                    }
                });
                console.log(conditions);

                if (!precipExpected) {
                    setWeatherSlide(`precipitation`, false);
                }

                // Is it windy?
                if (item.currently.windSpeed >= 73 || item.currently.windGust >= 73) {
                    setWeatherSlide(`wind`, true, `#721818`, `Destructive Winds!`, `fa-wind`, `Current wind speed: ${item.currently.windSpeed}mph, gusts to ${item.currently.windGust}mph.`);
                } else if (item.currently.windSpeed >= 55 || item.currently.windGust >= 55) {
                    setWeatherSlide(`wind`, true, `#702700`, `Gale-force Winds!`, `fa-wind`, `Current wind speed: ${item.currently.windSpeed}mph, gusts to ${item.currently.windGust}mph.`);
                } else if (item.currently.windSpeed >= 39 || item.currently.windGust >= 39) {
                    setWeatherSlide(`wind`, true, `#4F3C03`, `Windy`, `fa-wind`, `Current wind speed: ${item.currently.windSpeed}mph, gusts to ${item.currently.windGust}mph.`);
                } else if (item.currently.windSpeed >= 25 || item.currently.windGust >= 25) {
                    setWeatherSlide(`wind`, true, `#0C3B69`, `Breezy`, `fa-wind`, `Current wind speed: ${item.currently.windSpeed}mph, gusts to ${item.currently.windGust}mph.`);
                } else {
                    setWeatherSlide(`wind`, false);
                }

                // UV index
                if (item.currently.uvIndex > 10) {
                    setWeatherSlide(`uv`, true, `#721818`, `Extreme UV Index!`, `fa-sun`, `Unprotected skin can burn within 10 minutes. Stay indoors if you can.`);
                } else if (item.currently.uvIndex >= 8) {
                    setWeatherSlide(`uv`, true, `#702700`, `Severe UV Index!`, `fa-sun`, `Unprotected skin can burn within 20 minutes.`);
                } else if (item.currently.uvIndex >= 6) {
                    setWeatherSlide(`uv`, true, `#4F3C03`, `High UV Index`, `fa-sun`, `Unprotected skin can burn within 30 minutes.`);
                } else {
                    setWeatherSlide(`uv`, false);
                }

                // Visibility
                if (item.currently.visibility <= 0.25) {
                    setWeatherSlide(`visibility`, true, `#721818`, `Dangerous Visibility!`, `fa-car`, `Visibility is only ${item.currently.visibility} miles. Do not drive if possible.`);
                } else if (item.currently.visibility <= 1) {
                    setWeatherSlide(`visibility`, true, `#702700`, `Very Low Visibility!`, `fa-car`, `Visibility is only ${item.currently.visibility} miles. Be careful and drive slowly.`);
                } else if (item.currently.visibility <= 3) {
                    setWeatherSlide(`visibility`, true, `#4F3C03`, `Low Visibility`, `fa-car`, `Visibility is only ${item.currently.visibility} miles. Be cautious on the roads.`);
                } else {
                    setWeatherSlide(`visibility`, false);
                }

                // Apparent temperature, cold
                if (item.currently.apparentTemperature <= -48) {
                    setWeatherSlide(`windchill`, true, `#721818`, `Dangerous Wind Chill!`, `fa-temperature-low`, `Wind Chill is ${item.currently.apparentTemperature}°F. Frostbite can occur within 10 minutes.`);
                } else if (item.currently.apparentTemperature <= -32) {
                    setWeatherSlide(`windchill`, true, `#702700`, `Very Low Wind Chill!`, `fa-temperature-low`, `Wind Chill is ${item.currently.apparentTemperature}°F. Frostbite can occur within 20 minutes.`);
                } else if (item.currently.apparentTemperature <= -18) {
                    setWeatherSlide(`windchill`, true, `#4F3C03`, `Low Wind Chill`, `fa-temperature-low`, `Wind Chill is ${item.currently.apparentTemperature}°F. Frostbite can occur within 30 minutes.`);
                } else {
                    setWeatherSlide(`windchill`, false);
                }

                // Apparent temperature, hot
                if (item.currently.apparentTemperature >= 115) {
                    setWeatherSlide(`heatindex`, true, `#721818`, `Dangerous Heat Index!`, `fa-temperature-high`, `Heat Index is ${item.currently.apparentTemperature}°F. Heat stroke can occur; stay cool indoors if possible.`);
                } else if (item.currently.apparentTemperature >= 103) {
                    setWeatherSlide(`heatindex`, true, `#702700`, `Very High Heat Index!`, `fa-temperature-high`, `Heat Index is ${item.currently.apparentTemperature}°F. Drink lots of water and take a cooling break every 30 minutes.`);
                } else if (item.currently.apparentTemperature >= 91) {
                    setWeatherSlide(`heatindex`, true, `#4F3C03`, `High Heat Index`, `fa-temperature-high`, `Heat Index is ${item.currently.apparentTemperature}°F. Drink extra water.`);
                } else {
                    setWeatherSlide(`heatindex`, false);
                }


                // Generate 48 hour forecast
                temp = document.querySelector(`#forecast-graph`);
                temp.innerHTML = ``;
                var theTime = moment(Meta.time).startOf('hour');
                var shadeColor = ``;
                var innerIcon = ``;
                var conversionRatio = 1;
                for (var i = 1; i < 49; i++) {
                    theTime = moment(theTime).add(1, 'hours');

                    // Add label, vertical line, and temperature at every 3rd hour.
                    if (i % 3 === 0) {
                        temp.innerHTML += `
                        <div class="text-white" style="position: absolute; left: ${(((i - 1) / 48) - (1 / 96)) * 100}%; top: 0%; font-size: 1.5vh;">${moment(theTime).hours() < 3 ? moment(theTime).format('hA dd') : moment(theTime).format('hA')}</div>
                        <div class="text-white" style="position: absolute; left: ${(((i - 1) / 48) - (1 / 96)) * 100}%; top: 66%; font-size: 1.5vh;">${Math.round(conditions[i].temperature || 0)}°F</div>
                        `;
                    }

                    // Add shading depending on the condition
                    shadeColor = ``;
                    switch (conditions[i].type) {
                        case 'clouds':
                            if (conditions[i].amount > 0.66) {
                                shadeColor = `#786207`;
                                innerIcon = `<span class="text-white" style="font-size: 1em;"><i class="fas fa-cloud"></i></span>`;
                            } else if (conditions[i].amount >= 0.33) {
                                shadeColor = `#F1C40F`;
                                innerIcon = `<span class="text-dark" style="font-size: 1em;"><i class="fas fa-cloud-sun"></i></span>`;
                            } else {
                                shadeColor = `#F8E187`;
                                innerIcon = `<span class="text-dark" style="font-size: 1em;"><i class="fas fa-sun"></i></span>`;
                            }
                            break;
                        case 'rain':
                            if (conditions[i].amount >= 0.3) {
                                shadeColor = `#1A4C6D`;
                                innerIcon = `<span class="text-white" style="font-size: 1em;"><i class="fas fa-cloud-rain"></i></span>`;
                            } else if (conditions[i].amount >= 0.1) {
                                shadeColor = `#3498DB`;
                                innerIcon = `<span class="text-white" style="font-size: 1em;"><i class="fas fa-cloud-showers-heavy"></i></span>`;
                            } else {
                                shadeColor = `#99CBED`;
                                innerIcon = `<span class="text-dark" style="font-size: 1em;"><i class="fas fa-cloud-sun-rain"></i></span>`;
                            }
                            break;
                        case 'snow':
                            conversionRatio = ((-18 / 11) * conditions[i].temperature) + (722 / 11);
                            if ((conditions[i].amount * conversionRatio) >= 1) {
                                shadeColor = `#7C7C7C`;
                                innerIcon = `<span class="text-white" style="font-size: 1em;"><i class="fas fa-snowman"></i></span>`;
                            } else if ((conditions[i].amount * conversionRatio) >= 0.33) {
                                shadeColor = `#C6C6C6`;
                                innerIcon = `<span class="text-dark" style="font-size: 1em;"><i class="fas fa-snowflake"></i></span>`;
                            } else {
                                shadeColor = `#F8F8F8`;
                                innerIcon = `<span class="text-dark" style="font-size: 1em;"><i class="far fa-snowflake"></i></span>`;
                            }
                            break;
                        case 'sleet':
                            if (conditions[i].amount >= 0.2) {
                                shadeColor = `#780E35`;
                                innerIcon = `<span class="text-white" style="font-size: 1em;"><i class="fas fa-igloo"></i></span>`;
                            } else if (conditions[i].amount >= 0.05) {
                                shadeColor = `#F01D6A`;
                                innerIcon = `<span class="text-white" style="font-size: 1em;"><i class="fas fa-icicles"></i></span>`;
                            } else {
                                shadeColor = `#F78EB4`;
                                innerIcon = `<span class="text-dark" style="font-size: 1em;"><i class="fas fa-icicles"></i></span>`;
                            }
                            break;
                    }
                    temp.innerHTML += `<div style="position: absolute; background-color: ${shadeColor}; width: ${(1 / 48) * 100}%; height: 2em; left: ${((i - 1) / 48) * 100}%; top: 25%;"></div>
                    <div style="position: absolute; left: ${((i - 1) / 48) * 100}%; top: 35%;">${innerIcon}</div>`;
                }

            } catch (e) {
                console.error(e);
                iziToast.show({
                    title: 'An error occurred - Please check the logs',
                    message: `Error occurred during Directors iteration in processDarksky.`
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

function getConditionIcon(condition) {
    switch (condition) {
        case 'clear-day':
            return 'fa-sun';
        case 'clear-night':
            return 'fa-moon';
        case 'rain':
            return 'fa-cloud-showers-heavy';
        case 'snow':
            return 'fa-snowflake';
        case 'sleet':
            return 'fa-cloud-meatball';
        case 'wind':
            return 'fa-wind';
        case 'fog':
            return 'fa-smog';
        case 'cloudy':
            return 'fa-cloud';
        case 'partly-cloudy-day':
            return 'fa-cloud-sun';
        case 'partly-cloudy-night':
            return 'fa-cloud-moon';
        case 'thunderstorm':
            return 'fa-bolt';
        case 'showers-day':
            return 'fa-cloud-sun-rain';
        case 'showers-night':
            return 'fa-cloud-moon-rain';
        default:
            return 'fa-rainbow';
    }
}

function processWeeklyStats(data) {
    var temp = document.getElementById(`analytics`);
    if (temp !== null) {
        temp.innerHTML = `<p style="text-shadow: 2px 4px 3px rgba(0,0,0,0.3);"><strong class="ql-size-large">Highest online listener to showtime ratio:</strong></p>
     <ol><li><strong class="ql-size-large" style="color: rgb(255, 235, 204); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">${data.topShows[0] ? data.topShows[0] : 'Unknown'}</strong></li><li>${data.topShows[1] ? data.topShows[1] : 'Unknown'}</li><li>${data.topShows[2] ? data.topShows[2] : 'Unknown'}</li></ol>
     <p><span style="color: rgb(204, 232, 232); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Top Genre: ${data.topGenre}</span></p><p><span style="color: rgb(204, 232, 232); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Top Playlist: ${data.topPlaylist}</span></p>
     <p><span style="color: rgb(204, 232, 204); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">OnAir programming: ${Math.round(((data.onAir / 60) / 24) * 1000) / 1000} days (${Math.round((data.onAir / (60 * 24 * 7)) * 1000) / 10}% of the week)</span></p><p><span style="color: rgb(204, 232, 204); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Online listenership during OnAir programming: ${Math.round(((data.onAirListeners / 60) / 24) * 1000) / 1000} days</span></p><p><span style="color: rgb(235, 214, 255); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Tracks liked on website: ${data.tracksLiked}</span></p><p><span style="color: rgb(204, 224, 245); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Messages sent to/from website visitors: ${data.webMessagesExchanged}</span></p><p><span style="color: rgb(255, 255, 204); text-shadow: 2px 4px 3px rgba(0,0,0,0.3);">Track requests placed: ${data.tracksRequested}</span></p>`;
    }
}

function setWeatherSlide(id, show, background, header, icon, body) {
    weatherSlide
        .map((slide, index) => {
            if (slide.id === id) {
                weatherSlide[index].background = background || slide.background;
                weatherSlide[index].header = header || slide.header;
                weatherSlide[index].show = show;
                weatherSlide[index].icon = icon || slide.icon;
                weatherSlide[index].body = body || slide.body;
            }
        });
}