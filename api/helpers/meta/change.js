module.exports = {

  friendlyName: 'meta.change',

  description: 'Change metadata information',

  inputs: {
    state: {
      type: 'string',
      description: 'State of the WWSU system'
    },
    dj: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the DJ currently on the air, or null if not applicable.'
    },
    cohostDJ1: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the first cohost DJ on the air, or null if not applicable.'
    },
    cohostDJ2: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the second cohost DJ on the air, or null if not applicable.'
    },
    cohostDJ3: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the third cohost DJ on the air, or null if not applicable.'
    },
    attendanceID: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the Attendance record the system is currently running under'
    },
    attendanceChecked: {
      type: 'string',
      allowNull: true,
      description: 'ISO timestamp of when calendar attendance was last checked',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    show: {
      type: 'string',
      description: 'If someone is on the air, host name - show name, or name of sports for sports broadcasts'
    },
    track: {
      type: 'string',
      description: 'Currently playing track either in automation or manually logged'
    },
    trackID: {
      type: 'number',
      description: 'The ID of the track currently playing'
    },
    trackIDSubcat: {
      type: 'number',
      description: 'The ID of the subcategory the currently playing track falls in'
    },
    trackArtist: {
      type: 'string',
      allowNull: true,
      description: 'The artist of the currently playing track'
    },
    trackTitle: {
      type: 'string',
      allowNull: true,
      description: 'The title of the currently playing track'
    },
    trackAlbum: {
      type: 'string',
      allowNull: true,
      description: 'The album of the currently playing track'
    },
    trackLabel: {
      type: 'string',
      allowNull: true,
      description: 'The label of the currently playing track'
    },
    trackStamp: {
      type: 'string',
      allowNull: true,
      description: 'ISO timestamp of when manual track meta was added',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    requested: {
      type: 'boolean',
      description: 'Whether or not this track was requested'
    },
    requestedBy: {
      type: 'string',
      description: 'The user who requested this track, if requested'
    },
    requestedMessage: {
      type: 'string',
      description: 'The provided message for this track request, if requested'
    },
    calendarUnique: {
      type: 'string',
      allowNull: true,
      description: 'Calendar unique ID of the current program.'
    },
    genre: {
      type: 'string',
      description: 'Name of the genre or rotation currently being played, if any'
    },
    calendarID: {
      type: 'number',
      allowNull: true,
      description: 'The ID of the calendar event currently being played.'
    },
    playlistID: {
      type: 'number',
      allowNull: true,
      description: 'ID of the playlist currently running'
    },
    playlist: {
      type: 'string',
      allowNull: true,
      description: 'Name of the playlist we are currently airing'
    },
    playlistPosition: {
      type: 'number',
      description: 'Current position within the playlist'
    },
    playlistPlayed: {
      type: 'string',
      allowNull: true,
      description: 'ISO timestamp of when the playlist was started',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    topic: {
      type: 'string',
      description: 'If the DJ specified a show topic, this is the topic.'
    },
    stream: {
      type: 'string',
      description: 'sails.models.meta for the internet radio stream'
    },
    radiodj: {
      type: 'string',
      description: 'REST IP of the RadioDJ instance currently in control'
    },
    line1: {
      type: 'string',
      description: 'First line of meta for display signs'
    },
    line2: {
      type: 'string',
      description: 'Second line of meta for display signs'
    },
    time: {
      type: 'string',
      description: 'ISO string of the current WWSU time. NOTE: time is only pushed periodically in websockets. Clients should keep their own time ticker in sync with this value.',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    listeners: {
      type: 'number',
      description: 'Number of current online listeners'
    },
    queueFinish: {
      type: 'string',
      allowNull: true,
      description: 'An ISO timestamp of when the queue is expected to finish. NOTE: To conserve data, this is only pushed through websockets when the expected finish time changes by more than 1 second. Also, this will be null when not playing anything.',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    queueCalculating: {
      type: 'boolean',
      description: 'If true, do not consider queueFinish as accurate until this changes to false.'
    },
    trackFinish: {
      type: 'string',
      allowNull: true,
      description: 'An ISO timestamp of when the current track is expected to finish. NOTE: To conserve data, this is only pushed through websockets when the expected finish time changes by more than 1 second. Also, this will be null when not playing anything.',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    countdown: {
      type: 'string',
      allowNull: true,
      description: 'An ISO timestamp which to count down on the display signs for shows.',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    queueMusic: {
      type: 'boolean',
      description: 'If returning from break, or going live, and there are music tracks in the queue not counted towards queueFinish, this will be true'
    },
    playing: {
      type: 'boolean',
      description: 'Whether or not something is currently playing in the active RadioDJ'
    },
    changingState: {
      type: 'string',
      allowNull: true,
      description: 'If not null, all clients should lock out of any state-changing (state/*) API hits until this is null again. Will be state changing string otherwise.'
    },
    lastID: {
      type: 'string',
      allowNull: true,
      description: 'An ISO timestamp of when the last top of hour ID break was taken.',
      custom: function (value) {
        return moment(value).isValid()
      }
    },
    delaySystem: {
      type: 'number',
      allowNull: true,
      description: 'Number of seconds currently on the delay system. Null means delay system might be offline or delay system is in bypass mode.'
    },
    webchat: {
      type: 'boolean',
      description: 'Set to false to restrict the ability to send chat messages through the website'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper meta.change called.')
    try {
      var push = {}
      var db = {}
      var push2 = {}
      var manual
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {

          // Exit at this point if the key provided does not exist in sails.models.meta.A, or if the value in inputs did not change from the current value (except for state, which we always want to run even if it did not change)
          if (typeof sails.models.meta.memory[ key ] === 'undefined' || (sails.models.meta.memory[ key ] === inputs[ key ] && key !== 'state')) {
            continue
          }

          // If a show is specified and defers from the one in memory, retrieve the IDs of all the DJs in the provided show name if applicable, and update meta with them.
          // This also creates new DJs if they do not exist, and updates the "last seen" time stamp.
          if (key === 'show') {

            // Immediately update memory with new show to prevent cron job double-whammies.
            sails.models.meta.memory.show = inputs[ key ];
            push.show = inputs[ key ];

            var show = sails.models.meta.memory.show;
            var temp = [ "Unknown Hosts" ];
            if (show !== null && show.includes(' - ')) {

              // Split DJ and show
              var temp = show.split(' - ')[ 0 ]
              show = show.split(' - ')[ 1 ]
              temp = temp.split("; ");

              // Determine who the DJs are and create them if they do not exist
              if (temp[ 0 ] && temp[ 0 ] !== 'Unknown Hosts')
                var dj = await sails.models.djs.findOrCreate({ name: temp[ 0 ] }, { name: temp[ 0 ], lastSeen: moment().toISOString(true) })
              if (temp[ 1 ])
                var dj2 = await sails.models.djs.findOrCreate({ name: temp[ 1 ] }, { name: temp[ 1 ], lastSeen: moment().toISOString(true) })
              if (temp[ 2 ])
                var dj3 = await sails.models.djs.findOrCreate({ name: temp[ 2 ] }, { name: temp[ 2 ], lastSeen: moment().toISOString(true) })
              if (temp[ 3 ])
                var dj4 = await sails.models.djs.findOrCreate({ name: temp[ 3 ] }, { name: temp[ 3 ], lastSeen: moment().toISOString(true) })

              // Update lastSeen record for the DJs
              if (dj && dj !== null) { await sails.models.djs.update({ ID: dj.ID }, { lastSeen: moment().toISOString(true) }).fetch() }
              if (dj2 && dj2 !== null) { await sails.models.djs.update({ ID: dj2.ID }, { lastSeen: moment().toISOString(true) }).fetch() }
              if (dj3 && dj3 !== null) { await sails.models.djs.update({ ID: dj3.ID }, { lastSeen: moment().toISOString(true) }).fetch() }
              if (dj4 && dj4 !== null) { await sails.models.djs.update({ ID: dj4.ID }, { lastSeen: moment().toISOString(true) }).fetch() }

              // Update memory
              sails.models.meta.memory.dj = dj ? dj.ID || null : null;
              sails.models.meta.memory.cohostDJ1 = dj2 ? dj2.ID || null : null;
              sails.models.meta.memory.cohostDJ2 = dj3 ? dj3.ID || null : null;
              sails.models.meta.memory.cohostDJ3 = dj4 ? dj4.ID || null : null;

            } else {
              sails.models.meta.memory.dj = null
              sails.models.meta.memory.cohostDJ1 = null;
              sails.models.meta.memory.cohostDJ2 = null;
              sails.models.meta.memory.cohostDJ3 = null;
            }
            push.dj = sails.models.meta.memory.dj
            push.cohostDJ1 = sails.models.meta.memory.cohostDJ1
            push.cohostDJ2 = sails.models.meta.memory.cohostDJ2
            push.cohostDJ3 = sails.models.meta.memory.cohostDJ3
          }


          // Do stuff if a state was provided
          if (key === 'state') {

            // Determine if the state changed from unknown.
            var wasUnknown = sails.models.meta.memory.state === 'unknown';

            // Immediately update memory with new state to prevent cron job double-whammies.
            sails.models.meta.memory.state = inputs[ key ];
            push.state = inputs[ key ];

            // Enable webchat automatically when going into automation state
            if (inputs[ key ] === 'automation_on' || inputs[ key ] === 'automation_genre' || inputs[ key ] === 'automation_playlist' || inputs[ key ] === 'automation_prerecord') { push2.webchat = true }

            // Determine hosts and show name from either a provided show or the current show
            var show = (typeof inputs.show !== 'undefined' ? inputs.show : sails.models.meta.memory.show);
            var _show = show.split(" - ");
            var hosts = "Unknown Hosts";
            var name = "Unknown Show";
            if (_show.length > 1) {
              hosts = _show[ 0 ];
              name = _show[ 1 ];
            } else {
              name = _show[ 0 ];
            }

            // This block of code does several things when starting a new show / broadcast / playlist / prerecord / genre:
            // 1. Determine if the current show is scheduled to be on the air.
            // 2. If yes to 1, ignore everything else and proceed after the switch code.
            // 3. Check if there's a main calendar event for the provided show. If not, create one.
            // 4. Also create an 'additional-unauthorized' calendar exception for this air.
            var calendar;

            // Get the event that should be on the air right now
            var _eventNow = sails.models.calendar.calendardb.whatShouldBePlaying(false);
            var eventNow;

            var exception;
            var attendance;

            // We do not want to do any of this if initially loading from an unknown state
            if (!wasUnknown) {
              switch (inputs[ key ]) {
                case 'live_on':
                  // Current program is not supposed to be on the air
                  eventNow = _eventNow.filter((event) => event.type === 'show' && show === `${event.hosts} - ${event.name}`);
                  if (eventNow.length < 1) {
                    calendar = await sails.models.calendar.find({ hosts: hosts, name: name, type: 'show' });
                    // Create a new main calendar event if it does not exist for this show
                    if (!calendar || !calendar[ 0 ]) {
                      calendar = await sails.models.calendar.create({
                        type: 'show',
                        active: true,
                        priority: sails.models.calendar.calendardb.getDefaultPriority({ type: 'show' }),
                        hostDJ: dj ? dj.ID || null : null,
                        cohostDJ1: dj2 ? dj2.ID || null : null,
                        cohostDJ2: dj3 ? dj3.ID || null : null,
                        cohostDJ3: dj4 ? dj4.ID || null : null,
                        hosts: hosts,
                        name: name,
                        duration: 0,
                        schedule: null,
                        start: moment().toISOString(true)
                      }).fetch();
                      // If a calendar event does exist, use the first one returned and also re-activate it if it was deactivated.
                    } else {
                      calendar = calendar[ 0 ];
                      if (!calendar.active) await sails.models.calendar.update({ ID: calendar.ID }, { active: true }).fetch();
                    }
                    // Add an exception indicating this was an unscheduled broadcast.
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                    exception = await sails.models.calendarexceptions.create({
                      calendarID: calendar.ID,
                      exceptionType: 'additional-unscheduled',
                      exceptionReason: `Show ${show} went on the air outside of their scheduled time! ${JSON.stringify(eventNow)} ${JSON.stringify(_eventNow)}`,
                      newTime: moment().toISOString(true),
                      duration: 60
                    }).fetch();
                  }
                  break;
                case 'remote_on':
                  eventNow = _eventNow.filter((event) => event.type === 'remote' && show === `${event.hosts} - ${event.name}`);
                  if (eventNow.length < 1) {
                    calendar = await sails.models.calendar.find({ hosts: hosts, name: name, type: 'remote' });
                    if (!calendar || !calendar[ 0 ]) {
                      calendar = await sails.models.calendar.create({
                        type: 'remote',
                        active: true,
                        priority: sails.models.calendar.calendardb.getDefaultPriority({ type: 'remote' }),
                        hostDJ: dj ? dj.ID || null : null,
                        cohostDJ1: dj2 ? dj2.ID || null : null,
                        cohostDJ2: dj3 ? dj3.ID || null : null,
                        cohostDJ3: dj4 ? dj4.ID || null : null,
                        hosts: hosts,
                        name: name,
                        duration: 0,
                        schedule: null,
                        start: moment().toISOString(true)
                      }).fetch();
                    } else {
                      calendar = calendar[ 0 ];
                      if (!calendar.active) await sails.models.calendar.update({ ID: calendar.ID }, { active: true }).fetch();
                    }
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                    exception = await sails.models.calendarexceptions.create({
                      calendarID: calendar.ID,
                      exceptionType: 'additional-unscheduled',
                      exceptionReason: `Remote broadcast ${show} went on the air outside of their scheduled time! ${JSON.stringify(eventNow)}  ${JSON.stringify(_eventNow)}`,
                      newTime: moment().toISOString(true),
                      duration: 60
                    }).fetch();
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
                        name: name,
                        duration: 0,
                        schedule: null,
                        start: moment().toISOString(true)
                      }).fetch();
                    } else {
                      calendar = calendar[ 0 ];
                      if (!calendar.active) await sails.models.calendar.update({ ID: calendar.ID }, { active: true }).fetch();
                    }
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                    exception = await sails.models.calendarexceptions.create({
                      calendarID: calendar.ID,
                      exceptionType: 'additional-unscheduled',
                      exceptionReason: `Sports broadcast ${show} went on the air outside of their scheduled time! ${JSON.stringify(eventNow)}  ${JSON.stringify(_eventNow)}`,
                      newTime: moment().toISOString(true),
                      duration: 60
                    }).fetch();
                  }
                  break;
                case 'prerecord_on':
                  eventNow = _eventNow.filter((event) => event.type === 'prerecord' && show === `${event.hosts} - ${event.name}`);
                  if (eventNow.length < 1) {
                    calendar = await sails.models.calendar.find({ hosts: hosts, name: name, type: 'prerecord' });
                    if (!calendar || !calendar[ 0 ]) {
                      calendar = await sails.models.calendar.create({
                        type: 'prerecord',
                        active: true,
                        priority: sails.models.calendar.calendardb.getDefaultPriority({ type: 'prerecord' }),
                        hostDJ: dj ? dj.ID || null : null,
                        cohostDJ1: dj2 ? dj2.ID || null : null,
                        cohostDJ2: dj3 ? dj3.ID || null : null,
                        cohostDJ3: dj4 ? dj4.ID || null : null,
                        hosts: hosts,
                        name: name,
                        duration: 0,
                        schedule: null,
                        start: moment().toISOString(true)
                      }).fetch();
                    } else {
                      calendar = calendar[ 0 ];
                      if (!calendar.active) await sails.models.calendar.update({ ID: calendar.ID }, { active: true }).fetch();
                    }
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                    exception = await sails.models.calendarexceptions.create({
                      calendarID: calendar.ID,
                      exceptionType: 'additional-unscheduled',
                      exceptionReason: `Prerecord ${show} went on the air outside of their scheduled time! ${JSON.stringify(eventNow)}  ${JSON.stringify(_eventNow)}`,
                      newTime: moment().toISOString(true),
                      duration: 60
                    }).fetch();
                  }
                  break;
                case 'automation_playlist':
                  eventNow = _eventNow.filter((event) => event.type === 'playlist' && show === `${event.hosts} - ${event.name}`);
                  if (eventNow.length < 1) {
                    calendar = await sails.models.calendar.find({ hosts: hosts, name: name, type: 'playlist' });
                    if (!calendar || !calendar[ 0 ]) {
                      calendar = await sails.models.calendar.create({
                        type: 'playlist',
                        active: true,
                        priority: sails.models.calendar.calendardb.getDefaultPriority({ type: 'playlist' }),
                        hostDJ: dj ? dj.ID || null : null,
                        cohostDJ1: dj2 ? dj2.ID || null : null,
                        cohostDJ2: dj3 ? dj3.ID || null : null,
                        cohostDJ3: dj4 ? dj4.ID || null : null,
                        hosts: hosts,
                        name: name,
                        duration: 0,
                        schedule: null,
                        start: moment().toISOString(true)
                      }).fetch();
                    } else {
                      calendar = calendar[ 0 ];
                      if (!calendar.active) await sails.models.calendar.update({ ID: calendar.ID }, { active: true }).fetch();
                    }
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                    exception = await sails.models.calendarexceptions.create({
                      calendarID: calendar.ID,
                      exceptionType: 'additional-unscheduled',
                      exceptionReason: `Playlist ${show} went on the air outside of their scheduled time! ${JSON.stringify(eventNow)}  ${JSON.stringify(_eventNow)}`,
                      newTime: moment().toISOString(true),
                      duration: 60
                    }).fetch();
                  }
                  break;
                case 'automation_genre':
                  eventNow = _eventNow.filter((event) => event.type === 'genre' && event.name === (typeof inputs.genre !== 'undefined' ? inputs.genre : sails.models.meta.memory.genre));
                  if (eventNow.length < 1) {
                    calendar = await sails.models.calendar.find({ name: (typeof inputs.genre !== 'undefined' ? inputs.genre : sails.models.meta.memory.genre), type: 'genre' });
                    if (!calendar || !calendar[ 0 ]) {
                      calendar = await sails.models.calendar.create({
                        type: 'genre',
                        active: true,
                        priority: sails.models.calendar.calendardb.getDefaultPriority({ type: 'genre' }),
                        hosts: "Unknown Hosts",
                        name: (typeof inputs.genre !== 'undefined' ? inputs.genre : sails.models.meta.memory.genre),
                        duration: 0,
                        schedule: null,
                        start: moment().toISOString(true)
                      }).fetch();
                    } else {
                      calendar = calendar[ 0 ];
                      if (!calendar.active) await sails.models.calendar.update({ ID: calendar.ID }, { active: true }).fetch();
                    }
                    eventNow = sails.models.calendar.calendardb.processRecord(calendar, exception, moment().toISOString(true));
                    exception = await sails.models.calendarexceptions.create({
                      calendarID: calendar.ID,
                      exceptionType: 'additional-unscheduled',
                      exceptionReason: `Genre ${(typeof inputs.genre !== 'undefined' ? inputs.genre : sails.models.meta.memory.genre)} went on the air outside of scheduled time! ${JSON.stringify(eventNow)}  ${JSON.stringify(_eventNow)}`,
                      newTime: moment().toISOString(true),
                      duration: 60
                    }).fetch();
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
              if (eventNow && sails.models.meta.memory.calendarUnique !== (eventNow === null ? null : eventNow.unique)) {

                // Create a new attendance record and update meta with the new attendance ID
                attendance = await sails.helpers.attendance.createRecord(eventNow);
                sails.models.meta.memory.attendanceID = attendance.newID;
                push.attendanceID = attendance.newID;

                // Make a log that the broadcast started
                await sails.models.logs.create({ attendanceID: attendance.newID, logtype: 'sign-on', loglevel: 'primary', logsubtype: `${eventNow.hosts} - ${eventNow.name}`, event: `<strong>A ${eventNow.type} started.</strong><br />Broadcast: ${eventNow.hosts} - ${eventNow.name}<br />Topic: ${inputs.topic}`, createdAt: moment().toISOString(true) }).fetch()
                  .tolerate((err) => {
                    sails.log.error(err)
                  })

                // If the eventNow object is not null
                if (eventNow && eventNow !== null) {

                  // We don't care about genres nor playlists for airing
                  if ([ 'live_on', 'sports_on', 'remote_on', 'sportsremote_on', 'prerecord_on' ].indexOf(inputs[ key ]) !== -1) {

                    // Make a log if the broadcast was unauthorized
                    if (exception) {
                      await sails.models.logs.create({ attendanceID: attendance.newID, logtype: 'unauthorized', loglevel: 'warning', logsubtype: `${eventNow.hosts} - ${eventNow.name}`, event: `<strong>An unauthorized / unscheduled broadcast started!</strong><br />Broadcast: ${eventNow.hosts} - ${eventNow.name}`, createdAt: moment().toISOString(true) }).fetch()
                        .tolerate((err) => {
                          sails.log.error(err)
                        })
                      await sails.helpers.onesignal.sendMass('accountability-shows', 'Un-scheduled Broadcast Started', `${eventNow.hosts} - ${eventNow.name} went on the air at ${moment().format('llll')}; this show was not scheduled to go on the air!`)
                    }

                    // Let subscribers know this show is now on the air
                    await sails.helpers.onesignal.sendEvent(eventNow, true);
                  }
                }
              }

              if (eventNow && eventNow !== null) {
                sails.models.meta.memory.calendarID = eventNow.calendarID;
                sails.models.meta.memory.calendarUnique = eventNow.unique;
                push.calendarID = eventNow.calendarID;
                push.calendarUnique = eventNow.unique;
              } else {
                sails.models.meta.memory.calendarID = null;
                sails.models.meta.memory.calendarUnique = null;
                push.calendarID = null;
                push.calendarUnique = null;
              }
            }
          }

          if (key === 'listeners' && inputs.listeners > sails.models.meta.memory.listenerPeak) {
            sails.models.meta.memory.listenerPeak = inputs.listeners
            push.listenerPeak = inputs.listeners
          }

          // Do stuff if changing queueFinish and trackFinish
          if (key === 'queueFinish' || key === 'trackFinish' || key === 'countdown') {
            // Set to null if nothing is playing
            if ((typeof inputs.playing !== 'undefined' && !inputs.playing) || !sails.models.meta.memory.playing) { inputs[ key ] = null }

            // Do not update if null has not changed
            if (inputs[ key ] === null && sails.models.meta.memory[ key ] === null) { continue }

            // Do not update if time difference is less than 1 second of what we have in memory.
            if (inputs[ key ] !== null && (moment(sails.models.meta.memory[ key ]).diff(inputs[ key ]) < 1000 && moment(sails.models.meta.memory[ key ]).diff(inputs[ key ]) > -1000)) { continue }

            // If we are updating, also include current time in update so clients are properly synced.
            inputs.time = moment().toISOString(true)
            sails.models.meta.memory.time = inputs.time
            push.time = inputs.time
          }

          // Update meta in memory
          sails.models.meta.memory[ key ] = inputs[ key ]
          push[ key ] = inputs[ key ]
        }
      }

      // Changes in certain meta should warrant a re-processing of nowplaying metadata information
      if (typeof push.show !== 'undefined' || typeof push.state !== 'undefined' || typeof push.playlist !== 'undefined' || typeof push.genre !== 'undefined' || typeof push.trackArtist !== 'undefined' || typeof push.trackTitle !== 'undefined' || typeof push.trackID !== 'undefined') {
        // New track playing in automation?
        if (sails.models.meta.memory.trackID !== 0) {
          // Always reset trackstamp when something plays in automation
          push2.trackStamp = null

          // If the currently playing track was a request, mark as played, update meta, and send a push notification
          if (typeof push.trackID !== 'undefined') {
            if (_.includes(sails.models.requests.pending, sails.models.meta.memory.trackID)) {
              var requested = await sails.models.requests.update({ songID: sails.models.meta.memory.trackID, played: 0 }, { played: 1 }).fetch()
                .tolerate(() => {
                })
              delete sails.models.requests.pending[ sails.models.requests.pending.indexOf(sails.models.meta.memory.trackID) ]
              if (requested && typeof requested[ 0 ] !== 'undefined') {
                push2.requested = true
                push2.requestedBy = (requested[ 0 ].username === '') ? 'Anonymous' : requested[ 0 ].username
                push2.requestedMessage = requested[ 0 ].message
              }

              // If we are finished playing requests, clear request meta
            } else if (sails.models.meta.memory.requested) {
              push2.requested = false
              push2.requestedBy = ''
              push2.requestedMessage = ''
            }
          }

          // Manage metadata based on our current state when something is playing in automation

          // Regular automation
          if (sails.models.meta.memory.state.startsWith('automation_') && sails.models.meta.memory.state !== 'automation_playlist' && sails.models.meta.memory.state !== 'automation_genre') {
            // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
            if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta.memory.trackIDSubcat || 0) > -1) || sails.models.meta.memory.trackArtist.includes('Unknown Artist') || sails.models.meta.memory.trackArtist === null || sails.models.meta.memory.trackArtist === '') {
              push2.line1 = sails.config.custom.meta.alt.automation
              push2.line2 = ''
              push2.stream = `WWSU 106.9FM - ${sails.config.custom.meta.alt.automation}`
              push2.percent = 0
            } else {
              push2.line1 = await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.automation}${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'}`)
              push2.line2 = push2.requested ? await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'}`) : ''
              push2.stream = await sails.helpers.filterProfane(`${sails.models.meta.memory.trackArtist} - ${sails.models.meta.memory.trackTitle} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
            }

            // Playlist automation
          } else if (sails.models.meta.memory.state === 'automation_playlist') {
            // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
            if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta.memory.trackIDSubcat || 0) > -1) || sails.models.meta.memory.trackArtist.includes('Unknown Artist') || sails.models.meta.memory.trackArtist === null || sails.models.meta.memory.trackArtist === '') {
              push2.line1 = sails.config.custom.meta.alt.playlist
              push2.line2 = `${sails.config.custom.meta.prefix.playlist}${sails.models.meta.memory.playlist}`
              push2.stream = `WWSU 106.9FM - ${sails.config.custom.meta.alt.playlist}`
              push2.percent = 0
            } else {
              push2.line1 = await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.automation}${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'}`)
              push2.line2 = push2.requested ? await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'}`) : `${sails.config.custom.meta.prefix.playlist}${sails.models.meta.memory.show}`
              push2.stream = await sails.helpers.filterProfane(`${sails.models.meta.memory.trackArtist} - ${sails.models.meta.memory.trackTitle} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
            }

            // Genre automation
          } else if (sails.models.meta.memory.state === 'automation_genre') {
            // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
            if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta.memory.trackIDSubcat || 0) > -1) || sails.models.meta.memory.trackArtist.includes('Unknown Artist') || sails.models.meta.memory.trackArtist === null || sails.models.meta.memory.trackArtist === '') {
              push2.line1 = sails.config.custom.meta.alt.genre
              push2.line2 = `${sails.config.custom.meta.prefix.genre}${sails.models.meta.memory.genre}`
              push2.stream = `WWSU 106.9FM - ${sails.config.custom.meta.alt.genre}`
              push2.percent = 0
            } else {
              push2.line1 = await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.automation}${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'}`)
              push2.line2 = push2.requested ? await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'}`) : `${sails.config.custom.meta.prefix.genre}${sails.models.meta.memory.genre}`
              push2.stream = await sails.helpers.filterProfane(`${sails.models.meta.memory.trackArtist} - ${sails.models.meta.memory.trackTitle} ${push2.requested ? `(${sails.config.custom.meta.prefix.genre}${push2.requestedBy || 'Anonymous'})` : ``}`)
            }

            // Live shows
          } else if (sails.models.meta.memory.state.startsWith('live_')) {
            // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
            if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta.memory.trackIDSubcat || 0) > -1) || sails.models.meta.memory.trackArtist.includes('Unknown Artist') || sails.models.meta.memory.trackArtist === null || sails.models.meta.memory.trackArtist === '') {
              push2.line1 = `${sails.config.custom.meta.prefix.live}${sails.models.meta.memory.show}`
              push2.line2 = sails.config.custom.meta.alt.live
              push2.stream = `${sails.models.meta.memory.show} (${sails.config.custom.meta.alt.live})`
              push2.percent = 0
            } else {
              push2.line1 = `${sails.config.custom.meta.prefix.live}${sails.models.meta.memory.show}`
              push2.line2 = await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.playing}${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
              push2.stream = await sails.helpers.filterProfane(`${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
            }

            // Prerecorded shows
          } else if (sails.models.meta.memory.state.startsWith('prerecord_')) {
            // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
            if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta.memory.trackIDSubcat || 0) > -1) || sails.models.meta.memory.trackArtist.includes('Unknown Artist') || sails.models.meta.memory.trackArtist === null || sails.models.meta.memory.trackArtist === '') {
              push2.line1 = `${sails.config.custom.meta.prefix.prerecord}${sails.models.meta.memory.playlist}`
              push2.line2 = sails.config.custom.meta.alt.prerecord
              push2.stream = `${sails.models.meta.memory.playlist} (${sails.config.custom.meta.alt.prerecord})`
              push2.percent = 0
            } else {
              push2.line1 = `${sails.config.custom.meta.prefix.prerecord}${sails.models.meta.memory.playlist}`
              push2.line2 = await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.playing}${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
              push2.stream = await sails.helpers.filterProfane(`${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
            }

            // Remote broadcasts
          } else if (sails.models.meta.memory.state.startsWith('remote_')) {
            // We do not want to display metadata for tracks that are within config.custom.categories.noMeta, or have Unknown Artist as the artist
            if ((sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta.memory.trackIDSubcat || 0) > -1) || sails.models.meta.memory.trackArtist.includes('Unknown Artist') || sails.models.meta.memory.trackArtist === null || sails.models.meta.memory.trackArtist === '') {
              push2.line1 = `${sails.config.custom.meta.prefix.remote}${sails.models.meta.memory.show}`
              push2.line2 = sails.config.custom.meta.alt.remote
              push2.stream = `${sails.models.meta.memory.show} (${sails.config.custom.meta.alt.remote})`
              push2.percent = 0
            } else {
              push2.line1 = `${sails.config.custom.meta.prefix.remote}${sails.models.meta.memory.show}`
              push2.line2 = await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.playing}${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
              push2.stream = await sails.helpers.filterProfane(`${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'} ${push2.requested ? `(${sails.config.custom.meta.prefix.request}${push2.requestedBy || 'Anonymous'})` : ``}`)
            }

            // Sports broadcasts
          } else if (sails.models.meta.memory.state.startsWith('sports_') || sails.models.meta.memory.state.startsWith('sportsremote_')) {
            // We do not ever want to display what we are playing when broadcasting sports; always use alt meta
            push2.line1 = `${sails.config.custom.meta.prefix.sports}${sails.models.meta.memory.show}`
            push2.line2 = sails.config.custom.meta.alt.sports
            push2.stream = `WWSU 106.9FM - ${sails.models.meta.memory.show} (${sails.config.custom.meta.alt.sports})`
            push2.percent = 0
          }

          // Overwrite line 2 of the metadata if a broadcast is about to begin
          if (sails.models.meta.memory.state === 'automation_live') {
            push2.line2 = `${sails.config.custom.meta.prefix.pendLive}${sails.models.meta.memory.show}`
            // Prerecord about to begin
          } else if (sails.models.meta.memory.state === 'automation_prerecord') {
            push2.line2 = `${sails.config.custom.meta.prefix.pendPrerecord}${sails.models.meta.memory.show}`
          } else if (sails.models.meta.memory.state === 'automation_remote') {
            push2.line2 = `${sails.config.custom.meta.prefix.pendRemote}${sails.models.meta.memory.show}`
          } else if (sails.models.meta.memory.state === 'automation_sports' || sails.models.meta.memory.state === 'automation_sportsremote') {
            push2.line2 = `${sails.config.custom.meta.prefix.pendSports}${sails.models.meta.memory.show}`
          }

          // Log the new track playing if the track was new
          if (typeof push.trackID !== 'undefined') {
            await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'track', loglevel: 'secondary', logsubtype: 'automation', event: `<strong>Track played in automation.</strong>${push2.requested ? `<br />Requested by: ${push2.requestedBy || `Unknown User`}` : ``}`, trackArtist: sails.models.meta.memory.trackArtist || null, trackTitle: sails.models.meta.memory.trackTitle || null, trackAlbum: sails.models.meta.memory.trackAlbum || null, trackLabel: sails.models.meta.memory.trackLabel || null }).fetch()
              .tolerate(() => {
              })

            // Push to the history array if not a track that falls under noMeta
            if (sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(sails.models.meta.memory.trackIDSubcat) === -1) {
              push2.history = sails.models.meta.memory.history
              push2.history.unshift({ ID: sails.models.meta.memory.trackID, track: (sails.models.meta.memory.trackArtist || 'Unknown Artist') + ' - ' + (sails.models.meta.memory.trackTitle || 'Unknown Title'), likable: true })
              push2.history = push2.history.slice(0, 3)
            }
          }

          // Perform metadata for when nothing is playing in automation
        } else {
          // Erase track information if we stopped playing stuff in automation
          if (typeof push.trackID !== 'undefined' && push.trackID === 0) {
            push2.trackStamp = null
            push2.trackArtist = null
            push2.trackTitle = null
            push2.trackAlbum = null
            push2.trackLabel = null
            manual = false
          } else {
            // New track? push it to the history array
            if (typeof push.trackStamp !== 'undefined') {
              push2.history = sails.models.meta.memory.history
              push2.history.unshift({ ID: null, track: (sails.models.meta.memory.trackArtist || 'Unknown Artist') + ' - ' + (sails.models.meta.memory.trackTitle || 'Unknown Title'), likable: false })
              push2.history = push2.history.slice(0, 3)
            }
            // Determine if a manually logged track is playing
            manual = sails.models.meta.memory.trackArtist !== null && sails.models.meta.memory.trackArtist !== '' && sails.models.meta.memory.trackTitle !== null && sails.models.meta.memory.trackTitle !== ''
          }

          // Live shows
          if (sails.models.meta.memory.state.startsWith('live_')) {
            push2.line1 = `${sails.config.custom.meta.prefix.live}${sails.models.meta.memory.show}`
            push2.line2 = manual ? await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.playing}${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'}`) : ``
            push2.stream = manual ? await sails.helpers.filterProfane(`${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'}`) : await sails.helpers.filterProfane(`${sails.models.meta.memory.show} (LIVE)`)

            // Prerecorded shows (should never happen; this is an error!)
          } else if (sails.models.meta.memory.state.startsWith('prerecord_')) {
            push2.line1 = `${sails.config.custom.meta.prefix.prerecord}${sails.models.meta.memory.playlist}`
            push2.line2 = ``
            push2.stream = await sails.helpers.filterProfane(`${sails.models.meta.memory.show} (PRERECORD)`)

            // Remote Broadcasts
          } else if (sails.models.meta.memory.state.startsWith('remote_')) {
            push2.line1 = `${sails.config.custom.meta.prefix.remote}${sails.models.meta.memory.show}`
            push2.line2 = manual ? await sails.helpers.filterProfane(`${sails.config.custom.meta.prefix.playing}${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'}`) : ``
            push2.stream = manual ? await sails.helpers.filterProfane(`${sails.models.meta.memory.trackArtist || 'Unknown Artist'} - ${sails.models.meta.memory.trackTitle || 'Unknown Title'}`) : await sails.helpers.filterProfane(`${sails.models.meta.memory.show} (LIVE)`)

            // Sports; we don't want to ever display what we are playing
          } else if (sails.models.meta.memory.state.startsWith('sports_') || sails.models.meta.memory.state.startsWith('sportsremote_')) {
            push2.line1 = `${sails.config.custom.meta.prefix.sports}${sails.models.meta.memory.show}`
            push2.line2 = ``
            push2.stream = `WWSU 106.9FM - ${sails.models.meta.memory.show} (LIVE)`
          }
        }

        // Now, push notifications if this is a track request
        if (push2.requested && typeof requested[ 0 ] !== `undefined`) {
          var subscriptions = await sails.models.subscribers.destroy({ type: `request`, subtype: requested[ 0 ].ID }).fetch()
          var devices = []
          subscriptions.map((subscription) => devices.push(subscription.device))
          if (devices.length > 0) { await sails.helpers.onesignal.send(devices, `request`, `Your Request is Playing!`, await sails.helpers.filterProfane(`${sails.models.meta.memory.trackArtist} - ${sails.models.meta.memory.trackTitle}`) + ` is now playing on WWSU!`, (60 * 15)) }
        }
      }

      // Cycle through all push2's and update metadata
      for (var key2 in push2) {
        if (Object.prototype.hasOwnProperty.call(push2, key2) && push2[ key2 ] !== sails.models.meta.memory[ key2 ]) {
          push[ key2 ] = push2[ key2 ]
          sails.models.meta.memory[ key2 ] = push2[ key2 ]
        }
      }

      // Finalize all meta changes and update ones in the database as necessary

      for (var key3 in push) {
        if (Object.prototype.hasOwnProperty.call(push, key3)) {
          try {
            if (key3 in sails.models.meta.attributes) { db[ key3 ] = push[ key3 ] }
          } catch (e) {
            return exits.error(e)
          }

          // If we're changing stream meta, push to history array, and send an API call to the stream to update the meta on the stream.
          if (key3 === 'stream') {
            sails.models.meta.history.unshift(push[ key3 ])
            sails.models.meta.history = sails.models.meta.history.slice(0, 5)
            // TODO: Put stream metadata updating API query here
          }
        }
      }

      // Clone our changes due to a Sails discrepancy
      var criteria = _.cloneDeep(db)

      // Update meta in the database
      await sails.models.meta.update({ ID: 1 }, criteria)
        .tolerate((err) => {
          sails.log.error(err)
        })

      // Do not push empty (no) changes through websockets
      if (_.isEmpty(push)) { return exits.success() }

      sails.log.silly(`meta socket: ${push}`)
      sails.sockets.broadcast('meta', 'meta', push)
      return exits.success()
      // Do not error when there's an issue, but log it.
    } catch (e) {
      sails.log.error(e)
      return exits.success()
    }
  }

}
