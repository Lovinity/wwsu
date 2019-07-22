/* global iziToast, moment */

/**
 * WWSUdb manages data from the WWSU websockets
 *
 * @class WWSUdb
 */
class WWSUdb {
  /**
     *Creates an instance of WWSUdb.
     * @param {TAFFYDB} db A TAFFYDB instance to use for this database
     * @memberof WWSUdb
     */

  constructor (db) {
    this._db = db

    this.onInsert = () => {
    }
    this.onUpdate = () => {
    }
    this.onRemove = () => {
    }
    this.onReplace = () => {
    }
  }

  /**
     * Return the TAFFYDB associated with this member.
     *
     * @readonly
     * @memberof WWSUdb
     */
  get db () {
    return this._db
  }

  /**
     * Sets a function to execute when a record is inserted via query
     *
     * @param {function} fn Function to execute whenever a record is inserted. First parameter is the record inserted. Second parameter is all the records in the database.
     * @memberof WWSUdb
     */
  setOnInsert (fn) {
    this.onInsert = fn
  }

  /**
     * Sets a function to execute when a record is updated via query.
     *
     * @param {function} fn Function to execute when a record is updated. First parameter is the updated record. Second parameter is all the records in the database.
     * @memberof WWSUdb
     */
  setOnUpdate (fn) {
    this.onUpdate = fn
  }

  /**
     * Sets a function to execute when a record is removed via query.
     *
     * @param {function} fn Function to execute when a record is removed. First parameter is the ID of the removed record. Second parameter is all the records in the database.
     * @memberof WWSUdb
     */
  setOnRemove (fn) {
    this.onRemove = fn
  }

  /**
     * Sets a function to execute when the data in the database is replaced via query with replace = true, or replaceData.
     *
     * @param {function} fn Function to execute when the database is replaced. Parameter is all the records in the database.
     * @memberof WWSUdb
     */
  setOnReplace (fn) {
    this.onReplace = fn
  }

  /**
     * Execute a query on the database.
     *
     * @param {Array || Object} query An array of records to replace in the database (if replace = true), or a query object {insert || update: {record object}} or {remove: record ID}.
     * @param {boolean} [replace=false] If true, this query will replace everything in the TAFFY database.
     * @memberof WWSUdb
     */
  query (query, replace = false) {
    if (replace) {
      if (query.constructor === Array) {
        this._db().remove()
        this._db.insert(query)
        this.onReplace(this._db())
      }
      return null
    } else {
      for (var key in query) {
        if (query.hasOwnProperty(key)) {
          switch (key) {
            case `insert`:
              this._db.insert(query[key])
              this.onInsert(query[key], this._db())
              break
            case `update`:
              this._db({ ID: query[key].ID }).update(query[key])
              this.onUpdate(query[key], this._db())
              break
            case `remove`:
              this._db({ ID: query[key] }).remove()
              this.onRemove(query[key], this._db())
              break
          }
        }
      }
    }
  }

  // Make a call to the WWSU API, and replace all the data in this database with what the API returns
  // WWSUreq is a WWSUreq class to use to make the request. path is the URL to call. Data is an optional object of parameters to pass to the API request.
  replaceData (WWSUreq, path, data = {}) {
    try {
      WWSUreq.request({ method: `POST`, url: path, data: data }, (body) => {
        this.query(body, true)
      })
    } catch (e) {
      console.error(e)
    }
  }

  // Assign a socket event to this database. The socket should return data following the standards specified in the query function's query parameter,
  // except replaceData should be used instead when replacing the data in the entire database.
  assignSocketEvent (event, socket) {
    socket.on(event, (data) => {
      this.query(data, false)
    })
  }
}

// Class for managing requests and authorization to WWSU's API
class WWSUreq {
  constructor (socket, host, usernameField = null, authPath = null, authName = null) {
    this.socket = socket
    this.host = host
    this.authPath = authPath
    this.authName = authName
    this.usernameField = usernameField

    // Storing authorization tokens in memory
    this._token = null
    this._time = null
    this._expiration = null
  }

  get token () {
    return this._token
  }

  set token (value) {
    this._token = value
  }

  get time () {
    return this._time
  }

  set time (value) {
    this._time = value
  }

  get expiration () {
    return this._expiration
  }

  set expiration (value) {
    this._expiration = value
  }

  // Is the current token expected to be expired?
  expired () {
    return this._token === null || moment().isAfter(moment(this.time).add(this.expiration - 1000, `milliseconds`))
  }

  // Request with authorization
  request (opts, cb) {
    // Called after logging in and getting a token
    var step2 = (username, password) => {
      this._authorize(username, password, (token) => {
        if (token === 0) {
          iziToast.show({
            titleColor: `#000000`,
            messageColor: `#000000`,
            color: `red`,
            close: true,
            overlay: true,
            overlayColor: `rgba(0, 0, 0, 0.75)`,
            zindex: 100,
            layout: 1,
            imageWidth: 100,
            image: ``,
            progressBarColor: `rgba(255, 0, 0, 0.5)`,
            closeOnClick: true,
            position: `center`,
            timeout: 30000,
            title: `Error authorizing`,
            message: `There was a technical error trying to authorize. Please contact the developers or try again later.`
          })
        } else if (typeof token.errToken !== `undefined` || typeof token.token === `undefined`) {
          iziToast.show({
            titleColor: `#000000`,
            messageColor: `#000000`,
            color: `red`,
            close: true,
            overlay: true,
            overlayColor: `rgba(0, 0, 0, 0.75)`,
            zindex: 100,
            layout: 1,
            imageWidth: 100,
            image: ``,
            progressBarColor: `rgba(255, 0, 0, 0.5)`,
            closeOnClick: true,
            position: `center`,
            timeout: 30000,
            title: `Access denied`,
            message: `${typeof token.errToken !== `undefined` ? `Failed to authenticate; please try again. ${token.errToken}` : `Failed to authenticate; unknown error.`}`
          })
        } else {
          this._tryRequest(opts, (body2) => {
            cb(body2)
          })
        }
      })
    }

    // Token expected to be expired?
    if (this.expired()) {
      // If /auth/host, we don't need to prompt for login; authenticate by host
      if (this.authPath === `/auth/host`) {
        step2(this.host, null)
        // If auth path is null, this request doesn't need authentication; proceed with the request immediately
      } else if (this.authPath === null) {
        this._tryRequest(opts, (body2) => {
          cb(body2)
        })
        // Otherwise, prompt for a login
      } else {
        this._promptLogin(opts, (username, password) => step2(username, password))
      }

      // Otherwise, try the request, and for safe measures, prompt for login if we end up getting an auth error
    } else {
      this._tryRequest(opts, (body) => {
        if (body === -1) {
          if (this.authPath !== `/auth/host`) {
            this.token = null
            this._promptLogin(opts, (username, password) => step2(username, password))
          } else {
            step2(this.host, null)
          }
        } else if (body !== 0) {
          // eslint-disable-next-line callback-return
          cb(body)
        }
      })
    }
  }

  // Helper function for trying a request with authorization. cb passes 0 if no body is returned or an error is thrown, -1 if tokenErr is given, and body otherwise.
  _tryRequest (opts, cb) {
    try {
      if (this.authPath !== null) {
        if (typeof opts.headers === `undefined`) {
          opts.headers = {
            Authorization: `Bearer ` + this.token
          }
        } else {
          opts.headers[`Authorization`] = `Bearer ` + this.token
        }
      }

      this.socket.request(opts, (body) => {
        if (!body) {
          // eslint-disable-next-line callback-return
          cb(0)
        } else if (typeof body.tokenErr !== `undefined`) {
          // eslint-disable-next-line callback-return
          cb(-1)
        } else {
          // eslint-disable-next-line callback-return
          cb(body)
        }
      })
    } catch (unusedE) {
      // eslint-disable-next-line callback-return
      cb(0)
    }
  }

  // Helper. Attempt to log in and get a token. cb passes 0 for errors and body on success. Also stores token/expiration in memory so we don't have to
  // authorize again until the token expires.
  _authorize (username, password, cb) {
    try {
      this.socket.request({ method: `POST`, url: this.authPath, data: { username: username, password: password } }, (body) => {
        if (!body) {
          // eslint-disable-next-line callback-return
          cb(0)
        } else {
          if (typeof body.token !== `undefined`) {
            this.token = body.token
            this.expiration = body.expires || (60000 * 5)
            this.time = moment()
            // eslint-disable-next-line callback-return
            cb(body)
          } else if (typeof body.errToken !== `undefined`) {
            // eslint-disable-next-line callback-return
            cb(body)
          } else {
            // eslint-disable-next-line callback-return
            cb(0)
          }
        }
      })
    } catch (unusedE) {
      // eslint-disable-next-line callback-return
      cb(0)
    }
  }

  // We need to log in; display a login window via iziToast. opts.db should have objects of current users (including a key named after this.usernameField) that can be authenticated
  _promptLogin (opts, cb) {
    var selection = [`<option value="">--SELECT A USER--</option>`]
    if (opts.db !== null) {
      opts.db.each((user) => {
        selection.push(`<option value="${user[`${this.usernameField}`]}">${user[`${this.usernameField}`]}</option>`)
      })
    }

    var username = ``
    var password = ``

    iziToast.show({
      timeout: 60000,
      overlay: true,
      displayMode: `once`,
      color: `red`,
      id: `login-for-authorization`,
      zindex: 999,
      layout: 2,
      maxWidth: 480,
      title: `${this.authName} Authorization required`,
      message: `To perform this action, you must login with ${this.authName} credentials. Please choose a user, and then type in your password.`,
      position: `center`,
      drag: false,
      closeOnClick: false,
      inputs: [
        [`<select>${selection.join(``)}</select>`, `change`, function (instance, toast, select, e) {
          username = select.options[select.selectedIndex].value
        }, true],
        [`<input type="password">`, `keyup`, function (instance, toast, input, e) {
          password = input.value
        }, true]
      ],
      buttons: [
        [`<button><b>Authorize</b></button>`, function (instance, toast) {
          instance.hide({ transitionOut: `fadeOut` }, toast, `button`)
          cb(username, password)
        }],
        [`<button><b>Cancel</b></button>`, function (instance, toast) {
          instance.hide({ transitionOut: `fadeOut` }, toast, `button`)
        }]
      ]
    })
  }
}

// Use this function to wait for an element to exist. Calls back the cb when it exists, providing the DOM as a parameter.
function waitForElement (theelement, cb) {
  console.log(theelement)
  if (!document.querySelector(theelement)) {
    window.requestAnimationFrame(() => waitForElement(theelement, cb))
  } else {
    // eslint-disable-next-line callback-return
    cb(document.querySelector(theelement))
  }
}
