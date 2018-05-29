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

    // Load default status template into memory. Add radioDJ and DJ Controls instances to template as well.

    sails.log.verbose(`BOOTSTRAP: Loading RadioDJ instances into template`);
    sails.config.custom.radiodjs.forEach(function (radiodj) {
        Status.template.push({name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, status: 2, data: 'This RadioDJ has not reported online since initialization.', time: null});
    });
    sails.log.verbose(`BOOTSTRAP: Loading DJ Controls instances into template`);
    sails.config.custom.djcontrols.forEach(function (djcontrol) {
        Status.template.push({name: `djcontrols-${djcontrol.name}`, label: `DJ Controls ${djcontrol.label}`, status: 2, data: 'This DJ Controls has not reported online since initialization.', time: null});
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

    // Load IDs of music categories into config
    sails.log.verbose(`BOOTSTRAP: Loading music category IDs into config.`);
    var records = await Category.find({name: sails.config.custom.requests.musicCats})
            .intercept((err) => {
                return done(err);
            });
    records.forEach(function (record) {
        sails.config.custom.requests.musicCatsN.push(record.ID);
    });
    
    sails.log.verbose(`BOOTSTRAP: Done.`);

    return done();

};
