/* global Eas */

var moment = require("moment");
var parseString = require('xml2js').parseString;
var needle = require('needle');
module.exports = {

    friendlyName: 'eas / addAlert',

    description: 'Prepares an alert to be pushed by the eas/postParse helper.',

    inputs: {
        reference: {
            type: 'string',
            required: true,
            description: 'A unique ID for the alert provided by the source.'
        },
        source: {
            type: 'string',
            required: true,
            description: 'This alert originates from the provided source. Use NWS for NWS sources so that this helper can retrieve alert information.'
        },
        county: {
            type: 'string',
            required: true,
            description: 'This alert applies to the specified county.'
        },
        alert: {
            type: 'string',
            required: true,
            description: 'The alert name/event. Eg. "Severe Thunderstorm Warning".'
        },
        severity: {
            type: 'string',
            required: true,
            isIn: ['Extreme', 'Severe', 'Moderate', 'Minor'],
            description: `Severity of alert: One of the following in order from highest to lowest ['Extreme', 'Severe', 'Moderate', 'Minor']`
        },
        starts: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            defaultsTo: moment().toISOString(),
            description: `moment() parsable string of when the alert starts. Recommended ISO string.`
        },
        expires: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            defaultsTo: moment().add(15, 'minutes').toISOString(),
            description: `moment() parsable string of when the alert expires. Recommended ISO string.`
        },
        color: {
            type: 'string',
            regex: /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i,
            description: 'Hex color representing this alert.',
            required: true
        },
        information: {
            type: 'string',
            allowNull: true,
            description: 'Detailed information about this alert for the public.'
        }
    },

    fn: async function (inputs, exits) {
        try {

            // Get the alert if it already exists in the database
            var record = await Eas.findOne({source: inputs.source, reference: inputs.reference})
                    .intercept((err) => {
                        return exits.error(err);
                    });
            if (record) // Exists
            {
                // Detect if the county issuing the alert is already in the alert. If not, add the county in.
                var temp = record.counties.split(', ');
                if (temp.indexOf(inputs.county) === -1)
                    temp.push(inputs.county);
                temp = temp.join(', ');

                var criteria = {
                    source: inputs.source,
                    reference: inputs.reference,
                    alert: inputs.alert,
                    severity: inputs.severity,
                    color: inputs.color,
                    counties: temp,
                    starts: inputs.starts,
                    expires: inputs.expires
                };
                if (typeof inputs.information !== 'undefined' && inputs.information !== null)
                    criteria.information = inputs.information;

                // Detect any changes in the alert. If a change is detected, we will push it to clients.
                var updateIt = false;
                for (var key in criteria)
                {
                    if (criteria.hasOwnProperty(key))
                    {
                        if (criteria[key] !== record[key])
                        {
                            updateIt = true;
                        }
                    }
                }
                if (updateIt)
                {
                    await Eas.update({ID: record.ID}, criteria)
                            .intercept((err) => {
                                return exits.error(err);
                            })
                            .fetch();
                }
                return exits.success();
            } else { // Does not exist
                var criteria = {
                    source: inputs.source,
                    reference: inputs.reference,
                    alert: inputs.alert,
                    severity: inputs.severity,
                    color: inputs.color,
                    counties: inputs.county,
                    starts: inputs.starts,
                    expires: inputs.expires,
                    information: inputs.information || ''
                };

                // If this alert came from NWS, we need to GET a separate URL for alert information.
                if (inputs.source === 'NWS')
                {
                    needle('get', inputs.reference)
                            .then(async function (resp) {
                                parseString(resp.body, async function (err2, result) { // Response is in XML. We need to convert to JSON.
                                    try {
                                        if (err2)
                                        {
                                            return exits.error(err2);
                                        } else {
                                            criteria.information = result.alert.info[0].description[0] + ". Precautionary / Preparedness actions: " + result.alert.info[0].instruction[0];
                                            await Eas.create(criteria)
                                                    .intercept((err) => {
                                                        return reject(err);
                                                    })
                                                    .fetch();
                                        }
                                        return exits.success();
                                    } catch (e) {
                                        return exits.error(e);
                                    }
                                });
                            })
                            .catch(function (err) {
                                return exits.error(err);
                            });
                } else {
                    var record = await Eas.create(criteria)
                            .intercept((err) => {
                                return reject(err);
                            })
                            .fetch();
                    return exits.success();
                }
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};

