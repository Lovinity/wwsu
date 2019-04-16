/* global Attendance, sails, moment, Djs, Xp */

module.exports = {

    friendlyName: 'analytics / showtime',

    description: 'Get analytics about the amount of show time and listenership every DJ had since the beginning of startOfSemester.',

    inputs: {

    },

    fn: async function (inputs, exits) {

        // Initialize for every DJ in the system + one for all DJs
        var DJs = {};
        DJs[0] = {name: "EVERYONE", showtime: 0, listeners: 0, xp: 0, remotes: 0};
        var records = await Djs.find();
        records.map(record => DJs[record.ID] = {name: record.name, showtime: 0, listeners: 0, xp: 0, remotes: 0});

        // XP and remote credits
        var records = await Xp.find({createdAt: {'>=': moment(sails.config.custom.startOfSemester).toISOString(true)}});
        records.map((record) => {
            if (typeof DJs[record.dj] === 'undefined')
                return;
            if (record.type === `xp`)
            {
                DJs[record.dj].xp += record.amount;
                DJs[0].xp += record.amount;
            }
            if (record.type === `remote`)
            {
                DJs[record.dj].remotes += record.amount;
                DJs[0].remotes += record.amount;
                DJs[record.dj].xp += (record.amount * sails.config.custom.XP.remoteCredit);
                DJs[0].xp += (record.amount * sails.config.custom.XP.remoteCredit);
            }
        });

        // Showtime and listenership
        var records = await Attendance.find({createdAt: {'>=': moment(sails.config.custom.startOfSemester).toISOString(true)}});
        records
                .filter(record => record.showTime !== null && record.listenerMinutes !== null)
                .map(record => {
                    if (record.dj === null || typeof DJs[record.dj] === 'undefined')
                        return;
                    DJs[record.dj].showtime += record.showTime;
                    DJs[record.dj].listeners += (record.listenerMinutes);
                    DJs[0].showtime += record.showTime;
                    DJs[0].listeners += (record.listenerMinutes);
                });
                
        // Compile human readable format:
        var temp = ``;
        for (var dj in DJs)
        {
            if (DJs.hasOwnProperty(dj))
            {
                var showtimeH = DJs[dj].showtime / 60;
                var listenersH = DJs[dj].listeners / 60;
                temp += "\n" + `${DJs[dj].name}: ${showtimeH.toFixed(1)} show hours (${DJs[dj].showtime} minutes); ${listenersH.toFixed(1)} online listener hours (${DJs[dj].listeners} minutes); ${DJs[dj].xp} XP; ${DJs[dj].remotes} remote credits.`;
            }
        }
        
        DJs[`humanReadable`] = temp;

        // All done.
        return exits.success(DJs);

    }


};
