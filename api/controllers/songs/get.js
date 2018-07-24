/* global sails, Subcategory, Songs, Category, Logs, History */

module.exports = {

    friendlyName: 'songs / get',

    description: 'Get information about a song, or songs. Designed to be used with the track request system. Will also return spin counts and whether or not track can be requested if ID was specified.',

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
        subcategory: {
            type: 'number',
            allowNull: true,
            description: 'Optionally filter returned songs by provided subcategory ID.'
        },
        limit: {
            type: 'number',
            defaultsTo: 25,
            description: 'Limit the number of songs returned to this number.'
        },
        skip: {
            type: 'number',
            defaultsTo: 0,
            description: 'Skip this number of records in the list.'
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

            // No song ID specified?
            if (typeof inputs.ID === 'undefined' || inputs.ID === null)
            {
                // Retrieve a list of subcategories that fall within a parent category defined in config as a music category.
                var subcats2 = await Subcategory.find({ID: sails.config.custom.subcats.music});
                sails.log.verbose(`Subcategories retrieved: ${subcats2.length}`);
                sails.log.silly(subcats2);

                // Make note of all the subcategories in the retrieved songs
                await sails.helpers.asyncForEach(songs, function (song, index) {
                    return new Promise(async (resolve, reject) => {
                        subcatIDs.push(song.id_subcat);
                        resolve(false);
                    });
                });

                // Find songs in any of the music subcategories, or in the provided subcategory.
                query = {id_subcat: subcatIDs};
                if (inputs.subcategory !== 'undefined' && inputs.subcategory !== null)
                    query.id_subcat = inputs.subcategory;

                // Filter by search string, if provided
                if (typeof inputs.search !== 'undefined' && inputs.search !== null)
                    query.or = [{artist: {'contains': inputs.search}}, {title: {'contains': inputs.search}}];

                songs = await Songs.find(query).sort([{artist: 'ASC'}, {title: 'ASC'}]).skip(inputs.skip).limit(inputs.limit);
                sails.log.verbose(`Songs retrieved records: ${songs.length}`);
                sails.log.silly(songs);

            } else {
                sails.log.verbose(`Querying single track ID: ${inputs.ID}`);

                // Find the song matching the defined ID
                query = {ID: inputs.ID};
                songs = await Songs.find(query).sort([{artist: 'ASC'}, {title: 'ASC'}]).skip(inputs.skip).limit(inputs.limit);
                sails.log.verbose(`Songs retrieved records: ${songs.length}`);
                sails.log.silly(songs);

                // No record retrieved? Assume we could not find the song.
                if (!songs || typeof songs === 'undefined' || songs.length <= 0)
                    return exits.notFound();

                // grab RadioDJ categories and put them in memory.
                var cats2 = await Category.find();
                sails.log.verbose(`Categories retrieved: ${cats2.length}`);
                sails.log.silly(cats2);
                await sails.helpers.asyncForEach(cats2, function (cat, index) {
                    return new Promise(async (resolve, reject) => {
                        cats[cat.ID] = cat.name;
                        resolve(false);
                    });
                });

                // Add additional data to the song(s), such as request ability, category info, and spin counts.
                await sails.helpers.asyncForEach(songs, function (song, index) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            // Get those subcategories
                            var subcats2 = await Subcategory.findOne({ID: song.id_subcat});
                            sails.log.verbose(`Subcategories retrieved: ${subcats2.length}`);
                            sails.log.silly(subcats2);
                            
                            songs[index].category = `${cats[subcats2.parentid]} >> ${subcats2.name}` || 'Unknown';
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
            }

            // If songs is undefined at this point, that is an internal error!
            if (typeof songs === 'undefined')
                return exits.error(new Error(`Internal error: No songs returned!`));

            return exits.success(songs);

        } catch (e) {
            return exits.error(e);
        }

    }


};
