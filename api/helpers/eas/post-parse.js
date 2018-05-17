/* global Eas, sails */

var moment = require("moment");
module.exports = {

    friendlyName: 'eas.postParse',

    description: 'Finalize and push out new/updated alerts.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper eas.postParse called.');

        var sendit = [];

        // Get all active alerts from the database.
        var records = await Eas.find()
                .intercept((err) => {
                    return exits.error(err);
                });
        sails.log.verbose(`Eas records retrieved: ${records.length}`);
        sails.log.silly(records);
        // Async is tricky for forEach loops! Use the helper.
        await sails.helpers.asyncForEach(records, (record, index) => {
            return new Promise(async (resolve2) => {
                
                // Remove NWS alerts no longer listed in the CAPS; we assume those alerts were expired. Notify clients of the alert being removed.
                if (record.source === 'NWS' && Eas.activeCAPS.indexOf(record.reference) === -1)
                {
                    sails.log.verbose(`Record ${record.ID} is to be deleted. It no longer exists in NWS CAPS.`);
                    await Eas.destroy({ID: record.ID})
                            .intercept((err) => {
                                return resolve2(false);
                            })
                            .fetch();
                    return resolve2(false);
                }

                // Remove expired alerts
                if (moment().isAfter(moment(record.expires)))
                {
                    sails.log.verbose(`Record ${record.ID} is to be deleted. It has expired.`);
                    await Eas.destroy({ID: record.ID})
                            .intercept((err) => {
                                return resolve2(false);
                            })
                            .fetch();
                    return resolve2(false);
                }

                return resolve2(false);
            });
        });

        return exits.success(sendit);

    }


};

