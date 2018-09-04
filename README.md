# WWSU 4.1.0
The WWSU Radio Sails.js API application enables external / remote control of core WWSU functionality. Applications can be developed utilizing this API. 

This application was re-developed from the version 3 application using Sails.js v1. Currently, this is in Beta stage, which means although this is a working build, bugs are to be expected.

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
## Announcements [/announcements]
Announcements endpoints regard the internal announcements system at WWSU.
### /announcements/add [POST /announcements/add]
Adds an announcement into the system. **Requires authorization**.
#### Request
| key | criteria |
|--|--|
| type | string (required; the type of announcement, which often dictates what should display the announcement) |
| level | string (required; Severity level. Must be in: ["danger", "urgent", "warning", "info", "success", "primary", "secondary"]) |
| announcement | string (required; The announcement text) |
| starts | string (optional; the ISO moment.js compatible time that the announcement starts. Defaults to now.) |
| expires | string (optional; the ISO moment.js compatible time that the announcement expires. Defaults to the year 3000.) |
#### Response 200
### /announcements/edit [POST /announcements/edit]
Edits an existing announcement. **Requires authorization**.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the announcement to edit) |
| type | string (optional, but edits original value if provided; the type of announcement, which often dictates what should display the announcement) |
| level | string (optional, but edits original value when provided; Severity level. Must be in: ["danger", "urgent", "warning", "info", "success", "primary", "secondary"]) |
| announcement | string (optional, but edits original value if provided; The announcement text) |
| starts | string (optional, but edits original value if provided; the ISO moment.js compatible time that the announcement starts.) |
| expires | string (optional, but edits original value if provided; the ISO moment.js compatible time that the announcement expires.) |
#### Response 200
### /announcements/get [GET /announcements/get]
Get an array of announcements for the provided type.
This endpoint supports sockets, uses the "announcements" event, and returns data in the structure defined in the websockets section.
#### Request
| key | criteria |
|--|--|
| type | string (required; return announcements of the provided type, both in the request and in the websockets) |
#### Response 200
        [
            {
                "createdAt": "2018-05-15T22:31:34.381Z",
                "updatedAt": "2018-05-15T22:31:34.381Z",
                "ID": 1,
				"type": "display-public", // This announcement is applicable to the provided type. Examples: display-public, display-internal, djcontrols, website.
				"level": "info", // Severity level. Must be in: ["danger", "urgent", "warning", "info", "success", "primary", "secondary"].
				"announcement": "Do not forget to do your air checks. They are due August 3.", // The announcement text
				"starts": "2018-05-15T22:31:34.381Z", // ISO string of when the announcement begins.
				"expires": "2018-08-3T22:31:34.381Z" // ISO string of when the announcement expires.
            },
            ...
        ]
### /announcements/remove [POST /announcements/remove]
Removes an announcement. **Requires authorization**.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the announcement to remove.) |
#### Response 200
## Calendar [/calendar]
Calendar endpoints regard the Google Calendar events of WWSU Radio (such as show and genre schedules / programming).
### /calendar/get [GET /calendar/get]
Get an array of events for the next 7 days, in no particular order (client will need to do their own sorting).
This endpoint supports sockets, uses the "calendar" event, and returns data in the structure defined in the websockets section.
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
				"verify": "Valid", // Verification status: Manual (event is not recognized by the system as a trigger), Valid (properly formatted event recognized by the system), Check (Event is valid but may require attention), Invalid (event will not work)
				"verify_message": "", // Additional information regarding the verification status
				"verify_titleHTML": "<span style=\"background: rgba(0, 0, 255, 0.2);\">Genre</span>: <span style=\"background: rgba(0, 255, 0, 0.2);\">New Rock</span>", // HTML formatted title for the calendar/verify page.
                "color": "#5484ed", // Hexadecimal color representing this event
            },
            ...
        ]
### /calendar/verify [GET /calendar/verify]
Returns an HTML page verifying the events in the WWSU Calendar for the next week. Checks for event title syntax, proper formatting, existing playlists/rotations, playlist length, and more. Page also uses calendar/get for populating the verification.
#### Response 200 HTML
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
            {
                "createdAt": "2018-05-15T22:31:34.381Z",
                "updatedAt": "2018-05-15T22:31:34.381Z",
                "ID": 1,
				"login": "george-carlin", // Username from OpenProject
				"name": "George Carlin", // Full name of the director
				"admin": true, // True if this is a super director / admin
				"position": "Seven Dirty Words Manager", // The director's position with WWSU
				"present": false, // True if the director is currently clocked in to WWSU
				"since": "2018-05-15T22:31:34.381Z" // ISO stamp indicating when the director last clocked in or clocked out
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
| host | string (required; the Recipient host to be issued the discipline) |
#### Response 200 OK
#### Response 500
### /discipline/ban-day [POST /discipline/ban-day]
Bans the specified user for 24 hours. Also mass deletes all website messages sent by the specified user.
**Requires authorization**
#### Request
|key|criteria|
|--|--|
| host | string (required; the Recipient host to be issued the discipline) |
#### Response 200 OK
#### Response 500
### /discipline/ban-indefinite [POST /discipline/ban-indefinite]
Bans the specified user indefinitely. Also mass deletes all website messages sent by the specified user.
**Requires authorization**
#### Request
|key|criteria|
|--|--|
| host | string (required; the Recipient host to be issued the discipline) |
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
                "expires": "2018-05-07T02:03:12.343Z" // ISO string when the alert expires
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
## Embeds [/embeds]
Embeds are specially designed pages used for other websites to embed WWSU on their website.
### /embeds/guardian [GET /embeds/guardian]
Retrieve a WWSU web player specially designed for Wright State's Guardian Newspaper website.
#### Response 200 HTML
## Hosts [/hosts]
Hosts endpoints regard DJ Controls instances.
### /hosts/get [POST /hosts/get]
Retrieve information about a host. If the host does not exist in the database, it will be created with default data. **Requires authorization**.
#### Request
| key | criteria |
|--|--|
| host | string (required; name of the host to retrieve or create.) |
#### Response 200
		{
			"createdAt": "2018-05-03T23:18:41.089Z",
            "updatedAt": "2018-05-03T23:18:41.089Z",
			"ID": 1,
			"host": "hostname", // Name of the host
			"friendlyname": "OnAir Computer", // Friendly name to use for labels
			"requests": true, // If true, this client should notify of track requests even when this host was not used to go live
			"emergencies": false, // If true, this client should notify of reported technical issues
			"webmessages": true // If true, this client should notify of messages sent by public clients, even when this host was not used to go live
		}
## Logs [/logs]
Logs endpoints regard the internal logging system.
### /logs/add [POST /logs/add]
Add a log into the system. **Requires authorization**
#### Request
| key | criteria |
|--|--|
| date | string (optional; a moment.js parsable string containing the date this log took place. Defaults to now.) |
| logtype | string (required; type of log. It is recommended to use "operation" for Node logs, "automation" for automation logs, and "manual" for manually logged entries. Manual-type logs will update manual metadata if running a show and a track artist and title was specified.) |
| loglevel | string (required; level of severity. Must be one of: ["danger", "urgent", "warning", "info", "success", "primary", "secondary"]) |
| logsubtype | string (optional; a subcategory of the log. Clients are advised to use "DJ/show host - show name" when logging things pertaining to a show.) |
| event | string (required; details about the event that happened prompting the log. Do not include track info; include that in the track parameters.) |
| trackArtist | string (optional; specify track artist if a track was played to be used for spin counts.) |
| trackTitle | string (optional; specify track title if a track was played to be used for spin counts.) |
| trackAlbum | string (optional; specify track album if a track was played.) |
| trackLabel | string (optional; specify track label if a track was played.) |
#### Response 200 OK
### /logs/get [POST /logs/get]
Get a list of logs for a specific subtype and a specific date. Returns logs for the 24-hour period of the provided date.
This endpoint supports sockets, uses the "logs" event, and returns data in the structure defined in the websockets section.
#### Request
| key | criteria |
|--|--|
| subtype | string (optional; the name of the log subtype to get. If '' or null, will return all logs for date. If "ISSUES", will return all logs of warning, urgent, or danger level for date. Defaults to ''.) |
| date | string (optional; a moment.js parsable date that falls within the day to get logs. Defaults to now.) |
#### Response 200
		[
			{
				"createdAt": "2018-05-03T23:18:41.089Z",
                "updatedAt": "2018-05-03T23:18:41.089Z",
				"ID": 1,
				"logtype": "operation", // A category for this log
				"loglevel": "info", // Level of importance: ["danger", "urgent", "warning", "info", "success", "primary", "secondary"]
				"logsubtype": "automation", // A subcategory, such as the name of a radio show
				"event": "Automation played a track.", // The log event and data
				"trackArtist": "Alan Jackson", // If played a track, this is the track artist. Null if this is not a track entry.
				"trackTitle": "Chattahoochee (Extended Mix)", // If played a track, this is the track title. Null if this is not a track entry.
				"trackAlbum": null, // If played a track and we know the album, this is the album name. Otherwise, null.
				"trackLabel": null, // If played a track and we know the record label, this is the label. Otherwise, null.
			},
			...
		]
### /logs/get-subtypes [POST /logs/get-subtypes]
Retrieve a list of log subtypes for a specified date.
#### Request
| key | criteria |
|--|--|
| date | string (optional; a moment.js parsable date that falls within the day to get log subtypes. Defaults to now.) |
#### Response 200
		[
			"Log subtype 1",
			"Log subtype 2",
			...
		]
### /logs/view [GET /logs/view]
View a webpage to browse through the system logs.
#### Response 200 (text/html)
## Messages [/messages]
Messages endpoints regard the internal WWSU messaging system.
### /messages/get [GET /messages/get]
Retrieve an array of messages sent within the last hour. Used by internal WWSU applications. **Requires authorization**.
This endpoint supports sockets, uses the "messages" event, and returns data in the structure defined in the websockets section.
NOTE: new clients should call recipients/add in order to show up as online to other clients.
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
### /messages/get-web [GET /messages/get-web]
Retrieve a list of messages sent within the last hour applicable to web and mobile users.
NOTE: new clients should call recipients/add-web in order to show up as online to other clients and to receive any stored nicknames for this client as response.label.
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
			"trackID": 0, // The ID of the track currently playing
            "history": [], // An array of objects {ID: trackID, track: 'Artist - Title', likable: true if it can be liked} of the last 3 tracks that played 
			"requested": false, // Whether or not this track was requested
            "requestedBy": '', // The user who requested this track, if requested
            "requestedMessage": '', // The provided message for this track request, if requested
			"genre": '', // Name of the genre or rotation currently being played, if any
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
			"playing": false, // Whether or not something is currently playing in the active RadioDJ
            "breakneeded": false, // If the current DJ needs to take the FCC required top of the hour break, this will be true
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
| automation_break | WWSU is in break mode and awaiting the next show/broadcast to begin. |
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
## Recipients [/recipients]
These endpoints regard the recipients and clients that may send or receive messages.
### /recipients/add-computers [POST /recipients/add-computers]
DJ Controls clients should use this endpoint to register themselves as online. Clients should call this endpoint after every re-connection as well, since recipients are erased when the server restarts. **Requires authorization**
**Request to this endpoint must be a websocket**.
#### Request
| key | criteria |
|--|--|
| host | string (required; the host name of the computer running DJ Controls) |
#### Response 200
		{
			"label": "Nickname" // The nickname of the client as we have it in records at this time.
		}
### /recipients/add-display [POST /recipients/add-display]
WWSU Display Signs should use this endpoint to register themselves as online. Clients should call this endpoint after every re-connection since recipients are erased when the server restarts.
This will also subscribe the socket to the "messages" event to receive messages to be displayed on the display sign, as well as the "display-refresh" event which the display sign should restart itself when called.
**Request to this endpoint must be a websocket**.
#### Request
| key | criteria |
|--|--|
| host | string (required; the host name of the display sign) |
#### Response 200
		{
			"label": "Nickname" // The nickname of the client as we have it in records at this time.
		}
### /recipients/add-web [POST /recipients/add-web]
Public clients should use this endpoint prior to using any messages endpoints to register themselves as online. Clients should call this endpoint after every re-connection as well, since recipients are erased when the server restarts.
**Request to this endpoint must be a websocket**.
#### Response 200
		{
			"label": "Nickname" // The nickname of the client as we have it in records at this time.
		}
### /recipients/edit-web [POST /recipients/edit-web]
Public clients wishing to change their nickname should call this endpoint.
**Request to this endpoint must be a websocket**.
#### Request
| key | criteria |
|--|--|
| label | string (required; the nickname to use for this client) |
#### Response 200 OK
### /recipients/get [GET /recipients/get]
Retrieve an array of recipients that can receive and send messages.
This endpoint supports sockets, returns data in the structure defined in the websockets section, and uses the "recipients" event.
#### Response 200

    [
	    {
		    "createdAt": "2018-05-15T22:31:34.381Z",
            "updatedAt": "2018-05-15T22:31:34.381Z",
		    "ID": 1,
		    "group": "system", // Each recipient can be grouped together by the group
		    "host": "emergency", // An alphnumeric ID of the recipient
		    "label": "Technical Issues", // A human friendly label for the recipient
		    "status": 1, // 1 = red (active issue), used by emergency, 2 = yellow (online), used by the computers and display groups, 3 = unused, 4 = blue (pending request), used by track requests, 5 = green (online), used by public clients, 0 = gray (offline / none)
		    "time": "2018-05-15T22:31:34.381Z" // ISO string of the last time the recipient had a change in status.
		},
		...
    ]
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
## Silence [/silence]
Silence endpoints should be hit by the silence detection application in order to trigger certain operations for audio silence.
### /silence/active [GET /silence/active]
This endpoint should be hit when silence was detected. It should be hit once every minute until silence is resolved. Will trigger silence alarms, and skip/disable the current track in automation, if one is playing.
#### Request
| key | criteria |
|--|--|
| key | string (required; the key/password as configured in the WWSU application, since silence detection program does not support /user/auth authorization.) |
#### Response 200 OK
### /silence/inactive [GET /silence/inactive]
This endpoint should be hit when previously detected silence has been resolved.
#### Request
| key | criteria |
|--|--|
| key | string (required; the key/password as configured in the WWSU application, since silence detection program does not support /user/auth authorization.) |
#### Response 200 OK
## Songs [/songs]
Songs endpoints regard the available songs/tracks in the automation system.
### /songs/get [GET /songs/get]
Get an array of tracks from the automation system. This was designed to be used with the track request system. For performance reasons, song.category, song.request, and song.spins will only be included if ID was specified in the request parameters.
#### Request
| key | criteria |
|--|--|
| ID | number (If only getting a specific song, provide the song's ID number. If provided, the return song array will also contain category, request, and spins. If not provided, will return an array of requestable songs without category, request, nor spins.) |
| search | string (If provided, return only songs that contain the provided string in the artist or the title.) |
| subcategory | number (optional; if provided, filter by the provided subcategory ID) |
| genre | number (optional; if provided, filter by the provided  genre ID) |
| limit | number (Maximum number of songs to return. Defaults to 25.) |
| skip | number (If provided, will skip that many songs from the beginning.) |
#### Response 200
        [
			{
				"createdAt": "2018-05-15T22:31:34.381Z",
				"updatedAt": "2018-05-15T22:31:34.381Z",
				"ID": 1,
				"path": "M:\music\temp\temp.mp3", // The local filepath to the song.
				"enabled": 1, // 1 = enabled, 0 = disabled, -1 = invalid track, or track not found in the given path.
				"date_added": "2018-05-15T22:31:34.381Z", // The date in which the track was added to RadioDJ
				"date_modified": "2018-05-15T22:31:34.381Z", // The date in which the track was modified in RadioDJ
				"date_played": "2018-05-15T22:31:34.381Z", // The date in which this track was last played
				"artist_played": "2018-05-15T22:31:34.381Z", // The date in which a track by the same artist was last played
				"album_played": "2018-05-15T22:31:34.381Z", // The date in which a track from the same album last played
				"title_added": "2018-05-15T22:31:34.381Z", // The date in which a song with the same title last played
				"count_played": 1, // UNRELIABLE RadioDJ count of the number of times the track was played; please use the "spins" object for more reliable count
				"play_limit": 0, // If greater than 0, this track will expire once it has played this number of times
				"limit_action": 1, // Internal RadioDJ directive indicating what happens to this track once it expires
				"start_date": "2018-05-15T22:31:34.381Z", // Date in which track becomes active
				"date_added": "2018-05-15T22:31:34.381Z", // Date in which track becomes expired. ISO of 2002-01-01 00:00:01 is no expiration
				"startEvent": -1, // RadioDJ directive
				"endEvent": -1, // RadioDJ directive
				"song_type": 0, // RadioDJ directive indicating the type of track. 0 is a music track.
				"id_subcat": 33, // ID of the track's subcategory
				"id_genre": 2, // ID of the track's genre
				"weight": 50.0, // Float indicating how heavy this track is for priority rotation rules
				"duration": 320.12349, // The track's current duration is this number of seconds
				"original_duration": 0.00000, // If greater than 0, this indicates the track's duration when it was first added to RadioDJ.
				"cue_times": "&sta=0.1059410430839&xta=485.516553287982&end=494.661632653061&fin=0&fou=9.14507936507937", // RadioDJ cue markers
				"precise_cue": 0, // If 1, applications are encouraged to use exact cue times.
				"fade_type": 0, // RadioDJ directive
				"start_type": 0, // RadioDJ directive
				"end_type": 0, // RadioDJ directive
				"mix_type": 0, // RadioDJ directive
				"mood": "", // A string describing the mood of this track
				"gender": "", // A string describing the genders involved in the track's vocals
				"lang": "", // A string describing the languages involved in the track's lyrics
				"rating": 0, // A 5-star rating for this track given by WWSU
				"loudness": 1.00, // A factor by which the track's volume is to be played
				"overlay": 0, // If 1, this is a track to be played on top of other tracks, such as voice tracking.
				"artist": "George Carlin", // Artist of the track
				"original_artist": "George Carlin", // When an artist is changed, this is the artist that was originally set when imported into RadioDJ.
				"title": "Seven dirty words of television", // Title of the track
				"album": "", // The track comes from this specified album
				"composer": "", // The name of the person who composed this track
				"label": "", // The record label
				"year": "2001", // Year of the track
				"track_no": 0, // Usually used to indicate the track number from a CD, record, etc.
				"disc_no": 0, // Usually used to indicate the disc from a multi-disc series
				"publisher": "", // Name of the entity responsible for publishing the track
				"copyright": "", // Track copyright information
				"isrc": "", // ISRC number
				"bpm": 120.0, // A float indicating the detected BPM of the track
				"comments": "", // Various comments about this track as added by WWSU
				"sweepers": "", // RadioDJ directive indicating which sweepers belong to this track
				"image": "", // Name of the image file (from RadioDJ's album cover photo)
				"buy_link": "", // URL to purchase this track
				"url1": "", // Misc URL
				"url2": "", // Misc URL
				"tdate_played": "2018-05-15T22:31:34.381Z" // internal
				"tartist_played": "2018-05-15T22:31:34.381Z" // Internal,
				"original_metadata": 0, // If 1, clients should use original metadata, not current metadata.
				"category": "Podcasts >> Best of George Carlin", // String containing the name of the category and subcategory of the track. This is only provided if ID was specified during the request.
				"request": {"requestable": false, "HTML": "<div class="alert alert-warning" role="alert">You cannot request a non-music track.</div>", "listDiv": "info", "type": "nonMusic"}, // Request object. If requestable is true, the track can be requested. HTML contains a bit of HTML for the request section, such as a form if the track can be requested. listDiv is the color class to use for color coding this track on a list. Type is a short phrase describing the reason for not being able to request the track. This is only provided if ID was specified during the request.
				"spins": {7: 1, 30: 4, "YTD": 12, 365: 28} // Spin counts. Keys... 7 = last 7 days, 30 = last 30 days, YTD = Since January 1, 365: last year. This is only provided if ID was specified during the request.
			},
			...
        ]
### /songs/get-genres [GET /songs/get-genres]
Get an array of genres.
#### Response 200
        [
			{
				"ID": 33,
				"name": "Hip-Hop / R&B"
			},
			...
        ]
### /songs/get-liked [GET /songs/get-liked]
Retrieve an array of tracks that this host/IP has liked recently and cannot yet like again at this time.
#### Response 200
        [
		    18293,
		    45093,
			...
        ]
### /songs/like [POST /songs/like]
Mark a track as liked. Depending on configuration, this might also bump the track's priority in rotation.
#### Request
| key | criteria |
|--|--|
| trackID | number (required; the ID of the track to like) |
#### Response 200 OK
#### Response 500 various errors if a track cannot be liked at this time
### /songs/queue-add [POST /songs/queue-add]
Queue a Top Add into RadioDJ. If in a show, will play the Add immediately and send into returning state. **Requires authorization**
#### Response 200
### /songs/queue-liner [POST /songs/queue-liner]
Queue and play a Sports Liner. Will error if we are not in a sports broadcast. **Requires authorization**
#### Response 200
#### Response 500
### /songs/queue-psa [POST /songs/queue-psa]
Add a PSA into the RadioDJ queue. **Requires authorization**
#### Request
| key | criteria |
|--|--|
| duration | number (optional; if provided, the PSA queued will be this long in seconds, +/- 5 seconds. Defaults to 30.) |
#### Response 200
## State [/state]
State endpoints are used to request to change states in WWSU's system (for example, going live or going to automation).
### /state/automation [POST /state/automation]
Request to go into automation mode. If coming from a sports broadcast, this will also play the closer, if there is one. **Requires authorization**
Requests do not get a response until the entire process of going to automation is completed on the backend. This could take several seconds.
#### Request
| key | criteria |
|--|--|
| transition | boolean (optional; if true, system will go into break instead of automation... used for quick transitioning between shows. NOTE: system will only wait 5 minutes in break. If a show does not begin in 5 minutes, system will go into full automation. Defaults to false.) |
#### Response 200 OK
### /state/break [POST /state/break]
Go into break mode (play PSAs, or music if halftime is true, until state/return is called). **Requires authorization**
Requests do not get a response until the entire process of starting a break is complete.
#### Request
| key | criteria |
|--|--|
| halftime | boolean (optional; if true, will switch to a halftime / extended break. If false, will switch to a standard break. Defaults to false.) |
#### Response 200 OK
### /state/change-radio-dj [POST /state/change-radio-dj]
Tell the system to switch to a different RadioDJ instance in the array of configured RadioDJ instances.  **Requires authorization**
#### Response 200 OK
### /state/live [POST /state/live]
Request to go live. **Requires authorization**
Requests do not get a response until the entire process of preparing for live is completed on the backend. This could take several seconds.
#### Request
| key | criteria |
|--|--|
| topic | string (optional; a short blurb describing this live broadcast.) |
| showname | string (required; the name of this live broadcast. It must follow this format: "DJ name/handle - show name". Validation will fail if it does not.) |
| webchat | boolean (optional; True allows the public to send messages to the DJ; false disallows this. Defaults to true.) |
| djcontrols | string (required; the computer hostname requesting to go live (this should be executed from DJ Controls)) |
#### Response 200 OK
### /state/remote [POST /state/remote]
Request to begin a remote broadcast. **Requires authorization**
Requests do not get a response until the entire process of preparing for a remote broadcast is completed on the backend. This could take several seconds.
#### Request
| key | criteria |
|--|--|
| topic | string (optional; a short blurb describing this broadcast.) |
| showname | string (required; the name of this broadcast. It must follow this format: "Show host - show name". Validation will fail if it does not.) |
| webchat | boolean (optional; True allows the public to send messages to the host's DJ Controls; false disallows this. Defaults to true.) |
| djcontrols | string (required; the computer hostname requesting to go to remote (this should be executed from DJ Controls)) |
#### Response 200 OK
### /state/return [POST /state/return]
Return from a break, back into the broadcast. **Requires authorization**
Requests do not get a response until the entire process of returning is completed on the backend.
#### Response 200 OK
### /state/sports [POST /state/sports]
Request to begin a sports broadcast. **Requires authorization**
Requests do not get a response until the entire process of preparing for a sports broadcast is completed on the backend. This could take several seconds.
#### Request
| key | criteria |
|--|--|
| topic | string (optional; a short blurb describing this broadcast.) |
| sport | string (required; the sport being broadcast. This must be configured in the Node application.) |
| remote | boolean (optional; if true, this will be a remote sports broadcast. Defaults to false.) |
| webchat | boolean (optional; True allows the public to send messages to the host's DJ Controls; false disallows this. Defaults to true.) |
| djcontrols | string (required; the computer hostname requesting to go to remote (this should be executed from DJ Controls)) |
#### Response 200 OK
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
				"data": "The database is operational.", // A string containing information about the current running state of this subsystem.
				"time": "2018-05-15T22:31:34.381Z" // ISO String indicating the most recent time the subsystem was detected as status 5.
			},
			...
        ]
## Tasks [/tasks]
Tasks endpoints regard work orders for directors.
### /tasks/get [GET /tasks/get]
Get an array of the OpenProject work orders for all directors and all projects.
This endpoint supports sockets, uses the "tasks" event, and returns data in the structure defined in the websockets section.
#### Response 200
		[
			{
				"createdAt": "2018-05-29T18:13:01.763Z",
				"updatedAt": "2018-05-29T18:13:01.763Z",
				"ID": 8,
				"unique": 63, // OpenProject ID
				"subject": "Outline Process for Liner Adds", // Task
				"category": "Unknown",
				"project": "Liner Creation", // Tasks are grouped by projects
				"type": "Task", // Types are defined in OpenProject configuration
				"priority": "Normal", // Priorities are defined in OpenProject configuration
				"status": "Completed / Pending Review", // Statuses are defined in OpenProject configuration
				"start": "2018-05-10", // Start date. Will be null for no start date.
				"due": "2018-05-13", // Task due date. Will be null for no due date.
				"percent": 100, // Percent completed, 0-100
				"assignee": "Tyler Pike", // The name of the Director/user who should complete this task
				"responsible": "Patrick Schmalstig" // The name of the director/user overseeing this task; typically, the assignee will report updates to responsible.
			},
			...
		]
## Timesheet [/timesheet]
Timesheet endpoints regard the internal timesheet and clock in/out system for WWSU directors.
### /timesheet/add [POST /timesheet/add]
Add a timesheet entry into the system. If the director is present, the add entry will be a clock-out entry. If the director is not present, the add entry will be a clock-in entry. Use the edit endpoint for editing entries.
#### Request
| key | criteria |
|--|--|
| login | string (required; The OpenProject login of the director for this timesheet entry.) |
| timestamp | string (required; a timestamp indicating the time this director clocked in/out. Must be valid by moment.js.) |
#### Response 200 OK
#### Response 404
### /timesheet/edit [POST /timesheet/edit]
Edit a specific timesheet entry.
#### Request
| key | criteria |
|--|--|
| admin | string (required; the OpenProject login of an administrator) |
| ID | number (required; the ID of the timesheet entry to be edited) |
| time_in | string (required; a moment.js valid timestamp indicating when the director clocked in) |
| time_out | string (a moment.js valid timestamp indicating when the director clocked out. Use null if the director has not clocked out yet. Defaults to null.) |
| approved | boolean (required; true if this timesheet entry has been approved, false if it is flagged.) |
#### Response 200 OK
#### Response 403
#### Response 404
### /timesheet/get [GET /timesheet/get]
Return an array of timesheet entries for the week.
#### Request
| key | criteria |
|--|--|
| date | string (optional; a moment.js parsable date that falls within the week to get timesheet entries. Will return entries from 12am that past sunday, to 12am the next sunday. Defaults to now.) |
#### Response 200
		[
			{
				"createdAt": "2018-05-29T18:13:01.763Z",
				"updatedAt": "2018-05-29T18:13:01.763Z",
				"ID": 7,
				"name": "George Carlin", // The name of the director which this record applies
				"time_in": "2018-05-29T18:13:01.763Z", // An ISO string containing when the director clocked in
				"time_out": null, // An ISO string containing when the director clocked out. Null means the director is still in.
				"approved": true // True if this timesheet does not require admin approval
			},
			...
		]
### /timesheet/view [GET /timesheet/view]
Access the timesheet web interface.
#### Request
#### Response 200 (text/html)
