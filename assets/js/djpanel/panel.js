/* global WWSUdb, TAFFY, WWSUreq, iziToast, JQuery, Taucharts */

jQuery.noConflict()
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
  '#body-dashboard',
  '#body-analytics'
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

function waitFor(check, callback, count = 0) {
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

  // Register event handlers
  io.socket.on('connect', () => {
    DJs.replaceData(noReq, '/djs/get')
  })

  DJs.replaceData(noReq, '/djs/get')
})

function doRequests() {
  DJReq.request({ db: DJs.db(), method: 'POST', url: '/djs/get-web', data: {} }, (response) => {
    if (typeof response.stats === 'undefined') {
      iziToast.show({
        title: 'An error occurred',
        message: 'Error occurred trying to authenticate the DJ. Please try again or contact engineer@wwsu1069.org.'
      })
    } else {
      // Populate DJ statistics and information

      var analyticsTable = []

      // DJ Name
      var temp = document.querySelector('#dj-name')
      if (temp !== null) { temp.innerHTML = response.stats.name }
      djName = response.stats.name

      // Live Shows
      analyticsTable.push(['<i class="fas fa-microphone" width="32"></i>', 'Live Shows', formatInt(response.stats.semester.shows), formatInt(response.stats.overall.shows)])

      // Prerecords
      analyticsTable.push(['<i class="fas fa-compact-disc" width="32"></i>', 'Prerecorded Shows', formatInt(response.stats.semester.prerecords), formatInt(response.stats.overall.prerecords)])

      // Remotes
      analyticsTable.push(['<i class="fas fa-broadcast-tower" width="32"></i>', 'Remote Broadcasts', formatInt(response.stats.semester.remotes), formatInt(response.stats.overall.remotes)])

      // Showtime
      temp = document.querySelector('#dash-showtime')
      if (temp !== null) { temp.innerHTML = formatInt(Math.floor((response.stats.overall.showtime / 60) * 100) / 100) }
      analyticsTable.push(['<i class="fas fa-play" width="32"></i>', 'Showtime (Hours)', formatInt(Math.floor((response.stats.semester.showtime / 60) * 100) / 100), formatInt(Math.floor((response.stats.overall.showtime / 60) * 100) / 100)])

      // Listener hours
      temp = document.querySelector('#dash-hours')
      if (temp !== null) { temp.innerHTML = formatInt(Math.floor((response.stats.overall.listeners / 60) * 100) / 100) }
      analyticsTable.push(['<i class="fas fa-headphones" width="32"></i>', 'Online Listeners (Hours)', formatInt(Math.floor((response.stats.semester.listeners / 60) * 100) / 100), formatInt(Math.floor((response.stats.overall.listeners / 60) * 100) / 100)])

      // XP
      temp = document.querySelector('#dash-XP')
      if (temp !== null) { temp.innerHTML = formatInt(response.stats.overall.xp) }
      analyticsTable.push(['<i class="fas fa-star" width="32"></i>', 'Experience Points (XP)', formatInt(response.stats.semester.xp), formatInt(response.stats.overall.xp)])

      // Remote credits
      temp = document.querySelector('#dash-credits')
      if (temp !== null) { temp.innerHTML = formatInt(response.stats.semester.remoteCredits) }
      analyticsTable.push(['<i class="fas fa-gem" width="32"></i>', 'Remote Credits', formatInt(response.stats.semester.remoteCredits), formatInt(response.stats.overall.remoteCredits)])

      // Reputation
      analyticsTable.push(['<i class="fas fa-smile"></i>', 'Reputation / Responsibility', `<div class="progress progress-sm mr-2">
      <div class="progress-bar bg-success" role="progressbar" style="width: ${response.stats.semester.reputationPercent}%" aria-valuenow="${response.stats.semester.reputationPercent}" aria-valuemin="0" aria-valuemax="100"></div>
    </div>`, `<div class="progress progress-sm mr-2">
    <div class="progress-bar bg-success" role="progressbar" style="width: ${response.stats.overall.reputationPercent}%" aria-valuenow="${response.stats.overall.reputationPercent}" aria-valuemin="0" aria-valuemax="100"></div>
  </div>`])

      // Render analytics table
      jQuery('#analytics-table').DataTable({
        data: analyticsTable,
        columns: [
          { title: "" },
          { title: "Statistic" },
          { title: "Semester" },
          { title: "Lifetime" },
        ]
      })

      // Show Notices
      temp = document.querySelector('#dash-show')
      if (temp !== null) {
        var notices = ''

        if (response.cancellations.length > 0) {
          notices += `<div class="card mb-4 py-3 border-left-info">
          <div class="card-body">
            The following upcoming shows have been canceled, either by you or by a director:
            <ul>`
          response.cancellations.map((item) => {
            notices += `<li><strong>${moment(item.scheduledStart).format('LLL')} - ${moment(item.scheduledEnd).format('h:mm A')}</strong>. Reason: ${item.happenedReason}</li>`
          })
          notices += `</ul>
          </div>
          </div>`
        }

        if (response.changes.length > 0) {
          notices += `<div class="card mb-4 py-3 border-left-info">
          <div class="card-body">
            The dates/times for your upcoming shows listed below have been changed, either by you or by a director:
            <ul>`
          response.changes.map((item) => {
            notices += `<li><strong>${moment(item.originalStart).format('LLL')} - ${moment(item.originalEnd).format('h:mm A')}</strong> changed to <strong>${moment(item.start).format('LLL')} - ${moment(item.end).format('h:mm A')}</strong></li>`
          })
          notices += `</ul>
          <p>Please contact a director for more information if you did not make these changes; most likely, a change was made because of a sports broadcast.</strong></p>
          </div>
          </div>`
        }

        if (response.stats.semester.missedIDsArray.length > 0) {
          notices += `<div class="card mb-4 py-3 border-left-danger">
          <div class="card-body">
            This semester, you did not take a required Top of the hour ID break for the show dates listed below (if a show date is listed more the once, you missed an ID more than once).
            <ul>`
          response.stats.semester.missedIDsArray.map((item) => {
            notices += `<li><strong>${moment(item).format('LLL')}</strong></li>`
          })
          notices += `</ul>
          <p>We are required by the FCC to take a break at the top of every hour. <strong>Not doing the top of the hour break could result in suspension of your show.</strong></p>
          </div>
          </div>`
        }

        if (response.stats.semester.absencesArray.length > 0) {
          notices += `<div class="card mb-4 py-3 border-left-danger">
          <div class="card-body">
            This semester, you were scheduled to do a show on the following dates / times, but you did not show up nor cancel ahead of time.
            <ul>`
          response.stats.semester.absencesArray.map((item) => {
            notices += `<li><strong>${moment(item).format('LLL')}</strong></li>`
          })
          notices += `</ul>
          <p>DJs are required to either cancel their show or request a re-run via the "Cancel an Episode" or "Air a re-run" pages on the DJ panel (see the left menu) if they are not doing a show. Repeated unexcused absences may result in suspension of your show. Please contact a director if you canceled a show listed above in advance, or if a show listed above fell within a "shows optional" period.</p>
          </div>
          </div>`
        }

        if (response.stats.semester.offStartArray.length > 0) {
          notices += `<div class="card mb-4 py-3 border-left-warning">
          <div class="card-body">
            This semester, you started your show 10+ minutes early or late on the following dates / times.
            <ul>`
          response.stats.semester.offStartArray.map((item) => {
            notices += `<li><strong>${moment(item).format('LLL')}</strong></li>`
          })
          notices += `</ul>
          <p>In the future, please contact a director or use the "Request a Time Change" page in the DJ panel if you expect to be late for your show, or you want to air your show at a different time. Repeatedly not airing your show on time could result in suspension of your show.</p>
          </div>
          </div>`
        }

        if (response.stats.semester.offEndArray.length > 0) {
          notices += `<div class="card mb-4 py-3 border-left-warning">
          <div class="card-body">
            This semester, you ended your show 10+ minutes early or late on the following dates / times.
            <ul>`
          response.stats.semester.offEndArray.map((item) => {
            notices += `<li><strong>${moment(item).format('LLL')}</strong></li>`
          })
          notices += `</ul>
          <p>In the future, please contact a director or use the "Request a Time Change" page in the DJ panel if you want to end your show early, or you want to air your show at a different time. Repeatedly not airing your show on time could result in suspension of your show.</p>
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

          var djLogs = []
          response.attendance.sort(compare)
          response.attendance.map(record => {
            if (record.showTime !== null) {
              data.push({ x: moment(record.actualStart).toISOString(true), y: record.showTime > 0 ? (record.listenerMinutes / record.showTime) : 0, showTime: record.showTime, listenerMinutes: record.listenerMinutes })
            }
            var theDate = record.actualStart !== null ? record.actualStart : record.scheduledStart
            if (record.scheduledStart === null) {
              djLogs.push([
                moment(theDate).format('YYYY/MM/DD'),
                record.event,
                '',
                '',
                moment(record.actualStart).format('h:mm A'),
                record.actualEnd !== null ? moment(record.actualEnd).format('h:mm A') : `ONGOING`,
                '<i class="fas fa-exclamation-triangle"></i>',
                '',
                '',
                '',
                '',
                0,
                `<button type="button" id="dj-show-logs-${record.ID}" onclick="loadLog(${record.ID})" class="close dj-show-logs" aria-label="Show Log" title="View the logs for this show"><span aria-hidden="true"><i class="fas fa-file text-dark"></i></span></button>`
              ])
            } else if (moment(record.scheduledStart).isAfter(moment()) && record.happened === 1) {
              djLogs.push([
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
                '',
                0,
                ``
              ])
            } else if (record.actualStart !== null && record.actualEnd !== null) {
              var tempStart = moment(record.actualStart).format('h:mm A')
              var tempEnd = record.actualEnd !== null ? moment(record.actualEnd).format('h:mm A') : `ONGOING`
              djLogs.push([
                moment(theDate).format('YYYY/MM/DD'),
                record.event,
                moment(record.scheduledStart).format('h:mm A'),
                moment(record.scheduledEnd).format('h:mm A'),
                tempStart,
                tempEnd,
                '',
                moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes') >= 10 ? '<i class="fas fa-exclamation-triangle"></i>' : '',
                moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes') <= -10 ? '<i class="fas fa-exclamation-triangle"></i>' : '',
                moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes') >= 10 ? '<i class="fas fa-exclamation-triangle"></i>' : '',
                moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes') <= -10 ? '<i class="fas fa-exclamation-triangle"></i>' : '',
                record.missedIDs,
                `<button type="button" id="dj-show-logs-${record.ID}" onclick="loadLog(${record.ID})" class="close dj-show-logs" aria-label="Show Log" title="View the logs for this show"><span aria-hidden="true"><i class="fas fa-file text-dark"></i></span></button>`
              ])
            } else if (record.actualStart !== null && record.actualEnd === null) {
              djLogs.push([
                moment(theDate).format('YYYY/MM/DD'),
                record.event,
                moment(record.scheduledStart).format('h:mm A'),
                moment(record.scheduledEnd).format('h:mm A'),
                moment(record.actualStart).format('h:mm A'),
                'ONGOING',
                '',
                moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes') >= 10 ? '<i class="fas fa-exclamation-triangle"></i>' : '',
                moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes') <= -10 ? '<i class="fas fa-exclamation-triangle"></i>' : '',
                '',
                '',
                record.missedIDs,
                `<button type="button" id="dj-show-logs-${record.ID}" onclick="loadLog(${record.ID})" class="close dj-show-logs" aria-label="Show Log" title="View the logs for this show"><span aria-hidden="true"><i class="fas fa-file text-dark"></i></span></button>`
              ])
            } else if (record.happened === 0) {
              djLogs.push([
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
                '',
                0,
                ``
              ])
            } else if (record.happened === -1) {
              djLogs.push([
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
                '',
                0,
                ``
              ])
            } else {
              djLogs.push([
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
                '',
                0,
                ``
              ])
            }
          })
          djLogs = djLogs.reverse()
          // Render analytics table
          jQuery('#logs-table').DataTable({
            data: djLogs,
            responsive: true
          })

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
                      label: 'Show Time : Online Listeners ratio',
                      format: function (n) {
                        return n
                      }
                    },
                    y: {
                      label: 'Total Listener Hours',
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
  })
}

function activateMenu(menuItem) {
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
  }
}

function loadLog(logID) {
  jQuery('#modal-dj-logs').iziModal('open')
  var logs = document.querySelector('#dj-show-logs')
  if (logs !== null) {
    logs.innerHTML = `<table class="table table-bordered" id="dj-show-logs-table" width="100%" cellspacing="0"></table>`
    DJReq.request({ db: DJs.db(), method: 'POST', url: '/logs/get-dj', data: { attendanceID: logID } }, function (response) {
      logs.scrollTop = 0
      var newLog = []
      if (response.length > 0) {
        response.map(log => {
          if (log.loglevel === 'urgent') { log.loglevel = 'warning' }
          if (log.loglevel === 'purple') { log.loglevel = 'secondary' }
          newLog.push([`<span class="text-${log.loglevel}"><i class="fas fa-dot-circle" width="32"></i></span>`, moment(log.createdAt).format('h:mm:ss A'), `${log.event}
          ${log.trackArtist !== null && log.trackArtist !== '' ? `<br />Track: ${log.trackArtist}` : ``}${log.trackTitle !== null && log.trackTitle !== '' ? ` - ${log.trackTitle}` : ``}
          ${log.trackAlbum !== null && log.trackAlbum !== '' ? `<br />Album: ${log.trackAlbum}` : ``}
          ${log.trackLabel !== null && log.trackLabel !== '' ? `<br />Label: ${log.trackLabel}` : ``}`])
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

function formatInt(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}