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
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper songs.queueFromSubcategory called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {

            // Get rid of all the null entries
            inputs.subcategories = inputs.subcategories.filter(subcategory => subcategory && subcategory !== null);

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

                // Randomise the list of songs
                thesongs = await sails.helpers.shuffle(thesongs);
                sails.log.silly(`Array shuffled. Resulting array: ${thesongs}`);

                // Determine which tracks are already queued
                var queuedtracks = 0;
                var queuedtracksa = [];
                var tracks = await sails.helpers.rest.getQueue();
                tracks.map(queuedtrack => queuedtracksa.push(queuedtrack.ID));

                // Queue up the chosen tracks if they pass rotation rules, and if rules is not set to false
                if (inputs.rules)
                {
                    thesongs = thesongs.filter(thesong => thesong !== 'undefined' && queuedtracksa.indexOf(thesong.ID) === -1);
                    var i = 0;
                    while (queuedtracks < inputs.quantity && i < thesongs.length)
                    {
                        if (await sails.helpers.songs.checkRotationRules(thesongs[i].ID))
                        {
                            queuedtracks++;
                            sails.log.verbose(`Queued ${thesongs[i].ID}`);
                            await sails.helpers.rest.cmd('LoadTrackTo' + inputs.position, thesongs[i].ID);
                        }
                        i++;
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
                    var thesongs = thesongs.filter(thesong => thesong !== 'undefined' && queuedtracksa.indexOf(thesong.ID) === -1);
                    var i = 0;
                    while (queuedtracks < inputs.quantity && i < thesongs.length)
                    {
                        queuedtracks++;
                        sails.log.verbose(`Queued ${thesongs[i].ID}`);
                        await sails.helpers.rest.cmd('LoadTrackTo' + inputs.position, thesongs[i].ID);
                        i++;
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

