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


            // Push the genres out
            genres
                    .map(genre => {
                        var temp = {};
                        temp.ID = genre.ID;
                        temp.name = genre.name;
                        returnData.push(temp);
                    });

            return exits.success(returnData);
        } catch (e) {
            return exits.error(e);
        }

    }


};
