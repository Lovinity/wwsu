/* global sails, Attendance, moment, Songsliked, Requests, Messages */

module.exports = {

    friendlyName: 'attendance.calculateStats',

    description: 'Re-calculate weekly analytics and broadcast them through the ',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper attendance.calculateStats called.');

        try {
            var earliest = moment().subtract(1, 'weeks');

            Attendance.weeklyAnalytics = {
                topShows: [],
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

            // Grab attendance records from the last 7 days which regard some form of OnAir programming
            var records = await Attendance.find({
                or: [
                    {event: {'startsWith': 'Sports:'}},
                    {event: {'startsWith': 'Show:'}},
                    {event: {'startsWith': 'Remote:'}},
                    {event: {'startsWith': 'Prerecord:'}},
                    {event: {'startsWith': 'Podcast:'}},
                ], showTime: {'!=': null}, listenerMinutes: {'!=': null}, 'actualEnd': {'>=': earliest.toISOString(true)}});

            var totals = {};

            // Go through each record of attendance and populate topShows, onAir, and onAirListeners
            records.forEach(function (attendance) {
                var show = attendance.event;
                show = show.substring(show.indexOf(": ") + 2);

                Attendance.weeklyAnalytics.onAir += attendance.showTime;
                Attendance.weeklyAnalytics.onAirListeners += attendance.listenerMinutes;

                // Group showTime and listenerMinutes by show; we only want one record per show to use when comparing top shows
                if (typeof totals[show] === 'undefined')
                    totals[show] = {showTime: 0, listenerMinutes: 0};
                totals[show].showTime += attendance.showTime;
                totals[show].listenerMinutes += attendance.listenerMinutes;
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

            // Gather the top shows into analytics
            totalsA.sort(compare).forEach(function (show, index) {
                if (index < 3)
                    Attendance.weeklyAnalytics.topShows.push(show.name);
            });

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

