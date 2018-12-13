# Changelog
All notable changes to this project will be documented in this file as of version 4.4.5.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as of version 5.0.0.

## [Unreleased]
### Added
 - hosts/edit and hosts/remove API endpoints [Issue 8](https://github.com/Lovinity/wwsu/issues/8) [Commit 4c8ff91](https://github.com/Lovinity/wwsu/commit/4c8ff9177dfd81b3051de4158318bab286d4c987)
 - sails.helpers.pickRandom. [Issue 11](https://github.com/Lovinity/wwsu/issues/11) [Commit b9d85f6](https://github.com/Lovinity/wwsu/commit/b9d85f64feadf3043e4c3cb61ba09ef2b077c392)
 
### Changed
 - sails.helpers.songs.queue utilizes sails.helpers.pickRandom instead of sails.helpers.shuffle. [Issue 11](https://github.com/Lovinity/wwsu/issues/11) [Commit 200975c](https://github.com/Lovinity/wwsu/commit/200975c0543ce9f8c35a2cf1d405b69fdd7ceaff)
 - display/internal system slide[6] sticky when global status is 1 (danger) or 2 (urgent). [Issue 22](https://github.com/Lovinity/wwsu/issues/22) [Commit 625d919](https://github.com/Lovinity/wwsu/commit/625d9199399e6c769784ae86efda4cbf4913cec5)
 - display/public Too many end div tage in On the Air slide. [Commit 4883254](https://github.com/Lovinity/wwsu/commit/488325427fe9159e5b1bdd6ed440267e1057579f)
 - Library updates. [Commit e0e42e4](https://github.com/Lovinity/wwsu/commit/e0e42e45c77292a6730e413d3c8916726b2ce147)
 
### Fixed
 - Typo in Attendance absence records causing dj value to be null. [Issue 16](https://github.com/Lovinity/wwsu/issues/16) [Commit 14121d0](https://github.com/Lovinity/wwsu/commit/14121d07757f32c2158696b76ed62eda159df0b4)
 - Fall back to Genre: Default when Google Calendar fails.