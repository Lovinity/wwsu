/* global sails, Subcategory, Songs, Category, Logs, History */

module.exports = {

    friendlyName: 'songs / get',

    description: 'Get information about a song, or songs, including whether or not they can be requested. Designed to be used with the track request system.',

    inputs: {
        ID: {
            type: 'number',
            allowNull: true,
            description: 'If provided, will only return the provided song ID.'
        },
        search: {
            type: 'string',
            allowNull: true,
            description: 'Search by provided artist or title.'
        },
        limit: {
            type: 'number',
            defaultsTo: 25,
            description: 'Limit the number of songs returned to this number.'
        },
        offset: {
            type: 'number',
            defaultsTo: 0,
            description: 'We will not return any songs whose ID is less than or equal to this number.'
        }
    },

    exits: {
        success: {
            statusCode: 200
        },
        notFound: {
            statusCode: 404
        },
        error: {
            statusCode: 500
        }
    },

    fn: async function (inputs, exits) {
        //TODO: Find a way to speed up checkRequestable and getSpins. Perhaps use a cache engine.
        sails.log.debug('Controller songs/get called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {

            // Get the client IP address
            var from_IP = this.req.isSocket ? (typeof this.req.socket.handshake.headers['x-forwarded-for'] !== 'undefined' ? this.req.socket.handshake.headers['x-forwarded-for'] : this.req.socket.conn.remoteAddress) : this.req.ip;

            var subcatIDs = [];
            var cats = {};
            var subcats = {};
            var query = {};
            var songs;

            // First, grab RadioDJ categories and put them in memory.
            var cats2 = await Category.find();
            sails.log.verbose(`Categories retrieved: ${cats2.length}`);
            sails.log.silly(cats2);
            await sails.helpers.asyncForEach(cats2, function (cat, index) {
                return new Promise(async (resolve, reject) => {
                    cats[cat.ID] = cat.name;
                    resolve(false);
                });
            });

            // No song ID specified?
            if (typeof inputs.ID === 'undefined' || inputs.ID === null)
            {
                // Retrieve a list of subcategories that fall within a parent category defined in config as a music category.
                var subcats2 = await Subcategory.find({ID: sails.config.custom.subcats.music});
                sails.log.verbose(`Subcategories retrieved: ${subcats2.length}`);
                sails.log.silly(subcats2);

                // Add data in memory about each subcategory's main category name and subcategory name
                await sails.helpers.asyncForEach(subcats2, function (subcat, index) {
                    return new Promise(async (resolve, reject) => {
                        subcatIDs.push(subcat.ID);
                        subcats[subcat.ID] = `${cats[subcat.parentid]} >> ${subcat.name}` || 'Unknown';
                        resolve(false);
                    });
                });

                // Find songs in any of these subcategories
                query = {ID: {'>': inputs.offset}, id_subcat: subcatIDs};
                if (typeof inputs.search !== 'undefined' && inputs.search !== null)
                    query.or = [{artist: {'contains': inputs.search}}, {title: {'contains': inputs.search}}];
                songs = await Songs.find(query).limit(inputs.limit);
                sails.log.verbose(`Songs retrieved records: ${songs.length}`);
                sails.log.silly(songs);

            } else {

                sails.log.verbose(`Querying single track ID: ${inputs.ID}`);

                // Find the song matching the defined ID
                query = {ID: inputs.ID};
                songs = await Songs.find(query).limit(inputs.limit);
                sails.log.verbose(`Songs retrieved records: ${songs.length}`);
                sails.log.silly(songs);

                // No record retrieved? Assume we could not find the song.
                if (!songs || songs.length <= 0)
                    return exits.notFound();

                // Make note of all the subcategories in the retrieved songs
                await sails.helpers.asyncForEach(songs, function (song, index) {
                    return new Promise(async (resolve, reject) => {
                        subcatIDs.push(song.id_subcat);
                        resolve(false);
                    });
                });

                // Get those subcategories
                var subcats2 = await Subcategory.find({ID: subcatIDs});
                sails.log.verbose(`Subcategories retrieved: ${subcats2.length}`);
                sails.log.silly(subcats2);

                // Get the name of the main category and subcategory
                await sails.helpers.asyncForEach(subcats2, function (subcat, index) {
                    return new Promise(async (resolve, reject) => {
                        subcats[subcat.ID] = `${cats[subcat.parentid]} >> ${subcat.name}` || 'Unknown';
                        resolve(false);
                    });
                });
            }

            // If songs is undefined at this point, that is an internal error!
            if (typeof songs === 'undefined')
                return exits.error(new Error(`Internal error: No songs returned!`));

            // Add additional necessary data to each song, such as request ability 
            await sails.helpers.asyncForEach(songs, function (song, index) {
                return new Promise(async (resolve, reject) => {
                    try {
                        songs[index].category = subcats[song.id_subcat] || 'Unknown';
                        songs[index].request = await sails.helpers.requests.checkRequestable(song.ID, from_IP);

                        // Get spin counts from both RadioDJ and manually logged entries by DJs
                        songs[index].spins = await sails.helpers.songs.getSpins(song.ID);
                        resolve(false);
                    } catch (e) {
                        sails.log.error(e);
                        resolve(false);
                    }
                });
            });

            return exits.success(songs);

        } catch (e) {
            return exits.error(e);
        }

    }


};
