# WWSU 4.0.alpha
The WWSU Radio Sails.js API application enables external / remote control of core WWSU functionality. Applications can be developed utilizing this API. 

This application was re-developed from the version 3 application using Sails.js v1. Currently, this is in Alpha stage, which means not everything from version 3 has been ported to version 4 yet. Furthermore, this should be considered a non-working build until Beta stage.

## Websockets
Several of the API endpoints, as noted in their respective section of this documentation, can be called using a socket request. When the request is a socket, the client will be subscribed to receive changes. Unless otherwise specified, all websocket messages are sent as an event containing the same name as the top level endpoint, in all lowercase (For example, anything under Messages will be sent as a socket event named "messages"). The data sent to the event follows the following format, designed to be used in conjunction with nedb:
### Insert

    {
	    "insert": {
		    // Attributes of the created record, including the ID, will be contained here.
		}
	}
### Update

    {
	    "update": {
		    // Attributes of the updated record will be contained here. Clients are advised to use update.ID as the "where" when updating records.
	    }
	}
### Remove

    {
	    "remove": 1 // The ID number of the record to be removed
	}
**Endpoints in this documentation which indicate they support sockets and do not specify a format are assumed to use the above standard.**
## Responses
All API endpoints explained below will respond with something. In addition to the responses documented in the respective sections, endpoints may also respond with any of the following:

 - 400 An error object, containing code (string), problems (array of strings), and message (string).
 - 401 `{"err": "Invalid Token!"}`
 - 403 `{"discipline": "Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: (reference numbers here separated by comma)"}` 
 - 404 "Not Found"
 - 500 Internal Server Error

## User [/user]
### /user/auth Authorization [POST /user/auth]
A lot of API endpoints require a valid authorization in the form of a header. The endpoints which require authorization will be noted in their respective section.
The key is "authorization", and the value is "Bearer (token)". 
Use the /user/auth endpoint to authenticate and get a token.
User accounts are issued by WWSU. They are not available on request.
#### Request
| key | criteria |
|--|--|
| email | string (required; the email of the authenticating user) |
| password | string (required; the password of the authenticating user) |
#### Response 200

            {
             "user": {
                 "email": "null@example.com",
                 "id": 0,
                  "createdAt": "2018-02-15T18:00:01.000Z",
                  "updatedAt": "2018-02-15T18:00:01.000Z"
              },
          "token": "authorization token here"
        }
#### Response 401

            {
            "err": "Email and password required."
	        }
## Directors [/directors]
The Directors endpoints regard the directors of WWSU Radio.
### /directors/get [GET /directors/get]
Get an array of directors. If a username is provided, will filter according to the provided username. Otherwise, will return all directors.
This endpoint supports sockets, uses the "directors" event, and returns data in the structure defined in the websockets section.
#### Request
| key | criteria |
|--|--|
| username | string (optional; the OpenProject username of the director to return) |

#### Response 200

    [
            "George Carlin": { // Full name of the director as key
                "position": "General Manager", // Director's occupation with WWSU
                "present": false, // False = clocked out, True = clocked in
                "since": "2018-04-30T19:51:16.000Z" // Time at which present last changed
            },
			...
    ]
#### Response 404
## Discipline [/discipline]
The discipline endpoints regard moderation for public clients (website and app users).
### /discipline/ban-show [POST /discipline/ban-show]
Bans the specified user until the currently live DJ/broadcast ends. Also mass deletes all website messages sent by the specified user.
**Requires authorization**
#### Request
|key|criteria|
|--|--|
| host | string (required; the unique ID assigned to the client to be issued the discipline) |
#### Response 200 OK
#### Response 500
### /discipline/ban-day [POST /discipline/ban-day]
Bans the specified user for 24 hours. Also mass deletes all website messages sent by the specified user.
**Requires authorization**
#### Request
|key|criteria|
|--|--|
| host | string (required; the unique ID assigned to the client to be issued the discipline) |
#### Response 200 OK
#### Response 500
### /discipline/ban-indefinite [POST /discipline/ban-indefinite]
Bans the specified user indefinitely. Also mass deletes all website messages sent by the specified user.
**Requires authorization**
#### Request
|key|criteria|
|--|--|
| host | string (required; the unique ID assigned to the client to be issued the discipline) |
#### Response 200 OK
#### Response 500
## Display [/display]
These endpoints regard the display signs for WWSU. Although they are publicly accessible, they were not meant for general public use.
### /display/public [GET /display/public]
Get the public display sign as HTML webpage; to be run in full screen on the display monitor.
#### Response 200 (text/html)
### /display/internal [GET /display/internal]
Get the internal display sign as HTML webpage; to be run in full screen on the display monitor. This is for directors and members of the WWSU organization.
#### Response 200 (text/html)
### /display/refresh [GET /display/refresh]
Send a refresh signal to all connected display signs via websockets. 
**Requires authorization**.
#### Response 200 OK
## Eas [/eas]
Eas endpoints regard the internal WWSU emergency alert system. **These endpoints do not have anything to do with the SAGE Digital ENDEC**; this is internal only.
### /eas/get [GET /eas/get]
Get an array of currently active alerts. 
This endpoint supports sockets, uses the "eas" event, and returns data in the structure defined in the websockets section.
#### Response 200
        [
            {
                "createdAt": "2018-05-07T02:00:12.350Z",
                "updatedAt": "2018-05-07T02:00:12.367Z",
                "ID": 12,
                "source": "WWSU", // The ID of the source the alert originates from; typically WWSU or NWS.
                "reference": "1525658412343", // A unique ID assigned by the source for this alert.
                "alert": "Test", // The alert event
                "information": "This is a test of the WWSU Emergency Alert System.", // Information and action instructions regarding the alert.
                "severity": "Extreme", // Can be one of the following in order from most to least severe: Extreme, Severe, Moderate, Minor.
                "color": "#FFFFFF", // Hexadecimal color representing the alert
                "counties": "Clark, Greene, Montgomery", // Comma separated list of counties affected by the alert. Clark, Greene, and Montgomery counties of Ohio are the only ones in the WWSU coverage.
                "starts": "2018-05-07T02:00:12.343Z", // ISO string when the alert begins
                "expires": "2018-05-07T02:03:12.343Z", // ISO string when the alert expires
                "push": false // Internal use only
            },
            ...
        ]
### /eas/send [POST /eas/send]
Issue a new alert through the internal emergency alert system, originating from source WWSU. **Requires authorization**
#### Request
| key | criteria |
|--|--|
| counties | string (required; comma separated list of counties affected by the alert) |
| alert | string (required; the alert event / title) |
| severity | string (required; Must be in: ['Extreme', 'Severe', 'Moderate', 'Minor'] |
| color | string (required; a hexadecimal color representing the alert. Mainly used on the display signs.) |
| information | string (required; additional information, and instructions, for the public.) |
| starts | string (optional; a moment.js compatible start date/time of the alert. Defaults to now.) |
| expires | string (optional; a moment.js compatible date/time which the alert expires. Defaults to 15 minutes from now.) |
#### Response 200 OK
### /eas/test [POST /eas/test]
Send out a test through the internal emergency alert system. **Requires authorization**
#### Response 200 OK
## Events [/events]
Events endpoints regard the Google Calendar events of WWSU Radio (such as show and genre schedules / programming).
### /events/get [GET /events/get]
Get an array of events for the next 7 days, in no particular order (client will need to do their own sorting).
This endpoint supports sockets, uses the "events" event, and returns data in the structure defined in the websockets section.
#### Response 200
        [
            {
                "createdAt": "2018-05-15T22:31:34.381Z",
                "updatedAt": "2018-05-15T22:31:34.381Z",
                "ID": 1,
                "unique": "578vfod7icjde4ikdbmtii9ren_20180516T080000Z", // Unique event ID as provided by Google Calendar
                "title": "Genre: New Rock", // Title of the event
                "description": "", // Description of the event, if provided (HTML is stripped from the Google Calendar API field)
                "allDay": false, // True if this is an all day event
                "start": "2018-05-16T04:00:00-04:00", // ISO string of the event start time
                "end": "2018-05-16T08:00:00-04:00", // ISO string of the event end time
                "color": "#5484ed", // Hexadecimal color representing this event
                "push": false // Internal use only
            },
            ...
        ]
## Messages [/messages]
Messages endpoints regard the internal WWSU messaging system.
### /messages/find-recipients [GET /messages/find-recipients]
Retrieve an array of recipients that can receive and send messages.
This endpoint supports sockets and returns data in the structure defined in the websockets section. However, it uses the "recipients" event instead of the "messages" event.
#### Response 200

    [
	    {
		    "createdAt": "2018-05-15T22:31:34.381Z",
            "updatedAt": "2018-05-15T22:31:34.381Z",
		    "ID": 1,
		    "group": "system", // Each recipient can be grouped together by the group
		    "name": "emergency", // A key identifier of the recipient
		    "label": "Technical Issues", // A human friendly label for the recipient
		    "status": 1, // 1 = red (active issue), used by emergency, 2 = yellow (online), used by the computers and display groups, 3 = unused, 4 = blue (pending request), used by track requests, 5 = green (online), used by public clients, 0 = gray (offline / none)
		    "time": "2018-05-15T22:31:34.381Z" // ISO string of the last time the recipient was active.
		},
		...
    ]
### /messages/read [GET /messages/read]
Retrieve an array of messages sent within the last hour. Used by internal WWSU applications. **Requires authorization**.
This endpoint supports sockets, uses the "messages" event, and returns data in the structure defined in the websockets section.
#### Request
| key | criteria |
|--|--|
| host | string (required; typically the hostname of the computer; is defined in the Hosts model, or created automatically if not defined.) |
#### Response 200
        [
            {
                "createdAt": "2018-05-03T23:18:41.089Z",
                "updatedAt": "2018-05-03T23:18:41.089Z",
                "ID": 1,
                "status": "active", // Only active-status messages are returned
                "from": "Me", // Host who sent the message
                "from_friendly": "Me", // Human friendly name of the host who sent the message
                "to": "You", // Host which is directed at by the message.
                "to_friendly": "You too", // Human friendly name of the host which is directed at by the message
                "message": "hi" // The message
            },
            ...
        ]
### /messages/read-web [GET /messages/read-web]
Retrieve a list of messages sent within the last hour applicable to web and mobile users.
This endpoint supports sockets. When called by a socket, the client will be subscribed to multiple events:

 - The "messages" event receives new/updated/deleted messages using the structure defined in the websockets section.
 - The "discipline" event receives data when discipline has been issued to the client. The data received is `{"discipline": "A message regarding the discipline issued"}`. When discipline is issued, several endpoints will respond with a 403 until the discipline expires.

#### Response 200
        [
            {
                "createdAt": "2018-05-03T23:18:41.089Z",
                "updatedAt": "2018-05-03T23:18:41.089Z",
                "ID": 1,
                "status": "active",
                "from": "Me", // Messages from other web/mobile clients will begin with "website-"
                "from_friendly": "Me",
                "to": "website", // "website" = all web/mobile clients, "website-(hostid)" = specific web/mobile client, "DJ" = Public message to the DJ viewable by all public clients, "DJ-private" = Private message to the DJ
                "to_friendly": "You too",
                "message": "hi"
            },
            ...
        ]
### /messages/send [POST /messages/send]
Sends a message. This is used by internal WWSU clients. **Requires authorization**
#### Request
| key | criteria |
|--|--|
| from | string (required; host ID of the client sending the message) |
| to | string (required; host ID of the client which is targeted by the message) |
| to_friendly | string (required; The human friendly label of the client which is targeted by the message) |
| message | string (required; the message to send) |
#### Response 200 OK
### /messages/send-web [POST /messages/send-web]
Sends a message. This is used by public web and mobile clients.
#### Request
| key | criteria |
|--|--|
| message | string (required; the message to send) |
| private | boolean (required; true if this message is only for the DJ and not for other public clients) |
| nickname | string (optional; A human friendly name for the client) |
#### Response 200 OK
## Meta [/meta]
Meta endpoints regard metadata, or what is currently playing / on the air.
### /meta/get [GET /meta/get]
Get the current meta as an object.
This endpoint supports sockets under the "meta" event. However, the data sent is an object containing only the changed key: value pairs. This should be used with lodash merge to merge received changes with the meta stored in memory. There will never be new or deleted keys sent through sockets.
#### Response 200
        {
            "state": 'unknown', // State of the WWSU system. Refer to the states section in meta
            "dj": '', // If someone is on the air, name of the host
            "track": '', // Currently playing track either in automation or manually logged
            "trackstamp": null, // An ISO string used as a marker for when a manual track was logged. Clients displaying manual tracks should consider the track old if this is 10 or more minutes ago from now.
            "topic": '', // If the DJ specified a show topic, this is the topic.
            "stream": '', // Meta artist - title for the internet radio stream
            "radiodj": '', // REST IP of the RadioDJ instance currently in control
            "djcontrols": '', // Hostname of the computer in which has activated the most recent live/sports/remote broadcast via DJ Controls
            "line1": '', // First line of meta for display signs and website
            "line2": '', // Second line of meta for display signs and website
            "percent": 0, // Integer or float between 0 and 100 indicating how far in the current track in automation we are, for display signs
            "time": '', // Human readable date and time of WWSU for display signs
            "listeners": 0, // Number of current online listeners
            "listenerpeak": 0, // Number of peak online listeners
            "queueLength": 0, // Amount of audio queued in radioDJ in seconds (can be a float)
            "breakneeded": false, // If the current DJ needs to take the FCC required top of the hour break, this will be true
            "status": 4, // Overall system status: 1 = major outage, 2 = partial outage, 3 = minor issue, 4 = rebooting, 5 = operational
            "webchat": true, // Set to false to restrict the ability to send chat messages through the website. Clients should forbid the ability to send messages when this is true. /messages/send-web will reject attempts when this is true.
            "playlist": null, // Name of the playlist we are currently airing if any
            "playlist_position": -1, // Current position within the playlist
            "playlist_played": null // ISO string of when the playlist was activated/queued.
        }
### states
The value of the meta state key can be any of the following strings:
| state | description |
|--|--|
| unknown | WWSU's state is currently unknown. |
| automation_on | WWSU is queuing and playing music automatically. |
| automation_genre | WWSU is automatically queuing and playing music from a specific genre. |
| automation_playlist | WWSU is running through a manually-edited playlist of tracks. |
| automation_live | A live show is about to begin. |
| automation_remote | A remote broadcast is about to begin. |
| automation_sports | A sports broadcast, produced in the studio, is about to begin. |
| automation_sportsremote | A sports broadcast, produced remotely, is about to begin. |
| automation_prerecord | A prerecorded show or podcast is about to begin. |
| live_on | A live show is airing. |
| live_break | A live show is on break. |
| live_returning | A live show is about to resume. |
| live_prerecord | A prerecorded show or podcast is currently airing. |
| remote_on | A remote broadcast is currently airing. |
| remote_break | A remote broadcast is taking a break. |
| remote_break_disconnected | A remote broadcast is on break because the remote stream disconnected from WWSU. |
| remote_returning | A remote broadcast is about to resume. |
| sports_on | A studio-produced sports broadcast is airing. |
| sports_break | A studio-produced sports broadcast is taking a break or is in halftime / injury break. |
| sports_returning | A studio-produced sports broadcast is about to resume. |
| sportsremote_on | A remotely-produced sports broadcast is airing. |
| sportsremote_break | A remotely-produced sports broadcast is taking a break or is in halftime / injury break. |
| sportsremote_break_disconnected | A remotely-produced sports broadcast is on break because the remote stream disconnected from WWSU. |
| sportsremote_returning | A remotely-produced sports broadcast is about to resume. |
## Requests [/requests]
Requests endpoints regard the WWSU track request system.
### /requests/get [GET /requests/get]
Get an array of requested tracks. **Requires authorization**
This endpoint supports sockets, uses the "requests" event, and returns data in the structure defined in the websockets section. However, it is important to note that a delete is not sent out until the request begins playing; it is not sent out when a request is queued in automation. This is by design.
#### Response 200
        [
            // Response format TBD
        ]
### /requests/place [POST /requests/place]
Place a track request in the system.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID number of the song to queue) |
| name | string (optional; name of the person making the request) |
| message | string (optional; a message to be left regarding the request) |
#### Response 200
        {
            "requested": true, // True if the track request was accepted, false if it was rejected (such as it is already in the queue, or it fails rotation rules)
            "HTML": `<div class="alert alert-success" role="alert">
                                            Request placed! In automation, requests are queued every :20, :40, and :00 past the hour. If a show is live, it is up to the host's discretion of when/if to play requests.
                                            </div>` // a bootstrap-compatible HTML message.
        }
### /requests/queue [POST /requests/queue]
Immediately queue or play a request. If in automation, will queue it to the top. If live / sports / remote / sportsremote, will queue and immediately begin playing it. **Requires authorization**
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the request (NOT the song ID!) to queue now) |
#### Response 200 boolean
true if the track was queued, false if the track was not queued. A track may fail to queue if it is already in the queue, or it fails track rotation rules.
## Status [/status]
Status endpoints refer to the status of WWSU subsystems.
### /status/get [GET /status/get]
Get an array of the status of WWSU subsystems.
This endpoint supports sockets, uses the "status" event, and returns data in the structure defined in the websockets section.
#### Response 200
        [
			{
				"createdAt": "2018-05-15T22:31:34.381Z",
				"updatedAt": "2018-05-15T22:31:34.381Z",
				"ID": 1,
				"name": "database", // alphanumeric key ID of the subsystem
				"label": "Database", // Human friendly name of the subsystem
				"status": 5, // 1 = critical issue, 2 = significant issue, 3 = minor issue, 4 = offline (no issue), 5 = online (no issue)
				"time": "2018-05-15T22:31:34.381Z" // ISO String indicating the most recent time the subsystem was detected as status 5.
			},
			...
        ]