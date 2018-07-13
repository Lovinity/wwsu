/* global io, moment, iziToast, Infinity */

// Load HTML elements
var nowPlaying = document.getElementById('nowplaying');
var notificationsBox = document.getElementById('messages');
var messageText = document.getElementById('themessage');
var nickname = document.getElementById('nickname');
var sendButton = document.getElementById('sendmessage');

// Load variables
var messageIDs = [];
var announcementIDs = [];
var automationpost = null;
var Meta = {};
var shouldScroll = false;
var skipIt = 0;
var blocked = false;
var firstTime = true;
var nicknameTimer = null;

// Initialize the web player
$("#nativeflashradio").flashradio({
    userinterface: "small",
    backgroundcolor: "#263238",
    themecolor: "#d31e38",
    themefontcolor: "#ffffff",
    startvolume: "75",
    radioname: "WWSU 106.9 FM",
    scroll: "auto",
    autoplay: "true",
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
    streamurl: "http://server.wwsu1069.org",
    songinformationinterval: "600000"
});

function waitFor(check, callback, count = 0)
{
    if (!check())
    {
        if (count < 1200)
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
    $('#trackModal').modal('hide');
}

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

// On socket disconnect, notify the user.
io.socket.on('disconnect', function () {
    try {
        console.log('Lost connection');
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
        console.error(e);
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
        console.error(e);
    }
});

// On meta changes, process meta
io.socket.on('discipline', function (data) {
    console.dir(data);
    iziToast.show({
        title: `Notice`,
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

function doSockets(firsttime = false)
{
    onlineSocket();
    messagesSocket();
    metaSocket();
    announcementsSocket();
}

function onlineSocket()
{
    io.socket.post('/recipients/add-web', {}, function serverResponded(body, JWR) {
        try {
            nickname.value = body.label;
            nickname.value = nickname.value.replace('Web ', '');
            nickname.value = nickname.value.match(/\(([^)]+)\)/)[1];
        } catch (e) {
            console.error(e);
            setTimeout(onlineSocket, 10000);
        }
    });
}

function messagesSocket()
{
    io.socket.post('/messages/get-web', {}, function serverResponded(body, JWR) {
        //console.log(body);
        try {
            body.forEach(function (message) {
                if (messageIDs.indexOf(message.ID) === -1)
                {
                    addMessage(message, firstTime);
                }
            });
            firstTime = false;
        } catch (e) {
            console.error(e);
            setTimeout(messagesSocket, 10000);
        }
    });
}

function metaSocket()
{
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
        } catch (e) {
            console.error(e);
            setTimeout(metaSocket, 10000);
        }
    });
}

function announcementsSocket()
{
    io.socket.post('/announcements/get', {type: 'website'}, function serverResponded(body, JWR) {
        //console.log(body);
        try {
            body.forEach(function (announcement) {
                if (announcementIDs.indexOf(announcement.ID) === -1)
                {
                    addAnnouncement(announcement);
                }
            });
        } catch (e) {
            console.error(e);
            setTimeout(announcementsSocket, 10000);
        }
    });
}

// Whenever the nickname is changed, (re)set a 5 second timeout. After 5 seconds, if nickname is not changed, send the new nickname to the server for all clients to see.
nickname.addEventListener("change", function () {
    io.socket.post('/recipients/edit-web', {label: nickname.value}, function serverResponded(body, JWR) {
    });
});

// Function called when a new message arrived that should be displayed
function addMessage(data, firsttime = false)
{
    shouldScroll = notificationsBox.scrollTop + notificationsBox.clientHeight === notificationsBox.scrollHeight;

    // Note the ID; used to determine new messages upon reconnection of a socket disconnect
    messageIDs.push(data.ID);

    // Private website message
    if (data.to.startsWith("website-"))
    {
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
    if (shouldScroll) {
        $("#messages").animate({scrollTop: $("#messages").prop('scrollHeight')}, 1000);
}
}

// Process meta info. Pass new meta received as response object.
function doMeta(response)
{
    try {
        shouldScroll = notificationsBox.scrollTop + notificationsBox.clientHeight === notificationsBox.scrollHeight;

        // Update meta and color code it, if new meta was provided
        if ('line1' in response || 'line2' in response)
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
        }

        // If a false was returned for web chatting, then disable it
        if ('webchat' in response && !response.webchat)
        {
            blocked = true;
            messageText.disabled = true;
            sendButton.disabled = true;
            notificationsBox.innerHTML = `<div class="p-3 mb-2 bg-wwsu-red" id="msg-disabled">The web chat is currently disabled for this show.</div>`;
            if (shouldScroll) {
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
                    notificationsBox.innerHTML += `<div class="p-3 mb-2 bg-wwsu-red text-warning" id="msg-state">No one is on the air at this time. There may not be anyone in the studio to read your messages.</div>`;
                    if (shouldScroll) {
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
                    notificationsBox.innerHTML += `<div class="p-3 mb-2 bg-wwsu-red text-warning" id="msg-state">The current show airing is a prerecord. There may not be anyone in the studio to read your messages.</div>`;
                    automationpost = response.live;
                    if (shouldScroll) {
                        $("#messages").animate({scrollTop: $("#messages").prop('scrollHeight')}, 1000);
                    }
                }
            } else {
                if (automationpost !== response.live)
                {
                    var temp = document.getElementById('msg-state');
                    if (temp)
                        temp.remove();
                    notificationsBox.innerHTML += `<div class="p-3 mb-2 bg-wwsu-red text-warning" id="msg-state">There is a show airing now. Your messages should be received by the host.</div>`;
                    automationpost = response.live;
                    if (shouldScroll) {
                        $("#messages").animate({scrollTop: $("#messages").prop('scrollHeight')}, 1000);
                    }
                }
            }
        }
        blocked = false;
        messageText.disabled = false;
        sendButton.disabled = false;
        var temp = document.getElementById('msg-disabled');
        if (temp)
            temp.remove();
    } catch (e) {
        console.error(e);
    }
}

// Send a message through the system
function sendMessage(privateMsg) {
    if (blocked)
        return null;
    io.socket.post('/messages/send-web', {message: messageText.value, nickname: nickname.value, private: privateMsg}, function serverResponded(response, JWR) {
        try {
            //response = JSON.parse(response);
            if (response !== 'OK')
            {
                notificationsBox.innerHTML += `<div class="p-3 mb-2 bg-warning" style="color: #000000;"><span class="badge badge-primary" style="font-size: 1em;">${moment().format('LTS')}</span>There was an error submitting your message: ${response}</div>`;
                $("#messages").animate({scrollTop: $("#messages").prop('scrollHeight')}, 1000);
                return null;
            }
            messageText.value = '';
        } catch (e) {
            notificationsBox.innerHTML += `<div class="p-3 mb-2 bg-warning" style="color: #000000;"><span class="badge badge-primary" style="font-size: 1em;">${moment().format('LTS')}</span>There was an error submitting your message. Either there was a network issue, or you sent a message too quickly (website visitors are limited to one message per minute). If this problem continues, email engineer@wwsu1069.org .</div>`;
            $("#messages").animate({scrollTop: $("#messages").prop('scrollHeight')}, 1000);
        }
    });
}

// Used to empty the chat box
function clearChat()
{
    notificationsBox.innerHTML = '';
}

// Used to get info about a specific track to display as an overlay box
function loadTrackInfo(trackID) {
    $('#trackModal').modal('show');
    var modalBody = document.getElementById('track-info-body');
    modalBody.innerHTML = 'Loading track information...';
    $('#trackModal').modal('handleUpdate');
    io.socket.post('/songs/get', {ID: trackID}, function serverResponded(response, JWR) {
        try {
            //response = JSON.parse(response);
            // WORK ON THIS: HTML table of song information
            $('#trackModal').modal('handleUpdate');
        } catch (e) {
            modalBody.innerHTML = 'Failed to load track information. Please try again later.';
            $('#trackModal').modal('handleUpdate');
        }
    });
}

// Used to place a track request
function requestTrack(trackID) {
    var modalBody = document.getElementById('track-info-body');
    var requestName = document.getElementById('request-name');
    var requestMessage = document.getElementById('request-message');
    var data = {ID: trackID, name: requestName.value, message: requestMessage.value};
    modalBody.innerHTML = 'Requesting track...';
    $('#trackModal').modal('handleUpdate');
    io.socket.post('/requests/place', data, function serverResponded(response, JWR) {
        try {
            modalBody.innerHTML = response;
            $('#trackModal').modal('handleUpdate');
        } catch (e) {
            modalBody.innerHTML = 'Failed to place request at this time. Please try again later.';
            $('#trackModal').modal('handleUpdate');
        }
    });
}

// Used to load a list of tracks for the track request system
function loadTracks(offset = 0) {
    var songData = document.getElementById('song-data');
    var search = document.getElementById('searchterm');
    var query = {search: escapeHTML(search.value), offset: offset};
    if (offset === 0)
        songData.innerHTML = ``;
    io.socket.post('/songs/get', query, function serverResponded(response, JWR) {
        try {
            //response = JSON.parse(response);
            response.forEach(function (track) {
                songData.innerHTML += `<div id="track-${track.ID}" class="p-1 m-1 border border-secondary bg-${(track.request.requestable) ? 'success' : 'danger'}" onclick="loadTrackInfo(${track.ID});" style="cursor: pointer;"><span>${track.artist} - ${track.title}</span></div>`;
                if (track.ID > skipIt)
                    skipIt = track.ID;
            });
        } catch (e) {
            iziToast.show({
                title: 'Request failed',
                message: 'Error loading tracks. Please try again later.',
                color: 'red',
                zindex: 100,
                layout: 1,
                closeOnClick: true,
                position: 'bottomCenter',
                timeout: 5000
            });
            console.error(e);
        }
    });
}
loadTracks(0);

$('#trackrequests').bind('scroll', function () {
    if ($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
        skipIt += 25;
        loadTracks(skipIt);
    }
});

function addAnnouncement(announcement)
{
    if (moment(Meta.time).isAfter(moment(announcement.starts)) && moment(Meta.time).isBefore(moment(announcement.ends)))
    {
        announcementIDs.push(announcement.ID);
        iziToast.show({
            title: 'Announcement from WWSU',
            message: announcement.announcement,
            color: 'red',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            close: true,
            position: 'bottomCenter',
            timeout: false
        });
    }
}
