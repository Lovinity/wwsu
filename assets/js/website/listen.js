/* global io, moment, iziToast, Infinity */

// Define hexrgb constants
var hexChars = 'a-f\\d';
var match3or4Hex = `#?[${hexChars}]{3}[${hexChars}]?`;
var match6or8Hex = `#?[${hexChars}]{6}([${hexChars}]{2})?`;

var nonHexChars = new RegExp(`[^#${hexChars}]`, 'gi');
var validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, 'i');

// Load HTML elements
var nowPlaying = document.getElementById('nowplaying');
var notificationsBox = document.getElementById('messages');
var messageText = document.getElementById('themessage');
var nickname = document.getElementById('nickname');
var sendButton = document.getElementById('sendmessage');
var recentTracks = document.getElementById('recent-tracks');

// Load variables
var messageIDs = [];
var announcementIDs = [];
var automationpost = null;
var Meta = {time: moment().toISOString(true)};
var shouldScroll = false;
var skipIt = -1;
var blocked = false;
var firstTime = true;
var nicknameTimer = null;
var Calendar = TAFFY();
var calendar = [];
var likedTracks = [];
var clockTimer;

// Initialize the web player
if (document.querySelector('#nativeflashradio'))
    $("#nativeflashradio").flashradio({
        userinterface: "small",
        backgroundcolor: "#263238",
        themecolor: "#d31e38",
        themefontcolor: "#ffffff",
        startvolume: "75",
        radioname: "WWSU 106.9 FM",
        scroll: "auto",
        autoplay: "false",
        useanalyzer: "real",
        analyzertype: "4",
        usecover: "true",
        usestreamcorsproxy: "false",
        affiliatetoken: "1000lIPN",
        debug: "false",
        ownsongtitleurl: "",
        radiocover: "",
        songgooglefontname: "",
        songfontname: "",
        titlegooglefontname: "",
        titlefontname: "",
        corsproxy: "https://html5radioplayer2us.herokuapp.com/?q=",
        streamprefix: "/stream",
        mountpoint: "",
        radiouid: "",
        apikey: "",
        streamid: "1",
        streampath: "/live",
        streamtype: "other",
        streamurl: "https://server.wwsu1069.org",
        songinformationinterval: "600000"
    });

if (document.querySelector('#themessage'))
    var quill = new Quill('#themessage', {
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike', {'color': []}],
                ['link'],
                ['clean']
            ],
        },
        theme: 'snow'
    });

function quillGetHTML(inputDelta) {
    var tempCont = document.createElement("div");
    (new Quill(tempCont)).setContents(inputDelta);
    return tempCont.getElementsByClassName("ql-editor")[0].innerHTML;
}

// Set up schedule calendar
var focusableElementsString = "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";
var focusedElementBeforeModal;
var pwidth = null;
function trapEscapeKey(obj, evt) {

    // if escape pressed
    if (evt.which == 27) {

        // get list of all children elements in given object
        var o = obj.find('*');

        // get list of focusable items
        var cancelElement;
        cancelElement = o.filter("#cancel")

        // close the modal window
        cancelElement.click();
        evt.preventDefault();
    }

}
function trapTabKey(obj, evt) {

    // if tab or shift-tab pressed
    if (evt.which == 9) {

        // get list of all children elements in given object
        var o = obj.find('*');

        // get list of focusable items
        var focusableItems;
        focusableItems = o.filter(focusableElementsString).filter(':visible')

        // get currently focused item
        var focusedItem;
        focusedItem = jQuery(':focus');

        // get the number of focusable items
        var numberOfFocusableItems;
        numberOfFocusableItems = focusableItems.length

        // get the index of the currently focused item
        var focusedItemIndex;
        focusedItemIndex = focusableItems.index(focusedItem);

        if (evt.shiftKey) {
            //back tab
            // if focused on first item and user preses back-tab, go to the last focusable item
            if (focusedItemIndex == 0) {
                focusableItems.get(numberOfFocusableItems - 1).focus();
                evt.preventDefault();
            }

        } else {
            //forward tab
            // if focused on the last item and user preses tab, go to the first focusable item
            if (focusedItemIndex == numberOfFocusableItems - 1) {
                focusableItems.get(0).focus();
                evt.preventDefault();
            }
        }
    }

}

function setInitialFocusModal(obj) {
    // get list of all children elements in given object
    var o = obj.find('*');

    // set focus to first focusable item
    var focusableItems;
    focusableItems = o.filter(focusableElementsString).filter(':visible').first().focus();

}
function setFocusToFirstItemInModal(obj) {
    // get list of all children elements in given object
    var o = obj.find('*');

    // set the focus to the first keyboard focusable item
    o.filter(focusableElementsString).filter(':visible').first().focus();
}
$(document).ready(function () {
    if (document.querySelector('#dialog'))
    {
        $('#dialog').on('shown.bs.modal', function () {
            $('#dialog').trigger('focus');
            jQuery('body').on('focusin', '#mainPage', function () {
                setFocusToFirstItemInModal(jQuery('#dialog'));
            });
            focusedElementBeforeModal = jQuery(':focus');
            setFocusToFirstItemInModal($('#dialog'));
        })

        $('#dialog').on('hidden.bs.modal', function (e) {
            jQuery('body').off('focusin', '#mainPage');
            focusedElementBeforeModal.focus();
        })

        jQuery('#dialog').keydown(function (event) {
            trapTabKey($(this), event);
        })

        jQuery('#dialog').keydown(function (event) {
            trapEscapeKey($(this), event);
        })
    }
});
if (document.querySelector('#song-data'))
    document.querySelector(`#song-data`).addEventListener("click", function (e) {
        try {
            if (e.target) {
                if (e.target.id.startsWith(`track-l-`))
                {
                    loadTrackInfo(parseInt(e.target.id.replace(`track-l-`, ``)));
                } else if (e.target.id.startsWith(`track-`))
                {
                    loadTrackInfo(parseInt(e.target.id.replace(`track-`, ``)));
                }
            }
        } catch (err) {

        }
    });

if (document.querySelector('#track-info-request'))
    document.querySelector(`#track-info-request`).addEventListener("click", function (e) {
        try {
            if (e.target) {
                if (e.target.id === "track-request-submit")
                {
                    requestTrack(parseInt($('#track-info-ID').html()));
                }
            }
        } catch (err) {

        }
    });

if (document.querySelector('#filter-submit'))
    document.querySelector(`#filter-submit`).addEventListener("click", function (e) {
        loadTracks(0);
    });

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
    return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && typeof io.socket._raw !== 'undefined' && typeof io.socket._raw.io !== 'undefined');
}, function () {
    io.socket._raw.io._reconnection = true;
    io.socket._raw.io._reconnectionAttempts = Infinity;
});

function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function closeModal() {
    if (document.querySelector('#trackModal'))
        $('#trackModal').modal('hide');
}

// Wait for connection by io, then create event handlers and do the sockets
waitFor(function () {
    return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && io.socket.isConnected());
}, function () {
    // On socket connection, notify the user and do socket tasks.
    io.socket.on('connect', function () {
        iziToast.show({
            title: 'Connected to WWSU',
            message: 'You will now receive metadata, can send or receive messages, and can place track requests.',
            color: 'green',
            zindex: 100,
            layout: 2,
            closeOnClick: true,
            position: 'bottomCenter',
            timeout: 5000
        });
        doSockets(firstTime);
    });

    doSockets(firstTime);

    // On socket disconnect, notify the user.
    io.socket.on('disconnect', function () {
        try {
            if (nowPlaying)
                nowPlaying.innerHTML = `<div class="p-3 mb-2 bg-wwsu-red">Re-connecting...</div>`;
            iziToast.show({
                title: 'Lost connection to WWSU',
                message: 'You will not receive new metadata, nor can send or receive messages or requests, until re-connected.',
                color: 'red',
                zindex: 100,
                layout: 2,
                closeOnClick: true,
                position: 'bottomCenter',
                timeout: 10000
            });
            io.socket._raw.io._reconnection = true;
            io.socket._raw.io._reconnectionAttempts = Infinity;
        } catch (e) {
        }
    });

// On meta changes, process meta
    io.socket.on('meta', function (data) {
        for (var key in data)
        {
            if (data.hasOwnProperty(key))
            {
                Meta[key] = data[key];
            }
        }
        doMeta(data);
    });

// When a new message is received, process it.
    io.socket.on('messages', function (data) {
        try {
            for (var key in data)
            {
                if (data.hasOwnProperty(key))
                {
                    switch (key)
                    {
                        case 'insert':
                            addMessage(data[key], firstTime);
                            break;
                        case 'remove':
                            var temp = document.getElementById(`msg-${data[key]}`);
                            if (temp !== null)
                                temp.innerHTML = 'XXX This message was deleted XXX';
                            break;
                    }
                }
            }
        } catch (e) {
        }
    });

// When an announcement comes through
    io.socket.on('announcements', function (data) {
        try {
            if (announcementIDs.indexOf(data.ID) === -1)
            {
                addAnnouncement(data);
            }
        } catch (e) {
        }
    });

    io.socket.on('calendar', function (data) {
        processCalendar(data);
    });

// On meta changes, process meta
    io.socket.on('discipline', function (data) {
        io.socket.disconnect();
        iziToast.show({
            title: `Disciplinary notice - Disconnected from WWSU`,
            message: data.discipline,
            color: 'red',
            zindex: 1000,
            layout: 2,
            closeOnClick: false,
            close: false,
            overlay: true,
            position: 'center',
            timeout: false,
            balloon: false
        });
    });
});

function doSockets(firsttime = false)
{
    onlineSocket();
    messagesSocket();
    metaSocket();
    announcementsSocket();
    loadGenres();
}

function onlineSocket()
{
    io.socket.post('/recipients/add-web', {}, function serverResponded(body, JWR) {
        try {
            if (nickname)
            {
                nickname.value = body.label;
                nickname.value = nickname.value.replace('Web ', '');
                nickname.value = nickname.value.match(/\(([^)]+)\)/)[1];
            }
        } catch (e) {
            setTimeout(onlineSocket, 10000);
        }
    });
}

function messagesSocket()
{
    io.socket.post('/messages/get-web', {}, function serverResponded(body, JWR) {
        //console.log(body);
        try {
            body
                    .filter(message => messageIDs.indexOf(message.ID) === -1)
                    .map(message => addMessage(message, firstTime));
            firstTime = false;
        } catch (e) {
            setTimeout(messagesSocket, 10000);
        }
    });
}

function metaSocket()
{
    io.socket.post('/songs/get-liked', {}, function serverResponded(body, JWR) {
        try {
            likedTracks = body;
            io.socket.post('/meta/get', {}, function serverResponded(body, JWR) {
                //console.log(body);
                try {
                    for (var key in body)
                    {
                        if (body.hasOwnProperty(key))
                        {
                            Meta[key] = body[key];
                        }
                    }
                    doMeta(body);
                    io.socket.post('/calendar/get', {}, function serverResponded(body, JWR) {
                        try {
                            processCalendar(body, true);
                        } catch (e) {
                            setTimeout(metaSocket, 10000);
                        }
                    });
                } catch (e) {
                    setTimeout(metaSocket, 10000);
                }
            });
        } catch (e) {
            setTimeout(metaSocket, 10000);
        }
    });
}

function announcementsSocket()
{
    io.socket.post('/announcements/get', {type: 'website'}, function serverResponded(body, JWR) {
        //console.log(body);
        try {
            body
                    .filter(announcement => announcementIDs.indexOf(announcement.ID) === -1)
                    .map(announcement => addAnnouncement(announcement));
        } catch (e) {
            setTimeout(announcementsSocket, 10000);
        }
    });
}

// Whenever the nickname is changed, (re)set a 5 second timeout. After 5 seconds, if nickname is not changed, send the new nickname to the server for all clients to see.
if (nickname)
    nickname.addEventListener("change", function () {
        io.socket.post('/recipients/edit-web', {label: nickname.value}, function serverResponded(body, JWR) {
        });
    });

// Function called when a new message arrived that should be displayed
function addMessage(data, firsttime = false)
{
    if (notificationsBox)
        shouldScroll = notificationsBox.scrollTop + notificationsBox.clientHeight === notificationsBox.scrollHeight;

    // Note the ID; used to determine new messages upon reconnection of a socket disconnect
    messageIDs.push(data.ID);

    // Private website message
    if (data.to.startsWith("website-"))
    {
        if (notificationsBox)
            notificationsBox.innerHTML += `<div id="msg-${data.ID}" class="p-3 mb-2 bg-wwsu-red"><span style="font-size: 1em;">${data.message}</span><br /><span class="text-light" style="font-size: 0.67em;">${moment(data.createdAt).format('LT')} by ${data.from_friendly} (Only you see this message)</span></div>`;
        if (!firsttime)
        {
            iziToast.show({
                title: 'Private message from ' + data.from_friendly,
                message: data.message,
                color: 'yellow',
                zindex: 100,
                layout: 2,
                closeOnClick: true,
                position: 'bottomCenter',
                timeout: 10000,
                balloon: true
            });
        }

        // Public website message for all visitors
    } else if (data.to === 'website')
    {
        if (notificationsBox)
            notificationsBox.innerHTML += `<div id="msg-${data.ID}" class="p-3 mb-2 bg-wwsu-red"><span style="font-size: 1em;">${data.message}</span><br /><span class="text-light" style="font-size: 0.67em;">${moment(data.createdAt).format('LT')} by ${data.from_friendly}</span></div>`;
        if (!firsttime)
        {
            iziToast.show({
                title: 'Message from ' + data.from_friendly,
                message: data.message,
                color: 'yellow',
                zindex: 100,
                layout: 2,
                closeOnClick: true,
                position: 'bottomCenter',
                timeout: 10000,
                balloon: true
            });
        }

        // Private message sent from visitor
    } else if (data.to === 'DJ-private') {
        if (notificationsBox)
            notificationsBox.innerHTML += `<div id="msg-${data.ID}" class="p-3 mb-2 bg-dark"><span style="font-size: 1em;">${data.message}</span><br /><span class="text-light" style="font-size: 0.67em;">${moment(data.createdAt).format('LT')} by ${data.from_friendly} (only the DJ sees this message)</span></div>`;
        if (!firsttime)
        {
            iziToast.show({
                title: 'Message from ' + data.from_friendly,
                message: data.message,
                color: '#ffffff',
                zindex: 100,
                layout: 2,
                closeOnClick: true,
                position: 'bottomCenter',
                timeout: 10000,
                balloon: true
            });
        }
        // All other messages
    } else {
        if (notificationsBox)
            notificationsBox.innerHTML += `<div id="msg-${data.ID}" class="p-3 mb-2 bg-dark"><span style="font-size: 1em;">${data.message}</span><br /><span class="text-light" style="font-size: 0.67em;">${moment(data.createdAt).format('LT')} by ${data.from_friendly}</span></div>`;
        if (!firsttime)
        {
            iziToast.show({
                title: 'Message from ' + data.from_friendly,
                message: data.message,
                color: '#ffffff',
                zindex: 100,
                layout: 2,
                closeOnClick: true,
                position: 'bottomCenter',
                timeout: 10000,
                balloon: true
            });
        }
    }
    if (shouldScroll && document.querySelector('#messages')) {
        $("#messages").animate({scrollTop: $("#messages").prop('scrollHeight')}, 1000);
}
}

// Process meta info. Pass new meta received as response object.
function doMeta(response)
{
    try {
        if (notificationsBox)
            shouldScroll = notificationsBox.scrollTop + notificationsBox.clientHeight === notificationsBox.scrollHeight;

        if (typeof response.time !== 'undefined')
        {
            clearInterval(clockTimer);
            clearTimeout(clockTimer);
            clockTimer = setInterval(clockTick, 1000);
        }

        // Update meta and color code it, if new meta was provided
        if (('line1' in response || 'line2' in response) && nowPlaying)
        {
            if (Meta.state.includes("live_"))
                nowPlaying.innerHTML = `<div class="p-3 mb-2 bg-wwsu-red">${Meta.line1}<br />${Meta.line2}<br />${(Meta.topic.length > 2 ? `Topic: ${Meta.topic}` : '')}</div>`;
            if (Meta.state.includes("sports_") || Meta.state.includes("sportsremote_"))
                nowPlaying.innerHTML = `<div class="p-3 mb-2 bg-wwsu-red">${Meta.line1}<br />${Meta.line2}</div>`;
            if (Meta.state.includes("remote_"))
                nowPlaying.innerHTML = `<div class="p-3 mb-2 bg-wwsu-red">${Meta.line1}<br />${Meta.line2}<br />${(Meta.topic.length > 2 ? `Topic: ${Meta.topic}` : '')}</div>`;
            if (Meta.state.includes("automation_") || Meta.state === 'unknown')
                nowPlaying.innerHTML = `<div class="p-3 mb-2 bg-wwsu-red">${Meta.line1}<br />${Meta.line2}</div>`;
            iziToast.show({
                title: Meta.line1,
                message: Meta.line2,
                color: 'blue',
                zindex: 100,
                layout: 1,
                closeOnClick: true,
                position: 'bottomCenter',
                timeout: 10000
            });
            // Reload calendar each time a new track is given
            processCalendar({});
        }

        // If a false was returned for web chatting, then disable it
        if ('webchat' in response && !response.webchat && messageText)
        {
            blocked = true;
            messageText.disabled = true;
            sendButton.disabled = true;
            if (notificationsBox)
                notificationsBox.innerHTML = `<div class="p-3 mb-2 bg-wwsu-red" id="msg-disabled">The web chat is currently disabled for this show.</div>`;
            if (shouldScroll && document.querySelector('#messages')) {
                $("#messages").animate({scrollTop: $("#messages").prop('scrollHeight')}, 1000);
            }
            return null;
        }

        // If a state change was returned, process it by informing the client whether or not there is probably a DJ at the studio to read messages
        if ('state' in response)
        {
            if (response.state.includes("automation_") || Meta.state === 'unknown')
            {
                if (automationpost !== 'automation')
                {
                    var temp = document.getElementById('msg-state');
                    if (temp)
                        temp.remove();
                    if (notificationsBox)
                        notificationsBox.innerHTML += `<div class="p-3 mb-2 bg-wwsu-red text-warning" id="msg-state">No one is on the air at this time. There may not be anyone in the studio to read your messages.</div>`;
                    if (shouldScroll && document.querySelector('#messages')) {
                        $("#messages").animate({scrollTop: $("#messages").prop('scrollHeight')}, 1000);
                    }
                    automationpost = 'automation';
                }
            } else if (response.state === 'live_prerecord') {
                if (automationpost !== response.live)
                {
                    var temp = document.getElementById('msg-state');
                    if (temp)
                        temp.remove();
                    if (notificationsBox)
                        notificationsBox.innerHTML += `<div class="p-3 mb-2 bg-wwsu-red text-warning" id="msg-state">The current show airing is a prerecord. There may not be anyone in the studio to read your messages.</div>`;
                    automationpost = response.live;
                    if (shouldScroll && document.querySelector('#messages')) {
                        $("#messages").animate({scrollTop: $("#messages").prop('scrollHeight')}, 1000);
                    }
                }
            } else {
                if (automationpost !== response.live)
                {
                    var temp = document.getElementById('msg-state');
                    if (temp)
                        temp.remove();
                    if (notificationsBox)
                        notificationsBox.innerHTML += `<div class="p-3 mb-2 bg-wwsu-red text-warning" id="msg-state">There is a show airing now. Your messages should be received by the host.</div>`;
                    automationpost = response.live;
                    if (shouldScroll && document.querySelector('#messages')) {
                        $("#messages").animate({scrollTop: $("#messages").prop('scrollHeight')}, 1000);
                    }
                }
            }
        }
        blocked = false;
        if (messageText)
        {
            messageText.disabled = false;
            sendButton.disabled = false;
        }
        var temp = document.getElementById('msg-disabled');
        if (temp)
            temp.remove();

        // If a track ID change was passed, do some stuff in recent tracks
        if (typeof response.history !== 'undefined')
        {
            // reset recent tracks
            if (recentTracks)
                recentTracks.innerHTML = ``;
            response.history.map(track => {
                console.dir(track);
                if (recentTracks)
                    recentTracks.innerHTML += `<div class="row">
                <div class="col-8">
                ${track.track}
                </div>
                <div class="col-4">
                ${track.likable && track.ID !== 0 ? `${likedTracks.indexOf(track.ID) === -1 ? `<button type="button" class="btn btn-wwsu-red m-1" id="track-like-${track.ID}" onclick="likeTrack(${track.ID});">Like</button>` : `<button type="button" class="btn btn-secondary m-1" id="track-like-${track.ID}">Liked</button>`}` : ``}
                </div>
                </div>`;
            });
        }
    } catch (e) {
        console.error(e);
    }
}

function clockTick() {
    Meta.time = moment(Meta.time).add(1, 'seconds');
}

// Send a message through the system
function sendMessage(privateMsg) {
    if (blocked || !nickname)
        return null;
    var message = quillGetHTML(quill.getContents());
    io.socket.post('/messages/send-web', {message: message, nickname: nickname.value, private: privateMsg}, function serverResponded(response, JWR) {
        try {
            //response = JSON.parse(response);
            if (response !== 'OK')
            {
                if (notificationsBox)
                    notificationsBox.innerHTML += `<div class="p-3 mb-2 bg-warning" style="color: #000000;"><span class="badge badge-primary" style="font-size: 1em;">${moment().format('LTS')}</span>There was an error submitting your message: ${response}</div>`;
                if (document.querySelector('#messages'))
                    $("#messages").animate({scrollTop: $("#messages").prop('scrollHeight')}, 1000);
                return null;
            }
            quill.setText('');
        } catch (e) {
            if (notificationsBox)
                notificationsBox.innerHTML += `<div class="p-3 mb-2 bg-warning" style="color: #000000;"><span class="badge badge-primary" style="font-size: 1em;">${moment().format('LTS')}</span>There was an error submitting your message. Either there was a network issue, or you sent a message too quickly (website visitors are limited to one message per minute). If this problem continues, email engineer@wwsu1069.org .</div>`;
            if (document.querySelector('#messages'))
                $("#messages").animate({scrollTop: $("#messages").prop('scrollHeight')}, 1000);
        }
    });
}

// Used to empty the chat box
function clearChat()
{
    if (notificationsBox)
        notificationsBox.innerHTML = '';
}

// Used to get info about a specific track to display as an overlay box
function loadTrackInfo(trackID) {
    console.log(`getting ${trackID}`)
    io.socket.post('/songs/get', {ID: trackID}, function serverResponded(response, JWR) {
        try {
            //response = JSON.parse(response);
            // WORK ON THIS: HTML table of song information
            if (document.querySelector('#trackModal'))
            {
                $('#trackModal').modal('show');
                $('#track-info-ID').html(response[0].ID);
                $('#track-info-status').html(response[0].enabled === 1 ? 'Enabled' : 'Disabled');
                document.getElementById('track-info-status').className = `table-${response[0].enabled === 1 ? 'success' : 'dark'}`;
                $('#track-info-artist').html(response[0].artist);
                $('#track-info-title').html(response[0].title);
                $('#track-info-album').html(response[0].album);
                $('#track-info-genre').html(response[0].genre);
                $('#track-info-duration').html(moment.duration(response[0].duration, 'seconds').format("HH:mm:ss"));
                $('#track-info-lastplayed').html(moment(response[0].date_played).isAfter('2002-01-01 00:00:01') ? moment(response[0].date_played).format('LLLL') : 'Unknown');
                $('#track-info-limits').html(`<ul>
            ${response[0].limit_action > 0 && response[0].count_played < response[0].play_limit ? `<li>Track has ${response[0].play_limit - response[0].count_played} spins left</li>` : ``}
            ${response[0].limit_action > 0 && response[0].count_played >= response[0].play_limit ? `<li>Track expired (reached spin limit)</li>` : ``}
            ${moment(response[0].start_date).isAfter() ? `<li>Track cannot be played until ${moment(response[0].start_date).format('LLLL')}</li>` : ``}
            ${moment(response[0].end_date).isBefore() && moment(response[0].end_date).isAfter('2002-01-01 00:00:01') ? `<li>Track expired on ${moment(response[0].end_date).format('LLLL')}</li>` : ``}
            </ul>`);
                $('#track-info-spins7').html(`last 7 days: ${response[0].spins["7"]}`);
                $('#track-info-spins30').html(`last 30 days: ${response[0].spins["30"]}`);
                $('#track-info-spinsytd').html(`since January 1: ${response[0].spins["YTD"]}`);
                $('#track-info-spinsyear').html(`last 365 days: ${response[0].spins["365"]}`);
                $('#track-info-request').html(response[0].request.HTML);
                $('#trackModal').modal('handleUpdate');
            }
        } catch (e) {
            console.dir(response[0]);
            console.error(e);
        }
    });
}

// Used to place a track request
function requestTrack(trackID) {
    var requestName = document.getElementById('track-request-name');
    var requestMessage = document.getElementById('track-request-message');
    var data = {ID: trackID, name: requestName.value, message: requestMessage.value};
    io.socket.post('/requests/place', data, function serverResponded(response, JWR) {
        try {
            iziToast.show({
                title: 'Request system success',
                message: 'Your request was placed. In automation, requests are played during breaks. During shows, it is up to DJ discretion.',
                color: 'green',
                zindex: 100,
                layout: 1,
                closeOnClick: true,
                position: 'bottomCenter',
                timeout: 15000
            });
            if (document.querySelector('#trackModal'))
                $('#trackModal').modal('hide');
        } catch (e) {
            iziToast.show({
                title: 'Request system failed',
                message: 'Failed to request this track. Please try again later.',
                color: 'red',
                zindex: 100,
                layout: 1,
                closeOnClick: true,
                position: 'bottomCenter',
                timeout: 5000
            });
        }
    });
}

// Used to load a list of tracks for the track request system
function loadTracks(skip = 0) {
    var songData = document.getElementById('song-data');
    var search = document.getElementById('searchterm');
    var query = {search: escapeHTML(search.value), skip: skip};
    var genreOptions = document.getElementById('filter-genre');
    var selectedOption = genreOptions.options[genreOptions.selectedIndex].value;
    if (selectedOption !== "0")
        query.genre = parseInt(selectedOption);
    if (skip === 0)
        songData.innerHTML = ``;
    io.socket.post('/songs/get', query, function serverResponded(response, JWR) {
        try {
            //response = JSON.parse(response);
            if (response.length > 0)
            {
                response.map(track => {
                    songData.innerHTML += `<div id="track-${track.ID}" class="p-1 m-1 border border-secondary bg-${(track.enabled === 1) ? 'wwsu-red' : 'dark'}" style="cursor: pointer;"><span id="track-l-${track.ID}">${track.artist} - ${track.title}</span></div>`;
                    skipIt++;
                });
            } else {
                skipIt = -1;
                songData.innerHTML += `<div class="text-align: center;">There are no more tracks to display</div>`;
            }
        } catch (e) {
            iziToast.show({
                title: 'Request system failed',
                message: 'Error loading tracks. Please try again later.',
                color: 'red',
                zindex: 100,
                layout: 1,
                closeOnClick: true,
                position: 'bottomCenter',
                timeout: 5000
            });
        }
    });
}

function loadGenres() {
    if (document.getElementById('filter-genre'))
    {
        io.socket.post('/songs/get-genres', {}, function serverResponded(response, JWR) {
            try {
                document.getElementById('filter-genre').innerHTML = `<option value="0">Filter by genre</option>`;
                var x = document.getElementById("filter-genre");
                response.reverse().map(subcat => {
                    var c = document.createElement("option");
                    c.value = subcat.ID;
                    c.text = subcat.name;
                    x.options.add(c, 1);
                });
            } catch (e) {
                iziToast.show({
                    title: 'Request system failed',
                    message: 'Error loading genres. Please try again later.',
                    color: 'red',
                    zindex: 100,
                    layout: 1,
                    closeOnClick: true,
                    position: 'bottomCenter',
                    timeout: 5000
                });
            }
        });
    }
}

function likeTrack(trackID) {
    io.socket.post('/songs/like', {trackID: trackID}, function serverResponded(response, JWR) {
        try {
            if (response !== 'OK')
            {
                iziToast.show({
                    title: 'Track liking failed',
                    message: 'That track cannot be liked at this time.',
                    color: 'red',
                    zindex: 100,
                    layout: 1,
                    closeOnClick: true,
                    position: 'bottomCenter',
                    timeout: 5000
                });
            } else {
                likedTracks.push(trackID);
                // reset recent tracks
                if (recentTracks)
                    recentTracks.innerHTML = ``;
                Meta.history.map(track => {
                    console.dir(track);
                    if (recentTracks)
                        recentTracks.innerHTML += `<div class="row">
                <div class="col-8">
                ${track.track}
                </div>
                <div class="col-4">
                ${track.likable && track.ID !== 0 ? `${likedTracks.indexOf(track.ID) === -1 ? `<button type="button" class="btn btn-wwsu-red m-1" id="track-like-${track.ID}" onclick="likeTrack(${track.ID});">Like</button>` : `<button type="button" class="btn btn-secondary m-1" id="track-like-${track.ID}">Liked</button>`}` : ``}
                </div>
                </div>`;
                });
                iziToast.show({
                    title: 'Track liking success',
                    message: 'You successfully liked that track.',
                    color: 'green',
                    zindex: 100,
                    layout: 1,
                    closeOnClick: true,
                    position: 'bottomCenter',
                    timeout: 5000
                });
            }
        } catch (e) {
            iziToast.show({
                title: 'Track liking failed',
                message: 'Error liking the track. Internal error.',
                color: 'red',
                zindex: 100,
                layout: 1,
                closeOnClick: true,
                position: 'bottomCenter',
                timeout: 5000
            });
        }
    });
}

window.onscroll = function (ev) {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && skipIt > -1) {
        loadTracks(skipIt);
    }
};

function addAnnouncement(announcement)
{
    if (moment(Meta.time).isAfter(moment(announcement.starts)) && moment(Meta.time).isBefore(moment(announcement.expires)))
    {
        var color = 'info';
        if (announcement.level === 'success')
            color = 'green';
        if (announcement.level === 'danger' || announcement.level === 'urgent')
            color = 'red';
        if (announcement.level === 'warning')
            color = 'yellow';
        announcementIDs.push(announcement.ID);
        iziToast.show({
            title: announcement.title,
            message: announcement.announcement,
            color: color,
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            close: true,
            position: 'bottomCenter',
            timeout: false
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
                }
            }
        }

        if (document.querySelector('#calendar'))
        {
            var caldata = document.querySelector("#calendar");
            caldata.innerHTML = ``;

            // Prepare the formatted calendar variable for our formatted events
            calendar = [];

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
                }
            };

            // Run through every event in memory, sorted by the comparison function, and add appropriate ones into our formatted calendar variable.
            Calendar().get().sort(compare)
                    .filter(event => (event.title.startsWith("Show:") || event.title.startsWith("Genre:") || event.title.startsWith("Playlist:") || event.title.startsWith("Prerecord:") || event.title.startsWith("Remote:") || event.title.startsWith("Sports:") || event.title.startsWith("Podcast:")) && moment(event.start).subtract(1, 'days').isSameOrBefore(moment(Meta.time)) && moment(event.end).isAfter(moment(Meta.time)))
                    .map(event =>
                    {
                        try {
                            var finalColor = (typeof event.color !== 'undefined' && /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(event.color)) ? hexRgb(event.color) : hexRgb('#787878');
                            finalColor.red = Math.round(finalColor.red);
                            finalColor.green = Math.round(finalColor.green);
                            finalColor.blue = Math.round(finalColor.blue);
                            caldata.innerHTML += `<div class="bs-callout bs-callout-default" style="width: 100%; border-color: rgb(${finalColor.red}, ${finalColor.green}, ${finalColor.blue}); background: rgba(${finalColor.red}, ${finalColor.green}, ${finalColor.blue}, 0.2);">
                                    <div class="container">
                                        <div class="row">
                                            <div class="col-4">
                                                ${moment(event.start).format("hh:mm A")} - ${moment(event.end).format("hh:mm A")}
                                            </div>
                                            <div class="col-8">
                                                ${event.title}
                                            </div>
                                        </div>
                                    </div></div>`;
                        } catch (e) {
                            console.error(e);
                            iziToast.show({
                                title: 'An error occurred - Please check the logs',
                                message: `Error occurred during calendar iteration in processCalendar.`
                            });
                        }
                    });
        }

        if (document.querySelector('#calendar3h'))
        {
            var caldata = document.querySelector("#calendar3h");
            caldata.innerHTML = ``;

            // Prepare the formatted calendar variable for our formatted events
            calendar = [];

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
                }
            };

            // Run through every event in memory, sorted by the comparison function, and add appropriate ones into our formatted calendar variable.
            Calendar().get().sort(compare)
                    .filter(event => (event.title.startsWith("Show:") || event.title.startsWith("Genre:") || event.title.startsWith("Playlist:") || event.title.startsWith("Prerecord:") || event.title.startsWith("Remote:") || event.title.startsWith("Sports:") || event.title.startsWith("Podcast:")) && moment(event.start).subtract(3, 'hours').isSameOrBefore(moment(Meta.time)) && moment(event.end).isAfter(moment(Meta.time)))
                    .map(event =>
                    {
                        try {
                            var finalColor = (typeof event.color !== 'undefined' && /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(event.color)) ? hexRgb(event.color) : hexRgb('#787878');
                            finalColor.red = Math.round(finalColor.red);
                            finalColor.green = Math.round(finalColor.green);
                            finalColor.blue = Math.round(finalColor.blue);
                            caldata.innerHTML += `<div class="bs-callout bs-callout-default" style="width: 100%; border-color: rgb(${finalColor.red}, ${finalColor.green}, ${finalColor.blue}); background: rgba(${finalColor.red}, ${finalColor.green}, ${finalColor.blue}, 0.2);">
                                    <div class="container">
                                        <div class="row">
                                            <div class="col-4">
                                                ${moment(event.start).format("hh:mm A")} - ${moment(event.end).format("hh:mm A")}
                                            </div>
                                            <div class="col-8">
                                                <p class="text-warning-light">${event.title}</p>
                                                <p class="text-info-light">${event.description}</p>
                                            </div>
                                        </div>
                                    </div></div>`;
                        } catch (e) {
                            console.error(e);
                            iziToast.show({
                                title: 'An error occurred - Please check the logs',
                                message: `Error occurred during calendar iteration in processCalendar.`
                            });
                        }
                    });
        }
    } catch (e) {
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during the call of processCalendar.'
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

function rgbHex(red, green, blue, alpha) {
    try {
        const isPercent = (red + (alpha || '')).toString().includes('%');

        if (typeof red === 'string') {
            const res = red.match(/(0?\.?\d{1,3})%?\b/g).map(Number);
            // TODO: use destructuring when targeting Node.js 6
            red = res[0];
            green = res[1];
            blue = res[2];
            alpha = res[3];
        } else if (alpha !== undefined) {
            alpha = parseFloat(alpha);
        }

        if (typeof red !== 'number' ||
                typeof green !== 'number' ||
                typeof blue !== 'number' ||
                red > 255 ||
                green > 255 ||
                blue > 255) {
            throw new TypeError('Expected three numbers below 256');
        }

        if (typeof alpha === 'number') {
            if (!isPercent && alpha >= 0 && alpha <= 1) {
                alpha = Math.round(255 * alpha);
            } else if (isPercent && alpha >= 0 && alpha <= 100) {
                alpha = Math.round(255 * alpha / 100);
            } else {
                throw new TypeError(`Expected alpha value (${alpha}) as a fraction or percentage`);
            }
            alpha = (alpha | 1 << 8).toString(16).slice(1);
        } else {
            alpha = '';
        }

        return ((blue | green << 8 | red << 16) | 1 << 24).toString(16).slice(1) + alpha;
    } catch (e) {
        console.error(e);
        iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: 'Error occurred during rgbHex.'
        });
    }
}
;