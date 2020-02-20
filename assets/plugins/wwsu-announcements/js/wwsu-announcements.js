/* global WWSUdb */

// This class manages announcements from WWSU.
class WWSUannouncements extends WWSUdb {

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

    init () {
        this.replaceData(this.requests.no, this.endpoints.get, this.data.get);
    }
}