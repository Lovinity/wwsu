/* global Directors, sails, Status, Calendar */

module.exports.cron = {

    // Every minute on second 01, check for changes in directors on OpenProject.
    updateDirectors: {
        schedule: '1 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON updateDirectors triggered.`);
            await Directors.updateDirectors();
        },
        start: true
    },

    // Every minute on second 02, update Calendar.
    updateCalendar: {
        schedule: '2 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON updateCalendar triggered.`);
            await Calendar.preLoadEvents();
        },
        start: true
    },

    // Every minute on second 06, get NWS alerts for configured counties.
    EAS: {
        schedule: '6 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON EAS triggered.`);
            var moment = require("moment");
            var needle = require('needle');

            // Initial procedure
            await sails.helpers.eas.preParse();

            // Iterate through every configured county and get their weather alerts
            var complete = 0;
            await sails.helpers.asyncForEach(sails.config.custom.EAS.NWSX, function (county, index) {
                return new Promise(async (resolve, reject) => {
                    try {
                        sails.log.verbose(`Trying ${county.name}-${county.code}`);
                        needle('get', `https://alerts.weather.gov/cap/wwaatmget.php?x=${county.code}&y=0&t=${moment().valueOf()}`)
                                .then(async function (resp) {
                                    await sails.helpers.eas.parseCaps(county.name, resp.body);
                                    complete++;
                                    return resolve(false);
                                })
                                .catch(function (err) {
                                    // Do not reject on error; just go to the next county
                                    sails.log.error(err);
                                    return resolve(false);
                                });
                    } catch (e) {
                        // Do not reject on error; just go to the next county
                        sails.log.error(e);
                        return resolve(false);
                    }
                });
            });

            // If all counties succeeded, mark EAS-internal as operational
            if (complete >= sails.config.custom.EAS.NWSX.length)
            {
                Status.changeStatus([{name: 'EAS-internal', label: 'Internal EAS', data: 'All EAS NWS CAPS are operational.', status: 5}]);
            } else {
                Status.changeStatus([{name: 'EAS-internal', label: 'Internal EAS', data: `${complete} out of ${sails.config.custom.EAS.NWSX.length} EAS NWS CAPS are operational.`, status: 3}]);
            }

            // Finish up
            await sails.helpers.eas.postParse();
        },
        start: true
    },
};


