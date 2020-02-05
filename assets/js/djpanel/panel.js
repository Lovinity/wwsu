/* global WWSUdb, TAFFY, WWSUreq, iziToast, JQuery, Taucharts */

jQuery.noConflict()
var calendardb = new CalendarDb();
var DJReq
var noReq
var djName
var DJs = new WWSUdb(TAFFY())
var menu = [
  '#menu-home',
  '#menu-dashboard',
  '#menu-analytics',
  '#menu-signup',
  '#menu-clockwheel',
  '#menu-cancel',
  '#menu-rerun',
  '#menu-timechange',
  '#menu-promote',
  '#menu-suggestion'
]

var containers = [
  '#body-comingsoon',
  '#body-connect',
  '#body-dashboard',
  '#body-analytics',
  '#body-cancel',
  '#body-clockwheel'
]

jQuery('#modal-dj-logs').iziModal({
  title: 'Show Logs',
  width: '75%',
  focusInput: true,
  arrowKeys: false,
  navigateCaption: false,
  navigateArrows: false, // Boolean, 'closeToModal', 'closeScreenEdge'
  overlayClose: false,
  overlayColor: 'rgba(0, 0, 0, 0.75)',
  timeout: false,
  pauseOnHover: true,
  timeoutProgressbarColor: 'rgba(255,255,255,0.5)',
  zindex: 50
})

jQuery('#modal-help-remotes').iziModal({
  title: 'What Are Remote Credits?',
  width: '75%',
  focusInput: true,
  arrowKeys: false,
  navigateCaption: false,
  navigateArrows: false, // Boolean, 'closeToModal', 'closeScreenEdge'
  overlayClose: false,
  overlayColor: 'rgba(0, 0, 0, 0.75)',
  timeout: false,
  pauseOnHover: true,
  timeoutProgressbarColor: 'rgba(255,255,255,0.5)',
  zindex: 50
})

jQuery('#modal-help-reputation').iziModal({
  title: 'What is reputation?',
  width: '75%',
  focusInput: true,
  arrowKeys: false,
  navigateCaption: false,
  navigateArrows: false, // Boolean, 'closeToModal', 'closeScreenEdge'
  overlayClose: false,
  overlayColor: 'rgba(0, 0, 0, 0.75)',
  timeout: false,
  pauseOnHover: true,
  timeoutProgressbarColor: 'rgba(255,255,255,0.5)',
  zindex: 50
})

jQuery('#modal-help-xp').iziModal({
  title: 'What is experience / XP?',
  width: '75%',
  focusInput: true,
  arrowKeys: false,
  navigateCaption: false,
  navigateArrows: false, // Boolean, 'closeToModal', 'closeScreenEdge'
  overlayClose: false,
  overlayColor: 'rgba(0, 0, 0, 0.75)',
  timeout: false,
  pauseOnHover: true,
  timeoutProgressbarColor: 'rgba(255,255,255,0.5)',
  zindex: 50
})

var analyticsTable = jQuery('#analytics-table').DataTable({
  columns: [
    { title: "" },
    { title: "Statistic" },
    { title: "Semester" },
    { title: "Lifetime" },
  ]
})

var djLogsTable = jQuery('#logs-table').DataTable({
  responsive: true,
  "order": [ [ 0, 'desc' ] ]
})

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
  return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && io.socket.isConnected())
}, () => {
  DJReq = new WWSUreq(io.socket, null, 'name', '/auth/dj', 'DJ')
  noReq = new WWSUreq(io.socket, null)

  DJs.assignSocketEvent('djs', io.socket)

  DJs.setOnReplace((db) => {
    console.log('DJ replace')
    doRequests()
  })

  io.socket.on('connect_error', function () {
    io.socket._raw.io._reconnection = true
    io.socket._raw.io._reconnectionAttempts = Infinity
  })

  io.socket.on('disconnect', function () {
    io.socket._raw.io._reconnection = true
    io.socket._raw.io._reconnectionAttempts = Infinity
  })

  // Register event handlers
  io.socket.on('connect', () => {
    checkDiscipline(() => {
      DJs.replaceData(noReq, '/djs/get')
    })
  })
  checkDiscipline(() => {
    DJs.replaceData(noReq, '/djs/get')
  })
})

function doRequests () {
  DJReq.request({ db: DJs.db(), method: 'POST', url: '/djs/get-web', data: {} }, (response) => {
    if (typeof response.stats === 'undefined') {
      iziToast.show({
        title: 'An error occurred',
        message: 'Error occurred trying to authenticate the DJ. Please try again or contact engineer@wwsu1069.org.'
      })
    } else {
      // Populate DJ statistics and information

      var analyticsTableData = []

      // DJ Name
      var temp = document.querySelector('#dj-name')
      if (temp !== null) { temp.innerHTML = response.stats.name }
      djName = response.stats.name

      // Live Shows
      analyticsTableData.push([ '<i class="fas fa-microphone" width="32"></i>', 'Live Shows', formatInt(response.stats.semester.shows), formatInt(response.stats.overall.shows) ])

      // Prerecords
      analyticsTableData.push([ '<i class="fas fa-compact-disc" width="32"></i>', 'Prerecorded Shows', formatInt(response.stats.semester.prerecords), formatInt(response.stats.overall.prerecords) ])

      // Remotes
      analyticsTableData.push([ '<i class="fas fa-broadcast-tower" width="32"></i>', 'Remote Broadcasts', formatInt(response.stats.semester.remotes), formatInt(response.stats.overall.remotes) ])

      // Showtime
      temp = document.querySelector('#dash-showtime')
      if (temp !== null) { temp.innerHTML = formatInt(Math.floor((response.stats.overall.showtime / 60) * 100) / 100) }
      analyticsTableData.push([ '<i class="fas fa-play" width="32"></i>', 'Showtime (Hours)', formatInt(Math.floor((response.stats.semester.showtime / 60) * 100) / 100), formatInt(Math.floor((response.stats.overall.showtime / 60) * 100) / 100) ])

      // Listener hours
      temp = document.querySelector('#dash-hours')
      if (temp !== null) { temp.innerHTML = formatInt(Math.floor((response.stats.overall.listeners / 60) * 100) / 100) }
      analyticsTableData.push([ '<i class="fas fa-headphones" width="32"></i>', 'Online Listeners (Hours)', formatInt(Math.floor((response.stats.semester.listeners / 60) * 100) / 100), formatInt(Math.floor((response.stats.overall.listeners / 60) * 100) / 100) ])

      // XP
      temp = document.querySelector('#dash-XP')
      if (temp !== null) { temp.innerHTML = formatInt(response.stats.overall.xp) }
      analyticsTableData.push([ '<i class="fas fa-star" width="32"></i>', 'Experience Points (XP) <a href="#" style="padding-left: 1em;" onclick="xpHelp()">What is this?</a>', formatInt(response.stats.semester.xp), formatInt(response.stats.overall.xp) ])

      // Remote credits
      temp = document.querySelector('#dash-credits')
      if (temp !== null) { temp.innerHTML = formatInt(response.stats.semester.remoteCredits) }
      analyticsTableData.push([ '<i class="fas fa-gem" width="32"></i>', 'Remote Credits <a href="#" style="padding-left: 1em;" onclick="creditsHelp()">What is this?</a>', formatInt(response.stats.semester.remoteCredits), formatInt(response.stats.overall.remoteCredits) ])

      // Reputation
      analyticsTableData.push([ '<i class="fas fa-smile"></i>', 'Reputation / Responsibility <a href="#" style="padding-left: 1em;" onclick="reputationHelp()">What is this?</a>', `<div class="progress progress-sm mr-2">
      <div class="progress-bar bg-success" role="progressbar" style="width: ${response.stats.semester.reputationPercent}%" aria-valuenow="${response.stats.semester.reputationPercent}" aria-valuemin="0" aria-valuemax="100"></div>
    </div>`, `<div class="progress progress-sm mr-2">
    <div class="progress-bar bg-success" role="progressbar" style="width: ${response.stats.overall.reputationPercent}%" aria-valuenow="${response.stats.overall.reputationPercent}" aria-valuemin="0" aria-valuemax="100"></div>
  </div>`])

      // Render analytics table
      analyticsTable.clear()
      analyticsTable.rows.add(analyticsTableData)
      analyticsTable.draw()

      var notices = ''

      // Show Notices
      noReq.request({ method: 'POST', url: '/calendar/get', data: {} }, (response2) => {

        noReq.request({ method: 'POST', url: '/calendar/get-exceptions', data: {} }, (response3) => {

          if (!response2 || !response3)
            return null;

          calendardb = new CalendarDb(response2, response3);
          var events = calendardb.getEvents(undefined, moment().add(1, 'years').toISOString(true), [ { hostDJ: response.ID }, { cohostDJ1: response.ID }, { cohostDJ2: response.ID }, { cohostDJ3: response.ID } ]);

          temp = document.querySelector('#dash-show')
          if (temp !== null) {
            var worker;

            worker = events.filter((event) => event.exceptionType === 'canceled' || event.exceptionType === 'canceled-system' || event.exceptionType === 'canceled-changed');
            if (worker.length > 0) {
              notices += `<div class="card mb-4 py-3 border-left-info">
          <div class="card-body">
            The following upcoming shows have been canceled:
            <ul>`
              worker.map((item) => {
                notices += `<li><strong>${item.hosts} - ${item.name} on ${moment(item.exceptionTime).format('llll')}</strong>. Reason: ${item.exceptionReason}</li>`
              })
              notices += `</ul>
          </div>
          </div>`
            }

            worker = events.filter((event) => event.exceptionType === 'updated' || event.exceptionType === 'updated-system');
            if (worker.length > 0) {
              notices += `<div class="card mb-4 py-3 border-left-info">
          <div class="card-body">
            The air date/time for these upcoming shows have been changed:
            <ul>`
              worker.map((item) => {
                notices += `<li><strong>${item.hosts} - ${item.name} on ${moment(item.exceptionTime).format('llll')}</strong> is now to air at <strong>${moment(item.start).format('llll')} - ${moment(item.end).format('llll')}. Reason: ${item.exceptionReason}</li>`
              })
              notices += `</ul>
          </div>
          </div>`
            }
          }

          // Fill upcoming shows in cancellation dropdown
          var temp = document.querySelector('#cancel-show')
          if (temp !== null) {
            temp.innerHTML = `<option value="">Choose a show / date to cancel...</option>`
            if (events.length > 0) {
              events
                .filter((event) => event.hostDJ === response.ID && event.exceptionType !== 'canceled' && event.exceptionType !== 'canceled-system' && event.exceptionType !== 'canceled-changed')
                .map((calendar) => {
                  temp.innerHTML += `<option value="${calendar.unique}">${calendar.hosts} - ${calendar.name} (${moment(calendar.start).format('llll')} - ${moment(calendar.end).format('llll')})</option>`
                })
            }
          }

          // Fill shows for clockwheel
          var temp = document.querySelector('#clockwheel-show')
          if (temp !== null) {
            temp.innerHTML = `<option value="">Choose a show / date to assign a topic or clockwheel...</option>`
            if (events.length > 0) {
              events
                .filter((event) => event.hostDJ === response.ID && event.exceptionType !== 'canceled' && event.exceptionType !== 'canceled-system' && event.exceptionType !== 'canceled-changed')
                .map((calendar) => {
                  temp.innerHTML += `<option value="${calendar.unique}">${calendar.hosts} - ${calendar.name} (${moment(calendar.start).format('llll')} - ${moment(calendar.end).format('llll')})</option>`
                })
            }
          }
        });
      });

      temp = document.querySelector('#dash-show')
      if (temp !== null) {
        if (response.stats.semester.missedIDsArray.length > 0) {
          notices += `<div class="card mb-4 py-3 border-left-danger">
          <div class="card-body">
            This semester, you did not take a required Top of the hour ID break for the shows/dates listed below (multiple entries = multiple missed IDs):
            <ul>`
          response.stats.semester.missedIDsArray.map((item) => {
            notices += `<li><strong>${item.name} on ${moment(item.date).format('llll')}</strong></li>`
          })
          notices += `</ul>
          <p>We are required by the FCC to take a break at the top of every hour. <strong>Not doing the top of the hour break could result in loss of your show.</strong></p>
          </div>
          </div>`
        }

        if (response.stats.semester.absencesArray.length > 0) {
          notices += `<div class="card mb-4 py-3 border-left-danger">
          <div class="card-body">
            This semester, you were scheduled to do a show on the following dates / times, but you did not show up nor cancel ahead of time.
            <ul>`
          response.stats.semester.absencesArray.map((item) => {
            notices += `<li><strong>${item.name} on ${moment(item.date).format('llll')}</strong></li>`
          })
          notices += `</ul>
          <p>You are required to notify a director in advance when you will not be airing your show. You can also cancel a show via the "Cancel an Episode" page. Repeatedly not showing up to do your show could result in loss of your show.</p>
          </div>
          </div>`
        }

        if (response.stats.semester.offStartArray.length > 0) {
          notices += `<div class="card mb-4 py-3 border-left-warning">
          <div class="card-body">
            This semester, you started your show 10+ minutes early or late on the following dates / times.
            <ul>`
          response.stats.semester.offStartArray.map((item) => {
            notices += `<li><strong>${item.name} on ${moment(item.date).format('llll')}</strong></li>`
          })
          notices += `</ul>
          <p>Please contact a director if you will be running late or going on the air early. Repeatedly not airing your show on time could result in loss of your show. Please also contact a director if any of these shows should have been excused (you did notify a director, or show fell during an optional shows period).</p>
          </div>
          </div>`
        }

        if (response.stats.semester.offEndArray.length > 0) {
          notices += `<div class="card mb-4 py-3 border-left-warning">
          <div class="card-body">
            This semester, you ended your show 10+ minutes early or late on the following dates / times.
            <ul>`
          response.stats.semester.offEndArray.map((item) => {
            notices += `<li><strong>${item.name} on ${moment(item.date).format('llll')}</strong></li>`
          })
          notices += `</ul>
          <p>Please contact a director if you will be ending your show at a different time. Repeatedly not airing your show on time could result in loss of your show. Please also contact a director if any of these shows should have been excused (you did notify a director, or show fell during an optional shows period).</p>
          </div>
          </div>`
        }

        temp.innerHTML = notices
      }

      // Show Logs and show listener graph
      var data = []
      temp = document.querySelector('#logs-table')
      if (temp !== null) {
        var newAtt = ``
        if (response.attendance.length > 0) {
          var compare = function (a, b) {
            try {
              var theDateA = a.actualStart !== null ? a.actualStart : a.scheduledStart
              var theDateB = b.actualStart !== null ? b.actualStart : b.scheduledStart
              if (moment(theDateA).valueOf() < moment(theDateB).valueOf()) { return 1 }
              if (moment(theDateA).valueOf() > moment(theDateB).valueOf()) { return -1 }
              if (a.ID > b.ID) { return -1 }
              if (b.ID > a.ID) { return 1 }
              return 0
            } catch (e) {
              console.error(e)
              iziToast.show({
                title: 'An error occurred - Please check the logs',
                message: `Error occurred in the compare function of dj-attendance.`
              })
            }
          }

          var djLogsData = []
          response.attendance.sort(compare)
          response.attendance.map(record => {
            if (record.showTime !== null) {
              data.push({ x: moment(record.actualStart).toISOString(true), y: record.showTime > 0 ? (record.listenerMinutes / record.showTime) : 0, showTime: record.showTime, listenerMinutes: record.listenerMinutes })
            }
            var theDate = record.actualStart !== null ? record.actualStart : record.scheduledStart
            if (record.scheduledStart === null) {
              djLogsData.push([
                moment(theDate).format('YYYY/MM/DD'),
                record.event,
                '',
                '',
                moment(record.actualStart).format('h:mm A'),
                record.actualEnd !== null ? moment(record.actualEnd).format('h:mm A') : `ONGOING`,
                '',
                '',
                '',
                '',
                0,
                `<button type="button" id="dj-show-logs-${record.ID}" onclick="loadLog(${record.ID})" class="close dj-show-logs" aria-label="Show Log" title="View the logs for this show"><span aria-hidden="true"><i class="fas fa-file text-dark"></i></span></button>`
              ])
            } else if (moment(record.scheduledStart).isAfter(moment()) && record.happened === 1) {
              djLogsData.push([
                moment(theDate).format('YYYY/MM/DD'),
                record.event,
                moment(record.scheduledStart).format('h:mm A'),
                moment(record.scheduledEnd).format('h:mm A'),
                '',
                '',
                '',
                '',
                '',
                '',
                0,
                ``
              ])
            } else if (record.actualStart !== null && record.actualEnd !== null) {
              var tempStart = moment(record.actualStart).format('h:mm A')
              var tempEnd = record.actualEnd !== null ? moment(record.actualEnd).format('h:mm A') : `ONGOING`
              djLogsData.push([
                moment(theDate).format('YYYY/MM/DD'),
                record.event,
                moment(record.scheduledStart).format('h:mm A'),
                moment(record.scheduledEnd).format('h:mm A'),
                tempStart,
                tempEnd,
                moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes') >= 10 ? '<i class="fas fa-exclamation-triangle"></i>' : '',
                moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes') <= -10 ? '<i class="fas fa-exclamation-triangle"></i>' : '',
                moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes') >= 10 ? '<i class="fas fa-exclamation-triangle"></i>' : '',
                moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes') <= -10 ? '<i class="fas fa-exclamation-triangle"></i>' : '',
                record.missedIDs,
                `<button type="button" id="dj-show-logs-${record.ID}" onclick="loadLog(${record.ID})" class="close dj-show-logs" aria-label="Show Log" title="View the logs for this show"><span aria-hidden="true"><i class="fas fa-file text-dark"></i></span></button>`
              ])
            } else if (record.actualStart !== null && record.actualEnd === null) {
              djLogsData.push([
                moment(theDate).format('YYYY/MM/DD'),
                record.event,
                moment(record.scheduledStart).format('h:mm A'),
                moment(record.scheduledEnd).format('h:mm A'),
                moment(record.actualStart).format('h:mm A'),
                'ONGOING',
                moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes') >= 10 ? '<i class="fas fa-exclamation-triangle"></i>' : '',
                moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes') <= -10 ? '<i class="fas fa-exclamation-triangle"></i>' : '',
                '',
                '',
                record.missedIDs,
                `<button type="button" id="dj-show-logs-${record.ID}" onclick="loadLog(${record.ID})" class="close dj-show-logs" aria-label="Show Log" title="View the logs for this show"><span aria-hidden="true"><i class="fas fa-file text-dark"></i></span></button>`
              ])
            } else if (record.happened === 0) {
              djLogsData.push([
                moment(theDate).format('YYYY/MM/DD'),
                record.event,
                moment(record.scheduledStart).format('h:mm A'),
                moment(record.scheduledEnd).format('h:mm A'),
                'ABSENT',
                'ABSENT',
                '',
                '',
                '',
                '',
                0,
                ``
              ])
            } else if (record.happened === -1) {
              djLogsData.push([
                moment(theDate).format('YYYY/MM/DD'),
                record.event,
                moment(record.scheduledStart).format('h:mm A'),
                moment(record.scheduledEnd).format('h:mm A'),
                'CANCELED',
                'CANCELED',
                '',
                '',
                '',
                '',
                0,
                ``
              ])
            } else {
              djLogsData.push([
                moment(theDate).format('YYYY/MM/DD'),
                record.event,
                moment(record.scheduledStart).format('h:mm A'),
                moment(record.scheduledEnd).format('h:mm A'),
                'SCHEDULED',
                'SCHEDULED',
                '',
                '',
                '',
                '',
                0,
                ``
              ])
            }
          })

          // Render table
          djLogsTable.clear()
          djLogsTable.rows.add(djLogsData)
          djLogsTable.draw()

          temp = document.querySelector('#analytics-listenerChart')
          if (temp !== null) {
            temp.innerHTML = ''
            new Taucharts.Chart({
              data: data,
              type: 'line',
              x: 'x',
              y: 'y',
              color: 'primary',
              guide: {
                y: { label: { text: 'Show time : Online Listener Ratio' }, autoScale: true, nice: true },
                x: { label: { text: 'Date/Time of Show' }, autoScale: true, nice: false },
                showGridLines: 'xy'
              },
              dimensions: {
                x: {
                  type: 'measure',
                  scale: 'time'
                },
                y: {
                  type: 'measure',
                  scale: 'linear'
                }
              },
              plugins: [
                Taucharts.api.plugins.get('tooltip')({
                  formatters: {
                    x: {
                      label: 'Date / Time',
                      format: function (n) {
                        return moment(n).format('LLL')
                      }
                    },
                    y: {
                      label: 'Show Time : Online Listeners ratio',
                      format: function (n) {
                        return n
                      }
                    },
                    showTime: {
                      label: 'Show Time (minutes)',
                      format: function (n) {
                        return formatInt(n)
                      }
                    },
                    listenerMinutes: {
                      label: 'Online Listeners (minutes)',
                      format: function (n) {
                        return formatInt(n)
                      }
                    }
                  }
                })
              ]
            }).renderTo('#analytics-listenerChart')
          }
        }
      }
    }

    activateMenu(`menu-dashboard`)
  })

  noReq.request({ method: 'POST', url: '/announcements/get', data: { type: 'djcontrols' } }, function (body) {
    // console.log(body);
    try {
      var temp = document.querySelector('#dash-announcements')
      if (temp !== null && body.length > 0) {
        body.map((announcement) => {
          if (moment(announcement.starts).isBefore(moment()) && moment(announcement.expires).isAfter(moment())) {
            temp.innerHTML += `<div class="card mb-4 py-3 border-left-${announcement.level}">
          <h4>${announcement.title}</h4>
          <div class="card-body">${announcement.announcement}</div></div>`
          }
        })
      }
    } catch (e) {
      console.error(e)
      iziToast.show({
        title: 'An error occurred',
        message: 'Error occurred trying to get announcements. Please try again or contact engineer@wwsu1069.org.'
      })
    }
  })
}

function activateMenu (menuItem) {
  menu.map((item) => {
    var temp = document.querySelector(item)
    if (temp !== null) {
      temp.classList.remove('active')
    }
  })

  containers.map((item) => {
    var temp = document.querySelector(item)
    if (temp !== null) {
      temp.style.display = 'none'
    }
  })

  var temp = document.querySelector(`#${menuItem}`)
  if (temp !== null) {
    temp.classList.add('active')
  }

  switch (menuItem) {
    case 'menu-home':
    case 'menu-dashboard':
      temp = document.querySelector(`#body-dashboard`)
      if (temp !== null) {
        temp.style.removeProperty('display')
      }
      break
    case 'menu-analytics':
      temp = document.querySelector(`#body-analytics`)
      if (temp !== null) {
        temp.style.removeProperty('display')
      }
      break
    case 'menu-cancel':
      temp = document.querySelector(`#body-cancel`)
      if (temp !== null) {
        temp.style.removeProperty('display')
      }
      break
    case 'menu-clockwheel':
      temp = document.querySelector(`#body-clockwheel`)
      if (temp !== null) {
        temp.style.removeProperty('display')
      }
      break
    default:
      temp = document.querySelector(`#body-comingsoon`)
      if (temp !== null) {
        temp.style.removeProperty('display')
      }
      break
  }
}

function loadLog (logID) {
  jQuery('#modal-dj-logs').iziModal('open')
  var logs = document.querySelector('#dj-show-logs')
  if (logs !== null) {
    logs.innerHTML = `<div class="chart-area">
                      <div id="listener-graph"></div>
                      </div>
    <table class="table table-bordered" id="dj-show-logs-table" width="100%" cellspacing="0"></table>`
    DJReq.request({ db: DJs.db(), method: 'POST', url: '/logs/get-dj', data: { attendanceID: logID } }, function (response) {
      logs.scrollTop = 0
      var newLog = []
      if (typeof response.logs !== 'undefined' && response.logs.length > 0) {
        var data = []
        if (response.listeners.length > 0) {
          response.listeners.map((listener) => {
            data.push({ x: moment(listener.createdAt).toISOString(true), y: listener.listeners })
          })
        }
        temp = document.querySelector('#listener-graph')
        if (temp !== null) {
          new Taucharts.Chart({
            data: data,
            type: 'line',
            x: 'x',
            y: 'y',
            color: 'primary',
            guide: {
              y: { label: { text: 'Online Listeners' }, autoScale: true, nice: true },
              x: { label: { text: 'Time' }, autoScale: true, nice: false },
              showGridLines: 'xy'
            },
            dimensions: {
              x: {
                type: 'measure',
                scale: 'time'
              },
              y: {
                type: 'measure',
                scale: 'linear'
              }
            },
            plugins: [
              Taucharts.api.plugins.get('tooltip')({
                formatters: {
                  x: {
                    label: 'Time',
                    format: function (n) {
                      return moment(n).format('LT')
                    }
                  },
                  y: {
                    label: 'Online Listeners',
                    format: function (n) {
                      return n
                    }
                  }
                }
              })
            ]
          }).renderTo('#listener-graph')
        }
        response.logs.map(log => {
          if (log.loglevel === 'urgent') { log.loglevel = 'warning' }
          if (log.loglevel === 'purple') { log.loglevel = 'secondary' }
          newLog.push([ `<span class="text-${log.loglevel}"><i class="fas fa-dot-circle" width="32"></i></span>`, moment(log.createdAt).format('h:mm:ss A'), `${log.event}
          ${log.trackArtist !== null && log.trackArtist !== '' ? `<br />Track: ${log.trackArtist}` : ``}${log.trackTitle !== null && log.trackTitle !== '' ? ` - ${log.trackTitle}` : ``}
          ${log.trackAlbum !== null && log.trackAlbum !== '' ? `<br />Album: ${log.trackAlbum}` : ``}
          ${log.trackLabel !== null && log.trackLabel !== '' ? `<br />Label: ${log.trackLabel}` : ``}` ])
        })
        jQuery('#dj-show-logs-table').DataTable({
          data: newLog,
          responsive: true,
          columns: [
            { title: "" },
            { title: "Time" },
            { title: "Event" }
          ]
        })
      } else {
        logs.innerHTML = 'ERROR: Unable to load the log for that show. Please try again or contact engineer@wwsu1069.org .'
      }
    })
  }
}

function formatInt (x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function checkDiscipline (cb) {
  io.socket.post('/discipline/get-web', {}, function serverResponded (body) {
    try {
      var docb = true
      if (body.length > 0) {
        body.map((discipline) => {
          var activeDiscipline = (discipline.active && (discipline.action !== 'dayban' || moment(discipline.createdAt).add(1, 'days').isAfter(moment())))
          if (activeDiscipline) { docb = false }
          if (activeDiscipline || !discipline.acknowledged) {
            iziToast.show({
              title: `Disciplinary action ${activeDiscipline ? `active against you` : `was issued in the past against you`}`,
              message: `On ${moment(discipline.createdAt).format('LLL')}, disciplinary action was issued against you for the following reason: ${discipline.message}. <br /><br />
              ${activeDiscipline ? `A ${discipline.action} is currently active, and you are not allowed to use WWSU's services at this time.` : `The discipline has expired, but you must acknowledge this message before you may use WWSU's services. Further issues may warrant more severe disciplinary action.`}<br />
              Please contact gm@wwsu1069.org if you have any questions or concerns.`,
              timeout: false,
              close: false,
              color: 'red',
              drag: false,
              position: 'center',
              closeOnClick: false,
              overlay: true,
              zindex: 1000,
              layout: 2,
              maxWidth: 480,
              buttons: [
                [ '<button>Acknowledge</button>', function (instance, toast, button, e, inputs) {
                  io.socket.post('/discipline/acknowledge', { ID: discipline.ID }, function serverResponded (body) { })
                  instance.hide({}, toast, 'button')
                } ]
              ]
            })
          }
        })
      }
      if (docb) {
        cb()
      }
    } catch (e) {
      iziToast.show({
        title: 'Failed to check discipline',
        message: 'Unable to connect to WWSU because we could not determine if you are banned. Please try again later.',
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

function creditsHelp () {
  jQuery('#modal-help-remotes').iziModal('open')
}

function reputationHelp () {
  jQuery('#modal-help-reputation').iziModal('open')
}

function xpHelp () {
  jQuery('#modal-help-xp').iziModal('open')
}

function cancelShow () {
  var selection = document.querySelector('#cancel-show').options[ document.querySelector('#cancel-show').selectedIndex ].value
  if (selection === '' || selection === null) { return null }
  var showName = document.querySelector('#cancel-show').options[ document.querySelector('#cancel-show').selectedIndex ].innerHTML

  var selection = selection.split("_");
  var calendarID = parseInt(selection[ 0 ]);
  var time = moment(selection[ 1 ]).toISOString(true);
  var calendarException = false;
  if (selection[ 2 ]) {
    calendarID = parseInt(selection[ 2 ]);
    calendarException = true;
  }

  var reason = document.querySelector('#cancel-reason').value

  iziToast.show({
    title: `Confirm show cancellation`,
    message: `Are you sure you want to cancel <strong>${showName}</strong>? Directors and show subscribers will be notified of your cancelation.`,
    timeout: 60000,
    close: true,
    color: 'yellow',
    drag: false,
    position: 'center',
    closeOnClick: true,
    overlay: true,
    zindex: 1000,
    layout: 2,
    maxWidth: 480,
    buttons: [
      [ '<button>Yes</button>', function (instance, toast, button, e, inputs) {
        DJReq.request({ db: DJs.db(), method: 'POST', url: '/calendar/cancel-web', data: { ID: calendarID, start: time, additionalException: calendarException, reason: reason } }, function (response) {
          if (response === 'OK') {
            iziToast.show({
              title: `Show Canceled!`,
              message: `The show has been canceled.`,
              timeout: 10000,
              close: true,
              color: 'green',
              drag: false,
              position: 'center',
              closeOnClick: true,
              overlay: false,
              zindex: 1000
            })
            document.querySelector('#cancel-reason').value = ""
            doRequests()
          } else {
            console.dir(response)
            iziToast.show({
              title: `Failed to cancel show!`,
              message: `There was an error trying to cancel the show. Please try again or email engineer@wwsu1069.org if this problem continues.`,
              timeout: 15000,
              close: true,
              color: 'red',
              drag: false,
              position: 'center',
              closeOnClick: true,
              overlay: false,
              zindex: 1000,
              maxWidth: 480
            })
          }
        })
        instance.hide({}, toast, 'button')
      } ],
      [ '<button>No</button>', function (instance, toast, button, e, inputs) {
        instance.hide({}, toast, 'button')
      } ]
    ]
  })

}

function changeTopic () {
  var selection = document.querySelector('#clockwheel-show').options[ document.querySelector('#clockwheel-show').selectedIndex ].value
  if (selection === '' || selection === null) { return null }

  var selection = selection.split("_");
  var calendarID = parseInt(selection[ 0 ]);
  var time = moment(selection[ 1 ]).toISOString(true);
  var calendarException = false;
  if (selection[ 2 ]) {
    calendarID = parseInt(selection[ 2 ]);
    calendarException = true;
  }
  var topic = document.querySelector('#clockwheel-topic').value

  DJReq.request({ db: DJs.db(), method: 'POST', url: '/calendar/change-topic-web', data: { ID: calendarID, start: time, additionalException: calendarException, topic: topic } }, function (response) {
    if (response === 'OK') {
      iziToast.show({
        title: `Show topic changed!`,
        message: `The topic for the show has been changed`,
        timeout: 10000,
        close: true,
        color: 'green',
        drag: false,
        position: 'center',
        closeOnClick: true,
        overlay: false,
        zindex: 1000
      })
      document.querySelector('#clockwheel-topic').value = ""
      doRequests()
    } else {
      console.dir(response)
      iziToast.show({
        title: `Failed to change topic!`,
        message: `There was an error trying to change the show topic. Please try again or email engineer@wwsu1069.org if this problem continues.`,
        timeout: 15000,
        close: true,
        color: 'red',
        drag: false,
        position: 'center',
        closeOnClick: true,
        overlay: false,
        zindex: 1000,
        maxWidth: 480
      })
    }
  })
}