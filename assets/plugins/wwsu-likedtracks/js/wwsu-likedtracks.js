
// This class manages the track liking system
class WWSUlikedtracks {

    constructor(socket, request) {
        this.endpoints = {
            get: '/songs/get-liked',
            like: '/songs/like',
            sendMessage: '/messages/send-web'
        };
        this.request = request;
        this.events = new EventEmitter();

        this._likedTracks = [];
    }

    init () {
        this.request.request({ method: 'POST', url: this.endpoints.get, data: {} }, (body) => {
            try {
                this._likedTracks = body
                this.events.emitEvent('init', [ body ]);
            } catch (unusedE) {
                setTimeout(this.init, 10000)
            }
        })
    }

    // Supports these events: init([array of all tracks liked]), likedTrack(ID of the track liked), likedTrackManual('artist - title of track');
    on (event, fn) {
        this.events.on(event, fn);
    }

    get likedTracks() {
        return this._likedTracks;
    }

    likeTrack (trackID, nickname = ``) {
        // If trackID is a string, send the like as a message to the DJ instead
        if (isNaN(trackID)) {
            if (blocked) return null;
            this.request.request({ method: 'POST', url: this.endpoints.sendMessage, data: { message: `(System Message) This person liked a track you played: ${trackID}`, nickname: nickname, private: false } }, (response) => {
                try {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-warning',
                            title: 'Message Rejected',
                            autohide: true,
                            delay: 15000,
                            body: 'WWSU rejected your message telling the DJ you like that track. This could be because you are sending messages too fast, or you are banned from sending messages.',
                            icon: 'fas fa-skull-crossbones fa-lg',
                        });
                        return null
                    } else {
                        this._likedTracks.push(trackID)
                        this.events.emitEvent('likedTrackManual', trackID);

                        $(document).Toasts('create', {
                            class: 'bg-success',
                            title: 'Track Liked',
                            subtitle: trackID,
                            autohide: true,
                            delay: 10000,
                            body: `<p>You successfully notified the DJ you liked that track!</p>`,
                            icon: 'fas fa-music fa-lg',
                        })
                    }
                } catch (e) {
                    console.error(e);
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Error sending message',
                        body: 'There was an error telling the DJ you liked that track. Please report this to engineer@wwsu1069.org.',
                        icon: 'fas fa-skull-crossbones fa-lg',
                    });
                }
            })
        } else {
            this.request.request({ method: 'POST', url: this.endpoints.like, data: { trackID: trackID } }, (response) => {
                try {
                    if (response !== 'OK') {
                        $(document).Toasts('create', {
                            class: 'bg-warning',
                            title: 'Could Not Like Track',
                            subtitle: trackID,
                            autohide: true,
                            delay: 10000,
                            body: `<p>There was a problem liking that track. Most likely, this track played over 30 minutes ago and cannot be liked.</p>`,
                            icon: 'fas fa-music fa-lg',
                        })
                    } else {
                        this._likedTracks.push(trackID)
                        this.events.emitEvent('likedTrack', trackID);

                        $(document).Toasts('create', {
                            class: 'bg-success',
                            title: 'Track Liked',
                            subtitle: trackID,
                            autohide: true,
                            delay: 10000,
                            body: `<p>You successfully liked a track!</p><p>Tracks people like will play more often on WWSU.</p>`,
                            icon: 'fas fa-music fa-lg',
                        })
                    }
                } catch (unusedE) {
                    $(document).Toasts('create', {
                        class: 'bg-danger',
                        title: 'Track Liking Error',
                        subtitle: trackID,
                        autohide: true,
                        delay: 10000,
                        body: `<p>There was a problem liking that track. Please contact engineer@wwsu1069.org if you are having problems liking any tracks.</p>`,
                        icon: 'fas fa-music fa-lg',
                    })
                }
            })
        }
    }
}