/* global WWSUdb */

// This class manages directors from WWSU.
class WWSUdirectors extends WWSUdb {

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

    init () {
        this.replaceData(this.requests.no, this.endpoints.get, this.data.get);
    }
}