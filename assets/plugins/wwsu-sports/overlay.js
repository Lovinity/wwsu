/* global $, WWSUdb, TAFFY, WWSUreq */

// Define the animate.css JQuery function
$.fn.extend({
  animateCss: function (animationName, callback) {
    var animationEnd = (function (el) {
      var animations = {
        animation: 'animationend',
        OAnimation: 'oAnimationEnd',
        MozAnimation: 'mozAnimationEnd',
        WebkitAnimation: 'webkitAnimationEnd'
      }

      for (var t in animations) {
        if (el.style[t] !== undefined) {
          return animations[t]
        }
      }
    })(document.createElement('div'))

    this.addClass('animated ' + animationName).one(animationEnd, function () {
      $(this).removeClass('animated ' + animationName)

      if (typeof callback === 'function') { return callback() }
    })

    return this
  }
})

// Define the scoreboard class
class Scoreboard {

  /**
   * Create the scoreboard class.
   * 
   * @param {string} main DOM query string of the entire scoreboard
   * @param {string} wsuScore DOM query string of WSU's score
   * @param {string} oppScore DOM query string of opponent's score
   * @param {string} wsuNum DOM query string of secondary info number for WSU (eg. number of fouls / timeouts etc)
   * @param {string} oppNum DOM query string of secondary info number for opponent
   * @param {string} wsuText DOM query string of secondary info text for WSU
   * @param {string} oppText DOM query string of secondary info text for opponent
   */
  constructor (main, wsuScore, oppScore, wsuNum, oppNum, wsuText, oppText) {
    this.ID = Math.floor(1000000 + (Math.random() * 1000000))
    this._main = main
    this._wsuScore = wsuScore
    this._wsuScoreValue = 0
    this._oppScore = oppScore
    this._oppScoreValue = 0
    this._wsuNum = wsuNum
    this._wsuNumValue = null
    this._oppNum = oppNum
    this._oppNumValue = null
    this._wsuText = wsuText
    this._wsuTextValue = null
    this._oppText = oppText
    this._oppTextValue = null
  }

  /**
   * Fade the scoreboard out
   */
  hide () {
    $(this._main).fadeTo(500, 0)
  }

  /**
   * Fade the scoreboard in
   */
  show () {
    $(this._main).fadeTo(500, 1)
  }

  /**
   * Sets WSU's score. Also flashes the number if the score increased via animate.css.
   * @param {string|number} value New score
   */
  set wsuScore (value) {
    var temp = document.querySelector(this._wsuScore)
    if (temp !== null) {
      temp.innerHTML = value
      if (value === null || value === ``) { $(this._wsuScore).fadeTo(500, 0) }
      if (value !== null && value !== `` && (this._wsuScoreValue === null || this._wsuScoreValue === ``)) { $(this._wsuScore).fadeTo(500, 1) }
      if (value > this._wsuScoreValue) { $(this._wsuScore).animateCss('heartBeat slower') }
    }
    this._wsuScoreValue = value
  }

  /**
   * Sets opponent's score. Also flashes the number if the score increased via animate.css.
   * @param {string|number} value New score
   */
  set oppScore (value) {
    var temp = document.querySelector(this._oppScore)
    if (temp !== null) {
      temp.innerHTML = value
      if (value === null || value === ``) { $(this._oppScore).fadeTo(500, 0) }
      if (value !== null && value !== `` && (this._oppScoreValue === null || this._oppScoreValue === ``)) { $(this._oppScore).fadeTo(500, 1) }
      if (value > this._oppScoreValue) { $(this._oppScore).animateCss('heartBeat slower') }
    }
    this._oppScoreValue = value
  }

  /**
   * Sets WSU's secondary info number. Also does fading via animate.css.
   * @param {?string|number} value New number. Null or empty hides it.
   */
  set wsuNum (value) {
    var temp = document.querySelector(this._wsuNum)
    if (temp !== null) {
      var _this = this
      $(this._wsuNum).fadeTo(500, 0, () => {
        temp.innerHTML = value
        if (value !== null && value !== ``) { $(_this._wsuNum).fadeTo(500, 1) }
      })
    }
    this._wsuNumValue = value
  }

  /**
   * Sets opponent's secondary info number. Also does fading via animate.css.
   * @param {?string|number} value New number. Null or empty hides it.
   */
  set oppNum (value) {
    var temp = document.querySelector(this._oppNum)
    if (temp !== null) {
      var _this = this
      $(this._oppNum).fadeTo(500, 0, () => {
        temp.innerHTML = value
        if (value !== null && value !== ``) { $(_this._oppNum).fadeTo(500, 1) }
      })
    }
    this._oppNumValue = value
  }

  /**
   * Sets WSU's secondary info text. Also does fading via animate.css.
   * @param {?string} value Text to show. Null or empty hides it.
   */
  set wsuText (value) {
    var temp = document.querySelector(this._wsuText)
    if (temp !== null) {
      var _this = this
      $(this._wsuText).fadeTo(500, 0, () => {
        temp.innerHTML = value
        if (value !== null && value !== ``) { $(_this._wsuText).fadeTo(500, 1) }
      })
    }
    this._wsuTextValue = value
  }

  /**
   * Sets opponent's secondary info text. Also does fading via animate.css.
   * @param {?string} value Text to show. Null or empty hides it.
   */
  set oppText (value) {
    var temp = document.querySelector(this._oppText)
    if (temp !== null) {
      var _this = this
      $(this._oppText).fadeTo(500, 0, () => {
        temp.innerHTML = value
        if (value !== null && value !== ``) { $(_this._oppText).fadeTo(500, 1) }
      })
    }
    this._oppTextValue = value
  }

  /**
   * Hides all secondary text and numbers.
   */
  hideTextNums () {
    $(this._wsuNum).fadeTo(500, 0)
    $(this._oppNum).fadeTo(500, 0)
    $(this._wsuText).fadeTo(500, 0)
    $(this._oppText).fadeTo(500, 0)
  }
}

// Create a new scoreboard class
var scoreboard = new Scoreboard('#scoreboard', '#score-wsu', '#score-opp', '#num-wsu', '#num-opp', '#text-wsu', '#text-opp')

// Make a WWSUdb for the sports information
var sportsdb = new WWSUdb(TAFFY())

var changeData = (data) => {
  console.dir(data)
  switch (data.name) {
    case `wsuScore`:
      scoreboard.wsuScore = data.value
      break
    case `oppScore`:
      scoreboard.oppScore = data.value
      break
    case `wsuNum`:
      scoreboard.wsuNum = data.value
      break
    case `oppNum`:
      scoreboard.oppNum = data.value
      break
    case `wsuText`:
      scoreboard.wsuText = data.value
      break
    case `oppText`:
      scoreboard.oppText = data.value
      break
    case `scoreboardVisible`:
      if (data.value && data.value !== 0) {
        scoreboard.show()
      } else {
        scoreboard.hide()
      }
      break
  }
}

sportsdb.setOnInsert((data) => {
  changeData(data)
})

sportsdb.setOnUpdate((data) => {
  changeData(data)
})

sportsdb.setOnReplace((db) => {
  db.each((record) => {
    changeData(record)
  })
})

var socket = io.sails.connect()

var noReq = new WWSUreq(socket, null)

socket.on('connect', () => {
  sportsdb.replaceData(noReq, '/sports/get')
})

socket.on('disconnect', () => {
  console.log('Lost connection')
  try {
    socket._raw.io._reconnection = true
    socket._raw.io._reconnectionAttempts = Infinity
  } catch (e) {
    console.error(e)
  }
})

sportsdb.assignSocketEvent('sports', socket)
