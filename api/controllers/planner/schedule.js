/* global Recipients, sails, Planner, Promise, _ */

module.exports = {

    friendlyName: 'Planner / schedule',

    description: 'Create a schedule',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller planner/schedule called.');
        try {

            var records = await Planner.find();

            // Bail if there are no planner records to process
            if (records.length <= 0)
                return exits.success([]);

            // First, log all of the already-final (actual) times.
            var final = [];
            records
                    .filter((record) => record.actual !== null && typeof record.actual.start !== `undefined` && typeof record.actual.end !== `undefined`)
                    .map((record) => {
                        final.push(record.actual);
                    });

            // Define an array where we will store shows we could not schedule.
            var badRecords = [];

            // Next, define a function that checks if a proposed time is available
            var isAvailable = (start, end) => {
                var available = true;
                if (final.length > 0)
                {
                    final.map((sched) => {
                        var reverse = sched.end < sched.start;

                        if (!reverse)
                        {
                            // -----
                            //   -----
                            if (start <= sched.start && end > sched.start)
                                available = false;

                            //    -----
                            // -----
                            // OR
                            //   -----
                            //  -------
                            if (start >= sched.start && start < sched.end)
                                available = false;

                            // -------
                            //  -----
                            // OR
                            // -----
                            // -----
                            if (start <= sched.start && end >= sched.end)
                                available = false;
                        } else {
                            if (start > sched.start)
                                available = false;
                            if (start < sched.end)
                                available = false;
                            if (end < start)
                                available = false;
                        }
                    });
                }

                return available;
            };

            // Group the Planner by priority
            var byPriority = [];
            records
                    .filter((record) => record.actual === null || typeof record.actual.start === `undefined` || typeof record.actual.end === `undefined`)
                    .map((record) => {
                        if (typeof byPriority[record.priority] === `undefined`)
                            byPriority[record.priority] = [];
                        byPriority[record.priority].push(record);
                    });

            // Order by priority from greatest to least by reversing the array
            byPriority = byPriority.reverse();

            // Begin the process of planning

            if (byPriority.length > 0)
            {
                byPriority.map((shows) => {
                    while (shows.length > 0)
                    {
                        // Choose a random show among the priority
                        var index = Math.floor(Math.random() * Math.floor(shows.length - 1));
                        var show = shows[index];
                        
                        sails.log.error(show);

                        if (_.isArray(show.proposal) && show.proposal.length > 0)
                        {
                            var scheduled = false;
                            var index2 = 0;
                            while (!scheduled && index2 <= show.proposal.length)
                            {
                                var proposal = show.proposal[index2];
                                if (isAvailable(proposal.start, proposal.end))
                                {
                                    scheduled = true;
                                    final.push({start: proposal.start, end: proposal.end});
                                    (async(showB, proposalB) => {
                                        await Planner.update({ID: showB.ID}, {actual: {start: proposalB.start, end: proposalB.end}}).fetch();
                                    })(show, proposal);
                                } else {
                                    index2++;
                                }
                            }
                            if (!scheduled)
                                badRecords.push(show);
                        }

                        delete shows[index];
                    }
                });
            }

            return exits.success({schedule: await Planner.find(), failed: badRecords});
        } catch (e) {
            return exits.error(e);
        }
    }


};


