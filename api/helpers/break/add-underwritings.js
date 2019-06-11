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

            if (underwritings.length > 0) {
                var toQueue = [];
                var maps = underwritings.map(async (underwriting) => {

                    // Load in the RadioDJ track pertaining to this underwriting
                    var song = await Songs.findOne({ ID: underwriting.trackID });
                    if (song) {

                        // Ignore this underwriting if the associated track is expired or disabled
                        if (song.enabled === 1 && moment(song.start_date).isSameOrBefore(moment()) && (moment(song.end_date).isSameOrBefore(moment("2002-01-02 00:00:02")) || moment().isBefore(moment(song.end_date))) && (song.play_limit === 0 || song.count_played < song.play_limit)) {

                            // Underwriting to be triggered manually by day of week and time
                            if (underwriting.mode.mode === 0) {
                                var schedule = later.schedule(underwriting.mode.schedule);
                                var start = moment(song.date_played).toISOString(false);
                                var next = moment(schedule.next(1, start)).toISOString(false);
                                var now = moment().toISOString(false);

                                // Algorithms
                                var ffQueue = false;
                                if (moment(song.end_date).isAfter(moment("2002-01-01 00:00:01")) && song.play_limit > 0) {
                                    var x = sails.config.custom.breaks.length;
                                    var y1 = moment(song.start_date).isAfter(moment("2002-01-01 00:00:01")) ? song.start_date : underwriting.createdAt;
                                    var y2 = moment(song.end_date).diff(moment(y1));
                                    var y = (y2 / 1000 / 60 / 60) * x;
                                    var z1 = moment(song.end_date).diff(moment());
                                    var z = (z1 / 1000 / 60 / 60) * x;
                                    var a = song.play_limit;
                                    var b = song.count_played;

                                    var d = b / a; // Percent of spin counts aired
                                    var e = (y - z) / y; // percent of expected breaks completed
                                    var f = (e - ((1 - e) / 2)); // F factor
                                    var g = (a - b) / z; // Number of airs per clockwheel break required to satisfy the underwriting's requirements.
                                    if (g >= 1)
                                        bad.push(`The underwriting "${underwriting.name}" is significantly behind schedule in spin counts and will air extra times to catch up.`);

                                    if ((!inputs.fastForwardOnly && d <= f) || (inputs.fastForwardOnly && g >= 1)) {
                                        toQueue.push({ ID: underwriting.trackID, priority: g });
                                        ffQueue = true;
                                    }
                                }

                                // If the next recurrence is before the current time and the track was not already fast-forward queued, then the underwriting needs to be played.
                                if (moment(next).isSameOrBefore(moment(now)) && !inputs.fastForwardOnly && !ffQueue) {
                                    toQueue.push({ ID: underwriting.trackID, priority: g ? g : (sails.config.custom.breaks.length > 0 ? (1 / sails.config.custom.breaks.length) : 1) });
                                }

                                // Automatic queuing
                            } else if (underwriting.mode.mode === 1) {

                                // No end date set
                                if (moment(song.end_date).isSameOrBefore(moment("2002-01-01 00:00:01"))) {
                                    var x = sails.config.custom.breaks.length;
                                    var c = Listeners.memory.listeners;

                                    // Randomly queue the underwriting; the more online listeners currently connected, the higher chance there is this underwriting will play.
                                    var chance = (1 + (0.3 * c)) / (12 * x);
                                    if (Math.random() < chance && !inputs.fastForwardOnly) {
                                        toQueue.push({ ID: underwriting.trackID, priority: 1 / (6 * x) });
                                    }

                                    // End date, but no spin count limit
                                } else if (song.play_limit === 0) {
                                    var x = sails.config.custom.breaks.length;
                                    var c = Listeners.memory.listeners;

                                    // Randomly queue the underwriting; the more online listeners currently connected, the higher chance there is this underwriting will play.
                                    // Underwritings with an end date set have 2x the queuing priority of those without an end date set
                                    var chance = (1 + (0.3 * c)) / (12 * x);
                                    if (Math.random() < chance && !inputs.fastForwardOnly) {
                                        toQueue.push({ ID: underwriting.trackID, priority: 1 / (3 * x) });
                                    }

                                    // Both end date and spin count limit specified
                                } else {
                                    var x = sails.config.custom.breaks.length;
                                    var y1 = moment(song.start_date).isAfter(moment("2002-01-01 00:00:01")) ? song.start_date : underwriting.createdAt;
                                    var y2 = moment(song.end_date).diff(moment(y1));
                                    var y = (y2 / 1000 / 60 / 60) * x;
                                    var z1 = moment(song.end_date).diff(moment());
                                    var z = (z1 / 1000 / 60 / 60) * x;
                                    var a = song.play_limit;
                                    var b = song.count_played;
                                    var c = Listeners.memory.listeners;

                                    var d = (b / a); // Percent of spin counts aired
                                    var e = ((y - z) / y); // Percent of expected breaks completed
                                    var f = (e - ((1 - e) / 2)); // F factor
                                    var g = (a - b) / z; // Number of airs per clockwheel break required to satisfy the underwriting's requirements.
                                    if (g >= 1)
                                        bad.push(`The underwriting "${underwriting.name}" is significantly behind schedule in spin counts and will air extra times to catch up.`);

                                    // Underwriting is considered behind schedule. Do not consider online listeners in the algorithm
                                    if (d <= f) {
                                        if ((!inputs.fastForwardOnly && Math.random() < g) || (inputs.fastForwardOnly && g >= 1)) {
                                            toQueue.push({ ID: underwriting.trackID, priority: g });
                                        }

                                        // Underwriting is reasonable within schedule. Consider online listener counts in the algorithm.
                                    } else {
                                        var h = g * (1 - (d - f)); // The further the underwriting is from being significantly behind schedule, the more we should reduce the percentile.
                                        var i = (g / 10); // Increase the chance of queuing the underwriting by g% for every 10 online listeners connected.
                                        var chance = (h + (i * c));
                                        if ((!inputs.fastForwardOnly && Math.random() < chance) || (inputs.fastForwardOnly && g >= 1)) {
                                            toQueue.push({ ID: underwriting.trackID, priority: g });
                                        }
                                    }
                                }
                            }
                        } else if (moment(song.end_date).isAfter(moment("2002-01-02 00:00:01")) && moment().isSameOrAfter(moment(song.end_date)) && song.play_limit > 0 && song.count_played < song.play_limit) {
                            veryBad.push(`The underwriting "${underwriting.name}" expired, but did not meet the required spin counts.`);
                        }
                    }
                });

                await Promise.all(maps);

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
                        if (item.priority >= 1 || (!inputs.fastForwardOnly && queueLeft > 0)) {
                            queueLeft--;
                            (async (item2) => {
                                await sails.helpers.rest.cmd('LoadTrackToTop', item.ID);
                            })(item);
                        }
                    });
            }

            // Change underwriting statuses
            if (veryBad.length > 0) {
                await Status.changeStatus([{ name: 'underwritings', label: 'Underwritings', data: veryBad.join(` `) + ` ` + bad.join(` `), status: 2 }]);
            } else if (bad.length > 0) {
                await Status.changeStatus([{ name: 'underwritings', label: 'Underwritings', data: bad.join(` `), status: 3 }]);
            } else {
                await Status.changeStatus([{ name: 'underwritings', label: 'Underwritings', data: `No underwritings are significantly behind schedule.`, status: 5 }]);
            }

            return exits.success();
        } catch (e) {
            await Status.changeStatus([{ name: 'underwritings', label: 'Underwritings', data: `Internal Error with the underwritings system.`, status: 2 }]);
            return exits.error(e);
        }
    }


};


