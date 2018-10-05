/* global sails, Subcategory, songs, Category */

module.exports = {

    friendlyName: 'songs / get-genres',

    description: 'Get array of objects of genres. {ID: "genre"}.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug(`Controller songs/get-genres called.`);
        try {
            var returnData = [];

            // Retrieve a list of genres.
            var genres = await Genre.find({}).sort('name ASC');
            sails.log.verbose(`Genre retrieved: ${genres.length}`);
            sails.log.silly(genres);

           
            // Push the genres out
            sails.log.debug(`Calling asyncForEach in songs/get-genres`);
            await sails.helpers.asyncForEach(genres, function (genre, index) {
                return new Promise(async (resolve, reject) => {
                    var temp = {};
                    temp.ID = genre.ID;
                    temp.name = genre.name;
                    returnData.push(temp);
                    resolve(false);
                });
            });

            return exits.success(returnData);
        } catch (e) {
            return exits.error(e);
        }

    }


};
