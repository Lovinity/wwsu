// TODO: Add more properties to enable skipping calculations of 365 days and overall

module.exports = {
  friendlyName: "analytics.showtime",

  description:
    "Get analytics about the amount of show time and listenership every DJ had since the beginning of startOfSemester.",

  inputs: {
    djs: {
      type: "json",
      required: false,
      custom: function (value) {
        var valid = true;
        if (value.length > 0) {
          value.map((val) => {
            if (isNaN(val)) valid = false;
          });
        }
        return valid;
      },
      description: `Array of DJ IDs if you want showtime records for specific DJs. If not provided, will return all applicable DJs.`,
    },
    calendarIDs: {
      type: "json",
      required: false,
      custom: function (value) {
        var valid = true;
        if (value.length > 0) {
          value.map((val) => {
            if (isNaN(val)) valid = false;
          });
        }
        return valid;
      },
      description: `Array of calendar IDs of a calendar if you only want showtime records for specific shows/calendars. If not provided, will return all applicable shows.`,
    },
    start: {
      type: "string",
      custom: function (value) {
        return moment(value).isValid();
      },
      description: `moment() parsable string of the start date/time for range analytics. Defaults to the year 2002.`,
    },
    end: {
      type: "string",
      custom: function (value) {
        return moment(value).isValid();
      },
      description: `moment() parsable string of the end date/time for range analytics. Defaults to now.`,
    },
  },

  fn: async function (inputs) {
    sails.log.debug(`---INITIATING ANALYTICS.SHOWTIME---`)

    // filter out all falsey values from inputs
    if (inputs.djs && typeof inputs.djs.filter !== "undefined")
      inputs.djs = inputs.djs.filter((dj) => dj);
    if (inputs.calendarIDs && typeof inputs.calendarIDs.filter !== "undefined")
      inputs.calendarIDs = inputs.calendarIDs.filter((cal) => cal);

    // Initialize ranges
    var start = inputs.start
      ? moment(inputs.start).toISOString(true)
      : moment("2002-01-01T00:00:00Z").toISOString(true);
    var end = inputs.end
      ? moment(inputs.end).toISOString(true)
      : moment().toISOString(true);

    var ranges = [
      [
        "week",
        moment().subtract(1, "weeks").toISOString(true),
        moment().toISOString(true),
      ],
      ["range", start, end],
      [
        "semester",
        moment(sails.config.custom.startOfSemester).toISOString(true),
        moment().toISOString(true),
      ],
    ];

    // Grab calendar events in memory
    var calendar = await sails.models.calendar.find(
      inputs.calendarIDs ? { ID: inputs.calendarIDs } : {}
    );

    // Get DJ records
    var djs = await sails.models.djs.find(inputs.djs ? { ID: inputs.djs } : {});

    // Initialize for every DJ in the system + one for all DJs
    var DJs = {};
    var shows = {};

    var template = {
      name: "Unknown",
      type: "unknown",
      week: {
        remoteCredits: 0,
        show: 0,
        prerecord: 0,
        remote: 0,
        sports: 0,
        genre: 0,
        playlist: 0,
        showTime: 0,
        tuneIns: 0,
        listenerMinutes: 0,
        ratio: 1,
        webMessages: 0,
        breaks: 0,
        signedOnEarly: 0,
        signedOnLate: 0,
        signedOffEarly: 0,
        signedOffLate: 0,
        badPlaylist: 0,
        absent: 0,
        cancellation: 0,
        unauthorized: 0,
        missedIDs: 0,
        silence: 0,
        missedIDsArray: [],
        silenceArray: [],
        reputationScore: 0,
        reputationScoreMax: 0,
        reputationPercent: 0,
      },
      range: {
        remoteCredits: 0,
        show: 0,
        prerecord: 0,
        remote: 0,
        sports: 0,
        genre: 0,
        playlist: 0,
        showTime: 0,
        tuneIns: 0,
        listenerMinutes: 0,
        ratio: 1,
        webMessages: 0,
        breaks: 0,
        signedOnEarly: 0,
        signedOnLate: 0,
        signedOffEarly: 0,
        signedOffLate: 0,
        badPlaylist: 0,
        absent: 0,
        cancellation: 0,
        unauthorized: 0,
        missedIDs: 0,
        silence: 0,
        missedIDsArray: [],
        silenceArray: [],
        reputationScore: 0,
        reputationScoreMax: 0,
        reputationPercent: 0,
      },
      semester: {
        remoteCredits: 0,
        show: 0,
        prerecord: 0,
        remote: 0,
        sports: 0,
        genre: 0,
        playlist: 0,
        showTime: 0,
        tuneIns: 0,
        listenerMinutes: 0,
        ratio: 1,
        webMessages: 0,
        breaks: 0,
        signedOnEarly: 0,
        signedOnLate: 0,
        signedOffEarly: 0,
        signedOffLate: 0,
        badPlaylist: 0,
        absent: 0,
        cancellation: 0,
        unauthorized: 0,
        missedIDs: 0,
        silence: 0,
        missedIDsArray: [],
        silenceArray: [],
        reputationScore: 0,
        reputationScoreMax: 0,
        reputationPercent: 0,
      },
      overall: {
        remoteCredits: 0,
        show: 0,
        prerecord: 0,
        remote: 0,
        sports: 0,
        genre: 0,
        playlist: 0,
        showTime: 0,
        tuneIns: 0,
        listenerMinutes: 0,
        ratio: 1,
        webMessages: 0,
        breaks: 0,
        signedOnEarly: 0,
        signedOnLate: 0,
        signedOffEarly: 0,
        signedOffLate: 0,
        badPlaylist: 0,
        absent: 0,
        cancellation: 0,
        unauthorized: 0,
        missedIDs: 0,
        silence: 0,
        missedIDsArray: [],
        silenceArray: [],
        reputationScore: 0,
        reputationScoreMax: 0,
        reputationPercent: 0,
      },
    };

    // Preload analytics
    [
      [0, "All programming"],
      [-1, "Shows, remotes, and prerecords"],
      [-2, "Sports only"],
      [-3, "Genres only"],
      [-4, "Playlists only"],
    ].forEach((arr) => {
      shows[arr[0]] = Object.assign(template, { name: arr[1] });
    });

    var initializeShow = (id) => {
      if (id && typeof shows[id] === "undefined") {
        let record = calendar.find((cal) => cal.ID === id);
        if (record) {
          shows[id] = Object.assign(template, { name: record.name || "Unknown Event", type: record.type || "unknown" });
        }
      }
    };

    var initializeDJ = (id) => {
      if (id && typeof DJs[id] === "undefined") {
        let record = djs.find((dj) => dj.ID === id);
        if (record) {
          DJs[id] = Object.assign(template, { name: record.name || "Unknown DJ" });
        }
      }
    };

    sails.log.debug(`ANALYTICS: Templates initialized.`);

    // Calculate remote credits earned for DJs
    var maps = djs
      .map((record) => record.ID)
      .map(async (dj) => {
        initializeDJ(dj);
        if (typeof DJs[dj] !== "undefined") {
          DJs[dj].overall.remoteCredits += await sails.models.xp.sum("amount", {
            dj: dj,
            type: "remote",
          });
          for (var range in ranges) {
            DJs[dj][
              ranges[range][0]
            ].remoteCredits += await sails.models.xp.sum("amount", {
              dj: dj,
              type: "remote",
              createdAt: { ">=": ranges[range][1], "<": ranges[range][2] },
            });
          }
        }
      });
    await Promise.all(maps);

    sails.log.debug(`ANALYTICS: DJ credits calculated.`);

    // Form query for filtering attendance records
    var where = "";
    var djstring = "";
    var calendarIDString = "";
    if (inputs.djs && inputs.djs.length > 0) {
      djstring = inputs.djs.join();
      where = ` AND (dj IN ($1) OR cohostDJ1 IN ($1) OR cohostDJ2 IN ($1) OR cohostDJ3 IN ($1))`;
      query.or = [
        { dj: inputs.djs },
        { cohostDJ1: inputs.djs },
        { cohostDJ2: inputs.djs },
        { cohostDJ3: inputs.djs },
      ];
    }
    if (inputs.calendarIDs && inputs.calendarIDs.length > 0) {
      calendarIDString = inputs.calendarIDs.join();
      where += ` AND calendarID IN ($2)`;
      query.calendarID = inputs.calendarIDs;
    }

    // Determine distinct unique occurrances (use this instead because sometimes someone might sign off and sign back on again; this should still count as only 1 broadcast.)
    // TODO: use native sails.js distinct if they implement it. Otherwise, this requires attendance uses mySQL.
    var distinctEvents = await sails.models.attendance
      .getDatastore()
      .sendNativeQuery(
        `SELECT DISTINCT "unique"${
          where !== "" ? ` WHERE "happened" = 1${where}` : ``
        }`,
        [djstring, calendarIDString]
      );

    // Determine number of broadcasts
    distinctEvents
      .filter((dEvent) => dEvent.calendarID)
      .forEach((dEvent) => {
        let prefix = dEvent.event.split(": ")[0].toLowerCase();

        // Shows
        initializeShow(dEvent.calendarID);
        if (typeof shows[dEvent.calendarID] !== "undefined") {
          shows[dEvent.calendarID].overall[prefix] += 1;
          for (var range in ranges) {
            shows[dEvent.calendarID][ranges[range][0]][prefix] += 1;
          }
        }

        // DJs
        ["dj", "cohostDJ1", "cohostDJ2", "cohostDJ3"].map((dj) => {
          initializeDJ(dEvent[dj]);
          if (typeof DJs[dEvent[dj]] !== "undefined") {
            DJs[dEvent[dj]].overall[prefix] += 1;
            for (var range in ranges) {
              DJs[dEvent[dj]][ranges[range][0]][prefix] += 1;
            }
          }
        });
      });

      sails.log.debug(`ANALYTICS: Broadcast numbers calculated.`);

    var maps = [
      "showTime",
      "tuneIns",
      "listenerMinutes",
      "webMessages",
      "breaks",
    ].map(async (_stat) => {
      // Calculate showtime, tuneins, listeners, messages, breaks, for shows
      for (var cal in calendar) {
        let stat = await sails.models.attendance.sum(_stat, {
          calendarID: calendar[cal].ID,
          happened: 1,
        });
        initializeShow(calendar[cal].ID);
        if (typeof shows[calendar[cal].ID] !== "undefined") {
          shows[calendar[cal].ID].overall[_stat] += stat;
          for (var range in ranges) {
            shows[calendar[cal].ID][ranges[range][0]][_stat] += stat;
          }
        }
      }

      // Calculate showtime, tuneins, listeners, messages, breaks, for DJs
      for (var dj in djs) {
        let stat = await sails.models.attendance.sum(_stat, {
          or: [
            { dj: djs[dj].ID },
            { cohostDJ1: djs[dj].ID },
            { cohostDJ2: djs[dj].ID },
            { cohostDJ3: djs[dj].ID },
          ],
          happened: 1,
        });
        initializeDJ(djs[dj].ID);
        if (typeof DJs[djs[dj].ID] !== "undefined") {
          DJs[djs[dj].ID].overall[_stat] += stat;
          for (var range in ranges) {
            DJs[djs[dj].ID][ranges[range][0]][_stat] += stat;
          }
        }
      }
    });
    await Promise.all(maps);

    sails.log.debug(`ANALYTICS: Statistics calculated.`);

    var maps = [
      "absent",
      "unauthorized",
      "cancellation",
      "signedOnEarly",
      "signedOnLate",
      "signedOffEarly",
      "signedOffLate",
    ].map(async (_stat) => {
      // Calculate absences, cancellations, unauthorized broadcasts, signedONEarly, signedOnLate, signedOffEarly, and signedOffLate for shows
      for (var cal in calendar) {
        let crit = { calendarID: calendar[cal].ID };
        crit[_stat] = true;
        let stat = await sails.models.attendance.count(crit);
        initializeShow(calendar[cal].ID);
        if (typeof shows[calendar[cal].ID] !== "undefined") {
          shows[calendar[cal].ID].overall[_stat] += stat;
          for (var range in ranges) {
            shows[calendar[cal].ID][ranges[range][0]][_stat] += stat;
          }
        }
      }

      // Calculate absences, cancellations, unauthorized broadcasts, signedONEarly, signedOnLate, signedOffEarly, and signedOffLate for DJs
      for (var dj in djs) {
        let crit = {
          or: [
            { dj: djs[dj].ID },
            { cohostDJ1: djs[dj].ID },
            { cohostDJ2: djs[dj].ID },
            { cohostDJ3: djs[dj].ID },
          ],
        };
        crit[_stat] = true;
        let stat = await sails.models.attendance.count(crit);
        initializeDJ(djs[dj].ID);
        if (typeof DJs[djs[dj].ID] !== "undefined") {
          DJs[djs[dj].ID].overall[_stat] += stat;
          for (var range in ranges) {
            DJs[djs[dj].ID][ranges[range][0]][_stat] += stat;
          }
        }
      }
    });
    await Promise.all(maps);

    sails.log.debug(`ANALYTICS: Rep analytics calculated.`);

    var maps = ["missedIDs", "silence"].map(async (_stat) => {
      // Calculate missedIDs and silence for shows
      for (var cal in calendar) {
        let crit = { calendarID: calendar[cal].ID };
        crit[_stat] = { "!=": "[]" };
        let records = await sails.models.attendance.find(crit);
        initializeShow(calendar[cal].ID);
        if (typeof shows[calendar[cal].ID] !== "undefined") {
          shows[calendar[cal].ID].overall[`${_stat}Array`] = shows[
            calendar[cal].ID
          ].overall[`${_stat}Array`].concat(
            records.map((record) => record.missedIDs)
          );
          for (var range in ranges) {
            shows[calendar[cal].ID][ranges[range][0]][`${_stat}Array`] = shows[
              calendar[cal].ID
            ][ranges[range][0]][`${_stat}Array`].concat(
              records.map((record) => record.missedIDs)
            );
          }
        }
      }

      // Calculate missedIDs and silence for DJs
      for (var dj in djs) {
        let crit = {
          or: [
            { dj: djs[dj].ID },
            { cohostDJ1: djs[dj].ID },
            { cohostDJ2: djs[dj].ID },
            { cohostDJ3: djs[dj].ID },
          ],
        };
        crit[_stat] = { "!=": "[]" };
        let records = await sails.models.attendance.find(crit);
        initializeDJ(djs[dj].ID);
        if (typeof DJs[djs[dj].ID] !== "undefined") {
          DJs[djs[dj].ID].overall[`${_stat}Array`] = DJs[djs[dj].ID].overall[
            `${_stat}Array`
          ].concat(records.map((record) => record.missedIDs));
          for (var range in ranges) {
            DJs[djs[dj].ID][ranges[range][0]][`${_stat}Array`] = DJs[
              djs[dj].ID
            ][ranges[range][0]][`${_stat}Array`].concat(
              records.map((record) => record.missedIDs)
            );
          }
        }
      }
    });
    await Promise.all(maps);

    sails.log.debug(`ANALYTICS: Time-based rep calculated.`);

    // Calculate maximum reputation score
    // Add 5 score for every live/remote/sports show.
    // Add 2 score for every prerecorded show.
    // Add 2 score for every playlist.
    // Add 1 score for every genre.
    // Add 1 score for every break taken (max 1 for every clockwheel break configured).
    for (var show in shows) {
      for (var range in ranges) {
        shows[show][ranges[range][0]].reputationScoreMax +=
          5 * shows[show][ranges[range][0]].show;
        shows[show][ranges[range][0]].reputationScoreMax +=
          5 * shows[show][ranges[range][0]].remote;
        shows[show][ranges[range][0]].reputationScoreMax +=
          5 * shows[show][ranges[range][0]].sports;
        shows[show][ranges[range][0]].reputationScoreMax +=
          2 * shows[show][ranges[range][0]].prerecord;
        shows[show][ranges[range][0]].reputationScoreMax +=
          2 * shows[show][ranges[range][0]].playlist;
        shows[show][ranges[range][0]].reputationScoreMax +=
          1 * shows[show][ranges[range][0]].genre;
        shows[show][ranges[range][0]].reputationScoreMax +=
          1 *
          Math.min(
            shows[show][ranges[range][0]].showTime /
              (sails.config.custom.breaks.length > 0
                ? 60 / sails.config.custom.breaks.length
                : 60),
            shows[show][ranges[range][0]].breaks
          );
        shows[show][ranges[range][0]].reputationScore =
          shows[show][ranges[range][0]].reputationScoreMax;
      }
    }
    for (var dj in DJs) {
      for (var range in ranges) {
        DJs[dj][ranges[range][0]].reputationScoreMax +=
          5 * DJs[dj][ranges[range][0]].show;
        DJs[dj][ranges[range][0]].reputationScoreMax +=
          5 * DJs[dj][ranges[range][0]].remote;
        DJs[dj][ranges[range][0]].reputationScoreMax +=
          5 * DJs[dj][ranges[range][0]].sports;
        DJs[dj][ranges[range][0]].reputationScoreMax +=
          2 * DJs[dj][ranges[range][0]].prerecord;
        DJs[dj][ranges[range][0]].reputationScoreMax +=
          2 * DJs[dj][ranges[range][0]].playlist;
        DJs[dj][ranges[range][0]].reputationScoreMax +=
          1 * DJs[dj][ranges[range][0]].genre;
        DJs[dj][ranges[range][0]].reputationScoreMax +=
          1 *
          Math.min(
            DJs[dj][ranges[range][0]].showTime /
              (sails.config.custom.breaks.length > 0
                ? 60 / sails.config.custom.breaks.length
                : 60),
            DJs[dj][ranges[range][0]].breaks
          );
        DJs[dj][ranges[range][0]].reputationScore =
          DJs[dj][ranges[range][0]].reputationScoreMax;
      }
    }

    sails.log.debug(`ANALYTICS: Max rep score calculated.`);

    // Subtract reputation score and calculate reputationPercent.
    // Subtract 3 for every missed top-of-hour ID break
    // Subtract 1 for every cancellation
    // Subtract 3 for every unexcused absence / no-show
    // Subtract 2 for every unauthorized broadcast
    // Subtract 1 each time silence detection was triggered
    // Subtract 2 for each early sign-on or late sign-off
    // Subtract 1 for each early sign-off or late sign-on
    for (var show in shows) {
      for (var range in ranges) {
        shows[show][ranges[range][0]].missedIDs =
          shows[show][ranges[range][0]].missedIDsArray.length;
        shows[show][ranges[range][0]].silence =
          shows[show][ranges[range][0]].silenceArray.length;

        shows[show][ranges[range][0]].reputationScore -=
          3 * shows[show][ranges[range][0]].missedIDs;
        shows[show][ranges[range][0]].reputationScore -=
          1 * shows[show][ranges[range][0]].cancellation;
        shows[show][ranges[range][0]].reputationScore -=
          3 * shows[show][ranges[range][0]].absent;
        shows[show][ranges[range][0]].reputationScore -=
          2 * shows[show][ranges[range][0]].unauthorized;
        shows[show][ranges[range][0]].reputationScore -=
          1 * shows[show][ranges[range][0]].silence;
        shows[show][ranges[range][0]].reputationScore -=
          2 * shows[show][ranges[range][0]].signOnEarly;
        shows[show][ranges[range][0]].reputationScore -=
          2 * shows[show][ranges[range][0]].signOffLate;
        shows[show][ranges[range][0]].reputationScore -=
          1 * shows[show][ranges[range][0]].signOnLate;
        shows[show][ranges[range][0]].reputationScore -=
          1 * shows[show][ranges[range][0]].signOffEarly;

        shows[show][ranges[range][0]].reputationPercent =
          shows[show][ranges[range][0]].reputationScoreMax > 0
            ? Math.floor(
                (shows[show][ranges[range][0]].reputationScore /
                  shows[show][ranges[range][0]].reputationScoreMax) *
                  100
              )
            : 0;
      }
    }
    for (var dj in DJs) {
      for (var range in ranges) {
        DJs[dj][ranges[range][0]].missedIDs =
          DJs[dj][ranges[range][0]].missedIDsArray.length;
        DJs[dj][ranges[range][0]].silence =
          DJs[dj][ranges[range][0]].silenceArray.length;

        DJs[dj][ranges[range][0]].reputationScore -=
          3 * DJs[dj][ranges[range][0]].missedIDs;
        DJs[dj][ranges[range][0]].reputationScore -=
          1 * DJs[dj][ranges[range][0]].cancellation;
        DJs[dj][ranges[range][0]].reputationScore -=
          3 * DJs[dj][ranges[range][0]].absent;
        DJs[dj][ranges[range][0]].reputationScore -=
          2 * DJs[dj][ranges[range][0]].unauthorized;
        DJs[dj][ranges[range][0]].reputationScore -=
          1 * DJs[dj][ranges[range][0]].silence;
        DJs[dj][ranges[range][0]].reputationScore -=
          2 * DJs[dj][ranges[range][0]].signOnEarly;
        DJs[dj][ranges[range][0]].reputationScore -=
          2 * DJs[dj][ranges[range][0]].signOffLate;
        DJs[dj][ranges[range][0]].reputationScore -=
          1 * DJs[dj][ranges[range][0]].signOnLate;
        DJs[dj][ranges[range][0]].reputationScore -=
          1 * DJs[dj][ranges[range][0]].signOffEarly;

        DJs[dj][ranges[range][0]].reputationPercent =
          DJs[dj][ranges[range][0]].reputationScoreMax > 0
            ? Math.floor(
                (DJs[dj][ranges[range][0]].reputationScore /
                  DJs[dj][ranges[range][0]].reputationScoreMax) *
                  100
              )
            : 0;
      }
    }

    sails.log.debug(`ANALYTICS: Rep subtractions executed.`);

    // Calculate listener to showtime ratio
    for (var show in shows) {
      for (var range in ranges) {
        shows[show][ranges[range][0]].ratio =
          shows[show][ranges[range][0]].showTime > 0
            ? shows[show][ranges[range][0]].listenerMinutes /
              shows[show][ranges[range][0]].showTime
            : 0;
      }
    }
    for (var dj in DJs) {
      for (var range in ranges) {
        DJs[dj][ranges[range][0]].ratio =
          DJs[dj][ranges[range][0]].showTime > 0
            ? DJs[dj][ranges[range][0]].listenerMinutes /
              DJs[dj][ranges[range][0]].showTime
            : 0;
      }
    }

    sails.log.debug(`ANALYTICS: Ratios calculated.`);

    sails.log.debug(`ANALYTICS: DONE.`);

    // All done. Return as an array pair.
    return [DJs, shows];
  },
};
