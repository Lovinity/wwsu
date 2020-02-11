// Initialize sails.js socket connection to WWSU
io.sails.url = 'https://server.wwsu1069.org'
io.sails.query = `host=21b1dd149aeac1f8cc2e8174dce0494e9ae60b9f746be71319ac6c3476968e00` // TODO: Remove when live
var socket = io.sails.connect()
var noReq = new WWSUreq(socket, '21b1dd149aeac1f8cc2e8174dce0494e9ae60b9f746be71319ac6c3476968e00') // TODO: Remove host string when live

// WWSU Variables
var Meta = { time: moment().toISOString(true), history: [], webchat: true, state: 'unknown' }
var likedTracks = [];
var announcementIDs = [];

// Operation Variables
var firsttime = false;

// oneSignal Variables
var device = getUrlParameter(`device`)
var isMobile = device !== null

// Timers
var clockTimer; // Used for ticking Meta.time

// Tasks to perform when the website is fully loaded
$(document).ready(function () {

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

});



/*
    SOCKET EVENTS
*/



// Socket connect
socket.on('connect', () => {
    doSockets(firsttime);
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
    name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]')
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)')
    var results = regex.exec(window.location.search)
    return results === null ? null : decodeURIComponent(results[ 1 ].replace(/\+/g, ' '))
}



/*
    DISCIPLINE FUNCTIONS
*/

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
            //messagesSocket()
            //calendarSocket()
            //calendarExceptionsSocket()
            //loadGenres()
            //onlineSocket()
        })
        // web devices without device parameter, connect to OneSignal first and get the ID, then start sockets.
    } else {
        OneSignal = window.OneSignal || []
        checkDiscipline(() => {
            tracksLikedSocket()
            metaSocket()
            announcementsSocket()
            //messagesSocket()
            //calendarSocket()
            //calendarExceptionsSocket()
            //loadGenres()
            //onlineSocket(true)
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