var audio = document.querySelector('#player')
var playButton = document.querySelector('#play')
var pauseButton = document.querySelector('#pause')
var metaBox = document.querySelector('#meta')
var Meta = { line1: '', line2: '' }
var displayingLine1 = true



function startAudio () {
    playButton.style.display = "none"
    pauseButton.style.removeProperty('display')
    audio.src = "https://server.wwsu1069.org/stream";
    audio.volume = 0.8;
    audio.play();
}

function stopAudio () {
    pauseButton.style.display = "none"
    playButton.style.removeProperty('display')
    audio.pause();
}

setInterval(() => {
    if (displayingLine1 && Meta.line2 !== "") {
        metaBox.innerHTML = Meta.line2;
        displayingLine1 = false;
    } else {
        metaBox.innerHTML = Meta.line1;
        displayingLine1 = true;
    }
}, 5000);

function waitFor (check, callback, count = 0) {
    if (!check()) {
        if (count < 10000) {
            count++
            window.requestAnimationFrame(() => {
                waitFor(check, callback, count)
            })
        } else {
        }
    } else {
        return callback()
    }
}

// Register event handlers when the socket connects
waitFor(() => {
    return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && io.socket.isConnected())
}, () => {
    io.socket.on('connect', () => {
        doSockets()
    })

    doSockets()

    io.socket.on('meta', (data) => {
        try {
            for (var key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    Meta[ key ] = data[ key ]
                }
            }
        } catch (e) {
            console.error(e)
        }
    })
})

// Make a call to the meta/get API endpoint
function doSockets () {
    io.socket.post('/meta/get', {}, function serverResponded (body) {
        try {
            for (var key in body) {
                if (Object.prototype.hasOwnProperty.call(body, key)) {
                    Meta[ key ] = body[ key ]
                }
            }
        } catch (unusedE) {
            // console.error(e);
            setTimeout(doSockets, 10000)
        }
    })
}