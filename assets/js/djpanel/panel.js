/* global WWSUdb, TAFFY, WWSUreq, iziToast, $, Taucharts */

var DJReq
var noReq
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
})

document.querySelector(`#accordionSidebar`).addEventListener('click', function (e) {
  try {
    console.log(e.target.id)
    if (e.target) {
      if (e.target.id.startsWith(`menu-`)) {
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

        var temp = document.querySelector(`#${e.target.id}`)
        if (temp !== null) {
          temp.classList.add('active')
        }

        switch (e.target.id) {
          case 'menu-home':
          case 'menu-dashboard':
            temp = document.querySelector(`#body-dashboard`)
            if (temp !== null) {
              delete temp.style.display
            }
            break
          case 'menu-analytics':
            temp = document.querySelector(`#body-analytics`)
            if (temp !== null) {
              delete temp.style.display
            }
            break
        }
      }
    }
  } catch (err) {
    console.error(err)
    iziToast.show({
      title: 'An error occurred - Please inform engineer@wwsu1069.org.',
      message: 'Error occurred during the click event of #accordionSidebar.'
    })
  }
})

document.querySelector(`#dj-attendance`).addEventListener('click', function (e) {
  try {
    console.log(e.target.id)
    if (e.target) {
      if (e.target.id.startsWith(`dj-show-logs-`)) {
        document.querySelector('#dj-show-logs').innerHTML = `<h2 class="text-warning" style="text-align: center;">PLEASE WAIT...</h4>`
        document.querySelector('#dj-logs-listeners').innerHTML = ''
        $('#options-modal-dj-logs').iziModal('open')
        DJReq.request({ db: DJs.db(), method: 'POST', url: '/logs/get-dj', data: { attendanceID: parseInt(e.target.id.replace(`dj-show-logs-`, ``)) } }, function (response) {
          var logs = document.querySelector('#dj-show-logs')
          logs.scrollTop = 0
          var newLog = ``
          if (response.length > 0) {
            response.map(log => {
              if (log.logLevel === 'urgent') { log.logLevel = 'warning' }
              if (log.logLevel === 'purple') { log.logLevel = 'secondary' }
              newLog += `<div class="row card mb-4 py-3 border-left-${log.logLevel}">
                                <div class="card-body">
                                <div class="col-3 text-primary">
                                    ${moment(log.createdAt).format('h:mm:ss A')}
                                </div>
                                <div class="col-9 text-secondary">
                                ${log.event}
                                ${log.trackArtist !== null && log.trackArtist !== '' ? `<br />Track: ${log.trackArtist}` : ``}${log.trackTitle !== null && log.trackTitle !== '' ? ` - ${log.trackTitle}` : ``}
                                ${log.trackAlbum !== null && log.trackAlbum !== '' ? `<br />Album: ${log.trackAlbum}` : ``}
                                ${log.trackLabel !== null && log.trackLabel !== '' ? `<br />Label: ${log.trackLabel}` : ``}
                                </div>
                            </div></div>`
            })
            logs.innerHTML = newLog
          } else {
            logs.innerHTML = 'ERROR: Unable to load the log for that show. Please try again or contact engineer@wwsu1069.org .'
          }
        })
      }
    }
  } catch (err) {
    console.error(err)
    iziToast.show({
      title: 'An error occurred - Please inform engineer@wwsu1069.org.',
      message: 'Error occurred during the click event of #dj-attendance.'
    })
  }
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

      // DJ Name
      var temp = document.querySelector('#dj-name')
      if (temp !== null) { temp.innerHTML = response.stats.name }

      // Live Shows
      temp = document.querySelector('#dj-shows')
      if (temp !== null) { temp.innerHTML = response.stats.semester.shows }
      temp = document.querySelector('#dj-showsL')
      if (temp !== null) { temp.innerHTML = response.stats.overall.shows }

      // Prerecords
      temp = document.querySelector('#dj-prerecords')
      if (temp !== null) { temp.innerHTML = response.stats.semester.prerecords }
      temp = document.querySelector('#dj-prerecordsL')
      if (temp !== null) { temp.innerHTML = response.stats.overall.prerecords }

      // Remotes
      temp = document.querySelector('#dj-remotes')
      if (temp !== null) { temp.innerHTML = response.stats.semester.remotes }
      temp = document.querySelector('#dj-remotesL')
      if (temp !== null) { temp.innerHTML = response.stats.overall.remotes }

      // Showtime
      temp = document.querySelector('#dj-showtime')
      if (temp !== null) { temp.innerHTML = response.stats.semester.showtime }
      temp = document.querySelector('#dj-showtimeL')
      if (temp !== null) { temp.innerHTML = response.stats.overall.showtime }

      // Listener hours
      temp = document.querySelector('#dj-listenertime')
      if (temp !== null) { temp.innerHTML = response.stats.semester.listeners }
      temp = document.querySelector('#dj-listenertimeL')
      if (temp !== null) { temp.innerHTML = response.stats.overall.listeners }

      // XP
      temp = document.querySelector('#dj-xp')
      if (temp !== null) { temp.innerHTML = response.stats.semester.xp }
      temp = document.querySelector('#dj-xpL')
      if (temp !== null) { temp.innerHTML = response.stats.overall.xp }

      // Remote credits
      temp = document.querySelector('#dash-credits')
      if (temp !== null) { temp.innerHTML = response.stats.semester.remoteCredits }
      temp = document.querySelector('#dj-remotecredits')
      if (temp !== null) { temp.innerHTML = response.stats.semester.remoteCredits }
      temp = document.querySelector('#dj-remotecreditsL')
      if (temp !== null) { temp.innerHTML = response.stats.overall.remoteCredits }

      // Show Notices
      temp = document.querySelector('#dash-show')
      if (temp !== null) {
        var notices = ''
        if (response.stats.semester.missedIDsArray.length > 1) {
          notices += `<div class="card mb-4 py-3 border-left-danger">
          <div class="card-body">
            This semester, you did not take a required Top of the hour ID break for the show dates listed below (if a show date is listed more the once, you missed an ID more than once). We are required by the FCC to take a break at the top of every hour. <strong>Not doing the top of the hour break could result in suspension of your show.</strong>
            <ul>
            <li>
            ${response.stats.semester.missedIDsArray.join('</li><li>')}
            </li>
            </ul>
          </div>
        </div>`
        }
        if (response.stats.semester.missedIDsArray.length > 1) {
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

        if (response.stats.semester.absencesArray.length > 1) {
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

        if (response.stats.semester.offStartArray.length > 1) {
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

        if (response.stats.semester.offEndArray.length > 1) {
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
      temp = document.querySelector('#dj-attendance')
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
          response.attendance.sort(compare)
          response.attendance.map(record => {
            if (record.listenerMinutes !== null) {
              data.push({ x: moment(record.actualStart).toISOString(true), y: Math.floor((record.listenerMinutes / 60) * 100) / 100 })
            }
            var theDate = record.actualStart !== null ? record.actualStart : record.scheduledStart
            if (record.scheduledStart === null) {
              newAtt += `<div class="row card mb-4 py-3 border-left-danger" title="You went on the air when you were not scheduled to be on the air.">
                              <div class="card-body">
                              <div class="col-2 text-danger">
                                  ${moment(theDate).format('MM/DD/YYYY')}
                              </div>
                              <div class="col-4 text-info">
                                  ${record.event}
                              </div>
                              <div class="col-4">
                                  <span class="text-secondary">UN-SCHEDULED</span><br />
                                  <span class="text-primary">${moment(record.actualStart).format('h:mm A')} - ${record.actualEnd !== null ? moment(record.actualEnd).format('h:mm A') : `ONGOING`}</span>
                                  ${record.missedIDs > 0 ? `<br /><span class="text-primary">⚠Missed IDs: ${record.missedIDs}</span>` : ``}
                              </div>
                              <div class="col-2">
                                  <button type="button" id="dj-show-logs-${record.ID}" class="close dj-show-logs" aria-label="Show Log" title="View the logs for this show">
                  <span aria-hidden="true"><i class="fas fa-file text-dark"></i></span>
                  </button>
                              </div>
                          </div></div>`
            } else if (moment(record.scheduledStart).isAfter(moment()) && record.happened === 1) {
              newAtt += `<div class="row card mb-4 py-3 border-left-primary" title="This show has not aired yet.">
                              <div class="card-body">
                              <div class="col-2 text-danger">
                                  ${moment(theDate).format('MM/DD/YYYY')}
                              </div>
                              <div class="col-4 text-info">
                                  ${record.event}
                              </div>
                              <div class="col-4">
                                  <span class="text-secondary">${moment(record.scheduledStart).format('h:mm A')} - ${moment(record.scheduledEnd).format('h:mm A')}</span><br />
                                  <span class="text-primary">FUTURE EVENT</span>
                              </div>
                              <div class="col-2">
                              </div>
                          </div></div>`
            } else if (record.actualStart !== null && record.actualEnd !== null) {
              if (Math.abs(moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes')) >= 10 || Math.abs(moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes')) >= 10) {
                var tempStart = moment(record.actualStart).format('h:mm A')
                var tempEnd = record.actualEnd !== null ? moment(record.actualEnd).format('h:mm A') : `ONGOING`
                if (moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes') >= 10) {
                  tempStart = `⚠️${moment(record.actualStart).format('h:mm A')}`
                }
                if (moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes') <= -10) {
                  tempStart = `${moment(record.actualStart).format('h:mm A')}⚠️`
                }
                if (moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes') >= 10) {
                  tempEnd = `⚠️${record.actualEnd !== null ? moment(record.actualEnd).format('h:mm A') : `ONGOING`}`
                }
                if (moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes') <= -10) {
                  tempEnd = `${record.actualEnd !== null ? moment(record.actualEnd).format('h:mm A') : `ONGOING`}⚠️`
                }
                newAtt += `<div class="row card mb-4 py-3 border-left-warning" title="You went on the air, or signed off, 10 or more minutes from the scheduled time.">
                           <div class="card-body">
                              <div class="col-2 text-danger">
                                  ${moment(theDate).format('MM/DD/YYYY')}
                              </div>
                              <div class="col-4 text-info">
                                  ${record.event}
                              </div>
                              <div class="col-4">
                                  <span class="text-secondary">${moment(record.scheduledStart).format('h:mm A')} - ${moment(record.scheduledEnd).format('h:mm A')}</span><br />
                                  <span class="text-primary">${tempStart} - ${tempEnd}</span>
                                  ${record.missedIDs > 0 ? `<br /><span class="text-primary">⚠Missed IDs: ${record.missedIDs}</span>` : ``}
                              </div>
                              <div class="col-2">
                                  <button type="button" id="dj-show-logs-${record.ID}" class="close dj-show-logs" aria-label="Show Log" title="View the logs for this show">
                  <span aria-hidden="true"><i class="fas fa-file text-dark"></i></span>
                  </button>
                              </div>
                          </div></div>`
              } else {
                newAtt += `<div class="row card mb-4 py-3 border-left-success" title="You went on the air during your scheduled time.">
                              <div class="card-body">
                              <div class="col-2 text-danger">
                                  ${moment(theDate).format('MM/DD/YYYY')}
                              </div>
                              <div class="col-4 text-info">
                                  ${record.event}
                              </div>
                              <div class="col-4">
                                  <span class="text-secondary">${moment(record.scheduledStart).format('h:mm A')} - ${moment(record.scheduledEnd).format('h:mm A')}</span><br />
                                  <span class="text-primary">${moment(record.actualStart).format('h:mm A')} - ${record.actualEnd !== null ? moment(record.actualEnd).format('h:mm A') : `ONGOING`}</span>
                                  ${record.missedIDs > 0 ? `<br /><span class="text-primary">⚠Missed IDs: ${record.missedIDs}</span>` : ``}
                              </div>
                              <div class="col-2">
                                  <button type="button" id="dj-show-logs-${record.ID}" class="close dj-show-logs" aria-label="Show Log" title="View the logs for this show">
                  <span aria-hidden="true"><i class="fas fa-file text-dark"></i></span>
                  </button>
                              </div>
                          </div></div>`
              }
            } else if (record.actualStart !== null && record.actualEnd === null) {
              newAtt += `<div class="row card mb-4 py-3 border-left-primary" title="This show is still on the air.">
                              <div class="card-body">
                              <div class="col-2 text-danger">
                                  ${moment(theDate).format('MM/DD/YYYY')}
                              </div>
                              <div class="col-4 text-info">
                                  ${record.event}
                              </div>
                              <div class="col-4">
                                  <span class="text-secondary">${moment(record.scheduledStart).format('h:mm A')} - ${moment(record.scheduledEnd).format('h:mm A')}</span><br />
                                  <span class="text-primary">${moment(record.actualStart).format('h:mm A')} - ${record.actualEnd !== null ? moment(record.actualEnd).format('h:mm A') : `ONGOING`}</span>
                                  ${record.missedIDs > 0 ? `<br /><span class="text-primary">⚠Missed IDs: ${record.missedIDs}</span>` : ``}
                              </div>
                              <div class="col-2">
                                  <button type="button" id="dj-show-logs-${record.ID}" class="close dj-show-logs" aria-label="Show Log" title="View the logs for this show">
                  <span aria-hidden="true"><i class="fas fa-file text-dark"></i></span>
                  </button>
                              </div>
                          </div></div>`
            } else if (record.happened === 0) {
              newAtt += `<div class="row card mb-4 py-3 border-left-danger" title="You were scheduled to be on the air, but failed to do your show.">
                              <div class="card-body">
                              <div class="col-2 text-danger">
                                  ${moment(theDate).format('MM/DD/YYYY')}
                              </div>
                              <div class="col-4 text-info">
                                  ${record.event}
                              </div>
                              <div class="col-4">
                                  <span class="text-secondary">${moment(record.scheduledStart).format('h:mm A')} - ${moment(record.scheduledEnd).format('h:mm A')}</span><br />
                                  <span class="text-primary">NO-SHOW / ABSENT</span>
                              </div>
                              <div class="col-2">                        
                              </div>
                          </div></div>`
            } else if (record.happened === -1) {
              newAtt += `<div class="row card mb-4 py-3 border-left-info" title="This show was canceled ahead of time.">
                              <div class="card-body">
                              <div class="col-2 text-danger">
                                  ${moment(theDate).format('MM/DD/YYYY')}
                              </div>
                              <div class="col-4 text-info">
                                  ${record.event}
                              </div>
                              <div class="col-4">
                                  <span class="text-secondary">${moment(record.scheduledStart).format('h:mm A')} - ${moment(record.scheduledEnd).format('h:mm A')}</span><br />
                                  <span class="text-primary">CANCELED</span>
                              </div>
                              <div class="col-2">
                              </div>
                          </div></div>`
            } else {
              newAtt += `<div class="row card mb-4 py-3 border-left-primary" title="This show has not yet started">
                              <div class="card-body">
                              <div class="col-2 text-danger">
                                  ${moment(theDate).format('MM/DD/YYYY')}
                              </div>
                              <div class="col-4 text-info">
                                  ${record.event}
                              </div>
                              <div class="col-4">
                                  <span class="text-secondary">${moment(record.scheduledStart).format('h:mm A')} - ${moment(record.scheduledEnd).format('h:mm A')}</span><br />
                                  <span class="text-primary">NOT YET STARTED</span>
                              </div>
                              <div class="col-2">
                              </div>
                          </div></div>`
            }
          })
          temp.innerHTML = newAtt

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
                y: { label: { text: 'Total Listener Hours' }, autoScale: true, nice: true },
                x: { label: { text: 'Show Time' }, autoScale: true, nice: false },
                interpolate: 'step-after',
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
                      label: 'Show Time',
                      format: function (n) {
                        return moment(n).format('LT')
                      }
                    },
                    y: {
                      label: 'Total Listener Hours',
                      format: function (n) {
                        return n
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
