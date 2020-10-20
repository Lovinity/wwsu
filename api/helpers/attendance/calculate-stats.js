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
        onAirListeners: 0,
        tracksLiked: 0,
        tracksRequested: 0,
        webMessagesExchanged: 0,
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

        // 3 points (divided by showtime / 60) for every message
        aScore += (3 / (aWeek.showtime / 60)) * aWeek.messages;
        bScore += (3 / (bWeek.showtime / 60)) * bWeek.messages;

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

      // Prepare parallel function 1
      var f1 = async () => {
        // Grab count of liked tracks from last week
        sails.models.attendance.weeklyAnalytics.tracksLiked = await sails.models.songsliked.count(
          { createdAt: { ">=": earliest.toISOString(true) } }
        );

        // Grab count of requested tracks
        sails.models.attendance.weeklyAnalytics.tracksRequested = await sails.models.requests.count(
          { createdAt: { ">=": earliest.toISOString(true) } }
        );

        // Grab count of webMessagesExchanged
        sails.models.attendance.weeklyAnalytics.webMessagesExchanged = await sails.models.messages.count(
          {
            status: "active",
            or: [
              { from: { startsWith: "website" } },
              { to: { startsWith: "website" } },
            ],
            createdAt: { ">=": earliest.toISOString(true) },
          }
        );
      };

      // Prepare parallel function 2
      var f2 = async () => {
        // Start with shows, remotes, and prerecords
        stats2
          .filter(
            (stat) =>
              ["show", "remote", "prerecord"].indexOf(stat.type) !== -1 &&
              stat.week.showTime > 0
          )
          .sort(compare)
          .map((stat, index) => {
            if (index > 2) return;
            sails.models.attendance.weeklyAnalytics.topShows.push(stat.name);
          });

        // Next, genres
        stats2
          .filter((stat) => stat.type === "genre" && stat.week.showTime > 0)
          .sort(compare)
          .map((stat, index) => {
            if (index > 0) return;
            sails.models.attendance.topGenre = stat.name;
          });

        // Next, playlists
        stats2
          .filter((stat) => stat.type === "playlist" && stat.week.showTime > 0)
          .sort(compare)
          .map((stat, index) => {
            if (index > 0) return;
            sails.models.attendance.weeklyAnalytics.topPlaylist = stat.name;
          });

        // Finally, populate other stats
        sails.models.attendance.weeklyAnalytics.onAir = stats[-1].week.showTime;
        sails.models.attendance.weeklyAnalytics.onAirListeners =
          stats[-1].week.listenerMinutes;
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
