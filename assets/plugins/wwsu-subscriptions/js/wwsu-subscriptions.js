/* global TAFFY */

// This class manages calendar subscriptions

// TODO: fix removal to allow removing unique or ID individually.
class WWSUSubscriptions {

    constructor(socket, request) {
        this.endpoint = { get: '/subscribers/get-web', subscribe: '/subscribers/add', unsubscribe: '/subscribers/remove' };
        this.request = request;
        this.events = new EventEmitter();
        this.device = null;

        this.subscriptions = TAFFY();
    }

    // Initialize subscriptions with the provided device ID, or null if no device
    init (device = null) {
        this.device = device;
        this.request.request({ method: 'POST', url: this.endpoint.get, data: { device: device } }, (body) => {
            try {
                this.subscriptions = TAFFY()
                this.subscriptions.insert(body)
                this.events.emitEvent('subscriptions', [ body ]);
            } catch (e) {
                setTimeout(this.init, 10000);
            }
        });
    }

    // Supports these events: subscriptions([array of all subscriptions]), newSubscription(insert query, [array of all subscriptions]), removedSubscription(uniqueEvent, calendarID, [array of all current subscriptions])
    on (event, fn) {
        this.events.on(event, fn);
    }

    // Count and return the number of subscriptions to an event (both unique and calendar as a whole)
    countSubscribed (unique, calendar) {
        return this.subscriptions([ { type: `calendar-once`, subtype: unique }, { type: `calendar-all`, subtype: `${calendar}` } ]).get().length;
    }

    // Subscribe to an event
    subscribe (type, subtype) {
        this.request.request({ method: 'POST', url: this.endpoint.subscribe, data: { device: this.device, type, subtype } }, (response) => {
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
                    this.subscriptions.insert({ type, subtype });
                    this.events.emitEvent('newSubscription', [ { type, subtype }, this.subscriptions().get() ]);
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

    unsubscribe (ID, event) {
        this.request.request({ method: 'POST', url: this.endpoint.unsubscribe, data: { device: this.device, type: `calendar-once`, subtype: ID } }, (response) => {
            try {
                if (response !== 'OK') {
                    $(document).Toasts('create', {
                        class: 'bg-warning',
                        title: 'Un-subscription failed',
                        body: 'Unable to un-subscribe you to that event at this time (calendar-once). Please contact engineer@wwsu1069.org.',
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                } else {
                    this.request.request({ method: 'POST', url: this.endpoint.unsubscribe, data: { device: this.device, type: `calendar-all`, subtype: event } }, (response2) => {
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
                                this.subscriptions({ type: `calendar-once`, subtype: `${event}` }).remove();
                                this.subscriptions({ type: `calendar-all`, subtype: ID }).remove();
                                this.events.emitEvent('removedSubscription', [ event, ID, this.subscriptions().get() ]);
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