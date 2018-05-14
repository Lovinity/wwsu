var moment = require("moment");
module.exports = {

    friendlyName: 'eas / postParse',

    description: 'Finalize and push out new/updated alerts.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var sendit = [];

        // Get all active alerts from the database.
        var records = await Eas.find()
                .intercept((err) => {
                    return exits.error(err);
                })
        // Async is tricky for forEach loops! Use the helper.
        await sails.helpers.asyncForEach(records, (record, index) => {
            return new Promise(async (resolve2, reject2) => {
                // Remove NWS alerts no longer listed in the CAPS; we assume those alerts were expired. Notify clients of the alert being removed.
                if (record.source == 'NWS' && Eas.activeCAPS.indexOf(record.reference) == -1)
                {
                    await Eas.destroy({ID: record.ID})
                            .intercept((err) => {
                                return resolve2();
                            });
                    sails.sockets.broadcast('EAS', 'EAS-remove', record.ID);
                    return resolve2();
                }

                // Remove expired alerts, and notify clients of deleted alerts
                if (moment().isAfter(moment(record.expires)))
                {
                    await Eas.destroy({ID: record.ID})
                            .intercept((err) => {
                                return resolve2();
                            });
                    sails.sockets.broadcast('EAS', 'EAS-remove', record.ID);
                    return resolve2();
                }

                // If this alert needs to be pushed, either because it's new or updated, throw it in the sendit array to be pushed.
                if (record.push)
                    sendit.push(record);
                
                return resolve2();
            });
        });

        // Mark these alerts as having been pushed; they do not need pushing anymore unless they get changed later.
        await Eas.update({push: true}, {push: false})
                .intercept((err) => {
                    return exits.error(err);
                });
        // Push out alerts to clients
        if (sendit.length > 0)
            sails.sockets.broadcast('EAS', 'EAS', sendit);
        return exits.success(sendit);

    }


};

