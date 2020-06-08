module.exports = {

    friendlyName: 'meta.newShow',

    description: 'Trigger this helper when a new show / playlist / genre starts after calling meta.change.',

    inputs: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper meta.newShow called.')
        var toUpdate = {};

        var name = sails.models.meta.memory.show;
        var show = sails.models.meta.memory.show;
        var hosts = "Unknown Hosts";
        if (name.includes(' - ')) { // Split hosts and show
            name = sails.models.meta.memory.show.split(' - ')[ 1 ]
            hosts = sails.models.meta.memory.show.split(' - ')[ 0 ];
        }

        // This block of code does several things when starting a new show / broadcast / playlist / prerecord / genre:
        // 1. Determine if the provided show is scheduled to be on the air.
        // 2. If yes to 1, ignore everything else and proceed after the switch code.
        // 3. Check if there's a main calendar event for the provided show. If not, create one.
        // 4. Also create an 'additional-unauthorized' calendar exception for this air.
        var calendar;

        // Get the event that should be on the air right now
        var _eventNow = sails.models.calendar.calendardb.whatShouldBePlaying(null, false);
        var eventNow;

        var exception;
        var attendance;

        // We do not want to do any of this if initially loading from an unknown state
        switch (sails.models.meta.memory.state) {
            case 'live_on':
                // Current program is not supposed to be on the air
                eventNow = _eventNow.filter((event) => event.type === 'show' && sails.models.meta.memory.show === `${event.hosts} - ${event.name}`);
                if (eventNow.length < 1) {
                    calendar = await sails.models.calendar.find({ hosts: hosts, name: name, type: 'show' });
                    // Create a new main calendar event if it does not exist for this show
                    if (!calendar || !calendar[ 0 ]) {
                        calendar = await sails.models.calendar.create({
                            type: 'show',
                            active: true,
                            priority: sails.models.calendar.calendardb.getDefaultPriority({ type: 'show' }),
                            hostDJ: sails.models.meta.memory.dj,
                            cohostDJ1: sails.models.meta.memory.cohostDJ1,
                            cohostDJ2: sails.models.meta.memory.cohostDJ2,
                            cohostDJ3: sails.models.meta.memory.cohostDJ3,
                            hosts: hosts,
                            name: name
                        }).fetch();
                        // If a calendar event does exist, use the first one returned and also re-activate it if it was deactivated.
                    } else {
                        calendar = calendar[ 0 ];
                        if (!calendar.active) await sails.models.calendar.update({ ID: calendar.ID }, { active: true }).fetch();
                    }
                    // Add an exception indicating this was an unscheduled broadcast.
                    exception = await sails.models.schedule.create({
                        calendarID: calendar.ID,
                        scheduleType: 'unscheduled',
                        scheduleReason: `Show ${show} went on the air outside of their scheduled time!`,
                        oneTime: [ moment().toISOString(true) ],
                        duration: 60
                    }).fetch();
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                }
                break;
            case 'remote_on':
                eventNow = _eventNow.filter((event) => event.type === 'remote' && sails.models.meta.memory.show === `${event.hosts} - ${event.name}`);
                if (eventNow.length < 1) {
                    calendar = await sails.models.calendar.find({ hosts: hosts, name: name, type: 'remote' });
                    if (!calendar || !calendar[ 0 ]) {
                        calendar = await sails.models.calendar.create({
                            type: 'remote',
                            active: true,
                            priority: sails.models.calendar.calendardb.getDefaultPriority({ type: 'remote' }),
                            hostDJ: sails.models.meta.memory.dj,
                            cohostDJ1: sails.models.meta.memory.cohostDJ1,
                            cohostDJ2: sails.models.meta.memory.cohostDJ2,
                            cohostDJ3: sails.models.meta.memory.cohostDJ3,
                            hosts: hosts,
                            name: name
                        }).fetch();
                    } else {
                        calendar = calendar[ 0 ];
                        if (!calendar.active) await sails.models.calendar.update({ ID: calendar.ID }, { active: true }).fetch();
                    }
                    exception = await sails.models.schedule.create({
                        calendarID: calendar.ID,
                        scheduleType: 'unscheduled',
                        scheduleReason: `Remote broadcast ${show} went on the air outside of their scheduled time!`,
                        oneTime: [ moment().toISOString(true) ],
                        duration: 60
                    }).fetch();
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                }
                break;
            case 'sports_on':
            case 'sportsremote_on':
                eventNow = _eventNow.filter((event) => event.type === 'sports' && event.name.startsWith(name));
                if (eventNow.length < 1) {
                    calendar = await sails.models.calendar.find({ name: { startsWith: name }, type: 'sports' });
                    if (!calendar || !calendar[ 0 ]) {
                        calendar = await sails.models.calendar.create({
                            type: 'sports',
                            active: true,
                            priority: sails.models.calendar.calendardb.getDefaultPriority({ type: 'sports' }),
                            name: name
                        }).fetch();
                    } else {
                        calendar = calendar[ 0 ];
                        if (!calendar.active) await sails.models.calendar.update({ ID: calendar.ID }, { active: true }).fetch();
                    }
                    exception = await sails.models.schedule.create({
                        calendarID: calendar.ID,
                        scheduleType: 'unscheduled',
                        scheduleReason: `Sports broadcast ${show} went on the air outside of their scheduled time!`,
                        oneTime: [ moment().toISOString(true) ],
                        duration: 60
                    }).fetch();
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                }
                break;
            case 'prerecord_on':
                eventNow = _eventNow.filter((event) => event.type === 'prerecord' && sails.models.meta.memory.show === `${event.hosts} - ${event.name}`);
                if (eventNow.length < 1) {
                    calendar = await sails.models.calendar.find({ hosts: hosts, name: name, type: 'prerecord' });
                    if (!calendar || !calendar[ 0 ]) {
                        calendar = await sails.models.calendar.create({
                            type: 'prerecord',
                            active: true,
                            priority: sails.models.calendar.calendardb.getDefaultPriority({ type: 'prerecord' }),
                            hostDJ: sails.models.meta.memory.dj,
                            cohostDJ1: sails.models.meta.memory.cohostDJ1,
                            cohostDJ2: sails.models.meta.memory.cohostDJ2,
                            cohostDJ3: sails.models.meta.memory.cohostDJ3,
                            hosts: hosts,
                            name: name
                        }).fetch();
                    } else {
                        calendar = calendar[ 0 ];
                        if (!calendar.active) await sails.models.calendar.update({ ID: calendar.ID }, { active: true }).fetch();
                    }
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                    exception = await sails.models.schedule.create({
                        calendarID: calendar.ID,
                        scheduleType: 'unscheduled',
                        scheduleReason: `Prerecord ${show} went on the air outside of their scheduled time!`,
                        oneTime: [ moment().toISOString(true) ],
                        duration: 60
                    }).fetch();
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                }
                break;
            case 'automation_playlist':
                eventNow = _eventNow.filter((event) => event.type === 'playlist' && sails.models.meta.memory.show === `${event.hosts} - ${event.name}`);
                if (eventNow.length < 1) {
                    calendar = await sails.models.calendar.find({ hosts: hosts, name: name, type: 'playlist' });
                    if (!calendar || !calendar[ 0 ]) {
                        calendar = await sails.models.calendar.create({
                            type: 'playlist',
                            active: true,
                            priority: sails.models.calendar.calendardb.getDefaultPriority({ type: 'playlist' }),
                            hostDJ: sails.models.meta.memory.dj,
                            cohostDJ1: sails.models.meta.memory.cohostDJ1,
                            cohostDJ2: sails.models.meta.memory.cohostDJ2,
                            cohostDJ3: sails.models.meta.memory.cohostDJ3,
                            hosts: hosts,
                            name: name
                        }).fetch();
                    } else {
                        calendar = calendar[ 0 ];
                        if (!calendar.active) await sails.models.calendar.update({ ID: calendar.ID }, { active: true }).fetch();
                    }
                    exception = await sails.models.schedule.create({
                        calendarID: calendar.ID,
                        scheduleType: 'unscheduled',
                        scheduleReason: `Playlist ${show} went on the air outside of their scheduled time!`,
                        oneTime: [ moment().toISOString(true) ],
                        duration: 60
                    }).fetch();
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                }
                break;
            case 'automation_genre':
                eventNow = _eventNow.filter((event) => event.type === 'genre' && event.name === sails.models.meta.memory.genre);
                if (eventNow.length < 1) {
                    calendar = await sails.models.calendar.find({ name: sails.models.meta.memory.genre, type: 'genre' });
                    if (!calendar || !calendar[ 0 ]) {
                        calendar = await sails.models.calendar.create({
                            type: 'genre',
                            active: true,
                            priority: sails.models.calendar.calendardb.getDefaultPriority({ type: 'genre' }),
                            hosts: "Unknown Hosts",
                            name: sails.models.meta.memory.genre
                        }).fetch();
                    } else {
                        calendar = calendar[ 0 ];
                        if (!calendar.active) await sails.models.calendar.update({ ID: calendar.ID }, { active: true }).fetch();
                    }
                    exception = await sails.models.schedule.create({
                        calendarID: calendar.ID,
                        scheduleType: 'unscheduled',
                        scheduleReason: `Genre ${sails.models.meta.memory.genre} went on the air outside of scheduled time!`,
                        oneTime: [ moment().toISOString(true) ],
                        duration: 60
                    }).fetch();
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                }
                break;
            case 'automation_on':
            case 'automation_break':
                eventNow = null;
                break;
        }

        if (eventNow instanceof Array && eventNow[ 0 ]) {
            eventNow = eventNow[ 0 ];
        }

        var attendance;

        // Different event now on the air?
        if (eventNow && sails.models.meta.memory.calendarUnique !== eventNow.unique) {

            // Create a new attendance record and update meta with the new attendance ID
            attendance = await sails.helpers.attendance.createRecord(eventNow);
            toUpdate.attendanceID = attendance.newID;

            // Make a log that the broadcast started
            await sails.models.logs.create({ attendanceID: attendance.newID, logtype: 'sign-on', loglevel: 'primary', logsubtype: `${eventNow.hosts} - ${eventNow.name}`, logIcon: sails.models.calendar.calendardb.getIconClass(eventNow), title: `A ${eventNow.type} started.`, event: `Broadcast: ${eventNow.hosts} - ${eventNow.name}<br />Topic: ${sails.models.meta.memory.topic}`, createdAt: moment().toISOString(true) }).fetch()
                .tolerate((err) => {
                    sails.log.error(err)
                })

            // If the eventNow object is not null
            if (eventNow && eventNow !== null) {

                // We don't care about genres nor playlists for airing
                if ([ 'live_on', 'sports_on', 'remote_on', 'sportsremote_on', 'prerecord_on' ].indexOf(sails.models.meta.memory.state) !== -1) {

                    // Make a log if the broadcast was unauthorized
                    if (exception) {
                        await sails.models.logs.create({ attendanceID: attendance.newID, logtype: 'unauthorized', loglevel: 'warning', logsubtype: `${eventNow.hosts} - ${eventNow.name}`, logIcon: `fas fa-times-circle`, title: `An unscheduled / unauthorized broadcast started!`, event: `${eventNow.type}: ${eventNow.hosts} - ${eventNow.name}`, createdAt: moment().toISOString(true) }).fetch()
                            .tolerate((err) => {
                                sails.log.error(err)
                            })
                        await sails.helpers.onesignal.sendMass('accountability-shows', 'Un-scheduled Broadcast Started', `${eventNow.hosts} - ${eventNow.name} went on the air at ${moment().format('llll')}; this show was not scheduled to go on the air!`)
                        await sails.helpers.emails.queueDjsDirectors(`Unscheduled ${eventNow.type} started: ${eventNow.hosts} - ${eventNow.name}`, `Dear Directors,<br /><br />
                        
                        An unauthorized / unscheduled ${eventNow.type}, <strong>${eventNow.hosts} - ${eventNow.name}</strong>, went on the air at ${moment().format("LLLL")}. Please investigate and deal with accordingly, if applicable.`);
                    }

                    // Let subscribers know this show is now on the air
                    await sails.helpers.onesignal.sendEvent(eventNow, true);
                }
            }
        }

        // Default genres
        if (eventNow === null && sails.models.meta.memory.calendarUnique !== null) {
            // Create a new attendance record and update meta with the new attendance ID
            attendance = await sails.helpers.attendance.createRecord();
            toUpdate.attendanceID = attendance.newID;

            // Make a log that the broadcast started
            await sails.models.logs.create({ attendanceID: attendance.newID, logtype: 'sign-on', loglevel: 'primary', logsubtype: ``, logIcon: `fas fa-music`, title: `Default rotation started.`, event: ``, createdAt: moment().toISOString(true) }).fetch()
                .tolerate((err) => {
                    sails.log.error(err)
                })
        }

        if (eventNow && eventNow !== null) {
            toUpdate.calendarID = eventNow.calendarID;
            toUpdate.calendarUnique = eventNow.unique;
            toUpdate.showLogo = eventNow.logo;
        } else {
            toUpdate.calendarID = null;
            toUpdate.calendarUnique = null;
            toUpdate.showLogo = null;
        }

        await sails.helpers.meta.change.with(toUpdate);

        return exits.success(toUpdate);

    }

}