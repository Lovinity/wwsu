/* global Djs, Xp, Attendance, Listeners, moment */

module.exports = {

    friendlyName: 'Showtime',

    description: 'Showtime test.',

    inputs: {

    },

    fn: async function (inputs, exits) {

        var DJs = {};
        DJs[0] = {name: "EVERYONE", showtime: 0, listeners: 0};
        var records = await Djs.find();
        records.map(record => DJs[record.ID] = {name: record.name, showtime: 0, listeners: 0});

        var curDJ = null;
        var prevTime = moment("2018-10-01 00:00:00");
        var prevListeners = 0;
        var records = await Listeners.find({createdAt: {"<=": "2018-10-01 00:00:00"}}).sort("createdAt ASC");
        records
                .filter(record => moment(record.createdAt).isAfter(moment("2018-08-26 00:00:00")))
                .map(record => {
                    if (record.dj !== curDJ)
                    {
                        if (curDJ !== null)
                        {
                            if (typeof DJs[curDJ] !== 'undefined')
                            {
                                DJs[curDJ].showtime += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60);
                                DJs[curDJ].listeners += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
                                DJs[0].showtime += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60);
                                DJs[0].listeners += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
                            }
                        }
                    } else if (curDJ !== null) {
                        if (typeof DJs[record.dj] === 'undefined')
                            return;
                        DJs[record.dj].showtime += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60);
                        DJs[record.dj].listeners += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
                        DJs[0].showtime += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60);
                        DJs[0].listeners += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
                    }
                    curDJ = record.dj;
                    prevTime = moment(record.createdAt);
                    prevListeners = record.listeners;
                });

        var records = await Attendance.find();
        records
                .filter(record => record.showTime !== null && record.listenerMinutes !== null)
                .map(record => {
                    if (typeof DJs[record.DJ] === 'undefined')
                        return;
                    DJs[record.DJ].showtime += record.showTime;
                    DJs[record.DJ].listeners += (record.listenerMinutes);
                    DJs[0].showtime += record.showTime;
                    DJs[0].listeners += (record.listenerMinutes);
                });

        // All done.
        return exits.success(DJs);

    }


};
