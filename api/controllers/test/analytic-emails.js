module.exports = {
  friendlyName: "Analytic Emails",

  description: "Analytic Emails test.",

  inputs: {
    ID: {
      type: "number",
      required: true,
    },
    problemTerminated: {
      type: "boolean",
      defaultsTo: false,
    },
  },

  fn: async function (inputs) {
    // Add actualEnd
    var currentRecord = await sails.models.attendance.findOne({
      ID: inputs.ID,
    });

    if (currentRecord) {
      var event = currentRecord.event.split(": ");

      // Calculate attendance stats and weekly analytics in the background; this takes several seconds
      var temp = (async (cID) => {
        var stats = await sails.helpers.attendance.recalculate(cID);
        var topStats = await sails.helpers.attendance.calculateStats();
        let _djStats = await sails.helpers.analytics.showtime([
          currentRecord.dj,
          currentRecord.cohostDJ1,
          currentRecord.cohostDJ2,
          currentRecord.cohostDJ3,
        ])[0];

        let djStats = [];
        for (let key in _djStats) {
          if (Object.prototype.hasOwnProperty.call(_djStats, key)) {
            djStats.push(_djStats[key]);
          }
        }

        // Send analytic emails to DJs
        await sails.helpers.emails.queueDjs(
          {
            hostDJ: currentRecord.dj,
            cohostDJ1: currentRecord.cohostDJ1,
            cohostDJ2: currentRecord.cohostDJ2,
            cohostDJ3: currentRecord.cohostDJ3,
          },
          `Analytics for ${currentRecord.event}`,
          `<p>Hello!</p>
      
<p>Congratulations on another successful episode of ${
            currentRecord.event
          }! Below, you will find analytics for this episode.</p>
<ul>
<li><strong>Signed On:</strong> ${moment(currentRecord.actualStart).format(
            "LLLL"
          )}</li>
<li><strong>Signed Off:</strong> ${moment(currentRecord.actualEnd).format(
            "LLLL"
          )}</li>
<li><strong>Showtime:</strong> ${moment
            .duration(stats.showTime, "minutes")
            .format("h [hours], m [minutes]")}</li>
<li><strong>Online Listener Time*:</strong> ${moment
            .duration(stats.listenerMinutes, "minutes")
            .format("h [hours], m [minutes]")}</li>
<li><strong>Listener to Showtime Ratio (higher ratio = better performing broadcast):</strong> ${
            stats.showTime > 0 ? stats.listenerMinutes / stats.showTime : 0
          }</li>
<li><strong>Messages sent / received with listeners:</strong> ${
            stats.webMessages
          }</li>
${
  topStats[0].topShows.findIndex((show) => show.name === event[1]) !== -1
    ? `<li><strong>Congratulations! Your broadcast placed number ${
        topStats[0].topShows.findIndex((show) => show.name === event[1]) + 1
      } in the top ${
        topStats[0].topShows.length
      } shows of the last week!</strong></li>`
    : ``
}
</ul>

<hr>

<p>If any issues were discovered during your broadcast, they will be listed below. These issues were logged for the directors; repeat issues could result in intervention. If an issue was caused by a technical problem, please email the directors.</p>
<ul>
${
  inputs.problemTerminated
    ? `<li><strong>This broadcast was terminated early automatically due to a critical system problem.</strong> This will not be held against you.</li>`
    : ``
}
${
  stats.unauthorized
    ? `<li><strong>This broadcast was unscheduled / unauthorized.</strong> You should ensure the directors scheduled your show in and that you go on the air during your scheduled time (or request a re-schedule if applicable).</li>`
    : ``
}
${
  stats.missedIDs.length > 0 && typeof stats.missedIDs.map === "function"
    ? `<li><strong>You failed to take a required top-of-the-hour ID break at these times</strong>; it is mandatory by the FCC to take a break at the top of every hour before :05 after. For prerecords and playlists, ensure your audio cut-offs allow for the top-of-hour ID break to air on time:<br />
${stats.missedIDs.map((record) => moment(record).format("LT")).join("<br />")}
</li>`
    : ``
}
${
  stats.silence.length > 0 && typeof stats.silence.map === "function"
    ? `<li><strong>There was excessive silence / very low audio at these times;</strong> please avoid excessive silence on the air as this violates FCC regulations:</strong><br />
${stats.silence.map((record) => moment(record).format("LT")).join("<br />")}
</li>`
    : ``
}
${
  stats.badPlaylist
    ? `<li><strong>The broadcast did not successfully air due to a bad playlist.</strong> Please ensure the tracks you added/uploaded for this broadcast were not corrupted. If they are not corrupt, please let the directors know.</li>`
    : ``
}
${
  stats.signedOnEarly
    ? `<li><strong>You signed on 5 or more minutes early.</strong> Please avoid doing this, especially if there's a scheduled show before yours.</li>`
    : ``
}
${
  stats.signedOnLate
    ? `<li><strong>You signed on 10 or more minutes late.</strong> Please inform directors in advance if you are going to be late for your show.</li>`
    : ``
}
${
  stats.signedOffEarly
    ? `<li><strong>You signed off 10 or more minutes early.</strong> Please inform directors in advance if you are going to end your show early.</li>`
    : ``
}
${
  stats.signedOffLate
    ? `<li><strong>You signed off 5 or more minutes late.</strong> Please avoid doing this, especially if there's a scheduled show after yours.</li>`
    : ``
}
</ul>

<hr>

<p>Here is a break-down of the number of online listeners tuned in during your broadcast and at what time:</p>
<ul>${stats.listeners
            .map(
              (stat) =>
                `<li><strong>${moment(stat.time).format("LT")}</strong>: ${
                  stat.listeners
                }</li>`
            )
            .join("")}</ul>

<hr>

<p>Here are the messages (if any) sent/received between you and online listeners:</p>
<ul>${stats.messages
            .map(
              (message) =>
                `<li><strong>${moment(message.createdAt).format("LT")} by ${
                  message.fromFriendly
                }</strong>: ${message.message}</li>`
            )
            .join("")}</ul>

<hr>

<p>Here is your full show log:</p>
<ul>${stats.logs
            .map(
              (log) =>
                `<li><strong>${moment(log.createdAt).format("LT")}: ${
                  log.title
                }</strong><br />${log.event}${
                  log.trackArtist ? `<br />Artist: ${log.trackArtist}` : ``
                }${log.trackTitle ? `<br />Title: ${log.trackTitle}` : ``}${
                  log.trackAlbum ? `<br />Album: ${log.trackAlbum}` : ``
                }${log.trackLabel ? `<br />Label: ${log.trackLabel}` : ``}</li>`
            )
            .join("")}</ul>

<hr>

${
  topStats[1][currentRecord.calendarID]
    ? `<p>Here are analytics for ${
        currentRecord.event
      } for <strong>this semester</strong> so far:</p>
<ul>
<li><strong>On-air time:</strong> ${moment
        .duration(
          topStats[1][currentRecord.calendarID].semester.showtime,
          "minutes"
        )
        .format("h [hours], m [minutes]")}</li>
<li><strong>Online listener time*:</strong> ${moment
        .duration(
          topStats[1][currentRecord.calendarID].semester.listeners,
          "minutes"
        )
        .format("h [hours], m [minutes]")}</li>\
<li><strong>Listeners to Showtime Ratio (higher is better):</strong> ${
        topStats[1][currentRecord.calendarID].semester.ratio
      }</li>
<li><strong>Live episodes aired:</strong> ${
        topStats[1][currentRecord.calendarID].semester.shows
      }</li>
<li><strong>Prerecorded episodes aired:</strong> ${
        topStats[1][currentRecord.calendarID].semester.prerecords
      }</li>
<li><strong>Remote episodes aired:</strong> ${
        topStats[1][currentRecord.calendarID].semester.remotes
      }</li>
<li><strong>Sports broadcasts aired:</strong> ${
        topStats[1][currentRecord.calendarID].semester.sports
      }</li>
<li><strong>Playlist airings:</strong> ${
        topStats[1][currentRecord.calendarID].semester.playlists
      }</li>
<li><strong>Messages sent/received with online listeners:</strong> ${
        topStats[1][currentRecord.calendarID].semester.messages
      }</li>
<li><strong>Remote credits earned:</strong> <ul>${djStats
        .map((stat) => `<li>${stat.name}: ${stat.semester.remoteCredits}</li>`)
        .join("")}</ul></li>
</ul>

<hr>

<p>Here are analytics for ${
        currentRecord.event
      } for <strong>the past year</strong>:</p>
<ul>
<li><strong>On-air time:</strong> ${moment
        .duration(
          topStats[1][currentRecord.calendarID].overall.showtime,
          "minutes"
        )
        .format("h [hours], m [minutes]")}</li>
<li><strong>Online listener time*:</strong> ${moment
        .duration(
          topStats[1][currentRecord.calendarID].overall.listeners,
          "minutes"
        )
        .format("h [hours], m [minutes]")}</li>\
<li><strong>Listeners to Showtime Ratio (higher is better):</strong> ${
        topStats[1][currentRecord.calendarID].overall.ratio
      }</li>
<li><strong>Live episodes aired:</strong> ${
        topStats[1][currentRecord.calendarID].overall.shows
      }</li>
<li><strong>Prerecorded episodes aired:</strong> ${
        topStats[1][currentRecord.calendarID].overall.prerecords
      }</li>
<li><strong>Remote episodes aired:</strong> ${
        topStats[1][currentRecord.calendarID].overall.remotes
      }</li>
<li><strong>Sports broadcasts aired:</strong> ${
        topStats[1][currentRecord.calendarID].overall.sports
      }</li>
<li><strong>Playlist airings:</strong> ${
        topStats[1][currentRecord.calendarID].overall.playlists
      }</li>
<li><strong>Messages sent/received with online listeners:</strong> ${
        topStats[1][currentRecord.calendarID].overall.messages
      }</li>
<li><strong>Remote credits earned:</strong> <ul>${djStats
        .map((stat) => `<li>${stat.name}: ${stat.overall.remoteCredits}</li>`)
        .join("")}</ul></li>
</ul>`
    : ``
}

      <hr>
      
<p>*Online listener time is calculated per-listener, per-minute. For example, 5 online listeners tuned in for an entire 30 minute show is (5*30) 2 hours, 30 minutes listener time.</p>`,
          false,
          true
        );
      })(inputs.ID);
    }
  },
};
