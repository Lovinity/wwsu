/* global WWSUdb */

// This class manages discipline.
class WWSUdiscipline extends WWSUdb {

    /**
     * Construct the directors.
     * 
     * @param {sails.io} socket The socket connection to WWSU
     * @param {WWSUreq} noReq A request with no authorization
     * @param {WWSUreq} directorReq A request with director authorization (only provide if this client is allowed to manage discipline)
     * @param {WWSUmeta} meta The WWSUmeta class
     */
    constructor(socket, noReq, directorReq, meta) {
        super(); // Create the db

        this.meta = meta;

        this.endpoints = {
            acknowledge: '/discipline/acknowledge',
            getWeb: '/discipline/get-web',
            get: '/discipline/get'
        };
        this.data = {
            getWeb: {},
            get: {}
        };
        this.requests = {
            no: noReq,
            director: directorReq,
        };

        // Discipline socket event for managing discipline
        this.assignSocketEvent('discipline', socket);

        // This event is called when the client gets issued discipline
        socket.on('discipline-add', (discipline) => {
            var activeDiscipline = (discipline.active && (discipline.action !== 'dayban' || moment(discipline.createdAt).add(1, 'days').isAfter(moment(this.meta ? this.meta.meta.time : undefined))))
            if (activeDiscipline || !discipline.acknowledged) {
                this.addDiscipline(discipline);
            }
        });

        this.queuedDiscipline = [];
        this.activeDiscipline = null;

        // Modal for discipline
        this.disciplineModal = new WWSUmodal(
            ``,
            `bg-danger`,
            ``,
            false,
            {
                headerColor: '',
                overlayClose: false,
                zindex: 5000,
                timeout: false,
                openFullscreen: true,
                closeOnEscape: false,
                closeButton: false,
                onClosed: () => {
                    if (this.queuedDiscipline.length > 0) {
                        let nextDiscipline = this.queuedDiscipline.shift();
                        this.showDiscipline(nextDiscipline);
                    }
                }
            }
        );
        this.disciplineModal.footer = `<button type="button" class="btn btn-success" id="modal-${this.disciplineModal.id}-acknowledge">Acknowledge</button>`;
        var util = new WWSUutil();
        util.waitForElement(`#modal-${this.disciplineModal.id}-acknowledge`, () => {
            $(`#modal-${this.disciplineModal.id}-acknowledge`).click(() => {
                this.acknowledgeDiscipline(this.activeDiscipline);
            });
        });

        this.muteModal = new WWSUmodal(`Mute`, null, ``, true, {
            headerColor: '',
            zindex: 1100,
            overlayClose: false,
        });
    }

    // Initialize ONLY if this client will be allowed to manage discipline.
    init () {
        this.replaceData(this.requests.director, this.endpoints.get, this.data.get);
    }

    /**
     * Check if this client has any discipline issued, past or present, and display modals if so.
     * 
     * @param {function} cb Callback fired if there are no active disciplines in effect.
     */
    checkDiscipline (cb) {
        try {
            this.requests.no.request({ method: 'post', url: this.endpoints.getWeb, data: {} }, (body) => {
                var docb = true
                if (body.length > 0) {
                    body.map((discipline) => {
                        var activeDiscipline = (discipline.active && (discipline.action !== 'dayban' || moment(discipline.createdAt).add(1, 'days').isAfter(moment(this.meta ? this.meta.meta.time : undefined))))
                        if (activeDiscipline) { docb = false }
                        if (activeDiscipline || !discipline.acknowledged) {
                            this.addDiscipline(discipline);
                        }
                    })
                }
                if (docb) {
                    cb()
                }
            })
        } catch (e) {
            console.error(e);
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error checking discipline',
                body: 'There was an error checking to see if you are allowed to access WWSU. Please try again later, or contact the engineer if this problem continues.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            })
        }
    }

    /**
     * Queue a discipline message for modals.
     * 
     * @param {object} discipline The discipline record returned from WWSU.
     */
    addDiscipline (discipline) {
        let state = this.disciplineModal.iziModal('getState');

        // Skip if the discipline was already acknowledged
        var activeDiscipline = (discipline.active && (discipline.action !== 'dayban' || moment(discipline.createdAt).add(1, 'days').isAfter(moment(this.meta ? this.meta.meta.time : undefined))))

        if (discipline.acknowledged && !activeDiscipline) return;

        if (state !== 'closed') {
            this.queuedDiscipline.push(discipline);
        } else {
            this.showDiscipline(discipline);
        }
    }

    /**
     * Open the modal to display a disciplinary message.
     * 
     * @param {object} discipline The discipline record returned from WWSU.
     */
    showDiscipline (discipline) {
        var activeDiscipline = (discipline.active && (discipline.action !== 'dayban' || moment(discipline.createdAt).add(1, 'days').isAfter(moment(this.meta ? this.meta.meta.time : undefined))))

        this.disciplineModal.title = `Disciplinary action ${activeDiscipline ? `active against you` : `was issued in the past against you`}`
        this.disciplineModal.body = `<p>On ${moment.parseZone(discipline.createdAt).format('LLLL Z')}, disciplinary action was issued against you for the following reason: ${discipline.message}.</p>
        <p>${activeDiscipline ? `A ${discipline.action} is currently active, and you are not allowed to use WWSU's services at this time.` : `The discipline has expired, but you must acknowledge this message before you may use WWSU's services. Further issues may warrant more severe disciplinary action.`}</p>
        <p>Please contact wwsu1@wright.edu if you have any questions or concerns.</p>`;

        this.activeDiscipline = discipline.ID;

        this.disciplineModal.iziModal('open');
    }

    /**
     * Acknowledge a discipline in WWSU's API
     * 
     * @param {number} ID ID of the discipline to acknowledge
     * @param {?function} cb Callback called after the request is completed
     */
    acknowledgeDiscipline (ID, cb) {
        try {
            this.requests.no.request({ dom: `#modal-${this.disciplineModal.id}`, method: 'post', url: this.endpoints.acknowledge, data: { ID: ID } }, (response) => {
                this.disciplineModal.iziModal('close');
                if (response !== 'OK') {
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Error acknowledging',
                        body: 'There was an error acknowledging the discipline. Please report this to the engineer.',
                        autoHide: true,
                        delay: 10000,
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                    cb(false);
                } else {
                    $(document).Toasts('create', {
                        class: 'bg-success',
                        title: 'Acknowledged',
                        autohide: true,
                        delay: 10000,
                        body: `Discipline was acknowledged.`,
                    })
                    cb(true);
                }
            })
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error acknowledging',
                body: 'There was an error acknowledging the discipline. Please report this to the engineer.',
                autoHide: true,
                delay: 10000,
                icon: 'fas fa-skull-crossbones fa-lg',
            });
            console.error(e);
            cb(false);
        }
    }
}