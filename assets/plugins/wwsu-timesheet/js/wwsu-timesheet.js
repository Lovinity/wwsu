/* global WWSUdb */

// This class manages director timesheets from WWSU.
class WWSUtimesheet extends WWSUdb {

    /**
     * Construct the class.
     * 
     * @param {sails.io} socket WWSU socket connection
     * @param {WWSUreq} noReq Request without authorization
     */
    constructor(socket, noReq) {
        super(); // Create the db

        this.endpoints = {
            get: '/timesheet/get'
        };
        this.data = {
            get: {}
        };
        this.requests = {
            no: noReq
        };

        this.assignSocketEvent('timesheet', socket);
    }

    // Initialize timesheets. Call this on socket connect event.
    init () {
        this.replaceData(this.requests.no, this.endpoints.get, this.data.get);
    }
}