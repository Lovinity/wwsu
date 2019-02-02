/* global Eas, sails, moment, needle, Promise */

module.exports = {

    friendlyName: 'eas.addAlert',

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
            allowNull: true,
            description: `moment() parsable string of when the alert starts. Recommended ISO string.`
        },
        expires: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            allowNull: true,
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
        sails.log.debug('Helper eas.addAlert called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {

            // Define a function for processing information into the Eas.pendingAlerts variable.
            var processPending = (criteria) => {
                if (typeof Eas.pendingAlerts[`${inputs.source}.${inputs.reference}`] === `undefined`)
                {
                    Eas.pendingAlerts[`${inputs.source}.${inputs.reference}`] = criteria;
                } else {
                    for (var key in criteria)
                    {
                        if (criteria.hasOwnProperty(key))
                        {
                            if (key !== `counties`)
                            {
                                Eas.pendingAlerts[`${inputs.source}.${inputs.reference}`][key] = criteria[key];
                            } else {
                                var temp = Eas.pendingAlerts[`${inputs.source}.${inputs.reference}`][key].split(', ');
                                if (temp.indexOf(inputs.county) === -1)
                                    temp.push(inputs.county);
                                temp = temp.join(', ');
                                Eas.pendingAlerts[`${inputs.source}.${inputs.reference}`][key] = temp;
                            }
                        }
                    }
                }
            }

            // Get the alert if it already exists in the database
            var record = await Eas.findOne({source: inputs.source, reference: inputs.reference})
                    .tolerate((err) => {
                        sails.log.error(err);
                    });
            if (record) // Exists
            {
                sails.log.verbose('Alert already exists.');
                // Detect if the county issuing the alert is already in the alert. If not, add the county in.
                var temp = record.counties.split(', ');
                if (temp.indexOf(inputs.county) === -1)
                    temp.push(inputs.county);
                temp = temp.join(', ');

                // Prepare criteria to update
                var criteria = {
                    source: inputs.source,
                    reference: inputs.reference,
                    alert: inputs.alert,
                    severity: inputs.severity,
                    color: inputs.color,
                    counties: temp,
                    starts: inputs.starts !== null ? moment(inputs.starts).toISOString(true) : moment().toISOString(true),
                    expires: inputs.expires !== null ? moment(inputs.expires).toISOString(true) : moment().add(1, 'hours').toISOString(true)
                };
                if (typeof inputs.information !== 'undefined' && inputs.information !== null)
                    criteria.information = inputs.information;

                sails.log.silly(`Criteria: ${criteria}`);

                // Detect any changes in the alert. If a change is detected, we will do a database update.
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
                sails.log.silly(`Needs updating?: ${updateIt}`);
                if (updateIt)
                {
                    criteria._new = false;
                    processPending(criteria);
                }
                return exits.success();

            } else { // Does not exist; new alert
                sails.log.verbose('Alert does not exist.');

                // Prepare criteria
                var criteria = {
                    source: inputs.source,
                    reference: inputs.reference,
                    alert: inputs.alert,
                    severity: inputs.severity,
                    color: inputs.color,
                    counties: inputs.county,
                    starts: inputs.starts !== null ? moment(inputs.starts).toISOString(true) : moment().toISOString(true),
                    expires: inputs.expires !== null ? moment(inputs.expires).toISOString(true) : moment().add(1, 'hours').toISOString(true),
                    information: inputs.information || ''
                };

                // If this alert came from NWS, we need to GET a separate URL for alert information before we create the record.
                if (inputs.source === 'NWS' && (typeof Eas.pendingAlerts[`${inputs.source}.${inputs.reference}`] === `undefined` || Eas.pendingAlerts[`${inputs.source}.${inputs.reference}`].information === '' || Eas.pendingAlerts[`${inputs.source}.${inputs.reference}`].information === null))
                {
                    sails.log.verbose('Alert is from NWS source. Retrieving alert information.');
                    try {
                        var resp = await needle('get', inputs.reference);
                        try {
                            sails.log.silly(resp.body);

                            // Go through each child
                            var maps = resp.body.children
                                    .filter(entry => typeof entry.name !== 'undefined' && entry.name === 'info')
                                    .map(async entry => {
                                        try {
                                            var alert = {};

                                            // Parse field information into the alert variable
                                            entry.children.map(entry2 => alert[entry2.name] = entry2.value);

                                            // Sometimes, EAS will return "This alert has expired". If so, leave information blank.
                                            if (!alert.description.includes("This alert has expired"))
                                                criteria.information = alert.description + ". Precautionary / Preparedness actions: " + alert.instruction;
                                            sails.log.silly(`Criteria: ${criteria}`);
                                            criteria._new = true;
                                            processPending(criteria);
                                            return true;

                                        } catch (e) {
                                            throw e;
                                        }
                                    });
                            await Promise.all(maps);

                            return exits.success();

                        } catch (e) {
                            throw e;
                        }
                    } catch (e) {
                        throw e;
                    }
                } else {
                    sails.log.silly(`Criteria: ${criteria}`);
                    criteria._new = true;
                    processPending(criteria);
                    return exits.success();
                }
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};

