module.exports = {
  friendlyName: "attendance.calculateStats",

  description:
    "Re-calculate weekly analytics and broadcast them through the websockets",

  inputs: {},

  fn: async function (inputs, exits) {
    sails.log.debug("Helper attendance.calculateStats called.");

    try {
      // Get all showtime stats for shows
      var stats = await sails.helpers.analytics.showtime();
      stats = stats[1];
      var stats2 = Object.values(stats);
      //console.dir(stats[ 1 ]);
      //console.dir(Object.values(stats))

      var earliest = moment().subtract(7, "days");

      // Prepare with a clean template
      sails.models.attendance.weeklyAnalytics = {
        topShows: [],
        topGenre: "None",
        topPlaylist: "None",
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

      // Define compare function for sorting records;
      var compare = function (a, b) {
        var aWeek = a.week;
        var bWeek = b.week;

        var aScore = 0;
        var bScore = 0;

        // 60 points for every 1 ratio
        aScore += aWeek.ratio * 60;
        bScore += bWeek.ratio * 60;

        // 2 points (divided by showtime / 60) for every message
        aScore += (2 / (aWeek.showtime / 60)) * aWeek.messages;
        bScore += (2 / (bWeek.showtime / 60)) * bWeek.messages;

        // 10 points (divided by showtime / 60) for every break; max 4 per 60 showTime
        var aMaxBreaks = (aWeek.showtime / 60) * 4;
        var bMaxBreaks = (bWeek.showtime / 60) * 4;
        aScore +=
          (10 / (aWeek.showtime / 60)) * Math.min(aMaxBreaks, aWeek.breaks);
        bScore +=
          (10 / (bWeek.showtime / 60)) * Math.min(bMaxBreaks, bWeek.breaks);

        // if reputationScoreMax is 0, reputationPercent is always 100.
        if (aWeek.reputationScoreMax <= 0) aWeek.reputationPercent = 100;
        if (bWeek.reputationScoreMax <= 0) bWeek.reputationPercent = 100;

        // Multiply final score by reputationPercent (lower reputation = less likely to be featured)
        aScore *= aWeek.reputationPercent / 100;
        bScore *= bWeek.reputationPercent / 100;

        // Shows with less than 15 minutes showtime are disqualified
        if (aWeek.showtime < 15) aScore = 0;
        if (bWeek.showtime < 15) bScore = 0;

        return bScore - aScore;
      };

      // Sort array in place
      stats2.sort(compare);

      // Prepare parallel function 1
      var f1 = async () => {
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
      var f2 = async () => {
        let records;
        // Start with shows, remotes, and prerecords
        records = stats2.filter(
          (stat) =>
            (stat.name.toLowerCase().startsWith("show: ") ||
              stat.name.toLowerCase().startsWith("remote: ") ||
              stat.name.toLowerCase().startsWith("prerecord: ")) &&
            stat.week.showtime > 0
        );

        sails.models.attendance.weeklyAnalytics.topShows.push(
          records[0]
            ? records[0].name
                .replace("show: ", "")
                .replace("remote: ", "")
                .replace("prerecord: ", "")
            : ""
        );
        sails.models.attendance.weeklyAnalytics.topShows.push(
          records[1]
            ? records[1].name
                .replace("show: ", "")
                .replace("remote: ", "")
                .replace("prerecord: ", "")
            : ""
        );
        sails.models.attendance.weeklyAnalytics.topShows.push(
          records[2]
            ? records[2].name
                .replace("show: ", "")
                .replace("remote: ", "")
                .replace("prerecord: ", "")
            : ""
        );

        // Next, genres
        records = stats2.filter(
          (stat) =>
            stat.name.toLowerCase().startsWith("genre: ") &&
            stat.week.showtime > 0
        );
        if (records[0])
          sails.models.attendance.topGenre = records[0].name.replace(
            "genre: ",
            ""
          );

        // Next, playlists
        records = stats2.filter(
          (stat) =>
            stat.name.toLowerCase().startsWith("playlist: ") &&
            stat.week.showtime > 0
        );
        if (records[0])
          sails.models.attendance.topPlaylist = records[0].name.replace(
            "playlist: ",
            ""
          );

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

      return exits.success([sails.models.attendance.weeklyAnalytics, stats]);
    } catch (e) {
      return exits.error(e);
    }
  },
};
