/* global iziToast */

// Class for managing data from WWSU
class WWSUdb {

    constructor(db) {
        this._db = db;

        this.onInsert = () => {
        };
        this.onUpdate = () => {
        };
        this.onRemove = () => {
        };
        this.onReplace = () => {
        };
    }
    
    get db() {
        return this._db;
    }

    setOnInsert(fn) {
        this.onInsert = fn;
    }

    setOnUpdate(fn) {
        this.onUpdate = fn;
    }

    setOnRemove(fn) {
        this.onRemove = fn;
    }

    setOnReplace(fn) {
        this.onReplace = fn;
    }

    query(query, replace = false) {
        if (replace)
        {
            if (query.constructor === Array)
            {
                this._db().remove();
                this._db.insert(query);
                this.onReplace(this._db());
            }
            return null;
        } else {
            for (var key in query)
            {
                if (query.hasOwnProperty(key))
                {
                    switch (key)
                    {
                        case 'insert':
                            this._db.insert(query[key]);
                            this.onInsert(query[key], this._db());
                            break;
                        case 'update':
                            this._db({ID: query[key].ID}).update(query[key]);
                            this.onUpdate(query[key], this._db());
                            break;
                        case 'remove':
                            this._db({ID: query[key]}).remove();
                            this.onRemove(query[key], this._db());
                            break;
                    }
                }
            }
    }
    }

    replaceData(WWSUreq, path)
    {
        try {
            WWSUreq.request({method: 'POST', url: path, data: {}}, (body) => {
                this.query(body, true);
            });
        } catch (e) {
            console.error(e);
        }
    }

    assignSocketEvent(event, socket) {
        socket.on(event, (data) => {
            this.query(data, false);
        });
    }
}

// Class for managing requests and authorization to WWSU's API
class WWSUreq {
    constructor(socket, host, usernameField = null, authPath = null, authName = null) {
        this.socket = socket;
        this.host = host;
        this.authPath = authPath;
        this.authName = authName;
        this.usernameField = usernameField;

        // Storing authorization tokens in memory
        this._token = null;
    }

    get token() {
        return this._token;
    }

    set token(value) {
        this._token = value;
    }

    // Request with authorization
    request(opts, cb) {
        this._tryRequest(opts, (body) => {
            if (body === -1)
            {
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
                            });
                        } else if (typeof token.tokenErr !== `undefined` || typeof token.token === 'undefined') {
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
                                message: `${typeof token.tokenErr !== `undefined` ? `Failed to authenticate; please try again. ${token.tokenErr}` : `Failed to authenticate; unknown error.`}`
                            });
                        } else {
                            this._tryRequest(opts, (body2) => {
                                cb(body2);
                            });
                        }
                    });
                }

                if (this.authPath !== '/auth/host')
                {
                    this._promptLogin(opts, (username, password) => step2(username, password));
                } else {
                    step2(this.host, null);
                }
            } else if (body !== 0) {
                cb(body);
            }
        });
    }

    _tryRequest(opts, cb) {
        try {
            if (this.authPath !== null)
            {
                if (typeof opts.headers === `undefined`)
                {
                    opts.headers = {
                        'Authorization': 'Bearer ' + this.token
                    };
                } else {
                    opts.headers['Authorization'] = 'Bearer ' + this.token;
                }
            }

            this.socket.request(opts, (body) => {
                if (!body)
                {
                    cb(0);
                } else if (typeof body.tokenErr !== `undefined`) {
                    cb(-1);
                } else {
                    cb(body);
                }
            });
        } catch (e) {
            cb(0);
        }
    }

    _authorize(username, password, cb) {
        try {
            this.socket.request({method: 'POST', url: this.authPath, data: {username: username, password: password}}, (body) => {
                if (!body)
                {
                    cb(0);
                } else {
                    if (typeof body.token !== `undefined`)
                    {
                        this.token = body.token;
                        cb(body);
                    } else {
                        cb(0);
                    }
                }
            });
        } catch (e) {
            cb(0);
        }
    }

    _promptLogin(opts, cb) {
        var selection = [];
        if (opts.db !== null)
        {
            opts.db.each((user) => {
                selection.push(`<option value="${user[`${this.usernameField}`]}">${user[`${this.usernameField}`]}</option>`);
            });
        }

        var username = ``;
        var password = ``;

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
                [`<select>${selection.join('')}</select>`, 'change', function (instance, toast, select, e) {
                        username = select.options[select.selectedIndex].value;
                    }, true],
                [`<input type="password">`, 'keyup', function (instance, toast, input, e) {
                        password = input.value;
                    }, true]
            ],
            buttons: [
                ['<button><b>Authorize</b></button>', function (instance, toast) {
                        instance.hide({transitionOut: 'fadeOut'}, toast, 'button');
                        cb(username, password);
                    }],
                ['<button><b>Cancel</b></button>', function (instance, toast) {
                        instance.hide({transitionOut: 'fadeOut'}, toast, 'button');
                    }],
            ]
        });
    }
}

// Use this function to wait for an element to exist. Calls back the cb when it exists, providing the DOM as a parameter.
function waitForElement(theelement, cb) {
    console.log(theelement);
    if (!document.querySelector(theelement)) {
        window.requestAnimationFrame(() => waitForElement(theelement, cb));
    } else {
        cb(document.querySelector(theelement));
    }
}

