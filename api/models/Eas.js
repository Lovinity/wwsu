/**
 * Eas.js
 *
 * @description :: Internal Emergency Alert System.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

// NEEDS TESTING
var moment = require("moment");
var parseString = require('xml2js').parseString;
var needle = require('needle');

module.exports = {
    // Eas data should persist. However, all data is temporary and not client heavy. Use disk instead of SQL.
    datastore: 'disk',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        source: {
            type: 'string'
        },

        reference: {
            type: 'string'
        },

        alert: {
            type: 'string'
        },

        information: {
            type: 'string'
        },

        severity: {
            type: 'string'
        },

        color: {
            type: 'string'
        },

        counties: {
            type: 'string'
        },

        starts: {
            type: 'ref',
            columnType: 'datetime'
        },

        expires: {
            type: 'ref',
            columnType: 'datetime'
        },

        push: {
            type: 'boolean',
            defaultsTo: true
        },
    },

    // This object contains all of the NWS alerts we will process. Key is the alert from NWS, value is the hex color used for this alert.
    nwsalerts: {
        "911 Telephone Outage": "#C0C0C0",
        "Administrative Message": "#FFFFFF",
        "Air Quality Alert": "#808080",
        "Air Stagnation Advisory": "#808080",
        "Arroyo and Small Stream Flood Advisory": "#00FF7F",
        "Ashfall Advisory": "#696969",
        "Ashfall Warning": "#A9A9A9",
        "Avalanche Advisory": "#CD853F",
        "Avalanche Warning": "#1E90FF",
        "Avalanche Watch": "#F4A460",
        "Blizzard Warning": "#FF4500",
        "Blizzard Watch": "#ADFF2F",
        "Blowing Dust Advisory": "#BDB76B",
        "Brisk Wind Advisory": "#D8BFD8",
        "Child Abduction Emergency": "#FFD700",
        "Civil Danger Warning": "#FFB6C1",
        "Civil Emergency Message": "#FFB6C1",
        "Coastal Flood Advisory": "#7CFC00",
        "Coastal Flood Warning": "#228B22",
        "Coastal Flood Watch": "#66CDAA",
        "Dense Fog Advisory": "#708090",
        "Dense Smoke Advisory": "#F0E68C",
        "Dust Storm Warning": "#FFE4C4",
        "Earthquake Warning": "#8B4513",
        "Evacuation - Immediate": "#7FFF00",
        "Excessive Heat Warning": "#C71585",
        "Excessive Heat Watch": "#800000",
        "Extreme Cold Warning": "#0000FF",
        "Extreme Cold Watch": "#0000FF",
        "Extreme Fire Danger": "#E9967A",
        "Extreme Wind Warning": "#FF8C00",
        "Fire Warning": "#A0522D",
        "Fire Weather Watch": "#FFDEAD",
        "Flash Flood Warning": "#8B0000",
        "Flash Flood Watch": "#2E8B57",
        "Flood Advisory": "#00FF7F",
        "Flood Warning": "#00FF00",
        "Flood Watch": "#2E8B57",
        "Freeze Warning": "#483D8B",
        "Freeze Watch": "#00FFFF",
        "Freezing Fog Advisory": "#008080",
        "Freezing Rain Advisory": "#DA70D6",
        "Freezing Spray Advisory": "#00BFFF",
        "Frost Advisory": "#6495ED",
        "Gale Warning": "#DDA0DD",
        "Gale Watch": "#FFC0CB",
        "Hard Freeze Warning": "#9400D3",
        "Hard Freeze Watch": "#4169E1",
        "Hazardous Materials Warning": "#4B0082",
        "Hazardous Seas Warning": "#D8BFD8",
        "Hazardous Seas Watch": "#483D8B",
        "Heat Advisory": "#FF7F50",
        "Heavy Freezing Spray Warning": "#00BFFF",
        "Heavy Freezing Spray Watch": "#BC8F8F",
        "High Surf Advisory": "#BA55D3",
        "High Surf Warning": "#228B22",
        "High Wind Warning": "#DAA520",
        "High Wind Watch": "#B8860B",
        "Hurricane Force Wind Warning": "#CD5C5C",
        "Hurricane Force Wind Watch": "#9932CC",
        "Hurricane Warning": "#DC143C",
        "Hurricane Watch": "#FF00FF",
        "Hydrologic Advisory": "#00FF7F",
        "Ice Storm Warning": "#8B008B",
        "Lake Effect Snow Advisory": "#48D1CC",
        "Lake Effect Snow Warning": "#008B8B",
        "Lake Effect Snow Watch": "#87CEFA",
        "Lake Wind Advisory": "#D2B48C",
        "Lakeshore Flood Advisory": "#7CFC00",
        "Lakeshore Flood Warning": "#228B22",
        "Lakeshore Flood Watch": "#66CDAA",
        "Law Enforcement Warning": "#C0C0C0",
        "Local Area Emergency": "#C0C0C0",
        "Low Water Advisory": "#A52A2A",
        "Nuclear Power Plant Warning": "#4B0082",
        "Radiological Hazard Warning": "#4B0082",
        "Red Flag Warning": "#FF1493",
        "Severe Thunderstorm Warning": "#FFA500",
        "Severe Thunderstorm Watch": "#DB7093",
        "Shelter In Place Warning": "#FA8072",
        "Small Craft Advisory": "#D8BFD8",
        "Small Craft Advisory For Hazardous Seas": "#D8BFD8",
        "Small Craft Advisory For Rough Bar": "#D8BFD8",
        "Small Craft Advisory For Winds": "#D8BFD8",
        "Small Stream Flood Advisory": "#00FF7F",
        "Special Marine Warning": "#FFA500",
        "Storm Warning": "#9400D3",
        "Storm Watch": "#FFE4B5",
        "Test": "#F0FFFF",
        "Tornado Warning": "#FF0000",
        "Tornado Watch": "#FFFF00",
        "Tropical Storm Warning": "#B22222",
        "Tropical Storm Watch": "#F08080",
        "Tsunami Advisory": "#D2691E",
        "Tsunami Warning": "#FD6347",
        "Tsunami Watch": "#FF00FF",
        "Typhoon Warning": "#DC143C",
        "Typhoon Watch": "#FF00FF",
        "Urban and Small Stream Flood Advisory": "#00FF7F",
        "Volcano Warning": "#2F4F4F",
        "Wind Advisory": "#D2B48C",
        "Wind Chill Advisory": "#AFEEEE",
        "Wind Chill Warning": "#B0C4DE",
        "Wind Chill Watch": "#5F9EA0",
        "Winter Storm Warning": "#FF69B4",
        "Winter Storm Watch": "#4682B4",
        "Winter Weather Advisory": "#7B68EE",
    },

    activeCAPS: [], // Array of active NWS alerts, cleared at each check, to help determine maintenance / cleaning up of alerts.
    toPush: [], // Array of alerts to push to clients in the postParse function.

    /**
     * Process some things before we begin parsing and dealing with alerts from external feeds.
     */

    preParse: function () {
        return new Promise(async (resolve, reject) => {
            Eas.activeCAPS = [];
            Eas.toPush = [];
            resolve();
        });
    },

    /**
     * Executed from cron; pass NWS CAPS alert data in and parse it and deal with it accordingly.
     * @constructor
     * @param {string} county - The name of the county the data comes from
     * @param {string} body - The CAPS body response to parse
     */

    parseCAPS: function (county, body) {
        return new Promise(async (resolve, reject) => {
            try {
                parseString(body, async function (err, result) { // Response is in XML. We need to convert to JSON.
                    if (err)
                    {
                        sails.log.error(err);
                        reject();
                    } else {
                        result.feed.entry.forEach(function (entry, indexer) {
                            if (typeof entry['id'] != 'undefined' && typeof entry['cap:status'] != 'undefined' && entry['cap:status'][0] == 'Actual')
                            { // Skip any entries that do not have an ID or do not have a status of "Actual"; they're not real alerts.
                                if (moment().isBefore(moment(entry['cap:expires'][0])))
                                { // Only flash the bulbs if the alert is in effect. Sometimes, NWS will issue a delayed alert.
                                    var color = "#787878";
                                    if (entry['cap:event'][0] in Eas.nwsalerts) { // Is the alert in our array of alerts to alert for?
                                        color = Eas.nwsalerts[entry['cap:event'][0]];
                                    } else {
                                        return null;
                                    }
                                    Eas.addAlert(entry['id'][0], 'NWS', county, entry['cap:event'][0], entry['cap:severity'][0], moment(entry['cap:effective'][0]).toISOString(), moment(entry['cap:expires'][0]).toISOString(), color);
                                    Eas.activeCAPS.push(entry['id'][0]);
                                } else {
                                }
                            } else {
                            }
                        });
                        resolve();
                    }
                });
            } catch (e) {
                sails.log.error(e);
                reject();
            }
        });
    },

    /**
     * Add an alert to our records.
     * @constructor
     * @param {string} reference - The unique id given by the source for this alert.
     * @param {string} source - The source this alert came from.
     * @param {string} county - The alert applies to this specified county.
     * @param {string} alert - The alert event.
     * @param {string} severity - Either Extreme, Severe, Moderate, or Minor.
     * @param {ISO string} starts - The alert goes into effect at this date and time.
     * @param {ISO string} expires - The alert expires at this date and time.
     * @param {string} color - The hexadecimal color that applies to this alert.
     * @param {string} information - Optionally, information / instructions for the public regarding this alert. Leave null for external sources; this function will grab that automatically.
     */

    addAlert: function (reference, source, county, alert, severity, starts, expires, color, information = null) {
        return new Promise(async (resolve, reject) => {
            try {

                // Get the alert if it already exists in the database
                console.log('Getting record');
                var record = await Eas.findOne({source: source, reference: reference})
                        .intercept((err) => {
                            sails.log.error(err);
                            reject();
                        });
                if (record) // Exists
                {
                    console.log('Record found');
                    // Detect if the county issuing the alert is already in the alert. If not, add the county in.
                    var temp = record.counties.split(', ');
                    if (temp.indexOf(county) == -1)
                        temp.push(county);
                    temp = temp.join(', ');

                    var criteria = {
                        source: source,
                        reference: reference,
                        alert: alert,
                        severity: severity,
                        color: color,
                        counties: temp,
                        starts: starts,
                        expires: expires
                    };
                    if (information !== null)
                        criteria.information = information;

                    // Detect any changes in the alert. If a change is detected, we will push it to clients.
                    console.log('Checking for changes');
                    var updateIt = false;
                    for (var key in criteria)
                    {
                        if (criteria.hasOwnProperty(key))
                        {
                            if (criteria[key] != record[key])
                            {
                                updateIt = true;
                            }
                        }
                    }
                    if (updateIt)
                        criteria.push = true;
                    console.log('Updating');
                    await Eas.update({ID: record.ID}, criteria)
                            .intercept((err) => {
                                sails.log.error(err);
                                reject();
                            });
                    resolve();
                } else { // Does not exist
                    console.log('record not found');
                    var criteria = {
                        source: source,
                        reference: reference,
                        alert: alert,
                        severity: severity,
                        color: color,
                        counties: county,
                        starts: starts,
                        expires: expires,
                        information: information,
                        push: true
                    };

                    // Create it in our database
                    console.log('Creating');
                    var record = await Eas.create(criteria)
                            .intercept((err) => {
                                sails.log.error(err);
                                reject();
                            })
                            .fetch();

                    // If this alert came from NWS, we need to GET a separate URL for alert information.
                    if (source == 'NWS')
                    {
                        console.log('NWS source. Getting alert data.')
                        needle('get', reference)
                                .then(async function (resp) {
                                    console.log('Parsing');
                                    parseString(resp.body, async function (err2, result) { // Response is in XML. We need to convert to JSON.
                                        try {
                                            if (err2)
                                            {
                                                sails.log.error(err2);
                                                reject();
                                            } else {
                                                console.log('Updating the database');
                                                await Eas.update({reference: reference}, {information: result.alert.info[0].description[0] + ". Precautionary / Preparedness actions: " + result.alert.info[0].instruction[0]})
                                                        .intercept((err) => {
                                                            sails.log.error(err);
                                                            reject();
                                                        })
                                            }
                                            resolve();
                                        } catch (e) {
                                            sails.log.error(e);
                                            reject();
                                        }
                                    });
                                })
                                .catch(function (err) {
                                    sails.log.error(err);
                                    reject();
                                });
                    } else {
                        resolve();
                    }
                }
            } catch (e) {
                sails.log.error(e);
                reject();
            }
        });
    },

    /**
     * Process some things after getting alert information. This also sends out alerts that need to be pushed/updated.
     */

    postParse: function () {
        return new Promise(async (resolve, reject) => {
            var sendit = [];

            // Get all active alerts from the database.
            var records = await Eas.find()
                    .intercept((err) => {
                        sails.log.error(err);
                        reject();
                    })

            // Async is tricky for forEach loops! Use the helper.
            await sails.helpers.asyncForEach(records, async (record) => {
                // Remove NWS alerts no longer listed in the CAPS; we assume those alerts were expired. Notify clients of the alert being removed.
                if (record.source == 'NWS' && Eas.activeCAPS.indexOf(record.reference) == -1)
                {
                    await Eas.destroy({ID: record.ID})
                            .intercept((err) => {
                                sails.log.error(err);
                                reject();
                            });
                    sails.sockets.broadcast('EAS-delete', 'EAS-delete', record.ID);
                    return null;
                }

                // Remove expired alerts, and notify clients of deleted alerts
                if (moment().isAfter(moment(record.expires)))
                {
                    await Eas.destroy({ID: record.ID})
                            .intercept((err) => {
                                sails.log.error(err);
                                reject();
                            });
                    sails.sockets.broadcast('EAS-delete', 'EAS-delete', record.ID);
                    return null;
                }

                // If this alert needs to be pushed, either because it's new or updated, throw it in the sendit array to be pushed.
                if (record.push)
                    sendit.push(record);
            });
            // Push out alerts to clients
            if (sendit.length > 0)
                sails.sockets.broadcast('EAS', 'EAS', sendit);

            // Mark these alerts as having been pushed; they do not need pushing anymore unless they get changed later.
            await Eas.update({push: true}, {push: false})
                    .intercept((err) => {
                        sails.log.error(err);
                        reject();
                    });
            resolve();
        });
    },

};

