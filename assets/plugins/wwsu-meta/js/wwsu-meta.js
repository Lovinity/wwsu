/* global EventEmitter */

// This class handles WWSU metadata
class WWSUMeta {

    /**
     * Construct the class
     * 
     * @param {sails.io} socket Socket connection to WWSU
     * @param {WWSUreq} request Request with no authorization
     */
    constructor(socket, request) {
        this.endpoint = '/meta/get';

        this._meta = { time: moment().toISOString(true), history: [], webchat: true, state: 'unknown' }
        this.events = new EventEmitter();
        this.request = request;

        // Tick this.meta.time every second
        this.tick;
        this.resetTick();

        // Add meta socket event
        socket.on('meta', (data) => {
            for (var key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    this._meta[ key ] = data[ key ]
                }
            }
            this.resetTick();
            this.events.emitEvent('newMeta', [data, this._meta]);
        })

        this.init();
    }

    // Initialize function; should be called in socket.on('connect').
    init() {
        this.request.request({ method: 'POST', url: this.endpoint, data: {} }, (body) => {
            try {
                for (var key in body) {
                    if (Object.prototype.hasOwnProperty.call(body, key)) {
                        this._meta[ key ] = body[ key ]
                    }
                }
                this.resetTick();
                this.events.emitEvent('newMeta', [body, this._meta]);
            } catch (e) {
                setTimeout(this.init, 10000);
            }
        });
    }

    /**
     * Listen to an event.
     * 
     * @param {string} event Name of event: newMeta([updatedMeta, entireMeta]), metaTick([entireMeta])
     * @param {function} fn Function to call when the event is fired
     */
    on(event, fn) {
        this.events.on(event, fn);
    }

    /**
     * Get the current meta.
     * 
     * @returns {object} Current WWSU meta information in memory.
     */
    get meta() {
        return this._meta;
    }

    /**
     * Simulate newMeta and fire the newMeta event. Does NOT actually change meta; meta can only be changed by the WWSU socket.
     */
    set meta(data = {}) {
        this.events.emitEvent('newMeta', [data, this._meta]);
    }

    /**
     * Reset the ticker that updates meta.time and fires metaTick every second.
     */
    resetTick() {
        clearInterval(this.tick);
        this.tick = setInterval(() => {
            this._meta.time = moment(this._meta.time).add(1, 'seconds');
            this.events.emitEvent('metaTick', [this._meta]);
        }, 1000);
    }

}