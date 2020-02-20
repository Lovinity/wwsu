/* global WWSUdb */

// This class manages director timesheets from WWSU.
class WWSUtimesheet extends WWSUdb {

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

    init () {
        this.replaceData(this.requests.no, this.endpoints.get, this.data.get);
    }
}