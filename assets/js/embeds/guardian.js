/* global io */

var Meta = {line1: '', line2: ''};
var nowPlaying = document.getElementById('nowplaying');

function waitFor(check, callback, count = 0)
{
    if (!check())
    {
        if (count < 10000)
        {
            count++;
            window.requestAnimationFrame(function () {
                waitFor(check, callback, count);
            });
        } else {
        }
    } else {
        callback();
}
}

// Register event handlers when the socket connects
waitFor(function () {
    return (typeof io !== 'undefined' && typeof io.socket !== 'undefined' && io.socket.isConnected());
}, function () {
    io.socket.on('connect', function () {
        doSockets();
    });

    doSockets();

    io.socket.on('meta', function (data) {
        try {
            for (var key in data)
            {
                if (data.hasOwnProperty(key))
                {
                    Meta[key] = data[key];
                }
            }
            doMeta(data);
        } catch (e) {
            console.error(e);
        }
    });
});

// Load web player
jQuery(function () {
    $("#nativeflashradio").flashradio({
        userinterface: "small",
        backgroundcolor: "#ffffff",
        themecolor: "#000000",
        themefontcolor: "#000000",
        startvolume: "100",
        radioname: ``,
        scroll: "auto",
        autoplay: "false",
        useanalyzer: "real",
        analyzertype: "6",
        usecover: "true",
        usestreamcorsproxy: "true",
        affiliatetoken: "1000lIPN",
        debug: "false",
        ownsongtitleurl: "",
        radiocover: "http://server.wwsu1069.org/images/embeds/logo.png",
        songgooglefontname: "",
        songfontname: "",
        titlegooglefontname: "",
        titlefontname: "",
        corsproxy: "https://html5radioplayer2us.herokuapp.com/?q=",
        streamprefix: "/stream",
        mountpoint: "",
        radiouid: "",
        apikey: "",
        streamid: "1",
        streampath: "/live",
        streamtype: "other",
        streamurl: "http://server.wwsu1069.org",
        songinformationinterval: "5000"
    });
});

// Change the theme when the player loads
waitFor(function () {
    return (document.querySelector(`#nativeflashradioplaystopcontainer`) !== null && document.querySelector(`#nativeflashradioplaybutton`) !== null && document.querySelector(`#nativeflashradioimagecontainer`) !== null && document.querySelector(`#nativeflashradiovolumecontroller`) !== null);
}, function () {
    $("#nativeflashradioplaystopcontainer").css("background-color", "rgb(255, 255, 255);");
    $("#nativeflashradioplaybutton").css("fill", "rgb(0, 0, 0);");
    $("#nativeflashradioimagecontainer").css("border", "rgb(255, 255, 255);");
    $("#nativeflashradioimagecontainer").css("background-color", "rgb(255, 255, 255);");
    $("#nativeflashradiovolumecontroller").css("background-color", "rgb(255, 255, 255);");
});

// Make a call to the meta/get API endpoint
function doSockets()
{
    io.socket.post('/meta/get', {}, function serverResponded(body, JWR) {
        try {
            for (var key in body)
            {
                if (body.hasOwnProperty(key))
                {
                    Meta[key] = body[key];
                }
            }
            doMeta(body);
        } catch (e) {
            //console.error(e);
            setTimeout(doSockets, 10000);
        }
    });
}

// Display meta as it's received
function doMeta(response)
{
    try {
        if ('line1' in response || 'line2' in response)
        {
            nowPlaying.innerHTML = `${Meta.line1}<br />${Meta.line2}`;
        }
    } catch (e) {
        console.error(e);
    }
}


