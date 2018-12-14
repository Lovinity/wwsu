# Changelog
All notable changes to this project will be documented in this file as of version 4.4.5.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as of version 5.0.0.

## [Unreleased]
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
 
### Fixed
 - Typo in Attendance absence records causing dj value to be null. [Issue 16](https://github.com/Lovinity/wwsu/issues/16)
 - Fall back to Genre: Default when Google Calendar fails. [Issue 23](https://github.com/Lovinity/wwsu/issues/23)
 - listeners/get returns 500 error when no listener records fall within provided date/time range in parameters. [Issue 25](https://github.com/Lovinity/wwsu/issues/25)
