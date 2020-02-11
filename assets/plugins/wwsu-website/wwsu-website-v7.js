try {
    // Initialize sails.js socket connection to WWSU
    io.sails.url = 'https://server.wwsu1069.org'
    io.sails.query = `host=21b1dd149aeac1f8cc2e8174dce0494e9ae60b9f746be71319ac6c3476968e00` // TODO: Remove when live
    var socket = io.sails.connect()
    var noReq = new WWSUreq(socket, '21b1dd149aeac1f8cc2e8174dce0494e9ae60b9f746be71319ac6c3476968e00') // TODO: Remove host string when live

    // WWSU Variables
    var Meta = { time: moment().toISOString(true), history: [], webchat: true, state: 'unknown' }
    var likedTracks = [];
    var announcementIDs = [];
    var messageIDs = [];
    var navigation = new WWSUNavigation();
    var calendardb = new CalendarDb();
    var newMessages = 0;
    var client = '';
    var automationpost = ``;
    var Subscriptions = TAFFY();
    var blocked = false;

    // Operation Variables
    var firstTime = true;

    // oneSignal Variables
    var onlineSocketDone = false;
    var device = getUrlParameter(`device`);
    var isMobile = device !== null;
    var notificationsSupported = false;
    var OneSignal;

    // Timers
    var clockTimer; // Used for ticking Meta.time

} catch (e) {
    console.error(e);
    $(document).Toasts('create', {
        class: 'bg-danger',
        title: 'Error initializing',
        body: 'There was an error initializing the website. Please report this to engineer@wwsu1069.org.',
        icon: 'fas fa-skull-crossbones fa-lg',
    });
}

// Tasks to perform when the website is fully loaded
$(document).ready(function () {
    try {
        // Initialize the web player
        if (document.querySelector('#nativeflashradio')) {
            $('#nativeflashradio').flashradio({
                token: 'dGZzd2ZzL3h4dHYyMTc6L3BzaAE=',
                userinterface: 'small',
                backgroundcolor: '#263238',
                themecolor: '#d31e38',
                themefontcolor: '#ffffff',
                startvolume: '75',
                radioname: 'WWSU 106.9 FM',
                scroll: 'auto',
                autoplay: 'false',
                useanalyzer: 'real',
                analyzertype: '4',
                usecover: 'true',
                usestreamcorsproxy: 'false',
                affiliatetoken: '1000lIPN',
                debug: 'false',
                ownsongtitleurl: '',
                radiocover: '',
                songgooglefontname: '',
                songfontname: '',
                titlegooglefontname: '',
                titlefontname: '',
                corsproxy: 'https://html5radioplayer2us.herokuapp.com/?q=',
                streamprefix: '/stream',
                mountpoint: '',
                radiouid: '',
                apikey: '',
                streamid: '1',
                streampath: '/live',
                streamtype: 'other',
                streamurl: 'https://server.wwsu1069.org',
                songinformationinterval: '600000'
            })
        }

        // Add accessibility properties to flash player
        waitForElement('#nativeflashradioplaystopcontainer', (element) => {
            $('#nativeflashradioplaystopcontainer').attr('tabindex', 0)
        })
        waitForElement('#nativeflashradiovolumegrab', (element) => {
            $('#nativeflashradiovolumegrab').attr('tabindex', 0)
            $('#nativeflashradiovolumegrab').attr('alt', 'Change Volume')
        })
        waitForElement('#nativeflashradiovolumehit', (element) => {
            $('#nativeflashradiovolumehit').attr('alt', 'Volume')
        })
        waitForElement('#nativeflashradioimagehit1', (element) => {
            $('#nativeflashradioimagehit1').attr('alt', 'logo')
        })

        // Initialize menu items
        navigation.addItem('#nav-nowplaying', '#section-nowplaying', '', true);
        navigation.addItem('#nav-chat', '#section-chat', '/chat', false, () => {
            newMessages = 0;
            updateNewMessages();
        });
        navigation.addItem('#nav-schedule', '#section-schedule', '/schedule');

        // Add change event for chat-nickname
        $('#chat-nickname').change(function () {
            socket.post('/recipients/edit-web', { label: $(this).val() }, function serverResponded () { })
        });

    } catch (e) {
        console.error(e);
        $(document).Toasts('create', {
            class: 'bg-danger',
            title: 'Error in document.ready',
            body: 'There was an error in the document.ready function. Please report this to engineer@wwsu1069.org.',
            icon: 'fas fa-skull-crossbones fa-lg',
        });
    }
});



/*
    SOCKET EVENTS
*/



// Socket connect
socket.on('connect', () => {
    doSockets(firstTime);
});

// Disconnection; try to re-connect
socket.on('disconnect', () => {
    try {
        io.socket._raw.io._reconnection = true
        io.socket._raw.io._reconnectionAttempts = Infinity
    } catch (unusedE) {
    }
})



/*
    UTILITY FUNCTIONS
*/


/**
 * Get the value of the specified URL parameter
 * 
 * @param {string} name Name of URL parameter to fetch
 * @returns {?string} Value of the URL parameter being fetched, or null if not set.
 */
function getUrlParameter (name) {
    try {
        name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]')
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)')
        var results = regex.exec(window.location.search)
        return results === null ? null : decodeURIComponent(results[ 1 ].replace(/\+/g, ' '))
    } catch (e) {
        console.error(e);
        $(document).Toasts('create', {
            class: 'bg-danger',
            title: 'Error in getUrlParameter function',
            body: 'There was an error in the getUrlParameter function. Please report this to engineer@wwsu1069.org.',
            icon: 'fas fa-skull-crossbones fa-lg',
        });
    }
}

/**
 * Convert a hexadecimal color into its RGBA values.
 * 
 * @param {string} hex A hexadecimal color
 * @param {object} options options.format: specify "array" to return as [red, green, blue, alpha] instead of object
 * @returns {object || array} {red, green, blue, alpha} or [red, green, blue, alpha] values
 */
function hexRgb (hex, options = {}) {

    // function-specific values
    var hexChars = 'a-f\\d'
    var match3or4Hex = `#?[${hexChars}]{3}[${hexChars}]?`
    var match6or8Hex = `#?[${hexChars}]{6}([${hexChars}]{2})?`
    var nonHexChars = new RegExp(`[^#${hexChars}]`, 'gi')
    var validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, 'i')

    try {
        if (typeof hex !== 'string' || nonHexChars.test(hex) || !validHexSize.test(hex)) {
            throw new TypeError('Expected a valid hex string')
        }

        hex = hex.replace(/^#/, '')
        let alpha = 255

        if (hex.length === 8) {
            alpha = parseInt(hex.slice(6, 8), 16) / 255
            hex = hex.substring(0, 6)
        }

        if (hex.length === 4) {
            alpha = parseInt(hex.slice(3, 4).repeat(2), 16) / 255
            hex = hex.substring(0, 3)
        }

        if (hex.length === 3) {
            hex = hex[ 0 ] + hex[ 0 ] + hex[ 1 ] + hex[ 1 ] + hex[ 2 ] + hex[ 2 ]
        }

        const num = parseInt(hex, 16)
        const red = num >> 16
        const green = (num >> 8) & 255
        const blue = num & 255

        return options.format === 'array'
            ? [ red, green, blue, alpha ]
            : { red, green, blue, alpha }
    } catch (e) {
        console.error(e)
        $(document).Toasts('create', {
            class: 'bg-danger',
            title: 'hexrgb error',
            body: 'There was an error in the hexrgb function. Please report this to engineer@wwsu1069.org.',
            icon: 'fas fa-skull-crossbones fa-lg',
        });
    }
}



/*
    DISCIPLINE FUNCTIONS
*/




socket.on('discipline', (data) => {
    socket.disconnect()
    $('#modal-discipline-title').html(`Disciplinary action issued - Disconnected from WWSU`);
    $('#modal-discipline-body').html(`<p>Disciplinary action was issued against you for the following reason: ${data.message}.</p>
<p>A ${data.action} was issued against you, and you may no longer use WWSU's services until the discipline expires.</p>
<p>Please contact gm@wwsu1069.org if you have any questions or concerns.</p>`);
    $('#modal-discipline').modal({ backdrop: 'static', keyboard: false });
})

/**
 * Check if this client has an active discipline on WWSU's API, and if so, display the #modal-discipline.
 * 
 * @param {function} cb Callback executed if user is not under a discipline
 */
function checkDiscipline (cb) {
    socket.post('/discipline/get-web', {}, function serverResponded (body) {
        try {
            var docb = true
            if (body.length > 0) {
                body.map((discipline) => {
                    var activeDiscipline = (discipline.active && (discipline.action !== 'dayban' || moment(discipline.createdAt).add(1, 'days').isAfter(moment())))
                    if (activeDiscipline) { docb = false }
                    if (activeDiscipline || !discipline.acknowledged) {
                        $('#modal-discipline-title').html(`Disciplinary action ${activeDiscipline ? `active against you` : `was issued in the past against you`}`);
                        $('#modal-discipline-body').html(`<p>On ${moment(discipline.createdAt).format('LLL')}, disciplinary action was issued against you for the following reason: ${discipline.message}.</p>
                <p>${activeDiscipline ? `A ${discipline.action} is currently active, and you are not allowed to use WWSU's services at this time.` : `The discipline has expired, but you must acknowledge this message before you may use WWSU's services. Further issues may warrant more severe disciplinary action.`}</p>
                <p>Please contact gm@wwsu1069.org if you have any questions or concerns.</p>`);
                        $('#modal-discipline').modal({ backdrop: 'static', keyboard: false });
                    }
                })
            }
            if (docb) {
                cb()
            }
        } catch (e) {
            console.error(e);
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error checking discipline',
                body: 'There was an error checking to see if you are allowed to access WWSU. Please try again later, or contact engineer@wwsu1069.org if this problem continues.',
                icon: 'fas fa-skull-crossbones fa-lg',
            })
        }
    })
}



/*
    SOCKET FUNCTIONS
*/



/**
 * Hit necessary WWSU API endpoints and subscribe to socket events.
 * 
 * @param {boolean} firsttime Whether or not this is the first time executing doSockets since the user loaded the page.
 */
function doSockets (firsttime = false) {
    // Mobile devices and web devices where device parameter was passed, start sockets immediately.
    if (isMobile || !firsttime || (!isMobile && device !== null)) {
        checkDiscipline(() => {
            tracksLikedSocket()
            metaSocket()
            announcementsSocket()
            calendarSocket()
            calendarExceptionsSocket()
            //loadGenres()
            onlineSocket()
            messagesSocket()
        })
        // web devices without device parameter, connect to OneSignal first and get the ID, then start sockets.
    } else {
        OneSignal = window.OneSignal || []
        checkDiscipline(() => {
            tracksLikedSocket()
            metaSocket()
            announcementsSocket()
            calendarSocket()
            calendarExceptionsSocket()
            //loadGenres()
            onlineSocket(true)
            messagesSocket()
        })
    }
}



/*
    META FUNCTIONS
*/




// On meta changes, process meta
socket.on('meta', (data) => {
    for (var key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            Meta[ key ] = data[ key ]
        }
    }
    doMeta(data)
})

/**
 * Hits meta/get and subscribes to meta socket.
 */
function metaSocket () {
    socket.post('/meta/get', {}, function serverResponded (body) {
        // console.log(body);
        try {
            for (var key in body) {
                if (Object.prototype.hasOwnProperty.call(body, key)) {
                    Meta[ key ] = body[ key ]
                }
            }
            doMeta(body)
        } catch (unusedE) {
            setTimeout(metaSocket, 10000)
        }
    })
}

/**
 * Process new meta received.
 * 
 * @param {object} response The new meta that was received from the API
 */
function doMeta (response) {
    try {

        var temp
        var temp2
        var temp3
        var temp4
        var subscribed

        // Reset Meta.time ticker
        if (typeof response.time !== 'undefined') {
            clearInterval(clockTimer)
            clearTimeout(clockTimer)
            clockTimer = setInterval(clockTick, 1000)
        }

        // Update meta, if new meta was provided
        if ('line1' in response || 'line2' in response) {

            // Update now playing icon
            if (Meta.state.startsWith('live_') || Meta.state.startsWith('prerecord_')) {
                $('.nowplaying-icon').html(`<i class="profile-user-img img-fluid img-circle fas fa-microphone bg-danger"></i>`);
            }
            if (Meta.state.startsWith('sports_') || Meta.state.startsWith('sportsremote_')) {
                $('.nowplaying-icon').html(`<i class="profile-user-img img-fluid img-circle fas fa-basketball-ball bg-success"></i>`);
            }
            if (Meta.state.startsWith('remote_')) {
                $('.nowplaying-icon').html(`<i class="profile-user-img img-fluid img-circle fas fa-broadcast-tower bg-purple"></i>`);
            }
            if (Meta.state.startsWith('automation_') || Meta.state === 'unknown') {
                $('.nowplaying-icon').html(`<i class="profile-user-img img-fluid img-circle fas fa-music bg-primary"></i>`);
            }

            // Update now playing text
            $('.nowplaying-line1').html(Meta.line1);
            $('.nowplaying-line2').html(Meta.line2);
            $('.nowplaying-topic').html(Meta.topic);

            // Display a 10-second toast
            $(document).Toasts('create', {
                class: 'bg-primary',
                title: 'Now Playing',
                autohide: true,
                delay: 10000,
                body: `<p>${Meta.line1}</p><p>${Meta.line2}</p>`,
                icon: 'fas fa-play fa-lg',
            })

            // Refresh calendar each time a new track is given
            // TODO
            //updateCalendar()
        }

        // TODO: If a false was returned for web chatting, then disable it
        /*
        if ('webchat' in response && !response.webchat && messageText) {
            blocked = true
            messageText.style.display = 'none'
            sendButton.disabled = true
            sendButtonP.disabled = true
            if (notificationsStatus && onlineSocketDone) { notificationsStatus.innerHTML = `<div class="p-3 bs-callout bs-callout-danger shadow-4 text-light"><h4>Chat Status: Disabled</h4>The host of the current show, or a director, has disabled the chat. Please try again after the show has ended.</div>` }
            if (shouldScroll && document.querySelector('#messages')) {
                $('#messages').animate({ scrollTop: $('#messages').prop('scrollHeight') }, 1000)
            }
        }
        */

        /* TODO
        // If a state change was returned, process it by informing the client whether or not there is probably a DJ at the studio to read messages
        if ('state' in response) {
            if (response.state.startsWith('automation_') || Meta.state === 'unknown') {
                if (automationpost !== 'automation') {
                    temp = document.getElementById('msg-state')
                    if (temp) { temp.remove() }
                    if (notificationsStatus && onlineSocketDone) { notificationsStatus.innerHTML = `<div class="p-3 bs-callout bs-callout-default shadow-4 text-light"><h4>Chat Status: Off the Air</h4>No one is on the air at this time. There might not be anyone in the studio at this time to read your message.</div>` }
                    if (shouldScroll && document.querySelector('#messages')) {
                        $('#messages').animate({ scrollTop: $('#messages').prop('scrollHeight') }, 1000)
                    }
                    automationpost = 'automation'
                }
                temp = document.querySelector(`#show-subscribe`)
                if (temp !== null) { temp.style.display = 'none' }
            } else if (response.state.startsWith('prerecord_')) {
                if (automationpost !== response.show) {
                    temp = document.getElementById('msg-state')
                    if (temp) { temp.remove() }
                    if (notificationsStatus && onlineSocketDone) { notificationsStatus.innerHTML = `<div class="p-3 bs-callout bs-callout-warning shadow-4 text-light"><h4>Chat Status: Prerecord</h4>The current show airing is prerecorded. There might not be anyone in the studio at this time to read your message.</div>` }
                    automationpost = response.show
                    if (shouldScroll && document.querySelector('#messages')) {
                        $('#messages').animate({ scrollTop: $('#messages').prop('scrollHeight') }, 1000)
                    }
                }
                temp = document.querySelector(`#show-subscribe`)
                temp2 = document.querySelector(`#show-subscribe-button`)
                temp3 = document.querySelector(`#show-subscribe-name`)
                temp4 = document.querySelector(`#show-subscribe-instructions`)
                if (temp !== null) {
                    subscribed = Subscriptions({ type: `calendar-all`, subtype: Meta.state.startsWith('sports') ? `Sports: ${Meta.show}` : Meta.show }).get().length
                    if (subscribed === 0) {
                        temp.style.display = 'block'
                    } else {
                        temp.style.display = 'none'
                    }
                    temp3.innerHTML = Meta.show
                    if (notificationsSupported || isMobile) {
                        if (device === null && !isMobile) {
                            temp2.innerHTML = 'Show Prompt'
                            temp4.innerHTML = `First, click "Show Prompt" and allow notifications. Then when the button turns to "Subscribe", click it again.`
                            temp2.onclick = () => OneSignal.showSlidedownPrompt({ force: true })
                            temp2.onkeydown = () => OneSignal.showSlidedownPrompt({ force: true })
                        } else {
                            temp2.innerHTML = 'Subscribe'
                            temp4.innerHTML = `Click "Subscribe" to receive notifications when this show is on the air.`
                            temp2.onclick = () => {
                                if (Meta.state.startsWith('live_') || Meta.state.startsWith('remote_')) {
                                    subscribe(`calendar-all`, Meta.show)
                                } else if (Meta.state.startsWith('sports_') || Meta.state.startsWith('sportsremote_')) {
                                    subscribe(`calendar-all`, `Sports: ${Meta.show}`)
                                }
                            }
                            temp2.onkeydown = () => {
                                if (Meta.state.startsWith('live_') || Meta.state.startsWith('remote_')) {
                                    subscribe(`calendar-all`, Meta.show)
                                } else if (Meta.state.startsWith('sports_') || Meta.state.startsWith('sportsremote_')) {
                                    subscribe(`calendar-all`, `Sports: ${Meta.show}`)
                                }
                            }
                        }
                    } else {
                        temp2.innerHTML = 'Not Supported'
                        temp4.innerHTML = `Sorry, push notifications are not supported on your browser at this time. Stay tuned as we will be releasing a WWSU mobile app in the future!`
                        temp2.onclick = () => { }
                        temp2.onkeydown = () => { }
                    }
                }
            } else {
                if (automationpost !== response.show) {
                    temp = document.getElementById('msg-state')
                    if (temp) { temp.remove() }
                    if (notificationsStatus && onlineSocketDone) { notificationsStatus.innerHTML = `<div class="p-3 bs-callout bs-callout-success shadow-4 text-light"><h4>Chat Status: Enabled</h4>The show airing now is live. Your messages should be received by the DJ / host.</div>` }
                    automationpost = response.show
                    if (shouldScroll && document.querySelector('#messages')) {
                        $('#messages').animate({ scrollTop: $('#messages').prop('scrollHeight') }, 1000)
                    }
                }
                temp = document.querySelector(`#show-subscribe`)
                temp2 = document.querySelector(`#show-subscribe-button`)
                temp3 = document.querySelector(`#show-subscribe-name`)
                temp4 = document.querySelector(`#show-subscribe-instructions`)
                if (temp !== null) {
                    subscribed = Subscriptions({ type: `calendar-all`, subtype: Meta.state.startsWith('sports') ? `Sports: ${Meta.show}` : Meta.show }).get().length
                    if (subscribed === 0) {
                        temp.style.display = 'block'
                    } else {
                        temp.style.display = 'none'
                    }
                    temp3.innerHTML = Meta.show
                    if (notificationsSupported || isMobile) {
                        if (device === null && !isMobile) {
                            temp2.innerHTML = 'Show Prompt'
                            temp4.innerHTML = `First, click "Show Prompt" and allow notifications. Then when the button turns to "Subscribe", click it again.`
                            temp2.onclick = () => OneSignal.showSlidedownPrompt({ force: true })
                            temp2.onkeydown = () => OneSignal.showSlidedownPrompt({ force: true })
                        } else {
                            temp2.innerHTML = 'Subscribe'
                            temp4.innerHTML = `Click "Subscribe" to receive notifications when this show goes on the air.`
                            temp2.onclick = () => {
                                if (Meta.state.startsWith('live_') || Meta.state.startsWith('remote_')) {
                                    subscribe(`calendar-all`, Meta.show)
                                } else if (Meta.state.startsWith('sports_') || Meta.state.startsWith('sportsremote_')) {
                                    subscribe(`calendar-all`, `Sports: ${Meta.show}`)
                                }
                            }
                            temp2.onkeydown = () => {
                                if (Meta.state.startsWith('live_') || Meta.state.startsWith('remote_')) {
                                    subscribe(`calendar-all`, Meta.show)
                                } else if (Meta.state.startsWith('sports_') || Meta.state.startsWith('sportsremote_')) {
                                    subscribe(`calendar-all`, `Sports: ${Meta.show}`)
                                }
                            }
                        }
                    } else {
                        temp2.innerHTML = 'Not Supported'
                        temp4.innerHTML = `Sorry, push notifications are not supported on your browser at this time. Stay tuned as we will be releasing a WWSU mobile app in the future!`
                        temp2.onclick = () => { }
                        temp2.onkeydown = () => { }
                    }
                }
            }
        }
        */

        /* TODO
        // Unblock webchat if chats are allowed
        if (Meta.webchat) {
            blocked = false
            if (messageText && onlineSocketDone) {
                messageText.style.removeProperty('display')
                sendButton.disabled = false
                sendButtonP.disabled = false
            }
            temp = document.getElementById('msg-disabled')
            if (temp) { temp.remove() }
        }
        */

        // If a track ID change was passed, do some stuff in recent tracks
        if (typeof response.history !== 'undefined') {
            // reset recent tracks
            $('.nowplaying-recentlyplayed').html(response.history.map(track => {
                return `<tr>
                <td>
                ${track.track}
                </td>
                <td>
                ${track.likable && track.ID !== 0 ? `${likedTracks.indexOf(track.ID) === -1 ? `<button type="button" class="btn btn-success btn-small" onclick="likeTrack(${track.ID});" onkeydown="likeTrack(${track.ID});" tabindex="0" title="Like this track; liked tracks play more often on WWSU.">Like Track</button>` : `<button type="button" class="btn btn-outline-success btn-small disabled" tabindex="0" title="You already liked this track.">Already Liked</button>`}` : ``}
                </td>
                </tr>`
            }));
        }

    } catch (e) {
        console.error(e)
    }
}

function clockTick () {
    Meta.time = moment(Meta.time).add(1, 'seconds')
}




/*
    TRACK LIKING FUNCTIONS
*/


/**
 * Fetch the tracks liked by this user.
 */
function tracksLikedSocket () {
    socket.post('/songs/get-liked', {}, function serverResponded (body) {
        try {
            likedTracks = body
            doMeta({ history: Meta.history })
        } catch (unusedE) {
            setTimeout(tracksLikedSocket, 10000)
        }
    })
}

/**
 * Mark a track as liked through the WWSU API.
 * 
 * @param {integer} trackID The ID number of the track to like
 */
function likeTrack (trackID) {
    socket.post('/songs/like', { trackID: trackID }, function serverResponded (response) {
        try {
            if (response !== 'OK') {
                $(document).Toasts('create', {
                    class: 'bg-warning',
                    title: 'Could Not Like Track',
                    subtitle: trackID,
                    autohide: true,
                    delay: 10000,
                    body: `<p>There was a problem liking that track. Most likely, this track played over 30 minutes ago and cannot be liked.</p>`,
                    icon: 'fas fa-music fa-lg',
                })
            } else {

                likedTracks.push(trackID)

                $(document).Toasts('create', {
                    class: 'bg-success',
                    title: 'Track Liked',
                    subtitle: trackID,
                    autohide: true,
                    delay: 10000,
                    body: `<p>You successfully liked a track!</p><p>Tracks people like will play more often on WWSU.</p>`,
                    icon: 'fas fa-music fa-lg',
                })

                // Re-process meta so the recent tracks list is updated
                doMeta({ history: Meta.history });
            }
        } catch (unusedE) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Track Liking Error',
                subtitle: trackID,
                autohide: true,
                delay: 10000,
                body: `<p>There was a problem liking that track. Please contact engineer@wwsu1069.org if you are having problems liking any tracks.</p>`,
                icon: 'fas fa-music fa-lg',
            })
        }
    })
}



/*
    ANNOUNCEMENTS FUNCTIONS
*/



socket.on('announcements', (data) => {
    try {
        if (announcementIDs.indexOf(data.ID) === -1) {
            addAnnouncement(data)
        }
    } catch (unusedE) {
    }
})

/**
 * Get website announcements and subscribe to sockets for website announcements.
 */
function announcementsSocket () {
    socket.post('/announcements/get', { type: 'website' }, function serverResponded (body) {
        // console.log(body);
        try {
            body
                .filter(announcement => announcementIDs.indexOf(announcement.ID) === -1)
                .map(announcement => addAnnouncement(announcement))
        } catch (unusedE) {
            setTimeout(announcementsSocket, 10000)
        }
    })
}

/**
 * Display an announcement if it was not already displayed.
 * 
 * @param {object} announcement Announcement object received from WWSU API.
 */
function addAnnouncement (announcement) {
    if (moment(Meta.time).isAfter(moment(announcement.starts)) && moment(Meta.time).isBefore(moment(announcement.expires))) {
        var color = 'bg-light'
        if (announcement.level === 'success') { color = 'bg-success' }
        if (announcement.level === 'danger' || announcement.level === 'urgent') { color = 'bg-danger' }
        if (announcement.level === 'warning') { color = 'bg-warning' }
        announcementIDs.push(announcement.ID)
        $(document).Toasts('create', {
            class: color,
            title: announcement.title,
            subtitle: `Announcement`,
            autohide: true,
            delay: (announcement.displayTime * 1000) || 15000,
            body: announcement.announcement,
            icon: 'fas fa-bullhorn fa-lg',
        })
    }
}




/*
    CALENDAR / SCHEDULE FUNCTIONS
*/



socket.on('calendar', (data) => {
    processCalendar(data)
})

socket.on('calendarexceptions', (data) => {
    processCalendarExceptions(data)
})

/**
 * Process calendar records.
 * 
 * @param {object} data Data received from WWSU according to websocket standards.
 * @param {boolean} replace Mark true if data is an array of records that should replace the database entirely.
 */
function processCalendar (data, replace = false) {
    calendardb.query('calendar', data, replace);
    updateCalendar();
}

/**
 * Process calendar exception records.
 * 
 * @param {object} data Data received from WWSU according to websocket standards.
 * @param {boolean} replace Mark true if data is an array of records that should replace the database entirely.
 */
function processCalendarExceptions (data, replace = false) {
    calendardb.query('calendarexceptions', data, replace);
    updateCalendar();
}

/**
 * Hit the calendar WWSU endpoint and subscribe to socket events.
 */
function calendarSocket () {
    socket.post('/calendar/get', {}, function serverResponded (body) {
        try {
            processCalendar(body, true)
        } catch (unusedE) {
            setTimeout(calendarSocket, 10000)
        }
    })
}

/**
 * Hit the calendar exceptions WWSU endpoint and subscribe to socket events.
 */
function calendarExceptionsSocket () {
    socket.post('/calendar/get-exceptions', {}, function serverResponded (body) {
        try {
            processCalendarExceptions(body, true)
        } catch (unusedE) {
            setTimeout(calendarExceptionsSocket, 10000)
        }
    })
}


/**
 * Re-process calendar events
 */
function updateCalendar () {
    $('#schedule-events').html('');

    // Get the value of the currently selected calendar item
    var selectedOption = $('#schedule-select').children("option:selected").val();
    selectedOption = parseInt(selectedOption);

    // Process events for the next 7 days
    var events = calendardb.getEvents(moment().add(selectedOption, 'days').startOf('day'), moment().add(selectedOption + 1, 'days').startOf('day'));

    var html = '';

    // Run through every event in memory and add appropriate ones into our formatted calendar variable.
    events
        .filter(event => [ 'event', 'onair-booking', 'prod-booking', 'office-hours' ].indexOf(event.type) === -1 && moment(event.start).isSameOrBefore(moment(Meta.time).startOf(`day`).add(selectedOption + 1, `days`)) && moment(event.start).isSameOrAfter(moment(Meta.time).startOf(`day`).add(selectedOption, `days`)))
        .map(event => {
            try {
                var colorClass = `secondary`;
                var iconClass = 'far fa-calendar-alt';

                switch (event.type) {
                    case 'genre':
                    case 'playlist':
                        colorClass = 'primary';
                        iconClass = 'fas fa-music';
                        break;
                    case 'show':
                        colorClass = 'danger';
                        iconClass = 'fas fa-microphone';
                        break;
                    case 'sports':
                        colorClass = 'success';
                        iconClass = 'fas fa-basketball-ball';
                        break;
                    case 'remote':
                        colorClass = 'purple';
                        iconClass = 'fas fa-broadcast-tower';
                        break;
                    case 'prerecord':
                        colorClass = 'pink';
                        iconClass = 'fas fa-play-circle';
                        break;
                }

                if ([ 'canceled', 'canceled-system', 'canceled-changed' ].indexOf(event.exceptionType) !== -1) { colorClass = 'dark' }

                var badgeInfo
                if ([ 'canceled-changed' ].indexOf(event.exceptionType) !== -1) {
                    badgeInfo = `<span class="badge-warning" style="font-size: 1em;">RESCHEDULED</span>`
                }
                if ([ 'updated', 'updated-system' ].indexOf(event.exceptionType) !== -1 && (event.newTime !== null || event.duration !== null)) {
                    badgeInfo = `<span class="badge badge-warning" style="font-size: 1em;">TEMP TIME CHANGE</span>`
                }
                if ([ 'canceled', 'canceled-system' ].indexOf(event.exceptionType) !== -1) {
                    badgeInfo = `<span class="badge badge-danger" style="font-size: 1em;">CANCELED</span>`
                }

                var shouldBeDark = [ 'canceled', 'canceled-system', 'canceled-changed' ].indexOf(event.exceptionType) !== -1 || moment().isAfter(moment(event.end))

                html += `<div class="col-md-4 col-lg-3">
                <div class="p-2 card card-${colorClass} card-outline${shouldBeDark ? ` bg-secondary` : ``}">
                  <div class="card-body box-profile">
                    <div class="text-center">
                    ${event.logo !== null ? `<img class="profile-user-img img-fluid img-circle" src="../../uploads/calendar/logo/${event.logo}" alt="Show Logo">` : `<i class="profile-user-img img-fluid img-circle ${iconClass} bg-${colorClass}" style="font-size: 5rem;"></i>`}
                    </div>
    
                    <h3 class="profile-username text-center">${event.name}</h3>
    
                    <p class="${!shouldBeDark ? `text-muted ` : ``}text-center">${event.hosts}</p>
    
                    <ul class="list-group list-group-unbordered mb-3 text-center">
                    ${badgeInfo ? `<li class="list-group-item${shouldBeDark ? ` bg-secondary` : ``}">
                    <b>${badgeInfo}</b>
                  </li>` : ``}
                    <li class="list-group-item${shouldBeDark ? ` bg-secondary` : ``}">
                        <b>${moment(event.start).format('hh:mm A')} - ${moment(event.end).format('hh:mm A')}</b>
                    </li>
                    </ul>
    
                    <a href="#" class="btn btn-primary btn-block" onclick="displayEventInfo('${event.unique}')" onkeydown="displayEventInfo('${event.unique}')" tabindex="0" title="Click to view more information about this event and to subscribe or unsubscribe from push notifications."><b>More Info / Notifications</b></a>
                  </div>
                </div>
              </div>`
            } catch (e) {
                console.error(e)
                $(document).Toasts('create', {
                    class: 'bg-danger',
                    title: 'calendar error',
                    body: 'There was an error in the updateCalendar function, event mapping. Please report this to engineer@wwsu1069.org.',
                    icon: 'fas fa-skull-crossbones fa-lg',
                });
            }
        })

    $('#schedule-events').html(html);

    for (var i = 1; i < 7; i++) {
        $(`#schedule-select-${i}`).html(moment(Meta.time).startOf(`day`).add(i, 'days').format(`dddd MM/DD`))
    }
}




/*
    CHAT FUNCTIONS
*/


// When a new message is received, process it.
socket.on('messages', (data) => {
    try {
        for (var key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                switch (key) {
                    case 'insert':
                        addMessage(data[ key ], firstTime)
                        break
                    case 'remove':
                        $(`#msg-${data[ key ]} .direct-chat-text`).html(`XXX This message was deleted XXX`)
                        break
                }
            }
        }
    } catch (unusedE) {
    }
})

/**
 * Updates all new message counts with the number of unread DJ messages
 */
function updateNewMessages () {
    $('.chat-newmessages').html(newMessages);
    if (newMessages < 1) {
        $('.chat-newmessages').removeClass('bg-danger');
        $('.chat-newmessages').addClass('bg-secondary');
    } else {
        $('.chat-newmessages').addClass('bg-danger');
        $('.chat-newmessages').removeClass('bg-secondary');
    }
}

/**
 * Hit the messages endpoint and subscribe to receiving messages.
 */
function messagesSocket () {
    socket.post('/messages/get-web', {}, function serverResponded (body) {
        //console.log(body);
        try {
            body
                .filter(message => messageIDs.indexOf(message.ID) === -1)
                .map(message => addMessage(message, firstTime))
            firstTime = false
        } catch (e) {
            console.error(e);
            setTimeout(messagesSocket, 10000)
        }
    })
}

/**
 * TODO: Process a new message in the chat and notifications.
 * 
 * @param {object} data Data object for the message from WWSU
 * @param {boolean} firsttime Whether or not this message was added on initial load (if true, no toast notification will display)
 */
function addMessage (data, firsttime = false) {

    // Note the ID; used to determine new messages upon reconnection of a socket disconnect
    messageIDs.push(data.ID);

    // Private website message
    if (data.to.startsWith('website-')) {
        $('#chat-messages').append(`<div class="direct-chat-msg" id="msg-${data.ID}">
        <div class="direct-chat-infos clearfix">
          <span class="direct-chat-name float-left">${data.fromFriendly} (Private Message)</span>
          <span class="direct-chat-timestamp float-right">${moment(data.createdAt).format('hh:mm A')}</span>
        </div>
        <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(data.from, 40)}</div>
        <div class="direct-chat-text bg-danger">
            ${data.message}
        </div>
      </div>`);
        if (!firsttime) {
            $(document).Toasts('create', {
                class: 'bg-success',
                title: 'Private Message from WWSU',
                autohide: true,
                delay: 15000,
                body: data.message,
                icon: 'fas fa-comments fa-lg',
            })
        }
        newMessages++;
        updateNewMessages();

        // Public website message for all visitors
    } else if (data.to === 'website') {
        $('#chat-messages').append(`<div class="direct-chat-msg" id="msg-${data.ID}">
        <div class="direct-chat-infos clearfix">
          <span class="direct-chat-name float-left">${data.fromFriendly}</span>
          <span class="direct-chat-timestamp float-right">${moment(data.createdAt).format('hh:mm A')}</span>
        </div>
        <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(data.from, 40)}</div>
        <div class="direct-chat-text bg-success">
            ${data.message}
        </div>
      </div>`);
        if (!firsttime) {
            $(document).Toasts('create', {
                class: 'bg-success',
                title: 'Message from WWSU',
                autohide: true,
                delay: 15000,
                body: data.message,
                icon: 'fas fa-comments fa-lg',
            })
        }
        newMessages++;
        updateNewMessages();

        // Private message sent from visitor
    } else if (data.to === 'DJ-private' && data.from !== client) {
        $('#chat-messages').append(`<div class="direct-chat-msg" id="msg-${data.ID}">
        <div class="direct-chat-infos clearfix">
          <span class="direct-chat-name float-left">${data.fromFriendly}</span>
          <span class="direct-chat-timestamp float-right">${moment(data.createdAt).format('hh:mm A')}</span>
        </div>
        <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(data.from, 40)}</div>
        <div class="direct-chat-text bg-secondary">
            ${data.message}
        </div>
      </div>`);
        if (!firsttime) {
            $(document).Toasts('create', {
                class: 'bg-success',
                title: 'Message',
                subtitle: data.fromFriendly,
                autohide: true,
                delay: 15000,
                body: data.message,
                icon: 'fas fa-comments fa-lg',
            })
        }

    } else if (data.from === client) {
        $('#chat-messages').append(`<div class="direct-chat-msg right">
        <div class="direct-chat-infos clearfix">
          <span class="direct-chat-name float-right">YOU${data.to === 'DJ-private' ? ` (Private Message)` : ``}</span>
          <span class="direct-chat-timestamp float-left">${moment(data.createdAt).format('hh:mm A')}</span>
        </div>
        <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(data.from, 40)}</div>
        <div class="direct-chat-text bg-success">
            ${data.message}
        </div>
      </div>`);

        // All other messages
    } else {
        $('#chat-messages').append(`<div class="direct-chat-msg" id="msg-${data.ID}">
        <div class="direct-chat-infos clearfix">
          <span class="direct-chat-name float-left">${data.fromFriendly}</span>
          <span class="direct-chat-timestamp float-right">${moment(data.createdAt).format('hh:mm A')}</span>
        </div>
        <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(data.from, 40)}</div>
        <div class="direct-chat-text bg-secondary">
            ${data.message}
        </div>
      </div>`);
    }
}

/**
 * Send whatever is in the message box as a message.
 * 
 * @param {boolean} privateMsg Is this message to be sent privately?
 */
function sendMessage (privateMsg = false) {
    if (blocked) { return null }
    socket.post('/messages/send-web', { message: $('#chat-message').val(), nickname: $('#chat-nickname').val(), private: privateMsg }, function serverResponded (response) {
        try {
            if (response !== 'OK') {
                $(document).Toasts('create', {
                    class: 'bg-warning',
                    title: 'Message Rejected',
                    body: 'WWSU rejected your message. This could be because you are sending messages too fast, or you are banned from sending messages.',
                    icon: 'fas fa-skull-crossbones fa-lg',
                });
                return null
            }
            $('#chat-message').val('');
        } catch (e) {
            console.error(e);
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error sending message',
                body: 'There was an error sending your message. Please report this to engineer@wwsu1069.org.',
                icon: 'fas fa-skull-crossbones fa-lg',
            });
        }
    })
}




/*
    ONLINE FUNCTIONS
*/




/**
 * Register this client as online with WWSU, and get client info.
 * 
 * @param {boolean} doOneSignal Should we initialize OneSignal?
 */
function onlineSocket (doOneSignal = false) {
    socket.post('/recipients/add-web', { device: device }, function serverResponded (body) {
        try {
            $('#chat-nickname').val(body.label.replace('Web ', '').match(/\(([^)]+)\)/)[ 1 ])
            client = body.host;
            onlineSocketDone = true
            automationpost = ``
            doMeta({ webchat: Meta.webchat, state: Meta.state })
            if (doOneSignal) {
                OneSignal.push(() => {
                    OneSignal.init({
                        appId: '150c0123-e224-4e5b-a8b2-fc202d78e2f1',
                        autoResubscribe: true
                    })

                    notificationsSupported = OneSignal.isPushNotificationsSupported()

                    OneSignal.isPushNotificationsEnabled().then((isEnabled) => {
                        if (isEnabled) {
                            OneSignal.getUserId().then((userId) => {
                                device = userId
                                onlineSocket()
                            })
                        } else {
                            device = null
                            onlineSocket()
                        }
                    })

                    OneSignal.on('notificationPermissionChange', (permissionChange) => {
                        var currentPermission = permissionChange.to
                        if (currentPermission === 'granted' && device === null) {
                            OneSignal.getUserId().then((userId) => {
                                device = userId
                                onlineSocket()
                            })
                        } else if (currentPermission === 'denied' && device !== null) {
                            device = null
                            onlineSocket()
                        }
                    })

                    // On changes to web notification subscriptions; update subscriptions and device.
                    OneSignal.on('subscriptionChange', (isSubscribed) => {
                        if (isSubscribed && device === null) {
                            OneSignal.getUserId().then((userId) => {
                                device = userId
                                onlineSocket()
                            })
                        } else if (!isSubscribed && device !== null) {
                            device = null
                            onlineSocket()
                        }
                    })
                })
            }
        } catch (e) {
            console.error(e);
            setTimeout(onlineSocket, 10000)
        }
    })

    if (device && device !== null) {
        socket.post('/subscribers/get-web', { device: device }, function serverResponded (body) {
            try {
                Subscriptions = TAFFY()
                Subscriptions.insert(body)
                doMeta({ state: Meta.state })
            } catch (unusedE) {
                setTimeout(metaSocket, 10000)
            }
        })
    }

    /* TODO
    var temp = document.querySelector(`#track-info-subscribe`)
    if (temp !== null) {
        if (device === null && !isMobile) {
            temp.style.display = 'block'
        } else {
            temp.style.display = 'none'
        }
    }

    temp = document.querySelector(`#chat-subscribe`)
    if (temp !== null) {
        if (device === null && !isMobile) {
            temp.style.display = 'block'
        } else {
            temp.style.display = 'none'
        }
    }

    temp = document.querySelector(`#show-subscribe-button`)
    var temp2 = document.querySelector(`#show-subscribe-instructions`)
    if (temp !== null) {
        if (notificationsSupported || isMobile) {
            if (device === null && !isMobile) {
                temp.innerHTML = 'Show Prompt'
                temp2.innerHTML = `First, click "Show Prompt" and allow notifications. Then when the button turns to "Subscribe", click it again.`
                temp.onclick = () => OneSignal.showSlidedownPrompt({ force: true })
                temp.onkeydown = () => OneSignal.showSlidedownPrompt({ force: true })
            } else {
                temp.innerHTML = 'Subscribe'
                temp2.innerHTML = `Click "Subscribe" to receive notifications when this show goes on the air.`
                temp.onclick = () => {
                    if (Meta.state.startsWith('live_') || Meta.state.startsWith('remote_')) {
                        subscribe(`calendar-all`, Meta.show)
                    } else if (Meta.state.startsWith('sports_') || Meta.state.startsWith('sportsremote_')) {
                        subscribe(`calendar-all`, `Sports: ${Meta.show}`)
                    }
                }
                temp.onkeydown = () => {
                    if (Meta.state.startsWith('live_') || Meta.state.startsWith('remote_')) {
                        subscribe(`calendar-all`, Meta.show)
                    } else if (Meta.state.startsWith('sports_') || Meta.state.startsWith('sportsremote_')) {
                        subscribe(`calendar-all`, `Sports: ${Meta.show}`)
                    }
                }
            }
        } else {
            temp.innerHTML = 'Not Supported'
            temp2.innerHTML = `Sorry, push notifications are not supported on your browser at this time. Stay tuned as we will be releasing a WWSU Mobile app in the future!`
            temp.onclick = () => { }
            temp.onkeydown = () => { }
        }
    }
    */
}