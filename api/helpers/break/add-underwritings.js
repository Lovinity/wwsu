var later = require('later');

module.exports = {

    friendlyName: 'break.addUnderwritings',

    description: 'Queue up any underwritings that need to be played.',

    inputs: {
        fastForwardOnly: {
            type: 'boolean',
            defaultsTo: false,
            description: `If true, we will only queue underwritings that are way behind schedule.`
        },
        quantity: {
            type: 'number',
            defaultsTo: 2,
            description: `Maximum number of underwritings to queue. Rule may be ignored if there are more than quantity number of underwritings way behind schedule.`
        }
    },

    exits: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper break.addUnderwritings called.');

        try {

            var veryBad = [];
            var bad = [];

            // Load all underwritings from memory
            var underwritings = await Underwritings.find();
            sails.log.debug(`Fetched underwritings.`);
            if (underwritings.length > 0) {
                sails.log.debug(`Received more than 0 underwritings.`);
                var toQueue = [];

                // Calculate listenerFactor, which is (peak listeners over 7 days + average listeners over 7 days) / 2
                var records = await Attendance.find({ showTime: { '!=': null }, listenerMinutes: { '!=': null }, createdAt: { '>=': moment().subtract(7, 'days').toISOString(true) } });
                var peak = 0;
                var showTime = 0;
                var listenerMinutes = 0;

                if (records.length > 0)
                    records.map((record) => {
                        if (record.showTime > 0 && record.listenerMinutes / record.showTime > peak)
                            peak = record.listenerMinutes / record.showTime;
                        showTime += record.showTime;
                        listenerMinutes += record.listenerMinutes;
                    });

                var listenerFactor = ((showTime > 0 ? listenerMinutes / showTime : 0) + peak) / 2;

                var maps = underwritings.map(async (underwriting) => {
                    sails.log.debug(`Beginning underwriting ${underwriting.ID}`);
                    // Load in the RadioDJ track pertaining to this underwriting
                    var song = await Songs.findOne({ ID: underwriting.trackID });
                    if (song) {
                        sails.log.debug(`Underwriting ${underwriting.ID}: Found song.`);
                        // Ignore this underwriting if the associated track is expired or disabled
                        if (song.enabled === 1 && moment(song.start_date).isSameOrBefore(moment()) && (moment(song.end_date).isSameOrBefore(moment("2002-01-02 00:00:02")) || moment().isBefore(moment(song.end_date))) && (song.play_limit === 0 || song.count_played < song.play_limit)) {
                            sails.log.debug(`Underwriting ${underwriting.ID}: Track enabled.`);

                            // Underwriting to be triggered manually by day of week and time
                            if (underwriting.mode.mode === 0) {
                                sails.log.debug(`Underwriting ${underwriting.ID}: Mode 0.`);

                                if (typeof underwriting.mode.show === `undefined` || underwriting.mode.show.length === 0 || underwriting.mode.show.indexOf(Meta["A"].show) !== -1) {
                                    var schedule = later.schedule(underwriting.mode.schedule);
                                    var start = moment(song.date_played).toISOString(false);
                                    var next = moment(schedule.next(1, start)).toISOString(false);
                                    var now = moment().toISOString(false);

                                    // Algorithms
                                    var ffQueue = false;
                                    if (moment(song.end_date).isAfter(moment("2002-01-01 00:00:01")) && song.play_limit > 0) {
                                        sails.log.debug(`Underwriting ${underwriting.ID}: End date and spin counts set. Using algorithm.`);
                                        var x = Object.keys(sails.config.custom.breaks).length;
                                        var y1 = moment(song.start_date).isAfter(moment("2002-01-01 00:00:01")) ? song.start_date : underwriting.createdAt;
                                        var y2 = moment(song.end_date).diff(moment(y1));
                                        var y = (y2 / 1000 / 60 / 60) * x;
                                        var z1 = moment(song.end_date).diff(moment());
                                        var z = (z1 / 1000 / 60 / 60) * x;
                                        var a = song.play_limit;
                                        var b = song.count_played;

                                        var d = b / a; // Percent of spin counts aired
                                        sails.log.debug(`Underwriting ${underwriting.ID}: percent spin counts: ${d}.`);
                                        var e = y > 0 ? (y - z) / y : 0; // percent of expected breaks completed
                                        sails.log.debug(`Underwriting ${underwriting.ID}: percent expected breaks completed: ${e}.`);
                                        var f = (e - ((1 - e) / 2)); // F factor
                                        sails.log.debug(`Underwriting ${underwriting.ID}: F factor: ${f}.`);
                                        var g = z > 0 ? (a - b) / z : 0; // Number of airs per clockwheel break required to satisfy the underwriting's requirements.
                                        sails.log.debug(`Underwriting ${underwriting.ID}: Airs per clockwheel break required: ${g}.`);
                                        if (g >= 1)
                                            bad.push(`The underwriting "${underwriting.name}" is significantly behind schedule in spin counts and will air extra times to catch up.`);

                                        if ((!inputs.fastForwardOnly && d <= f) || (inputs.fastForwardOnly && g >= 1)) {
                                            sails.log.debug(`Underwriting ${underwriting.ID}: Fast-forward queue activated.`);
                                            toQueue.push({ ID: underwriting.trackID, priority: g });
                                            ffQueue = true;
                                        }
                                    }

                                    // If the next recurrence is before the current time and the track was not already fast-forward queued, then the underwriting needs to be played.
                                    if (moment(next).isSameOrBefore(moment(now)) && !inputs.fastForwardOnly && !ffQueue) {
                                        sails.log.debug(`Underwriting ${underwriting.ID}: Regular queue activated.`);
                                        toQueue.push({ ID: underwriting.trackID, priority: g ? g : (sails.config.custom.breaks.length > 0 ? (1 / sails.config.custom.breaks.length) : 1) });
                                    }
                                } else {
                                    sails.log.debug(`Underwriting ${underwriting.ID}: Skipped; specific shows set in underwriting schedule which are not currently airing.`);
                                }

                                // Automatic queuing
                            } else if (underwriting.mode.mode === 1) {
                                sails.log.debug(`Underwriting ${underwriting.ID}: mode 1.`);

                                // No end date set
                                if (moment(song.end_date).isSameOrBefore(moment("2002-01-01 00:00:01"))) {
                                    sails.log.debug(`Underwriting ${underwriting.ID}: No end date.`);
                                    var w = underwriting.weight / 100;
                                    var x = sails.config.custom.breaks.length;
                                    var c = Listeners.memory.listeners;

                                    // Initial chance = % of all breaks in a 24-hour period that 1 break covers
                                    // We want to average 1 air per day if no online listeners are connected the entire day.
                                    var chance = x > 0 ? 1 / (24 * x) : 0;

                                    // For every listenerFactor connected online right now, add chance to itself.
                                    chance = listenerFactor > 0 ? chance + (chance * (c / listenerFactor)) : chance;

                                    // Weight chance by track priority. 0.5 = chance. 1 = double chance. 0 = 1/2 chance.
                                    if (w > 0.5)
                                        chance = chance + (chance * ((w - 0.5) * 2));
                                    if (w < 0.5)
                                        chance = chance / (1 + ((0.5 - w) * 2));

                                    // Randomly queue the underwriting.
                                    var chance = (1 + (((0.6 * w) + 0.1) * c)) / (12 * x);
                                    sails.log.debug(`Underwriting ${underwriting.ID}: Chance is ${chance}.`);
                                    if (Math.random() < chance && !inputs.fastForwardOnly) {
                                        sails.log.debug(`Underwriting ${underwriting.ID}: Regular queue.`);
                                        toQueue.push({ ID: underwriting.trackID, priority: 1 / (6 * x) });
                                    }

                                    // End date, but no spin count limit
                                } else if (song.play_limit === 0) {
                                    sails.log.debug(`Underwriting ${underwriting.ID}: End date, but no spin limit.`);
                                    var w = underwriting.weight / 100;
                                    var x = sails.config.custom.breaks.length;
                                    var c = Listeners.memory.listeners;

                                    // Initial chance = % of all breaks in a 12-hour period that 1 break covers
                                    // We want to average 2 airs per day if no online listeners are connected the entire day.
                                    var chance = x > 0 ? 1 / (12 * x) : 0;

                                    // For every listenerFactor connected online right now, add chance to itself.
                                    chance = listenerFactor > 0 ? chance + (chance * (c / listenerFactor)) : chance;

                                    // Weight chance by track priority. 0.5 = chance. 1 = double chance. 0 = 1/2 chance.
                                    if (w > 0.5)
                                        chance = chance + (chance * ((w - 0.5) * 2));
                                    if (w < 0.5)
                                        chance = chance / (1 + ((0.5 - w) * 2));

                                    sails.log.debug(`Underwriting ${underwriting.ID}: Chance is ${chance}.`);
                                    if (Math.random() < chance && !inputs.fastForwardOnly) {
                                        sails.log.debug(`Underwriting ${underwriting.ID}: Regular queue.`);
                                        toQueue.push({ ID: underwriting.trackID, priority: 1 / (3 * x) });
                                    }

                                    // Both end date and spin count limit specified
                                } else {
                                    sails.log.debug(`Underwriting ${underwriting.ID}: End date and spin limit. Using algorithm.`);
                                    var x = Object.keys(sails.config.custom.breaks).length;
                                    var y1 = moment(song.start_date).isAfter(moment("2002-01-01 00:00:01")) ? song.start_date : underwriting.createdAt;
                                    var y2 = moment(song.end_date).diff(moment(y1));
                                    var y = (y2 / 1000 / 60 / 60) * x;
                                    var z1 = moment(song.end_date).diff(moment());
                                    var z = (z1 / 1000 / 60 / 60) * x;
                                    var a = song.play_limit;
                                    var b = song.count_played;
                                    var c = Listeners.memory.listeners;

                                    var d = (b / a); // Percent of spin counts aired
                                    sails.log.debug(`Underwriting ${underwriting.ID}: Percent of spins aired: ${d}.`);
                                    var e = y > 0 ? ((y - z) / y) : 0; // Percent of expected breaks completed
                                    sails.log.debug(`Underwriting ${underwriting.ID}: Percent of expected breaks completed: ${e}. (x ${x}, y1 ${y1}, y2 ${y2}, y ${y}, z1 ${z1}, z ${z})`);
                                    var f = (e - ((1 - e) / 2)); // F factor
                                    sails.log.debug(`Underwriting ${underwriting.ID}: F factor: ${f}.`);
                                    var g = z > 0 ? (a - b) / z : 0; // Number of airs per clockwheel break required to satisfy the underwriting's requirements.
                                    sails.log.debug(`Underwriting ${underwriting.ID}: Airs per clockwheel break required: ${g}.`);
                                    if (g >= 1)
                                        bad.push(`The underwriting "${underwriting.name}" is significantly behind schedule in spin counts and will air extra times to catch up.`);

                                    // Underwriting is considered behind schedule. Do not consider online listeners in the algorithm
                                    if (d <= f) {
                                        sails.log.debug(`Underwriting ${underwriting.ID}: Behind schedule; not using online listeners.`);
                                        if ((!inputs.fastForwardOnly && Math.random() < g) || (inputs.fastForwardOnly && g >= 1)) {
                                            sails.log.debug(`Underwriting ${underwriting.ID}: Fast-forward queue.`);
                                            toQueue.push({ ID: underwriting.trackID, priority: g });
                                        }

                                        // Underwriting is reasonable within schedule. Consider online listener counts in the algorithm.
                                    } else {
                                        var h = g * (1 - (d - f)); // The further the underwriting is from being significantly behind schedule, the more we should reduce the percentile.
                                        sails.log.debug(`Underwriting ${underwriting.ID}: Reduce percentile based on how on-time underwriting is on schedule: ${h}.`);

                                        // Initial chance = h
                                        var chance = h;

                                        // For every listenerFactor connected online right now, add chance to itself.
                                        chance = listenerFactor > 0 ? chance + (chance * (c / listenerFactor)) : chance;

                                        // Ignore track priorities; they could mess up the algorithm that keeps underwritings on track

                                        sails.log.debug(`Underwriting ${underwriting.ID}: Chance: ${chance}.`);
                                        if ((!inputs.fastForwardOnly && Math.random() < chance) || (inputs.fastForwardOnly && g >= 1)) {
                                            sails.log.debug(`Underwriting ${underwriting.ID}: Queued.`);
                                            toQueue.push({ ID: underwriting.trackID, priority: g });
                                        }
                                    }
                                }
                            }
                        } else if (moment(song.end_date).isAfter(moment("2002-01-02 00:00:01")) && moment().isSameOrAfter(moment(song.end_date)) && song.play_limit > 0 && song.count_played < song.play_limit) {
                            veryBad.push(`The underwriting "${underwriting.name}" expired, but did not meet the required spin counts.`);
                            sails.log.debug(`Underwriting ${underwriting.ID}: Track disabled / expired and failed spin counts.`);
                        } else {
                            sails.log.debug(`Underwriting ${underwriting.ID}: Track disabled / expired.`);
                        }
                    } else {
                        sails.log.debug(`Underwriting ${underwriting.ID}: Did NOT find song.`);
                    }
                });

                await Promise.all(maps);

                sails.log.debug(`Finished all underwritings.`);

                // Sort toQueue by priority
                var compare = (a, b) => {
                    if (a.priority > b.priority)
                        return -1;
                    if (a.priority < b.priority)
                        return 1;
                    return 0;
                }

                // if inputs.fastForwardOnly, only queue items with a priority of 1 or more. Otherwise, queue the first quantity tracks, plus any others with a priority >= 1.
                var queueLeft = inputs.quantity;
                toQueue
                    .sort(compare)
                    .map((item) => {
                        sails.log.debug(`Checking ${item.ID}`);
                        if (item.priority >= 1 || (!inputs.fastForwardOnly && queueLeft > 0)) {
                            sails.log.debug(`Track ${item.ID} is to be queued.`);
                            queueLeft--;
                            (async (item2) => {
                                await sails.helpers.rest.cmd('LoadTrackToTop', item2.ID);
                            })(item);
                        }
                    });
            }

            sails.log.debug(`Changing statuses.`);

            // Change underwriting statuses
            if (veryBad.length > 0) {
                await Status.changeStatus([{ name: 'underwritings', label: 'Underwritings', data: veryBad.join(` `) + ` ` + bad.join(` `), status: 2 }]);
            } else if (bad.length > 0) {
                await Status.changeStatus([{ name: 'underwritings', label: 'Underwritings', data: bad.join(` `), status: 3 }]);
            } else {
                await Status.changeStatus([{ name: 'underwritings', label: 'Underwritings', data: `No underwritings are significantly behind schedule.`, status: 5 }]);
            }

            sails.log.debug(`Finished.`);

            return exits.success();
        } catch (e) {
            await Status.changeStatus([{ name: 'underwritings', label: 'Underwritings', data: `Internal Error with the underwritings system.`, status: 2 }]);
            return exits.error(e);
        }
    }


};


