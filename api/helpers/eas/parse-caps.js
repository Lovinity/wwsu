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
            type: 'string',
            required: true,
            description: 'XML formatted CAPS body to parse.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper eas.parseCaps called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            parseString(inputs.body, async function (err, result) { // Response is in XML. We need to convert to JSON.
                if (err)
                {
                    return exits.error(err);
                } else {
                    await sails.helpers.asyncForEach(result.feed.entry, function (entry, index) {
                        return new Promise(async (resolve2, reject2) => {
                            try {
                                sails.log.silly(entry);
                                // Skip any entries that do not have an ID or do not have a status of "Actual"; they're not real alerts.
                                if (typeof entry['id'] !== 'undefined' && typeof entry['cap:status'] !== 'undefined' && entry['cap:status'][0] === 'Actual')
                                {
                                    // Skip expired alerts
                                    if (moment().isBefore(moment(entry['cap:expires'][0])))
                                    {
                                        sails.log.verbose(`Processing ${index}.`);
                                        var color = "#787878";
                                        if (entry['cap:event'][0] in Eas.nwsalerts) { // Is the alert in our array of alerts to alert for? Get its color if so.
                                            color = Eas.nwsalerts[entry['cap:event'][0]];
                                        } else {
                                            return reject2();
                                        }
                                        await sails.helpers.eas.addAlert(entry['id'][0], 'NWS', inputs.county, entry['cap:event'][0], entry['cap:severity'][0], moment(entry['cap:effective'][0]).toISOString(), moment(entry['cap:expires'][0]).toISOString(), color);
                                        Eas.activeCAPS.push(entry['id'][0]);
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
                }
            });
        } catch (e) {
            return exits.error(e);
        }

    }


};

