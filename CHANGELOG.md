# Changelog
All notable changes to this project will be documented in this file as of version 4.5.0.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as of version 4.5.0.

## [Unreleased]
### Added
 - Websocket policies; socket requests not originating from server.wwsu1069.org must provide a host query parameter, which is an authorized host (see Hosts). [Issue 24](https://github.com/Lovinity/wwsu/issues/24)
 - Added makeCalls, answerCalls, silenceDetection, and recordAudio options to hosts. [Issue 42](https://github.com/Lovinity/wwsu/issues/42)
 - state/sports-remote for remote sports broadcasts.
 - uab/directors/add, uab/directors/edit, uab/directors/get, and uab/directors/remove endpoints. Also, Uabdirectors model. This is used for UAB timesheet system. [Issue 40](https://github.com/Lovinity/wwsu/issues/40)
 - uab/timesheet/add, uab/timesheet/edit, uab/timesheet/get and uab/timesheet/view endpoints. Also, Uabtimesheet model. This is used for UAB timesheet system. [Issue 40](https://github.com/Lovinity/wwsu/issues/40)
 - sails.config.custom.startOfSemester, which should be configured every semester so that remote credit calculations are by semester.
 - For ending live shows, state/automation now also returns properties remoteCredits (number of credits the DJ has this semester), totalShowTime (total overall airtime in minutes), and totalListenerMinutes (total listener minutes during all shows).
 - announcements/add-problem . This endpoint should be used instead of announcements/add when reporting technical issues with WWSU.

### Changed
 - The authorization procedure of many endpoints has changed. See the readme file carefully for instructions on authorization and which endpoints require which type of authorization. [Issue 9](https://github.com/Lovinity/wwsu/issues/9)
 - Calling hosts/get with a host that does not exist no longer creates a new host in the database. This now happens via initial websocket connection requests.
 - The secret used for website host IP IDs no longer changes on each reboot; this is now set via sails.config.custom.hostSecret.
 - DJ Controls hosts are no longer monitored / configured in sails.config.custom. Instead, they are monitored in Status based off of the hosts in the database. [Issue 42](https://github.com/Lovinity/wwsu/issues/42)
 - DJ "name" column and director "name" column now must be unique.
 - Directors/get now takes optional name parameter; username (login) parameter was removed.
 - Directors login column no longer accepts null; a value must be provided.
 - Calls to directors/edit where parameter admin=false will be rejected if there are 1 or less admin directors in the system; this is to prevent accidental lockout.
 - Directors login column and dj login column will store logins as bcrypt factor 13 instead of plaintext.
 - Attendance/get response array will now be sorted by actualStart ASC if not null, else scheduledStart ASC if not null, else ID ASC. createdAt was inefficient for some records.
 - xp/get now returns as an object {startOfSemester: "ISO date string", data: []}. See README.md for more information.
 - (>=BETA.2) Timesheet editing via timesheet/view re-implemented with admin director authentication. [Issue 1](https://github.com/Lovinity/wwsu/issues/1)
 - (>=BETA.2) announcements/add and announcements/edit takes danger, warning, info, or trivial for the level parameter. The announcements model does the same. [Issue 48](https://github.com/Lovinity/wwsu/issues/48)
 - (>=BETA.3) errorCheck trigger time for frozen and queueFail increased from 15 to 30 seconds due to conflict with playlist queuing. [Issue 51](https://github.com/Lovinity/wwsu/issues/51)

### Removed
 - hosts/get no longer returns authorization tokens. [Issue 9](https://github.com/Lovinity/wwsu/issues/9)
 - Directors/get no longer returns the login property. The property is also no longer given in websockets.
 - Removed "host" parameter from messages/get, recipients/add-computers... and "from" parameter from messages/send. Uses the host authorized from the provided auth/host token instead.
 - Removed "djcontrols" parameter from state/live, state/remote, and state/sports. Will use the host authorized from the provided auth/host token instead.
 - Removed "remote" parameter from state/sports; use new state/sports-remote instead.
 - Removed "login" parameter from timesheet/add; uses the director authorized from the provided auth/director token instead.
 - Removed user.verify helper; no longer needed as verification will happen inside the policies.
 - state/automation no longer returns the "listeners" array property.

### Fixed
 - Internal Server Error on djs/add. [Issue 46](https://github.com/Lovinity/wwsu/issues/46).
 - (>=BETA.3) Listener minutes calculations in Attendance not accurate. [Issue 47](https://github.com/Lovinity/wwsu/issues/47)

## [4.5.4] - 2019-01-02
### Deprecated
 - As of version 5.0.0, hosts/get will no longer return authorization tokens. Instead, a new group of auth/* endpoints will be used. README.md has more information.
 - As of version 5.0.0, directors/get and djs/get will no longer return the "login" property.
 - As of version 5.0.0, directors/get will no longer use "username" parameter. Instead, optional "name" parameter can be provided to return only the director whose name matches the provided name.
 - As of version 5.0.0, Some endpoints as indicated in README.md will reject on HTTP requests and begin requiring the request to be made via websocket.
 - As of version 5.0.0, "host" will be required in the header when requesting to establish a websocket connection, except for requests originating from server.wwsu1069.org. The host parameter should include a Hosts.host who is authorized (authorized=true). Otherwise, the websocket request will be rejected.
 - As of version 5.0.0, calendar/verify will be removed.
 - As of version 5.0.0, clients must call a new state/sports-remote endpoint for remote sports broadcasts; the "remote" parameter will be removed from state/sports. state/sports-remote will have the same request parameters as state/sports.
 - As of version 5.0.0, a few unnecessary request parameters will be removed, and instead data from the provided auth token will be used. See README.md for more information.

### Changed
 - Queue PSA instead of random music in state/automation. [Issue 43](https://github.com/Lovinity/wwsu/issues/43)
 - Check status of RadioDJs when changing radioDJ instance. [Issue 38](https://github.com/Lovinity/wwsu/issues/38)

### Fixed
 - Editing a live DJ could cause issues in Meta. [Issue 35](https://github.com/Lovinity/wwsu/issues/35)
 - Google Calendar director hours status check goes success then error when no director hours. [Issue 36](https://github.com/Lovinity/wwsu/issues/36)
 - display/internal triggers marquee screensaver when lost connection when it should not.

### Added
 - display/public studio parameter (when studio=true, voice will only announce a 15-second warning when DJ is going live). [Issue 34](https://github.com/Lovinity/wwsu/issues/34)
 - In the RadioDJ cron checks, check for inactive RadioDJs playing something and send a stop command if they are playing. [Issue 39](https://github.com/Lovinity/wwsu/issues/39)
 - Multiple silence/active calls within 3 minutes in automation state will trigger a RadioDJ change. [Issue 44](https://github.com/Lovinity/wwsu/issues/44)

## [4.5.2] - 2018-12-18
### Changed
 - Added warnings about the changes in authorization system for version 5.0.0 in the readme.md file.
 - Discipline in Listener's Corner causes disconnection from socket.
 - Notifications about messages on the listener's corner now appear above the chat instead of in the chat.

### Fixed
 - Minor bug in attendance records when creating an absence record but more than one record matches provided unique value.
 - Discipline system not functioning properly. [Issue 3](https://github.com/Lovinity/wwsu/issues/3)

## [4.5.1] - 2018-12-17
### Changed
 - Status error messages (data) for internet stream, website, RadioDJ, and NWS CAPS are more helpful.

### Fixed
 - state/change-radio-dj not switching to another RadioDJ instance like it should. [Issue 31](https://github.com/Lovinity/wwsu/issues/31)
 - Calendar.js cannot read property ID of null when adding Attendance records with null DJ.
 - display/public On the Air slide does not display when a topic was provided. [Issue 26](https://github.com/Lovinity/wwsu/issues/26)
 - No connection to internet stream server does not trigger status error. [Issue 30](https://github.com/Lovinity/wwsu/issues/30)

## [4.5.0] - 2018-12-14
### Added
 - hosts/edit and hosts/remove API endpoints [Issue 8](https://github.com/Lovinity/wwsu/issues/8)
 - sails.helpers.pickRandom. [Issue 11](https://github.com/Lovinity/wwsu/issues/11)
 
### Changed
 - sails.helpers.songs.queue utilizes sails.helpers.pickRandom instead of sails.helpers.shuffle. [Issue 11](https://github.com/Lovinity/wwsu/issues/11)
 - display/internal system slide[6] sticky when global status is 1 (danger) or 2 (urgent). [Issue 22](https://github.com/Lovinity/wwsu/issues/22)
 - display/public Too many end div tags in On the Air slide.
 - Library updates.
 - hosts/get subscribes to web socket if the provided host is an authorized admin.
 - hosts/get returns Object.otherHosts array of all the DJ Controls hosts in the database when provided host is an authorized admin.
 - Djs.name now requires unique values; it is no longer allowed to have more than 1 DJ record with the same name. djs/edit will merge with an existing DJ if so, and djs/add will simply not work if name already exists.
 - New hosts via hosts/get will be assigned a random nickname for friendlyname via sails.helpers.recipients.generateNick().
 
### Fixed
 - Typo in Attendance absence records causing dj value to be null. [Issue 16](https://github.com/Lovinity/wwsu/issues/16)
 - Fall back to Genre: Default when Google Calendar fails. [Issue 23](https://github.com/Lovinity/wwsu/issues/23)
 - listeners/get returns 500 error when no listener records fall within provided date/time range in parameters. [Issue 25](https://github.com/Lovinity/wwsu/issues/25)
 - display/internal error when slide is 6 but the system status HTML has not yet loaded on the screen.