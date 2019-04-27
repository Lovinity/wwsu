/* global Attendance, sails, moment, Djs, Xp, Logs, Promise */

module.exports = {

    friendlyName: 'analytics.showtime',

    description: 'Get analytics about the amount of show time and listenership every DJ had since the beginning of startOfSemester.',

    inputs: {
        dj: {
            type: 'number',
            required: false,
            description: `Provide the ID of a dj if you only want showtime records for a specific DJ.`
        }
    },

    fn: async function (inputs, exits) {

        // Initialize for every DJ in the system + one for all DJs
        var DJs = [];
        DJs[0] = {
            name: "EVERYONE",
            semester: {
                showtime: 0,
                listeners: 0,
                ratio: 1,
                xp: 0,
                remoteCredits: 0,
                shows: 0,
                prerecords: 0,
                remotes: 0,
                offStart: 0,
                offEnd: 0,
                absences: 0,
                cancellations: 0,
                missedIDs: 0,
                reputationScore: 0,
                reputationPercent: 0
            },
            overall: {
                showtime: 0,
                listeners: 0,
                ratio: 1,
                xp: 0,
                remoteCredits: 0,
                shows: 0,
                prerecords: 0,
                remotes: 0,
                offStart: 0,
                offEnd: 0,
                absences: 0,
                cancellations: 0,
                missedIDs: 0,
                reputationScore: 0,
                reputationPercent: 0
            }
        };
        var records = await Djs.find(inputs.dj ? {ID: inputs.dj} : {});

        if (records.length <= 0)
            return exits.success(inputs.dj ? {} : []);

        records.map(record => {
            DJs[record.ID] = {
                name: record.name,
                semester: {
                    showtime: 0,
                    listeners: 0,
                    ratio: 1,
                    xp: 0,
                    remoteCredits: 0,
                    shows: 0,
                    prerecords: 0,
                    remotes: 0,
                    offStart: 0,
                    offEnd: 0,
                    absences: 0,
                    cancellations: 0,
                    missedIDs: 0,
                    reputationScore: 0,
                    reputationPercent: 0
                },
                overall: {
                    showtime: 0,
                    listeners: 0,
                    ratio: 1,
                    xp: 0,
                    remoteCredits: 0,
                    shows: 0,
                    prerecords: 0,
                    remotes: 0,
                    offStart: 0,
                    offEnd: 0,
                    absences: 0,
                    cancellations: 0,
                    missedIDs: 0,
                    reputationScore: 0,
                    reputationPercent: 0
                }
            }
        });

        // Initialize our parallel async functions
        var records2 = await Attendance.find({dj: inputs.dj ? inputs.dj : {'!=': null}});

        var process1 = async () => {
            // XP and remote credits
            var records = await Xp.find({dj: inputs.dj ? inputs.dj : {'!=': null}});
            records.map((record) => {
                if (typeof DJs[record.dj] === 'undefined')
                    return;
                if (record.type === `xp`)
                {
                    DJs[record.dj].overall.xp += record.amount;
                    DJs[0].overall.xp += record.amount;
                    if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt)))
                    {
                        DJs[record.dj].semester.xp += record.amount;
                        DJs[0].semester.xp += record.amount;
                    }
                }
                if (record.type === `remote`)
                {
                    DJs[record.dj].overall.remoteCredits += record.amount;
                    DJs[0].overall.remoteCredits += record.amount;
                    DJs[record.dj].overall.xp += (record.amount * sails.config.custom.XP.remoteCredit);
                    DJs[0].overall.xp += (record.amount * sails.config.custom.XP.remoteCredit);

                    if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt)))
                    {
                        DJs[record.dj].semester.remoteCredits += record.amount;
                        DJs[0].semester.remoteCredits += record.amount;
                        DJs[record.dj].semester.xp += (record.amount * sails.config.custom.XP.remoteCredit);
                        DJs[0].semester.xp += (record.amount * sails.config.custom.XP.remoteCredit);
                    }
                }
            });
        };

        var process2 = async () => {
            // Showtime and listenership calculations
            records2
                    .filter(record => record.dj !== null && typeof DJs[record.dj] !== 'undefined' && record.showTime !== null && record.listenerMinutes !== null)
                    .map(record => {
                        DJs[record.dj].overall.showtime += record.showTime;
                        DJs[record.dj].overall.listeners += record.listenerMinutes;
                        DJs[0].overall.showtime += record.showTime;
                        DJs[0].overall.listeners += record.listenerMinutes;
                        if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt)))
                        {
                            DJs[record.dj].semester.showtime += record.showTime;
                            DJs[record.dj].semester.listeners += record.listenerMinutes;
                            DJs[0].semester.showtime += record.showTime;
                            DJs[0].semester.listeners += record.listenerMinutes;
                        }
                    });
        };

        // Attendance calculations; Add 5 reputation score for every aired scheduled live radio show; 2 for prerecords.
        // Subtract 1 score if the live show started 10+ minutes early or late.
        // Subtract 1 score if the live show ended 10+ minutes early or late
        // Subtract 5 score for every scheduled show absence (we will later add 5 back for every logged cancellation).
        // Combine records with the same Google Calendar unique ID as one show. That way, accidental sign-offs sign-ons are not counted as two separate shows.
        var process3 = async () => {
            var attendanceIDs = {};
            var attendanceIDs2 = [];
            var attendanceIDs3 = [];
            var unique = {};

            records2
                    .filter((record) => record.dj !== null && typeof DJs[record.dj] !== 'undefined')
                    .map((record) => {
                        attendanceIDs[record.ID] = record.dj;
                        if (record.unique !== null)
                        {
                            // Combine records with the same Google Calendar unique ID
                            if (record.unique in unique)
                            {
                                if (record.actualStart !== null && (moment(record.actualStart).isBefore(moment(unique[record.unique].actualStart)) || unique[record.unique].actualStart === null))
                                    unique[record.unique].actualStart = record.actualStart;
                                if (record.actualEnd !== null && (moment(record.actualEnd).isAfter(moment(unique[record.unique].actualEnd)) || unique[record.unique].actualEnd === null))
                                    unique[record.unique].actualEnd = record.actualEnd;
                            } else {
                                unique[record.unique] = record;
                            }
                        } else {
                            unique[record.ID] = record;
                        }
                    });

            // Now go through each attendance record after having combined them
            for (var uniqueRecord in unique)
            {
                if (unique.hasOwnProperty(uniqueRecord))
                {
                    var record = unique[uniqueRecord];
                    if (record.actualStart !== null && record.actualEnd !== null)
                    {
                        if (record.event.startsWith("Show: "))
                        {
                            attendanceIDs3.push(record.ID);
                            DJs[record.dj].overall.shows += 1;
                            DJs[0].overall.shows += 1;
                            if (record.scheduledStart !== null && record.scheduledEnd !== null)
                            {
                                DJs[record.dj].overall.reputationScore += 5;
                                DJs[0].overall.reputationScore += 5;
                                if (Math.abs(moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes')) >= 10)
                                {
                                    DJs[record.dj].overall.reputationScore -= 1;
                                    DJs[record.dj].overall.offStart += 1;
                                    DJs[0].overall.reputationScore -= 1;
                                    DJs[0].overall.offStart += 1;
                                }
                                if (Math.abs(moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes')) >= 10)
                                {
                                    DJs[record.dj].overall.reputationScore -= 1;
                                    DJs[record.dj].overall.offEnd += 1;
                                    DJs[0].overall.reputationScore -= 1;
                                    DJs[0].overall.offEnd += 1;
                                }
                            }
                            if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt)))
                            {
                                DJs[record.dj].semester.shows += 1;
                                DJs[0].semester.shows += 1;
                                if (record.scheduledStart !== null && record.scheduledEnd !== null)
                                {
                                    DJs[record.dj].semester.reputationScore += 5;
                                    DJs[0].semester.reputationScore += 5;
                                    if (Math.abs(moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes')) >= 10)
                                    {
                                        DJs[record.dj].semester.reputationScore -= 1;
                                        DJs[record.dj].semester.offStart += 1;
                                        DJs[0].semester.reputationScore -= 1;
                                        DJs[0].semester.offStart += 1;
                                    }
                                    if (Math.abs(moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes')) >= 10)
                                    {
                                        DJs[record.dj].semester.reputationScore -= 1;
                                        DJs[record.dj].semester.offEnd += 1;
                                        DJs[0].semester.reputationScore -= 1;
                                        DJs[0].semester.offEnd += 1;
                                    }
                                }
                            }
                        } else if (record.event.startsWith("Prerecord: "))
                        {
                            attendanceIDs3.push(record.ID);
                            DJs[record.dj].overall.prerecords += 1;
                            DJs[record.dj].overall.reputationScore += 2;
                            if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt)))
                            {
                                DJs[record.dj].semester.prerecords += 1;
                                DJs[record.dj].semester.reputationScore += 2;
                            }
                        } else if (record.event.startsWith("Remote: "))
                        {
                            attendanceIDs3.push(record.ID);
                            DJs[record.dj].overall.remotes += 1;
                            DJs[0].overall.remotes += 1;
                            if (record.scheduledStart !== null && record.scheduledEnd !== null)
                            {
                                DJs[record.dj].overall.reputationScore += 5;
                                DJs[0].overall.reputationScore += 5;
                                if (Math.abs(moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes')) >= 10)
                                {
                                    DJs[record.dj].overall.reputationScore -= 1;
                                    DJs[record.dj].overall.offStart += 1;
                                    DJs[0].overall.reputationScore -= 1;
                                    DJs[0].overall.offStart += 1;
                                }
                                if (Math.abs(moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes')) >= 10)
                                {
                                    DJs[record.dj].overall.reputationScore -= 1;
                                    DJs[record.dj].overall.offEnd += 1;
                                    DJs[0].overall.reputationScore -= 1;
                                    DJs[0].overall.offEnd += 1;
                                }
                            }
                            if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt)))
                            {
                                DJs[record.dj].semester.remotes += 1;
                                DJs[0].semester.remotes += 1;
                                if (record.scheduledStart !== null && record.scheduledEnd !== null)
                                {
                                    DJs[record.dj].semester.reputationScore += 5;
                                    DJs[0].semester.reputationScore += 5;
                                    if (Math.abs(moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes')) >= 10)
                                    {
                                        DJs[record.dj].semester.reputationScore -= 1;
                                        DJs[record.dj].semester.offStart += 1;
                                        DJs[0].semester.reputationScore -= 1;
                                        DJs[0].semester.offStart += 1;
                                    }
                                    if (Math.abs(moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes')) >= 10)
                                    {
                                        DJs[record.dj].semester.reputationScore -= 1;
                                        DJs[record.dj].semester.offEnd += 1;
                                        DJs[0].semester.reputationScore -= 1;
                                        DJs[0].semester.offEnd += 1;
                                    }
                                }
                            }
                        }
                    } else if (record.scheduledStart !== null && record.scheduledEnd !== null) {

                        // Because absences and cancellations were not differentiated until March 16, 2019, any absence records prior should only dock 1 point instead of 5
                        if (moment(record.createdAt).isBefore(moment("2019-03-16 00:00:00")))
                        {
                            DJs[record.dj].overall.reputationScore -= 1;
                            DJs[0].overall.reputationScore -= 1;
                        } else {
                            DJs[record.dj].overall.reputationScore -= 5;
                            DJs[0].overall.reputationScore -= 5;
                        }

                        DJs[record.dj].overall.absences += 1;
                        DJs[0].overall.absences += 1;
                        attendanceIDs2.push(record.ID);
                        if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt)))
                        {
                            // Because absences and cancellations were not differentiated until March 16, 2019, any absence records prior should only dock 1 point instead of 5
                            if (moment(record.createdAt).isBefore(moment("2019-03-16 00:00:00")))
                            {
                                DJs[record.dj].semester.reputationScore -= 1;
                                DJs[0].semester.reputationScore -= 1;
                            } else {
                                DJs[record.dj].semester.reputationScore -= 5;
                                DJs[0].semester.reputationScore -= 5;
                            }
                            DJs[record.dj].semester.absences += 1;
                            DJs[0].semester.absences += 1;
                        }
                    }
                }
            }

            // Show cancellations and missed IDs
            // Add 5 attendance score for every cancellation to equalize to 0 instead of -5 like for unexcused absences.
            // Subtract 2 score for every missed top of the hour ID break.
            var records3 = await Logs.find({or: [{attendanceID: attendanceIDs2, logtype: "cancellation"}, {attendanceID: attendanceIDs3, logtype: "id"}]});
            records3
                    .filter((record) => typeof attendanceIDs[record.attendanceID] !== `undefined`)
                    .map((record) => {
                        if (record.logtype === `cancellation`)
                        {
                            // Because absences and cancellations were not differentiated until March 16, 2019, any absence records prior should only dock 1 point instead of 5
                            if (moment(record.createdAt).isBefore(moment("2019-03-16 00:00:00")))
                            {
                                DJs[attendanceIDs[record.attendanceID]].overall.reputationScore += 1;
                                DJs[0].overall.reputationScore += 1;
                            } else {
                                DJs[attendanceIDs[record.attendanceID]].overall.reputationScore += 5;
                                DJs[0].overall.reputationScore += 5;
                            }
                            DJs[attendanceIDs[record.attendanceID]].overall.absences -= 1;
                            DJs[attendanceIDs[record.attendanceID]].overall.cancellations += 1;
                            DJs[0].overall.absences -= 1;
                            DJs[0].overall.cancellations += 1;
                            if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt)))
                            {
                                // Because absences and cancellations were not differentiated until March 16, 2019, any absence records prior should only dock 1 point instead of 5
                                if (moment(record.createdAt).isBefore(moment("2019-03-16 00:00:00")))
                                {
                                    DJs[attendanceIDs[record.attendanceID]].semester.reputationScore += 1;
                                    DJs[0].overall.reputationScore += 1;
                                } else {
                                    DJs[attendanceIDs[record.attendanceID]].semester.reputationScore += 5;
                                    DJs[0].overall.reputationScore += 5;
                                }
                                DJs[attendanceIDs[record.attendanceID]].semester.absences -= 1;
                                DJs[attendanceIDs[record.attendanceID]].semester.cancellations += 1;
                                DJs[0].semester.absences -= 1;
                                DJs[0].semester.cancellations += 1;
                            }
                        }
                        if (record.logtype === `id`)
                        {
                            DJs[attendanceIDs[record.attendanceID]].overall.reputationScore -= 2;
                            DJs[attendanceIDs[record.attendanceID]].overall.missedIDs += 1;
                            DJs[0].overall.reputationScore -= 2;
                            DJs[0].overall.missedIDs += 1;
                            if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt)))
                            {
                                DJs[attendanceIDs[record.attendanceID]].semester.reputationScore -= 2;
                                DJs[attendanceIDs[record.attendanceID]].semester.missedIDs += 1;
                                DJs[0].semester.reputationScore -= 2;
                                DJs[0].semester.missedIDs += 1;
                            }
                        }
                    });
        };

        await Promise.all([process1(), process2(), process3()]);

        DJs.map((dj, index) => {
            DJs[index].overall.ratio = DJs[index].overall.listeners / DJs[index].overall.showtime;
            DJs[index].semester.ratio = DJs[index].semester.listeners / DJs[index].semester.showtime;

            var maxAttendance = (DJs[index].overall.shows * 5) + (DJs[index].overall.remotes * 5) + (DJs[index].overall.prerecords * 2) + (DJs[index].overall.cancellations);
            DJs[index].overall.reputationPercent = maxAttendance > 0 && DJs[index].overall.reputationScore ? ((DJs[index].overall.reputationScore / maxAttendance) * 100).toFixed(1) : 0;

            var maxAttendance = (DJs[index].semester.shows * 5) + (DJs[index].semester.remotes * 5) + (DJs[index].semester.prerecords * 2) + (DJs[index].semester.cancellations);
            DJs[index].semester.reputationPercent = maxAttendance > 0 && DJs[index].semester.reputationScore > 0 ? ((DJs[index].semester.reputationScore / maxAttendance) * 100).toFixed(1) : 0;

        });

        var compare = function (a, b) {
            if (a.name === "EVERYONE")
                return -1;
            if (a.semester.ratio < b.semester.ratio)
                return 1;
            if (a.semester.ratio > b.semester.ratio)
                return -1;
            return 0;
        };

        DJs = DJs.sort(compare);

        // All done.
        return exits.success(DJs);

    }


};

