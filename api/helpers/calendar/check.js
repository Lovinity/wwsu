var fs = require('fs')
var readline = require('readline')
var breakdance = require('breakdance')

module.exports = {

    friendlyName: 'calendar.check',

    description: 'Check for absent shows/directors, trigger programs that should start, and optionally check integrity of events in the next 14 days.',

    inputs: {
        ignoreChangingState: {
            type: 'boolean',
            defaultsTo: false,
            description: 'When triggering new radio programming, if set to true, ignore checks for whether or not we are already changing states. Defaults to false.'
        },

        checkIntegrity: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, we will check the integrity of events that trigger something (playlists, genres, prerecords) for the next 14 days, but we will NOT trigger any events.'
        }
    },

    fn: async function (inputs, exits) {
        if (inputs.checkIntegrity) {
            sails.log.debug(`Calendar integrity started`);
            var status = 5;
            var issues = [];
            sails.models.calendar.calendardb.getEvents(async (events) => {
                sails.log.debug(`Calendar integrity events retrieved for the next 14 days.`);

                if (events && events.length > 0) {
                    var playlists = {}
                    var djevents = {}

                    // Check playlists
                    var playlistsR = await sails.models.playlists.find();

                    // Check each playlist for duration and duplicates
                    sails.log.debug(`Calendar integrity playlists map initializing`);
                    maps = playlistsR.map(async playlist => {
                        var playlistSongs = []
                        var playlistDuplicates = 0
                        var duplicateTracks = []

                        // Get the playlist tracks
                        // LINT: Playlists_list is valid
                        // eslint-disable-next-line camelcase
                        var pTracks = await sails.models.playlists_list.find({ pID: playlist.ID })
                        sails.log.verbose(`Retrieved Playlists_list records: ${pTracks.length}`)
                        sails.log.silly(pTracks)

                        var temp = []

                        // Check for duplicates
                        pTracks.map(track => {
                            if (temp.indexOf(track.sID) > -1) { playlistDuplicates++ }
                            temp.push(track.sID)
                        })

                        // Get the song records for each playlist track
                        var songs = await sails.models.songs.find({ ID: temp, enabled: 1, duration: { '>=': 0 } })
                        sails.log.verbose(`Retrieved Songs records: ${songs.length}`)
                        sails.log.silly(songs)

                        var duration = 0

                        // Determine duration, ignoring duplicates
                        songs.map(song => {
                            if (playlistSongs.indexOf(`${song.artist} - ${song.title}`) > -1) {
                                playlistDuplicates++
                                duplicateTracks.push(`${song.artist} - ${song.title}`)
                            } else {
                                duration += song.duration
                            }
                            playlistSongs.push(`${song.artist} - ${song.title}`)
                        })

                        // Generate playlist object
                        playlists[ playlist.ID ] = ({ ID: playlist.ID, name: playlist.name, duration: duration, duplicates: playlistDuplicates, duplicateTracks: duplicateTracks.join('<br />') })
                        return true
                    });
                    await Promise.all(maps);
                    sails.log.debug(`Calendar integrity playlists map completed.`);

                    // Load all manual RadioDJ events into memory
                    var djeventsR = await sails.models.events.find({ type: 3 })
                    djeventsR.map(_event => { djevents[ _event.ID ] = _event })

                    // Load directors into memory
                    var directors = await sails.models.directors.find();

                    // Now, check each event
                    sails.log.debug(`Calendar integrity beginning event check of ${events.length} events`);
                    events
                        .filter((event) => (event.scheduleType === null || ([ 'canceled', 'canceled-system', 'canceled-changed' ].indexOf(event.scheduleType) === -1)) && moment(event.end).isAfter(moment()))
                        .map((event) => {
                            switch (event.type) {
                                case 'prerecord':
                                    // No playlist was assigned
                                    if (event.playlistID === null) {
                                        if (status > 2) { status = 2 }
                                        issues.push(`Prerecord event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} does not have a playlist assigned to it. This event will not air until fixed!`);
                                        break;
                                    }

                                    // Playlist does not exist in RadioDJ
                                    if (typeof playlists[ event.playlistID ] === 'undefined') {
                                        if (status > 2) { status = 2 }
                                        issues.push(`Prerecord event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} has an assigned playlist that does not exist in RadioDJ. This event will not air until an existing playlist is assigned!`);
                                        break;
                                    }

                                    // Playlist is 15 or more minutes too short
                                    if (((event.duration - 15) * 60) >= (playlists[ event.playlistID ].duration * 1.05)) {
                                        if (status > 3) { status = 3 }
                                        issues.push(`Prerecord playlist "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} is short on content by about ${moment.duration(((event.duration * 60) - (playlists[ event.playlistID ].duration * 1.05)), 'seconds').humanize()}`);
                                    }

                                    // Playlist is 5 or more minutes too long
                                    if (((event.duration + 5) * 60) <= (playlists[ event.playlistID ].duration * 1.05)) {
                                        if (status > 3) { status = 3 }
                                        issues.push(`Prerecord playlist "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} has about ${moment.duration(((playlists[ event.playlistID ].duration * 1.05) - (event.duration * 60)), 'seconds').humanize()} too much content and might be cut off early by other scheduled broadcasts.`);
                                    }

                                    // Duplicate tracks
                                    if (playlists[ event.playlistID ].duplicates > 0) {
                                        if (status > 3) { status = 3 }
                                        issues.push(`Prerecord playlist "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} has ${playlists[ event.playlistID ].duplicates} duplicate tracks which will be skipped.`);
                                    }

                                    break;
                                case 'playlist':

                                    // No playlist was assigned
                                    if (event.playlistID === null) {
                                        if (status > 2) { status = 2 }
                                        issues.push(`Playlist event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} does not have a playlist assigned to it. This event will not air until fixed!`);
                                        break;
                                    }

                                    // Playlist does not exist in RadioDJ
                                    if (typeof playlists[ event.playlistID ] === 'undefined') {
                                        if (status > 2) { status = 2 }
                                        issues.push(`Playlist event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} has an assigned playlist that does not exist in RadioDJ. This event will not air until an existing playlist is assigned!`);
                                        break;
                                    }

                                    // Playlist is 15 or more minutes too short
                                    if (((event.duration - 15) * 60) >= (playlists[ event.playlistID ].duration * 1.05)) {
                                        if (status > 3) { status = 3 }
                                        issues.push(`Playlist event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} is short on content by about ${moment.duration(((event.duration * 60) - (playlists[ event.playlistID ].duration * 1.05)), 'seconds').humanize()}`);
                                    }

                                    // Playlist is 5 or more minutes too long
                                    if (((event.duration + 5) * 60) <= (playlists[ event.playlistID ].duration * 1.05)) {
                                        if (status > 3) { status = 3 }
                                        issues.push(`Playlist event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} has about ${moment.duration(((playlists[ event.playlistID ].duration * 1.05) - (event.duration * 60)), 'seconds').humanize()} too much content and might be cut off early by other scheduled broadcasts.`);
                                    }

                                    // Duplicate tracks
                                    if (playlists[ event.playlistID ].duplicates > 0) {
                                        if (status > 3) { status = 3 }
                                        issues.push(`Playlist event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} has ${playlists[ event.playlistID ].duplicates} duplicate tracks which will be skipped.`);
                                    }

                                    break;
                                case 'genre':

                                    // No event was assigned
                                    if (event.eventID === null) {
                                        if (status > 2) { status = 2 }
                                        issues.push(`Genre event "${event.name}" for ${moment(event.start).format("llll")} does not have a RadioDJ event assigned to it. A manual event in RadioDJ with a "Load Rotation" action must be assigned for this genre to trigger in RadioDJ.`);
                                        break;
                                    }

                                    // Assigned event does not exist in RadioDJ
                                    if (typeof djevents[ event.eventID ] === 'undefined') {
                                        if (status > 2) { status = 2 }
                                        issues.push(`Genre event "${event.name}" for ${moment(event.start).format("llll")} has an assigned event that does not exist in RadioDJ. This genre will not air until an existing manual event with a LoadRotation action is assigned!`);
                                        break;
                                    }

                                    // Event does not actually load any rotations
                                    if (!djevents[ event.eventID ].data.includes('Load Rotation')) {
                                        if (status > 2) { status = 2 }
                                        issues.push(`Genre event "${event.name}" for ${moment(event.start).format("llll")} has an assigned RadioDJ event that does not contain a "Load Rotation" action. This genre will not actually trigger a rotation change without a Load Rotation action in the assigned RadioDJ event.`);
                                    }

                                    // Event disabled (should be minor severity because sometimes we may want to disable a genre)
                                    if (djevents[ event.eventID ].enabled !== 'True') {
                                        if (status > 3) { status = 3 }
                                        issues.push(`Genre event "${event.name}" for ${moment(event.start).format("llll")} has an assigned RadioDJ event that is disabled. This genre will not air unless the RadioDJ event is enabled.`);
                                    }

                                    break;

                                case 'office-hours':

                                    if (event.director === null) {
                                        if (status > 2) { status = 2 }
                                        issues.push(`Director hours "${event.name}" for ${moment(event.start).format("llll")} does not have a director ID assigned to it. A director must be assigned to office hour events. Please fix or remove.`);
                                        break;
                                    }
                                    var _director = directors.filter((director) => director.ID === event.director);
                                    if (_director.length < 1) {
                                        if (status > 2) { status = 2 }
                                        issues.push(`Director hours "${event.name}" for ${moment(event.start).format("llll")} were assigned a director that does not exist in the system. Please fix this or remove the office hours.`);
                                        break;
                                    }
                            }
                        });

                    if (issues.length === 0) {
                        await sails.helpers.status.change.with({ name: 'calendar', label: 'Calendar', data: `Calendar is operational.`, status: 5 })
                    } else {
                        // Remove duplicates
                        issues = issues.filter((v, i, a) => a.indexOf(v) === i)
                        await sails.helpers.status.change.with({ name: 'calendar', label: 'Calendar', data: `<ul><li>${issues.join(`</li><li>`)}</li></ul>`, status: status });
                    }
                }
            }, undefined, moment().add(7, 'days').toISOString(true));
        } else {

            // Check if it's time to trigger a program, and trigger it if so
            sails.models.calendar.calendardb.whatShouldBePlaying(async (_eventNow) => {
                var triggered = false;
                _eventNow.map((eventNow) => {
                    if (triggered) return null;
                    if (eventNow) {
                        if ((eventNow.type === 'prerecord' || eventNow.type === 'playlist') && eventNow.playlistID !== null) {
                            triggered = true;
                            (async (eventNowb) => {
                                await sails.helpers.playlists.start(eventNowb, inputs.ignoreChangingState);
                            })(eventNow)
                        }
                        if (eventNow.type === 'genre' && eventNow.eventID !== null) {
                            triggered = true;
                            (async (eventNowb) => {
                                try {
                                    await sails.helpers.genre.start(eventNowb, inputs.ignoreChangingState);
                                } catch (unusedE) {

                                }
                            })(eventNow)
                        }
                    }
                })
                if (!triggered) {
                    await sails.helpers.genre.start(null, inputs.ignoreChangingState);
                }
            }, true);

            // Check to see if any events did not air


            sails.models.calendar.calendardb.getEvents(async (eventCheck) => {
                await sails.helpers.meta.change.with({ attendanceChecked: moment().toISOString(true) });
                if (eventCheck && eventCheck.length > 0) {

                    // Radio shows
                    eventCheck
                        .filter((event) => moment().isSameOrAfter(moment(event.end)) && (event.scheduleType === null || (event.scheduleType !== 'canceled' && event.scheduleType !== 'canceled-system' && event.scheduleType !== 'canceled-changed')) && [ 'show', 'sports', 'prerecord', 'remote', 'playlist' ].indexOf(event.type) !== -1)
                        .map((event) => {
                            sails.models.attendance.findOrCreate({ unique: event.unique }, { calendarID: event.calendarID, unique: event.unique, dj: event.hostDJ, cohostDJ1: event.cohostDJ1, cohostDJ2: event.cohostDJ2, cohostDJ3: event.cohostDJ3, event: `${event.type}: ${event.hosts} - ${event.name}`, happened: 0, scheduledStart: moment(event.start).toISOString(true), scheduledEnd: moment(event.end).toISOString(true) })
                                .exec(async (err, record, wasCreated) => {
                                    if (err || !wasCreated) { return false }

                                    if (event.type === 'show') {
                                        await sails.models.logs.create({ attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: `${event.hosts} - ${event.name}`, event: `<strong>Show did not air!</strong><br />Show: ${event.hosts} - ${event.name}}<br />Scheduled time: ${moment(event.start).format('llll')} - ${moment(event.end).format('llll')}`, createdAt: moment().toISOString(true) }).fetch()
                                            .tolerate((err) => {
                                                sails.log.error(err)
                                            })
                                        await sails.helpers.onesignal.sendMass('accountability-shows', 'Show did not air!', `${event.hosts} - ${event.name} failed to air on ${moment(event.start).format('llll')} - ${moment(event.end).format('llll')}; unexcused absence.`)
                                    }

                                    if (event.type === 'prerecord') {
                                        await sails.models.logs.create({ attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: `${event.hosts} - ${event.name}`, event: `<strong>Prerecord did not air!</strong><br />Prerecord: ${event.hosts} - ${event.name}<br />Scheduled time: ${moment(event.start).format('llll')} - ${moment(event.end).format('llll')}`, createdAt: moment().toISOString(true) }).fetch()
                                            .tolerate((err) => {
                                                sails.log.error(err)
                                            })
                                        await sails.helpers.onesignal.sendMass('emergencies', 'Prerecord failed to air!', `${event.hosts} - ${event.name} failed to air on ${moment(event.start).format('llll')} - ${moment(event.end).format('llll')}; this is likely a problem with the system.`)
                                    }

                                    if (event.type === 'remote') {
                                        await sails.models.logs.create({ attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: `${event.hosts} - ${event.name}`, event: `<strong>Remote broadcast did not air!</strong><br />Remote: ${event.hosts} - ${event.name}}<br />Scheduled time: ${moment(event.start).format('llll')} - ${moment(event.end).format('llll')}`, createdAt: moment().toISOString(true) }).fetch()
                                            .tolerate((err) => {
                                                sails.log.error(err)
                                            })
                                        await sails.helpers.onesignal.sendMass('accountability-shows', 'Remote broadcast did not air!', `${event.hosts} - ${event.name} failed to air on ${moment(event.start).format('llll')} - ${moment(event.end).format('llll')}; unexcused absence.`)
                                    }

                                    if (event.type === 'sports') {
                                        await sails.models.logs.create({ attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: event.name, event: `<strong>Sports broadcast did not air!</strong><br />Sport: ${event.name}<br />Scheduled time: ${moment(event.start).format('llll')} - ${moment(event.end).format('llll')}`, createdAt: moment().toISOString(true) }).fetch()
                                            .tolerate((err) => {
                                                sails.log.error(err)
                                            })
                                        await sails.helpers.onesignal.sendMass('accountability-shows', 'Sports broadcast did not air!', `${event.name} failed to air on ${moment(event.start).format('llll')} - ${moment(event.end).format('llll')}; unexcused absence.`)
                                    }

                                    if (event.type === 'playlist') {
                                        await sails.models.logs.create({ attendanceID: record.ID, logtype: 'absent', loglevel: 'warning', logsubtype: event.name, event: `<strong>Playlist did not air!</strong><br />Playlist: ${event.name}<br />Scheduled time: ${moment(event.start).format('llll')} - ${moment(event.end).format('llll')}`, createdAt: moment().toISOString(true) }).fetch()
                                            .tolerate((err) => {
                                                sails.log.error(err)
                                            })
                                        await sails.helpers.onesignal.sendMass('emergencies', 'Playlist failed to air', `${event.name} failed to air on ${moment(event.start).format('llll')} - ${moment(event.end).format('llll')}; this is likely a problem with the system.`)
                                    }
                                });
                        });

                    // Director hours
                    eventCheck
                        .filter((event) => moment().isSameOrAfter(moment(event.end)) && (event.scheduleType === null || (event.scheduleType !== 'canceled' && event.scheduleType !== 'canceled-system' && event.scheduleType !== 'canceled-changed')) && event.type === 'office-hours')
                        .map((event) => {
                            sails.models.timesheet.findOrCreate({ unique: event.unique }, { calendarID: event.calendarID, unique: event.unique, name: event.hosts, approved: 0, scheduledIn: moment(event.start).toISOString(true), scheduledOut: moment(event.end).toISOString(true) })
                                .exec(async (err, record, wasCreated) => {
                                    if (err || !wasCreated) { return false }

                                    await sails.models.logs.create({ attendanceID: null, logtype: 'director-absent', loglevel: 'warning', logsubtype: event.hosts, event: `<strong>Director did not come in for scheduled office hours!</strong><br />Director: ${event.hosts}<br />Scheduled time: ${moment(event.start).format('llll')} - ${moment(event.end).format('llll')}`, createdAt: moment().toISOString(true) }).fetch()
                                        .tolerate((err) => {
                                            sails.log.error(err)
                                        })
                                    await sails.helpers.onesignal.sendMass('accountability-directors', 'Director failed to do their hours!', `${event.hosts} failed to show up for their scheduled hours at ${moment(event.start).format('llll')} - ${moment(event.end).format('llll')}.`)
                                });
                        });
                }
            }, moment(sails.models.meta.memory.attendanceChecked).subtract(1, 'days').toISOString(true), moment().toISOString(true));
        }

        return exits.success();
    }
}