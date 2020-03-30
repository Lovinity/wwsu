/* global WWSUdb */

// This class manages directors from WWSU.
class WWSUdirectors extends WWSUdb {

    /**
     * Construct the directors.
     * 
     * @param {sails.io} socket The socket connection to WWSU
     * @param {WWSUreq} noReq A request with no authorization
     */
    constructor(socket, noReq) {
        super(); // Create the db

        this.endpoints = {
            get: '/directors/get'
        };
        this.data = {
            get: {}
        };
        this.requests = {
            no: noReq
        };

        this.assignSocketEvent('directors', socket);
    }

    // Initialize the directors class. Call this on socket connect event.
    init () {
        this.replaceData(this.requests.no, this.endpoints.get, this.data.get);
    }
}