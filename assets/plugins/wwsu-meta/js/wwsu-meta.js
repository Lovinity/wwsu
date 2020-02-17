/* global EventEmitter */

// This class handles WWSU metadata
class WWSUMeta {

    constructor(socket, request) {
        this.endpoint = '/meta/get';

        this.meta = { time: moment().toISOString(true), history: [], webchat: true, state: 'unknown' }
        this.events = new EventEmitter();
        this.request = request;

        // Tick this.meta.time every second
        this.tick;
        this.resetTick();

        // Add meta socket event
        socket.on('meta', (data) => {
            for (var key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    this.meta[ key ] = data[ key ]
                }
            }
            this.resetTick();
            this.events.emitEvent('newMeta', [data, this.meta]);
        })

        this.init();
    }

    // Initialize function; should be called in socket.on('connect').
    init() {
        this.request.request({ method: 'POST', url: this.endpoint, data: {} }, (body) => {
            try {
                for (var key in body) {
                    if (Object.prototype.hasOwnProperty.call(body, key)) {
                        this.meta[ key ] = body[ key ]
                    }
                }
                this.events.emitEvent('newMeta', [body, this.meta]);
            } catch (e) {
                setTimeout(this.init, 10000);
            }
        })
    }

    // Event handler. Supported events: newMeta([updatedMeta, entireMeta]), metaTick([entireMeta])
    on(event, fn) {
        this.events.on(event, fn);
    }

    get meta() {
        return this.meta;
    }

    resetTick() {
        clearInterval(this.tick);
        this.tick = setInterval(() => {
            this.meta.time = moment(this.meta.time).add(1, 'seconds');
            this.events.emitEvent('metaTick', [this.meta]);
        }, 1000);
    }

}