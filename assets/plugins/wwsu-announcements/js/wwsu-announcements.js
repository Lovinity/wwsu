/* global WWSUdb */

// This class manages announcements from WWSU.
class WWSUannouncements extends WWSUdb {

    /**
     * Create the announcements class.
     * 
     * @param {sails.io} socket Socket connection to WWSU
     * @param {WWSUreq} noReq Request class with no authorization
     * @param {string} type Type of announcements to retrieve
     */
    constructor(socket, noReq, type) {
        super(); // Create the db

        this.endpoints = {
            get: '/announcements/get'
        };
        this.data = {
            get: { type: type }
        };
        this.requests = {
            no: noReq
        };

        this.assignSocketEvent('announcement', socket);
    }

    // Initialize the connection and get initial data; should be called on socket connect event.
    init () {
        this.replaceData(this.requests.no, this.endpoints.get, this.data.get);
    }
}