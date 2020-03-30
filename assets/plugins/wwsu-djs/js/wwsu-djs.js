/* global WWSUdb */

// This class manages DJs from WWSU.
class WWSUdjs extends WWSUdb {

    /**
     * Construct the class
     * 
     * @param {sails.io} socket Socket connection to WWSU
     * @param {WWSUreq} noReq Request with no authorization
     * @param {WWSUreq} directorReq Request with director authorization
     */
    constructor(socket, noReq, directorReq) {
        super(); // Create the db

        this.endpoints = {
            get: '/djs/get',
            add: '/djs/add'
        };
        this.data = {
            get: {}
        };
        this.requests = {
            no: noReq,
            director: directorReq
        };

        this.assignSocketEvent('djs', socket);

        this.djModal = new WWSUmodal(`Manage DJs`, null, ``, true, {
            headerColor: '',
            overlayClose: false,
            zindex: 1100,
            openFullscreen: true,
        });

        this.newDjModal = new WWSUmodal(`New DJ`, null, ``, true, {
            headerColor: '',
            overlayClose: false,
            zindex: 1110,
            openFullscreen: true,
        });
    }

    // Initialize connection. Call this on socket connect event.
    init () {
        this.replaceData(this.requests.no, this.endpoints.get, this.data.get);
    }

    /**
     * Generate a simple DataTables.js table of the DJs in the system
     * 
     * @param {WWSUdb} djs WWSUdb djs for duplicate name checking
     * @param {WWSUdb} directors WWSUdb directors for authorization
     */
    showDJs (djs, directors) {
        this.djModal.body = `<table id="modal-${this.djModal.id}-table" class="table table-striped" style="min-width: 100%;"></table>`;
        this.djModal.iziModal('open');
        $(this.djModal.body).block({
            message: '<h1>Loading...</h1>',
            css: { border: '3px solid #a00' },
            onBlock: () => {
                var table = $(`#modal-${this.djModal.id}-table`).DataTable({
                    scrollCollapse: true,
                    paging: false,
                    data: [],
                    columns: [
                        { title: "DJ Name" },
                        { title: "Full Name" },
                        { title: "Last Seen" },
                    ],
                    "order": [ [ 0, "asc" ] ],
                    pageLength: 10
                });
                this.db().each((dj) => {
                    table.rows.add([ [
                        dj.name || 'Unknown',
                        dj.fullName || 'Unknown',
                        moment(dj.lastSeen).format('LLL'),
                    ] ])
                });
                table.draw();
                $(this.djModal.body).unblock();
            }
        });

        // Generate new DJ button
        this.djModal.footer = `<button type="button" class="btn btn-outline-success" id="modal-${this.djModal.id}-new" data-dismiss="modal">New DJ</button>`;
        $(`#modal-${this.djModal.id}-new`).unbind('click');
        $(`#modal-${this.djModal.id}-new`).click(() => {
            this.showNewDJForm(djs, directors);
        });
    }

    /**
     * Make a "New DJ" Alpaca form in a modal.
     * 
     * @param {WWSUdb} djs WWSUdb djs for duplicate name checking
     * @param {WWSUdb} directors WWSUdb directors for authorization
     */
    showNewDJForm (djs, directors) {
        this.newDjModal.body = ``;
        this.newDjModal.iziModal('open');

        var _djs = djs.db().get().map((dj) => dj.name);

        $(this.newDjModal.body).alpaca({
            "schema": {
                "title": "New DJ",
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "required": true,
                        "title": "Name of DJ as used on radio",
                        "maxLength": 255
                    },
                    "realName": {
                        "type": "string",
                        "required": true,
                        "title": "Real full name of person",
                        "maxLength": 255
                    },
                    "email": {
                        "type": "string",
                        "format": "email",
                        "required": true,
                        "title": "Campus email of the DJ",
                        "maxLength": 255
                    },
                    "login": {
                        "type": "string",
                        "format": "password",
                        "required": true,
                        "title": "Login Password",
                        "maxLength": 255
                    },
                }
            },
            "options": {
                "fields": {
                    "name": {
                        "helper": "This is the name that appears publicly on shows, the website, etc. You may not use the same DJ name twice.",
                        "validator": function (callback) {
                            var value = this.getValue();
                            if (_djs.indexOf(value) !== -1) {
                                callback({
                                    "status": false,
                                    "message": "A DJ by this name already exists in the system. This is not allowed."
                                });
                                return;
                            }
                            callback({
                                "status": true
                            });
                        }
                    },
                    "realName": {
                        "helper": "Used for directors to help easily identify who this person is."
                    },
                    "email": {
                        "helper": "Plans are in the future, DJs will be emailed automatically of show changes / cancellations, analytics, and anything else pertaining to their show or WWSU."
                    },
                    "login": {
                        "helper": "DJs will use this to log in to their online DJ panel. In the future, this may be used to log in to prod / onair computers during schedule shows or bookings. You might choose to use their door PIN."
                    }
                },
                "form": {
                    "buttons": {
                        "submit": {
                            "title": "Add DJ",
                            "click": (form, e) => {
                                form.refreshValidationState(true);
                                if (!form.isValid(true)) {
                                    form.focus();
                                    return;
                                }
                                var value = form.getValue();
                                this.addDJ(directors, value, (success) => {
                                    if (success) {
                                        this.newDjModal.iziModal('close');
                                        this.showDJs(djs, directors);
                                    }
                                });
                            }
                        }
                    }
                }
            },
        });
    }

    /**
     * Add a new DJ to the system via the API
     * 
     * @param {WWSUdb} directors The directors in the WWSU system
     * @param {Object} data The data to send in the request to the API to add a DJ
     * @param {function} cb Callback called after the request is complete. Parameter false if unsuccessful or true if it was.
     */
    addDJ (directors, data, cb) {
        try {
            this.requests.director.request({ dom: `#modal-${this.newDjModal.id}`, db: directors.db(), method: 'post', url: this.endpoints.add, data: data }, (response) => {
                if (response !== 'OK') {
                    $(document).Toasts('create', {
                        class: 'bg-warning',
                        title: 'Error adding',
                        body: 'There was an error adding the DJ. Please make sure you filled all fields correctly.',
                        delay: 10000,
                    });
                    cb(false);
                } else {
                    $(document).Toasts('create', {
                        class: 'bg-success',
                        title: 'DJ Added',
                        autohide: true,
                        delay: 10000,
                        body: `DJ has been created`,
                    })
                    cb(true);
                }
            })
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error adding DJ',
                body: 'There was an error adding a new DJ. Please report this to engineer@wwsu1069.org.',
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            console.error(e);
            cb(false);
        }
    }
}