var fs = require('fs')
var readline = require('readline')
var { OAuth2Client } = require('google-auth-library')
var breakdance = require('breakdance')
var { google } = require('googleapis')

module.exports = {

    friendlyName: 'calendar.sync',

    description: 'Re-load / sync the WWSU events and Office Hours calendars from Google Calendar',

    inputs: {
        ignoreChangingState: {
            type: 'boolean',
            defaultsTo: false,
            description: 'When triggering new radio programming, if set to true, ignore checks for whether or not we are already changing states. Defaults to false.'
        },

        checkIntegrity: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, not only will we check to see what should be airing, but we will also check the integrity of events that trigger something (playlists, genres, prerecords) for the next 14 days.'
        }
    },

    fn: async function (inputs, exits) {
        if (inputs.checkIntegrity) {
            var status = 5;
            var issues = [];
            var events = sails.models.calendar7.calendardb.getEvents(undefined, moment().add(14, 'days').toISOString(true));

            if (events && events.length > 0) {
                var playlists = {}
                var djevents = {}

                // Check playlists
                var playlistsR = await sails.models.playlists.find();

                // Check each playlist for duration and duplicates
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

                // Load all manual RadioDJ events into memory
                var djeventsR = await sails.models.events.find({ type: 3 })
                djeventsR.map(event => { djevents[ event.ID ] = event })

                // Load the current attendance record into memory
                var attendanceRecord = await sails.models.attendance.findOne({ ID: sails.models.meta.memory.attendanceID })

                // Now, check each event
                events
                    .filter((event) => event.exceptionType === null || ([ 'canceled', 'canceled-system' ].indexOf(event.exceptionType) === -1))
                    .map((event) => {
                        switch (event.type) {
                            case 'prerecord':

                                // No playlist was assigned
                                if (event.playlistID === null) {
                                    if (status > 2) { status = 2 }
                                    issues.push(`Prerecord event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} does not have a playlist assigned to it. This event will not air until fixed!`);
                                }

                                // Playlist does not exist in RadioDJ
                                if (typeof playlists[ event.playlistID ] === 'undefined') {
                                    if (status > 2) { status = 2 }
                                    issues.push(`Prerecord event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} has an assigned playlist that does not exist in RadioDJ. This event will not air until an existing playlist is assigned!`);
                                }

                                // Playlist is 15 or more minutes too short
                                if (((event.duration - 15) * 60) >= (playlists[ event.name ].duration * 1.05)) {
                                    if (status > 3) { status = 3 }
                                    issues.push(`Prerecord playlist "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} is short on content by about ${moment.duration(((event.duration * 60) - (playlists[ event.name ].duration * 1.05)), 'seconds').humanize()}`);
                                }

                                // Playlist is 5 or more minutes too long
                                if (((event.duration + 5) * 60) <= (playlists[ event.name ].duration * 1.05)) {
                                    if (status > 3) { status = 3 }
                                    issues.push(`Prerecord playlist "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} has about ${moment.duration(((playlists[ event.name ].duration * 1.05) - (event.duration * 60)), 'seconds').humanize()} too much content and might be cut off early by other scheduled broadcasts.`);
                                }

                                // Duplicate tracks
                                if (playlists[ event.name ].duplicates > 0) {
                                    if (status > 3) { status = 3 }
                                    issues.push(`Prerecord playlist "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} has ${playlists[ event.name ].duplicates} duplicate tracks which will be skipped.`);
                                }

                                break;
                            case 'playlist':

                                // No playlist was assigned
                                if (event.playlistID === null) {
                                    if (status > 2) { status = 2 }
                                    issues.push(`Playlist event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} does not have a playlist assigned to it. This event will not air until fixed!`);
                                }

                                // Playlist does not exist in RadioDJ
                                if (typeof playlists[ event.playlistID ] === 'undefined') {
                                    if (status > 2) { status = 2 }
                                    issues.push(`Playlist event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} has an assigned playlist that does not exist in RadioDJ. This event will not air until an existing playlist is assigned!`);
                                }

                                // Playlist is 15 or more minutes too short
                                if (((event.duration - 15) * 60) >= (playlists[ event.name ].duration * 1.05)) {
                                    if (status > 3) { status = 3 }
                                    issues.push(`Playlist event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} is short on content by about ${moment.duration(((event.duration * 60) - (playlists[ event.name ].duration * 1.05)), 'seconds').humanize()}`);
                                }

                                // Playlist is 5 or more minutes too long
                                if (((event.duration + 5) * 60) <= (playlists[ event.name ].duration * 1.05)) {
                                    if (status > 3) { status = 3 }
                                    issues.push(`Playlist event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} has about ${moment.duration(((playlists[ event.name ].duration * 1.05) - (event.duration * 60)), 'seconds').humanize()} too much content and might be cut off early by other scheduled broadcasts.`);
                                }

                                // Duplicate tracks
                                if (playlists[ event.name ].duplicates > 0) {
                                    if (status > 3) { status = 3 }
                                    issues.push(`Playlist event "${event.hosts} - ${event.name}" for ${moment(event.start).format("llll")} has ${playlists[ event.name ].duplicates} duplicate tracks which will be skipped.`);
                                }

                                break;
                            case 'genre':

                                // No event was assigned
                                if (event.eventID === null) {
                                    if (status > 2) { status = 2 }
                                    issues.push(`Genre event "${event.name}" for ${moment(event.start).format("llll")} does not have a RadioDJ event assigned to it. A manual event in RadioDJ with a "Load Rotation" action must be assigned for this genre to trigger in RadioDJ.`);
                                }

                                // Assigned event does not exist in RadioDJ
                                if (typeof djevents[ event.eventID ] === 'undefined') {
                                    if (status > 2) { status = 2 }
                                    issues.push(`Genre event "${event.name}" for ${moment(event.start).format("llll")} has an assigned event that does not exist in RadioDJ. This genre will not air until an existing manual event with a LoadRotation action is assigned!`);
                                }

                                // Event does not actually load any rotations
                                if (!djevents[ event.eventID ].data.includes('Load Rotation') || djevents[ event.eventID ].enabled !== 'True') {
                                    if (status > 2) { status = 2 }
                                    issues.push(`Genre event "${event.name}" for ${moment(event.start).format("llll")} has an assigned RadioDJ event that does not contain a "Load Rotation" action. This genre will not actually trigger a rotation change without a Load Rotation action in the assigned RadioDJ event.`);
                                }

                                // Event disabled (should be minor severity because sometimes we may want to disable a genre)
                                if (djevents[ event.eventID ].enabled !== 'True') {
                                    if (status > 3) { status = 3 }
                                    issues.push(`Genre event "${event.name}" for ${moment(event.start).format("llll")} has an assigned RadioDJ event that is disabled. This genre will not air unless the RadioDJ event is enabled.`);
                                }

                                break;
                        }
                    });

                if (issues.length === 0) {
                    await sails.helpers.status.change.with({ name: 'calendar', label: 'Calendar', data: `Calendar is operational.`, status: 5 })
                } else {
                    // Remove duplicates
                    issues = issues.filter((v, i, a) => a.indexOf(v) === i)
                    await sails.helpers.status.change.with({ name: 'calendar', label: 'Calendar', data: issues.join(` `), status: status });
                }
            }
        }

        

        return exits.success();
    }
}