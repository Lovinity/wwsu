/* global Attendance, sails, moment, Djs, Xp, Logs */

module.exports = {

    friendlyName: 'analytics / showtime',

    description: 'Get analytics about the amount of show time and listenership every DJ had since the beginning of startOfSemester.',

    inputs: {

    },

    fn: async function (inputs, exits) {

        // Initialize for every DJ in the system + one for all DJs
        var DJs = [];
        DJs[0] = {name: "EVERYONE", showtime: 0, listeners: 0, ratio: 1, xp: 0, remotes: 0};
        var records = await Djs.find();
        records.map(record => DJs[record.ID] = {name: record.name, showtime: 0, listeners: 0, ratio: 1, xp: 0, remotes: 0, shows: 0, offStart: 0, offEnd: 0, prerecords: 0, absences: 0, cancellations: 0, missedIDs: 0, attendanceScore: 0});

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

        var records = await Attendance.find({dj: {'!=': null}, createdAt: {'>=': moment(sails.config.custom.startOfSemester).toISOString(true)}});

        // Showtime and listenership calculations
        records
                .filter(record => record.dj !== null && typeof DJs[record.dj] !== 'undefined' && record.showTime !== null && record.listenerMinutes !== null)
                .map(record => {
                    DJs[record.dj].showtime += record.showTime;
                    DJs[record.dj].listeners += (record.listenerMinutes);
                    DJs[0].showtime += record.showTime;
                    DJs[0].listeners += (record.listenerMinutes);
                });

        // Attendance calculations; Add 5 attendance score for every aired scheduled live radio show; 2 for prerecords.
        // Subtract 1 score if the live show started 10+ minutes early or late.
        // Subtract 1 score if the live show ended 10+ minutes early or late
        // Subtract 5 score for every scheduled show absence (we will later add 5 back for every logged cancellation).
        var attendanceIDs = {};
        records
                .filter((record) => record.dj !== null && typeof DJs[record.dj] !== 'undefined')
                .map((record) => {
                    attendanceIDs[record.ID] = record.dj;
                    if (record.actualStart !== null && record.actualEnd !== null)
                    {
                        if (!record.event.startsWith("Prerecord: "))
                        {
                            DJs[record.dj].shows += 1;
                            if (record.scheduledStart !== null && record.scheduledEnd !== null)
                            {
                                DJs[record.dj].attendanceScore += 5;
                                if (Math.abs(moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes')) >= 10)
                                {
                                    DJs[record.dj].attendanceScore -= 1;
                                    DJs[record.dj].offStart += 1;
                                }
                                if (Math.abs(moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes')) >= 10)
                                {
                                    DJs[record.dj].attendanceScore -= 1;
                                    DJs[record.dj].offEnd += 1;
                                }
                            }
                        } else {
                            DJs[record.dj].prerecords += 1;
                            DJs[record.dj].attendanceScore += 2;
                        }
                    } else if (record.scheduledStart !== null && record.scheduledEnd !== null) {
                        DJs[record.dj].attendanceScore -= 5;
                        DJs[record.dj].absences += 1;
                    }
                });

        // Show cancellations and missed IDs
        // Add 5 attendance score for every cancellation to equalize to 0 instead of -5 like for unexcused absences.
        // Subtract 2 score for every missed top of the hour ID break.
        var records = await Logs.find({attendanceID: {'!=': null}, logtype: ["cancellation", "id"], createdAt: {'>=': moment(sails.config.custom.startOfSemester).toISOString(true)}});

        records
                .filter((record) => typeof attendanceIDs[record.attendanceID] !== `undefined`)
                .map((record) => {
                    if (record.logtype === `cancellation`)
                    {
                        DJs[attendanceIDs[record.attendanceID]].attendanceScore += 5;
                        DJs[attendanceIDs[record.attendanceID]].absences -= 1;
                        DJs[attendanceIDs[record.attendanceID]].cancellations += 1;
                    }
                    if (record.logtype === `id`)
                    {
                        DJs[attendanceIDs[record.attendanceID]].attendanceScore -= 2;
                        DJs[attendanceIDs[record.attendanceID]].missedIDs += 1;
                    }
                });


        // Compile human readable format:
        var temp = {};
        DJs.map((dj, index) => {
            var showtimeH = dj.showtime / 60;
            var listenersH = dj.listeners / 60;
            DJs[index].ratio = showtimeH / listenersH;
            temp[dj.name] = {};
            temp[dj.name]["Shows"] = `Live: ${DJs[dj].shows}; Prerecorded: ${DJs[dj].prerecords}`;
            temp[dj.name]["Show/Attendance Reputation Score"] = `${DJs[dj].attendanceScore} (Early/Late starts: ${DJs[dj].offStart}; Early/Late ends: ${DJs[dj].offEnd}; Cancellations: ${DJs[dj].cancellations}; Absences: ${DJs[dj].absences}; Missed Top-of-Hour ID Breaks: ${DJs[dj].missedIDs})`;
            temp[dj.name]["Show Time"] = `${showtimeH.toFixed(1)} hours (${dj.showtime} minutes)`;
            temp[dj.name]["Online Listener Time"] = `${listenersH.toFixed(1)} hours (${dj.listeners} minutes)`;
            temp[dj.name]["Showtime to Listener Ratio"] = DJs[index].ratio.toFixed(3);
            temp[dj.name]["XP"] = DJs[dj].xp;
            temp[dj.name]["Remote Credits"] = DJs[dj].remotes;
        });

        var compare = function (a, b) {
            if (a.ratio < b.ratio)
                return 1;
            if (a.ratio > b.ratio)
                return -1;
            return 0;
        };

        DJs = DJs.sort(compare);

        // All done.
        return exits.success({data: DJs, humanReadable: temp});

    }


};
