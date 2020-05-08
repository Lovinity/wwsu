/* global WWSUdb */

// This class manages announcements from WWSU.
class WWSUannouncements extends WWSUdb {

    /**
     * Create the announcements class.
     * 
     * @param {sails.io} socket Socket connection to WWSU
     * @param {WWSUreq} noReq Request class with no authorization
     * @param {array} types Array of announcement types to subscribe to
     */
    constructor(socket, noReq, types) {
        super(); // Create the db

        this.endpoints = {
            get: '/announcements/get'
        };
        this.data = {
            get: { types: types }
        };
        this.requests = {
            no: noReq
        };

        this.assignSocketEvent('announcements', socket);
    }

    // Initialize the connection and get initial data; should be called on socket connect event.
    init () {
        this.replaceData(this.requests.no, this.endpoints.get, this.data.get);
    }
}