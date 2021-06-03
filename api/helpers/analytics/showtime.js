// TODO: Add more properties to enable skipping calculations of 365 days and overall

module.exports = {
  friendlyName: "analytics.showtime",

  description:
    "Get analytics about the amount of show time and listenership every DJ had since the beginning of startOfSemester.",

  inputs: {
    djs: {
      type: "json",
      required: false,
      custom: function(value) {
        var valid = true;
        if (value.length > 0) {
          value.map(val => {
            if (isNaN(val)) valid = false;
          });
        }
        return valid;
      },
      description: `Array of DJ IDs if you want showtime records for specific DJs. If not provided, will return all applicable DJs.`
    },
    calendarIDs: {
      type: "json",
      required: false,
      custom: function(value) {
        var valid = true;
        if (value.length > 0) {
          value.map(val => {
            if (isNaN(val)) valid = false;
          });
        }
        return valid;
      },
      description: `Array of calendar IDs of a calendar if you only want showtime records for specific shows/calendars. If not provided, will return all applicable shows.`
    },
    start: {
      type: "string",
      custom: function(value) {
        return moment(value).isValid();
      },
      description: `moment() parsable string of the start date/time for range analytics. Defaults to the year 2002.`
    },
    end: {
      type: "string",
      custom: function(value) {
        return moment(value).isValid();
      },
      description: `moment() parsable string of the end date/time for range analytics. Defaults to now.`
    }
  },

  fn: async function(inputs) {
    // Initialize for every DJ in the system + one for all DJs
    var DJs = {};
    var shows = {};

    // filter out all falsey values from inputs
    if (inputs.djs && typeof inputs.djs.filter !== "undefined")
      inputs.djs = inputs.djs.filter(dj => dj);
    if (inputs.calendarIDs && typeof inputs.calendarIDs.filter !== "undefined")
      inputs.calendarIDs = inputs.calendarIDs.filter(cal => cal);

    // Preload show groups
    shows[0] = {
      name: "All programming",
      week: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
      range: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
    };
    shows[-1] = {
      name: "Shows, remotes, and prerecords",
      week: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
      range: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
    };

    shows[-2] = {
      name: "Sports only",
      week: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
      range: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
    };

    shows[-3] = {
      name: "Genres only",
      week: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
      range: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
    };

    shows[-4] = {
      name: "Playlists only",
      week: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
      range: {
        showtime: 0,
        tuneins: 0,
        listeners: 0,
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
        listenerPeak: 0,
        listenerPeakTime: null,
        ratio: 1,
        messages: 0,
        shows: 0,
        prerecords: 0,
        remotes: 0,
        sports: 0,
        genres: 0,
        playlists: 0,
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
    };

    var initializeShow = id => {
      if (id && typeof shows[id] === "undefined") {
        shows[id] = {
          name: null,
          week: {
            showtime: 0,
            tuneins: 0,
            listeners: 0,
            listenerPeak: 0,
            listenerPeakTime: null,
            ratio: 1,
            messages: 0,
            shows: 0,
            prerecords: 0,
            remotes: 0,
            sports: 0,
            genres: 0,
            playlists: 0,
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
          range: {
            showtime: 0,
            tuneins: 0,
            listeners: 0,
            listenerPeak: 0,
            listenerPeakTime: null,
            ratio: 1,
            messages: 0,
            shows: 0,
            genres: 0,
            playlists: 0,
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
            listenerPeak: 0,
            listenerPeakTime: null,
            ratio: 1,
            messages: 0,
            shows: 0,
            prerecords: 0,
            remotes: 0,
            sports: 0,
            genres: 0,
            playlists: 0,
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
            listenerPeak: 0,
            listenerPeakTime: null,
            ratio: 1,
            messages: 0,
            shows: 0,
            prerecords: 0,
            remotes: 0,
            sports: 0,
            genres: 0,
            playlists: 0,
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
        };
      }
    };

    var initializeDJ = id => {
      if (id && typeof DJs[id] === "undefined") {
        DJs[id] = {
          name: null,
          week: {
            showtime: 0,
            tuneins: 0,
            listeners: 0,
            listenerPeak: 0,
            listenerPeakTime: null,
            ratio: 1,
            messages: 0,
            remoteCredits: 0,
            warningPoints: 0,
            shows: 0,
            prerecords: 0,
            remotes: 0,
            sports: 0,
            genres: 0,
            playlists: 0,
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
            warnings: [],
            reputationScore: 0,
            reputationScoreMax: 0,
            reputationPercent: 0
          },
          range: {
            showtime: 0,
            tuneins: 0,
            listeners: 0,
            listenerPeak: 0,
            listenerPeakTime: null,
            ratio: 1,
            messages: 0,
            remoteCredits: 0,
            warningPoints: 0,
            shows: 0,
            prerecords: 0,
            remotes: 0,
            sports: 0,
            genres: 0,
            playlists: 0,
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
            warnings: [],
            reputationScore: 0,
            reputationScoreMax: 0,
            reputationPercent: 0
          },
          semester: {
            showtime: 0,
            tuneins: 0,
            listeners: 0,
            listenerPeak: 0,
            listenerPeakTime: null,
            ratio: 1,
            messages: 0,
            remoteCredits: 0,
            warningPoints: 0,
            shows: 0,
            prerecords: 0,
            remotes: 0,
            sports: 0,
            genres: 0,
            playlists: 0,
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
            warnings: [],
            reputationScore: 0,
            reputationScoreMax: 0,
            reputationPercent: 0
          },
          overall: {
            showtime: 0,
            tuneins: 0,
            listeners: 0,
            listenerPeak: 0,
            listenerPeakTime: null,
            ratio: 1,
            messages: 0,
            remoteCredits: 0,
            warningPoints: 0,
            shows: 0,
            prerecords: 0,
            remotes: 0,
            genres: 0,
            playlists: 0,
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
            warnings: [],
            reputationScore: 0,
            reputationScoreMax: 0,
            reputationPercent: 0
          }
        };
      }
    };

    // Initialize range
    var start = inputs.start
      ? moment(inputs.start).toISOString(true)
      : moment()
          .subtract(1, "years")
          .toISOString(true);
    var end = inputs.end
      ? moment(inputs.end).toISOString(true)
      : moment().toISOString(true);

    // Form query for filtering attendance records
    var query = {
      createdAt: {
        ">": moment()
          .subtract(1, "years")
          .toISOString(true)
      } // Never get records older than 1 year for analytics
    };
    if (inputs.djs && inputs.djs.length > 0) {
      query.or = [
        { dj: inputs.djs },
        { cohostDJ1: inputs.djs },
        { cohostDJ2: inputs.djs },
        { cohostDJ3: inputs.djs }
      ];
    }
    if (inputs.calendarIDs && inputs.calendarIDs.length > 0) {
      query.calendarID = inputs.calendarIDs;
    }

    // Get the attendance records
    var records2 = await sails.models.attendance.find(query);

    // Calculate earned remote credits and active warning points for all DJs
    var process1 = new Promise(async resolve => {
      let records = await sails.models.djnotes.find({
        dj: inputs.djs ? inputs.djs : { "!=": null },
        createdAt: {
          ">": moment()
            .subtract(1, "years")
            .toISOString(true)
        } // Never get records older than 1 year
      });

      let tasksLeft = records.length;
      if (tasksLeft <= 0) return resolve();

      var process1_2 = record => {
        initializeDJ(record.dj);
        if (record.dj && typeof DJs[record.dj] !== "undefined") {
          if (record.type.startsWith("remote-")) {
            DJs[record.dj].overall.remoteCredits += record.amount;

            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.date)
              )
            ) {
              DJs[record.dj].semester.remoteCredits += record.amount;
            }

            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.date))
            ) {
              DJs[record.dj].week.remoteCredits += record.amount;
            }

            if (
              moment(record.date).isSameOrAfter(moment(start)) &&
              moment(record.date).isBefore(moment(end))
            ) {
              DJs[record.dj].range.remoteCredits += record.amount;
            }
          } else if (record.type.startsWith("warning-")) {
            DJs[record.dj].overall.warningPoints += record.amount;
            DJs[record.dj].overall.warnings.push({
              date: record.date,
              type: record.type,
              description: record.description,
              amount: record.amount
            });
            DJs[record.dj].overall.reputationScore -= 20 * record.amount;

            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.date)
              )
            ) {
              DJs[record.dj].semester.warningPoints += record.amount;
              DJs[record.dj].semester.warnings.push({
                date: record.date,
                type: record.type,
                description: record.description,
                amount: record.amount
              });
              DJs[record.dj].semester.reputationScore -= 20 * record.amount;
            }

            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.date))
            ) {
              DJs[record.dj].week.warningPoints += record.amount;
              DJs[record.dj].week.warnings.push({
                date: record.date,
                type: record.type,
                description: record.description,
                amount: record.amount
              });
              DJs[record.dj].week.reputationScore -= 20 * record.amount;
            }

            if (
              moment(record.date).isSameOrAfter(moment(start)) &&
              moment(record.date).isBefore(moment(end))
            ) {
              DJs[record.dj].range.warningPoints += record.amount;
              DJs[record.dj].range.warnings.push({
                date: record.date,
                type: record.type,
                description: record.description,
                amount: record.amount
              });
              DJs[record.dj].range.reputationScore -= 20 * record.amount;
            }
          }
        }

        tasksLeft--;
        if (tasksLeft <= 0) resolve();
      };

      records.map(record => {
        WWSUqueue.add(() => process1_2(_.cloneDeep(record)));
      });
    });

    // Showtime, tuneins, listenerMinutes, and webMessages calculations
    // Note: Sports broadcasts and genres are not factored in to DJ analytics
    var process2 = new Promise(async resolve => {
      let records = records2.filter(
        record => record.showTime !== null && record.listenerMinutes !== null
      );

      let tasksLeft = records.length;
      if (tasksLeft <= 0) return resolve();

      var process2_2 = record => {
        ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
          initializeDJ(record[dj]);
          if (!record[dj] || typeof DJs[record[dj]] === "undefined") return;
          if (
            !record.event.toLowerCase().startsWith("sports: ") &&
            !record.event.toLowerCase().startsWith("genre: ")
          ) {
            DJs[record[dj]].overall.showtime += record.showTime;
            DJs[record[dj]].overall.tuneins += record.tuneIns;
            DJs[record[dj]].overall.listeners += record.listenerMinutes;
            DJs[record[dj]].overall.messages += record.webMessages;

            if (record.listenerPeak > DJs[record[dj]].overall.listenerPeak) {
              DJs[record[dj]].overall.listenerPeak = record.listenerPeak;
              DJs[record[dj]].overall.listenerPeakTime = record.listenerPeakTime;
            }
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.createdAt)
              )
            ) {
              DJs[record[dj]].semester.showtime += record.showTime;
              DJs[record[dj]].semester.tuneins += record.tuneIns;
              DJs[record[dj]].semester.listeners += record.listenerMinutes;
              DJs[record[dj]].semester.messages += record.webMessages;

              if (record.listenerPeak > DJs[record[dj]].semester.listenerPeak) {
                DJs[record[dj]].semester.listenerPeak = record.listenerPeak;
                DJs[record[dj]].semester.listenerPeakTime = record.listenerPeakTime;
              }
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.createdAt))
            ) {
              DJs[record[dj]].week.showtime += record.showTime;
              DJs[record[dj]].week.tuneins += record.tuneIns;
              DJs[record[dj]].week.listeners += record.listenerMinutes;
              DJs[record[dj]].week.messages += record.webMessages;

              if (record.listenerPeak > DJs[record[dj]].week.listenerPeak) {
                DJs[record[dj]].week.listenerPeak = record.listenerPeak;
                DJs[record[dj]].week.listenerPeakTime = record.listenerPeakTime;
              }
            }
            if (
              moment(record.createdAt).isSameOrAfter(moment(start)) &&
              moment(record.createdAt).isBefore(moment(end))
            ) {
              DJs[record[dj]].range.showtime += record.showTime;
              DJs[record[dj]].range.tuneins += record.tuneIns;
              DJs[record[dj]].range.listeners += record.listenerMinutes;
              DJs[record[dj]].range.messages += record.webMessages;

              if (record.listenerPeak > DJs[record[dj]].range.listenerPeak) {
                DJs[record[dj]].range.listenerPeak = record.listenerPeak;
                DJs[record[dj]].range.listenerPeakTime = record.listenerPeakTime;
              }
            }
          }
        });

        shows[0].overall.showtime += record.showTime;
        shows[0].overall.tuneins += record.tuneIns;
        shows[0].overall.listeners += record.listenerMinutes;
        shows[0].overall.messages += record.webMessages;

        if (record.listenerPeak > shows[0].overall.listenerPeak) {
          shows[0].overall.listenerPeak = record.listenerPeak;
          shows[0].overall.listenerPeakTime = record.listenerPeakTime;
        }
        if (
          moment(sails.config.custom.startOfSemester).isBefore(
            moment(record.createdAt)
          )
        ) {
          shows[0].semester.showtime += record.showTime;
          shows[0].semester.tuneins += record.tuneIns;
          shows[0].semester.listeners += record.listenerMinutes;
          shows[0].semester.messages += record.webMessages;

          if (record.listenerPeak > shows[0].semester.listenerPeak) {
            shows[0].semester.listenerPeak = record.listenerPeak;
            shows[0].semester.listenerPeakTime = record.listenerPeakTime;
          }
        }
        if (
          moment()
            .subtract(7, "days")
            .isBefore(moment(record.createdAt))
        ) {
          shows[0].week.showtime += record.showTime;
          shows[0].week.tuneins += record.tuneIns;
          shows[0].week.listeners += record.listenerMinutes;
          shows[0].week.messages += record.webMessages;

          if (record.listenerPeak > shows[0].week.listenerPeak) {
            shows[0].week.listenerPeak = record.listenerPeak;
            shows[0].week.listenerPeakTime = record.listenerPeakTime;
          }
        }
        if (
          moment(record.createdAt).isSameOrAfter(moment(start)) &&
          moment(record.createdAt).isBefore(moment(end))
        ) {
          shows[0].range.showtime += record.showTime;
          shows[0].range.tuneins += record.tuneIns;
          shows[0].range.listeners += record.listenerMinutes;
          shows[0].range.messages += record.webMessages;

          if (record.listenerPeak > shows[0].range.listenerPeak) {
            shows[0].range.listenerPeak = record.listenerPeak;
            shows[0].range.listenerPeakTime = record.listenerPeakTime;
          }
        }

        if (
          record.event.toLowerCase().startsWith("show: ") ||
          record.event.toLowerCase().startsWith("remote: ") ||
          record.event.toLowerCase().startsWith("prerecord: ")
        ) {
          shows[-1].overall.showtime += record.showTime;
          shows[-1].overall.tuneins += record.tuneIns;
          shows[-1].overall.listeners += record.listenerMinutes;
          shows[-1].overall.messages += record.webMessages;

          if (record.listenerPeak > shows[-1].overall.listenerPeak) {
            shows[-1].overall.listenerPeak = record.listenerPeak;
            shows[-1].overall.listenerPeakTime = record.listenerPeakTime;
          }
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.createdAt)
            )
          ) {
            shows[-1].semester.showtime += record.showTime;
            shows[-1].semester.tuneins += record.tuneIns;
            shows[-1].semester.listeners += record.listenerMinutes;
            shows[-1].semester.messages += record.webMessages;

            if (record.listenerPeak > shows[-1].semester.listenerPeak) {
              shows[-1].semester.listenerPeak = record.listenerPeak;
              shows[-1].semester.listenerPeakTime = record.listenerPeakTime;
            }
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.createdAt))
          ) {
            shows[-1].week.showtime += record.showTime;
            shows[-1].week.tuneins += record.tuneIns;
            shows[-1].week.listeners += record.listenerMinutes;
            shows[-1].week.messages += record.webMessages;

            if (record.listenerPeak > shows[-1].week.listenerPeak) {
              shows[-1].week.listenerPeak = record.listenerPeak;
              shows[-1].week.listenerPeakTime = record.listenerPeakTime;
            }
          }
          if (
            moment(record.createdAt).isSameOrAfter(moment(start)) &&
            moment(record.createdAt).isBefore(moment(end))
          ) {
            shows[-1].range.showtime += record.showTime;
            shows[-1].range.tuneins += record.tuneIns;
            shows[-1].range.listeners += record.listenerMinutes;
            shows[-1].range.messages += record.webMessages;

            if (record.listenerPeak > shows[-1].range.listenerPeak) {
              shows[-1].range.listenerPeak = record.listenerPeak;
              shows[-1].range.listenerPeakTime = record.listenerPeakTime;
            }
          }
        }

        if (record.event.toLowerCase().startsWith("sports: ")) {
          shows[-2].overall.showtime += record.showTime;
          shows[-2].overall.tuneins += record.tuneIns;
          shows[-2].overall.listeners += record.listenerMinutes;
          shows[-2].overall.messages += record.webMessages;

          if (record.listenerPeak > shows[-2].overall.listenerPeak) {
            shows[-2].overall.listenerPeak = record.listenerPeak;
            shows[-2].overall.listenerPeakTime = record.listenerPeakTime;
          }
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.createdAt)
            )
          ) {
            shows[-2].semester.showtime += record.showTime;
            shows[-2].semester.tuneins += record.tuneIns;
            shows[-2].semester.listeners += record.listenerMinutes;
            shows[-2].semester.messages += record.webMessages;

            if (record.listenerPeak > shows[-2].semester.listenerPeak) {
              shows[-2].semester.listenerPeak = record.listenerPeak;
              shows[-2].semester.listenerPeakTime = record.listenerPeakTime;
            }
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.createdAt))
          ) {
            shows[-2].week.showtime += record.showTime;
            shows[-2].week.tuneins += record.tuneIns;
            shows[-2].week.listeners += record.listenerMinutes;
            shows[-2].week.messages += record.webMessages;

            if (record.listenerPeak > shows[-2].week.listenerPeak) {
              shows[-2].week.listenerPeak = record.listenerPeak;
              shows[-2].week.listenerPeakTime = record.listenerPeakTime;
            }
          }
          if (
            moment(record.createdAt).isSameOrAfter(moment(start)) &&
            moment(record.createdAt).isBefore(moment(end))
          ) {
            shows[-2].range.showtime += record.showTime;
            shows[-2].range.tuneins += record.tuneIns;
            shows[-2].range.listeners += record.listenerMinutes;
            shows[-2].range.messages += record.webMessages;

            if (record.listenerPeak > shows[-2].range.listenerPeak) {
              shows[-2].range.listenerPeak = record.listenerPeak;
              shows[-2].range.listenerPeakTime = record.listenerPeakTime;
            }
          }
        }

        if (record.event.toLowerCase().startsWith("genre: ")) {
          shows[-3].overall.showtime += record.showTime;
          shows[-3].overall.tuneins += record.tuneIns;
          shows[-3].overall.listeners += record.listenerMinutes;
          shows[-3].overall.messages += record.webMessages;

          if (record.listenerPeak > shows[-3].overall.listenerPeak) {
            shows[-3].overall.listenerPeak = record.listenerPeak;
            shows[-3].overall.listenerPeakTime = record.listenerPeakTime;
          }
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.createdAt)
            )
          ) {
            shows[-3].semester.showtime += record.showTime;
            shows[-3].semester.tuneins += record.tuneIns;
            shows[-3].semester.listeners += record.listenerMinutes;
            shows[-3].semester.messages += record.webMessages;

            if (record.listenerPeak > shows[-3].semester.listenerPeak) {
              shows[-3].semester.listenerPeak = record.listenerPeak;
              shows[-3].semester.listenerPeakTime = record.listenerPeakTime;
            }
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.createdAt))
          ) {
            shows[-3].week.showtime += record.showTime;
            shows[-3].week.tuneins += record.tuneIns;
            shows[-3].week.listeners += record.listenerMinutes;
            shows[-3].week.messages += record.webMessages;

            if (record.listenerPeak > shows[-3].week.listenerPeak) {
              shows[-3].week.listenerPeak = record.listenerPeak;
              shows[-3].week.listenerPeakTime = record.listenerPeakTime;
            }
          }
          if (
            moment(record.createdAt).isSameOrAfter(moment(start)) &&
            moment(record.createdAt).isBefore(moment(end))
          ) {
            shows[-3].range.showtime += record.showTime;
            shows[-3].range.tuneins += record.tuneIns;
            shows[-3].range.listeners += record.listenerMinutes;
            shows[-3].range.messages += record.webMessages;

            if (record.listenerPeak > shows[-3].range.listenerPeak) {
              shows[-3].range.listenerPeak = record.listenerPeak;
              shows[-3].range.listenerPeakTime = record.listenerPeakTime;
            }
          }
        }

        if (record.event.toLowerCase().startsWith("playlist: ")) {
          shows[-4].overall.showtime += record.showTime;
          shows[-4].overall.tuneins += record.tuneIns;
          shows[-4].overall.listeners += record.listenerMinutes;
          shows[-4].overall.messages += record.webMessages;

          if (record.listenerPeak > shows[-4].overall.listenerPeak) {
            shows[-4].overall.listenerPeak = record.listenerPeak;
            shows[-4].overall.listenerPeakTime = record.listenerPeakTime;
          }
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.createdAt)
            )
          ) {
            shows[-4].semester.showtime += record.showTime;
            shows[-4].semester.tuneins += record.tuneIns;
            shows[-4].semester.listeners += record.listenerMinutes;
            shows[-4].semester.messages += record.webMessages;

            if (record.listenerPeak > shows[-4].semester.listenerPeak) {
              shows[-4].semester.listenerPeak = record.listenerPeak;
              shows[-4].semester.listenerPeakTime = record.listenerPeakTime;
            }
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.createdAt))
          ) {
            shows[-4].week.showtime += record.showTime;
            shows[-4].week.tuneins += record.tuneIns;
            shows[-4].week.listeners += record.listenerMinutes;
            shows[-4].week.messages += record.webMessages;

            if (record.listenerPeak > shows[-4].week.listenerPeak) {
              shows[-4].week.listenerPeak = record.listenerPeak;
              shows[-4].week.listenerPeakTime = record.listenerPeakTime;
            }
          }
          if (
            moment(record.createdAt).isSameOrAfter(moment(start)) &&
            moment(record.createdAt).isBefore(moment(end))
          ) {
            shows[-4].range.showtime += record.showTime;
            shows[-4].range.tuneins += record.tuneIns;
            shows[-4].range.listeners += record.listenerMinutes;
            shows[-4].range.messages += record.webMessages;

            if (record.listenerPeak > shows[-4].range.listenerPeak) {
              shows[-4].range.listenerPeak = record.listenerPeak;
              shows[-4].range.listenerPeakTime = record.listenerPeakTime;
            }
          }
        }

        initializeShow(record.calendarID);
        if (
          record.calendarID &&
          typeof shows[record.calendarID] !== "undefined"
        ) {
          shows[record.calendarID].overall.showtime += record.showTime;
          shows[record.calendarID].overall.tuneins += record.tuneIns;
          shows[record.calendarID].overall.listeners += record.listenerMinutes;
          shows[record.calendarID].overall.messages += record.webMessages;

          if (record.listenerPeak > shows[record.calendarID].overall.listenerPeak) {
            shows[record.calendarID].overall.listenerPeak = record.listenerPeak;
            shows[record.calendarID].overall.listenerPeakTime = record.listenerPeakTime;
          }
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.createdAt)
            )
          ) {
            shows[record.calendarID].semester.showtime += record.showTime;
            shows[record.calendarID].semester.tuneins += record.tuneIns;
            shows[record.calendarID].semester.listeners +=
              record.listenerMinutes;
            shows[record.calendarID].semester.messages += record.webMessages;

            if (record.listenerPeak > shows[record.calendarID].semester.listenerPeak) {
              shows[record.calendarID].semester.listenerPeak = record.listenerPeak;
              shows[record.calendarID].semester.listenerPeakTime = record.listenerPeakTime;
            }
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.createdAt))
          ) {
            shows[record.calendarID].week.showtime += record.showTime;
            shows[record.calendarID].week.tuneins += record.tuneIns;
            shows[record.calendarID].week.listeners += record.listenerMinutes;
            shows[record.calendarID].week.messages += record.webMessages;

            if (record.listenerPeak > shows[record.calendarID].week.listenerPeak) {
              shows[record.calendarID].week.listenerPeak = record.listenerPeak;
              shows[record.calendarID].week.listenerPeakTime = record.listenerPeakTime;
            }
          }
          if (
            moment(record.createdAt).isSameOrAfter(moment(start)) &&
            moment(record.createdAt).isBefore(moment(end))
          ) {
            shows[record.calendarID].range.showtime += record.showTime;
            shows[record.calendarID].range.tuneins += record.tuneIns;
            shows[record.calendarID].range.listeners += record.listenerMinutes;
            shows[record.calendarID].range.messages += record.webMessages;

            if (record.listenerPeak > shows[record.calendarID].range.listenerPeak) {
              shows[record.calendarID].range.listenerPeak = record.listenerPeak;
              shows[record.calendarID].range.listenerPeakTime = record.listenerPeakTime;
            }
          }
        }

        tasksLeft--;
        if (tasksLeft <= 0) resolve();
      };

      records.map(record => {
        WWSUqueue.add(() => process2_2(_.cloneDeep(record)));
      });
    });

    // Calculate maximum reputation score for every DJ
    // Add 5 score for every live/remote/sports show (Only number of sports broadcasts is counted towards DJs, everything else is ignored).
    // Add 2 score for every prerecorded show.
    // Add 2 score for every playlist.
    // Add 1 score for every genre (genres ignore DJs).
    // Add 1 score for every break taken (max 1 for every clockwheel break configured).
    // Also adds 1 score for every sign-off / re-sign-on for the same show to offset a bit of the penalties involved.
    var process3 = new Promise(async resolve => {
      var unique = {};

      let records = records2.filter(
        record =>
          (inputs.djs &&
            inputs.djs.length > 0 &&
            (inputs.djs.indexOf(record.dj) !== -1 ||
              inputs.djs.indexOf(record.cohostDJ1) !== -1 ||
              inputs.djs.indexOf(record.cohostDJ2) !== -1 ||
              inputs.djs.indexOf(record.cohostDJ3) !== -1)) ||
          ((!inputs.djs || inputs.djs.length === 0) &&
            (record.dj ||
              record.cohostDJ1 ||
              record.cohostDJ2 ||
              record.cohostDJ3))
      );

      let tasksLeft = records.length;
      if (tasksLeft <= 0) return resolve();

      await new Promise(async resolve2 => {
        var process3_2 = record => {
          // Calculate how many duplicate records for the same show exists and add reputation score to offset a penalty
          if (record.unique !== null && record.unique !== ``) {
            if (
              record.unique in unique &&
              record.showTime &&
              record.scheduledStart !== null &&
              record.scheduledEnd !== null
            ) {
              // Update showTime and breaks to be correct as it is necessary for break reputation calculations
              if (record.showTime) {
                !unique[record.unique].showtime
                  ? (unique[record.unique].showtime = record.showTime)
                  : (unique[record.unique].showtime += record.showTime);
              }
              if (record.breaks) {
                !unique[record.unique].breaks
                  ? (unique[record.unique].breaks = record.breaks)
                  : (unique[record.unique].breaks += record.breaks);
              }

              ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                initializeDJ(record[dj]);
                if (!record[dj] || typeof DJs[record[dj]] === "undefined") {
                  return;
                }

                DJs[record[dj]].overall.reputationScoreMax += 1;
                if (
                  moment(sails.config.custom.startOfSemester).isBefore(
                    moment(record.createdAt)
                  )
                ) {
                  DJs[record[dj]].semester.reputationScoreMax += 1;
                }
                if (
                  moment()
                    .subtract(7, "days")
                    .isBefore(moment(record.createdAt))
                ) {
                  DJs[record[dj]].week.reputationScoreMax += 1;
                }
                if (
                  moment(record.createdAt).isSameOrAfter(moment(start)) &&
                  moment(record.createdAt).isBefore(moment(end))
                ) {
                  DJs[record[dj]].range.reputationScoreMax += 1;
                }
              });

              shows[0].overall.reputationScoreMax += 1;
              if (
                moment(sails.config.custom.startOfSemester).isBefore(
                  moment(record.createdAt)
                )
              ) {
                shows[0].semester.reputationScoreMax += 1;
              }
              if (
                moment()
                  .subtract(7, "days")
                  .isBefore(moment(record.createdAt))
              ) {
                shows[0].week.reputationScoreMax += 1;
              }
              if (
                moment(record.createdAt).isSameOrAfter(moment(start)) &&
                moment(record.createdAt).isBefore(moment(end))
              ) {
                shows[0].range.reputationScoreMax += 1;
              }

              if (
                record.event.toLowerCase().startsWith("show: ") ||
                record.event.toLowerCase().startsWith("remote: ") ||
                record.event.toLowerCase().startsWith("prerecord: ")
              ) {
                shows[-1].overall.reputationScoreMax += 1;
                if (
                  moment(sails.config.custom.startOfSemester).isBefore(
                    moment(record.createdAt)
                  )
                ) {
                  shows[-1].semester.reputationScoreMax += 1;
                }
                if (
                  moment()
                    .subtract(7, "days")
                    .isBefore(moment(record.createdAt))
                ) {
                  shows[-1].week.reputationScoreMax += 1;
                }
                if (
                  moment(record.createdAt).isSameOrAfter(moment(start)) &&
                  moment(record.createdAt).isBefore(moment(end))
                ) {
                  shows[-1].range.reputationScoreMax += 1;
                }
              }

              if (record.event.toLowerCase().startsWith("sports: ")) {
                shows[-2].overall.reputationScoreMax += 1;
                if (
                  moment(sails.config.custom.startOfSemester).isBefore(
                    moment(record.createdAt)
                  )
                ) {
                  shows[-2].semester.reputationScoreMax += 1;
                }
                if (
                  moment()
                    .subtract(7, "days")
                    .isBefore(moment(record.createdAt))
                ) {
                  shows[-2].week.reputationScoreMax += 1;
                }
                if (
                  moment(record.createdAt).isSameOrAfter(moment(start)) &&
                  moment(record.createdAt).isBefore(moment(end))
                ) {
                  shows[-2].range.reputationScoreMax += 1;
                }
              }

              if (record.event.toLowerCase().startsWith("genre: ")) {
                shows[-3].overall.reputationScoreMax += 1;
                if (
                  moment(sails.config.custom.startOfSemester).isBefore(
                    moment(record.createdAt)
                  )
                ) {
                  shows[-3].semester.reputationScoreMax += 1;
                }
                if (
                  moment()
                    .subtract(7, "days")
                    .isBefore(moment(record.createdAt))
                ) {
                  shows[-3].week.reputationScoreMax += 1;
                }
                if (
                  moment(record.createdAt).isSameOrAfter(moment(start)) &&
                  moment(record.createdAt).isBefore(moment(end))
                ) {
                  shows[-3].range.reputationScoreMax += 1;
                }
              }

              if (record.event.toLowerCase().startsWith("playlist: ")) {
                shows[-4].overall.reputationScoreMax += 1;
                if (
                  moment(sails.config.custom.startOfSemester).isBefore(
                    moment(record.createdAt)
                  )
                ) {
                  shows[-4].semester.reputationScoreMax += 1;
                }
                if (
                  moment()
                    .subtract(7, "days")
                    .isBefore(moment(record.createdAt))
                ) {
                  shows[-4].week.reputationScoreMax += 1;
                }
                if (
                  moment(record.createdAt).isSameOrAfter(moment(start)) &&
                  moment(record.createdAt).isBefore(moment(end))
                ) {
                  shows[-4].range.reputationScoreMax += 1;
                }
              }

              initializeShow(record.calendarID);
              if (
                record.calendarID &&
                typeof shows[record.calendarID] !== "undefined"
              ) {
                shows[record.calendarID].overall.reputationScoreMax += 1;
                if (
                  moment(sails.config.custom.startOfSemester).isBefore(
                    moment(record.createdAt)
                  )
                ) {
                  shows[record.calendarID].semester.reputationScoreMax += 1;
                }
                if (
                  moment()
                    .subtract(7, "days")
                    .isBefore(moment(record.createdAt))
                ) {
                  shows[record.calendarID].week.reputationScoreMax += 1;
                }
                if (
                  moment(record.createdAt).isSameOrAfter(moment(start)) &&
                  moment(record.createdAt).isBefore(moment(end))
                ) {
                  shows[record.calendarID].range.reputationScoreMax += 1;
                }
              }
            }
            unique[record.unique] = _.cloneDeep(record);
          }

          tasksLeft--;
          if (tasksLeft <= 0) resolve2();
        };

        records.map(record => {
          WWSUqueue.add(() => process3_2(_.cloneDeep(record)));
        });
      });

      let tasksLeft2 = 0;

      await new Promise(async resolve2 => {
        var process3_3 = record => {
          if (
            record.actualStart !== null &&
            record.actualEnd !== null &&
            record.happened === 1
          ) {
            var maxBreaks =
              Object.keys(sails.config.custom.breaks).length > 0
                ? record.showTime /
                  (60 / Object.keys(sails.config.custom.breaks).length)
                : 0;
            var breakPoints = Math.min(maxBreaks, record.breaks);
            if (record.event.toLowerCase().startsWith("show: ")) {
              ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                initializeDJ(record[dj]);
                if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                  return;
                DJs[record[dj]].overall.shows += 1;
                DJs[record[dj]].overall.breaks += record.breaks;
              });
              shows[0].overall.shows += 1;
              shows[0].overall.breaks += record.breaks;
              shows[-1].overall.shows += 1;
              shows[-1].overall.breaks += record.breaks;
              initializeShow(record.calendarID);
              if (
                record.calendarID &&
                typeof shows[record.calendarID] !== "undefined"
              ) {
                shows[record.calendarID].overall.shows += 1;
                shows[record.calendarID].overall.breaks += record.breaks;
              }
              if (
                record.scheduledStart !== null &&
                record.scheduledEnd !== null
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].overall.reputationScoreMax += 5 + breakPoints;
                });
                shows[0].overall.reputationScoreMax += 5 + breakPoints;
                shows[-1].overall.reputationScoreMax += 5 + breakPoints;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                )
                  shows[record.calendarID].overall.reputationScoreMax +=
                    5 + breakPoints;
              }
              if (
                moment(sails.config.custom.startOfSemester).isBefore(
                  moment(record.createdAt)
                )
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].semester.shows += 1;
                  DJs[record[dj]].semester.breaks += record.breaks;
                });
                shows[0].semester.shows += 1;
                shows[0].semester.breaks += record.breaks;
                shows[-1].semester.shows += 1;
                shows[-1].semester.breaks += record.breaks;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].semester.shows += 1;
                  shows[record.calendarID].semester.breaks += record.breaks;
                }
                if (
                  record.scheduledStart !== null &&
                  record.scheduledEnd !== null
                ) {
                  ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                    initializeDJ(record[dj]);
                    if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                      return;
                    DJs[record[dj]].semester.reputationScoreMax +=
                      5 + breakPoints;
                  });
                  shows[0].semester.reputationScoreMax += 5 + breakPoints;
                  shows[-1].semester.reputationScoreMax += 5 + breakPoints;
                  initializeShow(record.calendarID);
                  if (
                    record.calendarID &&
                    typeof shows[record.calendarID] !== "undefined"
                  )
                    shows[record.calendarID].semester.reputationScoreMax +=
                      5 + breakPoints;
                }
              }
              if (
                moment()
                  .subtract(7, "days")
                  .isBefore(moment(record.createdAt))
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].week.shows += 1;
                  DJs[record[dj]].week.breaks += record.breaks;
                });
                shows[0].week.shows += 1;
                shows[0].week.breaks += record.breaks;
                shows[-1].week.shows += 1;
                shows[-1].week.breaks += record.breaks;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].week.shows += 1;
                  shows[record.calendarID].week.breaks += record.breaks;
                }
                if (
                  record.scheduledStart !== null &&
                  record.scheduledEnd !== null
                ) {
                  ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                    initializeDJ(record[dj]);
                    if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                      return;
                    DJs[record[dj]].week.reputationScoreMax += 5 + breakPoints;
                  });
                  shows[0].week.reputationScoreMax += 5 + breakPoints;
                  shows[-1].week.reputationScoreMax += 5 + breakPoints;
                  initializeShow(record.calendarID);
                  if (
                    record.calendarID &&
                    typeof shows[record.calendarID] !== "undefined"
                  )
                    shows[record.calendarID].week.reputationScoreMax +=
                      5 + breakPoints;
                }
              }
              if (
                moment(record.createdAt).isSameOrAfter(moment(start)) &&
                moment(record.createdAt).isBefore(moment(end))
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].range.shows += 1;
                  DJs[record[dj]].range.breaks += record.breaks;
                });
                shows[0].range.shows += 1;
                shows[0].range.breaks += record.breaks;
                shows[-1].range.shows += 1;
                shows[-1].range.breaks += record.breaks;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].range.shows += 1;
                  shows[record.calendarID].range.breaks += record.breaks;
                }
                if (
                  record.scheduledStart !== null &&
                  record.scheduledEnd !== null
                ) {
                  ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                    initializeDJ(record[dj]);
                    if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                      return;
                    DJs[record[dj]].range.reputationScoreMax += 5 + breakPoints;
                  });
                  shows[0].range.reputationScoreMax += 5 + breakPoints;
                  shows[-1].range.reputationScoreMax += 5 + breakPoints;
                  initializeShow(record.calendarID);
                  if (
                    record.calendarID &&
                    typeof shows[record.calendarID] !== "undefined"
                  )
                    shows[record.calendarID].range.reputationScoreMax +=
                      5 + breakPoints;
                }
              }
            } else if (record.event.toLowerCase().startsWith("prerecord: ")) {
              var maxBreaks = record.showTime / 20;
              var breakPoints = Math.min(maxBreaks, record.breaks);
              ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                initializeDJ(record[dj]);
                if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                  return;
                DJs[record[dj]].overall.prerecords += 1;
                DJs[record[dj]].overall.breaks += record.breaks;
                DJs[record[dj]].overall.reputationScoreMax += 2 + breakPoints;
              });
              shows[0].overall.prerecords += 1;
              shows[0].overall.reputationScoreMax += 2 + breakPoints;
              shows[0].overall.breaks += record.breaks;
              shows[-1].overall.prerecords += 1;
              shows[-1].overall.reputationScoreMax += 2 + breakPoints;
              shows[-1].overall.breaks += record.breaks;
              initializeShow(record.calendarID);
              if (
                record.calendarID &&
                typeof shows[record.calendarID] !== "undefined"
              ) {
                shows[record.calendarID].overall.prerecords += 1;
                shows[record.calendarID].overall.reputationScoreMax +=
                  2 + breakPoints;
                shows[record.calendarID].overall.breaks += record.breaks;
              }
              if (
                moment(sails.config.custom.startOfSemester).isBefore(
                  moment(record.createdAt)
                )
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].semester.prerecords += 1;
                  DJs[record[dj]].semester.breaks += record.breaks;
                  DJs[record[dj]].semester.reputationScoreMax +=
                    2 + breakPoints;
                });
                shows[0].semester.prerecords += 1;
                shows[0].semester.reputationScoreMax += 2 + breakPoints;
                shows[0].semester.breaks += record.breaks;
                shows[-1].semester.prerecords += 1;
                shows[-1].semester.reputationScoreMax += 2 + breakPoints;
                shows[-1].semester.breaks += record.breaks;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].semester.prerecords += 1;
                  shows[record.calendarID].semester.reputationScoreMax +=
                    2 + breakPoints;
                  shows[record.calendarID].semester.breaks += record.breaks;
                }
              }
              if (
                moment()
                  .subtract(7, "days")
                  .isBefore(moment(record.createdAt))
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].week.prerecords += 1;
                  DJs[record[dj]].week.breaks += record.breaks;
                  DJs[record[dj]].week.reputationScoreMax += 2 + breakPoints;
                });
                shows[0].week.prerecords += 1;
                shows[0].week.reputationScoreMax += 2 + breakPoints;
                shows[0].week.breaks += record.breaks;
                shows[-1].week.prerecords += 1;
                shows[-1].week.reputationScoreMax += 2 + breakPoints;
                shows[-1].week.breaks += record.breaks;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].week.prerecords += 1;
                  shows[record.calendarID].week.reputationScoreMax +=
                    2 + breakPoints;
                  shows[record.calendarID].week.breaks += record.breaks;
                }
              }
              if (
                moment(record.createdAt).isSameOrAfter(moment(start)) &&
                moment(record.createdAt).isBefore(moment(end))
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].range.prerecords += 1;
                  DJs[record[dj]].range.breaks += record.breaks;
                  DJs[record[dj]].range.reputationScoreMax += 2 + breakPoints;
                });
                shows[0].range.prerecords += 1;
                shows[0].range.reputationScoreMax += 2 + breakPoints;
                shows[0].range.breaks += record.breaks;
                shows[-1].range.prerecords += 1;
                shows[-1].range.reputationScoreMax += 2 + breakPoints;
                shows[-1].range.breaks += record.breaks;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].range.prerecords += 1;
                  shows[record.calendarID].range.reputationScoreMax +=
                    2 + breakPoints;
                  shows[record.calendarID].range.breaks += record.breaks;
                }
              }
            } else if (record.event.toLowerCase().startsWith("remote: ")) {
              var maxBreaks = record.showTime / 20;
              var breakPoints = Math.min(maxBreaks, record.breaks);
              ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                initializeDJ(record[dj]);
                if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                  return;
                DJs[record[dj]].overall.remotes += 1;
                DJs[record[dj]].overall.breaks += record.breaks;
              });
              shows[0].overall.remotes += 1;
              shows[0].overall.breaks += record.breaks;
              shows[-1].overall.remotes += 1;
              shows[-1].overall.breaks += record.breaks;
              initializeShow(record.calendarID);
              if (
                record.calendarID &&
                typeof shows[record.calendarID] !== "undefined"
              ) {
                shows[record.calendarID].overall.remotes += 1;
                shows[record.calendarID].overall.breaks += record.breaks;
              }
              if (
                record.scheduledStart !== null &&
                record.scheduledEnd !== null
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].overall.reputationScoreMax += 5 + breakPoints;
                });
                shows[0].overall.reputationScoreMax += 5 + breakPoints;
                shows[-1].overall.reputationScoreMax += 5 + breakPoints;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                )
                  shows[record.calendarID].overall.reputationScoreMax +=
                    5 + breakPoints;
              }
              if (
                moment(sails.config.custom.startOfSemester).isBefore(
                  moment(record.createdAt)
                )
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].semester.remotes += 1;
                  DJs[record[dj]].semester.breaks += record.breaks;
                });
                shows[0].semester.remotes += 1;
                shows[0].semester.breaks += record.breaks;
                shows[-1].semester.remotes += 1;
                shows[-1].semester.breaks += record.breaks;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].semester.remotes += 1;
                  shows[record.calendarID].semester.breaks += record.breaks;
                }
                if (
                  record.scheduledStart !== null &&
                  record.scheduledEnd !== null
                ) {
                  ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                    initializeDJ(record[dj]);
                    if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                      return;
                    DJs[record[dj]].semester.reputationScoreMax +=
                      5 + breakPoints;
                  });
                  shows[0].semester.reputationScoreMax += 5 + breakPoints;
                  shows[-1].semester.reputationScoreMax += 5 + breakPoints;
                  initializeShow(record.calendarID);
                  if (
                    record.calendarID &&
                    typeof shows[record.calendarID] !== "undefined"
                  )
                    shows[record.calendarID].semester.reputationScoreMax +=
                      5 + breakPoints;
                }
              }
              if (
                moment()
                  .subtract(7, "days")
                  .isBefore(moment(record.createdAt))
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].week.remotes += 1;
                  DJs[record[dj]].week.breaks += record.breaks;
                });
                shows[0].week.remotes += 1;
                shows[0].week.breaks += record.breaks;
                shows[-1].week.remotes += 1;
                shows[-1].week.breaks += record.breaks;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].week.remotes += 1;
                  shows[record.calendarID].week.breaks += record.breaks;
                }
                if (
                  record.scheduledStart !== null &&
                  record.scheduledEnd !== null
                ) {
                  ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                    initializeDJ(record[dj]);
                    if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                      return;
                    DJs[record[dj]].week.reputationScoreMax += 5 + breakPoints;
                  });
                  shows[0].week.reputationScoreMax += 5 + breakPoints;
                  shows[-1].week.reputationScoreMax += 5 + breakPoints;
                  initializeShow(record.calendarID);
                  if (
                    record.calendarID &&
                    typeof shows[record.calendarID] !== "undefined"
                  )
                    shows[record.calendarID].week.reputationScoreMax +=
                      5 + breakPoints;
                }
              }
              if (
                moment(record.createdAt).isSameOrAfter(moment(start)) &&
                moment(record.createdAt).isBefore(moment(end))
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].range.remotes += 1;
                  DJs[record[dj]].range.breaks += record.breaks;
                });
                shows[0].range.remotes += 1;
                shows[0].range.breaks += record.breaks;
                shows[-1].range.remotes += 1;
                shows[-1].range.breaks += record.breaks;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].range.remotes += 1;
                  shows[record.calendarID].range.breaks += record.breaks;
                }
                if (
                  record.scheduledStart !== null &&
                  record.scheduledEnd !== null
                ) {
                  ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                    initializeDJ(record[dj]);
                    if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                      return;
                    DJs[record[dj]].range.reputationScoreMax += 5 + breakPoints;
                  });
                  shows[0].range.reputationScoreMax += 5 + breakPoints;
                  shows[-1].range.reputationScoreMax += 5 + breakPoints;
                  initializeShow(record.calendarID);
                  if (
                    record.calendarID &&
                    typeof shows[record.calendarID] !== "undefined"
                  )
                    shows[record.calendarID].range.reputationScoreMax +=
                      5 + breakPoints;
                }
              }
            } else if (record.event.toLowerCase().startsWith("sports: ")) {
              var maxBreaks = record.showTime / 20;
              var breakPoints = Math.min(maxBreaks, record.breaks);
              ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                initializeDJ(record[dj]);
                if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                  return;
                DJs[record[dj]].overall.sports += 1;
              });
              shows[0].overall.sports += 1;
              shows[0].overall.breaks += record.breaks;
              shows[0].overall.reputationScoreMax += 5 + breakPoints;
              shows[-2].overall.sports += 1;
              shows[-2].overall.breaks += record.breaks;
              shows[-2].overall.reputationScoreMax += 5 + breakPoints;
              initializeShow(record.calendarID);
              if (
                record.calendarID &&
                typeof shows[record.calendarID] !== "undefined"
              ) {
                shows[record.calendarID].overall.sports += 1;
                shows[record.calendarID].overall.breaks += record.breaks;
                shows[record.calendarID].overall.reputationScoreMax +=
                  5 + breakPoints;
              }
              if (
                moment(sails.config.custom.startOfSemester).isBefore(
                  moment(record.createdAt)
                )
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].semester.sports += 1;
                });
                shows[0].semester.sports += 1;
                shows[0].semester.breaks += record.breaks;
                shows[0].semester.reputationScoreMax += 5 + breakPoints;
                shows[-2].semester.sports += 1;
                shows[-2].semester.breaks += record.breaks;
                shows[-2].semester.reputationScoreMax += 5 + breakPoints;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].semester.sports += 1;
                  shows[record.calendarID].semester.breaks += record.breaks;
                  shows[record.calendarID].semester.reputationScoreMax +=
                    5 + breakPoints;
                }
              }
              if (
                moment()
                  .subtract(7, "days")
                  .isBefore(moment(record.createdAt))
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].week.sports += 1;
                });
                shows[0].week.sports += 1;
                shows[0].week.breaks += record.breaks;
                shows[0].week.reputationScoreMax += 5 + breakPoints;
                shows[-2].week.sports += 1;
                shows[-2].week.breaks += record.breaks;
                shows[-2].week.reputationScoreMax += 5 + breakPoints;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].week.sports += 1;
                  shows[record.calendarID].week.breaks += record.breaks;
                  shows[record.calendarID].week.reputationScoreMax +=
                    5 + breakPoints;
                }
              }
              if (
                moment(record.createdAt).isSameOrAfter(moment(start)) &&
                moment(record.createdAt).isBefore(moment(end))
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].range.sports += 1;
                });
                shows[0].range.sports += 1;
                shows[0].range.breaks += record.breaks;
                shows[0].range.reputationScoreMax += 5 + breakPoints;
                shows[-2].range.sports += 1;
                shows[-2].range.breaks += record.breaks;
                shows[-2].range.reputationScoreMax += 5 + breakPoints;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].range.sports += 1;
                  shows[record.calendarID].range.breaks += record.breaks;
                  shows[record.calendarID].overall.reputationScoreMax +=
                    5 + breakPoints;
                }
              }
            } else if (record.event.toLowerCase().startsWith("genre: ")) {
              var maxBreaks = record.showTime / 20;
              var breakPoints = Math.min(maxBreaks, record.breaks);
              shows[0].overall.genres += 1;
              shows[0].overall.breaks += record.breaks;
              shows[0].overall.reputationScoreMax += 1 + breakPoints;
              shows[-3].overall.genres += 1;
              shows[-3].overall.breaks += record.breaks;
              shows[-3].overall.reputationScoreMax += 1 + breakPoints;
              initializeShow(record.calendarID);
              if (
                record.calendarID &&
                typeof shows[record.calendarID] !== "undefined"
              ) {
                shows[record.calendarID].overall.genres += 1;
                shows[record.calendarID].overall.breaks += record.breaks;
                shows[record.calendarID].overall.reputationScoreMax +=
                  1 + breakPoints;
              }
              if (
                moment(sails.config.custom.startOfSemester).isBefore(
                  moment(record.createdAt)
                )
              ) {
                shows[0].semester.genres += 1;
                shows[0].semester.breaks += record.breaks;
                shows[0].semester.reputationScoreMax += 1 + breakPoints;
                shows[-3].semester.genres += 1;
                shows[-3].semester.breaks += record.breaks;
                shows[-3].semester.reputationScoreMax += 1 + breakPoints;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].semester.genres += 1;
                  shows[record.calendarID].semester.breaks += record.breaks;
                  shows[record.calendarID].semester.reputationScoreMax +=
                    1 + breakPoints;
                }
              }
              if (
                moment()
                  .subtract(7, "days")
                  .isBefore(moment(record.createdAt))
              ) {
                shows[0].week.genres += 1;
                shows[0].week.breaks += record.breaks;
                shows[0].week.reputationScoreMax += 1 + breakPoints;
                shows[-3].week.genres += 1;
                shows[-3].week.breaks += record.breaks;
                shows[-3].week.reputationScoreMax += 1 + breakPoints;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].week.genres += 1;
                  shows[record.calendarID].week.breaks += record.breaks;
                  shows[record.calendarID].week.reputationScoreMax +=
                    1 + breakPoints;
                }
              }
              if (
                moment(record.createdAt).isSameOrAfter(moment(start)) &&
                moment(record.createdAt).isBefore(moment(end))
              ) {
                shows[0].range.genres += 1;
                shows[0].range.breaks += record.breaks;
                shows[0].range.reputationScoreMax += 1 + breakPoints;
                shows[-3].range.genres += 1;
                shows[-3].range.breaks += record.breaks;
                shows[-3].range.reputationScoreMax += 1 + breakPoints;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].range.genres += 1;
                  shows[record.calendarID].range.breaks += record.breaks;
                  shows[record.calendarID].range.reputationScoreMax +=
                    1 + breakPoints;
                }
              }
            } else if (record.event.toLowerCase().startsWith("playlist: ")) {
              var maxBreaks = record.showTime / 20;
              var breakPoints = Math.min(maxBreaks, record.breaks);
              ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                initializeDJ(record[dj]);
                if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                  return;
                DJs[record[dj]].overall.playlists += 1;
                DJs[record[dj]].overall.breaks += record.breaks;
                DJs[record[dj]].overall.reputationScoreMax += 2 + breakPoints;
              });
              shows[0].overall.playlists += 1;
              shows[0].overall.breaks += record.breaks;
              shows[0].overall.reputationScoreMax += 2 + breakPoints;
              shows[-4].overall.playlists += 1;
              shows[-4].overall.breaks += record.breaks;
              shows[-4].overall.reputationScoreMax += 2 + breakPoints;
              initializeShow(record.calendarID);
              if (
                record.calendarID &&
                typeof shows[record.calendarID] !== "undefined"
              ) {
                shows[record.calendarID].overall.playlists += 1;
                shows[record.calendarID].overall.breaks += record.breaks;
                shows[record.calendarID].overall.reputationScoreMax +=
                  2 + breakPoints;
              }
              if (
                moment(sails.config.custom.startOfSemester).isBefore(
                  moment(record.createdAt)
                )
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].semester.playlists += 1;
                  DJs[record[dj]].semester.breaks += record.breaks;
                  DJs[record[dj]].semester.reputationScoreMax +=
                    2 + breakPoints;
                });
                shows[0].semester.playlists += 1;
                shows[0].semester.breaks += record.breaks;
                shows[0].semester.reputationScoreMax += 2 + breakPoints;
                shows[-4].semester.playlists += 1;
                shows[-4].semester.breaks += record.breaks;
                shows[-4].semester.reputationScoreMax += 2 + breakPoints;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].semester.playlists += 1;
                  shows[record.calendarID].semester.breaks += record.breaks;
                  shows[record.calendarID].semester.reputationScoreMax +=
                    2 + breakPoints;
                }
              }
              if (
                moment()
                  .subtract(7, "days")
                  .isBefore(moment(record.createdAt))
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].week.playlists += 1;
                  DJs[record[dj]].week.breaks += record.breaks;
                  DJs[record[dj]].week.reputationScoreMax += 2 + breakPoints;
                });
                shows[0].week.playlists += 1;
                shows[0].week.breaks += record.breaks;
                shows[0].week.reputationScoreMax += 2 + breakPoints;
                shows[-4].week.playlists += 1;
                shows[-4].week.breaks += record.breaks;
                shows[-4].week.reputationScoreMax += 2 + breakPoints;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].week.playlists += 1;
                  shows[record.calendarID].week.breaks += record.breaks;
                  shows[record.calendarID].week.reputationScoreMax +=
                    2 + breakPoints;
                }
              }
              if (
                moment(record.createdAt).isSameOrAfter(moment(start)) &&
                moment(record.createdAt).isBefore(moment(end))
              ) {
                ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
                  initializeDJ(record[dj]);
                  if (!record[dj] || typeof DJs[record[dj]] === "undefined")
                    return;
                  DJs[record[dj]].range.playlists += 1;
                  DJs[record[dj]].range.breaks += record.breaks;
                  DJs[record[dj]].range.reputationScoreMax += 2 + breakPoints;
                });
                shows[0].range.playlists += 1;
                shows[0].range.breaks += record.breaks;
                shows[0].range.reputationScoreMax += 2 + breakPoints;
                shows[-4].range.playlists += 1;
                shows[-4].range.breaks += record.breaks;
                shows[-4].range.reputationScoreMax += 2 + breakPoints;
                initializeShow(record.calendarID);
                if (
                  record.calendarID &&
                  typeof shows[record.calendarID] !== "undefined"
                ) {
                  shows[record.calendarID].range.playlists += 1;
                  shows[record.calendarID].range.breaks += record.breaks;
                  shows[record.calendarID].range.reputationScoreMax +=
                    2 + breakPoints;
                }
              }
            }
          }

          tasksLeft2--;
          if (tasksLeft2 <= 0) resolve2();
        };

        // Now go through each unique record to calculate show stats and add reputation
        for (let uniqueRecord in unique) {
          if (Object.prototype.hasOwnProperty.call(unique, uniqueRecord)) {
            tasksLeft2++;
            WWSUqueue.add(() => process3_3(_.cloneDeep(unique[uniqueRecord])));
          }
        }

        if (tasksLeft2 <= 0) resolve2();
      });

      resolve();
    });

    // Calculate reputation score penalties and analytics (ignores excused)
    // Sports and genre reputation penalties are not counted against DJs.
    // Subtract 1 score for every cancellation.
    // Subtract 1 score every time DJ triggered silence detection.
    // Subtract 3 score for every absence (scheduled broadcast that did not air).
    // Subtract 2 score for every unauthorized / unscheduled broadcast.
    // Subtract 3 score for every failed top-of-hour ID break.
    // Subtract 2 score every time DJ signed on too early.
    // Subtract 2 score every time DJ signed off too late.
    // Subtract 1 score every time DJ signed on too late.
    // Subtract 1 score every time DJ signed off too early.
    var process4 = new Promise(async resolve => {
      let records = records2.filter(
        record =>
          (inputs.djs &&
            inputs.djs.length > 0 &&
            (inputs.djs.indexOf(record.dj) !== -1 ||
              inputs.djs.indexOf(record.cohostDJ1) !== -1 ||
              inputs.djs.indexOf(record.cohostDJ2) !== -1 ||
              inputs.djs.indexOf(record.cohostDJ3) !== -1)) ||
          ((!inputs.djs || inputs.djs.length === 0) &&
            (record.dj ||
              record.cohostDJ1 ||
              record.cohostDJ2 ||
              record.cohostDJ3))
      );

      let tasksLeft = records.length;
      if (tasksLeft <= 0) return resolve();

      var process4_2 = record => {
        // Cancelled broadcasts
        if (record.cancellation) {
          ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
            initializeDJ(record[dj]);
            if (
              !record[dj] ||
              typeof DJs[record[dj]] === "undefined" ||
              record.event.toLowerCase().startsWith("genre: ") ||
              record.event.toLowerCase().startsWith("sports: ")
            )
              return;
            DJs[record[dj]].overall.reputationScore -= 1;
            DJs[record[dj]].overall.cancellations += 1;
            DJs[record[dj]].overall.cancellationsArray.push([
              record.event,
              record.scheduledStart
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.scheduledStart)
              )
            ) {
              DJs[record[dj]].semester.reputationScore -= 1;
              DJs[record[dj]].semester.cancellations += 1;
              DJs[record[dj]].semester.cancellationsArray.push([
                record.event,
                record.scheduledStart
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.scheduledStart))
            ) {
              DJs[record[dj]].week.reputationScore -= 1;
              DJs[record[dj]].week.cancellations += 1;
              DJs[record[dj]].week.cancellationsArray.push([
                record.event,
                record.scheduledStart
              ]);
            }
            if (
              moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
              moment(record.scheduledStart).isBefore(moment(end))
            ) {
              DJs[record[dj]].range.reputationScore -= 1;
              DJs[record[dj]].range.cancellations += 1;
              DJs[record[dj]].range.cancellationsArray.push([
                record.event,
                record.scheduledStart
              ]);
            }
          });
          shows[0].overall.reputationScore -= 1;
          shows[0].overall.cancellations += 1;
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.scheduledStart)
            )
          ) {
            shows[0].semester.reputationScore -= 1;
            shows[0].semester.cancellations += 1;
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.scheduledStart))
          ) {
            shows[0].week.reputationScore -= 1;
            shows[0].week.cancellations += 1;
          }
          if (
            moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
            moment(record.scheduledStart).isBefore(moment(end))
          ) {
            shows[0].range.reputationScore -= 1;
            shows[0].range.cancellations += 1;
          }
          if (
            record.event.toLowerCase().startsWith("show: ") ||
            record.event.toLowerCase().startsWith("remote: ") ||
            record.event.toLowerCase().startsWith("prerecord: ")
          ) {
            shows[-1].overall.reputationScore -= 1;
            shows[-1].overall.cancellations += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.scheduledStart)
              )
            ) {
              shows[-1].semester.reputationScore -= 1;
              shows[-1].semester.cancellations += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.scheduledStart))
            ) {
              shows[-1].week.reputationScore -= 1;
              shows[-1].week.cancellations += 1;
            }
            if (
              moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
              moment(record.scheduledStart).isBefore(moment(end))
            ) {
              shows[-1].range.reputationScore -= 1;
              shows[-1].range.cancellations += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("sports: ")) {
            shows[-2].overall.reputationScore -= 1;
            shows[-2].overall.cancellations += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.scheduledStart)
              )
            ) {
              shows[-2].semester.reputationScore -= 1;
              shows[-2].semester.cancellations += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.scheduledStart))
            ) {
              shows[-2].week.reputationScore -= 1;
              shows[-2].week.cancellations += 1;
            }
            if (
              moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
              moment(record.scheduledStart).isBefore(moment(end))
            ) {
              shows[-2].range.reputationScore -= 1;
              shows[-2].range.cancellations += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("genre: ")) {
            shows[-3].overall.reputationScore -= 1;
            shows[-3].overall.cancellations += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.scheduledStart)
              )
            ) {
              shows[-3].semester.reputationScore -= 1;
              shows[-3].semester.cancellations += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.scheduledStart))
            ) {
              shows[-3].week.reputationScore -= 1;
              shows[-3].week.cancellations += 1;
            }
            if (
              moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
              moment(record.scheduledStart).isBefore(moment(end))
            ) {
              shows[-3].range.reputationScore -= 1;
              shows[-3].range.cancellations += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("playlist: ")) {
            shows[-4].overall.reputationScore -= 1;
            shows[-4].overall.cancellations += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.scheduledStart)
              )
            ) {
              shows[-4].semester.reputationScore -= 1;
              shows[-4].semester.cancellations += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.scheduledStart))
            ) {
              shows[-4].week.reputationScore -= 1;
              shows[-4].week.cancellations += 1;
            }
            if (
              moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
              moment(record.scheduledStart).isBefore(moment(end))
            ) {
              shows[-4].range.reputationScore -= 1;
              shows[-4].range.cancellations += 1;
            }
          }
          initializeShow(record.calendarID);
          if (
            record.calendarID &&
            typeof shows[record.calendarID] !== "undefined"
          ) {
            shows[record.calendarID].overall.reputationScore -= 1;
            shows[record.calendarID].overall.cancellations += 1;
            shows[record.calendarID].overall.cancellationsArray.push([
              record.event,
              record.scheduledStart
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.scheduledStart)
              )
            ) {
              shows[record.calendarID].semester.reputationScore -= 1;
              shows[record.calendarID].semester.cancellations += 1;
              shows[record.calendarID].semester.cancellationsArray.push([
                record.event,
                record.scheduledStart
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.scheduledStart))
            ) {
              shows[record.calendarID].week.reputationScore -= 1;
              shows[record.calendarID].week.cancellations += 1;
              shows[record.calendarID].week.cancellationsArray.push([
                record.event,
                record.scheduledStart
              ]);
            }
            if (
              moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
              moment(record.scheduledStart).isBefore(moment(end))
            ) {
              shows[record.calendarID].range.reputationScore -= 1;
              shows[record.calendarID].range.cancellations += 1;
              shows[record.calendarID].range.cancellationsArray.push([
                record.event,
                record.scheduledStart
              ]);
            }
          }
        }

        // Number of times silence alarm was triggered
        if (record.silence && record.silence.length > 0) {
          ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
            initializeDJ(record[dj]);
            if (
              !record[dj] ||
              typeof DJs[record[dj]] === "undefined" ||
              record.event.toLowerCase().startsWith("genre: ") ||
              record.event.toLowerCase().startsWith("sports: ")
            )
              return;
            DJs[record[dj]].overall.reputationScore -= record.silence.length;
            DJs[record[dj]].overall.silences += record.silence.length;
            DJs[record[dj]].overall.silencesArray.push([
              record.event,
              record.silence
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(
                  record.scheduledStart ||
                    record.actualStart ||
                    record.createdAt
                )
              )
            ) {
              DJs[record[dj]].semester.reputationScore -= record.silence.length;
              DJs[record[dj]].semester.silences += record.silence.length;
              DJs[record[dj]].semester.silencesArray.push([
                record.event,
                record.silence
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(
                  moment(
                    record.scheduledStart ||
                      record.actualStart ||
                      record.createdAt
                  )
                )
            ) {
              DJs[record[dj]].week.reputationScore -= record.silence.length;
              DJs[record[dj]].week.silences += record.silence.length;
              DJs[record[dj]].week.silencesArray.push([
                record.event,
                record.silence
              ]);
            }
            if (
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              ).isSameOrAfter(moment(start)) &&
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              ).isBefore(moment(end))
            ) {
              DJs[record[dj]].range.reputationScore -= record.silence.length;
              DJs[record[dj]].range.silences += record.silence.length;
              DJs[record[dj]].range.silencesArray.push([
                record.event,
                record.silence
              ]);
            }
          });
          shows[0].overall.reputationScore -= record.silence.length;
          shows[0].overall.silences += record.silence.length;
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              )
            )
          ) {
            shows[0].semester.reputationScore -= record.silence.length;
            shows[0].semester.silences += record.silence.length;
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(
                moment(
                  record.scheduledStart ||
                    record.actualStart ||
                    record.createdAt
                )
              )
          ) {
            shows[0].week.reputationScore -= record.silence.length;
            shows[0].week.silences += record.silence.length;
          }
          if (
            moment(
              record.scheduledStart || record.actualStart || record.createdAt
            ).isSameOrAfter(moment(start)) &&
            moment(
              record.scheduledStart || record.actualStart || record.createdAt
            ).isBefore(moment(end))
          ) {
            shows[0].range.reputationScore -= record.silence.length;
            shows[0].range.silences += record.silence.length;
          }
          if (
            record.event.toLowerCase().startsWith("show: ") ||
            record.event.toLowerCase().startsWith("remote: ") ||
            record.event.toLowerCase().startsWith("prerecord: ")
          ) {
            shows[-1].overall.reputationScore -= record.silence.length;
            shows[-1].overall.silences += record.silence.length;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(
                  record.scheduledStart ||
                    record.actualStart ||
                    record.createdAt
                )
              )
            ) {
              shows[-1].semester.reputationScore -= record.silence.length;
              shows[-1].semester.silences += record.silence.length;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(
                  moment(
                    record.scheduledStart ||
                      record.actualStart ||
                      record.createdAt
                  )
                )
            ) {
              shows[-1].week.reputationScore -= record.silence.length;
              shows[-1].week.silences += record.silence.length;
            }
            if (
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              ).isSameOrAfter(moment(start)) &&
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              ).isBefore(moment(end))
            ) {
              shows[-1].range.reputationScore -= record.silence.length;
              shows[-1].range.silences += record.silence.length;
            }
          }
          if (record.event.toLowerCase().startsWith("sports: ")) {
            shows[-2].overall.reputationScore -= record.silence.length;
            shows[-2].overall.silences += record.silence.length;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(
                  record.scheduledStart ||
                    record.actualStart ||
                    record.createdAt
                )
              )
            ) {
              shows[-2].semester.reputationScore -= record.silence.length;
              shows[-2].semester.silences += record.silence.length;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(
                  moment(
                    record.scheduledStart ||
                      record.actualStart ||
                      record.createdAt
                  )
                )
            ) {
              shows[-2].week.reputationScore -= record.silence.length;
              shows[-2].week.silences += record.silence.length;
            }
            if (
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              ).isSameOrAfter(moment(start)) &&
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              ).isBefore(moment(end))
            ) {
              shows[-2].range.reputationScore -= record.silence.length;
              shows[-2].range.silences += record.silence.length;
            }
          }
          if (record.event.toLowerCase().startsWith("genre: ")) {
            shows[-3].overall.reputationScore -= record.silence.length;
            shows[-3].overall.silences += record.silence.length;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(
                  record.scheduledStart ||
                    record.actualStart ||
                    record.createdAt
                )
              )
            ) {
              shows[-3].semester.reputationScore -= record.silence.length;
              shows[-3].semester.silences += record.silence.length;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(
                  moment(
                    record.scheduledStart ||
                      record.actualStart ||
                      record.createdAt
                  )
                )
            ) {
              shows[-3].week.reputationScore -= record.silence.length;
              shows[-3].week.silences += record.silence.length;
            }
            if (
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              ).isSameOrAfter(moment(start)) &&
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              ).isBefore(moment(end))
            ) {
              shows[-3].range.reputationScore -= record.silence.length;
              shows[-3].range.silences += record.silence.length;
            }
          }
          if (record.event.toLowerCase().startsWith("playlist: ")) {
            shows[-4].overall.reputationScore -= record.silence.length;
            shows[-4].overall.silences += record.silence.length;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(
                  record.scheduledStart ||
                    record.actualStart ||
                    record.createdAt
                )
              )
            ) {
              shows[-4].semester.reputationScore -= record.silence.length;
              shows[-4].semester.silences += record.silence.length;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(
                  moment(
                    record.scheduledStart ||
                      record.actualStart ||
                      record.createdAt
                  )
                )
            ) {
              shows[-4].week.reputationScore -= record.silence.length;
              shows[-4].week.silences += record.silence.length;
            }
            if (
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              ).isSameOrAfter(moment(start)) &&
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              ).isBefore(moment(end))
            ) {
              shows[-4].range.reputationScore -= record.silence.length;
              shows[-4].range.silences += record.silence.length;
            }
          }
          initializeShow(record.calendarID);
          if (
            record.calendarID &&
            typeof shows[record.calendarID] !== "undefined"
          ) {
            shows[record.calendarID].overall.reputationScore -=
              record.silence.length;
            shows[record.calendarID].overall.silences += record.silence.length;
            shows[record.calendarID].overall.silencesArray.push([
              record.event,
              record.silence
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(
                  record.scheduledStart ||
                    record.actualStart ||
                    record.createdAt
                )
              )
            ) {
              shows[record.calendarID].semester.reputationScore -=
                record.silence.length;
              shows[record.calendarID].semester.silences +=
                record.silence.length;
              shows[record.calendarID].semester.silencesArray.push([
                record.event,
                record.silence
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(
                  moment(
                    record.scheduledStart ||
                      record.actualStart ||
                      record.createdAt
                  )
                )
            ) {
              shows[record.calendarID].week.reputationScore -=
                record.silence.length;
              shows[record.calendarID].week.silences += record.silence.length;
              shows[record.calendarID].week.silencesArray.push([
                record.event,
                record.silence
              ]);
            }
            if (
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              ).isSameOrAfter(moment(start)) &&
              moment(
                record.scheduledStart || record.actualStart || record.createdAt
              ).isBefore(moment(end))
            ) {
              shows[record.calendarID].range.reputationScore -=
                record.silence.length;
              shows[record.calendarID].range.silences += record.silence.length;
              shows[record.calendarID].range.silencesArray.push([
                record.event,
                record.silence
              ]);
            }
          }
        }

        // Absences
        if (record.absent) {
          ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
            initializeDJ(record[dj]);
            if (
              !record[dj] ||
              typeof DJs[record[dj]] === "undefined" ||
              record.event.toLowerCase().startsWith("genre: ") ||
              record.event.toLowerCase().startsWith("sports: ")
            )
              return;
            DJs[record[dj]].overall.reputationScore -= 3;
            DJs[record[dj]].overall.absences += 1;
            DJs[record[dj]].overall.absencesArray.push([
              record.event,
              record.scheduledStart
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.scheduledStart)
              )
            ) {
              DJs[record[dj]].semester.reputationScore -= 3;
              DJs[record[dj]].semester.absences += 1;
              DJs[record[dj]].semester.absencesArray.push([
                record.event,
                record.scheduledStart
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.scheduledStart))
            ) {
              DJs[record[dj]].week.reputationScore -= 3;
              DJs[record[dj]].week.absences += 1;
              DJs[record[dj]].week.absencesArray.push([
                record.event,
                record.scheduledStart
              ]);
            }
            if (
              moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
              moment(record.scheduledStart).isBefore(moment(end))
            ) {
              DJs[record[dj]].range.reputationScore -= 3;
              DJs[record[dj]].range.absences += 1;
              DJs[record[dj]].range.absencesArray.push([
                record.event,
                record.scheduledStart
              ]);
            }
          });
          shows[0].overall.reputationScore -= 3;
          shows[0].overall.absences += 1;
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.scheduledStart)
            )
          ) {
            shows[0].semester.reputationScore -= 3;
            shows[0].semester.absences += 1;
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.scheduledStart))
          ) {
            shows[0].week.reputationScore -= 3;
            shows[0].week.absences += 1;
          }
          if (
            moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
            moment(record.scheduledStart).isBefore(moment(end))
          ) {
            shows[0].range.reputationScore -= 3;
            shows[0].range.absences += 1;
          }
          if (
            record.event.toLowerCase().startsWith("show: ") ||
            record.event.toLowerCase().startsWith("remote: ") ||
            record.event.toLowerCase().startsWith("prerecord: ")
          ) {
            shows[-1].overall.reputationScore -= 3;
            shows[-1].overall.absences += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.scheduledStart)
              )
            ) {
              shows[-1].semester.reputationScore -= 3;
              shows[-1].semester.absences += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.scheduledStart))
            ) {
              shows[-1].week.reputationScore -= 3;
              shows[-1].week.absences += 1;
            }
            if (
              moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
              moment(record.scheduledStart).isBefore(moment(end))
            ) {
              shows[-1].range.reputationScore -= 3;
              shows[-1].range.absences += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("sports: ")) {
            shows[-2].overall.reputationScore -= 3;
            shows[-2].overall.absences += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.scheduledStart)
              )
            ) {
              shows[-2].semester.reputationScore -= 3;
              shows[-2].semester.absences += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.scheduledStart))
            ) {
              shows[-2].week.reputationScore -= 3;
              shows[-2].week.absences += 1;
            }
            if (
              moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
              moment(record.scheduledStart).isBefore(moment(end))
            ) {
              shows[-2].range.reputationScore -= 3;
              shows[-2].range.absences += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("genre: ")) {
            shows[-3].overall.reputationScore -= 3;
            shows[-3].overall.absences += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.scheduledStart)
              )
            ) {
              shows[-3].semester.reputationScore -= 3;
              shows[-3].semester.absences += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.scheduledStart))
            ) {
              shows[-3].week.reputationScore -= 3;
              shows[-3].week.absences += 1;
            }
            if (
              moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
              moment(record.scheduledStart).isBefore(moment(end))
            ) {
              shows[-3].range.reputationScore -= 3;
              shows[-3].range.absences += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("playlist: ")) {
            shows[-4].overall.reputationScore -= 3;
            shows[-4].overall.absences += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.scheduledStart)
              )
            ) {
              shows[-4].semester.reputationScore -= 3;
              shows[-4].semester.absences += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.scheduledStart))
            ) {
              shows[-4].week.reputationScore -= 3;
              shows[-4].week.absences += 1;
            }
            if (
              moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
              moment(record.scheduledStart).isBefore(moment(end))
            ) {
              shows[-4].range.reputationScore -= 3;
              shows[-4].range.absences += 1;
            }
          }
          initializeShow(record.calendarID);
          if (
            record.calendarID &&
            typeof shows[record.calendarID] !== "undefined"
          ) {
            shows[record.calendarID].overall.reputationScore -= 3;
            shows[record.calendarID].overall.absences += 1;
            shows[record.calendarID].overall.absencesArray.push([
              record.event,
              record.scheduledStart
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.scheduledStart)
              )
            ) {
              shows[record.calendarID].semester.reputationScore -= 3;
              shows[record.calendarID].semester.absences += 1;
              shows[record.calendarID].semester.absencesArray.push([
                record.event,
                record.scheduledStart
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.scheduledStart))
            ) {
              shows[record.calendarID].week.reputationScore -= 3;
              shows[record.calendarID].week.absences += 1;
              shows[record.calendarID].week.absencesArray.push([
                record.event,
                record.scheduledStart
              ]);
            }
            if (
              moment(record.scheduledStart).isSameOrAfter(moment(start)) &&
              moment(record.scheduledStart).isBefore(moment(end))
            ) {
              shows[record.calendarID].range.reputationScore -= 3;
              shows[record.calendarID].range.absences += 1;
              shows[record.calendarID].range.absencesArray.push([
                record.event,
                record.scheduledStart
              ]);
            }
          }
        }

        // Unauthorized broadcasts
        if (record.unauthorized) {
          ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
            initializeDJ(record[dj]);
            if (
              !record[dj] ||
              typeof DJs[record[dj]] === "undefined" ||
              record.event.toLowerCase().startsWith("genre: ") ||
              record.event.toLowerCase().startsWith("sports: ")
            )
              return;
            DJs[record[dj]].overall.reputationScore -= 2;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart || record.createdAt)
              )
            ) {
              DJs[record[dj]].semester.reputationScore -= 2;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart || record.createdAt))
            ) {
              DJs[record[dj]].week.reputationScore -= 2;
            }
            if (
              moment(record.actualStart || record.createdAt).isSameOrAfter(
                moment(start)
              ) &&
              moment(record.actualStart || record.createdAt).isBefore(
                moment(end)
              )
            ) {
              DJs[record[dj]].range.reputationScore -= 2;
            }
          });
          shows[0].overall.reputationScore -= 2;
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.actualStart || record.createdAt)
            )
          ) {
            shows[0].semester.reputationScore -= 2;
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.actualStart || record.createdAt))
          ) {
            shows[0].week.reputationScore -= 2;
          }
          if (
            moment(record.actualStart || record.createdAt).isSameOrAfter(
              moment(start)
            ) &&
            moment(record.actualStart || record.createdAt).isBefore(moment(end))
          ) {
            shows[0].range.reputationScore -= 2;
          }
          if (
            record.event.toLowerCase().startsWith("show: ") ||
            record.event.toLowerCase().startsWith("remote: ") ||
            record.event.toLowerCase().startsWith("prerecord: ")
          ) {
            shows[-1].overall.reputationScore -= 2;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart || record.createdAt)
              )
            ) {
              shows[-1].semester.reputationScore -= 2;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart || record.createdAt))
            ) {
              shows[-1].week.reputationScore -= 2;
            }
            if (
              moment(record.actualStart || record.createdAt).isSameOrAfter(
                moment(start)
              ) &&
              moment(record.actualStart || record.createdAt).isBefore(
                moment(end)
              )
            ) {
              shows[-1].range.reputationScore -= 2;
            }
          }
          if (record.event.toLowerCase().startsWith("sports: ")) {
            shows[-2].overall.reputationScore -= 2;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart || record.createdAt)
              )
            ) {
              shows[-2].semester.reputationScore -= 2;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart || record.createdAt))
            ) {
              shows[-2].week.reputationScore -= 2;
            }
            if (
              moment(record.actualStart || record.createdAt).isSameOrAfter(
                moment(start)
              ) &&
              moment(record.actualStart || record.createdAt).isBefore(
                moment(end)
              )
            ) {
              shows[-2].range.reputationScore -= 2;
            }
          }
          if (record.event.toLowerCase().startsWith("genre: ")) {
            shows[-3].overall.reputationScore -= 2;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart || record.createdAt)
              )
            ) {
              shows[-3].semester.reputationScore -= 2;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart || record.createdAt))
            ) {
              shows[-3].week.reputationScore -= 2;
            }
            if (
              moment(record.actualStart || record.createdAt).isSameOrAfter(
                moment(start)
              ) &&
              moment(record.actualStart || record.createdAt).isBefore(
                moment(end)
              )
            ) {
              shows[-3].range.reputationScore -= 2;
            }
          }
          if (record.event.toLowerCase().startsWith("playlist: ")) {
            shows[-4].overall.reputationScore -= 2;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart || record.createdAt)
              )
            ) {
              shows[-4].semester.reputationScore -= 2;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart || record.createdAt))
            ) {
              shows[-4].week.reputationScore -= 2;
            }
            if (
              moment(record.actualStart || record.createdAt).isSameOrAfter(
                moment(start)
              ) &&
              moment(record.actualStart || record.createdAt).isBefore(
                moment(end)
              )
            ) {
              shows[-4].range.reputationScore -= 2;
            }
          }
          initializeShow(record.calendarID);
          if (
            record.calendarID &&
            typeof shows[record.calendarID] !== "undefined"
          ) {
            shows[record.calendarID].overall.reputationScore -= 2;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart || record.createdAt)
              )
            ) {
              shows[record.calendarID].semester.reputationScore -= 2;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart || record.createdAt))
            ) {
              shows[record.calendarID].week.reputationScore -= 2;
            }
            if (
              moment(record.actualStart || record.createdAt).isSameOrAfter(
                moment(start)
              ) &&
              moment(record.actualStart || record.createdAt).isBefore(
                moment(end)
              )
            ) {
              shows[record.calendarID].range.reputationScore -= 2;
            }
          }
        }

        // Missed top-of-hour ID breaks
        if (record.missedIDs && record.missedIDs.length > 0) {
          ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
            initializeDJ(record[dj]);
            if (
              !record[dj] ||
              typeof DJs[record[dj]] === "undefined" ||
              record.event.toLowerCase().startsWith("genre: ") ||
              record.event.toLowerCase().startsWith("sports: ")
            )
              return;
            DJs[record[dj]].overall.reputationScore -=
              3 * record.missedIDs.length;
            DJs[record[dj]].overall.missedIDs += record.missedIDs.length;
            DJs[record[dj]].overall.missedIDsArray.push([
              record.event,
              record.missedIDs
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.createdAt)
              )
            ) {
              DJs[record[dj]].semester.reputationScore -=
                3 * record.missedIDs.length;
              DJs[record[dj]].semester.missedIDs += record.missedIDs.length;
              DJs[record[dj]].semester.missedIDsArray.push([
                record.event,
                record.missedIDs
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.createdAt))
            ) {
              DJs[record[dj]].week.reputationScore -=
                3 * record.missedIDs.length;
              DJs[record[dj]].week.missedIDs += record.missedIDs.length;
              DJs[record[dj]].week.missedIDsArray.push([
                record.event,
                record.missedIDs
              ]);
            }
            if (
              moment(record.createdAt).isSameOrAfter(moment(start)) &&
              moment(record.createdAt).isBefore(moment(end))
            ) {
              DJs[record[dj]].range.reputationScore -=
                3 * record.missedIDs.length;
              DJs[record[dj]].range.missedIDs += record.missedIDs.length;
              DJs[record[dj]].range.missedIDsArray.push([
                record.event,
                record.missedIDs
              ]);
            }
          });
          shows[0].overall.reputationScore -= 3 * record.missedIDs.length;
          shows[0].overall.missedIDs += record.missedIDs.length;
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.createdAt)
            )
          ) {
            shows[0].semester.reputationScore -= 3 * record.missedIDs.length;
            shows[0].semester.missedIDs += record.missedIDs.length;
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.createdAt))
          ) {
            shows[0].week.reputationScore -= 3 * record.missedIDs.length;
            shows[0].week.missedIDs += record.missedIDs.length;
          }
          if (
            moment(record.createdAt).isSameOrAfter(moment(start)) &&
            moment(record.createdAt).isBefore(moment(end))
          ) {
            shows[0].range.reputationScore -= 3 * record.missedIDs.length;
            shows[0].range.missedIDs += record.missedIDs.length;
          }
          if (
            record.event.toLowerCase().startsWith("show: ") ||
            record.event.toLowerCase().startsWith("remote: ") ||
            record.event.toLowerCase().startsWith("prerecord: ")
          ) {
            shows[-1].overall.reputationScore -= 3 * record.missedIDs.length;
            shows[-1].overall.missedIDs += record.missedIDs.length;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.createdAt)
              )
            ) {
              shows[-1].semester.reputationScore -= 3 * record.missedIDs.length;
              shows[-1].semester.missedIDs += record.missedIDs.length;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.createdAt))
            ) {
              shows[-1].week.reputationScore -= 3 * record.missedIDs.length;
              shows[-1].week.missedIDs += record.missedIDs.length;
            }
            if (
              moment(record.createdAt).isSameOrAfter(moment(start)) &&
              moment(record.createdAt).isBefore(moment(end))
            ) {
              shows[-1].range.reputationScore -= 3 * record.missedIDs.length;
              shows[-1].range.missedIDs += record.missedIDs.length;
            }
          }
          if (record.event.toLowerCase().startsWith("sports: ")) {
            shows[-2].overall.reputationScore -= 3 * record.missedIDs.length;
            shows[-2].overall.missedIDs += record.missedIDs.length;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.createdAt)
              )
            ) {
              shows[-2].semester.reputationScore -= 3 * record.missedIDs.length;
              shows[-2].semester.missedIDs += record.missedIDs.length;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.createdAt))
            ) {
              shows[-2].week.reputationScore -= 3 * record.missedIDs.length;
              shows[-2].week.missedIDs += record.missedIDs.length;
            }
            if (
              moment(record.createdAt).isSameOrAfter(moment(start)) &&
              moment(record.createdAt).isBefore(moment(end))
            ) {
              shows[-2].range.reputationScore -= 3 * record.missedIDs.length;
              shows[-2].range.missedIDs += record.missedIDs.length;
            }
          }
          if (record.event.toLowerCase().startsWith("genre: ")) {
            shows[-3].overall.reputationScore -= 3 * record.missedIDs.length;
            shows[-3].overall.missedIDs += record.missedIDs.length;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.createdAt)
              )
            ) {
              shows[-3].semester.reputationScore -= 3 * record.missedIDs.length;
              shows[-3].semester.missedIDs += record.missedIDs.length;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.createdAt))
            ) {
              shows[-3].week.reputationScore -= 3 * record.missedIDs.length;
              shows[-3].week.missedIDs += record.missedIDs.length;
            }
            if (
              moment(record.createdAt).isSameOrAfter(moment(start)) &&
              moment(record.createdAt).isBefore(moment(end))
            ) {
              shows[-3].range.reputationScore -= 3 * record.missedIDs.length;
              shows[-3].range.missedIDs += record.missedIDs.length;
            }
          }
          if (record.event.toLowerCase().startsWith("playlist: ")) {
            shows[-4].overall.reputationScore -= 3 * record.missedIDs.length;
            shows[-4].overall.missedIDs += record.missedIDs.length;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.createdAt)
              )
            ) {
              shows[-4].semester.reputationScore -= 3 * record.missedIDs.length;
              shows[-4].semester.missedIDs += record.missedIDs.length;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.createdAt))
            ) {
              shows[-4].week.reputationScore -= 3 * record.missedIDs.length;
              shows[-4].week.missedIDs += record.missedIDs.length;
            }
            if (
              moment(record.createdAt).isSameOrAfter(moment(start)) &&
              moment(record.createdAt).isBefore(moment(end))
            ) {
              shows[-4].range.reputationScore -= 3 * record.missedIDs.length;
              shows[-4].range.missedIDs += record.missedIDs.length;
            }
          }
          initializeShow(record.calendarID);
          if (
            record.calendarID &&
            typeof shows[record.calendarID] !== "undefined"
          ) {
            shows[record.calendarID].overall.reputationScore -=
              3 * record.missedIDs.length;
            shows[record.calendarID].overall.missedIDs +=
              record.missedIDs.length;
            shows[record.calendarID].overall.missedIDsArray.push([
              record.event,
              record.missedIDs
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.createdAt)
              )
            ) {
              shows[record.calendarID].semester.reputationScore -=
                3 * record.missedIDs.length;
              shows[record.calendarID].semester.missedIDs +=
                record.missedIDs.length;
              shows[record.calendarID].semester.missedIDsArray.push([
                record.event,
                record.missedIDs
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.createdAt))
            ) {
              shows[record.calendarID].week.reputationScore -=
                3 * record.missedIDs.length;
              shows[record.calendarID].week.missedIDs +=
                record.missedIDs.length;
              shows[record.calendarID].week.missedIDsArray.push([
                record.event,
                record.missedIDs
              ]);
            }
            if (
              moment(record.createdAt).isSameOrAfter(moment(start)) &&
              moment(record.createdAt).isBefore(moment(end))
            ) {
              shows[record.calendarID].range.reputationScore -=
                3 * record.missedIDs.length;
              shows[record.calendarID].range.missedIDs +=
                record.missedIDs.length;
              shows[record.calendarID].range.missedIDsArray.push([
                record.event,
                record.missedIDs
              ]);
            }
          }
        }

        // Early sign-ons
        if (record.signedOnEarly) {
          ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
            initializeDJ(record[dj]);
            if (
              !record[dj] ||
              typeof DJs[record[dj]] === "undefined" ||
              record.event.toLowerCase().startsWith("genre: ") ||
              record.event.toLowerCase().startsWith("sports: ")
            )
              return;
            DJs[record[dj]].overall.reputationScore -= 2;
            DJs[record[dj]].overall.earlyStart += 1;
            DJs[record[dj]].overall.earlyStartArray.push([
              record.event,
              record.actualStart
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              DJs[record[dj]].semester.reputationScore -= 2;
              DJs[record[dj]].semester.earlyStart += 1;
              DJs[record[dj]].semester.earlyStartArray.push([
                record.event,
                record.actualStart
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              DJs[record[dj]].week.reputationScore -= 2;
              DJs[record[dj]].week.earlyStart += 1;
              DJs[record[dj]].week.earlyStartArray.push([
                record.event,
                record.actualStart
              ]);
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              DJs[record[dj]].range.reputationScore -= 2;
              DJs[record[dj]].range.earlyStart += 1;
              DJs[record[dj]].range.earlyStartArray.push([
                record.event,
                record.actualStart
              ]);
            }
          });
          shows[0].overall.reputationScore -= 2;
          shows[0].overall.earlyStart += 1;
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.actualStart)
            )
          ) {
            shows[0].semester.reputationScore -= 2;
            shows[0].semester.earlyStart += 1;
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.actualStart))
          ) {
            shows[0].week.reputationScore -= 2;
            shows[0].week.earlyStart += 1;
          }
          if (
            moment(record.actualStart).isSameOrAfter(moment(start)) &&
            moment(record.actualStart).isBefore(moment(end))
          ) {
            shows[0].range.reputationScore -= 2;
            shows[0].range.earlyStart += 1;
          }
          if (
            record.event.toLowerCase().startsWith("show: ") ||
            record.event.toLowerCase().startsWith("remote: ") ||
            record.event.toLowerCase().startsWith("prerecord: ")
          ) {
            shows[-1].overall.reputationScore -= 2;
            shows[-1].overall.earlyStart += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-1].semester.reputationScore -= 2;
              shows[-1].semester.earlyStart += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-1].week.reputationScore -= 2;
              shows[-1].week.earlyStart += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-1].range.reputationScore -= 2;
              shows[-1].range.earlyStart += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("sports: ")) {
            shows[-2].overall.reputationScore -= 2;
            shows[-2].overall.earlyStart += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-2].semester.reputationScore -= 2;
              shows[-2].semester.earlyStart += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-2].week.reputationScore -= 2;
              shows[-2].week.earlyStart += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-2].range.reputationScore -= 2;
              shows[-2].range.earlyStart += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("genre: ")) {
            shows[-3].overall.reputationScore -= 2;
            shows[-3].overall.earlyStart += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-3].semester.reputationScore -= 2;
              shows[-3].semester.earlyStart += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-3].week.reputationScore -= 2;
              shows[-3].week.earlyStart += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-3].range.reputationScore -= 2;
              shows[-3].range.earlyStart += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("playlist: ")) {
            shows[-4].overall.reputationScore -= 2;
            shows[-4].overall.earlyStart += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-4].semester.reputationScore -= 2;
              shows[-4].semester.earlyStart += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-4].week.reputationScore -= 2;
              shows[-4].week.earlyStart += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-4].range.reputationScore -= 2;
              shows[-4].range.earlyStart += 1;
            }
          }
          initializeShow(record.calendarID);
          if (
            record.calendarID &&
            typeof shows[record.calendarID] !== "undefined"
          ) {
            shows[record.calendarID].overall.reputationScore -= 2;
            shows[record.calendarID].overall.earlyStart += 1;
            shows[record.calendarID].overall.earlyStartArray.push([
              record.event,
              record.actualStart
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[record.calendarID].semester.reputationScore -= 2;
              shows[record.calendarID].semester.earlyStart += 1;
              shows[record.calendarID].semester.earlyStartArray.push([
                record.event,
                record.actualStart
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[record.calendarID].week.reputationScore -= 2;
              shows[record.calendarID].week.earlyStart += 1;
              shows[record.calendarID].week.earlyStartArray.push([
                record.event,
                record.actualStart
              ]);
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[record.calendarID].range.reputationScore -= 2;
              shows[record.calendarID].range.earlyStart += 1;
              shows[record.calendarID].range.earlyStartArray.push([
                record.event,
                record.actualStart
              ]);
            }
          }
        }

        // Late sign-offs
        if (record.signedOffLate) {
          ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
            initializeDJ(record[dj]);
            if (
              !record[dj] ||
              typeof DJs[record[dj]] === "undefined" ||
              record.event.toLowerCase().startsWith("genre: ") ||
              record.event.toLowerCase().startsWith("sports: ")
            )
              return;
            DJs[record[dj]].overall.reputationScore -= 2;
            DJs[record[dj]].overall.lateEnd += 1;
            DJs[record[dj]].overall.lateEndArray.push([
              record.event,
              record.actualEnd
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              DJs[record[dj]].semester.reputationScore -= 2;
              DJs[record[dj]].semester.lateEnd += 1;
              DJs[record[dj]].semester.lateEndArray.push([
                record.event,
                record.actualEnd
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              DJs[record[dj]].week.reputationScore -= 2;
              DJs[record[dj]].week.lateEnd += 1;
              DJs[record[dj]].week.lateEndArray.push([
                record.event,
                record.actualEnd
              ]);
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              DJs[record[dj]].range.reputationScore -= 2;
              DJs[record[dj]].range.lateEnd += 1;
              DJs[record[dj]].range.lateEndArray.push([
                record.event,
                record.actualEnd
              ]);
            }
          });
          shows[0].overall.reputationScore -= 2;
          shows[0].overall.lateEnd += 1;
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.actualStart)
            )
          ) {
            shows[0].semester.reputationScore -= 2;
            shows[0].semester.lateEnd += 1;
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.actualStart))
          ) {
            shows[0].week.reputationScore -= 2;
            shows[0].week.lateEnd += 1;
          }
          if (
            moment(record.actualStart).isSameOrAfter(moment(start)) &&
            moment(record.actualStart).isBefore(moment(end))
          ) {
            shows[0].range.reputationScore -= 2;
            shows[0].range.lateEnd += 1;
          }
          if (
            record.event.toLowerCase().startsWith("show: ") ||
            record.event.toLowerCase().startsWith("remote: ") ||
            record.event.toLowerCase().startsWith("prerecord: ")
          ) {
            shows[-1].overall.reputationScore -= 2;
            shows[-1].overall.lateEnd += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-1].semester.reputationScore -= 2;
              shows[-1].semester.lateEnd += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-1].week.reputationScore -= 2;
              shows[-1].week.lateEnd += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-1].range.reputationScore -= 2;
              shows[-1].range.lateEnd += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("sports: ")) {
            shows[-2].overall.reputationScore -= 2;
            shows[-2].overall.lateEnd += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-2].semester.reputationScore -= 2;
              shows[-2].semester.lateEnd += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-2].week.reputationScore -= 2;
              shows[-2].week.lateEnd += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-2].range.reputationScore -= 2;
              shows[-2].range.lateEnd += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("genre: ")) {
            shows[-3].overall.reputationScore -= 2;
            shows[-3].overall.lateEnd += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-3].semester.reputationScore -= 2;
              shows[-3].semester.lateEnd += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-3].week.reputationScore -= 2;
              shows[-3].week.lateEnd += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-3].range.reputationScore -= 2;
              shows[-3].range.lateEnd += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("playlist: ")) {
            shows[-4].overall.reputationScore -= 2;
            shows[-4].overall.lateEnd += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-4].semester.reputationScore -= 2;
              shows[-4].semester.lateEnd += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-4].week.reputationScore -= 2;
              shows[-4].week.lateEnd += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-4].range.reputationScore -= 2;
              shows[-4].range.lateEnd += 1;
            }
          }
          initializeShow(record.calendarID);
          if (
            record.calendarID &&
            typeof shows[record.calendarID] !== "undefined"
          ) {
            shows[record.calendarID].overall.reputationScore -= 2;
            shows[record.calendarID].overall.lateEnd += 1;
            shows[record.calendarID].overall.lateEndArray.push([
              record.event,
              record.actualEnd
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[record.calendarID].semester.reputationScore -= 2;
              shows[record.calendarID].semester.lateEnd += 1;
              shows[record.calendarID].semester.lateEndArray.push([
                record.event,
                record.actualEnd
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[record.calendarID].week.reputationScore -= 2;
              shows[record.calendarID].week.lateEnd += 1;
              shows[record.calendarID].week.lateEndArray.push([
                record.event,
                record.actualEnd
              ]);
            }
            if (
              moment(record.createdAt).isSameOrAfter(moment(start)) &&
              moment(record.createdAt).isBefore(moment(end))
            ) {
              shows[record.calendarID].range.reputationScore -= 2;
              shows[record.calendarID].range.lateEnd += 1;
              shows[record.calendarID].range.lateEndArray.push([
                record.event,
                record.actualEnd
              ]);
            }
          }
        }

        // Late sign-ons
        if (record.signedOnLate) {
          ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
            initializeDJ(record[dj]);
            if (
              !record[dj] ||
              typeof DJs[record[dj]] === "undefined" ||
              record.event.toLowerCase().startsWith("genre: ") ||
              record.event.toLowerCase().startsWith("sports: ")
            )
              return;
            DJs[record[dj]].overall.reputationScore -= 1;
            DJs[record[dj]].overall.lateStart += 1;
            DJs[record[dj]].overall.lateStartArray.push([
              record.event,
              record.actualStart
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              DJs[record[dj]].semester.reputationScore -= 1;
              DJs[record[dj]].semester.lateStart += 1;
              DJs[record[dj]].semester.lateStartArray.push([
                record.event,
                record.actualStart
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              DJs[record[dj]].week.reputationScore -= 1;
              DJs[record[dj]].week.lateStart += 1;
              DJs[record[dj]].week.lateStartArray.push([
                record.event,
                record.actualStart
              ]);
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              DJs[record[dj]].range.reputationScore -= 1;
              DJs[record[dj]].range.lateStart += 1;
              DJs[record[dj]].range.lateStartArray.push([
                record.event,
                record.actualStart
              ]);
            }
          });
          shows[0].overall.reputationScore -= 1;
          shows[0].overall.lateStart += 1;
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.actualStart)
            )
          ) {
            shows[0].semester.reputationScore -= 1;
            shows[0].semester.lateStart += 1;
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.actualStart))
          ) {
            shows[0].week.reputationScore -= 1;
            shows[0].week.lateStart += 1;
          }
          if (
            moment(record.actualStart).isSameOrAfter(moment(start)) &&
            moment(record.actualStart).isBefore(moment(end))
          ) {
            shows[0].range.reputationScore -= 1;
            shows[0].range.lateStart += 1;
          }
          if (
            record.event.toLowerCase().startsWith("show: ") ||
            record.event.toLowerCase().startsWith("remote: ") ||
            record.event.toLowerCase().startsWith("prerecord: ")
          ) {
            shows[-1].overall.reputationScore -= 1;
            shows[-1].overall.lateStart += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-1].semester.reputationScore -= 1;
              shows[-1].semester.lateStart += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-1].week.reputationScore -= 1;
              shows[-1].week.lateStart += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-1].range.reputationScore -= 1;
              shows[-1].range.lateStart += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("sports: ")) {
            shows[-2].overall.reputationScore -= 1;
            shows[-2].overall.lateStart += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-2].semester.reputationScore -= 1;
              shows[-2].semester.lateStart += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-2].week.reputationScore -= 1;
              shows[-2].week.lateStart += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-2].range.reputationScore -= 1;
              shows[-2].range.lateStart += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("genre: ")) {
            shows[-3].overall.reputationScore -= 1;
            shows[-3].overall.lateStart += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-3].semester.reputationScore -= 1;
              shows[-3].semester.lateStart += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-3].week.reputationScore -= 1;
              shows[-3].week.lateStart += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-3].range.reputationScore -= 1;
              shows[-3].range.lateStart += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("playlist: ")) {
            shows[-4].overall.reputationScore -= 1;
            shows[-4].overall.lateStart += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-4].semester.reputationScore -= 1;
              shows[-4].semester.lateStart += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-4].week.reputationScore -= 1;
              shows[-4].week.lateStart += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-4].range.reputationScore -= 1;
              shows[-4].range.lateStart += 1;
            }
          }
          initializeShow(record.calendarID);
          if (
            record.calendarID &&
            typeof shows[record.calendarID] !== "undefined"
          ) {
            shows[record.calendarID].overall.reputationScore -= 1;
            shows[record.calendarID].overall.lateStart += 1;
            shows[record.calendarID].overall.lateStartArray.push([
              record.event,
              record.actualStart
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[record.calendarID].semester.reputationScore -= 1;
              shows[record.calendarID].semester.lateStart += 1;
              shows[record.calendarID].semester.lateStartArray.push([
                record.event,
                record.actualStart
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[record.calendarID].week.reputationScore -= 1;
              shows[record.calendarID].week.lateStart += 1;
              shows[record.calendarID].week.lateStartArray.push([
                record.event,
                record.actualStart
              ]);
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[record.calendarID].range.reputationScore -= 1;
              shows[record.calendarID].range.lateStart += 1;
              shows[record.calendarID].range.lateStartArray.push([
                record.event,
                record.actualStart
              ]);
            }
          }
        }

        // Early sign-offs
        if (record.signedOffEarly) {
          ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map(dj => {
            initializeDJ(record[dj]);
            if (
              !record[dj] ||
              typeof DJs[record[dj]] === "undefined" ||
              record.event.toLowerCase().startsWith("genre: ") ||
              record.event.toLowerCase().startsWith("sports: ")
            )
              return;
            DJs[record[dj]].overall.reputationScore -= 1;
            DJs[record[dj]].overall.earlyEnd += 1;
            DJs[record[dj]].overall.earlyEndArray.push([
              record.event,
              record.actualEnd
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              DJs[record[dj]].semester.reputationScore -= 1;
              DJs[record[dj]].semester.earlyEnd += 1;
              DJs[record[dj]].semester.earlyEndArray.push([
                record.event,
                record.actualEnd
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              DJs[record[dj]].week.reputationScore -= 1;
              DJs[record[dj]].week.earlyEnd += 1;
              DJs[record[dj]].week.earlyEndArray.push([
                record.event,
                record.actualEnd
              ]);
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              DJs[record[dj]].range.reputationScore -= 1;
              DJs[record[dj]].range.earlyEnd += 1;
              DJs[record[dj]].range.earlyEndArray.push([
                record.event,
                record.actualEnd
              ]);
            }
          });
          shows[0].overall.reputationScore -= 1;
          shows[0].overall.earlyEnd += 1;
          if (
            moment(sails.config.custom.startOfSemester).isBefore(
              moment(record.actualStart)
            )
          ) {
            shows[0].semester.reputationScore -= 1;
            shows[0].semester.earlyEnd += 1;
          }
          if (
            moment()
              .subtract(7, "days")
              .isBefore(moment(record.actualStart))
          ) {
            shows[0].week.reputationScore -= 1;
            shows[0].week.earlyEnd += 1;
          }
          if (
            moment(record.actualStart).isSameOrAfter(moment(start)) &&
            moment(record.actualStart).isBefore(moment(end))
          ) {
            shows[0].range.reputationScore -= 1;
            shows[0].range.earlyEnd += 1;
          }
          if (
            record.event.toLowerCase().startsWith("show: ") ||
            record.event.toLowerCase().startsWith("remote: ") ||
            record.event.toLowerCase().startsWith("prerecord: ")
          ) {
            shows[-1].overall.reputationScore -= 1;
            shows[-1].overall.earlyEnd += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-1].semester.reputationScore -= 1;
              shows[-1].semester.earlyEnd += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-1].week.reputationScore -= 1;
              shows[-1].week.earlyEnd += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-1].range.reputationScore -= 1;
              shows[-1].range.earlyEnd += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("sports: ")) {
            shows[-2].overall.reputationScore -= 1;
            shows[-2].overall.earlyEnd += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-2].semester.reputationScore -= 1;
              shows[-2].semester.earlyEnd += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-2].week.reputationScore -= 1;
              shows[-2].week.earlyEnd += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-2].range.reputationScore -= 1;
              shows[-2].range.earlyEnd += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("genre: ")) {
            shows[-3].overall.reputationScore -= 1;
            shows[-3].overall.earlyEnd += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-3].semester.reputationScore -= 1;
              shows[-3].semester.earlyEnd += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-3].week.reputationScore -= 1;
              shows[-3].week.earlyEnd += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-3].range.reputationScore -= 1;
              shows[-3].range.earlyEnd += 1;
            }
          }
          if (record.event.toLowerCase().startsWith("playlist: ")) {
            shows[-4].overall.reputationScore -= 1;
            shows[-4].overall.earlyEnd += 1;
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[-4].semester.reputationScore -= 1;
              shows[-4].semester.earlyEnd += 1;
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[-4].week.reputationScore -= 1;
              shows[-4].week.earlyEnd += 1;
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[-4].range.reputationScore -= 1;
              shows[-4].range.earlyEnd += 1;
            }
          }
          initializeShow(record.calendarID);
          if (
            record.calendarID &&
            typeof shows[record.calendarID] !== "undefined"
          ) {
            shows[record.calendarID].overall.reputationScore -= 1;
            shows[record.calendarID].overall.earlyEnd += 1;
            shows[record.calendarID].overall.earlyEndArray.push([
              record.event,
              record.actualEnd
            ]);
            if (
              moment(sails.config.custom.startOfSemester).isBefore(
                moment(record.actualStart)
              )
            ) {
              shows[record.calendarID].semester.reputationScore -= 1;
              shows[record.calendarID].semester.earlyEnd += 1;
              shows[record.calendarID].semester.earlyEndArray.push([
                record.event,
                record.actualEnd
              ]);
            }
            if (
              moment()
                .subtract(7, "days")
                .isBefore(moment(record.actualStart))
            ) {
              shows[record.calendarID].week.reputationScore -= 1;
              shows[record.calendarID].week.earlyEnd += 1;
              shows[record.calendarID].week.earlyEndArray.push([
                record.event,
                record.actualEnd
              ]);
            }
            if (
              moment(record.actualStart).isSameOrAfter(moment(start)) &&
              moment(record.actualStart).isBefore(moment(end))
            ) {
              shows[record.calendarID].range.reputationScore -= 1;
              shows[record.calendarID].range.earlyEnd += 1;
              shows[record.calendarID].range.earlyEndArray.push([
                record.event,
                record.actualEnd
              ]);
            }
          }
        }

        tasksLeft--;
        if (tasksLeft <= 0) resolve();
      };

      records.map(async record => {
        WWSUqueue.add(() => process4_2(_.cloneDeep(record)));
      });
    });

    // Execute our parallel functions and wait for all of them to resolve.
    await Promise.all([process1, process2, process3, process4]);

    // Do additional final calculations for DJs
    for (var index in DJs) {
      if (Object.prototype.hasOwnProperty.call(DJs, index)) {
        // Calculate the ratio of listeners to showtime
        DJs[index].overall.ratio =
          DJs[index].overall.showtime > 0
            ? DJs[index].overall.listeners / DJs[index].overall.showtime
            : 0;
        DJs[index].semester.ratio =
          DJs[index].semester.showtime > 0
            ? DJs[index].semester.listeners / DJs[index].semester.showtime
            : 0;
        DJs[index].week.ratio =
          DJs[index].week.showtime > 0
            ? DJs[index].week.listeners / DJs[index].week.showtime
            : 0;
        DJs[index].range.ratio =
          DJs[index].range.showtime > 0
            ? DJs[index].range.listeners / DJs[index].range.showtime
            : 0;

        // Calculate the reputation percent
        DJs[index].overall.reputationScore +=
          DJs[index].overall.reputationScoreMax;
        DJs[index].overall.reputationPercent =
          DJs[index].overall.reputationScore > 0
            ? Math.round(
                100 *
                  (DJs[index].overall.reputationScore /
                    DJs[index].overall.reputationScoreMax)
              )
            : 0;
        DJs[index].semester.reputationScore +=
          DJs[index].semester.reputationScoreMax;
        DJs[index].semester.reputationPercent =
          DJs[index].semester.reputationScore > 0
            ? Math.round(
                100 *
                  (DJs[index].semester.reputationScore /
                    DJs[index].semester.reputationScoreMax)
              )
            : 0;
        DJs[index].week.reputationScore += DJs[index].week.reputationScoreMax;
        DJs[index].week.reputationPercent =
          DJs[index].week.reputationScore > 0
            ? Math.round(
                100 *
                  (DJs[index].week.reputationScore /
                    DJs[index].week.reputationScoreMax)
              )
            : 0;
        DJs[index].range.reputationScore += DJs[index].range.reputationScoreMax;
        DJs[index].range.reputationPercent =
          DJs[index].range.reputationScore > 0
            ? Math.round(
                100 *
                  (DJs[index].range.reputationScore /
                    DJs[index].range.reputationScoreMax)
              )
            : 0;

        // Get DJ name
        if (index > 0) {
          let name = await sails.models.djs.findOne({ ID: index });
          if (name) {
            DJs[index].name = `${name.name} (${name.realName ||
              `Unknown Person`})`;
          } else {
            DJs[index].name = `Unknown DJ`;
          }
        }
      }
    }

    for (var index in shows) {
      if (Object.prototype.hasOwnProperty.call(shows, index)) {
        // Calculate the ratio of listeners to showtime
        shows[index].overall.ratio =
          shows[index].overall.showtime > 0
            ? shows[index].overall.listeners / shows[index].overall.showtime
            : 0;
        shows[index].semester.ratio =
          shows[index].semester.showtime > 0
            ? shows[index].semester.listeners / shows[index].semester.showtime
            : 0;
        shows[index].week.ratio =
          shows[index].week.showtime > 0
            ? shows[index].week.listeners / shows[index].week.showtime
            : 0;
        shows[index].range.ratio =
          shows[index].range.showtime > 0
            ? shows[index].range.listeners / shows[index].range.showtime
            : 0;

        // Calculate the reputation percent
        shows[index].overall.reputationScore +=
          shows[index].overall.reputationScoreMax;
        shows[index].overall.reputationPercent =
          shows[index].overall.reputationScore > 0
            ? Math.round(
                100 *
                  (shows[index].overall.reputationScore /
                    shows[index].overall.reputationScoreMax)
              )
            : 0;
        shows[index].semester.reputationScore +=
          shows[index].semester.reputationScoreMax;
        shows[index].semester.reputationPercent =
          shows[index].semester.reputationScore > 0
            ? Math.round(
                100 *
                  (shows[index].semester.reputationScore /
                    shows[index].semester.reputationScoreMax)
              )
            : 0;
        shows[index].week.reputationScore +=
          shows[index].week.reputationScoreMax;
        shows[index].week.reputationPercent =
          shows[index].week.reputationScore > 0
            ? Math.round(
                100 *
                  (shows[index].week.reputationScore /
                    shows[index].week.reputationScoreMax)
              )
            : 0;
        shows[index].range.reputationScore +=
          shows[index].range.reputationScoreMax;
        shows[index].range.reputationPercent =
          shows[index].range.reputationScore > 0
            ? Math.round(
                100 *
                  (shows[index].range.reputationScore /
                    shows[index].range.reputationScoreMax)
              )
            : 0;

        // Get show name
        if (index > 0) {
          let name = await sails.models.calendar.findOne({ ID: index });
          if (name) {
            shows[index].name = `${name.type}: ${name.hosts} - ${name.name}`;
          } else {
            shows[index].name = `Unknown Event`;
          }
        }
      }
    }

    // All done. Return as an array pair.
    return [DJs, shows];
  }
};
