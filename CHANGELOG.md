# Changelog
All notable changes to this project will be documented in this file as of version 4.5.0.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as of version 4.5.0.

## [1.0.0 BETA 6] (Due to being behind the release schedule, 1.0.0 will never be stable)
### REMOVED
 - Removed deprecated discipline endpoints discipline/ban-* [Issue 64](https://github.com/Lovinity/wwsu/issues/64)
 - Removed deprecated discipline helpers sails.helpers.discipline.ban* [Issue 64](https://github.com/Lovinity/wwsu/issues/64)
 - Removed deprecated queue parameter in sails.helpers.rest.cmd [Issue 60](https://github.com/Lovinity/wwsu/issues/60)
 - Removed deprecated Songs.pendingCmd [Issue 59](https://github.com/Lovinity/wwsu/issues/59)
 - Removed resume parameter from sails.helpers.playlists.start [Issue 58](https://github.com/Lovinity/wwsu/issues/58)
 - Removed Meta.djcontrols [Issue 57](https://github.com/Lovinity/wwsu/issues/57)
 - Removed Meta.showStamp
 - Removed includeCurrentTrack parameter from sails.helpers.songs.remove [Issue 56](https://github.com/Lovinity/wwsu/issues/56)
 - UAB Directors timesheet system.

### Added
 - "device" property returned for recipient objects in recipients/get. This will contain the OneSignal UUID if the recipient is using the WWSU mobile app. Otherwise, it will be null.
 - "device" optional parameter for requests/place. If provided, the onesignal ID will receive a push notification when the requested track is played.
 - "device=" query-string parameter for /listen and all /listen/* web pages. Specify OneSignal ID if loading these pages from the WWSU app. That way, subscribing / push notifications will be enabled for that device.
 - "device" optional parameter for recipients/add-web . Provide the OneSignal ID if the recipient is from the WWSU mobile app.
 - "device" optional parameter in sails.helpers.recipients.add. Provide the OneSignal ID if the recipient is from the WWSU mobile app.
 - Logging of when Google Calendar events were cancelled (removed) [only applicable for events within the next week to date]. Logged via "cancellation" logtype.
 - When logging an absence or cancellation, if the DJ does not exist in the system, it will be created instead of ignored.
 - sails.helpers.onesignal.send() and sails.helpers.onesignal.sendEvent() helpers for sending out push notifications.
 - Push notification subscription system where users can be notified when shows go on the air, get cancelled, or get changed.
 - "scheduled_in", "scheduled_out", and "unique" attributes in Timesheet. This allows tracking office hour consistency.
 - Logging when a director cancels office hours or does not clock in for office hours. These will fall under logtype "director-cancellation" and "director-absent" respectively.
 - Logging of when a director's office hours changed. These will fall under logtype "director-change".
 - "start" property for each specialBreaks in configuration; these are queued at the start of a broadcast.
 - "end" property for each specialBreaks in configuration; these are queued when a broadcast ends.
 - sails.helpers.songs.reloadSubcategories() which reloads RadioDJ subcategory numbers into configuration.
 - sails.helpers.break.validate with tasks parameter, used to validate that an array of break tasks is completely valid.
 - "accountability" column to hosts. Instead of using "emergencies" for both tech issues and DJ/Director accountability notifications, emergencies will just be for tech issues, and accountability will be for DJ/director notifications.
 - analytics/showtime and sails.helpers.analytics.showtime(Djs.ID) for gathering showtime analytics about Djs.ID, or all DJs if Djs.ID is not passed.
 - "happened" and "ignore" columns in Attendance. Happened = 1 for events that happened, 0 for unexcused absences, and -1 for cancellations. Ignore = 0 when record should not be ignored in reputation, 1 when it should only be ignored in %, and 2 if it should be ignored completely. [Issue 84](https://github.com/Lovinity/wwsu/issues/84)
 - planner/* endpoints and Planner model to use as a tool for generating schedules for DJ shows.
 - calendar/remove for removing calendar events (mainly canceled ones that should not appear in the system; removing active events may result in them getting re-added).
 - directors/remove-hours for removing director hours (mainly canceled ones that should not appear in the system; removing active events may result in them getting re-added).
 - Added column "happenedReason" to attendance which contains any reasoning for show/event cancellations, specifically if an event is canceled from the web panel.
 - timesheet/remove to remove timesheets and their corresponding Directorhours events.
 - "duration" parameter to attendance/get to specify number of days of attendance records to get, if using date based filtering. Can specify between 1 and 14. Defaults to 1.
 - "fourteenDays" parameter to timesheet/get. If true, will get records up to 7 days prior to specified date, and 7 days ahead of specified date, instead of records for the week which the date falls in. Defaults to false.
 - "problem" parameter to state/break and categories.technicalIssues in configuration. If problem=true, a liner from categories.technicalIssues will queue and play at the beginning of the break. This is used when a break was triggered because of an issue with a remote broadcast.
 - Status check on Google Calendar for Office Hours events that exist on Google Calendar, but provided director does not actually exist in the system. [Issue 85](https://github.com/Lovinity/wwsu/issues/85)
 - "noFade" category; tracks in this category will be checked hourly for any fade cue points. Tracks with any fading will have the fade zeroed (removed).
 - Underwritings model for management of underwritings in Node rather than RadioDJ.
 - sails.helpers.break.addUnderwriting helper, with fastForwardOnly and quantity parameters. This helper determines which underwritings should be queued to air, and queues them.
 - Underwritings status system for alerting of underwritings that are behind schedule.
 - queueUnderwritings break task for specifying in breaks config to queue underwritings. The quantity parameter determines the maximum underwritings to queue (rule may be ignored if more underwritings are way behind schedule).
 - Added Darksky model; fetches Darksky.net weather information for use on display signs and other applications via darksky/get and the darksky websocket event.
 - Added parameter "category" to songs/get; allows to filter songs by configured Node music category (not the same as RadioDJ main category).
 - Added parameter "ignoreNonMusic" to songs/get. If true, non-music tracks will not be returned (eg. non-requestable tracks). Ignored if ID is specified.
 - Added parameter "ignoreDisabled" to songs/get. If true, disabled tracks will not be returned. Ignored if ID is specified.
 - Added parameter "ignoreSpins" to songs/get. If true, spin counts will not be returned, speeding up response time. Ignored if ID is not specified.
 - Attendance.createRecord now accepts undefined as a parameter. If undefined, current attendance record will be closed off, but a new one will not be made.
 - Attendance.createRecord might return a property of "updatedRecord" in its returned object if the function closed off an active attendance record.
 - Triggering silence/active more than once in a 3-minute time span when a broadcast is on the air will result in the automatic termination of the broadcast (into automation_break mode). This is to prevent show hosts from airing excessive silence.
 - lockToDJ column in the Hosts model of type number, allowing null. This allows locking hosts to a specific DJ (null if not locked to one). When a host is locked to a specific DJ, they cannot start live shows nor live sports broadcasts. They can only start remote and sports remote broadcasts when scheduled and only under their name. They cannot queue/play PSAs, Top Adds, Sports Liners, nor requested tracks unless they are on the air. They cannot send messages to the display signs nor to website visitors unless they are on the air. They cannot issue discipline against website visitors unless they are on the air. [Issue 97](https://github.com/Lovinity/wwsu/issues/97)
 - sails.helpers.break.removeNullTasks to filter out null tasks from a break tasks array. Null tasks were being added and causing bugs.
 - forced parameter to sails.helpers.playlists.start. When true, playlist will start regardless of current meta state. [Issue 95](https://github.com/Lovinity/wwsu/issues/95)
 - "actual" property to planner/add and planner/edit for setting and modifying final scheduled times for shows.
 - "answerCalls" boolean property to recipients. It is true when the corresponding host's authorized and answerCalls settings are true, otherwise it is false.
 - "makeCalls" boolean property to recipients. It is true when the corresponding host's authorized and makeCalls settings are true, otherwise it is false.
 - "hostID" number property to recipients. If the recipient is mapped to a host in the hosts model, this will be the ID number of the hosts record. Otherwise, it will be null.
 - added "lastTwoWeeks" property to DJ analytics which includes arrays of timestamps for offStarts, offEnds, absences, cancellations, and missedIDs from the last 2 weeks.
 - "emergencies", "accountability-shows", and "accountability-directors" subscription types. Those subscribed to "emergencies" will receive notifications when very critical incidents happen. Those subscribed to "accountability-shows" will receive notifications about DJ shows. "accountability-directors" are notifications about directors / their hours.
 - listen/directors for subscribing and unsubscribing a device to/from director-related push notifications. Also added subscribers/add-directors and subscribers/remove-directors for these specific subscription types with director authorization required.
 - Editing / removing DJs will automatically update related push notification subscription records.
 - When calendar events no longer exist, their one-time subscription records will be removed automatically.

### Changed
 - Many of the methods used in api controllers and in models have been migrated to sails helpers.
 - Removed a lot of the logging that could potentially output sensitive data to the console.
 - "calendar" model now uses nodebase datastore instead of RAM. This is so we can persist-store event cancellations and time changes.
 - "directorhours" model now uses timesheets datastore instead of RAM. This is so we can persist-store office hour cancellations and time changes.
 - requests/place response object changed. HTML property removed; instead, message property will be used, which will NOT contain div/bootstrap data.
 - sails.helpers.requests.checkRequestable now returns message property instead of HTML property; message property does not contain div/bootstrap data.
 - "active" property of calendar events and directorhours is now a number instead of boolean: -1 is cancelled, 0 is expired, 1 is active, 2 is active but date/time changed.
 - Display signs and website no longer removes cancelled events (except for genres) but displays them with a "cancelled" badge so people know it was cancelled.
 - state/automation output utilizes sails.helpers.showtime.
 - Timesheet.approved no longer boolean. -1 = cancelled, 0 = not approved or absent, 1 = approved or upcoming hours.
 - Timesheet now creates records in advance for upcoming director hours. Timesheet system will merge clock in/out entries with these ones as necessary. Allows for better logging of director absences, cancellations, and scheduled hours.
 - Google Calendar status will now list each specific issue found with calendar events. [Issue 86](https://github.com/Lovinity/wwsu/issues/86)
 - Liners might also queue underwritings if any of them are way behind schedule.
 - sails.helpers.songs.queue: the rules parameter was changed from type boolean to type string and accepts the following values: "noRules" (do not consider rotation rules), "lenientRules" [default] (consider rotation rules until/unless there are no more tracks that can be queued, then start queuing randomly), and "strictRules" (consider rotation rules and stop queuing when there are no more tracks that can be queued)
 - Remove live_prerecord; replace with prerecord_on and prerecord_break [Issue 98](https://github.com/Lovinity/wwsu/issues/98)
 - New attendance records for sports broadcasts search calendar titles with "startsWith" instead of exact title; this allows directors to add " vs. team" in sports events. Calendar verification has also been updated accordingly. [Issue 94](https://github.com/Lovinity/wwsu/issues/94)
 - Calendar property verify_message is now verifyMessage, and verify_titleHTML is now verifyTitleHTML. [Issue 93](https://github.com/Lovinity/wwsu/issues/93)
 - requests.queue: consider_playlist to considerPlaylist and liner_first to linerFirst [Issue 92](https://github.com/Lovinity/wwsu/issues/92)
 - changed scheduled_in and scheduled_out to scheduledIn and scheduledOut in Timesheets [Issue 91](https://github.com/Lovinity/wwsu/issues/91)
 - Meta: change playlist_played to playlistPlayed [Issue 89](https://github.com/Lovinity/wwsu/issues/89)
 - Meta: change playlist_position to playlistPosition [Issue 88](https://github.com/Lovinity/wwsu/issues/88)
 - messages; change to_friendly to toFriendly and from_friendly to fromFriendly and from_IP to fromIP [Issue 87](https://github.com/Lovinity/wwsu/issues/87)
 - Moved listeners/get to analytics/listeners [Issue 71](https://github.com/Lovinity/wwsu/issues/71)
 - Renamed songs/queue-add to songs/queue-top-add [Issue 67](https://github.com/Lovinity/wwsu/issues/67)
 - Moved sails.models.attendance.createRecord to sails.helpers.attendance.createRecord. [Issue 12](https://github.com/Lovinity/wwsu/issues/12)
 - Moved all functions in the calendar model for syncing events to sails.helpers.calendar.sync(ignoreChangingState = false). [Issue 12](https://github.com/Lovinity/wwsu/issues/12)
 - Moved model function directors.updateDirectors to sails.helpers.directors.update. [Issue 12](https://github.com/Lovinity/wwsu/issues/12)
 - meta.changeMeta moved to sails.helpers.meta.change with input validation for all keys via meta.template. [Issue 12](https://github.com/Lovinity/wwsu/issues/12)
 - meta['A'] replaced with meta.memory.
 - sails.models.status.changeStatus changed to sails.helpers.status.change.
 - Host property of recipients for computers no longer uses the actual host, but instead a protected unique string, for security purposes.
 - Response of sails.helpers.recipients.add is now an object: {label: 'friendly name of host', alreadyConnected: true|false (if true, this host already has one other socket connected)} .

 ### Fixed
 - Condition in manually edited timesheets could cause issues when there are more than one scheduled hour block within a timesheet. [Issue 70](https://github.com/Lovinity/wwsu/issues/70)

## [5.1.0] - 2019-03-15
### Deprecated
 - /discipline/ban-day, /discipline/ban-indefinite, and /discipline/ban-show. Use /discipline/add instead. These endpoints will be removed in version 6.0.0.
 - sails.helpers.discipline.banDay, sails.helpers.discipline.banIndefinite, and sails.helpers.discipline.banShow. Use sails.helpers.discipline.add instead. These helpers will be removed in version 6.0.0.

### Added
 - /auth/* endpoints, upon successful authorization, will also return expires property in addition to token property. Expires is how long the token is valid for, in milliseconds.
 - Slides.countActive() in wwsu-slides.js for counting the number of active slides currently.
 - /recipients/register-peer for DJ Controls connecting to Peerjs to report their peerjs ID to the system.
 - Helper break.executeArray for executing an array of break objects through break.execute. [Issue 54](https://github.com/Lovinity/wwsu/issues/54)
 - /discipline/get, /discipline/edit, /discipline/add, and /discipline/remove for modifying discipline records in the system. [Issue 29](https://github.com/Lovinity/wwsu/issues/29)
 - sails.helpers.discipline.add to replace the three other discipline helpers.
 - Unauthorized Shows, Remotes, and Sports broadcasts that start will be logged under the "unauthorized" logtype.

### Changed
 - /silence/active and /silence/inactive now must be called with a valid socket and an authorized host.
 - /silence/active and /silence/inactive no longer take any input parameters; key was removed.
 - /display/public events 2-4 and 5-7 slides deactivated for now to conserve on information.
 - EAS alerts originating from NWS that are no longer being reported by CAPS (such as canceled) will not be removed from the system for 5 more minutes because of a potential bug if removed immediately.
 - Breaks during live shows, remotes, and sports broadcasts now configured in sails.config.custom.specialBreaks. [Issue 54](https://github.com/Lovinity/wwsu/issues/54)

### Fixed
 - sails.helpers.recipients.add bug adding all computer recipients to Status instead of only the ones we want to track.
 - Listener's corner is more responsive on mobile devices.
 - Host request in wwsu.js fails for non-authentication requests. [Issue 62](https://github.com/Lovinity/wwsu/issues/62)
 - Changing announcement type caused display slides to not be removed when they should have been. Now, when announcement type is changed, a websocket remove is sent to the previous type.
 - If an unscheduled show is on the air and happens to later fall within a scheduled timeframe, its attendance record will be updated accordingly. [Issue 66](https://github.com/Lovinity/wwsu/issues/66)

### Removed
 - Removed the frozenRemote status errorCheck as we are favoring webRTC audio calls for remote broadcasts instead of shoutcast.
 - Removed all instances of queuing a remote broadcast track for remote_on and sportsremote_on since we are using webRTC via DJ Controls now.

## [5.0.2] - 2019-02-02
### Added
 - wwsu-slides.js for managing display sign slides
 - displayTime to announcements and relevant endpoints; used to specify the amount of time in seconds the announcement should display on display signs and on the web. Defaults to 15. Must be between 5 and 60.

### Changed
 - Display Internal now uses material design and wwsu-slides.js
 - Display Public now uses material design and wwsu-slides.js

## Fixed
 - Attempted to fix a bug where new NWS alerts were being pushed to websockets containing only the first county issued. Now, it should wait until all counties are processed.
 - Uncaught length bug in truncateText helper.

## [5.0.1] - 2019-01-27
### Deprecated
 - sails.helpers.songs.remove includeCurrentTrack parameter never worked correctly and will instead be used by something else. This parameter will now be ignored. It will be removed in 6.0.0.
 - Songs.pendingCmd; it will be removed in 6.0.0.
 - Parameter "queue" in sails.helpers.rest.cmd; it will be removed in 6.0.0.

### Added
 - lastSeen column in Djs model that updates to current datetime when a DJ does a show. [Issue 55](https://github.com/Lovinity/wwsu/issues/55)
 - config.custom.queueCorrection and checks in the state/* endpoints for checking queue lengths, and removing / skipping tracks if the queue is too long to get shows on sooner. [Issue 53](https://github.com/Lovinity/wwsu/issues/53)
 - optional oldQueue parameter in sails.helpers.error.post. If provided as array of RadioDJ Meta.automation queue, this will be re-queued in the new RadioDJ. [Issue 50](https://github.com/Lovinity/wwsu/issues/50)
 - optional queue parameter in sails.helpers.songs.queue. If true, the helper Promise will not be resolved until it has been confirmed that the track was queued in RadioDJ (or an error is thrown after 10 seconds).
 - optional queue parameter in sails.helpers.songs.queuePending. If true, the helper Promise will not be resolved until it has been confirmed that the tracks were queued in RadioDJ (or an error is thrown after 10 seconds).
 - task.rules in sails.config.custom.breaks for the queue task. If true, tracks will be checked against playlist rotation rules.
 - sails.helpers.breaks.execute for executing configured break objects. [Issue 54](https://github.com/Lovinity/wwsu/issues/54)
 - Songs.queueCheck to monitor for tracks we want to ensure were queued before resolving.
 - sails.helpers.rest.checkQueue with parameter ID (track ID). When called, the helper will return with a Promise that does not resolve until sails.helpers.rest.getQueue confirms the track was queued.

## [5.0.0] - 2019-01-25
### Deprecated
 - Meta.djcontrols will soon be removed from meta/get (but will still exist internally). This property will be removed in 6.0.0. For now, it will just return an empty string all the time. Clients are advised to use their own internal checking.
 - sails.helpers.playlists.start resume parameter has been deprecated and will be ignored. The parameter will be removed in version 6.0.0.

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
 - Timesheet editing via timesheet/view re-implemented with admin director authentication. [Issue 1](https://github.com/Lovinity/wwsu/issues/1)
 - announcements/add and announcements/edit takes danger, warning, info, or trivial for the level parameter. The announcements model does the same. [Issue 48](https://github.com/Lovinity/wwsu/issues/48)
 - errorCheck trigger time for frozen and queueFail increased from 15 to 30 seconds due to conflict with playlist queuing. [Issue 51](https://github.com/Lovinity/wwsu/issues/51)
 - listener's corner uses Material design.
 - Due to HTML complications, listener's corner shows chat, schedule, and request system all without the menu.
 - Due to JQuery complications, listener's corner uses iziModal instead of Material Design / Bootstrap modals.

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
 - Listener minutes calculations in Attendance not accurate. [Issue 47](https://github.com/Lovinity/wwsu/issues/47)
 - sanitize helper was changing & to &amp;.
 - EAS processes "This alert has expired"; these should be skipped.

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