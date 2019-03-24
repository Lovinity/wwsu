/* global Calendar, sails, Directorhours, _, Category, Subcategory, Promise */

module.exports = {

    friendlyName: 'config / categories / get-available',

    description: 'Return an array of available RadioDJ categories and subcategories.',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/categories/get-available called.');

        try {
            var returnData = {};
            
            // Get main categories and loop through each one
            var categories = await Category.find();
            
            var maps = categories.map(async (category) => {
                var categoryData = [];
                
                // Get each subcategory in this main category, and add it to our temp array
                var subcategories = await Subcategory.find({parentid: category.ID});
                subcategories.map((subcategory) => {
                   categoryData.push(subcategory.name); 
                });
                
                // Now, compile this main category record along with all its subcategories
                returnData[category.name] = categoryData;
            });
            await Promise.all(maps);

            return exits.success(returnData);
        } catch (e) {
            return exits.error(e);
        }

    }


};


