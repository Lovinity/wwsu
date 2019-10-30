module.exports = {

  friendlyName: 'test / add-underwritings',

  description: 'test / add-underwritings test.',

  inputs: {

  },

  fn: async function () {

    try {
      // Initialize variables for storing issues encountered with the underwritings
      var returnData = { underwritings: [] }
      var veryBad = []
      var bad = []

      // Calculate number of queueUnderwritings breaks in an hour
      var x = 0
      for (var minute in sails.config.custom.breaks) {
        if (Object.prototype.hasOwnProperty.call(sails.config.custom.breaks, minute)) {
          if (sails.config.custom.breaks[ minute ].length > 0) {
            sails.config.custom.breaks[ minute ].map((task) => {
              if (task && task !== null && task.task === `queueUnderwritings` && task.quantity > 0) { x++ }
            })
          }
        }
      }

      // If there are no queueUnderwritings breaks, this is an error! Bail.
      if (x === 0) {
        //await sails.helpers.status.change.with({ name: 'underwritings', label: 'Underwritings', data: `Underwritings are not airing; There are no queueUnderwritings tasks in clockwheel breaks with a quantity greater than 0. Please add a queueUnderwritings task to at least one of the clockwheel breaks in the server configuration. You can do this in DJ Controls under admin menu -> Server Configuration -> Breaks - Hourly`, status: 1 })
        return exits.success('No queueUnderwritings')
      }

      // Load all underwritings from memory
      var underwritings = await sails.models.underwritings.find()
      sails.log.debug(`Fetched underwritings.`)
      if (underwritings.length > 0) {
        sails.log.debug(`Received more than 0 underwritings.`)
        var toQueue = []

        // Calculate online listener time statistics
        var records = await sails.models.attendance.find({ showTime: { '!=': null }, listenerMinutes: { '!=': null }, createdAt: { '>=': moment().subtract(7, 'days').toISOString(true) } })
        var peak = 0
        var showTime = 0
        var listenerMinutes = 0

        if (records.length > 0) {
          records.map((record) => {
            if (record.showTime > 0 && record.listenerMinutes / record.showTime > peak) { peak = record.listenerMinutes / record.showTime }
            showTime += record.showTime
            listenerMinutes += record.listenerMinutes
          })
        }

        var avgListeners = (showTime > 0 ? listenerMinutes / showTime : 0)
        var listenerFactor = (avgListeners + peak) / 2

        sails.log.debug(`avgListeners: ${avgListeners}`)
        sails.log.debug(`listenerFactor: ${listenerFactor}`)

        returnData.avgListeners = avgListeners
        returnData.listenerFactor = listenerFactor

        // Set up other variables that do not need re-loading on each underwriting check

        // For "now", add 10 minutes because top of the hour ID breaks may queue up to 10 minutes early.
        var now = moment().add(10, 'minutes').toISOString(true)

        sails.log.debug(`Now time: ${now}`)

        var c = sails.models.listeners.memory.listeners

        returnData.listenersC = c

        // Go through every underwriting in the system
        var maps = underwritings.map(async (underwriting, index) => {
          sails.log.debug(`Beginning underwriting ${underwriting.ID}`)
          // Load in the RadioDJ track pertaining to this underwriting
          var song = await sails.models.songs.findOne({ ID: underwriting.trackID })
          if (song) {
            sails.log.debug(`Underwriting ${underwriting.ID}: Found song.`)

            // Ignore this underwriting if the associated track is expired or disabled
            if (song.enabled === 1 && moment(song.start_date).isSameOrBefore(moment()) && (moment(song.end_date).isSameOrBefore(moment('2002-01-02 00:00:02')) || moment().isBefore(moment(song.end_date))) && (song.play_limit === 0 || song.count_played < song.play_limit)) {
              sails.log.debug(`Underwriting ${underwriting.ID}: Track enabled.`)
              returnData.underwritings[ index ] = { name: underwriting.name }

              // We want to calculate how many breaks the underwriting will go through in a week
              var underwritingBreaks = 0

              // The "minute" portion of every underwriting schedule should correspond with the clockwheel breaks
              if (underwriting.mode.schedule.schedules !== null) {
                underwriting.mode.schedule.schedules.map((schedule, index) => {
                  if (typeof underwriting.mode.schedule.schedules[ index ].m === `undefined`) { underwriting.mode.schedule.schedules[ index ].m = [] }
                  for (var minute in sails.config.custom.breaks) {
                    if (Object.prototype.hasOwnProperty.call(sails.config.custom.breaks, minute)) {
                      underwriting.mode.schedule.schedules[ index ].m.push(minute)
                    }
                  }

                  // Calculate number of underwriting breaks given the date/time filters
                  if (typeof underwriting.mode.schedule.schedules[ index ].dw === `undefined`) {
                    underwritingBreaks = (typeof underwriting.mode.schedule.schedules[ index ].h !== 'undefined' && underwriting.mode.schedule.schedules[ index ].h.length > 0 ? underwriting.mode.schedule.schedules[ index ].h.length : 24) * x * 7
                  } else {
                    underwritingBreaks = (typeof underwriting.mode.schedule.schedules[ index ].h !== 'undefined' && underwriting.mode.schedule.schedules[ index ].h.length > 0 ? underwriting.mode.schedule.schedules[ index ].h.length : 24) * x * (underwriting.mode.schedule.schedules[ index ].dw.length > 0 ? underwriting.mode.schedule.schedules[ index ].dw : 7)
                  }
                })
              }

              // If the schedules portion is empty array, then every hour of every day in the week will have a break.
              // If it is null, then there are no breaks.
              if (underwriting.mode.schedule.schedules !== null && underwriting.mode.schedule.schedules.length === 0) {
                underwritingBreaks = x * 24 * 7
              } else if (underwriting.mode.schedule.schedules === null) {
                underwritingBreaks = 0
              }

              // Calculate average number of hourly breaks based off of date/time filters
              underwritingBreaks = underwritingBreaks / (24 * 7)

              // Decrease the number if there are show filters based off of 2 hours per week per show (average show time for each show).
              // Average breaks per hour for shows is assumed to be 2 (top and bottom of the hour).
              if (typeof underwriting.mode.show !== 'undefined' && underwriting.mode.show.length > 0) {
                var showBreaks = (underwriting.mode.show.length * 2 * 7 * 2) / (7 * 24 * 2)
                underwritingBreaks = underwritingBreaks * showBreaks
              }

              returnData.underwritings[ index ].underwritingBreaks = underwritingBreaks

              // every scheduleForced should have "minute" set to 0 and only 0
              if (underwriting.mode.scheduleForced.schedules !== null) {
                underwriting.mode.scheduleForced.schedules.map((schedule, index) => {
                  underwriting.mode.scheduleForced.schedules[ index ].m = [ 0 ]
                })
              }

              // Skip this underwriting if it contains any show filters, and none of them are on the air right now.
              if (typeof underwriting.mode.show === `undefined` || underwriting.mode.show.length === 0 || underwriting.mode.show.indexOf(sails.models.meta.memory.show) !== -1) {
                // Determine the next date/time this underwriting is allowed to queue.
                if (underwriting.mode.schedule.schedules !== null) {
                  var schedule = later.schedule(underwriting.mode.schedule)
                  var start = moment(song.date_played).toISOString(false)
                  var next = moment(schedule.next(1, start)).toISOString(false)
                } else {
                  var schedule = null
                  var start = null
                  var next = null
                }
                if (underwriting.mode.scheduleForced.schedules !== null) {
                  var scheduleF = later.schedule(underwriting.mode.scheduleForced)
                  var startF = moment(song.date_played).toISOString(false)
                  var nextF = moment(scheduleF.next(1, startF)).toISOString(false)
                } else {
                  var scheduleF = null
                  var startF = null
                  var nextF = null
                }

                if (next === null && nextF === null) {
                }

                sails.log.debug(`Underwriting ${underwriting.ID}: Next date/time queue: ${next}. Next forced date/time queue: ${nextF}`)
                returnData.underwritings[ index ].nextQueue = `Next date/time queue: ${next}. Next forced date/time queue: ${nextF}`

                var ffQueue = false
                var w = underwriting.weight / 100
                var a = song.play_limit
                var b = song.count_played
                var chance = 0

                // If end date and spin counts are set, use advanced algorithms to ensure all airs complete on time.
                if (moment(song.end_date).isAfter(moment('2002-01-01 00:00:01')) && song.play_limit > 0) {
                  returnData.underwritings[ index ].algorithm = `Advanced (date + spins)`
                  var y1 = moment(song.start_date).isAfter(moment('2002-01-01 00:00:01')) ? song.start_date : underwriting.createdAt
                  returnData.underwritings[ index ].startY1 = y1
                  var y2 = moment(song.end_date).diff(moment(y1))
                  returnData.underwritings[ index ].endY2 = y2
                  var y = (y2 / 1000 / 60 / 60) * underwritingBreaks
                  returnData.underwritings[ index ].expectedBreaksY = y
                  var z1 = moment(song.end_date).diff(moment())
                  returnData.underwritings[ index ].timeLeftZ1 = z1
                  var z = (z1 / 1000 / 60 / 60) * underwritingBreaks
                  returnData.underwritings[ index ].remainingBreaksZ = z

                  sails.log.debug(`Underwriting ${underwriting.ID}: End date and spin counts set. Using algorithm.`)
                  var d = b / a // Percent of spin counts aired
                  returnData.underwritings[ index ].spinCountPercentAiredD = d
                  sails.log.debug(`Underwriting ${underwriting.ID}: percent spin counts: ${d}.`)
                  var e = y > 0 ? (y - z) / y : 1 // percent of expected breaks completed
                  returnData.underwritings[ index ].expectedBreaksPercentPassedE = e
                  sails.log.debug(`Underwriting ${underwriting.ID}: percent expected breaks completed: ${e}.`)
                  var f = (e - ((1 - e) / 2)) // F factor
                  returnData.underwritings[ index ].FFactor = f
                  sails.log.debug(`Underwriting ${underwriting.ID}: F factor: ${f}.`)
                  var g = z > 0 ? (a - b) / z : 0 // Number of airs per clockwheel break required to satisfy the underwriting's requirements.
                  returnData.underwritings[ index ].airsPerBreakRequiredG = g
                  sails.log.debug(`Underwriting ${underwriting.ID}: Airs per clockwheel break required: ${g}.`)

                  var g2 = g

                  // Multiply d and g by 0.5 if we are not scheduled to air within the next hour
                  if ((next === null || moment(next).isAfter(moment(now).add(1, 'hours'))) && (nextF === null || moment(nextF).isAfter(moment(now).add(1, 'hours')))) {
                    d = d * 0.5
                    g2 = g * 0.5
                    returnData.underwritings[ index ].DandGHalved = true
                  }

                  if (g2 >= 1) {
                    returnData.underwritings[ index ].fastForwardQueueOnFastForwardOnly = true
                    sails.log.debug(`Underwriting ${underwriting.ID}: Fast-forward queue activated.`)
                    ffQueue = true
                  } else if (d <= f) {
                    returnData.underwritings[ index ].fastForwardQueueWithoutFastForwardOnly = true
                    sails.log.debug(`Underwriting ${underwriting.ID}: Fast-forward queue activated.`)
                    ffQueue = true
                  }
                  if (g2 < 1 || d > f) {
                    // For non fast forwarding queues, check to see if a forced queue is necessary

                    sails.log.debug(`Underwriting ${underwriting.ID}: Next forced queue: ${nextF}`)

                    if (nextF !== null && underwriting.mode.scheduleForced.schedules.length > 0 && moment(nextF).isSameOrBefore(moment(now)) && !ffQueue) {
                      sails.log.debug(`Underwriting ${underwriting.ID}: Forced queue activated.`)
                      returnData.underwritings[ index ].forcedQueue = true
                      ffQueue = true
                    } else {
                      var h = g * (1 - (d - f)) // The further the underwriting is from being significantly behind schedule, the more we should reduce the percentile.
                      returnData.underwritings[ index ].scheduleReductionH = h
                      chance = h

                      // If mode = 1, then account online listeners in the algorithm
                      if (underwriting.mode.mode === 1) {
                        // If there are less than average number of listeners connected, decrease chance by a max of 50% of itself.
                        if (c < avgListeners) {
                          returnData.underwritings[ index ].listenerChanceReduction = avgListeners > 0 ? ((chance / 2) * ((avgListeners - c) / avgListeners)) : 0
                          chance -= avgListeners > 0 ? ((chance / 2) * ((avgListeners - c) / avgListeners)) : 0
                          // Otherwise, add chance to itself for every listenerFactor number of listeners connected.
                        } else {
                          returnData.underwritings[ index ].listenerChanceAddition = listenerFactor > 0 ? chance + (chance * (c / listenerFactor)) : chance
                          chance = listenerFactor > 0 ? chance + (chance * (c / listenerFactor)) : chance
                        }
                      }

                      sails.log.debug(`Underwriting ${underwriting.ID}: Chance is ${chance}`)
                      returnData.underwritings[ index ].chance = chance

                      // If the next recurrence is before the current time and the track was not already fast-forward queued, and randomness satisfies chance, then the underwriting needs to be played.
                      if (next !== null && moment(next).isSameOrBefore(moment(now)) && !ffQueue && Math.random() < chance) {
                        sails.log.debug(`Underwriting ${underwriting.ID}: Regular queue activated.`)
                        returnData.underwritings[ index ].regularQueue = g || (x > 0 ? (1 / x) : 1)
                      } else {
                        sails.log.debug(`Underwriting ${underwriting.ID}: Skipped; chance condition not met for this break.`)
                        returnData.underwritings[ index ].noQueue = true
                      }
                    }
                  }
                  // All other conditions
                } else {

                  if (nextF !== null && underwriting.mode.scheduleForced.schedules.length > 0 && moment(nextF).isSameOrBefore(moment(now)) && !ffQueue) {
                    sails.log.debug(`Underwriting ${underwriting.ID}: Forced queue activated.`)
                    returnData.underwritings[ index ].forcedQueue = true
                    ffQueue = true
                  } else {
                    // Count the number of breaks in a week selected in the schedule
                    var total = 0
                    if (underwriting.mode.schedule.schedules !== null && underwriting.mode.schedule.schedules.length > 0) {
                      underwriting.mode.schedule.schedules.map((schedule) => {
                        var dws = 0
                        var hs = 0
                        var ms = 0
                        if (typeof schedule.dw === `undefined` || schedule.dw.length === 0) {
                          dws = 7
                        } else {
                          dws = schedule.dw.length
                        }

                        if (typeof schedule.h === `undefined` || schedule.h.length === 0) {
                          hs = 24
                        } else {
                          hs = schedule.h.length
                        }

                        if (typeof schedule.m === `undefined` || schedule.m.length === 0) {
                          ms = x
                        } else {
                          ms = schedule.m.length
                        }

                        total += (dws * hs * ms)
                      })
                    } else if (underwriting.mode.schedule.schedules !== null) {
                      total = (7 * 24 * x)
                    } else {
                      total = 0
                    }

                    // Divide by 7 to get average breaks in a day
                    total = total / 7

                    // Use a different algorithm if show filters are specified; based off of an average show length of 2 hours.
                    if (typeof underwriting.mode.show !== `undefined` && underwriting.mode.show.length > 0) {
                      total = ((2 * 2) * underwriting.mode.show.length) / 7
                    }

                    returnData.underwritings[ index ].breaksPerDay = total

                    sails.log.debug(`Underwriting ${underwriting.ID}: average breaks in a day is ${total}.`)

                    var v = moment(song.end_date).isAfter(moment('2002-01-01 00:00:01'))

                    // Initial chance: 2x % of breaks in a day (4x if end date is set) for one break.
                    // We want to average 2 airs per day, 4 if end date is set, for tracks with no spin limit.
                    chance = v ? (total > 0 ? 1 / (total / 4) : 0) : (total > 0 ? 1 / (total / 2) : 0)
                    returnData.underwritings[ index ].initialChance = chance

                    sails.log.debug(`Underwriting ${underwriting.ID}: Initial chance is ${chance}.`)

                    // If mode = 1, then account online listeners in the algorithm
                    if (underwriting.mode.mode === 1) {
                      // If there are less than average number of listeners connected, decrease chance by a max of 50% of itself.
                      if (c < avgListeners) {
                        returnData.underwritings[ index ].listenerChanceReduction = avgListeners > 0 ? ((chance / 2) * ((avgListeners - c) / avgListeners)) : 0
                        chance -= avgListeners > 0 ? ((chance / 2) * ((avgListeners - c) / avgListeners)) : 0
                        // Otherwise, add chance to itself for every listenerFactor number of listeners connected.
                      } else {
                        returnData.underwritings[ index ].listenerChanceAddition = listenerFactor > 0 ? chance + (chance * (c / listenerFactor)) : chance
                        chance = listenerFactor > 0 ? chance + (chance * (c / listenerFactor)) : chance
                      }
                    }

                    // Weight chance by track priority. 0.5 = chance. 1 = double chance. 0 = 1/2 chance.
                    if (w > 0.5) { chance = chance + (chance * ((w - 0.5) * 2)) }
                    if (w < 0.5) { chance = chance / (1 + ((0.5 - w) * 2)) }

                    returnData.underwritings[ index ].priorityW = w
                    returnData.underwritings[ index ].chance = chance

                    sails.log.debug(`Underwriting ${underwriting.ID}: Final chance is ${chance}`)

                    // Determine if we are to queue. If so, priority of queue is based on number of potential queues today
                    if (next !== null && moment(next).isSameOrBefore(moment(now)) && !ffQueue && Math.random() < chance) {
                      sails.log.debug(`Underwriting ${underwriting.ID}: Regular queue.`)
                      returnData.underwritings[ index ].regularQueue = total > 0 && x > 0 ? 1 / (total / x) : 0
                    } else {
                      returnData.underwritings[ index ].noQueue = true
                      sails.log.debug(`Underwriting ${underwriting.ID}: Skipped; chance condition not met for this break.`)
                    }
                  }
                }
              }
            } else if (moment(song.end_date).isAfter(moment('2002-01-02 00:00:01')) && moment().isSameOrAfter(moment(song.end_date)) && song.play_limit > 0 && song.count_played < song.play_limit) {
              sails.log.debug(`Underwriting ${underwriting.ID}: Track disabled / expired and failed spin counts.`)
              returnData.underwritings[ index ] = `${underwriting.name}: Track Disabled / Expired AND failed spin counts`
            } else {
              sails.log.debug(`Underwriting ${underwriting.ID}: Track disabled / expired.`)
              returnData.underwritings[ index ] = `${underwriting.name}: Track Disabled / Expired`
            }
          } else {
            sails.log.debug(`Underwriting ${underwriting.ID}: Did NOT find song.`)
            returnData.underwritings[ index ] = `${underwriting.name}: Track not found`
          }
        })

        await Promise.all(maps)

        return exits.success(returnData)
      } else {
        return exits.success('No underwritings')
      }
    } catch (e) {
      return exits.error(e)
    }

  }

}
