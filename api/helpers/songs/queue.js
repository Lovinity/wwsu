/* global Category, Subcategory, Songs, Statemeta, sails, wait, moment */

module.exports = {

    friendlyName: 'songs.queue',

    description: 'Queue a track or tracks from a specified array of subcategories. This is designed to be used with sails.config.custom.subcats .',

    inputs: {
        subcategories: {
            type: 'ref',
            required: true,
            description: 'Array of subcategories to queue from.'
        },

        position: {
            type: 'string',
            required: true,
            isIn: ['Top', 'Bottom'],
            description: 'The track will be queued in this position in the queue: Top / Bottom'
        },

        quantity: {
            type: 'number',
            defaultsTo: 1,
            description: 'Number of tracks to queue from this subcategory. Defaults to 1.'
        },

        rules: {
            type: 'boolean',
            defaultsTo: true,
            description: 'If true (default), will check for rotation rules before queuing tracks (unless there is not enough tracks to queue given rotation rules).'
        },

        duration: {
            type: 'number',
            allowNull: true,
            description: 'The tracks queued should be of this duration in seconds, plus or minus 5 seconds, if provided.'
        },

        queue: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, this helper will not resolve until sails.helpers.rest.getQueue has confirmed this track was indeed queued.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper songs.queueFromSubcategory called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {

            // Get rid of all the null entries
            try {
                inputs.subcategories = inputs.subcategories.filter(subcategory => subcategory && subcategory !== null);
            } catch (e2) {
                inputs.subcategories = [];
            }

            // Find all applicable songs that are in the subcategory and load them in memory (have to do randomisation by Node, not by database)
            var thesongs = await Songs.find({id_subcat: inputs.subcategories, enabled: 1});
            sails.log.verbose(`Songs records retrieved: ${thesongs.length}`);
            sails.log.silly(thesongs);

            // Remove songs that are expired
            if (thesongs.length > 0)
                thesongs = thesongs.filter(thesong => moment(thesong.start_date).isSameOrBefore(moment()) && (moment(thesong.end_date).isSameOrBefore(moment("2002-01-02 00:00:02")) || moment().isBefore(moment(thesong.end_date))) && (thesong.play_limit === 0 || thesong.count_played < thesong.play_limit))

            // If duration is provided, remove songs that fail the duration check
            if (inputs.duration && inputs.duration !== null && thesongs.length > 0)
                thesongs = thesongs.filter(thesong => thesong.duration <= (inputs.duration + 5) && thesong.duration >= (inputs.duration - 5));

            if (thesongs.length > 0)
            {
                // Determine which tracks are already queued
                var queuedtracks = 0;
                var queuedtracksa = [];
                var tracks = await sails.helpers.rest.getQueue();
                tracks.map(queuedtrack => queuedtracksa.push(queuedtrack.ID));

                // Queue up the chosen tracks if they pass rotation rules, and if rules is not set to false
                if (inputs.rules)
                {
                    var thesongs2 = thesongs.filter(thesong => thesong !== 'undefined' && queuedtracksa.indexOf(thesong.ID) === -1);
                    while (queuedtracks < inputs.quantity && thesongs2.length > 0)
                    {
                        var temp = await sails.helpers.pickRandom(thesongs2, true);
                        thesongs2 = temp.newArray;
                        var thesong = temp.item;
                        if (typeof thesong.ID !== 'undefined' && await sails.helpers.songs.checkRotationRules(thesong.ID))
                        {
                            queuedtracks++;
                            sails.log.verbose(`Queued ${thesong.ID}`);
                            await sails.helpers.rest.cmd('LoadTrackTo' + inputs.position, thesong.ID);
                            if (inputs.queue)
                                await sails.helpers.rest.checkQueue(thesong.ID);
                        }
                    }
                }

                // Not enough tracks, or rules was set to false? Let's try queuing [more] tracks without rotation rules
                if (queuedtracks < inputs.quantity)
                {
                    sails.log.verbose('Not enough tracks to queue when considering rotation rules.');

                    // We want to be sure we don't queue any tracks that are already in the queue
                    var tracks = await sails.helpers.rest.getQueue();
                    queuedtracksa = [];
                    tracks.map(track => queuedtracksa.push(track.ID));

                    // Go through all the songs again without checking for rotation rules
                    var thesongs2 = thesongs.filter(thesong => thesong !== 'undefined' && queuedtracksa.indexOf(thesong.ID) === -1);
                    while (queuedtracks < inputs.quantity && thesongs2.length > 0)
                    {
                        var temp = await sails.helpers.pickRandom(thesongs2, true);
                        thesongs2 = temp.newArray;
                        var thesong = temp.item;
                        if (typeof thesong.ID !== 'undefined')
                        {
                            queuedtracks++;
                            sails.log.verbose(`Queued ${thesong.ID}`);
                            await sails.helpers.rest.cmd('LoadTrackTo' + inputs.position, thesong.ID);
                            if (inputs.queue)
                                await sails.helpers.rest.checkQueue(thesong.ID);
                        }
                    }
                }

                if (queuedtracks < inputs.quantity)
                {
                    sails.log.verbose(`Did not have enough tracks to queue.`);
                    return exits.success(false); // We could not queue the specified number of tracks when this function was called... so return false.
                } else {
                    sails.log.verbose(`Finished: Had enough tracks to queue.`);
                    return exits.success(true); // We queued the specified number of tracks, so return true.
                }
            } else {
                sails.log.verbose(`No tracks available to queue`);
                return exits.success(false);
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};

