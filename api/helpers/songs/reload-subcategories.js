/* global sails, Category, Subcategory */

module.exports = {

    friendlyName: 'sails.helpers.songs.reloadSubcategories',

    description: 'Re-generate sails.config.custom.subcats, sails.config.custom.sportscats, and sails.config.custom.showcats',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper songs.reloadSubcategories called.');

        try {
// Load subcats IDs for each consigured categories
            sails.log.verbose(`BOOTSTRAP: loading subcats into configuration.`);
            for (var config in sails.config.custom.categories)
            {
                if (sails.config.custom.categories.hasOwnProperty(config) && config !== `_doNotRemove`)
                {
                    sails.config.custom.subcats[config] = [];
                    for (var cat in sails.config.custom.categories[config])
                    {
                        if (sails.config.custom.categories[config].hasOwnProperty(cat))
                        {
                            var thecategory = await Category.findOne({name: cat})
                                    .tolerate((err) => {
                                    });
                            if (!thecategory || thecategory === null)
                                continue;

                            if (sails.config.custom.categories[config][cat].length <= 0)
                            {
                                var thesubcategories = await Subcategory.find({parentid: thecategory.ID})
                                        .tolerate((err) => {
                                        });
                            } else {
                                var thesubcategories = await Subcategory.find({parentid: thecategory.ID, name: sails.config.custom.categories[config][cat]})
                                        .tolerate((err) => {
                                        });
                            }
                            if (!thesubcategories || thesubcategories.length <= 0)
                                continue;

                            thesubcategories.forEach(function (thesubcategory) {
                                sails.config.custom.subcats[config].push(thesubcategory.ID);
                            });

                            sails.log.silly(`Subcategories for ${config}: ${sails.config.custom.subcats[config]}`);
                        }
                    }
                }
            }

            // Load subcats IDs for each consigured sport
            sails.log.verbose(`BOOTSTRAP: Loading sportscats into configuration.`);
            sails.config.custom.sportscats = {};
            sails.config.custom.sports.forEach(function (sport) {
                sails.config.custom.sportscats[sport] = {"Sports Openers": null, "Sports Liners": null, "Sports Closers": null};
            });

            var categories = await Category.find({name: ["Sports Openers", "Sports Liners", "Sports Closers"]})
                    .tolerate((err) => {
                    });

            var catIDs = [];
            var cats = {};

            if (categories.length > 0)
            {
                categories.forEach(function (category) {
                    catIDs.push(category.ID);
                    cats[category.ID] = category.name;
                });
            }

            var subcategories = await Subcategory.find({parentid: catIDs})
                    .tolerate((err) => {
                    });


            if (subcategories.length > 0)
            {
                subcategories.forEach(function (subcategory) {
                    if (typeof sails.config.custom.sportscats[subcategory.name] !== 'undefined')
                    {
                        sails.config.custom.sportscats[subcategory.name][cats[subcategory.parentid]] = subcategory.ID;
                    }
                });
            }

            // Load subcats IDs for each show
            sails.log.verbose(`BOOTSTRAP: Loading showcats into configuration.`);

            var categories = await Category.find({name: ["Show Openers", "Show Returns", "Show Closers"]})
                    .tolerate((err) => {
                    });

            var catIDs = [];
            var cats = {};

            if (categories.length > 0)
            {
                categories.forEach(function (category) {
                    catIDs.push(category.ID);
                    cats[category.ID] = category.name;
                });
            }

            var subcategories = await Subcategory.find({parentid: catIDs})
                    .tolerate((err) => {
                    });


            if (subcategories.length > 0)
            {
                sails.config.custom.showcats = {};
                subcategories.forEach(function (subcategory) {
                    if (typeof sails.config.custom.showcats[subcategory.name] === 'undefined')
                        sails.config.custom.showcats[subcategory.name] = {"Show Openers": null, "Show Returns": null, "Show Closers": null};
                    sails.config.custom.showcats[subcategory.name][cats[subcategory.parentid]] = subcategory.ID;
                });
            }
            
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};


