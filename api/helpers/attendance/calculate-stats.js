let analyticsCalculation = 0;

module.exports = {
  friendlyName: "attendance.calculateStats",

  description:
    "Re-calculate weekly analytics and broadcast them through the websockets",

  inputs: {},

  fn: async function (inputs, exits) {
    sails.log.debug("Helper attendance.calculateStats called.");

    try {
      // Indicate we are recalculating
      await sails.helpers.meta.change.with({ recalculatingAnalytics: true });
      analyticsCalculation++;

      // Get all showtime stats for shows
      let stats = await sails.helpers.analytics.showtime();
      stats = stats[1];
      let stats2 = Object.values(stats);
      //console.dir(stats[ 1 ]);
      //console.dir(Object.values(stats))

      let earliest = moment().subtract(7, "days");

      // Prepare with a clean template
      sails.models.attendance.weeklyAnalytics = {
        topShows: [],
        topGenre: { name: "None", score: 0 },
        topPlaylist: { name: "None", score: 0 },
        onAir: 0,
        listeners: 0,
        onAirListeners: 0,
        listenerPeak: 0,
        listenerPeakTime: null,
        tracksLiked: 0,
        tracksRequested: 0,
        webMessagesExchanged: 0,
        discordMessagesExchanged: 0,
      };

      // Function for calculating a program's score for determining which should be top
      let showScore = (show) => {
        let aScore = 0;
        let aWeek = show.week;

        // 60 points for every 1 online listener to showtime ratio (roughly translates to 60 points for every average online listener)
        aScore += aWeek.ratio * 60;

        // 2 points (divided by showtime / 60) for every message exchanged during the broadcast
        aScore += (2 / (aWeek.showtime / 60)) * aWeek.messages;

        // 10 points (divided by showtime / 60) for every break; award a maximum of 4 times for every 60 minutes showtime (eg. 1 break every 15 minutes).
        // Do not award for breaks on genres nor playlists
        if (["genre", "playlist"].indexOf(show.type) === -1) {
          let aMaxBreaks = (aWeek.showtime / 60) * 4;
          aScore +=
            (10 / (aWeek.showtime / 60)) * Math.min(aMaxBreaks, aWeek.breaks);
        }

        // if reputationScoreMax is 0, reputationPercent is always 100 because of division by zero.
        if (aWeek.reputationScoreMax <= 0) aWeek.reputationPercent = 100;

        // Multiply final score by reputationPercent (lower reputation = less likely to be featured, such as if the DJ did not comply with regulations)
        aScore *= aWeek.reputationPercent / 100;

        // Shows with less than 15 minutes showtime are disqualified from any points
        if (aWeek.showtime < 15) aScore = 0;

        // Round down on the score.
        return Math.floor(aScore);
      };

      // Sort array in place
      stats2.sort((a, b) => showScore(b) - showScore(a));

      // Prepare parallel function 1
      let f1 = async () => {
        // Grab count of liked tracks from last week
        sails.models.attendance.weeklyAnalytics.tracksLiked =
          await sails.models.songsliked.count({
            createdAt: { ">=": earliest.toISOString(true) },
          });

        // Grab count of requested tracks
        sails.models.attendance.weeklyAnalytics.tracksRequested =
          await sails.models.requests.count({
            createdAt: { ">=": earliest.toISOString(true) },
          });

        // Grab count of webMessagesExchanged
        sails.models.attendance.weeklyAnalytics.webMessagesExchanged =
          await sails.models.messages.count({
            status: "active",
            or: [
              { from: { startsWith: "website" } },
              { to: { startsWith: "website" } },
            ],
            createdAt: { ">=": earliest.toISOString(true) },
          });

        // Grab count of discordMessagesExchanged
        sails.models.attendance.weeklyAnalytics.discordMessagesExchanged =
          await sails.models.messages.count({
            status: "active",
            or: [
              { from: { startsWith: "discord-" } },
              { to: { startsWith: "discord-" } },
            ],
            createdAt: { ">=": earliest.toISOString(true) },
          });
      };

      // Prepare parallel function 2
      let f2 = async () => {
        let records;
        // Start with shows, remotes, and prerecords
        records = stats2.filter(
          (stat) =>
            ["show", "remote", "prerecord"].indexOf(stat.type) !== -1 &&
            stat.week.showtime > 0
        );

        sails.models.attendance.weeklyAnalytics.topShows.push(
          records[0]
            ? {
                name: records[0].name,
                score: showScore(records[0]),
              }
            : { name: "N/A", score: 0 }
        );
        sails.models.attendance.weeklyAnalytics.topShows.push(
          records[1]
            ? {
                name: records[1].name,
                score: showScore(records[1]),
              }
            : { name: "N/A", score: 0 }
        );
        sails.models.attendance.weeklyAnalytics.topShows.push(
          records[2]
            ? {
                name: records[2].name,
                score: showScore(records[2]),
              }
            : { name: "N/A", score: 0 }
        );
        sails.models.attendance.weeklyAnalytics.topShows.push(
          records[3]
            ? {
                name: records[3].name,
                score: showScore(records[3]),
              }
            : { name: "N/A", score: 0 }
        );
        sails.models.attendance.weeklyAnalytics.topShows.push(
          records[4]
            ? {
                name: records[4].name,
                score: showScore(records[4]),
              }
            : { name: "N/A", score: 0 }
        );

        // Next, genres
        records = stats2.filter(
          (stat) => stat.type === "genre" && stat.week.showtime > 0
        );
        if (records[0])
          sails.models.attendance.weeklyAnalytics.topGenre = {
            name: records[0].name,
            score: showScore(records[0]),
          };

        // Next, playlists
        records = stats2.filter(
          (stat) => stat.type === "playlist" && stat.week.showtime > 0
        );
        if (records[0])
          sails.models.attendance.weeklyAnalytics.topPlaylist = {
            name: records[0].name,
            score: showScore(records[0]),
          };

        // Finally, populate other stats
        sails.models.attendance.weeklyAnalytics.onAir =
          stats[-1].week.showtime + stats[-2].week.showtime;
        sails.models.attendance.weeklyAnalytics.onAirListeners =
          stats[-1].week.listeners + stats[-2].week.listeners;
        sails.models.attendance.weeklyAnalytics.listeners =
          stats[0].week.listeners;
        sails.models.attendance.weeklyAnalytics.listenerPeak =
          stats[0].week.listenerPeak;
        sails.models.attendance.weeklyAnalytics.listenerPeakTime =
          stats[0].week.listenerPeakTime;
      };

      // Execute our parallel functions and wait for them to resolve.
      await Promise.all([f1(), f2()]);

      // Broadcast socket
      sails.sockets.broadcast(
        "analytics-weekly-dj",
        "analytics-weekly-dj",
        sails.models.attendance.weeklyAnalytics
      );

      analyticsCalculation--;
      if (analyticsCalculation < 1)
        await sails.helpers.meta.change.with({ recalculatingAnalytics: false });

      return exits.success([sails.models.attendance.weeklyAnalytics, stats]);
    } catch (e) {
      analyticsCalculation--;
      if (analyticsCalculation < 1)
        await sails.helpers.meta.change.with({ recalculatingAnalytics: false });
      return exits.error(e);
    }
  },
};
