# Changelog
All notable changes to this project will be documented in this file as of version 4.5.0.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as of version 4.5.0.

## [Unreleased]
### Changed
 - Queue PSA instead of random music in state/automation. [Issue 43](https://github.com/Lovinity/wwsu/issues/43)
 - Check status of RadioDJs when changing radioDJ instance. [Issue 38](https://github.com/Lovinity/wwsu/issues/38)

### Fixed
 - Editing a live DJ could cause issues in Meta. [Issue 35](https://github.com/Lovinity/wwsu/issues/35)
 - Google Calendar director hours status check goes success then error when no director hours. [Issue 36](https://github.com/Lovinity/wwsu/issues/36)

### Added
 - display/public studio parameter (when studio=true, voice will only announce a 15-second warning when DJ is going live). [Issue 34](https://github.com/Lovinity/wwsu/issues/34)
 - In the RadioDJ cron checks, check for inactive RadioDJs playing something and send a stop command if they are playing. [Issue 39](https://github.com/Lovinity/wwsu/issues/39)

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