module.exports = {

    friendlyName: 'Analytic Emails',

    description: 'Analytic Emails test.',

    inputs: {

    },

    fn: async function (inputs) {
        var stats = await sails.helpers.attendance.calculateStats();
        var weekly = stats[ 0 ];
        var overall = stats[ 1 ];
        var body = `<p>Dear directors,</p>
          <p>Here is the weekly analytic report for on-air programming.</p>
          
          <p><strong>Top 3 shows/remotes/prerecords for this week:</strong>
          <ul>
          <li>1. ${weekly.topShows[ 0 ]}</li>
          <li>2. ${weekly.topShows[ 1 ]}</li>
          <li>3. ${weekly.topShows[ 2 ]}</li>
          </ul>
          Top 3 shows are calculated based on listener:showtime ratio, web messages sent/received (interactivity), number of breaks taken in an hour (4 is best), and reputation (followed all on-air regulations, did show on-time, etc)</p>

          <p><strong>Top Genre of the week:</strong> ${weekly.topGenre}</p>
          <p><strong>Top Playlist of the week:</strong> ${weekly.topPlaylist}</p>
          <p><strong>Tracks liked on the website:</strong> ${weekly.tracksLiked}</p>
          <p><strong>Track requests placed on the website:</strong> ${weekly.tracksRequested}</p>
          <p><strong>Messages sent/received between listeners and DJs:</strong> ${weekly.webMessagesExchanged}</p>

          <p><strong>Live shows performed:</strong> ${overall[ -1 ].week.show}</p>
          <p><strong>Remote shows performed:</strong> ${overall[ -1 ].week.remote}</p>
          <p><strong>Prerecorded shows aired:</strong> ${overall[ -1 ].week.prerecord}</p>
          <p><strong>Sports broadcasts performed:</strong> ${overall[ -2 ].week.sports}</p>
          <p><strong>Playlists aired:</strong> ${overall[ -4 ].week.playlist}</p>
          
          <p><strong>Total on-air minutes of shows/remotes/prerecords:</strong> ${overall[ -1 ].week.showTime}</p>
          <p><strong>Total online listener minutes during shows/remotes/prerecords:</strong>: ${overall[ -1 ].week.listenerMinutes}</p>
          <p><strong>Listener to showtime ratio of shows/remotes/prerecords (higher is better):</strong> ${overall[ -1 ].week.ratio}</p>
          <p><strong>Total on-air minutes of sports broadcasts:</strong> ${overall[ -2 ].week.showTime}</p>
          <p><strong>Total online listener minutes during sports:</strong>: ${overall[ -2 ].week.listenerMinutes}</p>
          <p><strong>Listener to showtime ratio of sports (higher is better):</strong> ${overall[ -2 ].week.ratio}</p>`;

        await sails.helpers.emails.queueDjsDirectors(`Weekly Analytics Report`, body);
    }

}