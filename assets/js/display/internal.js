/* global io, moment, Infinity, iziToast, responsiveVoice, jdenticon */

try {

    /* 
     * CLASSES / FACTORIES
     */

// Slides factory function for containing all of the slides for this display sign
    var Slides = (() => {

        // Storage of slides in the system
        var slides = [];

        // slides index of the currently active slide
        var currentSlide = -1;

        // Used to count down how much time is left on the slide currently being displayed.
        var timeLeft = 0;

        // Return the Slide class of the currently active slide
        const activeSlide = (() => slides[currentSlide] || {});

        // Return the Slide class of the provided slide name
        const slide = ((slideName) => {
            return slides.filter((_slide) => _slide.name === slideName)[0];
        });

        const allSlides = (() => slides);

        // function to update the order of the slides array by weight, and update the badges at the bottom of the screen for the slides
        const updateBadges = (() => {

            // First, sort the current slides array depending on each slide's weight... highest to lowest.
            var compare = function (a, b) {
                try {
                    if (a.weight > b.weight)
                        return -1;
                    if (a.weight < b.weight)
                        return 1;
                    return 0;
                } catch (e) {
                    console.error(e);
                    iziToast.show({
                        title: 'An error occurred - Please check the logs',
                        message: `Error occurred in the compare function of Slides.updateBadges`
                    });
                }
            };

            slides = slides.sort(compare);

            // Update the badges at the bottom of the screen for each slide
            var temp = document.getElementById(`slide-badges`);
            if (temp)
            {
                temp.innerHTML = ``;
                var stickyOnly = slides.filter((_slides) => _slides.isSticky).length > 0;
                var _slides = [];
                if (stickyOnly)
                {
                    _slides = slides.filter((_slides) => _slides.active && _slides.isSticky);
                    if (!activeSlide().active || !activeSlide().isSticky)
                        timeLeft = 0;
                } else {
                    _slides = slides.filter((_slides) => _slides.active);
                    if (!activeSlide().active)
                        timeLeft = 0;
                }

                _slides.map((_slide) => {
                    temp.innerHTML += `<span class="m-1 chip shadow-4 ${typeof slides[currentSlide] !== `undefined` && _slide.name === slides[currentSlide].name ? `bg-light-1` : `bg-dark-4`}"><i class="chip-icon bg-${_slide.color}">${typeof slides[currentSlide] !== `undefined` && _slide.name === slides[currentSlide].name && timeLeft !== null ? timeLeft : ``}</i>${_slide.label}</span>`;
                });
            }
        });

        // Add a Slide class into the system
        const newSlide = ((slideClass) => {
            slides.push(slideClass);
            updateBadges();
        });

        // Remove a slide from the system by slide name
        const removeSlide = ((slideName) => {
            slides.map((_slide, index) => {
                if (_slide.name === slideName)
                {
                    _slide.remove();
                    delete slides[index];
                    if (index === currentSlide)
                    {
                        timeLeft = 0;
                    }
                }
            });
            updateBadges();
        });

        // Transition to a slide
        const showSlide = ((slideName) => {
            timeLeft = null;
            if (slideName !== activeSlide().name)
            {
                // Executed when we are ready to show the slide
                var afterFunction = () => {

                    // Find out what index the slide we're about to display is
                    var iteration = 0;
                    var done = false;
                    while (!done)
                    {
                        if (slides[iteration].name === slideName)
                        {
                            done = true;
                            currentSlide = iteration;
                        }
                        iteration++;

                        // Should never happen, but failsafe to prevent freezes
                        if (iteration > slides.length)
                            done = true;
                    }

                    // Show the slide
                    var temp = document.getElementById(`slide-${activeSlide().name}`);
                    if (temp)
                        temp.style.display = "inline";
                    $(`#slide-${activeSlide().name}`).animateCss(activeSlide().transitionIn, function () {});

                    timeLeft = activeSlide().displayTime;
                    updateBadges();

                    // Fit content if necessary
                    var temp2 = document.getElementById(`content-slide-${activeSlide().name}`);
                    if (activeSlide().fitContent && temp && temp2)
                    {

                        temp.classList.add("scale-wrapper");
                        temp2.classList.add("scale-content");
                        var pageWidth, pageHeight;

                        var basePage = {
                            width: 1600,
                            height: 900,
                            scale: 1,
                            scaleX: 1,
                            scaleY: 1
                        };

                        $(function () {
                            var $page = $(`slide-${activeSlide().name}`);

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
                                page.attr("width", `${(($('#scaled-content').height() / maxHeight) * 80)}%`);
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
                    }
                };

                // Process transitioning out of the current slide
                if (currentSlide > -1)
                {
                    $(`#slide-${activeSlide().name}`).animateCss(activeSlide().transitionOut, function () {
                        var temp = document.getElementById(`slide-${activeSlide().name}`);
                        if (temp)
                            temp.style.display = "none";

                        afterFunction();
                    });
                } else {
                    afterFunction();
                }
            } else {
                timeLeft = activeSlide().displayTime;
                updateBadges();
            }
        });

        // Timer for controlling transitions between slides
        var timer = setInterval(() => {
            if (timeLeft !== null)
            {
                timeLeft--;

                if (timeLeft <= 0)
                {
                    timeLeft = 0;

                    // Determine which slides qualify to be displayed
                    var stickyOnly = slides.filter((_slides) => _slides.isSticky).length > 0;
                    var activeIndexes = [];
                    if (stickyOnly)
                    {
                        activeIndexes = slides.map((_slides, index) => _slides.active && _slides.isSticky);
                    } else {
                        activeIndexes = slides.map((_slides, index) => _slides.active);
                    }

                    // Determine based on the above which slide we should show next
                    var qualified = activeIndexes.filter((value, index) => index > currentSlide && value);
                    if (qualified.length <= 0)
                    {
                        generateBG();
                        qualified = activeIndexes.filter((value, index) => value);
                        if (qualified.length > 0)
                        {
                            var done = false;
                            var iteration = 0;
                            while (!done)
                            {
                                if (activeIndexes[iteration]) {
                                    done = true;
                                    showSlide(slides[iteration].name);
                                }
                                iteration++;

                                // Should never happen, but failsafe to prevent freezes
                                if (iteration > slides.length)
                                    done = true;
                            }
                        }
                    } else {
                        var done = false;
                        var iteration = currentSlide + 1;
                        while (!done)
                        {
                            if (activeIndexes[iteration]) {
                                done = true;
                                showSlide(slides[iteration].name);
                            }
                            iteration++;

                            // Should never happen, but failsafe to prevent freezes
                            if (iteration > slides.length)
                                done = true;
                        }
                    }
                }

                updateBadges();
            }
        }, 1000);

        // Return the stuff
        return {updateBadges, activeSlide, slide, allSlides, newSlide, removeSlide, showSlide};
    })();

// Slide class for managing a single slide
    class Slide {
        constructor(data = {}) {
            this._name = data.name || "";
            this._label = data.label || "";
            this._weight = data.weight || 0;
            this._isSticky = data.isSticky || false;
            this._color = data.color || "secondary";
            this._active = data.active || true;
            this._starts = data.starts || null;
            this._expires = data.expires || null;
            this._html = `<div id="slide-${this._name}" style="display: none; width: 100%;"><div id="content-slide-${this._name}">${data.html || ``}</div></div>`;
            this._transitionIn = data.transitionIn || "fadeIn";
            this._transitionOut = data.transitionOut || "fadeOut";
            this._displayTime = data.displayTime || 14;
            this._fitContent = data.fitContent || false;

            var temp = document.getElementById(`slides`);
            if (temp)
                temp.innerHTML += this._html;
        }

        get name() {
            return this._name;
        }

        get label() {
            return this._label;
        }

        set label(value) {
            this._label = value;
            Slides.updateBadges();
        }

        get weight() {
            return this._weight;
        }

        set weight(value) {
            this._weight = value;
            Slides.updateBadges();
        }

        get isSticky() {
            return this._isSticky;
        }

        set isSticky(value) {
            this._isSticky = value;
            Slides.updateBadges();
        }

        get color() {
            return this._color;
        }

        set color(value) {
            this._color = value;
        }

        get active() {
            if (!this._active)
                return false;

            if (this._starts !== null && moment(Meta.time).isBefore(moment(this._starts)))
                return false;

            if (this._expires !== null && moment(Meta.time).isAfter(moment(this._expires)))
                return false;

            return true;
        }

        set active(value) {
            this._active = value;
            Slides.updateBadges();
        }

        set starts(value) {
            this._starts = value;
            Slides.updateBadges();
        }

        set expires(value) {
            this._expires = value;
            Slides.updateBadges();
        }

        get html() {
            return this._html;
        }

        set html(value) {
            if (Slides.activeSlide().name === this._name)
            {
                this._html = `<div id="slide-${this._name}" style="display: inline; width: 100%;"><div id="content-slide-${this._name}">${value}</div></div>`;
            } else {
                this._html = `<div id="slide-${this._name}" style="display: none; width: 100%;"><div id="content-slide-${this._name}">${value}</div></div>`;
            }
            var temp = document.getElementById(`slide-${this._name}`);
            if (temp)
                temp.innerHTML = value;
        }

        get transitionIn() {
            return this._transitionIn;
        }

        get transitionOut() {
            return this._transitionOut;
        }

        get displayTime() {
            return this._displayTime;
        }

        set displayTime(value) {
            this._displayTime = value;
        }

        get fitContent() {
            return this._fitContent;
        }

        remove() {
            var temp = document.getElementById(`slide-${this._name}`);
            if (temp)
                temp.parentNode.removeChild(temp);
        }
    }

    // Define default slide templates
    // Directors
    Slides.newSlide(new Slide({
        name: `directors`,
        label: `Directors`,
        weight: 1000000,
        isSticky: false,
        color: `primary`,
        active: true,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 5,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Directors</h1><div style="overflow-y: hidden;" class="d-flex flex-wrap" id="directors"></div>`
    }));

    // Director hours
    Slides.newSlide(new Slide({
        name: `hours-directors`,
        label: `Hours`,
        weight: 999999,
        isSticky: false,
        color: `info`,
        active: true,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 5,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Directors</h1><div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1" id="office-hours-directors"></div>`
    }));

    // Assistant Director hours
    Slides.newSlide(new Slide({
        name: `hours-assistants`,
        label: `Hours`,
        weight: 999998,
        isSticky: false,
        color: `info`,
        active: true,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 5,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Hours - Assistant Directors</h1><div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1" id="office-hours-assistants"></div>`
    }));

    // Weekly Stats
    Slides.newSlide(new Slide({
        name: `weekly-stats`,
        label: `Weekly Stats`,
        weight: 900000,
        isSticky: false,
        color: `success`,
        active: true,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 15,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Analytics last 7 days</h1><div style="overflow-y: hidden; overflow-x: hidden; font-size: 1.5em;" class="container-full p-2 m-1 text-white scale-content" id="analytics"></div>`
    }));

    // System Status
    Slides.newSlide(new Slide({
        name: `system`,
        label: `System`,
        weight: -1000000,
        isSticky: false,
        color: `danger`,
        active: true,
        transitionIn: `fadeIn`,
        transitionOut: `fadeOut`,
        displayTime: 15,
        fitContent: false,
        html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">System Status</h1><div style="overflow-y: hidden; overflow-x: hidden;" class="container-full p-2 m-1" id="system-status"></div>`
    }));

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
    var slide = 1;
    var lastBurnIn = null;
    var prevStatus = 5;
    var stickySlides = false;
    var offlineTimer;
    var clockTimer;
    var globalStatus = 4;
    var hostReq;

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

    generateBG();

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

// Wait for the socket to be connected before defining event handlers
waitFor(function () {
    return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && io.socket.isConnected());
}, function () {

    // Define a host requester
    hostReq = new WWSUreq(io.socket, `display-internal`, 'host', '/auth/host', 'Host');

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

    Directors.setOnUpdate((data, db) => processDirectors(db));
    Directors.setOnInsert((data, db) => processDirectors(db));
    Directors.setOnRemove((data, db) => processDirectors(db));
    Directors.setOnReplace((db) => processDirectors(db));

    Directorhours.setOnUpdate((data, db) => processDirectorHours(db));
    Directorhours.setOnInsert((data, db) => processDirectorHours(db));
    Directorhours.setOnRemove((data, db) => processDirectorHours(db));
    Directorhours.setOnReplace((db) => processDirectorHours(db));

    // Do stuff when announcements changes are made
    Announcements.setOnUpdate((data, db) => {
        Slides.removeSlide(`attn-${data.ID}`);
        if (data.type.startsWith(`display-internal`))
        {
            Slides.newSlide(new Slide({
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
                displayTime: 14,
                fitContent: true,
                html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">${data.title}</h1><div style="overflow-y: hidden;" id="content-attn-${data.ID}">${data.announcement}</div>`
            }));
        }
    });
    Announcements.setOnInsert((data, db) => {
        if (data.type.startsWith(`display-internal`))
        {
            Slides.newSlide(new Slide({
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
                displayTime: 14,
                fitContent: true,
                html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">${data.title}</h1><div style="overflow-y: hidden;" id="content-attn-${data.ID}">${data.announcement}</div>`
            }));
        }
    });
    Announcements.setOnRemove((data, db) => Slides.removeSlide(`attn-${data}`));
    Announcements.setOnReplace((db) => {

        // Remove all announcement slides
        Slides.allSlides()
                .filter((slide) => slide.name.startsWith(`attn-`))
                .map((slide) => Slides.removeSlide(slide.name));

        // Add slides for each announcement
        db.each((data) => {
            if (data.type.startsWith(`display-internal`))
            {
                Slides.newSlide(new Slide({
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
                    displayTime: 14,
                    fitContent: true,
                    html: `<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">${data.title}</h1><div style="overflow-y: hidden;" id="content-attn-${data.ID}">${data.announcement}</div>`
                }));
            }
        })
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
}

// Define data-specific functions
// Run through operations of each WWSU status
function processStatus(db)
{
    try {
        var doRow = false;
        var secondRow = false;
        globalStatus = 4;
        statusMarquee = `<div class="row">
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
                    </div><div class="row" style="${secondRow ? `background: rgba(255, 255, 255, 0.1);` : ``}">`;


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
                    statusMarquee += `</div><div class="row" style="${secondRow ? `background: rgba(255, 255, 255, 0.1);` : ``}">`;
                    doRow = false;
                } else {
                    doRow = true;
                }

                switch (thestatus.status)
                {
                    case 1:
                        statusMarquee += `<div class="col-2">
                  	<span class="m-1 btn btn-danger btn-sm">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>CRITICAL</strong>: ${thestatus.data}
                      </div>`;
                        if (globalStatus > 1)
                            globalStatus = 1;
                        break;
                    case 2:
                        statusMarquee += `<div class="col-2">
                  	<span class="m-1 btn btn-urgent btn-sm">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>Urgent</strong>: ${thestatus.data}
                      </div>`;
                        if (globalStatus > 2)
                            globalStatus = 2;
                        break;
                    case 3:
                        statusMarquee += `<div class="col-2">
                  	<span class="m-1 btn btn-warning btn-sm">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>Warning</strong>: ${thestatus.data}
                      </div>`;
                        if (globalStatus > 3)
                            globalStatus = 3;
                        break;
                    case 4:
                        statusMarquee += `<div class="col-2">
                  	<span class="m-1 btn btn-outline-success btn-sm">${thestatus.label}</span>
                      </div>
                      <div class="col text-white">
                  	<strong>Offline</strong>: ${thestatus.data}
                      </div>`;
                        break;
                    case 5:
                        statusMarquee += `<div class="col-2">
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

                Slides.slide(`system`).isSticky = true;

                break;
            case 3:
                statusLine.innerHTML = 'WWSU is experiencing minor issues';
                clearTimeout(offlineTimer);
                color = 'rgba(251, 192, 45, 0.5)';

                Slides.slide(`system`).isSticky = false;
                break;
            case 5:
                statusLine.innerHTML = 'WWSU is operational';
                clearTimeout(offlineTimer);
                color = 'rgba(76, 175, 80, 0.5)';

                Slides.slide(`system`).isSticky = false;
                break;
            default:
                statusLine.innerHTML = 'WWSU status is unknown';
                color = 'rgba(158, 158, 158, 0.3)';

                Slides.slide(`system`).isSticky = false;
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
function processDirectors(db)
{
    try {
        directorpresent = false;

        db.each(function (dodo) {
            if (dodo.present)
                directorpresent = true;
        });

        // Update directors html
        var innercontent = document.getElementById('directors');
        if (innercontent)
            innercontent.innerHTML = '';
        
        Slides.slide(`directors`).displayTime = 5;
        db.each(function (dodo) {
            try {
                Slides.slide(`directors`).displayTime += 1;
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

        processDirectorHours(Directorhours.db());
    } catch (e) {
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the call of Directors[0].'
        });
        console.error(e);
    }
}

// Mark if a director is present or not
function processDirectorHours(db)
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
        var asstcalendar = {};
        db.get().sort(compare).map(event =>
        {
            var temp = Directors.db({name: event.director}).first();
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
                        calendar[event.director][i] += `<div class="m-1"><div class="m-1 text-success">IN ${event.startT}</div><div class="m-1 text-danger">OUT ${event.endT}</div></div>`;
                    if (assistant)
                        asstcalendar[event.director][i] += `<div class="m-1"><div class="m-1 text-success">IN ${event.startT}</div><div class="m-1 text-danger">OUT ${event.endT}</div></div>`;
                }
            }

            // Director hours slide
            var innercontent = document.getElementById('office-hours-directors');

            var stuff = `<div class="row shadow-2" style="background: rgba(0, 0, 0, 0.5);">
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
            Slides.slide(`hours-directors`).displayTime = 5;
            for (var director in calendar)
            {
                if (calendar.hasOwnProperty(director))
                {
                    Slides.slide(`hours-directors`).displayTime += 2;
                    stuff += `<div class="row shadow-2" style="${doShade ? `background: rgba(0, 0, 0, 0.25);` : `background: rgba(0, 0, 0, 0.5);`}">
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

            innercontent.innerHTML = stuff;

            // Assistant hours slide
            var innercontent = document.getElementById('office-hours-assistants');

            var stuff = `<div class="row shadow-2" style="background: rgba(0, 0, 0, 0.5);">
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
            Slides.slide(`hours-assistants`).displayTime = 5;
            for (var director in asstcalendar)
            {
                if (asstcalendar.hasOwnProperty(director))
                {
                    Slides.slide(`hours-assistants`).displayTime += 2;
                    stuff += `<div class="row shadow-2" style="${doShade ? `background: rgba(0, 0, 0, 0.25);` : `background: rgba(0, 0, 0, 0.5);`}">
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

            innercontent.innerHTML = stuff;
        });
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
    hostReq.request({method: 'POST', url: '/recipients/add-display', data: {host: 'display-internal'}}, function (body) {
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
        Directors.replaceData(hostReq, '/directors/get');
        Directorhours.replaceData(hostReq, '/directors/get-hours');
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
    hostReq.request({method: 'POST', url: '/meta/get', data: {}}, function (body) {
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
        Status.replaceData(hostReq, '/status/get');
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
    hostReq.request({method: 'POST', url: '/analytics/weekly-dj', data: {}}, function (body) {
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
        hostReq.request({method: 'POST', url: '/announcements/get', data: {type: 'display-internal'}}, function (body) {
            data.concat(body);
            hostReq.request({method: 'POST', url: '/announcements/get', data: {type: 'display-internal-sticky'}}, function (body) {
                data.concat(body);

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
    if (temp)
        temp.innerHTML = `<p><strong class="ql-size-large">Highest online listener to showtime ratio:</strong></p>
     <ol><li><strong class="ql-size-large" style="color: rgb(255, 235, 204);">${data.topShows[0] ? data.topShows[0] : 'Unknown'}</strong></li><li>${data.topShows[1] ? data.topShows[1] : 'Unknown'}</li><li>${data.topShows[2] ? data.topShows[2] : 'Unknown'}</li></ol>
     <p><span style="color: rgb(204, 232, 232);">Top Genre: ${data.topGenre}</span></p><p><span style="color: rgb(204, 232, 232);">Top Playlist: ${data.topPlaylist}</span></p>
     <p><span style="color: rgb(204, 232, 204);">OnAir programming: ${Math.round(((data.onAir / 60) / 24) * 1000) / 1000} days (${Math.round((data.onAir / (60 * 24 * 7)) * 1000) / 10}% of the week)</span></p><p><span style="color: rgb(204, 232, 204);">Online listenership during OnAir programming: ${Math.round(((data.onAirListeners / 60) / 24) * 1000) / 1000} days</span></p><p><span style="color: rgb(235, 214, 255);">Tracks liked on website: ${data.tracksLiked}</span></p><p><span style="color: rgb(204, 224, 245);">Messages sent to/from website visitors: ${data.webMessagesExchanged}</span></p><p><span style="color: rgb(255, 255, 204);">Track requests placed: ${data.tracksRequested}</span></p>`;
}