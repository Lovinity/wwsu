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
            name: 'EVERYONE',
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

        // Get all of the DJs in the system, or the provided dj if one was provided
        var records = await Djs.find(inputs.dj ? { ID: inputs.dj } : {});

        // Return with an empty object or array if no DJs were returned
        if (records.length <= 0)
            {return exits.success(inputs.dj ? {} : []);}

        // Initialize statistics templates for every returned DJ
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
            };
        });

        // Get applicable attendance records
        var records2 = await Attendance.find({ dj: inputs.dj ? inputs.dj : { '!=': null } });

        // Initialize first parallel async function
        var process1 = async () => {
            // Calculate earned XP and remote credits
            var records = await Xp.find({ dj: inputs.dj ? inputs.dj : { '!=': null } });
            records.map((record) => {
                if (typeof DJs[record.dj] === 'undefined')
                    {return;}
                if (record.type === `xp`) {
                    DJs[record.dj].overall.xp += record.amount;
                    DJs[0].overall.xp += record.amount;
                    if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                        DJs[record.dj].semester.xp += record.amount;
                        DJs[0].semester.xp += record.amount;
                    }
                }
                if (record.type === `remote`) {
                    DJs[record.dj].overall.remoteCredits += record.amount;
                    DJs[0].overall.remoteCredits += record.amount;
                    DJs[record.dj].overall.xp += (record.amount * sails.config.custom.XP.remoteCredit);
                    DJs[0].overall.xp += (record.amount * sails.config.custom.XP.remoteCredit);

                    if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
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
                    if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                        DJs[record.dj].semester.showtime += record.showTime;
                        DJs[record.dj].semester.listeners += record.listenerMinutes;
                        DJs[0].semester.showtime += record.showTime;
                        DJs[0].semester.listeners += record.listenerMinutes;
                    }
                });
        };

        // Reputation calculations; Add 5 reputation score for every aired scheduled live/remote radio show; 2 for prerecords.
        // Subtract 1 score if the live show started 10+ minutes early or late.
        // Subtract 1 score if the live show ended 10+ minutes early or late
        // Subtract 5 score for every unignored unexcused absence (ignore = 0, happened = 0).
        // Subtract 1 score for every unignored cancellation (ignore = 0, happened = -1).
        // Subtract 2 score for every missed top of the hour ID break.
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

                    // First, subtract for missed IDs; we do not want to combine missed ID records.
                    if (record.ignore !== 2) {
                        if (record.ignore !== 1) {
                            DJs[record.dj].overall.reputationScore -= (2 * record.missedIDs);
                            DJs[0].overall.reputationScore -= (2 * record.missedIDs);
                        }
                        DJs[record.dj].overall.missedIDs += record.missedIDs;
                        DJs[0].overall.missedIDs += record.missedIDs;
                        if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                            if (record.ignore !== 1) {
                                DJs[record.dj].semester.reputationScore -= (2 * record.missedIDs);
                                DJs[0].semester.reputationScore -= (2 * record.missedIDs);
                            }
                            DJs[record.dj].semester.missedIDs += record.missedIDs;
                            DJs[0].semester.missedIDs += record.missedIDs;
                        }
                    }

                    // Now, combine records in case of accidental end show / start a new show within the same scheduled time block
                    if (record.unique !== null && record.unique !== ``) {
                        // Combine records with the same Google Calendar unique ID
                        if (record.unique in unique) {
                            if (record.actualStart !== null && (moment(record.actualStart).isBefore(moment(unique[record.unique].actualStart)) || unique[record.unique].actualStart === null))
                                {unique[record.unique].actualStart = record.actualStart;}
                            if (record.actualEnd !== null && (moment(record.actualEnd).isAfter(moment(unique[record.unique].actualEnd)) || unique[record.unique].actualEnd === null))
                                {unique[record.unique].actualEnd = record.actualEnd;}
                        } else {
                            unique[record.unique] = record;
                        }
                    } else {
                        unique[record.ID] = record;
                    }
                });

            // Now go through each attendance record after having combined them
            for (var uniqueRecord in unique) {
                if (unique.hasOwnProperty(uniqueRecord)) {
                    var record = unique[uniqueRecord];
                    if (record.actualStart !== null && record.actualEnd !== null && record.happened === 1) {
                        if (record.event.startsWith('Show: ')) {
                            attendanceIDs3.push(record.ID);
                            DJs[record.dj].overall.shows += 1;
                            DJs[0].overall.shows += 1;
                            if (record.scheduledStart !== null && record.scheduledEnd !== null) {
                                DJs[record.dj].overall.reputationScore += 5;
                                DJs[0].overall.reputationScore += 5;
                                if (Math.abs(moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes')) >= 10 && record.ignore !== 2) {
                                    if (record.ignore === 0)
                                        {DJs[record.dj].overall.reputationScore -= 1;}
                                    DJs[record.dj].overall.offStart += 1;
                                    if (record.ignore === 0)
                                        {DJs[0].overall.reputationScore -= 1;}
                                    DJs[0].overall.offStart += 1;
                                }
                                if (Math.abs(moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes')) >= 10 && record.ignore !== 2) {
                                    if (record.ignore === 0)
                                        {DJs[record.dj].overall.reputationScore -= 1;}
                                    DJs[record.dj].overall.offEnd += 1;
                                    if (record.ignore === 0)
                                        {DJs[0].overall.reputationScore -= 1;}
                                    DJs[0].overall.offEnd += 1;
                                }
                            }
                            if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                                DJs[record.dj].semester.shows += 1;
                                DJs[0].semester.shows += 1;
                                if (record.scheduledStart !== null && record.scheduledEnd !== null) {
                                    DJs[record.dj].semester.reputationScore += 5;
                                    DJs[0].semester.reputationScore += 5;
                                    if (Math.abs(moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes')) >= 10 && record.ignore !== 2) {
                                        if (record.ignore === 0)
                                            {DJs[record.dj].semester.reputationScore -= 1;}
                                        DJs[record.dj].semester.offStart += 1;
                                        if (record.ignore === 0)
                                            {DJs[0].semester.reputationScore -= 1;}
                                        DJs[0].semester.offStart += 1;
                                    }
                                    if (Math.abs(moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes')) >= 10 && record.ignore !== 2) {
                                        if (record.ignore === 0)
                                            {DJs[record.dj].semester.reputationScore -= 1;}
                                        DJs[record.dj].semester.offEnd += 1;
                                        if (record.ignore === 0)
                                            {DJs[0].semester.reputationScore -= 1;}
                                        DJs[0].semester.offEnd += 1;
                                    }
                                }
                            }
                        } else if (record.event.startsWith('Prerecord: ')) {
                            attendanceIDs3.push(record.ID);
                            DJs[record.dj].overall.prerecords += 1;
                            DJs[record.dj].overall.reputationScore += 2;
                            if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                                DJs[record.dj].semester.prerecords += 1;
                                DJs[record.dj].semester.reputationScore += 2;
                            }
                        } else if (record.event.startsWith('Remote: ')) {
                            attendanceIDs3.push(record.ID);
                            DJs[record.dj].overall.remotes += 1;
                            DJs[0].overall.remotes += 1;
                            if (record.scheduledStart !== null && record.scheduledEnd !== null) {
                                DJs[record.dj].overall.reputationScore += 5;
                                DJs[0].overall.reputationScore += 5;
                                if (Math.abs(moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes')) >= 10 && record.ignore !== 2) {
                                    if (record.ignore === 0)
                                        {DJs[record.dj].overall.reputationScore -= 1;}
                                    DJs[record.dj].overall.offStart += 1;
                                    if (record.ignore === 0)
                                        {DJs[0].overall.reputationScore -= 1;}
                                    DJs[0].overall.offStart += 1;
                                }
                                if (Math.abs(moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes')) >= 10 && record.ignore !== 2) {
                                    DJs[record.dj].overall.reputationScore -= 1;
                                    DJs[record.dj].overall.offEnd += 1;
                                    DJs[0].overall.reputationScore -= 1;
                                    DJs[0].overall.offEnd += 1;
                                }
                            }
                            if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                                DJs[record.dj].semester.remotes += 1;
                                DJs[0].semester.remotes += 1;
                                if (record.scheduledStart !== null && record.scheduledEnd !== null) {
                                    DJs[record.dj].semester.reputationScore += 5;
                                    DJs[0].semester.reputationScore += 5;
                                    if (Math.abs(moment(record.scheduledStart).diff(moment(record.actualStart), 'minutes')) >= 10 && record.ignore !== 2) {
                                        if (record.ignore === 0)
                                            {DJs[record.dj].semester.reputationScore -= 1;}
                                        DJs[record.dj].semester.offStart += 1;
                                        if (record.ignore === 0)
                                            {DJs[0].semester.reputationScore -= 1;}
                                        DJs[0].semester.offStart += 1;
                                    }
                                    if (Math.abs(moment(record.scheduledEnd).diff(moment(record.actualEnd), 'minutes')) >= 10 && record.ignore !== 2) {
                                        if (record.ignore === 0)
                                            {DJs[record.dj].semester.reputationScore -= 1;}
                                        DJs[record.dj].semester.offEnd += 1;
                                        if (record.ignore === 0)
                                            {DJs[0].semester.reputationScore -= 1;}
                                        DJs[0].semester.offEnd += 1;
                                    }
                                }
                            }
                        }
                    } else if (record.scheduledStart !== null && record.scheduledEnd !== null) {

                        // Because absences and cancellations were not differentiated until March 16, 2019, any absence records prior should only dock 1 point instead of 5
                        if (moment(record.createdAt).isBefore(moment('2019-03-16 00:00:00')) && record.ignore === 0) {
                            DJs[record.dj].overall.reputationScore -= 1;
                            DJs[0].overall.reputationScore -= 1;
                            DJs[record.dj].overall.cancellations += 1;
                            DJs[0].overall.cancellations += 1;
                        } else {
                            if (record.happened === 0 && record.ignore !== 2) {
                                if (record.ignore === 0) {
                                    DJs[record.dj].overall.reputationScore -= 5;
                                    DJs[0].overall.reputationScore -= 5;
                                }
                                DJs[record.dj].overall.absences += 1;
                                DJs[0].overall.absences += 1;
                            } else if (record.happened === -1 && record.ignore !== 2) {
                                if (record.ignore === 0) {
                                    DJs[record.dj].overall.reputationScore -= 1;
                                    DJs[0].overall.reputationScore -= 1;
                                }
                                DJs[record.dj].overall.cancellations += 1;
                                DJs[0].overall.cancellations += 1;
                            }
                        }

                        attendanceIDs2.push(record.ID);
                        if (moment(sails.config.custom.startOfSemester).isBefore(moment(record.createdAt))) {
                            // Because absences and cancellations were not differentiated until March 16, 2019, any absence records prior should only dock 1 point instead of 5
                            if (moment(record.createdAt).isBefore(moment('2019-03-16 00:00:00')) && record.ignore === 0) {
                                DJs[record.dj].semester.reputationScore -= 1;
                                DJs[0].semester.reputationScore -= 1;
                                DJs[record.dj].semester.cancellations += 1;
                                DJs[0].semester.cancellations += 1;
                            } else {
                                if (record.happened === 0 && record.ignore !== 2) {
                                    if (record.ignore === 0) {
                                        DJs[record.dj].semester.reputationScore -= 5;
                                        DJs[0].semester.reputationScore -= 5;
                                    }
                                    DJs[record.dj].semester.absences += 1;
                                    DJs[0].semester.absences += 1;
                                } else if (record.happened === -1 && record.ignore !== 2) {
                                    if (record.ignore === 0) {
                                        DJs[record.dj].semester.reputationScore -= 1;
                                        DJs[0].semester.reputationScore -= 1;
                                    }
                                    DJs[record.dj].semester.cancellations += 1;
                                    DJs[0].semester.cancellations += 1;
                                }
                            }
                        }
                    }
                }
            }
        };

        // Execute our parallel functions and wait for all of them to resolve.
        await Promise.all([process1(), process2(), process3()]);

        // Do additional final calculations
        DJs.map((dj, index) => {
            // Calculate the ratio of listeners to showtime
            DJs[index].overall.ratio = DJs[index].overall.listeners / DJs[index].overall.showtime;
            DJs[index].semester.ratio = DJs[index].semester.listeners / DJs[index].semester.showtime;

            // Calculate the reputation percent
            var maxAttendance = (DJs[index].overall.shows * 5) + (DJs[index].overall.remotes * 5) + (DJs[index].overall.prerecords * 2);
            DJs[index].overall.reputationPercent = maxAttendance > 0 && DJs[index].overall.reputationScore ? ((DJs[index].overall.reputationScore / maxAttendance) * 100).toFixed(1) : 0;
            maxAttendance = (DJs[index].semester.shows * 5) + (DJs[index].semester.remotes * 5) + (DJs[index].semester.prerecords * 2);
            DJs[index].semester.reputationPercent = maxAttendance > 0 && DJs[index].semester.reputationScore > 0 ? ((DJs[index].semester.reputationScore / maxAttendance) * 100).toFixed(1) : 0;
        });

        // If we retrieved a single DJ, exit now and return the DJ
        if (inputs.dj)
            {return exits.success(DJs[inputs.dj]);}

        // Order the array of DJs with EVERYONE first, followed by in order from greatest listener/showtime ratio to least.
        var compare = function (a, b) {
            if (a.name === 'EVERYONE')
                {return -1;}
            if (a.semester.ratio < b.semester.ratio)
                {return 1;}
            if (a.semester.ratio > b.semester.ratio)
                {return -1;}
            return 0;
        };

        DJs = DJs.sort(compare);

        // All done.
        return exits.success(DJs);

    }


};

