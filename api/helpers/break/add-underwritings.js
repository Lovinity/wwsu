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

                var avgListeners = (showTime > 0 ? listenerMinutes / showTime : 0);
                var listenerFactor = (avgListeners + peak) / 2;

                sails.log.debug(`avgListeners: ${avgListeners}`);
                sails.log.debug(`listenerFactor: ${listenerFactor}`);

                // Set up other variables that do not need re-loading on each underwriting check
                var now = moment().toISOString(false);
                var x = Object.keys(sails.config.custom.breaks).length;
                var c = Listeners.memory.listeners;

                var maps = underwritings.map(async (underwriting) => {
                    sails.log.debug(`Beginning underwriting ${underwriting.ID}`);
                    // Load in the RadioDJ track pertaining to this underwriting
                    var song = await Songs.findOne({ ID: underwriting.trackID });
                    if (song) {
                        sails.log.debug(`Underwriting ${underwriting.ID}: Found song.`);
                        // Ignore this underwriting if the associated track is expired or disabled
                        if (song.enabled === 1 && moment(song.start_date).isSameOrBefore(moment()) && (moment(song.end_date).isSameOrBefore(moment("2002-01-02 00:00:02")) || moment().isBefore(moment(song.end_date))) && (song.play_limit === 0 || song.count_played < song.play_limit)) {
                            sails.log.debug(`Underwriting ${underwriting.ID}: Track enabled.`);

                            // The "minute" portion of every underwriting schedule should correspond with the clockwheel breaks
                            underwriting.mode.schedule.schedules.map((schedule, index) => {
                                if (typeof underwriting.mode.schedule.schedules[index].m === `undefined`)
                                    underwriting.mode.schedule.schedules[index].m = [];
                                for (var minute in sails.config.custom.breaks) {
                                    if (sails.config.custom.breaks.hasOwnProperty(minute)) {
                                        underwriting.mode.schedule.schedules[index].m.push(minute);
                                    }
                                }
                            });

                            if (typeof underwriting.mode.show === `undefined` || underwriting.mode.show.length === 0 || underwriting.mode.show.indexOf(Meta["A"].show) !== -1) {
                                var schedule = later.schedule(underwriting.mode.schedule);
                                var start = moment(song.date_played).toISOString(false);
                                var next = moment(schedule.next(1, start)).toISOString(false);

                                // Algorithms
                                var ffQueue = false;
                                var w = underwriting.weight / 100;
                                var a = song.play_limit;
                                var b = song.count_played;
                                var chance = 0;

                                // If end date and spin counts are set, use advanced algorithms to ensure all airs complete on time.
                                if (moment(song.end_date).isAfter(moment("2002-01-01 00:00:01")) && song.play_limit > 0) {
                                    var y1 = moment(song.start_date).isAfter(moment("2002-01-01 00:00:01")) ? song.start_date : underwriting.createdAt;
                                    var y2 = moment(song.end_date).diff(moment(y1));
                                    var y = (y2 / 1000 / 60 / 60) * x;
                                    var z1 = moment(song.end_date).diff(moment());
                                    var z = (z1 / 1000 / 60 / 60) * x;

                                    sails.log.debug(`Underwriting ${underwriting.ID}: End date and spin counts set. Using algorithm.`);
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
                                    } else {
                                        var h = g * (1 - (d - f)); // The further the underwriting is from being significantly behind schedule, the more we should reduce the percentile.

                                        chance = h;

                                        // If mode = 1, then account online listeners in the algorithm
                                        if (underwriting.mode.mode === 1) {
                                            // If there are less than average number of listeners connected, decrease chance by a max of 50% of itself.
                                            if (c < avgListeners) {
                                                chance -= avgListeners > 0 ? ((chance / 2) * ((avgListeners - c) / avgListeners)) : 0;
                                                // Otherwise, add chance to itself for every listenerFactor number of listeners connected.
                                            } else {
                                                chance = listenerFactor > 0 ? chance + (chance * (c / listenerFactor)) : chance;
                                            }
                                        }

                                        sails.log.debug(`Underwriting ${underwriting.ID}: Chance is ${chance}`);

                                        // If the next recurrence is before the current time and the track was not already fast-forward queued, then the underwriting needs to be played.
                                        if (moment(next).isSameOrBefore(moment(now)) && !inputs.fastForwardOnly && !ffQueue && Math.random() < chance) {
                                            sails.log.debug(`Underwriting ${underwriting.ID}: Regular queue activated.`);
                                            toQueue.push({ ID: underwriting.trackID, priority: g ? g : (x > 0 ? (1 / x) : 1) });
                                        } else {
                                            sails.log.debug(`Underwriting ${underwriting.ID}: Skipped; chance condition not met for this break.`);
                                        }
                                    }
                                    // All other conditions
                                } else {
                                    // Count the number of breaks in a week selected in the schedule
                                    var total = 0;
                                    underwriting.mode.schedule.schedules.map((schedule, index) => {
                                        var dws = 0;
                                        var hs = 0;
                                        var ms = 0;
                                        if (typeof schedule.dw === `undefined` || schedule.dw.length === 0) {
                                            dws = 7;
                                        } else {
                                            dws = schedule.dw.length;
                                        }

                                        if (typeof schedule.h === `undefined` || schedule.h.length === 0) {
                                            hs = 24;
                                        } else {
                                            hs = schedule.h.length;
                                        }

                                        if (typeof schedule.m === `undefined` || schedule.m.length === 0) {
                                            ms = x;
                                        } else {
                                            ms = schedule.m.length;
                                        }

                                        total += (dws * hs * ms);
                                    });

                                    // Divide by 7 to get average breaks in a day
                                    total = total / 7;

                                    sails.log.debug(`Underwriting ${underwriting.ID}: average breaks in a day is ${total}.`);

                                    var v = moment(song.end_date).isAfter(moment("2002-01-01 00:00:01"));

                                    // Initial chance: 2x % of breaks in a day (4x if end date is set) for one break.
                                    // We want to average 2 airs per day, 4 if end date is set, for tracks with no spin limit.
                                    var chance = v ? 1 / (total / 4) : 1 / (total / 2);

                                    sails.log.debug(`Underwriting ${underwriting.ID}: Initial chance is ${chance}.`);

                                    // If mode = 1, then account online listeners in the algorithm
                                    if (underwriting.mode.mode === 1) {
                                        // If there are less than average number of listeners connected, decrease chance by a max of 50% of itself.
                                        if (c < avgListeners) {
                                            chance -= avgListeners > 0 ? ((chance / 2) * ((avgListeners - c) / avgListeners)) : 0;
                                            // Otherwise, add chance to itself for every listenerFactor number of listeners connected.
                                        } else {
                                            chance = listenerFactor > 0 ? chance + (chance * (c / listenerFactor)) : chance;
                                        }
                                    }

                                    // Weight chance by track priority. 0.5 = chance. 1 = double chance. 0 = 1/2 chance.
                                    if (w > 0.5)
                                        chance = chance + (chance * ((w - 0.5) * 2));
                                    if (w < 0.5)
                                        chance = chance / (1 + ((0.5 - w) * 2));

                                    sails.log.debug(`Underwriting ${underwriting.ID}: Final chance is ${chance}`);

                                    // Determine if we are to queue. If so, priority of queue is based on number of potential queues today
                                    if (moment(next).isSameOrBefore(moment(now)) && !inputs.fastForwardOnly && !ffQueue && Math.random() < chance) {
                                        sails.log.debug(`Underwriting ${underwriting.ID}: Regular queue.`);
                                        toQueue.push({ ID: underwriting.trackID, priority: total > 0 && x > 0 ? 1 / (total / x) : 0 });
                                    } else {
                                        sails.log.debug(`Underwriting ${underwriting.ID}: Skipped; chance condition not met for this break.`);
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


