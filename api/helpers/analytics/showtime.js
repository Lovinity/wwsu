module.exports = {

  friendlyName: 'analytics.showtime',

  description: 'Get analytics about the amount of show time and listenership every DJ had since the beginning of startOfSemester.',

  inputs: {
    dj: {
      type: 'number',
      required: false,
      description: `Provide the ID of a DJ if you want showtime records for a specific DJ. If not provided, will return all applicable DJs.`
    },
    calendarID: {
      type: 'number',
      required: false,
      description: `Provide the ID of a calendar if you only want showtime records for a specific show/calendar. If not provided, will return all applicable shows.`
    }
  },

  fn: async function (inputs, exits) {
    // Initialize for every DJ in the system + one for all DJs
    var DJs = {};
    var shows = {};

    DJs[ 0 ] = {
      name: 'EVERYONE',
      week: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        ratio: 1,
        messages: 0,
        remoteCredits: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        breaks: 0,
        earlyStart: 0,
        lateStart: 0,
        earlyEnd: 0,
        lateEnd: 0,
        absences: 0,
        cancellations: 0,
        missedIDs: 0,
        silences: 0,
        reputationScore: 0,
        reputationScoreMax: 0,
        reputationPercent: 0
      },
      semester: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        ratio: 1,
        messages: 0,
        remoteCredits: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        breaks: 0,
        earlyStart: 0,
        lateStart: 0,
        earlyEnd: 0,
        lateEnd: 0,
        absences: 0,
        cancellations: 0,
        missedIDs: 0,
        silences: 0,
        reputationScore: 0,
        reputationScoreMax: 0,
        reputationPercent: 0
      },
      overall: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        ratio: 1,
        messages: 0,
        remoteCredits: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        breaks: 0,
        earlyStart: 0,
        lateStart: 0,
        earlyEnd: 0,
        lateEnd: 0,
        absences: 0,
        cancellations: 0,
        missedIDs: 0,
        silences: 0,
        reputationScore: 0,
        reputationScoreMax: 0,
        reputationPercent: 0
      }
    }

    // Get all of the DJs in the system, or the provided dj if one was provided
    var records = await sails.models.djs.find(inputs.dj ? { ID: inputs.dj } : {})

    // Initialize statistics templates for every returned DJ
    records.map(record => {
      DJs[ record.ID ] = {
        name: record.name,
        week: {
          showtime: 0,
          tuneins: 0,
          listeners: 0,
          ratio: 1,
          messages: 0,
          remoteCredits: 0,
          shows: 0,
          prerecords: 0,
          remotes: 0,
          sports: 0,
          breaks: 0,
          earlyStart: 0,
          lateStart: 0,
          earlyEnd: 0,
          lateEnd: 0,
          absences: 0,
          cancellations: 0,
          missedIDs: 0,
          silences: 0,
          earlyStartArray: [],
          lateStartArray: [],
          earlyEndArray: [],
          lateEndArray: [],
          absencesArray: [],
          cancellationsArray: [],
          missedIDsArray: [],
          silencesArray: [],
          reputationScore: 0,
          reputationScoreMax: 0,
          reputationPercent: 0
        },
        semester: {
          showtime: 0,
          tuneins: 0,
          listeners: 0,
          ratio: 1,
          messages: 0,
          remoteCredits: 0,
          shows: 0,
          prerecords: 0,
          remotes: 0,
          sports: 0,
          breaks: 0,
          earlyStart: 0,
          lateStart: 0,
          earlyEnd: 0,
          lateEnd: 0,
          absences: 0,
          cancellations: 0,
          missedIDs: 0,
          silences: 0,
          earlyStartArray: [],
          lateStartArray: [],
          earlyEndArray: [],
          lateEndArray: [],
          absencesArray: [],
          cancellationsArray: [],
          missedIDsArray: [],
          silencesArray: [],
          reputationScore: 0,
          reputationScoreMax: 0,
          reputationPercent: 0
        },
        overall: {
          showtime: 0,
          tuneins: 0,
          listeners: 0,
          ratio: 1,
          messages: 0,
          remoteCredits: 0,
          shows: 0,
          prerecords: 0,
          remotes: 0,
          sports: 0,
          breaks: 0,
          earlyStart: 0,
          lateStart: 0,
          earlyEnd: 0,
          lateEnd: 0,
          absences: 0,
          cancellations: 0,
          missedIDs: 0,
          silences: 0,
          earlyStartArray: [],
          lateStartArray: [],
          earlyEndArray: [],
          lateEndArray: [],
          absencesArray: [],
          cancellationsArray: [],
          missedIDsArray: [],
          silencesArray: [],
          reputationScore: 0,
          reputationScoreMax: 0,
          reputationPercent: 0
        }
      }
    })

    // Get all of the shows in the system, or the provided show
    var records = await sails.models.calendar.find(inputs.calendarID ? { ID: inputs.calendarID } : {})

    // Initialize statistics templates for every returned DJ
    records.map(record => {
      shows[ record.ID ] = {
        name: `${record.hosts} - ${record.name}`,
        week: {
          showtime: 0,
          tuneins: 0,
          listeners: 0,
          ratio: 1,
          messages: 0,
          remoteCredits: 0,
          shows: 0,
          prerecords: 0,
          remotes: 0,
          sports: 0,
          breaks: 0,
          earlyStart: 0,
          lateStart: 0,
          earlyEnd: 0,
          lateEnd: 0,
          absences: 0,
          cancellations: 0,
          missedIDs: 0,
          silences: 0,
          earlyStartArray: [],
          lateStartArray: [],
          earlyEndArray: [],
          lateEndArray: [],
          absencesArray: [],
          cancellationsArray: [],
          missedIDsArray: [],
          silencesArray: [],
          reputationScore: 0,
          reputationScoreMax: 0,
          reputationPercent: 0
        },
        semester: {
          showtime: 0,
          tuneins: 0,
          listeners: 0,
          ratio: 1,
          messages: 0,
          remoteCredits: 0,
          shows: 0,
          prerecords: 0,
          remotes: 0,
          sports: 0,
          breaks: 0,
          earlyStart: 0,
          lateStart: 0,
          earlyEnd: 0,
          lateEnd: 0,
          absences: 0,
          cancellations: 0,
          missedIDs: 0,
          silences: 0,
          earlyStartArray: [],
          lateStartArray: [],
          earlyEndArray: [],
          lateEndArray: [],
          absencesArray: [],
          cancellationsArray: [],
          missedIDsArray: [],
          silencesArray: [],
          reputationScore: 0,
          reputationScoreMax: 0,
          reputationPercent: 0
        },
        overall: {
          showtime: 0,
          tuneins: 0,
          listeners: 0,
          ratio: 1,
          messages: 0,
          remoteCredits: 0,
          shows: 0,
          prerecords: 0,
          remotes: 0,
          sports: 0,
          breaks: 0,
          earlyStart: 0,
          lateStart: 0,
          earlyEnd: 0,
          lateEnd: 0,
          absences: 0,
          cancellations: 0,
          missedIDs: 0,
          silences: 0,
          earlyStartArray: [],
          lateStartArray: [],
          earlyEndArray: [],
          lateEndArray: [],
          absencesArray: [],
          cancellationsArray: [],
          missedIDsArray: [],
          silencesArray: [],
          reputationScore: 0,
          reputationScoreMax: 0,
          reputationPercent: 0
        }
      }
    })

    // Form query for filtering attendance records
    var query = {};
    if (inputs.dj) {
      query.or = [
        { dj: inputs.dj },
        { cohostDJ1: inputs.dj },
        { cohostDJ2: inputs.dj },
        { cohostDJ3: inputs.dj },
      ];
    }
    if (inputs.calendarID) {
      query.calendarID = inputs.calendarID;
    }

    // Get the attendance records
    var records2 = await sails.models.attendance.find(query);
    records2 = records2.filter((record) => record.dj !== null || record.cohostDJ1 !== null || record.cohostDJ2 !== null || record.cohostDJ3 !== null || record.event.toLowerCase().startsWith("sports: "));

    // Calculate earned remote credits for all DJs
    var process1 = async () => {
      var records = await sails.models.xp.find({ dj: inputs.dj ? inputs.dj : { '!=': null } })
      records.map((record) => {
        if (typeof DJs[ record.dj ] === 'undefined') { return }
        if (record.type === `remote`) {
          DJs[ record.dj ].overall.remoteCredits += record.amount
          DJs[ 0 ].overall.remoteCredits += record.amount

          if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
            DJs[ record.dj ].semester.remoteCredits += record.amount
            DJs[ 0 ].semester.remoteCredits += record.amount
          }

          if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
            DJs[ record.dj ].week.remoteCredits += record.amount
            DJs[ 0 ].week.remoteCredits += record.amount
          }
        }
      })
    }

    // Showtime, tuneins, listenerMinutes, and webMessages calculations
    var process2 = async () => {
      records2
        .filter(record => record.showTime !== null && record.listenerMinutes !== null)
        .map(record => {
          [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
            if (!record[ dj ]) return;
            DJs[ record[ dj ] ].overall.showtime += record.showTime
            DJs[ record[ dj ] ].overall.tuneins += record.tuneIns
            DJs[ record[ dj ] ].overall.listeners += record.listenerMinutes
            DJs[ record[ dj ] ].overall.messages += record.webMessages
            if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
              DJs[ record[ dj ] ].semester.showtime += record.showTime
              DJs[ record[ dj ] ].semester.tuneins += record.tuneIns
              DJs[ record[ dj ] ].semester.listeners += record.listenerMinutes
              DJs[ record[ dj ] ].semester.messages += record.webMessages
            }
            if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
              DJs[ record[ dj ] ].week.showtime += record.showTime
              DJs[ record[ dj ] ].week.tuneins += record.tuneIns
              DJs[ record[ dj ] ].week.listeners += record.listenerMinutes
              DJs[ record[ dj ] ].week.messages += record.webMessages
            }
          });
          DJs[ 0 ].overall.showtime += record.showTime
          DJs[ 0 ].overall.tuneins += record.tuneIns
          DJs[ 0 ].overall.listeners += record.listenerMinutes
          DJs[ 0 ].overall.messages += record.webMessages
          if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
            DJs[ 0 ].semester.showtime += record.showTime
            DJs[ 0 ].semester.tuneins += record.tuneIns
            DJs[ 0 ].semester.listeners += record.listenerMinutes
            DJs[ 0 ].semester.messages += record.webMessages
          }
          if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
            DJs[ 0 ].week.showtime += record.showTime
            DJs[ 0 ].week.tuneins += record.tuneIns
            DJs[ 0 ].week.listeners += record.listenerMinutes
            DJs[ 0 ].week.messages += record.webMessages
          }

          if (record.calendarID) {
            shows[ record.calendarID ].overall.showtime += record.showTime
            shows[ record.calendarID ].overall.tuneins += record.tuneIns
            shows[ record.calendarID ].overall.listeners += record.listenerMinutes
            shows[ record.calendarID ].overall.messages += record.webMessages
            if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
              shows[ record.calendarID ].semester.showtime += record.showTime
              shows[ record.calendarID ].semester.tuneins += record.tuneIns
              shows[ record.calendarID ].semester.listeners += record.listenerMinutes
              shows[ record.calendarID ].semester.messages += record.webMessages
            }
            if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
              shows[ record.calendarID ].week.showtime += record.showTime
              shows[ record.calendarID ].week.tuneins += record.tuneIns
              shows[ record.calendarID ].week.listeners += record.listenerMinutes
              shows[ record.calendarID ].week.messages += record.webMessages
            }
          }
        });
    }

    // Calculate maximum reputation score for every DJ
    // Add 5 score for every live/remote show.
    // Add 2 score for every prerecorded show.
    // Add 5 score for every sports broadcast (only in shows analytics).
    // Add 1 score for every break taken (max 1 for every clockwheel break configured).
    // Also adds 1 score for every sign-off / re-sign-on for the same show to offset a bit of the penalties involved.
    var process3 = async () => {
      var unique = {}

      records2
        .filter((record) => ((inputs.dj && (record.dj === inputs.dj || record.cohostDJ1 === inputs.dj || record.cohostDJ2 === inputs.dj || record.cohostDJ3 === inputs.dj)) || (!inputs.dj && (record.dj || record.cohostDJ1 || record.cohostDJ2 || record.cohostDJ3))))
        .map((record) => {
          // Calculate how many duplicate records for the same show exists and add reputation score to offset a penalty
          if (record.unique !== null && record.unique !== ``) {
            if (record.unique in unique && record.showTime && record.scheduledStart !== null && record.scheduledEnd !== null) {
              [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                if (!record[ dj ]) return;
                DJs[ record[ dj ] ].overall.reputationScoreMax += 1
                if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                  DJs[ record[ dj ] ].semester.reputationScoreMax += 1
                }
                if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                  DJs[ record[ dj ] ].week.reputationScoreMax += 1
                }
              });
              DJs[ 0 ].overall.reputationScoreMax += 1
              if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                DJs[ 0 ].semester.reputationScoreMax += 1
              }
              if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                DJs[ 0 ].week.reputationScoreMax += 1
              }

              if (record.calendarID) {
                shows[ record.calendarID ].overall.reputationScoreMax += 1
                if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                  shows[ record.calendarID ].semester.reputationScoreMax += 1
                }
                if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                  shows[ record.calendarID ].week.reputationScoreMax += 1
                }
              }

            }
            unique[ record.unique ] = record;
          }
        });

      // Now go through each unique record to calculate show stats and add reputation
      for (var uniqueRecord in unique) {
        if (Object.prototype.hasOwnProperty.call(unique, uniqueRecord)) {
          var record = unique[ uniqueRecord ]
          if (record.actualStart !== null && record.actualEnd !== null && record.happened === 1) {
            var maxBreaks = Object.keys(sails.config.custom.breaks).length > 0 ? record.showTime / (60 / Object.keys(sails.config.custom.breaks).length) : 0;
            var breakPoints = Math.min(maxBreaks, record.breaks);
            if (record.event.toLowerCase().startsWith('show: ')) {
              [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                if (!record[ dj ]) return;
                DJs[ record[ dj ] ].overall.shows += 1
                DJs[ record[ dj ] ].overall.breaks += record.breaks;
              });
              DJs[ 0 ].overall.shows += 1
              if (record.calendarID) shows[ record.calendarID ].overall.shows += 1;
              if (record.scheduledStart !== null && record.scheduledEnd !== null) {
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].overall.reputationScoreMax += (5 + breakPoints)
                });
                DJs[ 0 ].overall.reputationScoreMax += (5 + breakPoints)
                if (record.calendarID) shows[ record.calendarID ].overall.reputationScoreMax += (5 + breakPoints);
              }
              if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].semester.shows += 1
                  DJs[ record[ dj ] ].semester.breaks += record.breaks;
                });
                DJs[ 0 ].semester.shows += 1
                if (record.calendarID) shows[ record.calendarID ].semester.shows += 1;
                if (record.scheduledStart !== null && record.scheduledEnd !== null) {
                  [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                    if (!record[ dj ]) return;
                    DJs[ record[ dj ] ].semester.reputationScoreMax += (5 + breakPoints)
                  });
                  DJs[ 0 ].semester.reputationScoreMax += (5 + breakPoints)
                  if (record.calendarID) shows[ record.calendarID ].semester.reputationScoreMax += (5 + breakPoints);
                }
              }
              if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].week.shows += 1
                  DJs[ record[ dj ] ].week.breaks += record.breaks;
                });
                DJs[ 0 ].week.shows += 1
                if (record.calendarID) shows[ record.calendarID ].week.shows += 1;
                if (record.scheduledStart !== null && record.scheduledEnd !== null) {
                  [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                    if (!record[ dj ]) return;
                    DJs[ record[ dj ] ].week.reputationScoreMax += (5 + breakPoints)
                  });
                  DJs[ 0 ].week.reputationScoreMax += (5 + breakPoints)
                  if (record.calendarID) shows[ record.calendarID ].week.reputationScoreMax += (5 + breakPoints);
                }
              }
            } else if (record.event.toLowerCase().startsWith('prerecord: ')) {
              var maxBreaks = record.showTime / 20;
              var breakPoints = Math.min(maxBreaks, record.breaks);
              [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                if (!record[ dj ]) return;
                DJs[ record[ dj ] ].overall.prerecords += 1
                DJs[ record[ dj ] ].overall.breaks += record.breaks;
                DJs[ record[ dj ] ].overall.reputationScoreMax += (2 + breakPoints)
              });
              DJs[ 0 ].overall.prerecords += 1
              DJs[ 0 ].overall.reputationScoreMax += (2 + breakPoints)
              if (record.calendarID) {
                shows[ record.calendarID ].overall.prerecords += 1
                shows[ record.calendarID ].overall.reputationScoreMax += (2 + breakPoints)
              }
              if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].semester.prerecords += 1
                  DJs[ record[ dj ] ].semester.breaks += record.breaks;
                  DJs[ record[ dj ] ].semester.reputationScoreMax += (2 + breakPoints)
                });
                DJs[ 0 ].semester.prerecords += 1
                DJs[ 0 ].semester.reputationScoreMax += (2 + breakPoints)
                if (record.calendarID) {
                  shows[ record.calendarID ].semester.prerecords += 1
                  shows[ record.calendarID ].semester.reputationScoreMax += (2 + breakPoints)
                }
              }
              if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].week.prerecords += 1
                  DJs[ record[ dj ] ].week.breaks += record.breaks;
                  DJs[ record[ dj ] ].week.reputationScoreMax += (2 + breakPoints)
                });
                DJs[ 0 ].week.prerecords += 1
                DJs[ 0 ].week.reputationScoreMax += (2 + breakPoints)
                if (record.calendarID) {
                  shows[ record.calendarID ].week.prerecords += 1
                  shows[ record.calendarID ].week.reputationScoreMax += (2 + breakPoints)
                }
              }
            } else if (record.event.toLowerCase().startsWith('remote: ')) {
              var maxBreaks = record.showTime / 20;
              var breakPoints = Math.min(maxBreaks, record.breaks);
              [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                if (!record[ dj ]) return;
                DJs[ record[ dj ] ].overall.remotes += 1
                DJs[ record[ dj ] ].overall.breaks += record.breaks;
              });
              DJs[ 0 ].overall.remotes += 1
              if (record.calendarID) shows[ record.calendarID ].overall.remotes += 1;
              if (record.scheduledStart !== null && record.scheduledEnd !== null) {
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].overall.reputationScoreMax += (5 + breakPoints)
                });
                DJs[ 0 ].overall.reputationScoreMax += (5 + breakPoints)
                if (record.calendarID) shows[ record.calendarID ].overall.reputationScoreMax += (5 + breakPoints);
              }
              if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].semester.remotes += 1
                  DJs[ record[ dj ] ].semester.breaks += record.breaks;
                });
                DJs[ 0 ].semester.remotes += 1
                if (record.calendarID) shows[ record.calendarID ].semester.remotes += 1;
                if (record.scheduledStart !== null && record.scheduledEnd !== null) {
                  [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                    if (!record[ dj ]) return;
                    DJs[ record[ dj ] ].semester.reputationScoreMax += (5 + breakPoints)
                  });
                  DJs[ 0 ].semester.reputationScoreMax += (5 + breakPoints)
                  if (record.calendarID) shows[ record.calendarID ].semester.reputationScoreMax += (5 + breakPoints);
                }
              }
              if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].week.remotes += 1
                  DJs[ record[ dj ] ].week.breaks += record.breaks;
                });
                DJs[ 0 ].week.remotes += 1
                if (record.calendarID) shows[ record.calendarID ].week.remotes += 1;
                if (record.scheduledStart !== null && record.scheduledEnd !== null) {
                  [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                    if (!record[ dj ]) return;
                    DJs[ record[ dj ] ].week.reputationScoreMax += (5 + breakPoints)
                  });
                  DJs[ 0 ].week.reputationScoreMax += (5 + breakPoints)
                  if (record.calendarID) shows[ record.calendarID ].week.reputationScoreMax += (5 + breakPoints);
                }
              }
            } else if (record.event.toLowerCase().startsWith('sports: ')) {
              var maxBreaks = record.showTime / 20;
              var breakPoints = Math.min(maxBreaks, record.breaks);
              [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                if (!record[ dj ]) return;
                DJs[ record[ dj ] ].overall.sports += 1
                DJs[ record[ dj ] ].overall.breaks += record.breaks;
              });
              DJs[ 0 ].overall.sports += 1
              if (record.calendarID) {
                shows[ record.calendarID ].overall.sports += 1
                shows[ record.calendarID ].overall.reputationScoreMax += (5 + breakPoints)
              }
              if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].semester.sports += 1
                  DJs[ record[ dj ] ].semester.breaks += record.breaks;
                });
                DJs[ 0 ].semester.sports += 1
                if (record.calendarID) {
                  shows[ record.calendarID ].semester.sports += 1
                  shows[ record.calendarID ].semester.reputationScoreMax += (5 + breakPoints)
                }
              }
              if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].week.sports += 1
                  DJs[ record[ dj ] ].week.breaks += record.breaks;
                });
                DJs[ 0 ].week.sports += 1
                if (record.calendarID) {
                  shows[ record.calendarID ].week.sports += 1
                  shows[ record.calendarID ].week.reputationScoreMax += (5 + breakPoints)
                }
              }
            }
          }
        }
      }
    }

    // Calculate reputation score penalties and analytics (ignores excused)
    // Subtract 1 score for every cancellation.
    // Subtract 1 score every time DJ triggered silence detection.
    // Subtract 3 score for every absence (scheduled broadcast that did not air).
    // Subtract 2 score for every unauthorized / unscheduled broadcast.
    // Subtract 3 score for every failed top-of-hour ID break.
    // Subtract 2 score every time DJ signed on too early.
    // Subtract 2 score every time DJ signed off too late.
    // Subtract 1 score every time DJ signed on too late.
    // Subtract 1 score every time DJ signed off too early.
    var process4 = async () => {

      var maps = records2
        .filter((record) => ((inputs.dj && (record.dj === inputs.dj || record.cohostDJ1 === inputs.dj || record.cohostDJ2 === inputs.dj || record.cohostDJ3 === inputs.dj)) || (!inputs.dj && (record.dj || record.cohostDJ1 || record.cohostDJ2 || record.cohostDJ3))))
        .map(async (record) => {
          var logs = await sails.models.logs.find({ attendanceID: record.ID, excused: false });
          logs.map((log) => {
            switch (log.logtype) {
              case 'cancellation':
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].overall.reputationScore -= 1;
                  DJs[ record[ dj ] ].overall.cancellations += 1;
                  DJs[ record[ dj ] ].overall.cancellationsArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].semester.reputationScore -= 1;
                    DJs[ record[ dj ] ].semester.cancellations += 1;
                    DJs[ record[ dj ] ].semester.cancellationsArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].week.reputationScore -= 1;
                    DJs[ record[ dj ] ].week.cancellations += 1;
                    DJs[ record[ dj ] ].week.cancellationsArray.push([ log.logsubtype, log.createdAt ]);
                  }
                });
                DJs[ 0 ].overall.reputationScore -= 1;
                DJs[ 0 ].overall.cancellations += 1;
                if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].semester.reputationScore -= 1;
                  DJs[ 0 ].semester.cancellations += 1;
                }
                if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].week.reputationScore -= 1;
                  DJs[ 0 ].week.cancellations += 1;
                }
                if (record.calendarID) {
                  shows[ record.calendarID ].overall.reputationScore -= 1;
                  shows[ record.calendarID ].overall.cancellations += 1;
                  shows[ record.calendarID ].overall.cancellationsArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].semester.reputationScore -= 1;
                    shows[ record.calendarID ].semester.cancellations += 1;
                    shows[ record.calendarID ].semester.cancellationsArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].week.reputationScore -= 1;
                    shows[ record.calendarID ].week.cancellations += 1;
                    shows[ record.calendarID ].week.cancellationsArray.push([ log.logsubtype, log.createdAt ]);
                  }
                }
                break;
              case 'silence':
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].overall.reputationScore -= 1;
                  DJs[ record[ dj ] ].overall.silences += 1;
                  DJs[ record[ dj ] ].overall.silencesArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].semester.reputationScore -= 1;
                    DJs[ record[ dj ] ].semester.silences += 1;
                    DJs[ record[ dj ] ].semester.silencesArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].week.reputationScore -= 1;
                    DJs[ record[ dj ] ].week.silences += 1;
                    DJs[ record[ dj ] ].week.silencesArray.push([ log.logsubtype, log.createdAt ]);
                  }
                });
                DJs[ 0 ].overall.reputationScore -= 1;
                DJs[ 0 ].overall.silences += 1;
                if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].semester.reputationScore -= 1;
                  DJs[ 0 ].semester.silences += 1;
                }
                if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].week.reputationScore -= 1;
                  DJs[ 0 ].week.silences += 1;
                }
                if (record.calendarID) {
                  shows[ record.calendarID ].overall.reputationScore -= 1;
                  shows[ record.calendarID ].overall.silences += 1;
                  shows[ record.calendarID ].overall.silencesArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].semester.reputationScore -= 1;
                    shows[ record.calendarID ].semester.silences += 1;
                    shows[ record.calendarID ].semester.silencesArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].week.reputationScore -= 1;
                    shows[ record.calendarID ].week.silences += 1;
                    shows[ record.calendarID ].week.silencesArray.push([ log.logsubtype, log.createdAt ]);
                  }
                }
                break;
              case 'absent':
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].overall.reputationScore -= 3;
                  DJs[ record[ dj ] ].overall.absences += 1;
                  DJs[ record[ dj ] ].overall.absencesArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].semester.reputationScore -= 3;
                    DJs[ record[ dj ] ].semester.absences += 1;
                    DJs[ record[ dj ] ].semester.absencesArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].week.reputationScore -= 3;
                    DJs[ record[ dj ] ].week.absences += 1;
                    DJs[ record[ dj ] ].week.absencesArray.push([ log.logsubtype, log.createdAt ]);
                  }
                });
                DJs[ 0 ].overall.reputationScore -= 3;
                DJs[ 0 ].overall.absences += 1;
                if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].semester.reputationScore -= 3;
                  DJs[ 0 ].semester.absences += 1;
                }
                if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].week.reputationScore -= 3;
                  DJs[ 0 ].week.absences += 1;
                }
                if (record.calendarID) {
                  shows[ record.calendarID ].overall.reputationScore -= 3;
                  shows[ record.calendarID ].overall.absences += 1;
                  shows[ record.calendarID ].overall.absencesArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].semester.reputationScore -= 3;
                    shows[ record.calendarID ].semester.absences += 1;
                    shows[ record.calendarID ].semester.absencesArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].week.reputationScore -= 3;
                    shows[ record.calendarID ].week.absences += 1;
                    shows[ record.calendarID ].week.absencesArray.push([ log.logsubtype, log.createdAt ]);
                  }
                }
                break;
              case 'unauthorized':
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].overall.reputationScore -= 2;
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].semester.reputationScore -= 2;
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].week.reputationScore -= 2;
                  }
                });
                DJs[ 0 ].overall.reputationScore -= 2;
                if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].semester.reputationScore -= 2;
                }
                if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].week.reputationScore -= 2;
                }
                if (record.calendarID) {
                  shows[ record.calendarID ].overall.reputationScore -= 2;
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].semester.reputationScore -= 2;
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].week.reputationScore -= 2;
                  }
                }
                break;
              case 'id':
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].overall.reputationScore -= 3;
                  DJs[ record[ dj ] ].overall.missedIDs += 1;
                  DJs[ record[ dj ] ].overall.missedIDsArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].semester.reputationScore -= 3;
                    DJs[ record[ dj ] ].semester.missedIDs += 1;
                    DJs[ record[ dj ] ].semester.missedIDsArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].week.reputationScore -= 3;
                    DJs[ record[ dj ] ].week.missedIDs += 1;
                    DJs[ record[ dj ] ].week.missedIDsArray.push([ log.logsubtype, log.createdAt ]);
                  }
                });
                DJs[ 0 ].overall.reputationScore -= 3;
                DJs[ 0 ].overall.missedIDs += 1;
                if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].semester.reputationScore -= 3;
                  DJs[ 0 ].semester.missedIDs += 1;
                }
                if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].week.reputationScore -= 3;
                  DJs[ 0 ].week.missedIDs += 1;
                }
                if (record.calendarID) {
                  shows[ record.calendarID ].overall.reputationScore -= 3;
                  shows[ record.calendarID ].overall.missedIDs += 1;
                  shows[ record.calendarID ].overall.missedIDsArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].semester.reputationScore -= 3;
                    shows[ record.calendarID ].semester.missedIDs += 1;
                    shows[ record.calendarID ].semester.missedIDsArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].week.reputationScore -= 3;
                    shows[ record.calendarID ].week.missedIDs += 1;
                    shows[ record.calendarID ].week.missedIDsArray.push([ log.logsubtype, log.createdAt ]);
                  }
                }
                break;
              case 'sign-on-early':
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].overall.reputationScore -= 2;
                  DJs[ record[ dj ] ].overall.earlyStart += 1;
                  DJs[ record[ dj ] ].overall.earlyStartArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].semester.reputationScore -= 2;
                    DJs[ record[ dj ] ].semester.earlyStart += 1;
                    DJs[ record[ dj ] ].semester.earlyStartArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].week.reputationScore -= 2;
                    DJs[ record[ dj ] ].week.earlyStart += 1;
                    DJs[ record[ dj ] ].week.earlyStartArray.push([ log.logsubtype, log.createdAt ]);
                  }
                });
                DJs[ 0 ].overall.reputationScore -= 2;
                DJs[ 0 ].overall.earlyStart += 1;
                if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].semester.reputationScore -= 2;
                  DJs[ 0 ].semester.earlyStart += 1;
                }
                if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].week.reputationScore -= 2;
                  DJs[ 0 ].week.earlyStart += 1;
                }
                if (record.calendarID) {
                  shows[ record.calendarID ].overall.reputationScore -= 2;
                  shows[ record.calendarID ].overall.earlyStart += 1;
                  shows[ record.calendarID ].overall.earlyStartArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].semester.reputationScore -= 2;
                    shows[ record.calendarID ].semester.earlyStart += 1;
                    shows[ record.calendarID ].semester.earlyStartArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].week.reputationScore -= 2;
                    shows[ record.calendarID ].week.earlyStart += 1;
                    shows[ record.calendarID ].week.earlyStartArray.push([ log.logsubtype, log.createdAt ]);
                  }
                }
                break;
              case 'sign-off-late':
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].overall.reputationScore -= 2;
                  DJs[ record[ dj ] ].overall.lateEnd += 1;
                  DJs[ record[ dj ] ].overall.lateEndArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].semester.reputationScore -= 2;
                    DJs[ record[ dj ] ].semester.lateEnd += 1;
                    DJs[ record[ dj ] ].semester.lateEndArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].week.reputationScore -= 2;
                    DJs[ record[ dj ] ].week.lateEnd += 1;
                    DJs[ record[ dj ] ].week.lateEndArray.push([ log.logsubtype, log.createdAt ]);
                  }
                });
                DJs[ 0 ].overall.reputationScore -= 2;
                DJs[ 0 ].overall.lateEnd += 1;
                if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].semester.reputationScore -= 2;
                  DJs[ 0 ].semester.lateEnd += 1;
                }
                if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].week.reputationScore -= 2;
                  DJs[ 0 ].week.lateEnd += 1;
                }
                if (record.calendarID) {
                  shows[ record.calendarID ].overall.reputationScore -= 2;
                  shows[ record.calendarID ].overall.lateEnd += 1;
                  shows[ record.calendarID ].overall.lateEndArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].semester.reputationScore -= 2;
                    shows[ record.calendarID ].semester.lateEnd += 1;
                    shows[ record.calendarID ].semester.lateEndArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].week.reputationScore -= 2;
                    shows[ record.calendarID ].week.lateEnd += 1;
                    shows[ record.calendarID ].week.lateEndArray.push([ log.logsubtype, log.createdAt ]);
                  }
                }
                break;
              case 'sign-on-late':
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].overall.reputationScore -= 1;
                  DJs[ record[ dj ] ].overall.lateStart += 1;
                  DJs[ record[ dj ] ].overall.lateStartArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].semester.reputationScore -= 1;
                    DJs[ record[ dj ] ].semester.lateStart += 1;
                    DJs[ record[ dj ] ].semester.lateStartArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].week.reputationScore -= 1;
                    DJs[ record[ dj ] ].week.lateStart += 1;
                    DJs[ record[ dj ] ].week.lateStartArray.push([ log.logsubtype, log.createdAt ]);
                  }
                });
                DJs[ 0 ].overall.reputationScore -= 1;
                DJs[ 0 ].overall.lateStart += 1;
                if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].semester.reputationScore -= 1;
                  DJs[ 0 ].semester.lateStart += 1;
                }
                if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].week.reputationScore -= 1;
                  DJs[ 0 ].week.lateStart += 1;
                }
                if (record.calendarID) {
                  shows[ record.calendarID ].overall.reputationScore -= 1;
                  shows[ record.calendarID ].overall.lateStart += 1;
                  shows[ record.calendarID ].overall.lateStartArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].semester.reputationScore -= 1;
                    shows[ record.calendarID ].semester.lateStart += 1;
                    shows[ record.calendarID ].semester.lateStartArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].week.reputationScore -= 1;
                    shows[ record.calendarID ].week.lateStart += 1;
                    shows[ record.calendarID ].week.lateStartArray.push([ log.logsubtype, log.createdAt ]);
                  }
                }
                break;
              case 'sign-off-early':
                [ 'dj', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map((dj) => {
                  if (!record[ dj ]) return;
                  DJs[ record[ dj ] ].overall.reputationScore -= 1;
                  DJs[ record[ dj ] ].overall.earlyEnd += 1;
                  DJs[ record[ dj ] ].overall.earlyEndArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].semester.reputationScore -= 1;
                    DJs[ record[ dj ] ].semester.earlyEnd += 1;
                    DJs[ record[ dj ] ].semester.earlyEndArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    DJs[ record[ dj ] ].week.reputationScore -= 1;
                    DJs[ record[ dj ] ].week.earlyEnd += 1;
                    DJs[ record[ dj ] ].week.earlyEndArray.push([ log.logsubtype, log.createdAt ]);
                  }
                });
                DJs[ 0 ].overall.reputationScore -= 1;
                DJs[ 0 ].overall.earlyEnd += 1;
                if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].semester.reputationScore -= 1;
                  DJs[ 0 ].semester.earlyEnd += 1;
                }
                if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                  DJs[ 0 ].week.reputationScore -= 1;
                  DJs[ 0 ].week.earlyEnd += 1;
                }
                if (record.calendarID) {
                  shows[ record.calendarID ].overall.reputationScore -= 1;
                  shows[ record.calendarID ].overall.earlyEnd += 1;
                  shows[ record.calendarID ].overall.earlyEndArray.push([ log.logsubtype, log.createdAt ]);
                  if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].semester.reputationScore -= 1;
                    shows[ record.calendarID ].semester.earlyEnd += 1;
                    shows[ record.calendarID ].semester.earlyEndArray.push([ log.logsubtype, log.createdAt ]);
                  }
                  if (moment().subtract(7, 'days').isBefore(moment(record.createdAt))) {
                    shows[ record.calendarID ].week.reputationScore -= 1;
                    shows[ record.calendarID ].week.earlyEnd += 1;
                    shows[ record.calendarID ].week.earlyEndArray.push([ log.logsubtype, log.createdAt ]);
                  }
                }
                break;
            }
          });
        });
      await Promise.all(maps);
    }

    // Execute our parallel functions and wait for all of them to resolve.
    await Promise.all([ process1(), process2(), process3(), process4() ])

    // Do additional final calculations for DJs
    for (var index in DJs) {
      if (Object.prototype.hasOwnProperty.call(DJs, index)) {
        // Calculate the ratio of listeners to showtime
        DJs[ index ].overall.ratio = DJs[ index ].overall.listeners / DJs[ index ].overall.showtime
        DJs[ index ].semester.ratio = DJs[ index ].semester.listeners / DJs[ index ].semester.showtime
        DJs[ index ].week.ratio = DJs[ index ].week.listeners / DJs[ index ].week.showtime

        // Calculate the reputation percent
        DJs[ index ].overall.reputationScore += DJs[ index ].overall.reputationScoreMax;
        DJs[ index ].overall.reputationScorePercent = DJs[ index ].overall.reputationScore > 0 ? Math.round(100 * (DJs[ index ].overall.reputationScore / DJs[ index ].overall.reputationScoreMax)) : 0;
        DJs[ index ].semester.reputationScore += DJs[ index ].semester.reputationScoreMax;
        DJs[ index ].semester.reputationScorePercent = DJs[ index ].semester.reputationScore > 0 ? Math.round(100 * (DJs[ index ].semester.reputationScore / DJs[ index ].semester.reputationScoreMax)) : 0;
        DJs[ index ].week.reputationScore += DJs[ index ].week.reputationScoreMax;
        DJs[ index ].week.reputationScorePercent = DJs[ index ].week.reputationScore > 0 ? Math.round(100 * (DJs[ index ].week.reputationScore / DJs[ index ].week.reputationScoreMax)) : 0;
      }
    }

    for (var index in shows) {
      if (Object.prototype.hasOwnProperty.call(shows, index)) {
        // Calculate the ratio of listeners to showtime
        shows[ index ].overall.ratio = shows[ index ].overall.listeners / shows[ index ].overall.showtime
        shows[ index ].semester.ratio = shows[ index ].semester.listeners / shows[ index ].semester.showtime
        shows[ index ].week.ratio = shows[ index ].week.listeners / shows[ index ].week.showtime

        // Calculate the reputation percent
        shows[ index ].overall.reputationScore += shows[ index ].overall.reputationScoreMax;
        shows[ index ].overall.reputationScorePercent = shows[ index ].overall.reputationScore > 0 ? Math.round(100 * (shows[ index ].overall.reputationScore / shows[ index ].overall.reputationScoreMax)) : 0;
        shows[ index ].semester.reputationScore += shows[ index ].semester.reputationScoreMax;
        shows[ index ].semester.reputationScorePercent = shows[ index ].semester.reputationScore > 0 ? Math.round(100 * (shows[ index ].semester.reputationScore / shows[ index ].semester.reputationScoreMax)) : 0;
        shows[ index ].week.reputationScore += shows[ index ].week.reputationScoreMax;
        shows[ index ].week.reputationScorePercent = shows[ index ].week.reputationScore > 0 ? Math.round(100 * (shows[ index ].week.reputationScore / shows[ index ].week.reputationScoreMax)) : 0;
      }
    }

    // All done. Return as an array pair.
    return exits.success([ DJs, shows ]);
  }

}
