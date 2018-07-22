/* global Category, Subcategory, Songs, Statemeta, sails */

module.exports = {

    friendlyName: 'songs.queueFromSubcategory',

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
        // Get the parent category
        try {

            // Find all applicable songs that are in the subcategory and load them in memory (have to do randomisation by Node, not by database)
            var thesongs = await Songs.find({id_subcat: inputs.subcategories, enabled: 1});
            sails.log.verbose(`Songs records retrieved: ${thesongs.length}`);
            sails.log.silly(thesongs);

            // If duration is provided, remove songs that fail the duration check
            if (inputs.duration !== null && thesongs.length > 0)
            {
                thesongs.forEach(function (thesong, index) {
                    if (thesong.duration > (inputs.duration + 5) || thesong.duration < (inputs.duration - 5))
                        delete thesongs[index];
                });
                sails.log.silly(`Removed duration-nonconforming tracks. Resulting array: ${thesongs}`);
            }

            if (thesongs.length > 0)
            {

                // Randomise the list of songs
                thesongs.sort(function (a, b) {
                    return 0.5 - Math.random();
                });
                sails.log.silly(`Array shuffled. Resulting array: ${thesongs}`);

                var queuedtracks = 0;
                var queuedtracksa = [];
                var tracks = await sails.helpers.rest.getQueue();
                tracks.forEach(function (queuedtrack) {
                    queuedtracksa.push(queuedtrack.ID);
                });

                // Queue up the chosen tracks if they pass rotation rules, and if rules is not set to false
                if (inputs.rules)
                {
                    await sails.helpers.asyncForEach(thesongs, function (thesong) {
                        return new Promise(async (resolve, reject) => {
                            try {
                                // Check rotation rules first
                                var canplay = await sails.helpers.songs.checkRotationRules(thesong.ID);
                                if (canplay)
                                {
                                    sails.log.verbose(`Queued ${thesong.ID}`);
                                    await sails.helpers.rest.cmd('LoadTrackTo' + inputs.position, thesong.ID);
                                    queuedtracks += 1;
                                    // If we reached our limit of tracks to queue, break out of the async for each loop.
                                    if (queuedtracks >= inputs.quantity)
                                    {
                                        sails.log.verbose(`Reached the quantity limit of tracks to queue.`);
                                        return resolve(true);
                                    }
                                    return resolve(false);
                                } else {
                                    sails.log.verbose(`Skipped ${thesong.ID}`);
                                    return resolve(false);
                                }
                            } catch (e) {
                                return reject(e);
                            }
                        });
                    });
                }

                // Not enough tracks, or rules was set to false? Let's try queuing [more] tracks without rotation rules
                if (queuedtracks < inputs.quantity)
                {
                    sails.log.verbose('Not enough tracks to queue when considering rotation rules.');
                    // We want to be sure we don't queue any tracks that are already in the queue
                    var tracks = await sails.helpers.rest.getQueue();
                    queuedtracksa = [];
                    tracks.forEach(function (track) {
                        queuedtracksa.push(track.ID);
                    });

                    // Go through all the songs again
                    await sails.helpers.asyncForEach(thesongs, function (thesong) {
                        return new Promise(async (resolve, reject) => {
                            try {
                                if (queuedtracksa.indexOf(thesong.ID) > -1)
                                {
                                    sails.log.verbose(`Skipped ${thesong.ID}: already in queue.`);
                                    return resolve(false);
                                }
                                sails.log.verbose(`Queued ${thesong.ID}`);
                                await sails.helpers.rest.cmd('LoadTrackTo' + inputs.position, thesong.ID);
                                queuedtracks += 1;
                                // If we reached our limit of tracks to queue, break out of the async for each loop.
                                if (queuedtracks >= inputs.quantity)
                                {
                                    sails.log.verbose(`Reached the quantity limit of tracks to queue.`);
                                    return resolve(true);
                                }
                                return resolve(false);
                            } catch (e) {
                                return reject(e);
                            }
                        });
                    });
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

