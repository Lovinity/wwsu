// This class manages messages/chat from a website / listener level.
// NOTE: event also supports 'newMessage' emitted when a new message is received that should be notified.

class WWSUmessagesweb extends WWSUdb {

    /**
     * The class constructor.
     * 
     * @param {sails.io} socket The sails.io socket connected to the WWSU API.
     * @param {WWSUmeta} meta initialized WWSU meta class
     * @param {WWSUrecipientsweb}
     */
    constructor(socket) {
        super();

        this.endpoints = {
            get: '/messages/get',
            remove: '/messages/remove',
            send: '/messages/send'
        };
    }
}