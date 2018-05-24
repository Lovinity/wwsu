/* global sails, Eas */

var moment = require("moment");
var parseString = require('xml2js').parseString;
module.exports = {

    friendlyName: 'eas.parseCaps',

    description: 'Parse alert data received from a CAPS XML document.',

    inputs: {
        county: {
            type: 'string',
            required: true,
            description: 'The CAPS body applies to the specified county.'
        },
        body: {
            type: 'ref',
            required: true,
            description: 'An object returned by the needle library containing the CAPS data.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper eas.parseCaps called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            await sails.helpers.asyncForEach(inputs.body.children, function (entry, index) {
                return new Promise(async (resolve2, reject2) => {
                    try {

                        sails.log.silly(entry);

                        // Skip non-entries
                        if (typeof entry.name === 'undefined' || entry.name !== 'entry')
                            return resolve2(false);

                        var alert = {};

                        // Parse field information into the alert variable
                        entry.children.forEach(function (entry2)
                        {
                            alert[entry2.name] = entry2.value;
                        });

                        // Skip any entries that do not have an ID or do not have a status of "Actual"; they're not real alerts.
                        if (typeof alert['id'] !== 'undefined' && typeof alert['cap:status'] !== 'undefined' && alert['cap:status'] === 'Actual')
                        {
                            // Skip expired alerts
                            if (moment().isBefore(moment(alert['cap:expires'])))
                            {
                                sails.log.verbose(`Processing ${index}.`);
                                var color = "#787878";
                                if (alert['cap:event'] in sails.config.custom.EAS.alerts) { // Is the alert in our array of alerts to alert for? Get its color if so.
                                    color = sails.config.custom.EAS.alerts[alert['cap:event']];
                                } else {
                                    return resolve2(false);
                                }
                                await sails.helpers.eas.addAlert(alert['id'], 'NWS', inputs.county, alert['cap:event'], alert['cap:severity'], moment(alert['cap:effective']).toISOString(), moment(alert['cap:expires']).toISOString(), color);
                                Eas.activeCAPS.push(alert['id']);
                            } else {
                                sails.log.verbose(`Skipped ${index} because it is expired.`);
                            }
                        } else {
                            sails.log.verbose(`Skipped ${index} because it was not a valid alert.`);
                        }
                    } catch (e) {
                        sails.log.error(e);
                        return reject2();
                    }
                    return resolve2(false);
                });
            });
            return exits.success();
            //}
            // });
        } catch (e) {
            return exits.error(e);
        }

    }


};

