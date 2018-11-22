/* global Eas, sails, moment */

module.exports = {

    friendlyName: 'eas.postParse',

    description: 'Finalize and push out new/updated alerts.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper eas.postParse called.');

        try {
            var sendit = [];

            // Get all active alerts from the database.
            var records = await Eas.find();
            sails.log.verbose(`Eas records retrieved: ${records.length}`);
            sails.log.silly(records);

            var maps = records.map(async record => {
                // Remove NWS alerts no longer listed in the CAPS; we assume those alerts were expired.
                if (record.source === 'NWS' && Eas.activeCAPS.indexOf(record.reference) === -1)
                {
                    sails.log.verbose(`Record ${record.ID} is to be deleted. It no longer exists in NWS CAPS.`);
                    await Eas.destroy({ID: record.ID}).fetch()
                            .tolerate((err) => {
                                sails.log.error(err);
                            });
                    return true;
                }

                // Remove expired alerts
                if (moment().isAfter(moment(record.expires)))
                {
                    sails.log.verbose(`Record ${record.ID} is to be deleted. It has expired.`);
                    await Eas.destroy({ID: record.ID}).fetch()
                            .tolerate((err) => {
                                sails.log.error(err);
                            });
                    return true;
                }

                return true;
            });
            await Promise.all(maps);

            return exits.success(sendit);
        } catch (e) {
            return exits.error(e);
        }
    }


};

