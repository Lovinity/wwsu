// This is a version checker for WWSU apps. This ONLY gets the latest version and download URL. You are expected to handle determining if an update is needed (via WWSUdb event listeners), and notifying of said update, outside this class.

class WWSUversion extends WWSUdb {
	/**
	 * Construct the class
	 *
	 * @param {sails.io} socket The socket connection to WWSU.
	 * @param {string} app The name of the app
	 * @param {WWSUreq} hostReq The WWSUreq with host authorization
	 */
	constructor(socket, app, hostReq) {
		super();

		this.socket = socket;
		this.app = app;

		this.endpoints = {
			check: "/version/check",
		};
		this.requests = {
			host: hostReq,
		};
		this.data = {
			check: { app: this.app },
		};

		this.assignSocketEvent("version", socket);
    }
    
    // Start the connection. Call this in socket connect event.
    init () {
        this.replaceData(this.requests.host, this.endpoints.check, this.data.check);
    }
}
