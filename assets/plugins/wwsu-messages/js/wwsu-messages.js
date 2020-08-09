// This class manages messages/chat from a host level
// NOTE: event also supports 'newMessage' emitted when a new message is received that should be notified.

class WWSUmessages extends WWSUdb {

    /**
     * The class constructor.
     * 
     * @param {sails.io} socket The sails.io socket connected to the WWSU API.
     * @param {WWSUrecipients} recipients Initialized WWSUrecipients class
     * @param {WWSUmeta} meta initialized WWSU meta class
     * @param {WWSUhosts} hosts initialized hosts class
     * @param {WWSUdiscipline} discipline initialized discipline class
     * @param {WWSUreq} hostReq Request with host authorization
     */
    constructor(socket, recipients, meta, hosts, discipline, hostReq) {
        super();

        this.endpoints = {
            get: '/messages/get',
            remove: '/messages/remove',
            send: '/messages/send'
        };
        this.data = {
            get: {}
        };
        this.requests = {
            host: hostReq,
        };

        this.recipients = recipients;
        this.meta = meta;
        this.hosts = hosts;
        this.discipline = discipline;

        this.assignSocketEvent('messages', socket);

        this.chatActiveRecipient;
        this.chatStatus;
        this.chatMessages;
        this.chatForm;
        this.chatMute;
        this.chatBan;
        this.menuNew;
        this.menuIcon;

        this.read = [];
        this.notified = [];

        // Prune old messages (over 1 hour old) every minute.
        this.prune = setInterval(() => {
            this.find().forEach((message) => {
                if (moment(this.meta ? this.meta.meta.time : undefined).subtract(1, 'hours').isAfter(moment(message.createdAt))) {
                    this.query({ remove: message.ID });
                }
            });
        }, 60000);

        this.animations = new WWSUanimations();

        this.firstLoad = true;
    }

    /**
     * Initialize chat components. This should be called before init (eg. on DOM ready).
     * 
     * @param {string} chatActiveRecipient DOM query string of the chat header where active recipient will be shown.
     * @param {string} chatStatus DOM query string where the chat status info box is contained.
     * @param {string} chatMessages DOM query string where chat messages should be displayed.
     * @param {string} chatForm DOM query string where the Alpaca form for sending messages should be generated.
     * @param {string} chatMute DOM query string of the chat mute action button
     * @param {string} chatBan DOM query string of the chat ban action button
     * @param {string} menuNew DOM query string of the badge containing number of unread messages
     * @param {string} menuIcon DOM query string of the menu icon to flash green when an unread message is present
     */
    initComponents (chatActiveRecipient, chatStatus, chatMessages, chatForm, chatMute, chatBan, menuNew, menuIcon) {
        // Set properties
        this.chatActiveRecipient = chatActiveRecipient;
        this.chatStatus = chatStatus;
        this.chatMessages = chatMessages;
        this.chatForm = chatForm;
        this.chatMute = chatMute;
        this.chatBan = chatBan;
        this.menuNew = menuNew;
        this.menuIcon = menuIcon;

        // Generate Alpaca form
        $(this.chatForm).alpaca({
            "schema": {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "title": "Message",
                        "default": "",
                        "required": true
                    },
                }
            },
            "options": {
                "fields": {
                    "message": {
                        "type": "tinymce",
                        "options": {
                            "toolbar": 'undo redo | bold italic underline strikethrough | fontselect fontsizeselect | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | fullscreen preview | link | ltr rtl',
                            "plugins": 'autoresize preview paste searchreplace autolink autosave save directionality visualblocks visualchars fullscreen link table hr pagebreak nonbreaking toc insertdatetime advlist lists wordcount textpattern noneditable help',
                            "menubar": 'file edit view insert format tools table help'
                        },
                    },
                },
                "form": {
                    "buttons": {
                        "submit": {
                            "title": "Send Message",
                            "click": (form, e) => {
                                form.refreshValidationState(true);
                                if (!form.isValid(true)) {
                                    form.focus();
                                    return;
                                }

                                if (!this.recipients.activeRecipient) {
                                    $(document).Toasts('create', {
                                        class: 'bg-warning',
                                        title: 'Error sending message',
                                        body: 'You must select a recipient before you can send a message.',
                                        autoHide: true,
                                        delay: 10000,
                                        icon: '',
                                    });
                                    return;
                                }

                                var value = form.getValue();
                                value.to = this.recipients.activeRecipient.host;
                                value.toFriendly = this.recipients.activeRecipient.label;

                                this.send(value, (success) => {
                                    if (success) {
                                        form.clear();
                                    }
                                });
                            }
                        }
                    }
                }
            },
        });
    }

    // Initialize connection. Call this on socket connect event.
    init () {
        this.replaceData(this.requests.host, this.endpoints.get, this.data.get);
    }

    /**
     * Send a message via WWSU API.
     * 
     * @param {object} data Data to pass to WWSU API
     * @param {?function} cb Callback function after request is completed.
     */
    send (data, cb) {
        try {
            this.requests.host.request({ method: 'post', url: this.endpoints.send, data }, (response) => {
                if (response !== 'OK') {
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Error sending message',
                        body: 'There was an error sending the message. Your DJ Controls might not be allowed to send messages to website visitors or display signs when you are not on the air. If this is not the case, please contact the engineer.',
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
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error sending message',
                body: 'There was an error sending the message. Please report this to the engineer.',
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
     * Remove a message via WWSU API.
     * 
     * @param {object} data Data to pass to WWSU API
     * @param {?function} cb Callback function after request is completed.
     */
    remove (data, cb) {
        try {
            this.requests.host.request({ method: 'post', url: this.endpoints.remove, data }, (response) => {
                if (response !== 'OK') {
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Error removing message',
                        body: 'There was an error removing the message. Your DJ Controls might not be allowed to remove messages when you are not on the air. If this is not the case, please contact the engineer.',
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
        } catch (e) {
            $(document).Toasts('create', {
                class: 'bg-danger',
                title: 'Error removing message',
                body: 'There was an error removing the message. Please report this to the engineer.',
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

    // Call WWSUrecipients._updateTable but provide number of unread messages.
    updateRecipientsTable () {
        var recipients = [];
        var unreadMessages = 0;

        // Check number of unread messages for each recipient
        this.recipients.find().forEach((recipient) => {
            recipient.unreadMessages = 0;
            this.find({ from: recipient.host, status: 'active' }).forEach((message) => {
                if ((message.to === 'DJ' || message.to === 'DJ-private' || message.to === this.hosts.recipient.host) && this.read.indexOf(message.ID) === -1) {
                    recipient.unreadMessages++;
                    unreadMessages++;

                    // Notify new messages
                    if (!this.firstLoad && this.notified.indexOf(message.ID) === -1) {
                        this.notified.push(message.ID);
                        this.emitEvent('newMessage', [ message ]);
                    }
                }
            });
            recipients.push(recipient);
        });

        // Update table
        this.recipients._updateTable(recipients);

        // Update unread messages stuff
        if (unreadMessages <= 0) {
            $(this.menuNew).html(`0`);
            $(this.menuNew).removeClass(`badge-danger`);
            $(this.menuNew).addClass(`badge-secondary`);
            $(this.menuIcon).removeClass(`nav-icon-flash-success`);
        } else {
            $(this.menuNew).html(unreadMessages);
            $(this.menuNew).removeClass(`badge-secondary`);
            $(this.menuNew).addClass(`badge-danger`);
            $(this.menuIcon).addClass(`nav-icon-flash-success`);
        }
        this.firstLoad = false;
    }

    /**
     * Call this whenever recipientChanged is emitted from WWSUrecipients.
     * 
     * @param {?object} recipient The recipient that was selected (null: no recipient)
     */
    changeRecipient (recipient) {
        var util = new WWSUutil();
        this.animations.add('change-recipient', () => {
            if (!recipient) {
                $(this.chatActiveRecipient).html(`(Select a recipient)`);
                $(this.chatStatus).html(`<h5>Select a Recipient</h5>
            <p>Please select a recipient to send a message.</p>`);

                $(this.chatMessages).html(``);

                $(this.chatMute).addClass('d-none');
                $(this.chatBan).addClass('d-none');
            } else {
                $(this.chatActiveRecipient).html(`${jdenticon.toSvg(recipient.host, 24)} ${recipient.label}`);
                $(this.chatStatus).html(`<div class="row">
            <div class="col-6 col-md-4 col-lg-3">
            ${jdenticon.toSvg(recipient.host, 48)}
            </div>
            <div class="col-6 col-md-8 col-lg-9">
            <h5>${recipient.label}</h5>
            <p>
            ${recipient.group === 'website'
                        ?
                        `${recipient.host === 'website'
                            ? `${this.meta.meta.webchat
                                ? `Web messages are active; visitors can send you messages.<br />Messages you send to "Web Public" will be visible by all visitors.`
                                : `Web messages are NOT active; visitors cannot send you messages.`
                            }`
                            : `${this.meta.meta.webchat
                                ? `${recipient.status !== 0
                                    ? `Visitor is currently online and should receive your message.<br />Messages you send will only be visible to this visitor.`
                                    : `Visitor is offline and was last seen ${moment.tz(recipient.time, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('llll')}. They will not receive your message unless they come back online within an hour of you sending your message.<br />Messages you send will only be visible to this visitor.`
                                }`
                                : `Web messages are NOT active; visitors cannot send you messages.`
                            }`
                        }`
                        : `${recipient.status !== 0
                            ? `Computer/host is online. However, this does not necessarily mean someone is around and will see your message.`
                            : `Computer/host is offline and was last seen ${moment.tz(recipient.time, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('llll')}. They will not receive your message unless they come back online within an hour of you sending your message.`
                        }`
                    }</p>
            </div>`);

                var chatHTML = ``;

                var query = [ { from: recipient.host, to: [ this.hosts.client.host, 'DJ', 'DJ-private', this.recipients.recipient.host ] }, { to: recipient.host } ]
                if (recipient.host === 'website') {
                    query = [ { to: [ 'DJ', 'website' ] } ]
                }

                $(this.chatMessages).html(``);

                this.find(query).sort((a, b) => moment(a.createdAt).valueOf() - moment(b.createdAt).valueOf()).map((message) => {
                    chatHTML += `<div class="message" id="message-${message.ID}">
                ${this.messageHTML(message)}
                </div>`;
                    util.waitForElement(`#message-${message.ID}`, () => {
                        $(`#message-${message.ID}`).unbind('click');

                        $(`#message-${message.ID}`).click(() => {
                            if (this.read.indexOf(message.ID) === -1) {
                                this.read.push(message.ID);
                                this.updateRecipient();
                                this.updateRecipientsTable();
                            }
                        });
                    });

                    util.waitForElement(`#message-delete-${message.ID}`, () => {
                        $(`#message-delete-${message.ID}`).unbind('click');

                        $(`#message-delete-${message.ID}`).click(() => {
                            util.confirmDialog(`Are you sure you want to permanently delete this message?`, null, () => {
                                this.remove({ ID: message.ID });
                            });
                        });
                    });

                });

                $(this.chatMessages).html(chatHTML);

                if (recipient.host.startsWith("website-")) {
                    $(this.chatMute).removeClass('d-none');
                    $(this.chatBan).removeClass('d-none');
                } else {
                    $(this.chatMute).addClass('d-none');
                    $(this.chatBan).addClass('d-none');
                }
            }
        });
    }

    /**
     * Generate an HTML block for a message.
     * NOTE: This does NOT return the direct-chat-msg container; you must construct this first.
     * 
     * @param {object} message The message
     * @returns {string} The HTML for this message
     */
    messageHTML (message) {

        // Message was from this host
        if (message.from === this.recipients.recipient.host) {
            return `<div class="direct-chat-msg right">
            <div class="direct-chat-infos clearfix">
              <span class="direct-chat-name float-right">YOU -> ${message.toFriendly}</span>
              <span class="direct-chat-timestamp float-left">${moment.tz(message.createdAt, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('hh:mm A')} <i class="fas fa-trash" id="message-delete-${message.ID}"></i></span>
            </div>
            <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(message.from, 40)}</div>
            <div class="direct-chat-text bg-success">
                ${message.message}
            </div>
        </div>`
        } else {
            // Unread message
            if (this.read.indexOf(message.ID) === -1) {
                return `<div class="direct-chat-msg">
                <div class="direct-chat-infos clearfix">
                  <span class="direct-chat-name float-left">${message.fromFriendly} -> ${message.toFriendly}</span>
                  <span class="direct-chat-timestamp float-right">${moment.tz(message.createdAt, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('hh:mm A')} <i class="fas fa-trash" id="message-delete-${message.ID}"></i></span></span>
                </div>
                <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(message.from, 40)}</div>
                <div class="direct-chat-text bg-danger">
                    ${message.message}
                </div>
            </div>`
                // Read message
            } else {
                return `<div class="direct-chat-msg">
                <div class="direct-chat-infos clearfix">
                  <span class="direct-chat-name float-left">${message.fromFriendly} -> ${message.toFriendly}</span>
                  <span class="direct-chat-timestamp float-right">${moment.tz(message.createdAt, this.meta ? this.meta.meta.timezone : moment.tz.guess()).format('hh:mm A')} <i class="fas fa-trash" id="message-delete-${message.ID}"></i></span></span>
                </div>
                <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(message.from, 40)}</div>
                <div class="direct-chat-text bg-secondary">
                    ${message.message}
                </div>
            </div>`
            }
        }
    }

    // Call this on any changes to messages or the active recipient
    updateRecipient () {
        this.changeRecipient(this.recipients.activeRecipient);
    }
}