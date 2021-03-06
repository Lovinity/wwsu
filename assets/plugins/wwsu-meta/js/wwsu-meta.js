'use strict';

// This class handles WWSU metadata

// REQUIRES these WWSUmodules: noReq (WWSUreq)
class WWSUMeta extends WWSUevents {
  /**
   * Construct the class
   *
   * @param {WWSUmodules} manager The modules class which initiated this module
   * @param {object} options Options to be passed to this module
   */
  constructor(manager, options) {
    super();
    this.manager = manager;
    this.endpoint = "/meta/get";

    this._meta = {
      time: moment().toISOString(true),
      timezone: moment.tz.guess(),
      history: [],
      webchat: true,
      state: "unknown",
    };

    // Tick this.meta.time every second
    this.tick;
    this.prevTime = moment();
    this.resetTick();

    // Add meta socket event
    this.manager.socket.on("meta", (data) => {
      for (let key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          this._meta[key] = data[key];
          if (key === "time") {
            this.prevTime = moment();
            this.resetTick();
          }
          if (key === "timezone") {
            $('.wwsumeta-timezone-display').html(`Times are shown in the timezone ${data[key]}.`);
          }
          if (key === "trackFinish") {
            this.resetTick();
          }
        }
      }
      this.emitEvent("newMeta", [data, this._meta]);
    });
  }

  // Initialize function; should be called in socket.on('connect').
  init() {
    this.manager.get("noReq").request(
      { method: "POST", url: this.endpoint, data: {} },
      (body) => {
        try {
          for (let key in body) {
            if (Object.prototype.hasOwnProperty.call(body, key)) {
              this._meta[key] = body[key];
              if (key === "time") {
                this.prevTime = moment();
                this.resetTick();
              }
              if (key === "timezone") {
                $('.wwsumeta-timezone-display').html(`Times are shown in the timezone ${body[key]}.`);
              }
              if (key === "trackFinish") {
                this.resetTick();
              }
            }
          }
          this.emitEvent("newMeta", [body, this._meta]);
        } catch (e) {
          console.error(e);
          setTimeout(this.init, 10000);
        }
      }
    );
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
    this.emitEvent("newMeta", [data, this._meta]);
    this.emitEvent("metaTick", [this._meta]);
  }

  /**
   * Reset the ticker that updates meta.time and fires metaTick every second.
   * Instead of adding a second each call (setInterval is not exact), determine time difference between system time and station time, as well as system time difference between now and previous timer fire.
   */
  resetTick() {
    const ticker = () => {
      let diff = moment().diff(this.prevTime);
      this._meta.time = moment
        .parseZone(this._meta.time)
        .add(diff, "milliseconds")
        .toISOString(true);
      this.prevTime = moment();
      this.emitEvent("metaTick", [this._meta]);
    };
    clearTimeout(this.tick);
    clearInterval(this.tick);
    this.tick = setTimeout(() => {
      ticker();
      this.tick = setInterval(() => {
        ticker();
      }, 1000);
    }, 1000 - moment(this._meta.trackFinish || this._meta.time).milliseconds());
  }
}
