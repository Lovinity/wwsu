/* global sails, Attendance, moment, Songsliked, Requests, Messages */

module.exports = {

    friendlyName: 'attendance.calculateStats',

    description: 'Re-calculate weekly analytics and broadcast them through the ',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper attendance.calculateStats called.');

        try {
            // Get stats for the last 7 days
            var earliest = moment().subtract(1, 'weeks');

            // Prepare with a clean template
            Attendance.weeklyAnalytics = {
                topShows: [],
                topGenre: 'None',
                topPlaylist: 'None',
                onAir: 0,
                onAirListeners: 0,
                tracksLiked: 0,
                tracksRequested: 0,
                webMessagesExchanged: 0
            };

            // Define compare function for sorting records;
            var compare = function (a, b) {
                var ratioA = a.showTime > 0 ? a.listenerMinutes / a.showTime : 0;
                var ratioB = b.showTime > 0 ? b.listenerMinutes / b.showTime : 0;
                if (ratioA > ratioB)
                    return -1;
                if (ratioB > ratioA)
                    return 1;
                return 0;
            };

            // Grab attendance records from the last 7 days
            var records = await Attendance.find({showTime: {'!=': null}, listenerMinutes: {'!=': null}, 'actualEnd': {'>=': earliest.toISOString(true)}});

            var totals = {};
            var totalsG = {};
            var totalsP = {};

            // Go through each record of attendance and populate topShows, onAir, and onAirListeners
            records.forEach(function (attendance) {
                var show = attendance.event;
                show = show.substring(show.indexOf(": ") + 2);

                // OnAir programming of Sports, Show, Remote, or Prerecord counts as show time.
                if (attendance.event.startsWith("Sports:") || attendance.event.startsWith("Show:") || attendance.event.startsWith("Remote:") || attendance.event.startsWith("Prerecord:"))
                {
                    Attendance.weeklyAnalytics.onAir += attendance.showTime;
                    Attendance.weeklyAnalytics.onAirListeners += attendance.listenerMinutes;

                    // Sports broadcasts should not count towards the top 3 shows
                    if (!attendance.event.startsWith("Sports:"))
                    {
                        // Group showTime and listenerMinutes by show; we only want one record per show to use when comparing top shows
                        if (typeof totals[show] === 'undefined')
                            totals[show] = {showTime: 0, listenerMinutes: 0};
                        totals[show].showTime += attendance.showTime;
                        totals[show].listenerMinutes += attendance.listenerMinutes;
                    }
                } else if (attendance.event.startsWith("Genre:"))
                {
                    if (typeof totalsG[show] === 'undefined')
                        totalsG[show] = {showTime: 0, listenerMinutes: 0};
                    totalsG[show].showTime += attendance.showTime;
                    totalsG[show].listenerMinutes += attendance.listenerMinutes;
                } else if (attendance.event.startsWith("Playlist:"))
                {
                    if (typeof totalsP[show] === 'undefined')
                        totalsP[show] = {showTime: 0, listenerMinutes: 0};
                    totalsP[show].showTime += attendance.showTime;
                    totalsP[show].listenerMinutes += attendance.listenerMinutes;
                }
            });

            // Convert our show data into an array so we can sort it
            var totalsA = [];
            for (var item in totals)
            {
                if (totals.hasOwnProperty(item))
                {
                    totalsA.push({name: item, showTime: totals[item].showTime, listenerMinutes: totals[item].listenerMinutes});
                }
            }

            // Gather the top shows into analytics. Push the first 3 into the topShows array.
            if (totalsA.length > 0)
            {
                totalsA.sort(compare).forEach(function (show, index) {
                    if (index < 3)
                        Attendance.weeklyAnalytics.topShows.push(show.name);
                });
            }

            // Convert genre data into an array so we can sort it
            var totalsA = [];
            for (var item in totalsG)
            {
                if (totalsG.hasOwnProperty(item))
                {
                    totalsA.push({name: item, showTime: totalsG[item].showTime, listenerMinutes: totalsG[item].listenerMinutes});
                }
            }
            
            // Use the first one as our top genre
            if (totalsA.length > 0)
                Attendance.weeklyAnalytics.topGenre = totalsA.sort(compare)[0].name;

            // Convert our playlist data into an array so we can sort it
            var totalsA = [];
            for (var item in totalsP)
            {
                if (totalsP.hasOwnProperty(item))
                {
                    totalsA.push({name: item, showTime: totalsP[item].showTime, listenerMinutes: totalsP[item].listenerMinutes});
                }
            }

            // Use the first one as our top playlist
            if (totalsA.length > 0)
            Attendance.weeklyAnalytics.topPlaylist = totalsA.sort(compare)[0].name;

            // Grab count of liked tracks from last week
            Attendance.weeklyAnalytics.tracksLiked = await Songsliked.count({'createdAt': {'>=': earliest.toISOString(true)}});

            // Grab count of requested tracks
            Attendance.weeklyAnalytics.tracksRequested = await Requests.count({'createdAt': {'>=': earliest.toISOString(true)}});

            // Grab count of webMessagesExchanged
            Attendance.weeklyAnalytics.webMessagesExchanged = await Messages.count({status: 'active', or: [{'from': {'startsWith': 'website'}}, {'to': {'startsWith': 'website'}}], 'createdAt': {'>=': earliest.toISOString(true)}});

            // Broadcast socket
            sails.sockets.broadcast('analytics-weekly-dj', 'analytics-weekly-dj', Attendance.weeklyAnalytics);

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};

