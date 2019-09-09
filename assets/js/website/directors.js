/* global iziToast, WWSUreq, WWSUdb, TAFFY */

var subscribedEmergencies = false
var subscribedShows = false
var subscribedDirectors = false
var device = getUrlParameter(`device`)
var isMobile = device !== null
var notificationsSupported = false
var OneSignal
var noReq
var directorReq
var directorsdb = new WWSUdb(TAFFY())

function getUrlParameter (name) {
  name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]')
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)')
  var results = regex.exec(window.location.search)
  return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '))
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

// Wait for connection by io, then create event handlers and do the sockets
waitFor(() => {
  return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && io.socket.isConnected())
}, () => {
  noReq = new WWSUreq(io.socket, null)
  directorReq = new WWSUreq(io.socket, null, 'name', '/auth/director', 'Administrator Director')
  directorsdb.assignSocketEvent('directors', io.socket)
  io.socket.on('connect', () => {
    directorsdb.replaceData(noReq, '/directors/get')
    doSockets()
  })
  doSockets()

  io.socket.on('disconnect', () => {
    try {
      io.socket._raw.io._reconnection = true
      io.socket._raw.io._reconnectionAttempts = Infinity
    } catch (unusedE) {
    }
  })
})

function doSockets () {
  // Mobile devices and web devices where device parameter was passed, start sockets immediately.
  if (isMobile || (!isMobile && device !== null)) {
    onlineSocket()
    // web devices without device parameter, connect to OneSignal first and get the ID, then start sockets.
  } else {
    OneSignal = window.OneSignal || []
    onlineSocket(true)
  }
}

function onlineSocket (doOneSignal = false) {
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

  if (device && device !== null) {
    io.socket.post('/subscribers/get-web', { device: device }, function serverResponded (body) {
      try {
        subscribedEmergencies = false
        subscribedShows = false
        subscribedDirectors = false
        if (body.length > 0) {
          body.map((record) => {
            switch (record.type) {
              case 'emergencies':
                subscribedEmergencies = true
                break
              case 'accountability-shows':
                subscribedShows = true
                break
              case 'accountability-directors':
                subscribedDirectors = true
                break
            }
          })
        }
      } catch (unusedE) {
        setTimeout(onlineSocket, 10000)
      }
    })
  }

  if (notificationsSupported) {
    var temp = document.querySelector(`#subscriptions-emergencies-text`)
    if (temp !== null) {
      if (subscribedEmergencies) {
        temp.innerHTML = 'Un-subscribe'
      } else {
        temp.innerHTML = 'Subscribe'
      }
    }
    temp = document.querySelector(`#subscriptions-shows-text`)
    if (temp !== null) {
      if (subscribedShows) {
        temp.innerHTML = 'Un-subscribe'
      } else {
        temp.innerHTML = 'Subscribe'
      }
    }
    temp = document.querySelector(`#subscriptions-directors-text`)
    if (temp !== null) {
      if (subscribedDirectors) {
        temp.innerHTML = 'Un-subscribe'
      } else {
        temp.innerHTML = 'Subscribe'
      }
    }
  } else {
    temp = document.querySelector(`#subscriptions-emergencies-text`)
    if (temp !== null) { temp.innerHTML = 'Notifications not supported' }
    temp = document.querySelector(`#subscriptions-shows-text`)
    if (temp !== null) { temp.innerHTML = 'Notifications not supported' }
    temp = document.querySelector(`#subscriptions-directors-text`)
    if (temp !== null) { temp.innerHTML = 'Notifications not supported' }
  }
}

// Used in HTML
// eslint-disable-next-line no-unused-vars
function subscribeEmergencies () {
  if (!notificationsSupported) {
    iziToast.show({
      title: 'Notifications not supported',
      message: `Push notifications are not supported on your device / browser, sorry.`,
      color: 'red',
      zindex: 100,
      layout: 1,
      closeOnClick: true,
      position: 'center',
      timeout: 15000
    })
  } else {
    if (!subscribedEmergencies) {
      directorReq.request({ db: directorsdb.db(), method: 'POST', url: '/subscribers/add-directors', data: { device: device, type: 'emergencies' } }, (response) => {
        if (response === 'OK') {
          iziToast.show({
            title: 'Subscribed!',
            message: `You will now receive push notifications for system problems.`,
            color: 'green',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: 'center',
            timeout: 15000
          })
          doSockets()
        } else {
          iziToast.show({
            title: 'Failed to subscribe',
            message: `Failed to subscribe to push notifications for system problems. Please try again later.`,
            color: 'red',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: 'center',
            timeout: 15000
          })
        }
      })
    } else {
      directorReq.request({ db: directorsdb.db(), method: 'POST', url: '/subscribers/remove-directors', data: { device: device, type: 'emergencies' } }, (response) => {
        if (response === 'OK') {
          iziToast.show({
            title: 'Un-Subscribed!',
            message: `You will no longer receive push notifications for system problems.`,
            color: 'green',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: 'center',
            timeout: 15000
          })
          doSockets()
        } else {
          iziToast.show({
            title: 'Failed to un-subscribe',
            message: `Failed to un-subscribe to push notifications for system problems. Please try again later.`,
            color: 'red',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: 'center',
            timeout: 15000
          })
        }
      })
    }
  }
}

// Used in HTML
// eslint-disable-next-line no-unused-vars
function subscribeShows () {
  if (!notificationsSupported) {
    iziToast.show({
      title: 'Notifications not supported',
      message: `Push notifications are not supported on your device / browser, sorry.`,
      color: 'red',
      zindex: 100,
      layout: 1,
      closeOnClick: true,
      position: 'center',
      timeout: 15000
    })
  } else {
    if (!subscribedEmergencies) {
      directorReq.request({ db: directorsdb.db(), method: 'POST', url: '/subscribers/add-directors', data: { device: device, type: 'accountability-shows' } }, (response) => {
        if (response === 'OK') {
          iziToast.show({
            title: 'Subscribed!',
            message: `You will now receive push notifications for radio show accountability.`,
            color: 'green',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: 'center',
            timeout: 15000
          })
          doSockets()
        } else {
          iziToast.show({
            title: 'Failed to subscribe',
            message: `Failed to subscribe to push notifications for radio show accountability. Please try again later.`,
            color: 'red',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: 'center',
            timeout: 15000
          })
        }
      })
    } else {
      directorReq.request({ db: directorsdb.db(), method: 'POST', url: '/subscribers/remove-directors', data: { device: device, type: 'accountability-shows' } }, (response) => {
        if (response === 'OK') {
          iziToast.show({
            title: 'Un-Subscribed!',
            message: `You will no longer receive push notifications for radio show accountability.`,
            color: 'green',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: 'center',
            timeout: 15000
          })
          doSockets()
        } else {
          iziToast.show({
            title: 'Failed to un-subscribe',
            message: `Failed to un-subscribe to push notifications for radio show accountability. Please try again later.`,
            color: 'red',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: 'center',
            timeout: 15000
          })
        }
      })
    }
  }
}

// Used in HTML
// eslint-disable-next-line no-unused-vars
function subscribeDirectors () {
  if (!notificationsSupported) {
    iziToast.show({
      title: 'Notifications not supported',
      message: `Push notifications are not supported on your device / browser, sorry.`,
      color: 'red',
      zindex: 100,
      layout: 1,
      closeOnClick: true,
      position: 'center',
      timeout: 15000
    })
  } else {
    if (!subscribedEmergencies) {
      directorReq.request({ db: directorsdb.db(), method: 'POST', url: '/subscribers/add-directors', data: { device: device, type: 'accountability-directors' } }, (response) => {
        if (response === 'OK') {
          iziToast.show({
            title: 'Subscribed!',
            message: `You will now receive push notifications for director office hours accountability.`,
            color: 'green',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: 'center',
            timeout: 15000
          })
          doSockets()
        } else {
          iziToast.show({
            title: 'Failed to subscribe',
            message: `Failed to subscribe to push notifications for director office hours accountability. Please try again later.`,
            color: 'red',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: 'center',
            timeout: 15000
          })
        }
      })
    } else {
      directorReq.request({ db: directorsdb.db(), method: 'POST', url: '/subscribers/remove-directors', data: { device: device, type: 'accountability-directors' } }, (response) => {
        if (response === 'OK') {
          iziToast.show({
            title: 'Un-Subscribed!',
            message: `You will no longer receive push notifications for director office hours accountability.`,
            color: 'green',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: 'center',
            timeout: 15000
          })
          doSockets()
        } else {
          iziToast.show({
            title: 'Failed to un-subscribe',
            message: `Failed to un-subscribe to push notifications for director office hours accountability. Please try again later.`,
            color: 'red',
            zindex: 100,
            layout: 1,
            closeOnClick: true,
            position: 'center',
            timeout: 15000
          })
        }
      })
    }
  }
}
