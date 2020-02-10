/* global iziToast, WWSUreq, WWSUdb, TAFFY, jdenticon */

var subscribedEmergencies = false
var subscribedShows = false
var subscribedDirectors = false
var device = getUrlParameter(`device`)
var isMobile = device !== null
var notificationsSupported = isMobile
var OneSignal
var noReq
var directorReq
var Directors = new WWSUdb(TAFFY())
var Directorhours = new WWSUdb(TAFFY())
var officeHoursTimer
var Meta = { time: moment().toISOString(true) }
var clockTimer

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
  directorReq = new WWSUreq(io.socket, null, 'name', '/auth/director', 'director')
  Directors.assignSocketEvent('directors', io.socket)
  Directorhours.assignSocketEvent('directorhours', io.socket)
  Directors.setOnUpdate(() => {
    clearTimeout(officeHoursTimer)
    officeHoursTimer = setTimeout(() => {
      processDirectors(Directors.db(), Directorhours.db())
    }, 1000)
  })
  Directors.setOnInsert(() => {
    clearTimeout(officeHoursTimer)
    officeHoursTimer = setTimeout(() => {
      processDirectors(Directors.db(), Directorhours.db())
    }, 1000)
  })
  Directors.setOnRemove(() => {
    clearTimeout(officeHoursTimer)
    officeHoursTimer = setTimeout(() => {
      processDirectors(Directors.db(), Directorhours.db())
    }, 1000)
  })
  Directors.setOnReplace(() => {
    clearTimeout(officeHoursTimer)
    officeHoursTimer = setTimeout(() => {
      processDirectors(Directors.db(), Directorhours.db())
    }, 1000)
  })

  Directorhours.setOnUpdate(() => {
    clearTimeout(officeHoursTimer)
    officeHoursTimer = setTimeout(() => {
      processDirectors(Directors.db(), Directorhours.db())
    }, 1000)
  })
  Directorhours.setOnInsert(() => {
    clearTimeout(officeHoursTimer)
    officeHoursTimer = setTimeout(() => {
      processDirectors(Directors.db(), Directorhours.db())
    }, 1000)
  })
  Directorhours.setOnRemove(() => {
    clearTimeout(officeHoursTimer)
    officeHoursTimer = setTimeout(() => {
      processDirectors(Directors.db(), Directorhours.db())
    }, 1000)
  })
  Directorhours.setOnReplace(() => {
    clearTimeout(officeHoursTimer)
    officeHoursTimer = setTimeout(() => {
      processDirectors(Directors.db(), Directorhours.db())
    }, 1000)
  })
  io.socket.on('connect', () => {
    doSockets()
    Directors.replaceData(noReq, '/directors/get')
    Directorhours.replaceData(noReq, '/directors/get-hours')
  })
  doSockets()
  Directors.replaceData(noReq, '/directors/get')
  Directorhours.replaceData(noReq, '/directors/get-hours')

  io.socket.on('disconnect', () => {
    try {
      io.socket._raw.io._reconnection = true
      io.socket._raw.io._reconnectionAttempts = Infinity
    } catch (unusedE) {
    }
  })

  // Update meta information when meta is provided
  io.socket.on('meta', (data) => {
    try {
      for (var key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          Meta[key] = data[key]
          if (key === 'time') {
            clearInterval(clockTimer)
            clearTimeout(clockTimer)
            clockTimer = setInterval(clockTick, 1000)
          }
        }
      }
    } catch (e) {
      iziToast.show({
        title: 'An error occurred - Please check the logs',
        message: 'Error occurred on meta event.'
      })
      console.error(e)
    }
  })
})

function doSockets () {
  // Mobile devices and web devices where device parameter was passed, start sockets immediately.
  if (isMobile || (!isMobile && device !== null)) {
    metaSocket()
    onlineSocket()
    // web devices without device parameter, connect to OneSignal first and get the ID, then start sockets.
  } else {
    OneSignal = window.OneSignal || []
    metaSocket()
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

  if (device && device !== null && device !== 'null') {
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
      } catch (unusedE) {
        setTimeout(onlineSocket, 10000)
      }
    })
  } else {
    notificationsSupported = false
    var temp = document.querySelector(`#subscriptions-emergencies-text`)
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
      directorReq.request({ db: Directors.db(), method: 'POST', url: '/subscribers/add-directors', data: { device: device, type: 'emergencies' } }, (response) => {
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
      directorReq.request({ db: Directors.db(), method: 'POST', url: '/subscribers/remove-directors', data: { device: device, type: 'emergencies' } }, (response) => {
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
    if (!subscribedShows) {
      directorReq.request({ db: Directors.db(), method: 'POST', url: '/subscribers/add-directors', data: { device: device, type: 'accountability-shows' } }, (response) => {
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
      directorReq.request({ db: Directors.db(), method: 'POST', url: '/subscribers/remove-directors', data: { device: device, type: 'accountability-shows' } }, (response) => {
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
    if (!subscribedDirectors) {
      directorReq.request({ db: Directors.db(), method: 'POST', url: '/subscribers/add-directors', data: { device: device, type: 'accountability-directors' } }, (response) => {
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
      directorReq.request({ db: Directors.db(), method: 'POST', url: '/subscribers/remove-directors', data: { device: device, type: 'accountability-directors' } }, (response) => {
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

function processDirectors (ddb, hdb) {
  try {
    var directors = {}

    // Update directors html
    var innercontent = document.getElementById('directors')
    if (innercontent) { innercontent.innerHTML = '' }

    ddb.each((dodo) => {
      try {
        directors[dodo.name] = dodo
        var color = 'rgba(211, 47, 47, 0.25)'
        var text1 = 'OUT'
        var theClass = 'danger'
        if (dodo.present) {
          color = 'rgba(56, 142, 60, 0.25)'
          text1 = 'IN'
          theClass = 'success'
        }
        if (innercontent) {
          innercontent.innerHTML += `<div id="director-${dodo.ID}" tabindex="0" style="width: 190px; position: relative; background-color: ${color}" class="m-2 text-dark rounded shadow-8 bg-light-1">
          <div class="p-1 text-center" style="width: 100%;">${dodo.avatar !== null && dodo.avatar !== '' ? `<img src="${dodo.avatar}" width="96" class="rounded-circle">` : jdenticon.toSvg(`Director ${dodo.name}`, 96)}
          <span class="notification badge badge-${theClass}" style="font-size: 1em;">${text1}</span>
          <div class="m-1" style="text-align: center;"><span style="font-size: 1.25em;">${dodo.name}</span><br><span style="font-size: 0.8em;">${dodo.position}</span></div>
          <h4><strong>Office Hours</strong></h4>
          <div id="director-hours-${dodo.ID}"></div>
          </div>
      </div>`
        }
      } catch (e) {
        console.error(e)
        iziToast.show({
          title: 'An error occurred - Please check the logs',
          message: `Error occurred in processDirectors ddb iteration.`
        })
      }
    })

    // A list of Office Hours for the directors

    // Define a comparison function that will order calendar events by start time when we run the iteration
    var compare = function (a, b) {
      try {
        if (moment(a.start).valueOf() < moment(b.start).valueOf()) { return -1 }
        if (moment(a.start).valueOf() > moment(b.start).valueOf()) { return 1 }
        if (a.ID < b.ID) { return -1 }
        if (a.ID > b.ID) { return 1 }
        return 0
      } catch (e) {
        console.error(e)
        iziToast.show({
          title: 'An error occurred - Please check the logs',
          message: `Error occurred in the compare function of Calendar.sort in the Calendar[0] call.`
        })
      }
    }
    window.requestAnimationFrame(() => {
      hdb.get()
        .filter(event => !moment(event.start).isAfter(moment(Meta.time).add(7, 'days').startOf('day')))
        .sort(compare)
        .map(event => {
          var temp = directors[event.director]

          // No temp record? Exit immediately.
          if (typeof temp === `undefined`) { return null }

          var directorID = temp.ID

          var temp2 = document.querySelector(`#director-hours-${directorID}`)

          if (temp2 === null) { return null }

          // null start or end? Use a default to prevent errors.
          if (!moment(event.start).isValid()) { event.start = moment(Meta.time).startOf('day') }
          if (!moment(event.end).isValid()) { event.end = moment(Meta.time).add(1, 'days').startOf('day') }

          event.startT = moment(event.start).minutes() === 0 ? moment(event.start).format('h') : moment(event.start).format('h:mm')
          if ((moment(event.start).hours() < 12 && moment(event.end).hours() >= 12) || ((moment(event.start).hours() >= 12) && moment(event.end).hours() < 12)) { event.startT += moment(event.start).format('A') }
          event.endT = moment(event.end).minutes() === 0 ? moment(event.end).format('hA') : moment(event.end).format('h:mmA')

          // Update strings if need be, if say, start time was before this day, or end time is after this day.
          if (moment(event.end).isAfter(moment(event.start).startOf('day').add(1, 'days'))) {
            event.endT = `${moment(event.end).format('MM/DD ')} ${event.endT}`
          }
          event.startT = `${moment(event.start).format('MM/DD ')} ${event.startT}`

          var endText = `<span class="text-dark">${event.startT} - ${event.endT}</span>`
          if (event.active === 0) {
            endText = `<strike><span class="text-black-50">${event.startT} - ${event.endT}</span></strike>`
          }
          if (event.active === 2) {
            endText = `<span class="text-info">${event.startT} - ${event.endT}</span>`
          }
          if (event.active === -1) {
            endText = `<strike><span class="text-danger">${event.startT} - ${event.endT}</span></strike>`
          }

          // Push the final product
          temp2.innerHTML += `<div class="m-1 text-dark">${endText}</div>`
        })
    })
  } catch (e) {
    iziToast.show({
      title: 'An error occurred - Please check the logs',
      message: 'Error occurred during the call of office hours.'
    })
    console.error(e)
  }
}

// Called to update all meta information with that of a body request
function metaSocket () {
  console.log('attempting meta socket')
  noReq.request({ method: 'POST', url: '/meta/get', data: {} }, (body) => {
    try {
      var temp = body
      for (var key in temp) {
        if (Object.prototype.hasOwnProperty.call(temp, key)) {
          Meta[key] = temp[key]
          if (key === 'time') {
            clearInterval(clockTimer)
            clearTimeout(clockTimer)
            clockTimer = setInterval(clockTick, 1000)
          }
        }
      }
    } catch (e) {
      console.error(e)
      console.log('FAILED META CONNECTION')
      setTimeout(metaSocket, 10000)
    }
  })
}

function clockTick () {
  Meta.time = moment(Meta.time).add(1, 'seconds')

  // Refresh hours every midnight
  if (moment(Meta.time).hour() === 0 && moment(Meta.time).minute() === 0 && moment(Meta.time).second() < 5) {
    clearTimeout(officeHoursTimer)
    officeHoursTimer = setTimeout(() => {
      processDirectors(Directors.db(), Directorhours.db())
    }, 1000)
  }
}
