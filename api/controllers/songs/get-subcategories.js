/* global sails, Subcategory, songs, Category */

module.exports = {

    friendlyName: 'songs / get-subcategories',

    description: 'Get array of objects of subcategories that contain requestable songs. {Subcategory ID: "Category >> Subcategory"}.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug(`Controller songs/get-subcategories called.`);
        try {
            var cats = {};
            var returnData = [];

            // Retrieve a list of subcategories that fall within a parent category defined in config as a music category.
            var subcats2 = await Subcategory.find({ID: sails.config.custom.subcats.music});
            sails.log.verbose(`Subcategories retrieved: ${subcats2.length}`);
            sails.log.silly(subcats2);

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

            // Get the name of the main category and subcategory
            await sails.helpers.asyncForEach(subcats2, function (subcat, index) {
                return new Promise(async (resolve, reject) => {
                    var temp = {};
                    temp.ID = subcat.ID;
                    temp.name = `${cats[subcat.parentid]} >> ${subcat.name}` || 'Unknown';
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
