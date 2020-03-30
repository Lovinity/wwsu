/* global TAFFY */

// This class manages calendar subscriptions

// TODO: fix removal to allow removing unique or ID individually.
// TODO: Extend with WWSUdb. (??)
class WWSUsubscriptions {

    /**
     * Construct the class.
     * 
     * @param {sails.io} socket WWSU socket connection
     * @param {WWSUreq} request Request without authorization
     */
    constructor(socket, request) {
        this.endpoints = { 
            get: '/subscribers/get-web', 
            subscribe: '/subscribers/add', 
            unsubscribe: '/subscribers/remove' 
        };
        this.request = request;
        this.events = new EventEmitter();
        this.device = null;

        this.subscriptions = TAFFY();
    }

    // Initialize subscriptions with the provided device ID, or null if no device.
    init (device = null) {
        this.device = device;
        this.request.request({ method: 'POST', url: this.endpoints.get, data: { device: device } }, (body) => {
            try {
                this.subscriptions = TAFFY()
                this.subscriptions.insert(body)
                this.events.emitEvent('subscriptions', [ body ]);
            } catch (e) {
                setTimeout(this.init, 10000);
            }
        });
    }

    /**
     * Listen for an event.
     * 
     * @param {string} event Event to listen: subscriptions([array of all subscriptions]), newSubscription(insert query, [array of all subscriptions]), removedSubscription(uniqueEvent, calendarID, [array of all current subscriptions])
     * @param {function} fn Function called when the event is fired
     */
    on (event, fn) {
        this.events.on(event, fn);
    }

    /**
     * Count number of subscriptions to an event.
     * 
     * @param {string} unique Unique schedule string of specific event
     * @param {number} calendar Calendar ID
     * @returns {number} Number of subscriptions made to either the unique individual event or the calendar ID as a whole
     */
    countSubscribed (unique, calendar) {
        return this.subscriptions([ { type: `calendar-once`, subtype: `${unique}` }, { type: `calendar-all`, subtype: `${calendar}` } ]).get().length;
    }

    /**
     * Subscribe to an event
     * 
     * @param {string} type calendar-once for single occurrence, or calendar-all for all occurrences
     * @param {string} subtype occurrence unique string for calendar-once type, or calendar ID for calendar-all type
     */
    subscribe (type, subtype) {
        this.request.request({ method: 'POST', url: this.endpoints.subscribe, data: { device: this.device, type, subtype } }, (response) => {
            try {
                if (response !== 'OK') {
                    $(document).Toasts('create', {
                        class: 'bg-warning',
                        title: 'Subscription failed',
                        body: 'Unable to subscribe you to that event at this time. Please contact engineer@wwsu1069.org.',
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                } else {
                    $(document).Toasts('create', {
                        class: 'bg-success',
                        title: 'Subscribed!',
                        autohide: true,
                        delay: 30000,
                        body: '<p>You were successfully subscribed! You will be notified through your web browser when the event goes on the air or the time changes / is canceled.</p><p>You may stop receiving notifications if you go longer than a month without visiting the WWSU listener corner.</p>',
                        icon: 'fas fa-bell fa-lg',
                    });
                    this.subscriptions.insert({ type, subtype: `${subtype}` });
                    this.events.emitEvent('newSubscription', [ { type, subtype: `${subtype}` }, this.subscriptions().get() ]);
                }
            } catch (e) {
                console.error(e);
                $(document).Toasts('create', {
                    class: 'bg-danger',
                    title: 'Subscription failed',
                    body: 'Unable to subscribe you to that event at this time. Please contact engineer@wwsu1069.org.',
                    icon: 'fas fa-skull-crossbones fa-lg',
                });
            }
        })
    }

    /**
     * Unsubscribe from an event.
     * 
     * @param {string} ID Unique string of single occurrence to unsubscribe
     * @param {string} event Calendar ID to unsubscribe all events
     */
    unsubscribe (ID, event) {
        this.request.request({ method: 'POST', url: this.endpoints.unsubscribe, data: { device: this.device, type: `calendar-once`, subtype: ID } }, (response) => {
            try {
                if (response !== 'OK') {
                    $(document).Toasts('create', {
                        class: 'bg-warning',
                        title: 'Un-subscription failed',
                        body: 'Unable to un-subscribe you to that event at this time (calendar-once). Please contact engineer@wwsu1069.org.',
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                } else {
                    this.request.request({ method: 'POST', url: this.endpoints.unsubscribe, data: { device: this.device, type: `calendar-all`, subtype: event } }, (response2) => {
                        try {
                            if (response !== 'OK') {
                                $(document).Toasts('create', {
                                    class: 'bg-warning',
                                    title: 'Un-subscription failed',
                                    body: 'Unable to un-subscribe you to that event at this time (calendar-all). Please contact engineer@wwsu1069.org.',
                                    icon: 'fas fa-skull-crossbones fa-lg',
                                });
                            } else {
                                $(document).Toasts('create', {
                                    class: 'bg-success',
                                    title: 'Un-subscribed!',
                                    autohide: true,
                                    delay: 15000,
                                    body: '<p>You successfully un-subscribed from that event and will no longer receive any notifications for it unless you subscribe again.</p>',
                                    icon: 'fas fa-bell-slash fa-lg',
                                });
                                this.subscriptions({ type: `calendar-once`, subtype: `${ID}` }).remove();
                                this.subscriptions({ type: `calendar-all`, subtype: `${event}` }).remove();
                                this.events.emitEvent('removedSubscription', [ `${ID}`, `${event}`, this.subscriptions().get() ]);
                            }
                        } catch (e) {
                            console.error(e);
                            $(document).Toasts('create', {
                                class: 'bg-danger',
                                title: 'Un-subscription failed',
                                body: 'Unable to un-subscribe you to that event at this time (calendar-all). Please contact engineer@wwsu1069.org.',
                                icon: 'fas fa-skull-crossbones fa-lg',
                            });
                        }
                    })
                }
            } catch (e) {
                console.error(e);
                $(document).Toasts('create', {
                    class: 'bg-danger',
                    title: 'Un-subscription failed',
                    body: 'Unable to un-subscribe you to that event at this time (calendar-once). Please contact engineer@wwsu1069.org.',
                    icon: 'fas fa-skull-crossbones fa-lg',
                });
            }
        })
    }
}