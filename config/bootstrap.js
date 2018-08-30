/* global sails, Meta, _, Status, Recipients, Category, Logs, Subcategory, Tasks, Directors, Calendar, Messages, moment, Playlists, Playlists_list */

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
        Status.template.push({name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, status: radiodj.level, data: 'This RadioDJ has not reported online since initialization.', time: null});
    });
    sails.log.verbose(`BOOTSTRAP: Loading DJ Controls instances into template`);
    sails.config.custom.djcontrols.forEach(function (djcontrol) {
        Status.template.push({name: `djcontrols-${djcontrol.name}`, label: `DJ Controls ${djcontrol.label}`, status: djcontrol.level, data: 'This DJ Controls has not reported online since initialization.', time: null});
    });
    sails.log.verbose(`BOOTSTRAP: Loading Display Sign instances into template`);
    sails.config.custom.displaysigns.forEach(function (display) {
        Status.template.push({name: `display-${display.name}`, label: `Display ${display.label}`, status: display.level, data: 'This display sign has not reported online since initialization.', time: null});
    });

    sails.log.verbose(`BOOTSTRAP: Adding Status template to database.`);
    await Status.createEach(Status.template)
            .tolerate((err) => {
                return done(err);
            });


    // Load internal recipients into memory
    sails.log.verbose(`BOOTSTRAP: Adding recipients template to database.`);
    await Recipients.createEach(Recipients.template)
            .tolerate((err) => {
                return done(err);
            });

    // Generate recipients based off of messages from the last hour... website only
    sails.log.verbose(`BOOTSTRAP: Adding recipients from messages sent within the last hour into database.`);
    var records = await Messages.find({status: 'active', from: {"startsWith": 'website-'}, createdAt: {">": moment().subtract(1, 'hours').toDate()}}).sort('createdAt DESC')
            .tolerate((err) => {
            });
    if (records && records.length > 0)
    {
        var insertRecords = [];
        records.forEach(function (record) {
            insertRecords.push({host: record.from, group: 'website', label: record.from_friendly, status: 0, time: record.createdAt});
        });

        await Recipients.createEach(insertRecords)
                .tolerate((err) => {
                    return done(err);
                });
    }

    // Load subcats IDs for each consigured categories
    sails.log.verbose(`BOOTSTRAP: loading subcats into configuration.`);
    for (var config in sails.config.custom.categories)
    {
        if (sails.config.custom.categories.hasOwnProperty(config))
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

    // Load metadata
    try {
        sails.log.verbose(`BOOTSTRAP: Loading metadata.`);
        var meta = await Meta.find().limit(1)
                .tolerate((err) => {
                    sails.log.error(err);
                    Meta.changeMeta({time: moment().toISOString(true)});
                });
        meta = meta[0];
        meta.time = moment().toISOString(true);
        sails.log.silly(meta);
        await Meta.changeMeta(meta);
        Playlists.active.name = meta.playlist;
        if (meta.playlist !== null && meta.playlist !== '')
        {
            var theplaylist = await Playlists.findOne({name: meta.playlist});
            Playlists.active.ID = theplaylist.ID;
            var playlistTracks = await Playlists_list.find({pID: Playlists.active.ID})
                    .tolerate((err) => {
                    });
            Playlists.active.tracks = [];
            if (typeof playlistTracks !== 'undefined')
            {
                playlistTracks.forEach(function (playlistTrack) {
                    Playlists.active.tracks.push(playlistTrack.sID);
                });
            }
        } else {
            Playlists.active.ID = 0;
        }
        Playlists.active.position = meta.playlist_position;
        Playlists.played = moment(meta.playlist_played);
    } catch (e) {
        await Meta.changeMeta({time: moment().toISOString(true)});
    }

    // Load work orders.
    sails.log.verbose(`BOOTSTRAP: Loading tasks.`);
    await Tasks.updateTasks();

    // Load directors.
    sails.log.verbose(`BOOTSTRAP: Loading directors.`);
    await Directors.updateDirectors(true);

    // Load Google Calendar.
    sails.log.verbose(`BOOTSTRAP: Loading calendar events.`);
    await Calendar.preLoadEvents(true);

    sails.log.verbose(`BOOTSTRAP: Done.`);

    return done();

};
