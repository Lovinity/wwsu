/* global Djs, Xp, Attendance, Listeners, moment, Promise */

module.exports = {

    friendlyName: 'Showtime',

    description: 'Showtime test.',

    inputs: {

    },

    fn: async function (inputs, exits) {

        var DJs = {};

        var records = await Attendance.find({createdAt: {">=": "2019-01-06 02:00:00"}});
        var maps = records
                .filter((record) => record.actualStart !== null && record.actualEnd !== null)
                .map(async (record) => {
            await Logs.update({and: [{createdAt: {">=": moment(record.actualStart).toISOString(true)}}, {createdAt: {"<": moment(record.actualEnd).toISOString(true)}}]}, {attendanceID: record.ID});
        });
        await Promise.all(maps);

        /*
         DJs[0] = {name: "EVERYONE", showtime: 0, listeners: 0};
         var records = await Djs.find();
         records.map(record => DJs[record.ID] = {name: record.name, showtime: 0, listeners: 0});
         
         var curDJ = null;
         var startTime = moment("2018-10-01 00:00:00");
         var prevTime = moment("2018-10-01 00:00:00");
         var tShowTime = 0;
         var tListenerMinutes = 0;
         var prevListeners = 0;
         var records = await Listeners.find({createdAt: {"<=": "2018-10-01 00:00:00"}}).sort("createdAt ASC");
         records
         .map(record => {
         if (record.dj !== curDJ)
         {
         if (curDJ !== null)
         {
         if (typeof DJs[curDJ] !== 'undefined')
         {
         tShowTime += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60);
         tListenerMinutes += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
         DJs[curDJ].showtime += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60);
         DJs[curDJ].listeners += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
         DJs[0].showtime += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60);
         DJs[0].listeners += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
         }
         }
         startTime = moment(record.createdAt);
         tShowTime = 0;
         tListenerMinutes = 0;
         } else if (curDJ !== null) {
         if (typeof DJs[record.dj] === 'undefined')
         return;
         tShowTime += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60);
         tListenerMinutes += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
         DJs[record.dj].showtime += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60);
         DJs[record.dj].listeners += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
         DJs[0].showtime += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60);
         DJs[0].listeners += (moment(record.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
         }
         curDJ = record.dj;
         prevTime = moment(record.createdAt);
         prevListeners = record.listeners;
         });
         */

        /*
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
         */

        // All done.
        return exits.success(DJs);

    }


};
