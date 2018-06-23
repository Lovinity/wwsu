/* global io, moment, Infinity */

// Define data variables
var Directors = [];
var Tasks = [];
var taskProjects = {};
var Meta = {};
var Status = [];

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
var nodeURL = 'http://server.wwsu1069.org';
var directorpresent = false;
var disconnected = true;
var slidetimer = false;
var slide = 1;
var lastBurnIn = null;

// Define initial slides
var slides = {1000: {
        name: 'WWSU', class: 'primary', do: true, function: function () {
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
                slidetimer = setTimeout(doSlide, 7000);
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

// This function triggers a burn guard sweep.
function burnGuardAnimate()
{
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

// Define a function that manages the data arrays
function updateData(variable, data)
{
    if (data !== null && (typeof data === 'object' || data.constructor === Array))
    {
        if (data.constructor === Array)
        {
            variable = [variable[0]];
            data.forEach(function (datum, key) {
                if (typeof datum !== 'undefined' && datum.ID !== 'undefined')
                {
                    variable[datum.ID] = datum;
                }
            });
        } else {
            for (var key in data)
            {
                if (data.hasOwnProperty(key))
                {
                    switch (key)
                    {
                        case 'insert':
                        case 'update':
                            if (typeof (data[key].ID !== 'undefined'))
                                variable[data[key].ID] = data[key];
                            break;
                        case 'remove':
                            if (typeof variable[data[key]] !== 'undefined')
                                delete variable[data[key]];
                            break;
                    }
                }
            }
        }
    }
    variable[0](variable);
}

// Define data-specific functions
// Run through operations of each WWSU status
Status.push(function (data)
{
    Status = data;

    // Make a dim status bar if it is time for power saving
    if (typeof Meta.state === 'undefined' || ((moment().isAfter(moment({hour: 8, minute: 0})) && (moment().isBefore(moment({hour: 22, minute: 0})))) || !Meta.state.startsWith("automation_") || directorpresent || Meta.state === 'automation_live' || Meta.state === 'automation_sports' || Meta.state === 'automation_remote' || Meta.state === 'automation_sportsremote')) {
        statusBadges.style.opacity = '1';
    } else {
        statusBadges.style.opacity = '0.2';
    }

    statusBadges.innerHTML = '';

    var globalStatus = 4;

    // Make a badge for each status subsystem and display its status by color / class. Also check for current overall status.
    Status.forEach(function (thestatus, key) {
        if (key === 0)
            return null;
        switch (thestatus.status)
        {
            case 1:
                statusBadges.innerHTML += `<span class="m-1 btn btn-danger btn-sm">${thestatus.label}</span>`;
                if (globalStatus > 1)
                    globalStatus = 1;
                break;
            case 2:
                statusBadges.innerHTML += `<span class="m-1 btn btn-danger btn-sm" style="background: #FF5722;">${thestatus.label}</span>`;
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
    });

    if (disconnected)
        globalStatus = 0;

    try {
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
                    $("html, body").animate({
                        backgroundColor: '#D32F2F'
                    }, 250, function () {
                        $("html, body").animate({
                            backgroundColor: "#000000"
                        }, 250);
                    });
                }, 1000);
                break;
            case 1:
                color = 'rgba(244, 67, 54, 0.5)';
                statusLine.innerHTML = 'WWSU Status: Major Outage';
                // Flash screen for major outages every second
                flashInterval = setInterval(function () {
                    $("html, body").animate({
                        backgroundColor: '#D32F2F'
                    }, 250, function () {
                        $("html, body").animate({
                            backgroundColor: "#000000"
                        }, 250);
                    });
                }, 1000);
                break;
            case 2:
                color = 'rgba(245, 124, 0, 0.5)';
                statusLine.innerHTML = 'WWSU Status: Partial Outage';
                // Flash screen for partial outages every 5 seconds
                // Flash screen for major outages every second
                flashInterval = setInterval(function () {
                    $("html, body").animate({
                        backgroundColor: '#FF9800'
                    }, 250, function () {
                        $("html, body").animate({
                            backgroundColor: "#000000"
                        }, 250);
                    });
                }, 5000);
                break;
            case 3:
                color = 'rgba(251, 192, 45, 0.5)';
                statusLine.innerHTML = 'WWSU Status: Operational; minor issue';
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
        console.error(e);
    }
});

// Mark if a director is present or not
Directors.push(function (data)
{
    Directors = data;
    directorpresent = false;
    Directors.forEach(function (director, key) {
        if (key === 0)
            return null;
        if (director.present)
            directorpresent = true;
    });
});

// Do task related stuff when tasks changes
Tasks.push(function (data)
{
    Tasks = data;
    taskProjects = {};

    // Delete all project slides
    for (var key in slides)
    {
        if (key < 100)
            delete slides[key];
    }

    // Process each task
    Tasks.forEach(function (task, key) {
        // Skip the first item as it's a function
        if (key === 0)
            return null;

        // Skip any tasks that are complete or have a start date later than today.
        if (task.percent >= 100 || (task.start !== null && moment(task.start).isAfter(moment())))
            return null;

        if (typeof taskProjects[task.project] === 'undefined')
            taskProjects[task.project] = [];
        taskProjects[task.project].push(task);
    });

    // Iterate through each project and create a slide for it
    var projects = 0;
    for (var key in taskProjects)
    {
        if (taskProjects.hasOwnProperty(key))
        {
            projects++;
            slides[projects] = {name: 'Work Orders', class: 'primary', do: true};
            slides[projects].content = `<div class="animated fadeInDown">
                                    <h1 style="text-align: center; font-size: 3em; color: #FFFFFF; width: 100%">Work Orders - ${key}</h1>
                                    <div style="overflow-y: hidden; font-size: 1em; width: 100%; color: #ffffff;" class="container">
                                    <div class="row">
                                        <div class="col-4">
                                            Task
                                        </div>
                                        <div class="col-2">
                                            Type
                                        </div>
                                        <div class="col-2">
                                            Assigned To
                                        </div>
                                        <div class="col-2">
                                            Status
                                        </div>
                                        <div class="col-2">
                                            Due
                                        </div>
                                    </div>
                                    `;
        }
        var tasksP = {};

        // Determine order of each task
        taskProjects[key].forEach(function (task) {
            var sortvalue = 0;
            if (typeof task.priority === 'undefined')
                task.priority = 'undefined';
            if (task.priority.includes("High"))
            {
                sortvalue += 100000000000000;
            } else if (task.priority.includes("Normal"))
            {
                sortvalue += 200000000000000;
            } else {
                sortvalue += 300000000000000;
            }
            if (moment(task.due).isValid())
            {
                sortvalue += moment(task.due).valueOf();
            } else {
                sortvalue += 100000000000000;
            }
            tasksP[sortvalue] = task;
        });
        var tasksO = {};
        Object.keys(tasksP).sort().forEach(function (key) {
            tasksO[key] = tasksP[key];
        });

        // Now, create the tasks in the slide
        for (var key in tasksO)
        {
            if (tasksO.hasOwnProperty(key))
            {
                var dodo = tasksO[key];
                var color = `rgba(96, 125, 139, 0.4);`;
                var border = `success`;
                if (typeof dodo.priority === 'undefined')
                    dodo.priority = 'Undefined';
                if (typeof dodo.status === 'undefined')
                    dodo.status = 'Undefined';
                if (dodo.priority.includes("Immediate"))
                {
                    color = `rgba(244, 67, 54, 0.4);`;
                } else if (dodo.priority.includes("High"))
                {
                    color = `rgba(255, 235, 59, 0.4);`;
                } else if (dodo.priority.includes("Normal"))
                {
                    color = `rgba(0, 188, 212, 0.4);`;
                }
                if (moment(dodo.due).isValid())
                {
                    if (dodo.status.includes("Deferred"))
                    {
                        border = 'secondary';
                    } else if (moment(dodo.due).add(1, 'days').isBefore(moment()))
                    {
                        border = 'danger';
                    } else if (moment(dodo.due).add(1, 'days').isBefore(moment().add(1, 'days')))
                    {
                        border = 'warning';
                    }
                } else {
                    border = 'primary';
                }
                slides[projects].content += `
                    <div class="row task m-1 border border-${border}" style="width: 100%; background: ${color}; text-align: left; font-size: 1em;">
                        <div class="order-progress" style="background: #ffffff; opacity: 0.25; width: ${(typeof dodo.percent !== 'undefined') ? dodo.percent : 0}%;"></div>
                        <div class="col-4">
                            <span style="#ffffff;">${(typeof dodo.subject !== 'undefined') ? dodo.subject : 'Undefined task'}</span>
                        </div>
                        <div class="col-2">
                            <span style="color: #4DD0E1;">${(typeof dodo.type !== 'undefined') ? dodo.type : 'Undefined'}</span>
                        </div>
                        <div class="col-2">
                            <span style="color: #FFF176;">${(typeof dodo.assignee !== 'undefined') ? dodo.assignee : 'Not assigned'}</span>
                        </div>
                        <div class="col-2">
                            <span style="color: #C5E1A5;">${(typeof dodo.status !== 'undefined') ? dodo.status : 'Undefined'}</span>
                        </div>
                        <div class="col-2">
                            <span style="color: #EF9A9A;">${(typeof dodo.due !== 'undefined' && moment(dodo.due).isValid()) ? dodo.due : 'Not specified'}</span>
                        </div>
                    </div>`;
            }
        }
        slides[projects].content += `</div></div>`;
        slides[projects].function = function () {
            $('#slide').animateCss('fadeOutUp', function () {
                if (typeof slides[slide] !== 'undefined' && typeof slides[slide].content !== 'undefined')
                {
                    content.innerHTML = slides[slide].content;
                    slidetimer = setTimeout(doSlide, 14000);
                } else {
                    slide = 1000;
                    Tasks[0](Tasks);
                    doSlide(true);
                }
            });
        };
    }
});

// When a director is passed as an event, process it.
io.socket.on('directors', function (data) {
    updateData(Directors, data);
});

// When a socket connection is established
io.socket.on('connect', function () {
    metaSocket();
    taskSocket();
    directorSocket();
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

// When a socket connection is lost
io.socket.on('disconnect', function () {
    console.log('Lost connection');
    io.socket._raw.io._reconnection = true;
    io.socket._raw.io._reconnectionAttempts = Infinity;
    // Show the lost connection overlay
    if (!disconnected)
    {
        //noConnection.style.display = "inline";
        disconnected = true;
        updateData(Status, null);
    }
});

// Display sign reload event
io.socket.on('display-refresh', function (data) {
    window.location.reload(true);
});

// Update meta information when meta is provided
io.socket.on('meta', function (data) {
    for (var key in data)
    {
        if (data.hasOwnProperty(key))
        {
            Meta[key] = data[key];

            // Do a status update if a state change was returned; this could impact power saving mode
            if (key === 'state')
                updateData(Status, null);
        }
    }
});

// Update statuses when status events are passed
io.socket.on('status', function (data) {
    updateData(Status, data);
});

// Update tasks when task events are passed
io.socket.on('tasks', function (data) {
    console.dir(data);
    updateData(Tasks, data);
});

// Called to replace all data in Tasks with body of request
function taskSocket()
{
    console.log('attempting orders socket');
    io.socket.post('/tasks/get', {}, function serverResponded(body, JWR) {
        try {
            console.dir(body);
            updateData(Tasks, body);
        } catch (e) {
            console.log('FAILED TASKS CONNECTION');
            setTimeout(taskSocket, 10000);
        }
    });
}

// Called to replace all Directors data with body of request
function directorSocket()
{
    console.log('attempting director socket');
    io.socket.post('/directors/get', {}, function serverResponded(body, JWR) {
        try {
            updateData(Directors, body);
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
    io.socket.post('/meta/get', {display: 'display-internal'}, function serverResponded(body, JWR) {
        try {
            temp = body;
            for (var key in temp)
            {
                if (temp.hasOwnProperty(key))
                {
                    Meta[key] = temp[key];
                }
            }
            updateData(Status, null);
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
            updateData(Status, body);
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
    clearTimeout(slidetimer);
    slidetimer = true;
    if (!same)
        slide += 1;
    var projects = taskProjects;
    console.log(`Slide ${slide}.`);

    // Do slides if we are not to be in power saving mode
    if ((moment().isAfter(moment({hour: 8, minute: 0})) && (moment().isBefore(moment({hour: 22, minute: 0})))) || directorpresent || 1 === 1)
    {
        slidebadges.innerHTML = `<span class="m-1 btn btn-outline-primary btn-sm" id="slidebadge-orders">Work Orders</span>`;

        // Determine highest slide number so we know when we are done
        var highestslide = 0;
        for (var key in slides) {
            if (slides.hasOwnProperty(key)) {
                if (slides[key].do && key > 99)
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
                if (restarted || lastBurnIn === null || moment().isAfter(moment(lastBurnIn).add(15, 'minutes')))
                {
                    slide = 0;
                    lastBurnIn = moment();
                    if (restarted)
                        console.log(`Slide issue. Triggering marquee screensaver.`);
                }
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

                // Non work order slides
            } else if (typeof slides[slide] !== 'undefined' && slides[slide].do && slide > 99)
            {
                done = true;
                console.log(`Doing slide ${slide}`);
                try {
                    slides[slide].function();
                } catch (e) {
                    console.log(e);
                    doSlide();
                    return null;
                }
                var temp = document.getElementById(`slidebadge-${slide}`);
                if (temp !== null)
                    temp.className = `m-1 btn btn-${slides[slide].class} btn-sm`;

                // Work order slides
            } else if (typeof slides[slide] !== 'undefined' && slides[slide].do && slide < 100)
            {
                done = true;
                console.log(`Doing slide ${slide}`);
                try {
                    slides[slide].function();
                } catch (e) {
                    console.log(e);
                    doSlide();
                    return null;
                }
                var temp = document.getElementById(`slidebadge-orders`);
                if (temp !== null)
                    temp.className = `m-1 btn btn-primary btn-sm`;
            } else {
                slide += 1;
            }
        }

        // Power saving slide
    } else {
        slidetimer = setTimeout(doSlide, 14000);
        slidebadges.innerHTML = ``;
        var afterFunction = function () {
            console.log(`Doing inactive slide - WWSU`);
            content.innerHTML = `<div style="opacity: 0.2;" id="dim-slide">
                    <div style="text-align: center; width: 100%;"><img src="../../images/display/logo.png" style="max-height: 300px; width: auto;"></div>
                            <div id="thebottom">
                            <h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Website: wwsu1069.org</h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Office Line: 937-775-5554</h1>
<h1 style="text-align: center; font-size: 3em; color: #FFFFFF">Request Line: 937-775-5555</h1>
            </div>
            </div>`;
        };
        if (document.getElementById('dim-slide') === null)
        {
            $('#slide').animateCss('fadeOutUp', afterFunction);
        } else {
            afterFunction();
        }
}
}