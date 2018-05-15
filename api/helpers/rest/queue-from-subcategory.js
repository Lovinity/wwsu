// WORK ON THIS
module.exports = {

    friendlyName: 'rest / queueFromSubcategory',

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
            description: 'Number of tracks to queue from this subcategory.'
        },

        duration: {
            type: 'number',
            allowNull: true,
            description: 'The tracks queued should be of this duration in seconds, plus or minus 5 seconds, if provided.'
        }
    },

    fn: async function (inputs, exits) {
        // Get the parent category
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
            if (thesongs.length > 0)
            {
                // Randomise the list and keep only the first number(opt) tracks
                thesongs.sort(function (a, b) {
                    return 0.5 - Math.random()
                });
                thesongs.slice(0, inputs.quantity);

                var queuedtracks = 0;
                var anyerrors = false;
                var processedtracks = 0;
                var queuedtracksa = [];
                Statemeta.automation.forEach(function (queuedtrack) {
                    queuedtracksa.push(queuedtrack.ID);
                });

                // Queue up the chosen tracks
                thesongs.forEach(function (thesong) {
                    var canplay = true;
                    if (queuedtracks >= opts.number)
                        canplay = false;
                    if (queuedtracksa.indexOf(thesong.ID) > -1)
                        canplay = false;
                    if (typeof opts.duration != 'undefined' && (thesong.duration > (opts.duration + 5) || thesong.duration < (opts.duration - 5)))
                        canplay = false;
                    if (typeof opts.track != 'undefined' && moment(thesong.date_played).isAfter(moment().subtract(opts.track, 'minutes')))
                        canplay = false;
                    if (typeof opts.title != 'undefined' && moment(thesong.title_played).isAfter(moment().subtract(opts.title, 'minutes')))
                        canplay = false;
                    if (typeof opts.artist != 'undefined' && moment(thesong.artist_played).isAfter(moment().subtract(opts.artist, 'minutes')))
                        canplay = false;
                    if (typeof opts.album != 'undefined' && moment(thesong.album_played).isAfter(moment().subtract(opts.album, 'minutes')))
                        canplay = false;
                    if (canplay)
                    {
                        Statesystem.REST({command: `LoadTrackTo${opts.position}`, arg: thesong.ID}, function (err4, succ) {
                            if (err4)
                                anyerrors = true;
                            processedtracks += 1;
                            if (processedtracks >= opts.number)
                            {
                                if (anyerrors)
                                {
                                    json.status = 'error';
                                    json.response = 'There was an error processing the request.';
                                    cb(JSON.stringify(json), null);
                                } else {
                                    json.status = 'success';
                                    json.response = 'The action was successful.';
                                    cb(null, JSON.stringify(json));
                                }
                            }
                        });
                        queuedtracks += 1;
                    }
                });
                // Not enough tracks? Let's try queuing more tracks without rotation logic
                if (queuedtracks < opts.number)
                {
                    Statesystem.runChecks(function () {
                        Statemeta.automation.forEach(function (queuedtrack) {
                            queuedtracksa.push(queuedtrack.ID);
                        });
                        if (queuedtracksa.indexOf(thesong.ID) > -1)
                            canplay = false;
                        thesongs.forEach(function (thesong) {
                            var canplay = true;
                            if (queuedtracks >= opts.number)
                                canplay = false;
                            if (canplay)
                            {
                                Statesystem.REST({command: `LoadTrackTo${opts.position}`, arg: thesong.ID}, function (err4, succ) {
                                    if (err4)
                                        anyerrors = true;
                                    processedtracks += 1;
                                    attempts = 0;
                                    if (processedtracks >= opts.number)
                                    {
                                        if (anyerrors)
                                        {
                                            json.status = 'error';
                                            json.response = 'There was an error processing the request.';
                                            cb(JSON.stringify(json), null);
                                        } else {
                                            json.status = 'success';
                                            json.response = 'The action was successful.';
                                            cb(null, JSON.stringify(json));
                                        }
                                    }
                                });
                                queuedtracks += 1;
                            }
                        });
                    });
                }
                // Still not enough tracks? Error about it.
                if (queuedtracks < opts.number)
                {
                    json.status = 'error';
                    json.response = 'There were not enough tracks to queue.';
                    cb(JSON.stringify(json), null);
                }
            } else {
                return exits.error(new Error('No tracks to queue'));
            }
        } else {
            return exits.error(new Error('Subcategory not found'));
        }

    }


};

