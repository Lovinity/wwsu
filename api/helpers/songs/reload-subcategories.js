module.exports = {

    friendlyName: 'sails.helpers.songs.reloadSubcategories',

    description: 'Re-generate sails.config.custom.subcats, sails.config.custom.sportscats, and sails.config.custom.showcats',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper songs.reloadSubcategories called.');

        try {
            var categories;
            var subcategories;
            var thesubcategories;
            var catIDs = [];
            var cats = {};

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
                                    .tolerate(() => {
                                    });
                            if (!thecategory || thecategory === null)
                                {continue;}

                            if (sails.config.custom.categories[config][cat].length <= 0)
                            {
                                thesubcategories = await Subcategory.find({parentid: thecategory.ID})
                                        .tolerate(() => {
                                        });
                            } else {
                                thesubcategories = await Subcategory.find({parentid: thecategory.ID, name: sails.config.custom.categories[config][cat]})
                                        .tolerate(() => {
                                        });
                            }
                            if (!thesubcategories || thesubcategories.length <= 0)
                                {continue;}

                            thesubcategories.forEach((thesubcategory) => {
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
            sails.config.custom.sports.forEach((sport) => {
                sails.config.custom.sportscats[sport] = {'Sports Openers': null, 'Sports Liners': null, 'Sports Closers': null};
            });

            categories = await Category.find({name: ['Sports Openers', 'Sports Liners', 'Sports Closers']})
                    .tolerate(() => {
                    });

            catIDs = [];
            cats = {};

            if (categories.length > 0)
            {
                categories.forEach((category) => {
                    catIDs.push(category.ID);
                    cats[category.ID] = category.name;
                });
            }

            subcategories = await Subcategory.find({parentid: catIDs})
                    .tolerate(() => {
                    });


            if (subcategories.length > 0)
            {
                subcategories.forEach((subcategory) => {
                    if (typeof sails.config.custom.sportscats[subcategory.name] !== 'undefined')
                    {
                        sails.config.custom.sportscats[subcategory.name][cats[subcategory.parentid]] = subcategory.ID;
                    }
                });
            }

            // Load subcats IDs for each show
            sails.log.verbose(`BOOTSTRAP: Loading showcats into configuration.`);

            categories = await Category.find({name: ['Show Openers', 'Show Returns', 'Show Closers']})
                    .tolerate(() => {
                    });

            catIDs = [];
            cats = {};

            if (categories.length > 0)
            {
                categories.forEach((category) => {
                    catIDs.push(category.ID);
                    cats[category.ID] = category.name;
                });
            }

            subcategories = await Subcategory.find({parentid: catIDs})
                    .tolerate(() => {
                    });


            if (subcategories.length > 0)
            {
                sails.config.custom.showcats = {};
                subcategories.forEach((subcategory) => {
                    if (typeof sails.config.custom.showcats[subcategory.name] === 'undefined')
                        {sails.config.custom.showcats[subcategory.name] = {'Show Openers': null, 'Show Returns': null, 'Show Closers': null};}
                    sails.config.custom.showcats[subcategory.name][cats[subcategory.parentid]] = subcategory.ID;
                });
            }

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};


