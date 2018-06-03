/* global sails, Meta, _, Status, Recipients, Category, Logs, Subcategory */

/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also do this by creating a hook.
 *
 * For more information on bootstrapping your app, check out:
 * https://sailsjs.com/config/bootstrap
 */

module.exports.bootstrap = async function (done) {

    // By convention, this is a good place to set up fake data during development.
    //
    // For example:
    // ```
    // // Set up fake development data (or if we already have some, avast)
    // if (await User.count() > 0) {
    //   return done();
    // }
    //
    // await User.createEach([
    //   { emailAddress: 'ry@example.com', fullName: 'Ryan Dahl', },
    //   { emailAddress: 'rachael@example.com', fullName: 'Rachael Shaw', },
    //   // etc.
    // ]);
    // ```

    // Don't forget to trigger `done()` when this bootstrap function's logic is finished.
    // (otherwise your server will never lift, since it's waiting on the bootstrap)


    sails.log.verbose(`BOOTSTRAP: Cloning Meta.A to Meta.template`);
    Meta.template = _.cloneDeep(Meta['A']);

    // Load default status template into memory. Add radioDJ and DJ Controls instances to template as well.
    sails.log.verbose(`BOOTSTRAP: Loading RadioDJ instances into template`);
    sails.config.custom.radiodjs.forEach(function (radiodj) {
        Status.template.push({name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, status: 2, data: 'This RadioDJ has not reported online since initialization.', time: null});
    });
    sails.log.verbose(`BOOTSTRAP: Loading DJ Controls instances into template`);
    sails.config.custom.djcontrols.forEach(function (djcontrol) {
        Status.template.push({name: `djcontrols-${djcontrol.name}`, label: `DJ Controls ${djcontrol.label}`, status: 3, data: 'This DJ Controls has not reported online since initialization.', time: null});
    });
    sails.log.verbose(`BOOTSTRAP: Loading Display Sign instances into template`);
    sails.config.custom.displaysigns.forEach(function (display) {
        Status.template.push({name: `display-${display.name}`, label: `Display ${display.label}`, status: 2, data: 'This display sign has not reported online since initialization.', time: null});
    });

    sails.log.verbose(`BOOTSTRAP: Adding Status template to database.`);
    await Status.createEach(Status.template)
            .intercept((err) => {
                return done(err);
            });


    // Load internal recipients into memory
    sails.log.verbose(`BOOTSTRAP: Adding recipients template to database.`);
    await Recipients.createEach(Recipients.template)
            .intercept((err) => {
                return done(err);
            });

    // Load subcats IDs for each consigured categories
    for (var config in sails.config.custom.categories)
    {
        if (sails.config.custom.categories.hasOwnProperty(config))
        {
            for (var cat in sails.config.custom.categories[config])
            {
                if (sails.config.custom.categories[config].hasOwnProperty(cat))
                {
                    sails.config.custom.subcats[config] = [];
                    var thecategory = await Category.findOne({name: cat})
                            .intercept((err) => {
                            });
                    if (!thecategory || thecategory === null)
                        continue;

                    if (sails.config.custom.categories[config][cat].length <= 0)
                    {
                        var thesubcategories = await Subcategory.find({parentid: thecategory.ID})
                                .intercept((err) => {
                                });
                    } else {
                        var thesubcategories = await Subcategory.find({parentid: thecategory.ID, name: sails.config.custom.categories[config][cat]})
                                .intercept((err) => {
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

    sails.log.verbose(`BOOTSTRAP: Done.`);

    return done();

};
