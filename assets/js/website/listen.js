/* global moment, iziToast, jdenticon, TAFFY, $, Quill, jQuery */

// Define hexrgb constants
var hexChars = 'a-f\\d'
var match3or4Hex = `#?[${hexChars}]{3}[${hexChars}]?`
var match6or8Hex = `#?[${hexChars}]{6}([${hexChars}]{2})?`

var nonHexChars = new RegExp(`[^#${hexChars}]`, 'gi')
var validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, 'i')

// Load HTML elements
var nowPlaying = document.getElementById('nowplaying')
var notificationsBox = document.getElementById('messages')
var notificationsStatus = document.getElementById('messages-status')
var messageText = document.getElementById('themessage')
var nickname = document.getElementById('nickname')
var sendButton = document.getElementById('sendmessage')
var sendButtonP = document.getElementById('sendmessagep')
var recentTracks = document.getElementById('recent-tracks')

// Load variables
var messageIDs = []
var announcementIDs = []
var automationpost = null
var Meta = { time: moment().toISOString(true), history: [], webchat: true, state: 'unknown' }
var shouldScroll = false
var skipIt = -1
var blocked = false
var firstTime = true
var Calendar = TAFFY()
var Subscriptions = TAFFY()
// LINT LIES: this variable is used.
// eslint-disable-next-line no-unused-vars
var calendar = []
var likedTracks = []
var clockTimer
var onlineSocketDone = false
var device = getUrlParameter(`device`)
var isMobile = device !== null
var notificationsSupported = false
var OneSignal

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

if (document.querySelector('#themessage')) {
  var quill = new Quill('#themessage', {
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike', { color: [] }],
        ['link'],
        ['clean']
      ],
      keyboard: {
        bindings: {
        // Disable tab input (ADA compliance)
          tab: false
        }
      }
    },
    theme: 'snow'
  })
}

if (document.querySelector(`#trackModal`)) {
  $('#trackModal').iziModal({
    title: 'Track Information',
    headerColor: '#88A0B9',
    width: 640,
    focusInput: true,
    arrowKeys: false,
    navigateCaption: false,
    navigateArrows: false, // Boolean, 'closeToModal', 'closeScreenEdge'
    overlayClose: false,
    overlayColor: 'rgba(0, 0, 0, 0.75)',
    timeout: false,
    timeoutProgressbar: true,
    pauseOnHover: true,
    timeoutProgressbarColor: 'rgba(255,255,255,0.5)'
  })
}

if (document.querySelector(`#dialog`)) {
  $('#dialog').iziModal({
    width: 640,
    focusInput: true,
    arrowKeys: false,
    navigateCaption: false,
    navigateArrows: false, // Boolean, 'closeToModal', 'closeScreenEdge'
    overlay: false,
    overlayColor: 'rgba(0, 0, 0, 0.75)',
    timeout: false,
    timeoutProgressbar: true,
    pauseOnHover: true,
    timeoutProgressbarColor: 'rgba(255,255,255,0.5)',
    zindex: 50
  })
}

function quillGetHTML (inputDelta) {
  var tempCont = document.createElement('div');
  (new Quill(tempCont)).setContents(inputDelta)
  return tempCont.getElementsByClassName('ql-editor')[0].innerHTML
}

// Set up schedule calendar
var focusableElementsString = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]'
// Used in html
// eslint-disable-next-line no-unused-vars
function trapEscapeKey (obj, evt) {
  // if escape pressed
  if (evt.which === 27) {
    // get list of all children elements in given object
    var o = obj.find('*')

    // get list of focusable items
    var cancelElement
    cancelElement = o.filter('#cancel')

    // close the modal window
    cancelElement.click()
    evt.preventDefault()
  }
}
// Used in html
// eslint-disable-next-line no-unused-vars
function trapTabKey (obj, evt) {
  // if tab or shift-tab pressed
  if (evt.which === 9) {
    // get list of all children elements in given object
    var o = obj.find('*')

    // get list of focusable items
    var focusableItems
    focusableItems = o.filter(focusableElementsString).filter(':visible')

    // get currently focused item
    var focusedItem
    focusedItem = jQuery(':focus')

    // get the number of focusable items
    var numberOfFocusableItems
    numberOfFocusableItems = focusableItems.length

    // get the index of the currently focused item
    var focusedItemIndex
    focusedItemIndex = focusableItems.index(focusedItem)

    if (evt.shiftKey) {
      // back tab
      // if focused on first item and user preses back-tab, go to the last focusable item
      if (focusedItemIndex === 0) {
        focusableItems.get(numberOfFocusableItems - 1).focus()
        evt.preventDefault()
      }
    } else {
      // forward tab
      // if focused on the last item and user preses tab, go to the first focusable item
      if (focusedItemIndex === numberOfFocusableItems - 1) {
        focusableItems.get(0).focus()
        evt.preventDefault()
      }
    }
  }
}

// Used in html
// eslint-disable-next-line no-unused-vars
function setInitialFocusModal (obj) {
  // get list of all children elements in given object
  var o = obj.find('*')

  // set focus to first focusable item
  // LINT LIES: variable is used
  // eslint-disable-next-line no-unused-vars
  var focusableItems
  focusableItems = o.filter(focusableElementsString).filter(':visible').first().focus()
}

// Used in html
// eslint-disable-next-line no-unused-vars
function setFocusToFirstItemInModal (obj) {
  // get list of all children elements in given object
  var o = obj.find('*')

  // set the focus to the first keyboard focusable item
  o.filter(focusableElementsString).filter(':visible').first().focus()
}
if (document.querySelector('#song-data')) {
  document.querySelector(`#song-data`).addEventListener('click', (e) => {
    try {
      if (e.target) {
        if (e.target.id === `track-load` || e.target.id === `track-l-load`) {
          loadTracks(skipIt)
        } else {
          if (e.target.id.startsWith(`track-l-`)) {
            loadTrackInfo(parseInt(e.target.id.replace(`track-l-`, ``)))
          } else if (e.target.id.startsWith(`track-`)) {
            loadTrackInfo(parseInt(e.target.id.replace(`track-`, ``)))
          }
        }
      }
    } catch (unusedE) {

    }
  })
}

if (document.querySelector('#track-info-request')) {
  document.querySelector(`#track-info-request`).addEventListener('click', (e) => {
    try {
      if (e.target) {
        if (e.target.id === 'track-request-submit') {
          requestTrack(parseInt($('#track-info-ID').html()))
        }
      }
    } catch (unusedE) {

    }
  })
}

if (document.querySelector('#filter-submit')) {
  document.querySelector(`#filter-submit`).addEventListener('click', () => {
    loadTracks(0)
  })
}

function waitFor (check, callback, count = 0) {
  if (!check()) {
    if (count < 10000) {
      count++
      window.requestAnimationFrame(() => {
        waitFor(check, callback, count)
      })
    } else {
    }
  } else {
    return callback()
  }
}

waitFor(() => {
  return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && typeof io.socket._raw !== 'undefined' && typeof io.socket._raw.io !== 'undefined')
}, () => {
  io.socket._raw.io._reconnection = true
  io.socket._raw.io._reconnectionAttempts = Infinity
})

waitFor(() => {
  return (document.querySelector(`#nativeflashradioplaystopcontainer`) !== null && document.querySelector(`#nativeflashradioplaybutton`) !== null && document.querySelector(`#nativeflashradioimagecontainer`) !== null && document.querySelector(`#nativeflashradiovolumecontroller`) !== null)
}, () => {
  $('#nativeflashradioplaystopcontainer').attr('tabindex', 0)
  $('#nativeflashradiovolumegrab').attr('tabindex', 0)
  $('#nativeflashradiovolumegrab').attr('alt', 'Change Volume')
  $('#nativeflashradiovolumehit').attr('alt', 'Volume')
  $('#nativeflashradioimagehit1').attr('alt', 'logo')
})

waitFor(() => {
  return (document.querySelector(`.ql-bold`) !== null)
}, () => {
  $('.ql-bold').each(function () { $(this).attr('value', 'bold') })
  $('.ql-italic').each(function () { $(this).attr('value', 'italics') })
  $('.ql-underline').each(function () { $(this).attr('value', 'underline') })
  $('.ql-strike').each(function () { $(this).attr('value', 'strike-through') })
  $('.ql-color').each(function () { $(this).attr('title', 'Change the color of the selected text') })
  $('.ql-link').each(function () { $(this).attr('value', 'hyperlink') })
  $('.ql-clean').each(function () { $(this).attr('value', 'remove formatting') })
})

function escapeHTML (str) {
  var div = document.createElement('div')
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}

// Used in html
// eslint-disable-next-line no-unused-vars
function closeModal () {
  if (document.querySelector('#trackModal')) { $('#trackModal').iziModal('close') }
}

// Wait for connection by io, then create event handlers and do the sockets
waitFor(() => {
  return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && io.socket.isConnected())
}, () => {
  // On socket connection, notify the user and do socket tasks.
  io.socket.on('connect', () => {
    iziToast.show({
      title: 'Connected to WWSU',
      message: 'You will now receive metadata, can send or receive messages, and can place track requests.',
      color: 'green',
      zindex: 100,
      layout: 2,
      closeOnClick: true,
      position: 'bottomCenter',
      timeout: 5000
    })
    doSockets(firstTime)
  })

  doSockets(firstTime)

  // On socket disconnect, notify the user.
  io.socket.on('disconnect', () => {
    try {
      if (nowPlaying) { nowPlaying.innerHTML = `<div class="p-3 mb-2 shadow-4 bg-light-1">Connecting...</div>` }
      iziToast.show({
        title: 'Lost connection to WWSU',
        message: 'You will not receive new metadata, nor can send or receive messages or requests, until re-connected.',
        color: 'red',
        zindex: 100,
        layout: 2,
        closeOnClick: true,
        position: 'bottomCenter',
        timeout: 10000
      })
      io.socket._raw.io._reconnection = true
      io.socket._raw.io._reconnectionAttempts = Infinity
    } catch (unusedE) {
    }
  })

  // On meta changes, process meta
  io.socket.on('meta', (data) => {
    for (var key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        Meta[key] = data[key]
      }
    }
    doMeta(data)
  })

  // When a new message is received, process it.
  io.socket.on('messages', (data) => {
    try {
      for (var key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          switch (key) {
            case 'insert':
              addMessage(data[key], firstTime)
              break
            case 'remove':
              var temp = document.getElementById(`msg-${data[key]}`)
              if (temp !== null) { temp.innerHTML = 'XXX This message was deleted XXX' }
              break
          }
        }
      }
    } catch (unusedE) {
    }
  })

  // When an announcement comes through
  io.socket.on('announcements', (data) => {
    try {
      if (announcementIDs.indexOf(data.ID) === -1) {
        addAnnouncement(data)
      }
    } catch (unusedE) {
    }
  })

  io.socket.on('calendar', (data) => {
    processCalendar(data)
  })

  // On meta changes, process meta
  io.socket.on('discipline', (data) => {
    io.socket.disconnect()
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
    })
  })
})

function doSockets (firsttime = false) {
  // Mobile devices and web devices where device parameter was passed, start sockets immediately.
  if (isMobile || !firsttime || (!isMobile && device !== null)) {
    tracksLikedSocket()
    metaSocket()
    announcementsSocket()
    messagesSocket()
    calendarSocket()
    loadGenres()
    onlineSocket()
    // web devices without device parameter, connect to OneSignal first and get the ID, then start sockets.
  } else {
    OneSignal = window.OneSignal || []
    tracksLikedSocket()
    metaSocket()
    announcementsSocket()
    messagesSocket()
    calendarSocket()
    loadGenres()
    onlineSocket(true)
  }
}

function onlineSocket (doOneSignal = false) {
  io.socket.post('/recipients/add-web', { device: device }, function serverResponded (body) {
    try {
      if (nickname) {
        nickname.value = body.label
        nickname.value = nickname.value.replace('Web ', '')
        nickname.value = nickname.value.match(/\(([^)]+)\)/)[1]
      }
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
    } catch (unusedE) {
      setTimeout(onlineSocket, 10000)
    }
  })

  if (device && device !== null) {
    io.socket.post('/subscribers/get-web', { device: device }, function serverResponded (body) {
      try {
        Subscriptions = TAFFY()
        Subscriptions.insert(body)
        doMeta({ state: Meta.state })
      } catch (unusedE) {
        setTimeout(metaSocket, 10000)
      }
    })
  }

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
        temp.onclick = () => OneSignal.showNativePrompt()
        temp.onkeydown = () => OneSignal.showNativePrompt()
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
}

function messagesSocket () {
  io.socket.post('/messages/get-web', {}, function serverResponded (body) {
    // console.log(body);
    try {
      body
        .filter(message => messageIDs.indexOf(message.ID) === -1)
        .map(message => addMessage(message, firstTime))
      firstTime = false
    } catch (unusedE) {
      setTimeout(messagesSocket, 10000)
    }
  })
}

function metaSocket () {
  io.socket.post('/meta/get', {}, function serverResponded (body) {
    // console.log(body);
    try {
      for (var key in body) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          Meta[key] = body[key]
        }
      }
      doMeta(body)
    } catch (unusedE) {
      setTimeout(metaSocket, 10000)
    }
  })
}

function tracksLikedSocket () {
  io.socket.post('/songs/get-liked', {}, function serverResponded (body) {
    try {
      likedTracks = body
      doMeta({ history: Meta.history })
    } catch (unusedE) {
      setTimeout(tracksLikedSocket, 10000)
    }
  })
}

function calendarSocket () {
  io.socket.post('/calendar/get', {}, function serverResponded (body) {
    try {
      processCalendar(body, true)
    } catch (unusedE) {
      setTimeout(calendarSocket, 10000)
    }
  })
}

function announcementsSocket () {
  io.socket.post('/announcements/get', { type: 'website' }, function serverResponded (body) {
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

// Whenever the nickname is changed, (re)set a 5 second timeout. After 5 seconds, if nickname is not changed, send the new nickname to the server for all clients to see.
if (nickname) {
  nickname.addEventListener('change', () => {
    io.socket.post('/recipients/edit-web', { label: nickname.value }, function serverResponded () {
    })
  })
}

// Function called when a new message arrived that should be displayed
function addMessage (data, firsttime = false) {
  if (notificationsBox) { shouldScroll = notificationsBox.scrollTop + notificationsBox.clientHeight === notificationsBox.scrollHeight }

  // Note the ID; used to determine new messages upon reconnection of a socket disconnect
  messageIDs.push(data.ID)

  // Private website message
  if (data.to.startsWith('website-')) {
    if (notificationsBox) {
      notificationsBox.innerHTML += `<div class="message m-2 d-flex flex-wrap text-dark shadow-1 border-left border-light bg-light-1" style="width: 96%; border-left-width: 5px !important;" id="msg-${data.ID}">
    <div class="w-64 p-2">
      ${jdenticon.toSvg(data.from, 64)}
    </div>
    <div class="flex-grow-1 p-2">
      <small>${data.fromFriendly} -> YOU (private; only you see this message)</small>
      <div id="msg-t-${data.ID}">${data.message}</div>
    </div>
    <div class="w-64 p-2">
      <small>${moment(data.createdAt).format('hh:mm A')}</small>
    </div>
  </div>`
    }
    if (!firsttime) {
      iziToast.show({
        title: 'Private message from ' + data.fromFriendly,
        message: data.message,
        color: 'yellow',
        zindex: 100,
        layout: 2,
        closeOnClick: true,
        position: 'bottomCenter',
        timeout: 10000,
        balloon: true
      })
    }

    // Public website message for all visitors
  } else if (data.to === 'website') {
    if (notificationsBox) {
      notificationsBox.innerHTML += `<div class="message m-2 d-flex flex-wrap text-dark shadow-1 border-left border-primary bg-light-1" style="width: 96%; border-left-width: 5px !important;" id="msg-${data.ID}">
    <div class="w-64 p-2">
      ${jdenticon.toSvg(data.from, 64)}
    </div>
    <div class="flex-grow-1 p-2">
      <small>${data.fromFriendly} -> Public web/mobile visitors</small>
      <div id="msg-t-${data.ID}">${data.message}</div>
    </div>
    <div class="w-64 p-2">
      <small>${moment(data.createdAt).format('hh:mm A')}</small>
    </div>
  </div>`
    }
    if (!firsttime) {
      iziToast.show({
        title: 'Message from ' + data.fromFriendly,
        message: data.message,
        color: 'yellow',
        zindex: 100,
        layout: 2,
        closeOnClick: true,
        position: 'bottomCenter',
        timeout: 10000,
        balloon: true
      })
    }

    // Private message sent from visitor
  } else if (data.to === 'DJ-private') {
    if (notificationsBox) {
      notificationsBox.innerHTML += `<div class="message m-2 d-flex flex-wrap text-dark shadow-1 border-left border-light bg-light-1" style="width: 96%; border-left-width: 5px !important;" id="msg-${data.ID}">
    <div class="w-64 p-2">
      ${jdenticon.toSvg(data.from, 64)}
    </div>
    <div class="flex-grow-1 p-2">
      <small>${data.fromFriendly} -> DJ (private; other visitors cannot see this message)</small>
      <div id="msg-t-${data.ID}">${data.message}</div>
    </div>
    <div class="w-64 p-2">
      <small>${moment(data.createdAt).format('hh:mm A')}</small>
    </div>
  </div>`
    }
    if (!firsttime) {
      iziToast.show({
        title: 'Message from ' + data.fromFriendly,
        message: data.message,
        color: '#ffffff',
        zindex: 100,
        layout: 2,
        closeOnClick: true,
        position: 'bottomCenter',
        timeout: 10000,
        balloon: true
      })
    }
    // All other messages
  } else {
    if (notificationsBox) {
      notificationsBox.innerHTML += `<div class="message m-2 d-flex flex-wrap text-dark shadow-1 border-left border-light bg-light-1" style="width: 96%; border-left-width: 5px !important;" id="msg-${data.ID}">
    <div class="w-64 p-2">
      ${jdenticon.toSvg(data.from, 64)}
    </div>
    <div class="flex-grow-1 p-2">
      <small>${data.fromFriendly} -> DJ / public</small>
      <div id="msg-t-${data.ID}">${data.message}</div>
    </div>
    <div class="w-64 p-2">
      <small>${moment(data.createdAt).format('hh:mm A')}</small>
    </div>
  </div>`
    }
    if (!firsttime) {
      iziToast.show({
        title: 'Message from ' + data.fromFriendly,
        message: data.message,
        color: '#ffffff',
        zindex: 100,
        layout: 2,
        closeOnClick: true,
        position: 'bottomCenter',
        timeout: 10000,
        balloon: true
      })
    }
  }
  if (shouldScroll && document.querySelector('#messages')) {
    $('#messages').animate({ scrollTop: $('#messages').prop('scrollHeight') }, 1000)
  }
}

// Process meta info. Pass new meta received as response object.
function doMeta (response) {
  try {
    var temp
    var temp2
    var temp3
    var temp4
    var subscribed
    if (notificationsBox) { shouldScroll = notificationsBox.scrollTop + notificationsBox.clientHeight === notificationsBox.scrollHeight }

    if (typeof response.time !== 'undefined') {
      clearInterval(clockTimer)
      clearTimeout(clockTimer)
      clockTimer = setInterval(clockTick, 1000)
    }

    // Update meta and color code it, if new meta was provided
    if (('line1' in response || 'line2' in response) && nowPlaying) {
      if (Meta.state.includes('live_')) { nowPlaying.innerHTML = `<div class="p-3 mb-2 shadow-4 bg-light-1">${Meta.line1}<br />${Meta.line2}<br />${(Meta.topic.length > 2 ? `Topic: ${Meta.topic}` : '')}</div>` }
      if (Meta.state.includes('sports_') || Meta.state.includes('sportsremote_')) { nowPlaying.innerHTML = `<div class="p-3 mb-2 shadow-4 bg-light-1">${Meta.line1}<br />${Meta.line2}</div>` }
      if (Meta.state.includes('remote_')) { nowPlaying.innerHTML = `<div class="p-3 mb-2 shadow-4 bg-light-1">${Meta.line1}<br />${Meta.line2}<br />${(Meta.topic.length > 2 ? `Topic: ${Meta.topic}` : '')}</div>` }
      if (Meta.state.includes('automation_') || Meta.state === 'unknown') { nowPlaying.innerHTML = `<div class="p-3 mb-2 shadow-4 bg-light-1">${Meta.line1}<br />${Meta.line2}</div>` }
      iziToast.show({
        title: Meta.line1,
        message: Meta.line2,
        color: 'blue',
        zindex: 100,
        layout: 1,
        closeOnClick: true,
        position: 'bottomCenter',
        timeout: 10000
      })
      // Refresh calendar each time a new track is given
      updateCalendar()
    }

    // If a false was returned for web chatting, then disable it
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

    // If a state change was returned, process it by informing the client whether or not there is probably a DJ at the studio to read messages
    if ('state' in response) {
      if (response.state.includes('automation_') || Meta.state === 'unknown') {
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
        if (automationpost !== response.live) {
          temp = document.getElementById('msg-state')
          if (temp) { temp.remove() }
          if (notificationsStatus && onlineSocketDone) { notificationsStatus.innerHTML = `<div class="p-3 bs-callout bs-callout-warning shadow-4 text-light"><h4>Chat Status: Prerecord</h4>The current show airing is prerecorded. There might not be anyone in the studio at this time to read your message.</div>` }
          automationpost = response.live
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
              temp2.onclick = () => OneSignal.showNativePrompt()
              temp2.onkeydown = () => OneSignal.showNativePrompt()
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
        if (automationpost !== response.live) {
          temp = document.getElementById('msg-state')
          if (temp) { temp.remove() }
          if (notificationsStatus && onlineSocketDone) { notificationsStatus.innerHTML = `<div class="p-3 bs-callout bs-callout-success shadow-4 text-light"><h4>Chat Status: Enabled</h4>The show airing now is live. Your messages should be received by the DJ / host.</div>` }
          automationpost = response.live
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
              temp2.onclick = () => OneSignal.showNativePrompt()
              temp2.onkeydown = () => OneSignal.showNativePrompt()
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

    // If a track ID change was passed, do some stuff in recent tracks
    if (typeof response.history !== 'undefined') {
      // reset recent tracks
      if (recentTracks) { recentTracks.innerHTML = `` }
      response.history.map(track => {
        console.dir(track)
        if (recentTracks) {
          recentTracks.innerHTML += `<tr>
                <td>
                ${track.track}
                </td>
                <td>
                ${track.likable && track.ID !== 0 ? `${likedTracks.indexOf(track.ID) === -1 ? `<button type="button" class="btn btn-primary m-1" id="track-like-${track.ID}" onclick="likeTrack(${track.ID});" onkeydown="likeTrack(${track.ID});" tabindex="0">Like</button>` : `<button type="button" class="btn btn-flat-success m-1" id="track-like-${track.ID}">Liked</button>`}` : ``}
                </td>
                </tr>`
        }
      })
    }
  } catch (e) {
    console.error(e)
  }
}

function clockTick () {
  Meta.time = moment(Meta.time).add(1, 'seconds')
}

// Send a message through the system
// USED in html
// eslint-disable-next-line no-unused-vars
function sendMessage (privateMsg) {
  if (blocked || !nickname) { return null }
  var message = quillGetHTML(quill.getContents())
  io.socket.post('/messages/send-web', { message: message, nickname: nickname.value, private: privateMsg }, function serverResponded (response) {
    try {
      // response = JSON.parse(response);
      if (response !== 'OK') {
        if (notificationsBox) { notificationsBox.innerHTML += `<div class="p-3 mb-2 bg-warning" style="color: #000000;"><span class="badge badge-primary" style="font-size: 1em;">${moment().format('LTS')}</span>There was an error submitting your message. You may be sending messages too fast, or there was a network issue.</div>` }
        if (document.querySelector('#messages')) { $('#messages').animate({ scrollTop: $('#messages').prop('scrollHeight') }, 1000) }
        return null
      }
      quill.setText('')
    } catch (unusedE) {
      if (notificationsBox) { notificationsBox.innerHTML += `<div class="p-3 mb-2 bg-warning" style="color: #000000;"><span class="badge badge-primary" style="font-size: 1em;">${moment().format('LTS')}</span>There was an error submitting your message. Either there was a network issue, or you sent a message too quickly (website visitors are limited to one message per minute). If this problem continues, email engineer@wwsu1069.org .</div>` }
      if (document.querySelector('#messages')) { $('#messages').animate({ scrollTop: $('#messages').prop('scrollHeight') }, 1000) }
    }
  })
}

// Used to empty the chat box
// USED in html
// eslint-disable-next-line no-unused-vars
function clearChat () {
  if (notificationsBox) { notificationsBox.innerHTML = '' }
}

// Used to get info about a specific track to display as an overlay box
function loadTrackInfo (trackID) {
  console.log(`getting ${trackID}`)
  io.socket.post('/songs/get', { ID: trackID, ignoreSpins: true }, function serverResponded (response) {
    try {
      // response = JSON.parse(response);
      console.log(`got ${trackID}`)
      // WORK ON THIS: HTML table of song information
      if (document.querySelector('#trackModal')) {
        $('#trackModal').iziModal('open')
        $('#track-info-ID').html(response[0].ID)
        $('#track-info-status').html(response[0].enabled === 1 ? 'Enabled' : 'Disabled')
        document.getElementById('track-info-status').className = `table-${response[0].enabled === 1 ? 'success' : 'dark'}`
        $('#track-info-artist').html(response[0].artist)
        $('#track-info-title').html(response[0].title)
        $('#track-info-album').html(response[0].album)
        $('#track-info-genre').html(response[0].genre)
        $('#track-info-duration').html(moment.duration(response[0].duration, 'seconds').format('HH:mm:ss'))
        $('#track-info-lastplayed').html(moment(response[0].date_played).isAfter('2002-01-01 00:00:01') ? moment(response[0].date_played).format('LLLL') : 'Unknown')
        $('#track-info-limits').html(`<ul>
            ${response[0].limit_action > 0 && response[0].count_played < response[0].play_limit ? `<li>Track has ${response[0].play_limit - response[0].count_played} spins left</li>` : ``}
            ${response[0].limit_action > 0 && response[0].count_played >= response[0].play_limit ? `<li>Track expired (reached spin limit)</li>` : ``}
            ${moment(response[0].start_date).isAfter() ? `<li>Track cannot be played until ${moment(response[0].start_date).format('LLLL')}</li>` : ``}
            ${moment(response[0].end_date).isBefore() && moment(response[0].end_date).isAfter('2002-01-01 00:00:01') ? `<li>Track expired on ${moment(response[0].end_date).format('LLLL')}</li>` : ``}
            </ul>`)

        if (response[0].request.requestable) {
          $('#track-info-request').html(`<div class="form-group">
                                    <h6>Request this Track</h6>
                                    <label for="track-request-name">Name (optional; displayed when the request plays)</label>
                                    <input type="text" class="form-control" id="track-request-name" tabindex="0">
                                    <label for="track-request-message">Message for the DJ (optional)</label>
                                    <textarea class="form-control" id="track-request-message" rows="2" tabindex="0"></textarea>
                                    </div>                    
                                    <button type="submit" id="track-request-submit" class="btn btn-primary" tabindex="0">Place Request</button>`)
        } else {
          $('#track-info-request').html(`<div class="bs-callout bs-callout-${response[0].request.listDiv} shadow-4 text-white">
                        ${response[0].request.message}
                    </div>`)
        }
      }
    } catch (e) {
      console.dir(response[0])
      console.error(e)
    }
  })
}

// Used to place a track request
function requestTrack (trackID) {
  var requestName = document.getElementById('track-request-name')
  var requestMessage = document.getElementById('track-request-message')
  var data = { ID: trackID, name: requestName.value, message: requestMessage.value }
  if (device !== null) { data.device = device }
  io.socket.post('/requests/place', data, function serverResponded (response) {
    try {
      if (response.requested) {
        iziToast.show({
          title: 'Request system success',
          message: `Your request was placed. In automation, requests are played during breaks. During shows, it is up to DJ discretion.${device !== null ? `<br /><strong>You will receive a ${isMobile ? `push` : ``} notification when your request begins playing.</strong>` : ``}`,
          color: 'green',
          zindex: 100,
          layout: 1,
          closeOnClick: true,
          position: 'bottomCenter',
          timeout: 15000
        })
      } else {
        iziToast.show({
          title: 'Request system failed',
          message: `Failed to request this track. ${response.message}`,
          color: 'red',
          zindex: 100,
          layout: 1,
          closeOnClick: true,
          position: 'bottomCenter',
          timeout: 5000
        })
      }
      if (document.querySelector('#trackModal')) { $('#trackModal').iziModal('close') }
    } catch (unusedE) {
      iziToast.show({
        title: 'Request system failed',
        message: 'Failed to request this track. Please try again later.',
        color: 'red',
        zindex: 100,
        layout: 1,
        closeOnClick: true,
        position: 'bottomCenter',
        timeout: 5000
      })
    }
  })
}

// Used to load a list of tracks for the track request system
function loadTracks (skip = 0) {
  var temp = document.getElementById(`track-load`)
  if (temp) { temp.parentNode.removeChild(temp) }
  var songData = document.getElementById('song-data')
  var search = document.getElementById('searchterm')
  var query = { search: escapeHTML(search.value), skip: skip, limit: 50, ignoreDisabled: true, ignoreNonMusic: true }
  var genreOptions = document.getElementById('filter-genre')
  var selectedOption = genreOptions.options[genreOptions.selectedIndex].value
  if (selectedOption !== '0') { query.genre = parseInt(selectedOption) }
  if (skip === 0) { songData.innerHTML = `` }
  io.socket.post('/songs/get', query, function serverResponded (response) {
    try {
      // response = JSON.parse(response);
      if (response === 'false' || !response) {
        skipIt = -1
        songData.innerHTML += `<div class="text-align: center;">There are no more tracks to display</div>`
      } else if (response.length > 0) {
        skipIt += 50

        response.map(track => {
          songData.innerHTML += `<div id="track-${track.ID}" class="p-1 m-1 shadow-2 bg-${(track.enabled === 1) ? 'primary' : 'secondary'} text-white" style="cursor: pointer;" tabindex="0"><span id="track-l-${track.ID}">${track.artist} - ${track.title}</span></div>`
        })

        songData.innerHTML += `<div id="track-load" class="p-1 m-1 shadow-2 bg-success text-white" style="cursor: pointer;" tabindex="0"><span id="track-l-load">Load more tracks</span></div>`
      } else if (response.length === 0) {
        loadTracks(skip + 50)
      }
    } catch (unusedE) {
      iziToast.show({
        title: 'Request system failed',
        message: 'Error loading tracks. Please try again later.',
        color: 'red',
        zindex: 100,
        layout: 1,
        closeOnClick: true,
        position: 'bottomCenter',
        timeout: 5000
      })
    }
  })
}

function loadGenres () {
  if (document.getElementById('filter-genre')) {
    io.socket.post('/songs/get-genres', {}, function serverResponded (response) {
      try {
        document.getElementById('filter-genre').innerHTML = `<option value="0">Filter by genre</option>`
        var x = document.getElementById('filter-genre')
        response.reverse().map(subcat => {
          var c = document.createElement('option')
          c.value = subcat.ID
          c.text = subcat.name
          x.options.add(c, 1)
        })
      } catch (unusedE) {
        iziToast.show({
          title: 'Request system failed',
          message: 'Error loading genres. Please try again later.',
          color: 'red',
          zindex: 100,
          layout: 1,
          closeOnClick: true,
          position: 'bottomCenter',
          timeout: 5000
        })
      }
    })
  }
}

// Used in html
// eslint-disable-next-line no-unused-vars
function likeTrack (trackID) {
  io.socket.post('/songs/like', { trackID: trackID }, function serverResponded (response) {
    try {
      if (response !== 'OK') {
        iziToast.show({
          title: 'Track liking failed',
          message: 'That track cannot be liked at this time.',
          color: 'red',
          zindex: 100,
          layout: 1,
          closeOnClick: true,
          position: 'bottomCenter',
          timeout: 5000
        })
      } else {
        likedTracks.push(trackID)
        // reset recent tracks
        if (recentTracks) { recentTracks.innerHTML = `` }
        Meta.history.map(track => {
          console.dir(track)
          if (recentTracks) {
            recentTracks.innerHTML += `<tr>
                    <td>
                    ${track.track}
                    </td>
                    <td>
                    ${track.likable && track.ID !== 0 ? `${likedTracks.indexOf(track.ID) === -1 ? `<button type="button" class="btn btn-primary m-1" id="track-like-${track.ID}" onclick="likeTrack(${track.ID});" onkeydown="likeTrack(${track.ID});" tabindex="0">Like</button>` : `<button type="button" class="btn btn-flat-success m-1" id="track-like-${track.ID}">Liked</button>`}` : ``}
                    </td>
                    </tr>`
          }
        })
        iziToast.show({
          title: 'Track liked!',
          message: 'You successfully liked that track. When you like a track, it plays more often on WWSU!',
          color: 'green',
          zindex: 100,
          layout: 1,
          closeOnClick: true,
          position: 'bottomCenter',
          timeout: 15000
        })
      }
    } catch (unusedE) {
      iziToast.show({
        title: 'Track liking failed',
        message: 'Error liking the track. Internal error.',
        color: 'red',
        zindex: 100,
        layout: 1,
        closeOnClick: true,
        position: 'bottomCenter',
        timeout: 5000
      })
    }
  })
}

function addAnnouncement (announcement) {
  if (moment(Meta.time).isAfter(moment(announcement.starts)) && moment(Meta.time).isBefore(moment(announcement.expires))) {
    var color = 'info'
    if (announcement.level === 'success') { color = 'green' }
    if (announcement.level === 'danger' || announcement.level === 'urgent') { color = 'red' }
    if (announcement.level === 'warning') { color = 'yellow' }
    announcementIDs.push(announcement.ID)
    iziToast.show({
      title: announcement.title,
      message: announcement.announcement,
      color: color,
      zindex: 100,
      layout: 1,
      closeOnClick: true,
      close: true,
      position: 'bottomCenter',
      timeout: (announcement.displayTime * 1000) || 15000
    })
  }
}

// When new calendar data is received, update the information in memory.
function processCalendar (data, replace = false) {
  try {
    // Run data processing
    if (replace) {
      Calendar = TAFFY()
      Calendar.insert(data)
      updateCalendar()
    } else {
      for (var key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          switch (key) {
            case 'insert':
              Calendar.insert(data[key])
              break
            case 'update':
              Calendar({ ID: data[key].ID }).update(data[key])
              break
            case 'remove':
              Calendar({ ID: data[key] }).remove()
              break
          }
        }
      }
    }
  } catch (e) {
    console.error(e)
    iziToast.show({
      title: 'An error occurred - Please check the logs',
      message: 'Error occurred during the call of processCalendar.'
    })
  }
}

// Actually reflect the changes on the website
function updateCalendar () {
  if (document.querySelector('#calendar')) {
    var caldata = document.querySelector('#calendar')
    caldata.innerHTML = ``

    // Prepare the formatted calendar variable for our formatted events
    calendar = []

    // Get the value of the currently selected calendar item
    var calendarOptions = document.getElementById('calendar-select')
    var selectedOption = parseInt(calendarOptions.options[calendarOptions.selectedIndex].value || 0) || 0

    // Define a comparison function that will order calendar events by start time when we run the iteration
    var compare = function (a, b) {
      try {
        if (moment(a.start).valueOf() < moment(b.start).valueOf()) { return -1 }
        if (moment(a.start).valueOf() > moment(b.start).valueOf()) { return 1 }
        if (a.ID < b.ID) { return -1 }
        if (a.ID > b.ID) { return 1 }
        return 0
      } catch (unusedE) {
      }
    }

    // Run through every event in memory, sorted by the comparison function, and add appropriate ones into our formatted calendar variable.
    Calendar().get().sort(compare)
      .filter(event => (event.title.startsWith('Show:') || event.title.startsWith('Genre:') || event.title.startsWith('Playlist:') || event.title.startsWith('Prerecord:') || event.title.startsWith('Remote:') || event.title.startsWith('Sports:') || event.title.startsWith('Podcast:')) && moment(event.start).isSameOrBefore(moment(Meta.time).startOf(`day`).add(selectedOption + 1, `days`)) && moment(event.start).isSameOrAfter(moment(Meta.time).startOf(`day`).add(selectedOption, `days`)))
      .map(event => {
        try {
          var line1
          var line2
          var stripped
          var eventType
          var image
          var temp
          var finalColor = (typeof event.color !== 'undefined' && /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(event.color)) ? hexRgb(event.color) : hexRgb('#787878')
          if (event.active < 1) { finalColor = hexRgb('#161616') }
          finalColor.red = Math.round(finalColor.red / 2)
          finalColor.green = Math.round(finalColor.green / 2)
          finalColor.blue = Math.round(finalColor.blue / 2)
          var badgeInfo
          if (event.active === 2) {
            badgeInfo = `<span class="notification badge badge-warning shadow-2" style="font-size: 1em;">TIME CHANGED</span>`
          }
          if (event.active === -1) {
            badgeInfo = `<span class="notification badge badge-danger shadow-2" style="font-size: 1em;">CANCELED</span>`
          }
          if (event.title.startsWith('Show: ')) {
            stripped = event.title.replace('Show: ', '')
            eventType = 'SHOW'
            image = `<i class="fas fa-microphone text-primary" style="font-size: 96px;"></i>`
            temp = stripped.split(' - ')
            if (temp.length === 2) {
              line1 = temp[0]
              line2 = temp[1]
            } else {
              line1 = 'Unknown DJ'
              line2 = temp
            }
          } else if (event.title.startsWith('Prerecord: ')) {
            stripped = event.title.replace('Prerecord: ', '')
            eventType = 'PRERECORD'
            image = `<i class="fas fa-play-circle text-primary" style="font-size: 96px;"></i>`
            temp = stripped.split(' - ')
            if (temp.length === 2) {
              line1 = temp[0]
              line2 = temp[1]
            } else {
              line1 = 'Unknown DJ'
              line2 = temp
            }
          } else if (event.title.startsWith('Remote: ')) {
            stripped = event.title.replace('Remote: ', '')
            eventType = 'REMOTE'
            image = `<i class="fas fa-broadcast-tower text-purple" style="font-size: 96px;"></i>`
            temp = stripped.split(' - ')
            if (temp.length === 2) {
              line1 = temp[0]
              line2 = temp[1]
            } else {
              line1 = 'Unknown Host'
              line2 = temp
            }
          } else if (event.title.startsWith('Sports: ')) {
            stripped = event.title.replace('Sports: ', '')
            eventType = 'SPORTS'
            line1 = 'Raider Sports'
            line2 = stripped
            image = `<i class="fas fa-trophy text-success" style="font-size: 96px;"></i>`
          } else if (event.title.startsWith('Playlist: ')) {
            stripped = event.title.replace('Playlist: ', '')
            eventType = event.active > -1 ? 'PLAYLIST' : `CANCELED`
            image = `<i class="fas fa-list text-info" style="font-size: 96px;"></i>`
            temp = stripped.split(' - ')
            if (temp.length === 2) {
              line1 = temp[0]
              line2 = temp[1]
            } else {
              line1 = ''
              line2 = temp
            }
          } else if (event.title.startsWith('Genre: ')) {
            stripped = event.title.replace('Genre: ', '')
            eventType = 'GENRE'
            line1 = ''
            line2 = stripped
            image = `<i class="fas fa-music text-info" style="font-size: 96px;"></i>`
          } else {
            eventType = 'EVENT'
            line1 = ''
            line2 = event.title
            image = `<i class="fas fa-calendar text-secondary" style="font-size: 96px;"></i>`
          }
          caldata.innerHTML += `<div id="calendar-event-${event.ID}" onclick="displayEventInfo(${event.ID})" onkeydown="displayEventInfo(${event.ID})" tabindex="0" style="width: 190px; position: relative;${event.active < 1 ? ` background-color: #969696;` : ``}" class="m-2 text-dark rounded shadow-8${event.active < 1 ? `` : ` bg-light-1`}" title="Click for more information about ${line1} - ${line2} and to subscribe / unsubscribe from notifications.">
             <div class="p-1 text-center" style="width: 100%;">${image}
             ${badgeInfo || ``}
             <div class="m-1" style="text-align: center;"><span class="text-dark" style="font-size: 0.8em;">${eventType}</span><br><span class="text-dark" style="font-size: 1em;">${line1}</span><br><span class="text-dark" style="font-size: 1.25em;">${line2}</span><br /><span class="text-dark" style="font-size: 1em;">${moment(event.start).format('hh:mm A')} - ${moment(event.end).format('hh:mm A')}</span></div>`
        } catch (e) {
          console.error(e)
          iziToast.show({
            title: 'An error occurred - Please check the logs',
            message: `Error occurred during calendar iteration in processCalendar.`
          })
        }
      })

    for (var i = 1; i < 28; i++) {
      var temp0 = document.querySelector(`#calendar-select-${i}`)
      if (temp0 !== null) { temp0.innerHTML = moment(Meta.time).startOf(`day`).add(i, 'days').format(`dddd MM/DD`) }
    }
  }
}

function hexRgb (hex, options = {}) {
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
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    }

    const num = parseInt(hex, 16)
    const red = num >> 16
    const green = (num >> 8) & 255
    const blue = num & 255

    return options.format === 'array'
      ? [red, green, blue, alpha]
      : { red, green, blue, alpha }
  } catch (e) {
    console.error(e)
    iziToast.show({
      title: 'An error occurred - Please check the logs',
      message: 'Error occurred during hexRgb.'
    })
  }
}

// Used in HTML
// eslint-disable-next-line no-unused-vars
function displayEventInfo (showID) {
  var item = Calendar({ ID: parseInt(showID) }).first()
  var buttons = []
  var subtypefilter = []
  var message = `<p><strong>Starts: ${moment(item.start).format('LLL')}</strong></p>
                        <p><strong>Ends: ${moment(item.end).format('LLL')}</strong></p>
                        <p>${item.description}</p>`

  // If a device ID was provided from the WWSU mobile app
  if (!notificationsSupported && !isMobile) {
    message += `<hr><p>Sorry, your web browser does not support push notifications at this time. Stay tuned as we will be releasing a WWSU mobile app in the future!</p>`
  } else if (device !== null) {
    // Determine the types of subscriptions to search for to see if the user is already subscribed to this event.

    subtypefilter.push(item.title)
    // For show, prerecord, and remote events... filter for all 3 types, and also for the non-prefix version.
    if ((item.title.startsWith('Show:') || item.title.startsWith('Prerecord:') || item.title.startsWith('Remote:'))) {
      var temp = item.title.replace('Show: ', '').replace('Prerecord: ', '').replace('Remote: ', '')
      subtypefilter.push(`Show: ${temp}`)
      subtypefilter.push(`Prerecord: ${temp}`)
      subtypefilter.push(`Remote: ${temp}`)
      subtypefilter.push(temp)
    }

    // Check the number of subscriptions
    var subscribed = Subscriptions([{ type: `calendar-once`, subtype: item.unique }, { type: `calendar-all`, subtype: subtypefilter }]).get().length

    if (subscribed === 0) {
      message += `<hr><p>To receive a ${isMobile ? `push` : ``} notification when this event goes on the air for this specific date/time, click "Subscribe One-Time".</p>
<p>To receive a ${isMobile ? `push` : ``} notification every time this event goes on the air, click "Subscribe All Times".</p>
<p>You can always come back to this screen to unsubscribe from ${isMobile ? `push` : ``} notifications.</p>`
      buttons = [
        ['<button><b>Subscribe One-Time</b></button>', function (instance, toast) {
          instance.hide({ transitionOut: 'fadeOut' }, toast, 'button')
          subscribe(`calendar-once`, item.unique)
        }, true],
        ['<button><b>Subscribe All Times</b></button>', function (instance, toast) {
          instance.hide({ transitionOut: 'fadeOut' }, toast, 'button')

          // For shows, remotes, and prerecords... subscribe to events regardless of prefix
          if ((item.title.startsWith('Show:') || item.title.startsWith('Prerecord:') || item.title.startsWith('Remote:'))) {
            var temp = item.title.replace('Show: ', '').replace('Prerecord: ', '').replace('Remote: ', '')
            subscribe(`calendar-all`, temp)
          } else {
            subscribe(`calendar-all`, item.title)
          }
        }]
      ]
    } else {
      message += `<hr><p>You are currently subscribed to receive ${isMobile ? `push` : ``} notifications for this event. To unsubscribe from ALL ${isMobile ? `push` : ``} notifications for this event now and in the future, click "unsubscribe".</p>`
      buttons = [
        ['<button><b>Unsubscribe</b></button>', function (instance, toast) {
          instance.hide({ transitionOut: 'fadeOut' }, toast, 'button')
          // For shows, remotes, and prerecords... unsubscribe from events regardless of prefix
          if ((item.title.startsWith('Show:') || item.title.startsWith('Prerecord:') || item.title.startsWith('Remote:'))) {
            var temp = item.title.replace('Show: ', '').replace('Prerecord: ', '').replace('Remote: ', '')
            unsubscribe(item.unique, temp)
          } else {
            unsubscribe(item.unique, item.title)
          }
        }, true]
      ]
    }
  } else if (!isMobile) {
    message += `<hr><p>If you want to receive notifications for when events go on the air, you first need to grant permission in your web browser for us to show notifications. Click "Show Prompt". After allowing notifications, wait about 10 seconds and then click the event again to re-open this screen.</p>`
    buttons = [
      ['<button><b>Show Prompt</b></button>', function (instance, toast) {
        instance.hide({ transitionOut: 'fadeOut' }, toast, 'button')
        OneSignal.showNativePrompt()
      }, true]
    ]
  }
  iziToast.show({
    title: item.title,
    message: message,
    color: 'white',
    zindex: 100,
    maxWidth: 640,
    layout: 2,
    closeOnClick: true,
    position: 'center',
    buttons: buttons,
    timeout: false,
    overlay: true
  })
}

function getUrlParameter (name) {
  name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]')
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)')
  var results = regex.exec(window.location.search)
  return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '))
}

function subscribe (type, subtype) {
  io.socket.post('/subscribers/add', { device: device, type: type, subtype: subtype }, function serverResponded (response) {
    try {
      if (response !== 'OK') {
        iziToast.show({
          title: 'Subscription failed',
          message: 'Unable to subscribe you to this event at this time. Please try again later.',
          color: 'red',
          zindex: 100,
          layout: 1,
          closeOnClick: true,
          position: 'center',
          timeout: 10000
        })
      } else {
        iziToast.show({
          title: 'Subscribed!',
          message: `You successfully subscribed to that event. You will receive a push notification when it goes live. To un-subscribe, find the event under "Events and Shows", click it, and then click "Unsubscribe". <strong>WWSU may remove notification subscriptions of users who do not visit WWSU for more than a month, at their discretion.</strong>`,
          color: 'green',
          zindex: 100,
          layout: 1,
          closeOnClick: true,
          position: 'center',
          timeout: 30000
        })
        Subscriptions.insert({ type: type, subtype: subtype })
        var temp = document.querySelector(`#show-subscribe`)
        if (temp !== null && (subtype === Meta.show || subtype === `Sports: ${Meta.show}`)) { temp.style.display = 'none' }
      }
    } catch (unusedE) {
      iziToast.show({
        title: 'Subscription failed',
        message: 'Unable to subscribe you to this event at this time. Please try again later.',
        color: 'red',
        zindex: 100,
        layout: 1,
        closeOnClick: true,
        position: 'center',
        timeout: 10000
      })
    }
  })
}

function unsubscribe (ID, event) {
  io.socket.post('/subscribers/remove', { device: device, type: `calendar-once`, subtype: ID }, function serverResponded (response) {
    try {
      if (response !== 'OK') {
        iziToast.show({
          title: 'Failed to unsubscribe',
          message: 'Unable to un-subscribe you to this event at this time. Please try again later.',
          color: 'red',
          zindex: 100,
          layout: 1,
          closeOnClick: true,
          position: 'center',
          timeout: 10000
        })
      } else {
        io.socket.post('/subscribers/remove', { device: device, type: `calendar-all`, subtype: event }, function serverResponded (response) {
          try {
            if (response !== 'OK') {
              iziToast.show({
                title: 'Failed to unsubscribe',
                message: 'Unable to un-subscribe you to this event at this time. Please try again later.',
                color: 'red',
                zindex: 100,
                layout: 1,
                closeOnClick: true,
                position: 'center',
                timeout: 10000
              })
            } else {
              iziToast.show({
                title: 'Un-subscribed!',
                message: 'You successfully un-subscribed from that event. You will no longer receive push notifications for it.',
                color: 'green',
                zindex: 100,
                layout: 1,
                closeOnClick: true,
                position: 'center',
                timeout: 10000
              })
              Subscriptions({ type: `calendar-once`, subtype: ID }).remove()
              Subscriptions({ type: `calendar-all`, subtype: event }).remove()
            }
          } catch (unusedE) {
            iziToast.show({
              title: 'Failed to unsubscribe',
              message: 'Unable to un-subscribe you to this event at this time. Please try again later.',
              color: 'red',
              zindex: 100,
              layout: 1,
              closeOnClick: true,
              position: 'center',
              timeout: 10000
            })
          }
        })
      }
    } catch (unusedE) {
      iziToast.show({
        title: 'Failed to unsubscribe',
        message: 'Unable to un-subscribe you to this event at this time. Please try again later.',
        color: 'red',
        zindex: 100,
        layout: 1,
        closeOnClick: true,
        position: 'center',
        timeout: 10000
      })
    }
  })
}
