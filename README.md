# WWSU 4.5.3
The WWSU Radio Sails.js API application enables external / remote control of core WWSU functionality. Applications can be developed utilizing this API. 

## Websockets
**WARNING!!! As of version 5.0.0, requests to connect to websocket that do not originate from server.wwsu1069.org will require a host parameter in the header**. The provided host must be a Hosts.host who is authorized (authorized=true). Otherwise, the websocket request will be rejected.
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
## Methods
The WWSU app does not care which method you use for any of the requests. Generally, it is recommended to use GET when fetching information, and POST when submitting information.
## Hosts and Authorization
A lot of API endpoints require a valid authorization in the form of a header. The endpoints which require authorization will be noted in their respective section.
 - The key is "authorization", and the value is "Bearer (token)". 
 - Use the /hosts/get endpoint to authenticate and get a token.

**WARNING!!! Authorization will be changing in version 5.0.0**. There will be different authorizations depending on the API endpoint. We added warnings to appropriate endpoints to indicate what authorization they will begin using in version 5.0.0.
 - auth/host will replace hosts/get and authenticate endpoints just needing an authorized host. Must provide Hosts.host as "username" in request. No password required.
 - auth/dj will be used for endpoints regarding DJ-specific functionality. Must provide Djs.name as "username", and Djs.login as "password", in request.
 - auth/director will be used for endpoints needing authentication of any director. Must provide Directors.name as "username", and Directors.login as "password", in request.
 - auth/admin-director will be used for endpoints needing authentication of a director with admin=true. Must provide Directors.name as "username", and Directors.login as "password", in request.
### /hosts/edit
Edit a host. **Requires authorization**
 - A request to edit a host will be blocked if the provided admin or authorized parameter is false, and there are 1 or less authorized admin hosts. This is to prevent accidental lockout from the system.
 - Modifying the "host" (host name) is not implemented; this should never change as it is based off of the client / device and not something configured.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization instead of hosts/get authorization.
#### Request
| key | criteria |
|--|--|
| ID | number (required; ID of the host record to edit.) |
| friendlyname | string (optional; if provided, the friendly name of this host will be modified to what is provided.) |
| authorized | boolean (optional; if provided, whether or not the host is authorized (receives a token for restricted endpoints) will be changed to this. If false, and 1 or less authorized admin hosts exist, the edit request will be denied to prevent accidental lockout.) |
| admin | boolean (optional; if provided, whether or not the host is an admin (should have access to admin settings in DJ Controls) will be changed to this. If false, and 1 or less authorized admin hosts exist, the edit request will be denied to prevent accidental lockout.) |
| requests | boolean (optional; if provided, whether or not this host should be notified of new track requests will be changed to this.) |
| emergencies | boolean (optional; if provided, whether or not this host should be notified of system problems will be changed to this.) |
| webmessages | boolean (optional; if provided, whether or not this host should be notified of messages sent from the web / mobile app will be changed to this.) |
#### Response 200 OK
#### Response 409 Conflict (This is thrown when the request was blocked to prevent accidental lockout)
### /hosts/get
Retrieve information about a host. 
 - If the host does not exist in the database, it will be created with default settings. However, it will not be authorized, and therefore a token will not be returned. An admin will need to authorize the host for it to begin using tokens to hit endpoints requiring authorization. 
 - If the host exists and is authorized, an authorization token will be generated and returned.
 - This endpoint supports sockets, uses the "hosts" event, and returns data in the structure defined in the websockets section. A request will only be subscribed if the provided host is an authorized admin.
 - **DEPRECATION WARNING:** This endpoint will no longer return authorization tokens starting in version 5.0.0. Instead, call auth/host .
 - **DEPRECATION WARNING:** As of version 5.0.0, calling this endpoint with a host that does not exist will not create a new host record anymore. Instead, not found will be returned.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| host | string (required; name of the host to retrieve or create.) |
#### Response 200
        {
            "createdAt": "2018-05-03T23:18:41.089Z",
            "updatedAt": "2018-05-03T23:18:41.089Z",
            "ID": 1,
            "host": "abunchofstuff", // Host name of the host computer
            "friendlyname": "OnAir Computer", // Friendly name to use for labels
            "authorized": false, // If false, this host is not authorized to use any of the endpoints in the API requiring authorization
            "admin": true, // If true, this client is an administrator and should have access to options in DJ Controls
            "requests": true, // If true, this client should notify of track requests even when this host was not used to go live
            "emergencies": false, // If true, this client should notify of reported technical issues
            "webmessages": true, // If true, this client should notify of messages sent by public clients, even when this host was not used to go live
            "token": null, // If the host is authorized, a token will be provided here for use in the headers of endpoints requiring authorization. The token will expire after 1 hour. Otherwise, this will be null.
            "otherHosts": [], // If this host is an authorized admin, an array of all the hosts in the database will be provided for administration purposes. Otherwise, this property will not exist.
        }
### /hosts/remove
Removes a host from the database. **Requires Authorization**
 - A request to remove a host will be blocked if the host to remove is the only authorized admin host in the system. This is to prevent accidental lockout from the system.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the host to remove.) |
#### Response 200 OK
#### Response 409 Conflict (This is thrown when the request was blocked to prevent accidental lockout)
## Analytics
Analytics endpoints deal with getting analytics about WWSU.
### /analytics/weekly-dj
Receive analytical statistics about WWSU from the last 7 days.
 - This endpoint supports sockets, and uses the "analytics-weekly-dj" event. The data passed in this event is in the same structure as the response format.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200
        {
            "topShows": [], // Array of strings containing the DJ Name - Show name of the shows with the most online listeners. The shows in the earlier array positions have more listeners than the shows in the later array positions.
            "topGenre": "Hip-Hop / R&B", // String containing the name of the genre which had the most listeners
            "topPlaylist": "None", // String containing the name of the playlist which had the most listeners
            "onAir": 3418, // Number of minutes that WWSU had live shows, prerecords, remotes, and sports broadcasts in the last 7 days
            "onAirListeners": 8127, // Number of online listener minutes in the last 7 days
            "tracksLiked": 13, // Number of tracks that were liked from the website in the last 7 days
            "tracksRequested": 12, // Number of tracks requested from the website in the last 7 days
            "webMessagesExchanged": 93 // Number of messages exchanged between visitors and the DJ in the last 7 days
        }
## Announcements
Announcements endpoints regard the internal announcements system at WWSU.
### /announcements/add
Adds an announcement into the system. **Requires authorization**.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| type | string (required; the type of announcement, which often dictates what should display the announcement) |
| level | string (required; Severity level. Must be in: ["danger", "urgent", "warning", "info", "success", "primary", "secondary"]) |
| title | string (required; the short and concise title/header for this announcement) |
| announcement | string (required; The announcement text. HTML is allowed, but subject to server-side filtering.) |
| starts | string (optional; the ISO moment.js compatible time that the announcement starts. Defaults to now.) |
| expires | string (optional; the ISO moment.js compatible time that the announcement expires. Defaults to the year 3000.) |
#### Response 200 OK
### /announcements/edit
Edits an existing announcement. **Requires authorization**.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the announcement to edit) |
| type | string (optional, but edits original value if provided; the type of announcement, which often dictates what should display the announcement) |
| level | string (optional, but edits original value when provided; Severity level. Must be in: ["danger", "urgent", "warning", "info", "success", "primary", "secondary"]) |
| title | string (optional, but edits the original title for the announcement) |
| announcement | string (optional, but edits original value if provided; The announcement text) |
| starts | string (optional, but edits original value if provided; the ISO moment.js compatible time that the announcement starts.) |
| expires | string (optional, but edits original value if provided; the ISO moment.js compatible time that the announcement expires.) |
#### Response 200 OK
### /announcements/get
Get an array of announcements for the provided type.
 - This endpoint supports sockets, uses the "announcements" event, and returns data in the structure defined in the websockets section. Only data pertaining to the provided type is returned in sockets.
 - **NOTE**: Clients are expected to do their own processing of starts and expires time; system returns all applicable announcements regardless whether or not they have expired or become active yet.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| type | string (required; return announcements of the provided type, both in the request and in the subscribed websocket) |
| ID | number (optional; the ID of the announcement to return) |
#### Response 200
        [
            {
                "createdAt": "2018-05-15T22:31:34.381Z",
                "updatedAt": "2018-05-15T22:31:34.381Z",
                "ID": 1,
                "type": "display-public", // This announcement is applicable to the provided type. Examples: display-public, display-internal, djcontrols, website.
                "level": "info", // Severity level. Must be in: ["danger", "urgent", "warning", "info", "success", "primary", "secondary"].
                "title": "Men's Basketball", // The title/header of the announcement
                "announcement": "Do not forget to do your air checks. They are due August 3.", // The announcement text or HTML
                "starts": "2018-05-15T22:31:34.381Z", // ISO string of when the announcement begins.
                "expires": "2018-08-3T22:31:34.381Z" // ISO string of when the announcement expires.
            },
            ...
        ]
### /announcements/remove
Removes an announcement. **Requires authorization**.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the announcement to remove.) |
#### Response 200
## Attendance
Attendance endpoints regard records that keep track of scheduled events and when those events actually aired, if they aired.
### /attendance/get
Retrieve an array of show/program attendance logs for a specified date or specified DJ. **Requires Authorization**.
 - This endpoint supports sockets, uses the "attendance" event, and returns data in the structure defined in the websockets section. A socket is only subscribed to if dj and event parameters are not provided.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| date | string (optional; a moment.js parsable date that falls within the day to get log attendance records. Defaults to now.) |
| dj | number (optional; retrieve attendance records for the specified DJ ID. If provided, date is ignored.) |
| event | string (optional; return attendance records where this string is contained within the record's event field. If provided, date is ignored. If DJ is provided, will further filter by the DJ.) |
#### Response 200
        [
            {
                "createdAt": "2018-11-08T05:00:03.000Z",
                "updatedAt": "2018-11-11T00:21:38.000Z",
                "ID": 747, // attendanceID
                "unique": "", // If the event coordinates with a Google Calendar event, the GC event ID will be provided here
                "dj": null, // If a DJ/Host is applicable, the DJ or Host ID will be provided here. Otherwise, this will be null.
                "event": "Genre: Default", // The name of the event, along with its operation prefix
                "showTime": 240, // Amount of onAir time this event had, in minutes. Can be null if it's still on or never aired.
                "listenerMinutes": 241, // Number of online listener minutes during this event. Can be null if it's still on or never aired.
                "scheduledStart": null, // ISO String of when this event was scheduled to start. Can be null if it was not scheduled.
                "scheduledEnd": null, // ISO String of when this event was scheduled to end. Can be null if it was not scheduled.
                "actualStart": "2018-11-08T05:00:03.000Z", // ISO String of when this event actually started. Can be null if it did not start.
                "actualEnd": "2018-11-08T09:00:04.000Z" // ISO String of when this event actually ended. Can be null if it did not start or if it did not yet end.
            },
            ...
        ]
## Calendar
Calendar endpoints regard the Google Calendar events of WWSU Radio (such as show and genre schedules / programming).
### /calendar/get
Get an array of events for the next 7 days, in no particular order (client will need to do their own sorting).
 - This endpoint supports sockets, uses the "calendar" event, and returns data in the structure defined in the websockets section.
#### Response 200
        [
            {
                "createdAt": "2018-05-15T22:31:34.381Z",
                "updatedAt": "2018-05-15T22:31:34.381Z",
                "ID": 1,
                "unique": "578vfod7icjde4ikdbmtii9ren_20180516T080000Z", // Unique event ID as provided by Google Calendar
                "active": true, // Used internally
                "title": "Genre: New Rock", // Title of the event
                "description": "", // Description of the event, if provided (HTML is stripped from the Google Calendar API field)
                "color": "#5484ed", // Hexadecimal color representing this event
                "allDay": false, // True if this is an all day event
                "start": "2018-05-16T04:00:00-04:00", // ISO string of the event start time
                "end": "2018-05-16T08:00:00-04:00", // ISO string of the event end time
                "verify": "Valid", // Verification status: Manual (event is not recognized by the system as a trigger), Valid (properly formatted event recognized by the system), Check (Event is valid but may require attention), Invalid (event will not work)
                "verify_message": "", // Additional information regarding the verification status
                "verify_titleHTML": "<span style=\"background: rgba(0, 0, 255, 0.2);\">Genre</span>: <span style=\"background: rgba(0, 255, 0, 0.2);\">New Rock</span>", // HTML formatted title for the calendar/verify page.
            },
            ...
        ]
### /calendar/verify
Returns an HTML page verifying the events in the WWSU Calendar for the next week. Checks for event title syntax, proper formatting, existing playlists/rotations, playlist length, and more. Page also uses calendar/get for populating the verification.
 - **DEPRECATION WARNING:** This endpoint will be removed in version 5.0.0. Use the calendar verification tool in DJ Controls instead.
#### Response 200 HTML
## Directors
The Directors endpoints regard the directors of WWSU Radio.
### /directors/add
Add a new director into the WWSU system. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/admin-director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| name | string (required; the name of the director) |
| login | string (required; the password used for the clock-in and clock-out system) |
| admin | boolean (optional; whether or not this director is an administrator. Defaults to false.) |
| assistant | boolean (optional; whether or not this director is an assistant director (false is a main director). Defaults to false.) |
| position | string (required; The name of the position this director works for (eg. "General manager"). |
#### Response 200 OK
### /directors/edit
Edits the details of an existing director. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/admin-director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the director to edit) |
| name | string (optional; if provided, the name of the director will be changed to this.) |
| login | string (optional; if provided, the login of the director will be changed to this.) |
| admin | boolean (optional; if provided, the admin status of the director will be changed to this.) |
| assistant | boolean (optional; if provided, the assistant status of the director will be changed to this.) |
| position | string (optional; if provided, the position of the director will be changed to this.) |
#### Response 200 OK
### /directors/get-hours
Get an array of office hours for WWSU directors for the next week.
 - This endpoint supports sockets, uses the "directorhours" event, and returns data in the structure defined in the websockets section.
#### Response 200
        [
            {
                "createdAt": "2018-05-15T22:31:34.381Z",
                "updatedAt": "2018-05-15T22:31:34.381Z",
                "ID": 1,
                "unique": "578vfod7icjde4ikdbmtii9ren_20180516T080000Z", // Unique event ID as provided by Google Calendar
                "active": true, // Used internally
                "director": "Benjamin Rozzell V", // The name of the director that this office hour entry applies to
                "start": "2018-05-16T04:00:00-04:00", // ISO string of the event start time
                "end": "2018-05-16T08:00:00-04:00", // ISO string of the event end time
            },
            ...
        ]
### /directors/get
Get an array of directors. If a username is provided, will filter according to the provided username. Otherwise, will return all directors.
 - This endpoint supports sockets, uses the "directors" event, and returns data in the structure defined in the websockets section.
 - **DEPRECATION WARNING:** As of version 5.0.0, this endpoint and its websockets will no longer return "login".
 - **DEPRECATION WARNING:** As of version 5.0.0, the username parameter will be removed. Instead, optional "name" can be provided to only return the director whose name matches the parameter.
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
                "login": "george-carlin", // Password for the director
                "name": "George Carlin", // Full name of the director
                "admin": true, // True if this is a super director / admin
                "assistant": false, // True if this is a non-paid assistant director / intern
                "avatar": "U00912188.jpg", // Path to the avatar for this director, relative to assets/images/avatars/
                "position": "Seven Dirty Words Manager", // The director's position with WWSU
                "present": false, // True if the director is currently clocked in to WWSU
                "since": "2018-05-15T22:31:34.381Z" // ISO stamp indicating when the director last clocked in or clocked out
            },
            ...
        ]
#### Response 404
### /directors/remove
Removes a director from the system. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/admin-director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the director to remove.) |
#### Response 200 OK
## Discipline
The discipline endpoints regard moderation for public clients (website and app users).
### /discipline/ban-show
Bans the specified user until the currently live DJ/broadcast ends. Also mass deletes all website messages sent by the specified user. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
|key|criteria|
|--|--|
| host | string (required; the Recipient host to be issued the discipline) |
#### Response 200 OK
#### Response 500
### /discipline/ban-day
Bans the specified user for 24 hours. Also mass deletes all website messages sent by the specified user. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
|key|criteria|
|--|--|
| host | string (required; the Recipient host to be issued the discipline) |
#### Response 200 OK
#### Response 500
### /discipline/ban-indefinite
Bans the specified user indefinitely. Also mass deletes all website messages sent by the specified user. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
|key|criteria|
|--|--|
| host | string (required; the Recipient host to be issued the discipline) |
#### Response 200 OK
#### Response 500
## Display
These endpoints regard the display signs for WWSU. Although they are publicly accessible, they were not meant for general public use.
### /display/public
Get the public display sign as HTML webpage; to be run in full screen on the display monitor.
#### Request
| key | criteria |
|--|--|
| studio | boolean (optional; set to true on the display sign used in the OnAir studio. This causes the text-to-speech voice to only announce when going on the air in 15 seconds for the guests, and disables red flashing on queue countdown as it's not necessary for the public studio sign.) |
#### Response 200 (text/html)
### /display/internal
Get the internal display sign as HTML webpage; to be run in full screen on the display monitor. This is for directors and members of the WWSU organization.
#### Response 200 (text/html)
### /display/refresh
Send a refresh signal to all connected display signs via websockets. **Requires authorization**.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200 OK
## DJs
The DJs endpoint regards the DJs of WWSU Radio.
### /djs/add
Add a new DJ to the system. **Requires Authorization**.
 - **NOTE:** DJs who air a show who are not already in the system will be added automatically. However, they will not have a login.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| name | string (required; the name of the DJ to add) |
| login | string (optional; the login this DJ will use for DJ related settings. If null / not provided, the DJ will not be able to manage their own DJ settings.) |
#### Response 200 OK
### /djs/edit
Edits a DJ in the system. **Requires Authorization**.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the DJ ID to edit) |
| name | string (optional; the new name for this DJ) |
| login | string (optional; the new login for this DJ) |
#### Response 200 OK
### /djs/get
Get an array of DJs that are in the system. **Requires Authorization**.
 - This endpoint supports sockets, uses the "djs" event, and returns data in the structure defined in the websockets section.
 - **WARNING:** As of version 5.0.0, this endpoint and its websockets will no longer return "login".
 - **WARNING:** As of version 5.0.0, this endpoint will no longer require authorization.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200
        [
            {
                "createdAt": "2018-05-29T18:13:01.763Z",
                "updatedAt": "2018-05-29T18:13:01.763Z",
                "ID": 7,
                "name": "George Carlin", // The name of the DJ
                "login": "", // login ID / pin used for various DJ-level settings
            },
            ...
        ]
### /djs/remove
Removes a DJ from the system. **Requires Authorization**.
 - **NOTE:** Removing a DJ disassociates them from all XP/remote logs, system logs, and analytics. However, those records will still exist in the database.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the DJ to remove) |
#### Response 200 OK
## Eas
Eas endpoints regard the internal WWSU emergency alert system. **These endpoints do not have anything to do with the SAGE Digital ENDEC**; this is internal only.
### /eas/get
Get an array of currently active alerts. 
 - This endpoint supports sockets, uses the "eas" event, and returns data in the structure defined in the websockets section.
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
                "counties": "Clark, Greene, Montgomery", // Comma separated list of counties affected by the alert. Only counties that fall within WWSU's configured EAS coverage will be checked/returned.
                "starts": "2018-05-07T02:00:12.343Z", // ISO string when the alert begins
                "expires": "2018-05-07T02:03:12.343Z" // ISO string when the alert expires
            },
            ...
        ]
### /eas/send
Issue a new alert through the internal emergency alert system, originating from source WWSU. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| counties | string (required; comma separated list of counties affected by the alert) |
| alert | string (required; the alert event / title) |
| severity | string (required; Must be in: ['Extreme', 'Severe', 'Moderate', 'Minor'] |
| starts | string (optional; a moment.js compatible start date/time of the alert. Defaults to now.) |
| expires | string (optional; a moment.js compatible date/time which the alert expires. Defaults to 15 minutes from now.) |
| color | string (required; a hexadecimal color representing the alert. Mainly used on the display signs.) |
| information | string (required; additional information, and instructions, for the public.) |
#### Response 200 OK
### /eas/test
Send out a test through the internal emergency alert system. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200 OK
## Embeds
Embeds are specially designed pages used for other websites to embed WWSU on their website.
### /embeds/guardian
Retrieve a WWSU web player specially designed for Wright State's Guardian Newspaper website.
#### Response 200 HTML
## Listen
These endpoints return web pages of various sections of the Listener's Corner. This is mainly used by the mobile app.
### /listen/calendar
Returns a web page containing the upcoming events/shows for WWSU.
#### Response 200 HTML
### /listen/chat
Returns the chat box to chat with the DJ.
#### Response 200 HTML
### /listen/listen
Returns the WWSU logo, a media player to tune in to the radio station, the current playing meta, and the recent tracks played (with buttons to like them)
#### Response 200 HTML
### /listen/requests
Returns a web page to place track requests with WWSU.
#### Response 200 HTML
## Listeners
These endpoints deal with online listener counts with WWSU.
### /listeners/get
Retrieve an array of online listener counts between specified time periods. **Requires Authorization**.
 - **NOTE:** The server may return one record that falls before provided start time; this is so listener graphs and listener minute calculators can get an accurate baseline / representation.
 - **ANOTHER NOTE:** The server does not log listeners in a consistent interval; it only logs when a change in the online listener count was detected.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| start | string (required; moment.js parsable string of the earliest listeners record to return.) |
| end | string (required; moment.js parsable string of the latest listeners record to return.) |
#### Response 200
        [
            {
                "createdAt": "2018-11-08T03:34:33.000Z", // When the listener record was logged. Use this for pinning the listener count to a time stamp.
                "updatedAt": "2018-11-08T03:34:33.000Z",
                "ID": 10809,
                "dj": null, // If this listener record was logged during a show, this will include the DJ ID.
                "listeners": 1 // Number of connected online listeners at this logged time
            },
            ...
        ]
## Logs
Logs endpoints regard the internal logging system.
### /logs/add
Add a log into the system. **Requires authorization**
 - **NOTE:** if provided logtype is "manual", and trackArtist and trackTitle were provided, now playing metadata will be updated with that info. If logtype is "manual", and trackArtist or trackTitle is not provided, now playing metadata will be cleared.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| date | string (optional; a moment.js parsable string containing the date this log took place. Defaults to now.) |
| logtype | string (required; type of log. It is recommended to use "operation" for Node logs, "automation" for automation logs, and "manual" for manually logged entries.) |
| loglevel | string (required; level of severity. Must be one of: ["danger", "urgent", "warning", "info", "success", "primary", "secondary"]) |
| logsubtype | string (optional; a subcategory of the log. Clients are advised to use "DJ/show host - show name" when logging things pertaining to a show.) |
| event | string (required; details about the event that happened prompting the log. Do not include track info; include that in the track parameters.) |
| trackArtist | string (optional; specify track artist if a track was played to be used for spin counts.) |
| trackTitle | string (optional; specify track title if a track was played to be used for spin counts.) |
| trackAlbum | string (optional; specify track album if a track was played.) |
| trackLabel | string (optional; specify track label if a track was played.) |
#### Response 200 OK
### /logs/get
Get a list of logs for a specific subtype and a specific date. Returns logs for the 24-hour period of the provided date. **Requires Authorization**
 - This endpoint supports sockets, uses the "logs" event, and returns data in the structure defined in the websockets section.
 - Websockets will ignore filtering rules and will instead return any/all new logs.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| subtype | string (optional; the name of the log subtype to get. If '' or null, will return all logs for date. If "ISSUES", will return all logs of warning, urgent, or danger level for date. Defaults to ''.) |
| attendanceID | number (optional; if provided, will only return log entries for the provided attendance ID (see logs/get-attendance)) |
| date | string (optional; a moment.js parsable date that falls within the day to get logs. Defaults to now.) |
| start | string (optional; a moment.js parsable start time for the earliest log to return. Overrides date if specified.) |
| end | string (optional; a moment.js parsable end time for the latest log to return. If not specified, defaults to 1 day after date, or 1 day after start.) |
#### Response 200
        [
            {
                "createdAt": "2018-05-03T23:18:41.089Z",
                "updatedAt": "2018-05-03T23:18:41.089Z",
                "ID": 1,
                "attendanceID": null, // If this log coordinates with an attendance event, this is the attendanceID (see logs/get-attendance). Otherwise, will be null. 
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
## Messages
Messages endpoints regard the internal WWSU messaging system.
### /messages/get-web
Retrieve a list of messages sent within the last hour applicable to web and mobile users.
 - **NOTE:** new clients should call recipients/add-web in order to show up as online to other clients and to receive any stored nicknames for this client as response.label.
 - This endpoint supports sockets. When called by a socket, the client will be subscribed to multiple events:
 - - The "messages" event receives new/updated/deleted messages using the structure defined in the websockets section.
 - - The "discipline" event receives data when discipline has been issued to the client. The data received is `{"discipline": "A message regarding the discipline issued"}`. When discipline is issued, several endpoints will respond with a 403 until the discipline expires.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200
        [
            {
                "createdAt": "2018-05-03T23:18:41.089Z",
                "updatedAt": "2018-05-03T23:18:41.089Z",
                "ID": 1,
                "status": "active", // "active" for valid messages, "deleted" for messages that were deleted.
                "from": "me", // Host of the sender of this message. Messages from other web/mobile clients will begin with "website-"
                "from_friendly": "Me", // Friendly label for the sender.
                "to": "website", // Host of the recipient. "website" = all web/mobile clients, "website-(hostid)" = specific web/mobile client, "DJ" = Public message to the DJ viewable by all public clients, "DJ-private" = Private message to the DJ
                "to_friendly": "You too", // Friendly label of the recipient.
                "message": "hi" // The message. Could contain HTML.
            },
            ...
        ]
### /messages/get
Retrieve an array of messages sent within the last hour. Used by internal WWSU applications. **Requires authorization**.
 - This endpoint supports sockets, uses the "messages" event, and returns data in the structure defined in the websockets section.
 - **NOTE:** new clients should call recipients/add in order to show up as online / accepting messages to other clients.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
 - **WARNING:** As of version 5.0.0, the "host" parameter will be removed; instead, the host from the provided auth/host token will be used.
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
### /messages/remove
Remove a message. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the message to be removed.) |
#### Response 200 OK
### /messages/send-web
Sends a message. This is used by public web and mobile clients.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| message | string (required; the message to send) |
| private | boolean (required; true if this message is only for the DJ and not for other public clients) |
| nickname | string (optional; A human friendly name for the client) |
#### Response 200 OK
### /messages/send
Sends a message. This is used by internal WWSU clients. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
 - **WARNING:** As of version 5.0.0, the "from" parameter will be removed; instead, the host from the provided auth/host token will be used.
#### Request
| key | criteria |
|--|--|
| from | string (required; host ID of the client sending the message) |
| to | string (required; host ID of the client which is targeted by the message) |
| to_friendly | string (required; The human friendly label of the client which is targeted by the message) |
| message | string (required; the message to send) |
#### Response 200 OK
## Meta
Meta endpoints regard metadata, or what is currently playing / on the air.
### /meta/get
Get the current meta as an object.
 - This endpoint supports sockets under the "meta" event. However, the data sent is an object containing only the changed key: value pairs. This should be merged with the meta stored in memory by the client. There will never be new or deleted keys sent through sockets.
#### Response 200
        {
            state: '', // State of the WWSU system
            dj: null, // The ID of the DJ currently on the air, or null if not applicable.
            show: '', // If someone is on the air, host name - show name, or name of sports for sports broadcasts
            showStamp: null, // When a show starts, this is the ISO timestamp which the show began
            attendanceID: null, // The ID of the Attendance record the system is currently running under
            track: '', // Currently playing track either in automation or manually logged
            trackID: 0, // The ID of the track currently playing
            trackIDSubcat: 0, // The ID of the subcategory the currently playing track falls in
            trackArtist: null, // The artist of the currently playing track
            trackTitle: null, // The title of the currently playing track
            trackAlbum: null, // The album name of the currently playing track
            trackLabel: null, // The label name of the currently playing track
            trackStamp: null, // ISO timestamp of when manual track meta was added
            history: [], // An array of objects {ID: trackID, track: 'Artist - Title', likable: true if it can be liked} of the last 3 tracks that played 
            requested: false, // Whether or not this track was requested
            requestedBy: '', // The user who requested this track, if requested
            requestedMessage: '', // The provided message for this track request, if requested
            genre: '', // Name of the genre or rotation currently being played, if any
            topic: '', // If the DJ specified a show topic, this is the topic.
            stream: '', // Meta for the internet radio stream
            radiodj: '', // REST IP of the RadioDJ instance currently in control
            djcontrols: 'EngineeringPC', // Hostname of the computer in which has activated the most recent live/sports/remote broadcast via DJ Controls
            line1: 'We are unable to provide now playing info at this time.', // First line of meta for display signs
            line2: '', // Second line of meta for display signs
            time: moment().toISOString(true), // ISO string of the current WWSU time. NOTE: time is only pushed in websockets every night at 11:50pm for re-sync. Clients should keep their own time ticker in sync with this value.
            listeners: 0, // Number of current online listeners
            listenerpeak: 0, // Number of peak online listeners
            queueFinish: null, // An ISO timestamp of when the queue is expected to finish. NOTE: To conserve data, this is only pushed through websockets when the expected finish time changes by more than 1 second. Also, this will be null when not playing anything.
            trackFinish: null, // An ISO timestamp of when the current track is expected to finish. NOTE: To conserve data, this is only pushed through websockets when the expected finish time changes by more than 1 second. Also, this will be null when not playing anything.
            queueMusic: false, // If returning from break, or going live, and there are music tracks in the queue not counted towards queueLength, this will be true
            playing: false, // Whether or not something is currently playing in the active RadioDJ
            changingState: null, // If not null, all clients should lock out of any state-changing (state/*) API hits until this is null again. Will be state changing string otherwise.
            lastID: null, // An ISO timestamp of when the last top of hour ID break was taken.
            webchat: true, // Set to false to restrict the ability to send chat messages through the website
            playlist: null, // Name of the playlist we are currently airing
            playlist_position: -1, // Current position within the playlist
            playlist_played: null // Use moment.toISOString() when changing in changeMeta! If you directly store a moment instance here, database updating will fail
        }
### states
The value of the meta state key can be any of the following strings:
 - **unknown**: WWSU's state is currently unknown.
 - **automation_on**: WWSU is queuing and playing music automatically.
 - **automation_break**: WWSU is in break mode and awaiting the next show/broadcast to begin.
 - **automation_genre**: WWSU is automatically queuing and playing music from a specific genre.
 - **automation_playlist**: WWSU is running through a manually-edited playlist of tracks.
 - **automation_live**: A live show is about to begin.
 - **automation_remote**: A remote broadcast is about to begin.
 - **automation_sports**: A sports broadcast, produced in the studio, is about to begin.
 - **automation_sportsremote**: A sports broadcast, produced remotely, is about to begin.
 - **automation_prerecord**: A prerecorded show or podcast is about to begin.
 - **live_on**: A live show is airing.
 - **live_break**: A live show is on break.
 - **live_returning**: A live show is about to resume.
 - **live_prerecord**: A prerecorded show or podcast is currently airing.
 - **remote_on**: A remote broadcast is currently airing.
 - **remote_break**: A remote broadcast is taking a break.
 - **remote_break_disconnected**: A remote broadcast is on break because the remote stream disconnected from WWSU.
 - **remote_returning**: A remote broadcast is about to resume.
 - **sports_on**: A studio-produced sports broadcast is airing.
 - **sports_break**: A studio-produced sports broadcast is taking a break or is in halftime / injury break.
 - **sports_returning**: A studio-produced sports broadcast is about to resume.
 - **sportsremote_on**: A remotely-produced sports broadcast is airing.
 - **sportsremote_break**: A remotely-produced sports broadcast is taking a break or is in halftime / injury break.
 - **sportsremote_break_disconnected**: A remotely-produced sports broadcast is on break because the remote stream disconnected from WWSU.
 - **sportsremote_returning**: A remotely-produced sports broadcast is about to resume.
## Recipients
These endpoints regard the recipients and clients that may send or receive messages.
### /recipients/add-computers
DJ Controls clients should use this endpoint to register themselves as online. **Requires Authorization**.
 - Clients should call this endpoint after every re-connection as well, since recipients are erased when the server restarts.
 - **Request to this endpoint must be a websocket**.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, the "host" parameter will be removed; instead, the host from the provided auth/host token will be used.
#### Request
| key | criteria |
|--|--|
| host | string (required; the host name of the computer running DJ Controls) |
#### Response 200
        {
            "label": "Nickname" // The nickname of the client as we have it in records at this time.
        }
### /recipients/add-display
WWSU Display Signs should use this endpoint to register themselves as online.
 - Clients should call this endpoint after every re-connection since recipients are erased when the server restarts.
 - This will also subscribe the socket to the "messages" event to receive messages to be displayed on the display sign, as well as the "display-refresh" event which the display sign should restart itself when called.
 - **Request to this endpoint must be a websocket**.
#### Request
| key | criteria |
|--|--|
| host | string (required; the host name of the display sign) |
#### Response 200
        {
            "label": "Nickname" // The nickname of the client as we have it in records at this time.
        }
### /recipients/add-web
Public clients should use this endpoint prior to using any messages endpoints to register themselves as online.
 - Clients should call this endpoint after every re-connection as well, since recipients are erased when the server restarts.
 - **Request to this endpoint must be a websocket**.
#### Response 200
        {
            "label": "Nickname" // The nickname of the client as we have it in records at this time.
        }
### /recipients/edit-web
Public clients wishing to change their nickname should call this endpoint.
 - **Request to this endpoint must be a websocket**.
#### Request
| key | criteria |
|--|--|
| label | string (required; the nickname to use for this client) |
#### Response 200 OK
### /recipients/get
Retrieve an array of recipients that can receive and send messages.
 - This endpoint supports sockets, returns data in the structure defined in the websockets section, and uses the "recipients" event.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200

    [
        {
            "createdAt": "2018-05-15T22:31:34.381Z",
            "updatedAt": "2018-05-15T22:31:34.381Z",
            "ID": 1,
            "host": "emergency", // An alphnumeric ID of the recipient
            "group": "system", // Each recipient can be grouped together by the group
            "label": "Technical Issues", // A human friendly label for the recipient
            "status": 1, // 1 = not used, 2 = yellow (online), used by the computers and display groups, 3 = unused, 4 = unused, 5 = green (online), used by public clients, 0 = gray (offline / none)
            "time": "2018-05-15T22:31:34.381Z" // ISO string of the last time the recipient had a change in status.
        },
        ...
    ]
## Requests
Requests endpoints regard the WWSU track request system.
### /requests/get
Get an array of requested tracks. **Requires authorization**
 - This endpoint supports sockets, uses the "requests" event, and returns data in the structure defined in the websockets section. However, it is important to note that a delete is not sent out until the request begins playing; it is not sent out when a request is queued in automation. This is by design.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200
        [
            {
                "createdAt": "2018-11-17T22:24:28.000Z",
                "updatedAt": "2018-11-17T22:24:28.000Z",
                "ID": 531,
                "songID": 34030, // ID of the song that was requested (see songs/get)
                "username": "test", // The name of the person who made the request
                "userIP": "130.108.140.59", // The IP address of the person who made the request
                "message": "", // A message left by the person making the request
                "requested": "2018-11-17T22:24:28.000Z", // ISO timestamp of when the request was placed
                "played": 0, // 0 = not played yet, 1 = played
                "trackname": "Skrillex - Bangarang" // Artist - Title of the track requested
            },
            ...
        ]
### /requests/place
Place a track request in the system.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
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
                                            </div>` // a bootstrap-compatible HTML message to display to the requester.
        }
### /requests/queue
Immediately queue or play a request. **Requires Authorization**.
 - If in automation, will queue it to the top.
 - If live / sports / remote / sportsremote, will queue and immediately begin playing it.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the request (NOT the song ID!) to queue now) |
#### Response 200 boolean
true if the track was queued, false if the track was not queued. A track may fail to queue if it is already in the queue, or it fails track rotation rules.
## Silence
Silence endpoints should be hit by the silence detection application in order to trigger certain operations for audio silence.
### /silence/active
This endpoint should be hit when silence was detected.
 - It should be hit once every minute until silence is resolved.
 - Will trigger silence alarms, and skip/disable the current track in automation, if one is playing.
#### Request
| key | criteria |
|--|--|
| key | string (required; the key/password as configured in the WWSU application, since silence detection program does not support /user/auth authorization.) |
#### Response 200 OK
### /silence/inactive
This endpoint should be hit when previously detected silence has been resolved.
#### Request
| key | criteria |
|--|--|
| key | string (required; the key/password as configured in the WWSU application, since silence detection program does not support /user/auth authorization.) |
#### Response 200 OK
## Songs
Songs endpoints regard the available songs/tracks in the automation system.
### /songs/get-genres
Get an array of genres.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200
        [
            {
                "ID": 33,
                "name": "Hip-Hop / R&B"
            },
            ...
        ]
### /songs/get-liked
Retrieve an array of tracks that this host/IP has liked recently and cannot yet like again at this time.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200
        [
            18293,
            45093,
            ...
        ]
### /songs/get
Get an array of tracks from the automation system.
 - If ID is not specified, this will only return songs that fall in the configured music categories.
 - For performance reasons, song.category, song.request, and song.spins will only be included if ID was specified in the request parameters.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
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
### /songs/like
Mark a track as liked. Depending on configuration, this might also bump the track's priority in rotation.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| trackID | number (required; the ID of the track to like) |
#### Response 200 OK
#### Response 500 various errors if a track cannot be liked at this time
### /songs/queue-add
Queue a Top Add into RadioDJ. If in a show, will play the Add immediately. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200
### /songs/queue-liner
Queue and play a Sports Liner. Will error if we are not in a sports broadcast. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200
#### Response 500
### /songs/queue-psa
Add a PSA into the RadioDJ queue. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| duration | number (optional; if provided, the PSA queued will be this long in seconds, +/- 5 seconds. Defaults to 30.) |
#### Response 200
## State
State endpoints are used to request to change states in WWSU's system (for example, going live or going to automation).
### /state/automation
Request to go into automation mode. **Requires authorization**
 - If coming from a sports broadcast, this will also play the closer, if there is one. 
 - Requests do not get a response until the entire process of going to automation is completed on the backend. This could take several seconds.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| transition | boolean (optional; if true, system will go into break instead of automation... used for quick transitioning between shows. NOTE: system will only wait 5 minutes in break. If a show does not begin in 5 minutes, system will go into full automation. Defaults to false.) |
#### Response 200
        {
            "showTime": 0, // Number of minutes that the show was on the air
            "subtotalXP": 0, // Total amount of XP the DJ earned for this show. NOTE: This property may not exist for non-live shows.
            "showXP": 0, // Amount of XP earned for showTime. NOTE: This property may not exist for non-live shows.
            "listeners": [], // Array of online listener data during the show (uses same format as the response from listeners/get)
            "listenerMinutes": 0, // Number of online listener minutes during the show.
            "listenerXP": 0, // Amount of XP earned for online listener minutes. NOTE: This property may not exist for non-live shows.
            "messagesWeb": 0, // Number of messages the DJ sent to web/mobile users during the show.
            "messagesXP": 0, // Amount of XP earned for sending messages to web/mobile users. NOTE: This property may not exist for non-live shows.
            "topAdds": 0, // Number of Top Adds played during the show.
            "topAddsXP": 0, // Amount of XP earned for playing top adds. NOTE: This property may not exist for non-live shows.
            "IDsXP": 0, // Amount of XP earned for playing on-time top of the hour ID breaks. NOTE: This property may not exist for non-live shows.
            "totalXP": 0, // Total XP the DJ has earned overall to date. NOTE: This property may not exist for non-live shows.
        }
### /state/break
Go into break mode (play PSAs, or music if halftime is true, until state/return is called). **Requires authorization**
 - Requests do not get a response until the entire process of starting a break is complete.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| halftime | boolean (optional; if true, will switch to a halftime / extended break. If false, will switch to a standard break. Defaults to false. This is ignored if we are not in a sports broadcast.) |
#### Response 200 OK
### /state/change-radio-dj
Tell the system to switch to a different RadioDJ instance in the array of configured RadioDJ instances.  **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200 OK
### /state/live
Request to go live. **Requires authorization**
 - Requests do not get a response until the entire process of preparing for live is completed on the backend. This could take several seconds.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
 - **WARNING:** As of version 5.0.0, the "djcontrols" parameter will be removed; instead, the host from the provided auth/host token will be used.
#### Request
| key | criteria |
|--|--|
| topic | string (optional; a short blurb describing this live broadcast.) |
| showname | string (required; the name of this live broadcast. It must follow this format: "DJ name/handle - show name". Validation will fail if it does not.) |
| webchat | boolean (optional; True allows the public to send messages to the DJ; false disallows this. Defaults to true.) |
| djcontrols | string (required; the computer hostname requesting to go live (this should be executed from DJ Controls)) |
#### Response 200 OK
### /state/remote
Request to begin a remote broadcast. **Requires authorization**
 - **Before beginning**, ensure audio is being streamed to the separate remote stream.
 - Requests do not get a response until the entire process of preparing for a remote broadcast is completed on the backend. This could take several seconds.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
 - **WARNING:** As of version 5.0.0, the "djcontrols" parameter will be removed; instead, the host from the provided auth/host token will be used.
#### Request
| key | criteria |
|--|--|
| topic | string (optional; a short blurb describing this broadcast.) |
| showname | string (required; the name of this broadcast. It must follow this format: "Show host - show name". Validation will fail if it does not.) |
| webchat | boolean (optional; True allows the public to send messages to the host's DJ Controls; false disallows this. Defaults to true.) |
| djcontrols | string (required; the computer hostname requesting to go to remote (this should be executed from DJ Controls)) |
#### Response 200 OK
### /state/return
Return from a break, back into the broadcast. **Requires authorization**
 - Requests do not get a response until the entire process of returning is completed on the backend.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Response 200 OK
### /state/sports
Request to begin a sports broadcast. **Requires authorization**
 - Requests do not get a response until the entire process of preparing for a sports broadcast is completed on the backend. This could take several seconds.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
 - **WARNING:** As of version 5.0.0, the "djcontrols" parameter will be removed; instead, the host from the provided auth/host token will be used.
 - **WARNING:** As of version 5.0.0, the "remote" parameter will be removed; state/sports-remote will be made instead for remote sports broadcasts. It will have the same request parameters as state/sports (after the indicated parameters are removed).
#### Request
| key | criteria |
|--|--|
| topic | string (optional; a short blurb describing this broadcast.) |
| sport | string (required; the sport being broadcast. This must be configured in the Node application.) |
| remote | boolean (optional; if true, this will be a remote sports broadcast. Defaults to false.) |
| webchat | boolean (optional; True allows the public to send messages to the host's DJ Controls; false disallows this. Defaults to true.) |
| djcontrols | string (required; the computer hostname requesting to go to remote (this should be executed from DJ Controls)) |
#### Response 200 OK
## Status
Status endpoints refer to the status of WWSU subsystems.
### /status/get
Get an array of the status of WWSU subsystems.
 - This endpoint supports sockets, uses the "status" event, and returns data in the structure defined in the websockets section.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
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
                "time": "2018-05-15T22:31:34.381Z" // ISO String indicating the most recent time the subsystem was detected as status 5. Changes to this are NOT pushed to websockets.
            },
            ...
        ]
## Timesheet
Timesheet endpoints regard the internal timesheet and clock in/out system for WWSU directors.
### /timesheet/add
Add a timesheet entry into the system.
 - If the director is present, the add entry will be a clock-out entry. If the director is not present, the add entry will be a clock-in entry. 
 - Do not use this endpoint for editing; use the edit endpoint for editing entries.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
 - **WARNING:** As of version 5.0.0, the "login" parameter will be removed; the timesheet record added will be for the authorized director.
#### Request
| key | criteria |
|--|--|
| login | string (required; The OpenProject login of the director for this timesheet entry.) |
| timestamp | string (required; a timestamp indicating the time this director clocked in/out. Must be valid by moment.js.) |
#### Response 200 OK
#### Response 404
### /timesheet/edit
Edit a specific timesheet entry. **Requires authorization**
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/admin-director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the timesheet entry to be edited) |
| time_in | string (required; a moment.js valid timestamp indicating when the director clocked in) |
| time_out | string (a moment.js valid timestamp indicating when the director clocked out. Use null if the director has not clocked out yet. Defaults to null.) |
| approved | boolean (required; true if this timesheet entry has been approved, false if it is flagged.) |
#### Response 200 OK
#### Response 403
#### Response 404
### /timesheet/get
Return an array of timesheet entries for the week.
 - This endpoint supports sockets, uses the "timesheet" event, and returns data in the structure defined in the websockets section. Socket is only subscribed to if parameter date is not provided in the request.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
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
### /timesheet/view
Access the timesheet web interface.
#### Request
#### Response 200 (text/html)
## XP
XP endpoints deal with the XP and remote credits earned by DJs.
### /xp/add
Add XP or remote credits to a DJ. **Requires Authorization**.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| djs | array (required; an array of DJ IDs earning the XP/remote) |
| type | string (required; the type. Use "remote" for remote credits, or "xp" for XP.) |
| subtype | string (required; a monikor for what the XP or remote credits were earned for.) |
| description | string (optional; A description explaining what this XP or remote credits were earned for.) |
| amount | number (required; number of XP or remote credits earned.) |
| date | string (optional; moment.js parsable string of when this XP or remote credits were earned. Defaults to now.) |
#### Response 200 OK
### /xp/edit
Edit an XP / remote credit entry. **Requires Authorization**.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the record to edit) |
| dj | number (optional; the DJ Id that this record belongs to) |
| type | string (optional; the type. Use "remote" for remote credits, or "xp" for XP. If provided, the original value will be overwritten with this.) |
| subtype | string (optional; a monikor for what the XP or remote credits were earned for. If provided, the original value will be overwritten with this.) |
| description | string (optional; A description explaining what this XP or remote credits were earned for. If provided, the original value will be overwritten with this.) |
| amount | number (optional; number of XP or remote credits earned. If provided, the original value will be overwritten with this.) |
| date | string (optional; moment.js parsable string of when this XP or remote credits were earned. If provided, the original value will be overwritten with this.) |
#### Response 200 OK
### /xp/get
Get the XP / remote credits earned by a DJ. **Requires Authorization**.
 - This endpoint supports sockets, uses the "xp" event, and returns data in the structure defined in the websockets section. A socket is only subscribed to if dj is not provided.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/host authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| dj | number (optional; the ID of the DJ to get XP / remotes for. If not provided, the endpoint will simply return "OK" but will subscribe to the xp event if the request was a socket.) |
#### Response 200
        [
            {
                "createdAt": "2018-05-29T18:13:01.763Z", // ISO date string of when the XP was earned
                "updatedAt": "2018-05-29T18:13:01.763Z",
                "ID": 7,
                "dj": 5, // ID of the DJ that this record applied to
                "type": "remote", // Either "xp" for XP, or "remote" for remote credits. Could also be "add-dj" which is a blank entry to register a new DJ in the system.
                "subtype": "remote-sports", // A monikor to further categorize the reason for the earned XP or remotes.
                "description": null, // A description provided for this record. Could be null.
                "amount": 1 // Number of XP or remote credits earned in this record. Could be negative and could be a float.
            },
            ...
        ]
#### Response 200 OK
### /xp/remove
Removes an XP record (removes XP / remote credits). **Requires Authorization**.
 - **WARNING:** As of version 5.0.0, this endpoint will require auth/director authorization. See the warning in "Hosts and Authorization" for more information.
 - **WARNING:** As of version 5.0.0, this endpoint will reject on HTTP requests; you must use a websocket request.
#### Request
| key | criteria |
|--|--|
| ID | number (required; the ID of the XP/remote record to remove.) |
#### Response 200 OK
