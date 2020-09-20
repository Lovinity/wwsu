// This class handles states and operations.
class WWSUstate extends WWSUevents {

    /**
     * Construct the class
     * 
     * @param {sails.io} socket Socket connection to WWSU
     * @param {WWSUhosts} hosts An instance of WWSUhosts to check for DJ locking and prompt if not a host.
     * @param {WWSUcalendar} calendar An instance of WWSUcalendar for checking what should be on the air now.
     * @param {WWSUreq} hostReq Request with host authorization
     */
    constructor(socket, hosts, calendar, hostReq) {
        super();
        this.endpoints = {
            return: '/state/return',
            queuePSA: '/songs/queue-psa',
            automation: '/state/automation',
            break: '/state/break',
            topAdd: '/songs/queue-top-add',
            liner: '/songs/queue-liner',
            dump: '/delay/dump',
            live: '/state/live'
        };
        this.requests = {
            host: hostReq,
        };
        this.data = {
            get: {}
        };
        this.hosts = hosts;
        this.calendar = calendar;

        this.broadcastModal = new WWSUmodal(``, `operations`, ``, true, {
            headerColor: '',
            overlayClose: false,
            zindex: 1100,
        });
    }

    /**
     * Call WWSU API to return from a break.
     * 
     * @param {object} data Data to send to the API
     * @param {?function} cb Callback function executed after the request was made.
     */
    return (data, cb) {
        try {
            this.hosts.promptIfNotHost(`return from break`, () => {
                this.requests.host.request({ method: 'post', url: this.endpoints.return, data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error returning',
                            body: 'There was an error returning from break. Either you are not in a break, or your DJ controls prevents you from returning when you are not on the air. If neither of these are true, please contact the engineer.',
                            autoHide: true,
                            delay: 15000,
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        if (typeof cb === 'function') {
                            cb(false);
                        }
                    } else {
                        if (typeof cb === 'function') {
                            cb(true);
                        }
                    }
                })
            });
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error returning',
                body: 'There was an error returning from break. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            if (typeof cb === 'function') {
                cb(false);
            }
            console.error(e);
        }
    }

    /**
     * Call WWSU API to add a PSA in the queue.
     * 
     * @param {object} data Data to send to the API
     * @param {?function} cb Callback after the request is made
     */
    queuePSA (data, cb) {
        try {
            this.hosts.promptIfNotHost(`queue a ${data && data.duration ? `${data.duration}-second` : ``} PSA`, () => {
                this.requests.host.request({ method: 'post', url: this.endpoints.queuePSA, data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error adding PSA',
                            body: 'There was an error adding the PSA. Your DJ Controls might not allow you to do this when you are not on the air. If this is not the case, please contact the engineer.',
                            autoHide: true,
                            delay: 15000,
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        if (typeof cb === 'function') {
                            cb(false);
                        }
                    } else {
                        $(document).Toasts('create', {
                            class: 'bg-success',
                            title: 'PSA Added',
                            autohide: true,
                            delay: 5000,
                            body: `PSA was added to the queue`,
                        })
                        if (typeof cb === 'function') {
                            cb(true);
                        }
                    }
                })
            });
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error adding PSA',
                body: 'There was an error adding the PSA. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            if (typeof cb === 'function') {
                cb(false);
            }
            console.error(e);
        }
    }

    /**
     * Call the WWSU API to end the current broadcast and go to automation.
     * 
     * @param {object} data Data to send to the API
     * @param {?function} cb Callback function after request is made (contains responded analytic data as parameter)
     */
    automation (data, cb) {
        try {
            this.hosts.promptIfNotHost(`go to ${data && data.transition ? `break for next show` : `automation`}`, () => {
                this.requests.host.request({ method: 'post', url: this.endpoints.automation, data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error ending broadcast',
                            body: 'There was an error ending the broadcast. Your DJ Controls might not allow you to end broadcasts you did not start. If this is not the case, please contact the engineer.',
                            autoHide: true,
                            delay: 15000,
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        if (typeof cb === 'function') {
                            cb(false);
                        }
                    } else {
                        if (typeof cb === 'function') {
                            cb(response);
                        }
                    }
                })
            });
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error ending broadcast',
                body: 'There was an error ending the broadcast. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            if (typeof cb === 'function') {
                cb(false);
            }
            console.error(e);
        }
    }

    /**
     * Tell the WWSU API to go to a break.
     * 
     * @param {object} data Data to send to the API
     * @param {?function} cb Callback function after request is made
     */
    break (data, cb) {
        try {
            this.hosts.promptIfNotHost(`go to ${data && data.halftime ? `extended ` : ``}break`, () => {
                this.requests.host.request({ method: 'post', url: this.endpoints.break, data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error going to break',
                            body: 'There was an error going to break. Your DJ Controls might not allow you to go to break when you are not on the air. If this is not the case, please contact the engineer.',
                            autoHide: true,
                            delay: 15000,
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        if (typeof cb === 'function') {
                            cb(false);
                        }
                    } else {
                        if (typeof cb === 'function') {
                            cb(true);
                        }
                    }
                })
            });
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error going to break',
                body: 'There was an error going to break. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            if (typeof cb === 'function') {
                cb(false);
            }
            console.error(e);
        }
    }

    /**
     * Tell the WWSU API to queue a Top Add
     * 
     * @param {object} data Data to pass to the API
     * @param {?function} cb Callback executed when request is completed
     */
    queueTopAdd (data, cb) {
        try {
            this.hosts.promptIfNotHost(`play a Top Add`, () => {
                this.requests.host.request({ method: 'post', url: this.endpoints.topAdd, data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error queuing Top Add',
                            body: 'There was an error queuing a Top Add. Your DJ Controls might not allow you to do this when you are not on the air. If this is not the case, please contact the engineer.',
                            autoHide: true,
                            delay: 15000,
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        if (typeof cb === 'function') {
                            cb(false);
                        }
                    } else {
                        $(document).Toasts('create', {
                            class: 'bg-success',
                            title: 'Top Add Queued',
                            autohide: true,
                            delay: 5000,
                            body: `Top Add was added to the queue`,
                        })
                        if (typeof cb === 'function') {
                            cb(true);
                        }
                    }
                })
            });
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error queuing Top Add',
                body: 'There was an error queuing a Top Add. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            if (typeof cb === 'function') {
                cb(false);
            }
            console.error(e);
        }
    }

    /**
     * Tell the WWSU API to queue a liner
     * 
     * @param {object} data Data to pass to the API
     * @param {?function} cb Callback function to execute when request is completed
     */
    queueLiner (data, cb) {
        try {
            this.hosts.promptIfNotHost(`play a liner`, () => {
                this.requests.host.request({ method: 'post', url: this.endpoints.liner, data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error queuing liner',
                            body: 'There was an error queuing a liner. Your DJ Controls might not allow you to do this when you are not on the air. If this is not the case, please contact the engineer.',
                            autoHide: true,
                            delay: 15000,
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        if (typeof cb === 'function') {
                            cb(false);
                        }
                    } else {
                        $(document).Toasts('create', {
                            class: 'bg-success',
                            title: 'Liner Queued',
                            autohide: true,
                            delay: 5000,
                            body: `Liner was added to the queue`,
                        })
                        if (typeof cb === 'function') {
                            cb(true);
                        }
                    }
                })
            });
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error queuing liner',
                body: 'There was an error queuing a liner. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            if (typeof cb === 'function') {
                cb(false);
            }
            console.error(e);
        }
    }

    /**
     * Tell the WWSU API to send the dump command to the delay system.
     * 
     * @param {object} data Data to pass to the API
     * @param {?function} cb Callback to execure when request is complete
     */
    dump (data, cb) {
        try {
            this.hosts.promptIfNotHost(`dump audio on the delay system`, () => {
                this.requests.host.request({ method: 'post', url: this.endpoints.dump, data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error dumping',
                            body: 'There was an error triggering the dump on the delay system. Your DJ Controls might not allow you to do this when you are not on the air. If this is not the case, please contact the engineer.',
                            autoHide: true,
                            delay: 15000,
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        if (typeof cb === 'function') {
                            cb(false);
                        }
                    } else {
                        $(document).Toasts('create', {
                            class: 'bg-success',
                            title: 'Dump command sent',
                            autohide: true,
                            delay: 10000,
                            body: `Dump command was sent to the delay system. If successful, the number of seconds on the dump button will go down shortly.`,
                        })
                        if (typeof cb === 'function') {
                            cb(true);
                        }
                    }
                })
            });
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error dumping',
                body: 'There was an error triggering the dump on the delay system. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            if (typeof cb === 'function') {
                cb(false);
            }
            console.error(e);
        }
    }

    /**
     * Show a form for starting a live in-studio show in a modal via Alpaca.
     */
    showLiveForm () {
        if (this.hosts.client.lockToDJ !== null) {
            $(document).Toasts('create', {
                class: 'bg-warning',
                title: 'Action not allowed',
                delay: 20000,
                autohide: true,
                body: `You are not allowed to start a live (in-studio) broadcast from this host. Please contact a director if you think this is an error.`,
            });
            return;
        }

        this.broadcastModal.title = `Start Live (in-studio) Broadcast`;
        this.broadcastModal.body = ``;
        this.broadcastModal.iziModal('open');

        var whatShouldBePlaying = this.calendar.whatShouldBePlaying();
        whatShouldBePlaying = whatShouldBePlaying.find((record) => record.type === 'show');

        $(this.broadcastModal.body).alpaca({
            "schema": {
                "title": "Start Live (in-studio) Broadcast",
                "type": "object",
                "properties": {
                    "djs": {
                        "type": "string",
                        "required": true,
                        "title": "DJ handles",
                        "default": whatShouldBePlaying ? whatShouldBePlaying.hosts : "",
                        "maxLength": 255
                    },
                    "name": {
                        "type": "string",
                        "title": "Name of Show",
                        "required": true,
                        "default": whatShouldBePlaying ? whatShouldBePlaying.name : "",
                        "maxLength": 255
                    },
                    "topic": {
                        "type": "string",
                        "title": "Episode Topic / Description",
                        "maxLength": 255
                    },
                    "webchat": {
                        "type": "boolean",
                        "default": true,
                        "title": "Allow Listeners to Send Messages?"
                    },
                    "acknowledge": {
                        "type": 'boolean',
                        "default": false,
                        "title": "I read the announcements"
                    }
                }
            },
            "options": {
                "fields": {
                    "djs": {
                        "helper": `Each DJ handle should be separated with a "; " (semicolon-space) if providing multiple DJs.`,
                        "validator": function (callback) {
                            var value = this.getValue();
                            if (value.includes(" -")) {
                                callback({
                                    "status": false,
                                    "message": `Invalid; DJ handles may not contain " - " as this is a separation used by the system.`
                                });
                                return;
                            }
                            if (!whatShouldBePlaying || whatShouldBePlaying.hosts !== value) {
                                callback({
                                    "status": true,
                                    "message": `Not on the immediate schedule (proceeding could result in the show being flagged as unauthorized)`
                                });
                                return;
                            }
                            callback({
                                "status": true
                            });
                        }
                    },
                    "name": {
                        "validator": function (callback) {
                            var value = this.getValue();
                            if (value.includes(" -")) {
                                callback({
                                    "status": false,
                                    "message": `Invalid; Show names may not contain " - " as this is a separation used by the system.`
                                });
                                return;
                            }
                            if (!whatShouldBePlaying || whatShouldBePlaying.name !== value) {
                                callback({
                                    "status": true,
                                    "message": `Not on the immediate schedule (proceeding could result in the show being flagged as unauthorized)`
                                });
                                return;
                            }
                            callback({
                                "status": true
                            });
                        }
                    },
                    "topic": {
                        "helper": "Limit: 256 characters. The topic will be displayed on the website and display signs.",
                        "type": "textarea",
                        "placeholder": whatShouldBePlaying ? whatShouldBePlaying.description : "",
                    },
                    "webchat": {
                        "rightLabel": "Yes",
                        "helper": "You can mute/ban individual listeners from the chat if they send threatening or harassing messages."
                    },
                    "acknowledge": {
                        "rightLabel": "Yes",
                        "helper": "Please check this box to indicate you read the announcements on the announcements tab of DJ Controls.",
                        "validator": function (callback) {
                            var value = this.getValue();
                            if (!value) {
                                callback({
                                    "status": false,
                                    "message": `You must acknowledge that you read the announcements on the announcements tab of DJ Controls before doing a broadcast.`
                                });
                                return;
                            }
                            callback({
                                "status": true
                            });
                        }
                    }
                },
                "form": {
                    "buttons": {
                        "submit": {
                            "title": "Start Broadcast",
                            "click": (form, e) => {
                                form.refreshValidationState(true);
                                if (!form.isValid(true)) {
                                    form.focus();
                                    return;
                                }
                                var value = form.getValue();

                                value = {
                                    topic: value.topic,
                                    showname: `${value.djs} - ${value.name}`,
                                    webchat: value.webchat
                                };

                                this.goLive(value, (success) => {
                                    if (success) {
                                        this.broadcastModal.iziModal('close');
                                    }
                                });
                            }
                        }
                    }
                },
            }
        });
    }

    /**
     * Tell the WWSU API to start a live broadcast.
     * 
     * @param {object} data Data to send to the endpoint
     * @param {?function} cb Callback executed when the request is completed
     */
    goLive (data, cb) {
        try {
            this.hosts.promptIfNotHost(`start a live in-studio broadcast`, () => {
                this.requests.host.request({ method: 'post', url: this.endpoints.live, data }, (response) => {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-danger',
                            title: 'Error starting live broadcast',
                            body: 'There was an error starting the live broadcast. Live broadcasts may only be started from the WWSU studio (otherwise, you must do a remote broadcast). If you are in the WWSU studio, please contact the engineer.',
                            autoHide: true,
                            delay: 15000,
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        if (typeof cb === 'function') {
                            cb(false);
                        }
                    } else {
                        if (typeof cb === 'function') {
                            cb(true);
                        }
                    }
                })
            });
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error starting live broadcast',
                body: 'There was an error starting the live broadcast. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            if (typeof cb === 'function') {
                cb(false);
            }
            console.error(e);
        }
    }
}