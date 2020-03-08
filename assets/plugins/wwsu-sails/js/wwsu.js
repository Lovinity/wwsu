/* global moment, EventEmitter, TAFFY */

/**
 * WWSUdb manages data from the WWSU websockets
 *
 * @class WWSUdb
 */
// eslint-disable-next-line no-unused-vars
class WWSUdb {

  /**
     *Creates an instance of WWSUdb.
     * @param {TAFFY} db TAFFY DB to use
     * @memberof WWSUdb
     */
  constructor(db) {
    this._db = db || TAFFY();

    if (typeof EventEmitter !== 'undefined') {
      this.events = new EventEmitter();
    } else { // polyfill
      this.events = {
        emitEvent: (event, args) => {
          switch (event) {
            case 'insert':
              this.events.doInsert(args[ 0 ], args[ 1 ]);
              break;
            case 'update':
              this.events.doUpdate(args[ 0 ], args[ 1 ]);
              break;
            case 'remove':
              this.events.doRemove(args[ 0 ], args[ 1 ]);
              break;
            case 'replace':
              this.events.doReplace(args[ 0 ]);
              break;
          }
        },
        doInsert: () => { },
        doUpdate: () => { },
        doRemove: () => { },
        doReplace: () => { }
      };
    }
  }

  /**
   * Add an event listener.
   * 
   * @param {string} event Event triggered
   * @param {function} fn Function to call when this event is triggered
   */
  on (event, fn) {
    if (typeof EventEmitter !== 'undefined') {
      this.events.on(event, fn);
    } else {
      switch (event) {
        case 'insert':
          this.events.doInsert = fn;
          break;
        case 'update':
          this.events.doUpdate = fn;
          break;
        case 'remove':
          this.events.doRemove = fn;
          break;
        case 'replace':
          this.events.doReplace = fn;
          break;
      }
    }
  }

  // POLYFILL
  setOnInsert (fn) {
    this.on('insert', fn);
  }
  setOnUpdate (fn) {
    this.on('update', fn);
  }
  setOnRemove (fn) {
    this.on('remove', fn);
  }
  setOnReplace (fn) {
    this.on('replace', fn);
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
        this.events.emitEvent('replace', [ this._db() ]);
      }
      return null
    } else {
      console.log(query);
      for (var key in query) {
        if (Object.prototype.hasOwnProperty.call(query, key)) {
          switch (key) {
            case 'insert':
              this._db.insert(query[ key ])
              this.events.emitEvent('insert', [ query[ key ], this._db() ]);
              break
            case 'update':
              this._db({ ID: query[ key ].ID }).update(query[ key ])
              this.events.emitEvent('update', [ query[ key ], this._db() ]);
              break
            case 'remove':
              this._db({ ID: query[ key ] }).remove()
              this.events.emitEvent('remove', [ query[ key ], this._db() ]);
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
      WWSUreq.request({ method: 'POST', url: path, data: data }, (body) => {
        this.query(body, true)
      })
    } catch (e) {
      console.error(e)
    }
  }

  // Assign a socket event to this database. The socket should return data following the standards specified in the query function's query parameter,
  // except replaceData should be used instead when replacing the data in the entire database.
  assignSocketEvent (event, socket) {
    this.on(event, (data) => {
      this.query(data, false)
    })
  }
}

// Class for managing requests and authorization to WWSU's API
// eslint-disable-next-line no-unused-vars
class WWSUreq {
  constructor(socket, host, usernameField = null, authPath = null, authName = null) {
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
    return this._token === null || moment().isAfter(moment(this.time).add(this.expiration - 1000, 'milliseconds'))
  }

  // Request with authorization
  request (opts, cb) {
    // Called after logging in and getting a token
    var step2 = (username, password) => {
      this._authorize(username, password, (token) => {
        if (token === 0) {
          iziToast.show({
            titleColor: '#000000',
            messageColor: '#000000',
            color: 'red',
            close: true,
            overlay: true,
            overlayColor: 'rgba(0, 0, 0, 0.75)',
            zindex: 100,
            layout: 1,
            imageWidth: 100,
            image: ``,
            progressBarColor: `rgba(255, 0, 0, 0.5)`,
            closeOnClick: true,
            position: 'center',
            timeout: 30000,
            title: 'Error authorizing',
            message: 'There was a technical error trying to authorize. Please contact the developers or try again later.'
          })
        } else if (typeof token.errToken !== `undefined` || typeof token.token === 'undefined') {
          iziToast.show({
            titleColor: '#000000',
            messageColor: '#000000',
            color: 'red',
            close: true,
            overlay: true,
            overlayColor: 'rgba(0, 0, 0, 0.75)',
            zindex: 100,
            layout: 1,
            imageWidth: 100,
            image: ``,
            progressBarColor: `rgba(255, 0, 0, 0.5)`,
            closeOnClick: true,
            position: 'center',
            timeout: 30000,
            title: 'Access denied',
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
      if (this.authPath === '/auth/host') {
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
          if (this.authPath !== '/auth/host') {
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
            Authorization: 'Bearer ' + this.token
          }
        } else {
          opts.headers[ 'Authorization' ] = 'Bearer ' + this.token
        }
      }

      this.socket.request(opts, (body) => {
        if (!body) {
          // eslint-disable-next-line standard/no-callback-literal
          cb(0)
        } else if (typeof body.tokenErr !== `undefined`) {
          // eslint-disable-next-line standard/no-callback-literal
          cb(-1)
        } else {
          cb(body)
        }
      })
    } catch (unusedE) {
      // eslint-disable-next-line standard/no-callback-literal
      cb(0)
    }
  }

  // Helper. Attempt to log in and get a token. cb passes 0 for errors and body on success. Also stores token/expiration in memory so we don't have to
  // authorize again until the token expires.
  _authorize (username, password, cb) {
    try {
      this.socket.request({ method: 'POST', url: this.authPath, data: { username: username, password: password } }, (body) => {
        if (!body) {
          // eslint-disable-next-line standard/no-callback-literal
          cb(0)
        } else {
          if (typeof body.token !== `undefined`) {
            this.token = body.token
            this.expiration = body.expires || (60000 * 5)
            this.time = moment()
            cb(body)
          } else if (typeof body.errToken !== `undefined`) {
            cb(body)
          } else {
            // eslint-disable-next-line standard/no-callback-literal
            cb(0)
          }
        }
      })
    } catch (unusedE) {
      // eslint-disable-next-line standard/no-callback-literal
      cb(0)
    }
  }

  // We need to log in; display a login window via iziToast. opts.db should have objects of current users (including a key named after this.usernameField) that can be authenticated
  _promptLogin (opts, cb) {
    var selection = [ `<option value="">--SELECT A USER--</option>` ]
    if (opts.db !== null) {
      opts.db.each((user) => {
        selection.push(`<option value="${user[ `${this.usernameField}` ]}">${user[ `${this.usernameField}` ]}</option>`)
      })
    }

    var username = ``
    var password = ``

    iziToast.show({
      timeout: 60000,
      overlay: true,
      displayMode: 'once',
      color: 'red',
      id: 'login-for-authorization',
      zindex: 999,
      layout: 2,
      maxWidth: 480,
      title: `${this.authName} Authorization required`,
      message: `To perform this action, you must login with ${this.authName} credentials. Please choose a user, and then type in your password.`,
      position: 'center',
      drag: false,
      closeOnClick: false,
      inputs: [
        [ `<select>${selection.join('')}</select>`, 'change', function (instance, toast, select, e) {
          username = select.options[ select.selectedIndex ].value
        }, true ],
        [ `<input type="password">`, 'keyup', function (instance, toast, input, e) {
          password = input.value
        }, true ]
      ],
      buttons: [
        [ '<button><b>Authorize</b></button>', function (instance, toast) {
          instance.hide({ transitionOut: 'fadeOut' }, toast, 'button')
          cb(username, password)
        } ],
        [ '<button><b>Cancel</b></button>', function (instance, toast) {
          instance.hide({ transitionOut: 'fadeOut' }, toast, 'button')
        } ]
      ]
    })
  }
}

// Class for loading scripts in web pages dynamically
class WWSUScriptLoader {

  constructor() {
    this.loadedScripts = [];
  }

  loadScript (filename, filetype) {
    if (this.loadedScripts.indexOf(filename) === -1) {
      this._loadScript(filename, filetype);
      this.loadedScripts.push(filename);
    }
  }

  // Do not call this directly unless you want to avoid duplicate script loading checks!
  _loadScript (filename, filetype) {
    if (filetype === "js") { //if filename is a external JavaScript file
      var fileref = document.createElement('script')
      fileref.setAttribute("type", "text/javascript")
      fileref.setAttribute("src", filename)
    }
    else if (filetype === "css") { //if filename is an external CSS file
      var fileref = document.createElement("link")
      fileref.setAttribute("rel", "stylesheet")
      fileref.setAttribute("type", "text/css")
      fileref.setAttribute("href", filename)
    }
    if (typeof fileref !== "undefined")
      document.getElementsByTagName("head")[ 0 ].appendChild(fileref)
  }

}

class WWSUutil {

  /**
   * Get the value of the specified URL parameter
   * 
   * @param {string} name Name of URL parameter to fetch
   * @returns {?string} Value of the URL parameter being fetched, or null if not set.
   */
  getUrlParameter (name) {
    try {
      name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]')
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)')
      var results = regex.exec(window.location.search)
      return results === null ? null : decodeURIComponent(results[ 1 ].replace(/\+/g, ' '))
    } catch (e) {
      console.error(e);
      $(document).Toasts('create', {
        class: 'bg-danger',
        title: 'Error in getUrlParameter function',
        body: 'There was an error in the getUrlParameter function. Please report this to engineer@wwsu1069.org.',
        icon: 'fas fa-skull-crossbones fa-lg',
      });
    }
  }

  /**
  * Convert a hexadecimal color into its RGBA values.
  * 
  * @param {string} hex A hexadecimal color
  * @param {object} options options.format: specify "array" to return as [red, green, blue, alpha] instead of object
  * @returns {object || array} {red, green, blue, alpha} or [red, green, blue, alpha] values
  */
  hexRgb (hex, options = {}) {

    // function-specific values
    var hexChars = 'a-f\\d'
    var match3or4Hex = `#?[${hexChars}]{3}[${hexChars}]?`
    var match6or8Hex = `#?[${hexChars}]{6}([${hexChars}]{2})?`
    var nonHexChars = new RegExp(`[^#${hexChars}]`, 'gi')
    var validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, 'i')

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
        hex = hex[ 0 ] + hex[ 0 ] + hex[ 1 ] + hex[ 1 ] + hex[ 2 ] + hex[ 2 ]
      }

      const num = parseInt(hex, 16)
      const red = num >> 16
      const green = (num >> 8) & 255
      const blue = num & 255

      return options.format === 'array'
        ? [ red, green, blue, alpha ]
        : { red, green, blue, alpha }
    } catch (e) {
      console.error(e)
      $(document).Toasts('create', {
        class: 'bg-danger',
        title: 'hexrgb error',
        body: 'There was an error in the hexrgb function. Please report this to engineer@wwsu1069.org.',
        icon: 'fas fa-skull-crossbones fa-lg',
      });
    }
  }

  /**
  * Escape HTML for use in the web page.
  * 
  * @param {string} str The HTML to escape
  */
  escapeHTML (str) {
    var div = document.createElement('div')
    div.appendChild(document.createTextNode(str))
    return div.innerHTML
  }

  /**
   * Call a function when an element exists on the document.
   * 
   * @param {string} theelement DOM query string of the element to wait for until it exists
   * @param {function} cb Function to call when the element exists
   */
  waitForElement (theelement, cb) {
    console.log(theelement)
    if (!document.querySelector(theelement)) {
      window.requestAnimationFrame(() => this.waitForElement(theelement, cb))
    } else {
      // eslint-disable-next-line callback-return
      cb(document.querySelector(theelement))
    }
  }
}

if (typeof require !== 'undefined') {
  exports.WWSUdb = WWSUdb;
  exports.WWSUreq = WWSUreq;
  exports.WWSUScriptLoader = WWSUScriptLoader;
  exports.WWSUutil = WWSUutil;
}