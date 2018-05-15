// WORK ON THIS
module.exports = {

    friendlyName: 'songs / queueFromSubcategory',

    description: 'Queue a track from a subcategory',

    inputs: {
        subcategory: {
            type: 'string',
            required: true,
            description: 'Name of the subcategory.'
        },

        category: {
            type: 'string',
            requred: true,
            description: 'Name of the parent category'
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

        // Get the parent category
        try {
            var thecategory = await Category.find({name: inputs.category}).limit(1)
                    .intercept((err) => {
                        return exits.error(err);
                    });
            var whereString = {name: inputs.subcategory};
            if (thecategory.length > 0)
            {
                whereString.parentid = thecategory[0].ID;
            } else {
                return exits.error(new Error('Category not found.'));
            }

            // Find the subcategory we are queueing a track from
            var thesubcategories = await Subcategory.find(whereString)
                    .intercept((err) => {
                        return exits.error(err);
                    });
            if (thesubcategories.length > 0)
            {
                var theids = [];
                thesubcategories.forEach(function (thesubcategory) {
                    theids.push(thesubcategory.ID);
                });

                // Find all applicable songs that are in the subcategory and load them in memory (have to do randomisation by Node, not by database)
                var thesongs = await Songs.find({id_subcat: theids})
                        .intercept((err) => {
                            return exits.error(err);
                        });

                // If duration is provided, remove songs that fail the duration check
                if (inputs.duration !== null && thesongs.length > 0)
                {
                    thesongs.forEach(function (thesong, index) {
                        if (thesong.duration > (inputs.duration + 5) || thesong.duration < (inputs.duration - 5))
                            delete thesongs[index];
                    });
                }

                if (thesongs.length > 0)
                {

                    // Randomise the list of songs
                    thesongs.sort(function (a, b) {
                        return 0.5 - Math.random()
                    });

                    var queuedtracks = 0;
                    var queuedtracksa = [];
                    Statemeta.automation.forEach(function (queuedtrack) {
                        queuedtracksa.push(queuedtrack.ID);
                    });

                    // Queue up the chosen tracks if they pass rotation rules, and if rules is not set to false
                    if (inputs.rules)
                    {
                        await sails.helpers.asyncForEach(thesongs, function (thesong) {
                            return new Promise(async (resolve, reject) => {
                                try {
                                    // Check rotation rules first
                                    var canplay = sails.helpers.songs.checkRotationRules(thesong.ID);
                                    if (canplay)
                                    {
                                        await sails.helpers.rest.cmd('LoadTrackTo' + inputs.position, thesong.ID);
                                        queuedtracks += 1;
                                        // If we reached our limit of tracks to queue, break out of the async for each loop.
                                        if (queuedtracks >= inputs.quantity)
                                        {
                                            return resolve(true);
                                        }
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
                        // We want to be sure we don't queue any tracks that are already in the queue
                        var tracks = await sails.helpers.rest.getQueue();
                        queuedtracksa = [];
                        tracks.forEach(function (track) {
                            queuedtracksa.push(track.ID)
                        });

                        // Go through all the songs again
                        await sails.helpers.asyncForEach(thesongs, function (thesong) {
                            return new Promise(async (resolve, reject) => {
                                try {
                                    if (queuedtracksa.indexOf(thesong.ID) > -1)
                                        return resolve(false);
                                    await sails.helpers.rest.cmd('LoadTrackTo' + inputs.position, thesong.ID);
                                    queuedtracks += 1;
                                    // If we reached our limit of tracks to queue, break out of the async for each loop.
                                    if (queuedtracks >= inputs.quantity)
                                    {
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
                        return exits.success(false); // We could not queue the specified number of tracks when this function was called... so return false.
                    } else {
                        return exits.success(true); // We queued the specified number of tracks, so return true.
                    }
                } else {
                    return exits.success(false);
                }
            } else {
                return exits.error(new Error('Subcategory not found'));
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};

