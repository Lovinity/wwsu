/* global Directors, sails, Status, Calendar, Meta, Tasks */

module.exports.cron = {

    // Every minute at second 00, update work orders.
    // WORK ON THIS
    workOrders: {
        schedule: '0 * * * * *',
        onTick: async function () {
            await Tasks.updateTasks();
        },
        start: true
    },

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

    // Twice per minute, at 03 and 33, check the online status of the radio streams
    checkRadioStreams: {
        schedule: '3,33 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON checkRadioStreams triggered.`);
            var needle = require('needle');

            needle('get', sails.config.custom.stream)
                    .then(async function (resp) {
                        if (resp.body.includes("Mount Point /public"))
                        {
                            Status.changeStatus([{name: 'stream-public', label: 'Radio Stream', data: 'Public internet radio stream is operational.', status: 5}]);
                        } else {
                            Status.changeStatus([{name: 'stream-public', label: 'Radio Stream', data: 'Public internet radio stream appears to be offline.', status: 2}]);
                        }
                        if (resp.body.includes("Mount Point /remote"))
                        {
                            Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Remote internet radio stream is operational.', status: 5}]);
                        } else {
                            if (Meta['A'].state.includes("remote"))
                            {
                                Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Remote internet stream appears offline.', status: 2}]);
                            } else { // If we are not doing a remote broadcast, remote stream being offline is a non-issue
                                Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Remote internet stream appears offline, but that is not an issue at this time as a remote broadcast is not active.', status: 4}]);
                            }
                        }
                    })
                    .catch(function (err) {
                        Status.changeStatus([{name: 'stream-public', label: 'Radio Stream', data: 'Error trying to connect to internet stream server.', status: 2}]);
                        if (Meta['A'].state.includes("remote"))
                        {
                            Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Error trying to connect to internet stream server.', status: 2}]);
                        } else { // If we are not doing a remote broadcast, remote stream being offline is a non-issue
                            Status.changeStatus([{name: 'stream-remote', label: 'Remote Stream', data: 'Error trying to connect to internet stream server.', status: 4}]);
                        }
                    });
        },
        start: true
    },

    // Twice per minute at 04 and 34 seconds, check all RadioDJs for connectivity.
    checkRadioDJs: {
        schedule: '4,34 * * * * *',
        onTick: async function () {
            sails.log.debug(`CRON checkRadioDJs triggered.`);
            var needle = require('needle');

            await sails.helpers.asyncForEach(sails.config.custom.radiodjs, function (radiodj) {
                return new Promise(async (resolve, reject) => {
                    needle('get', `${radiodj.rest}/p?auth=${sails.config.custom.rest.auth}`)
                            .then(async function (resp) {
                                if (typeof resp.body !== 'undefined' && typeof resp.body.children !== 'undefined')
                                {
                                    Status.changeStatus([{name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: 'This RadioDJ reports operational.', status: 5}]);
                                } else {
                                    if (Meta['A'].radiodj === radiodj.rest)
                                    {
                                        Status.changeStatus([{name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: 'This RadioDJ is not reporting operational.', status: 2}]);
                                    } else {
                                        Status.changeStatus([{name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: 'This RadioDJ is not reporting operational.', status: 3}]);
                                    }
                                }
                                return resolve(false);
                            })
                            .catch(function (err) {
                                if (Meta['A'].radiodj === radiodj.rest)
                                {
                                    Status.changeStatus([{name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: 'This RadioDJ is not reporting operational.', status: 2}]);
                                } else {
                                    Status.changeStatus([{name: `radiodj-${radiodj.name}`, label: `RadioDJ ${radiodj.label}`, data: 'This RadioDJ is not reporting operational.', status: 3}]);
                                }
                                return resolve(false);
                            });
                });
            });
        },
        start: true
    },

    // Twice per minute at 05 and 35 seconds, check for connectivity to the website.
    checkWebsite: {
        schedule: '5,35 * * * * *',
        onTick: function () {
            sails.log.debug(`CRON checkWebsite triggered.`);
            var needle = require('needle');
            needle('get', sails.config.custom.website)
                    .then(async function (resp) {
                        if (typeof resp.body !== 'undefined')
                        {
                            Status.changeStatus([{name: `website`, label: `Website`, data: 'WWSU website appears online', status: 5}]);
                        } else {
                            Status.changeStatus([{name: `website`, label: `Website`, data: 'WWSU website appears to have an issue; expected body data was not returned.', status: 2}]);
                        }
                    })
                    .catch(function (err) {
                        Status.changeStatus([{name: `website`, label: `Website`, data: 'There was an error connecting to the WWSU website.', status: 2}]);
                    });
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
    // Every day at 11:59pm, clock out any directors still clocked in
    // WORK ON THIS
    clockOutDirectors: {
        schedule: '59 23 * * *',
        onTick: function () {
            var d = new Date();
            Timesheet.update({time_out: null}, {time_out: d, approved: 0}).exec(function (error, records) {
                Directors.loadDirectors(true, function () {});
            });
        },
        start: true
    },
};


