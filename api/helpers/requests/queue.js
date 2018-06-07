/* global Meta, sails, Requests, _ */

module.exports = {

    friendlyName: 'requests.queue',

    description: 'Play/queue requests in RadioDJ.',

    inputs: {
        quantity: {
            type: 'number',
            defaultsTo: 1,
            description: 'Number of requests to queue'
        },
        consider_playlist: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, request will only be queued if we are in automation mode.'
        },
        liner_first: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, a request liner will queue before this request is queued. Only applicable in non-show modes.'
        },
        ID: {
            type: 'number',
            defaultsTo: 0,
            description: 'The ID number of the request to queue. If not provided, will queue the oldest pending request.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper requests.queue called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            var query = {played: 0};
            if (typeof inputs.ID !== 0)
                query.ID = inputs.ID;

            // End if consider_playlist and we are not in automation mode.
            if (inputs.consider_playlist && Meta['A'].state !== 'automation_on' && Meta['A'].state !== 'automation_genre')
            {
                sails.log.verbose(`Helper abandoned: consider_playlist is true, and we are airing a playlist.`);
                return exits.success(false);
            }

            var queue = await sails.helpers.rest.getQueue();
            var checked = [];
            var record;
            var queuedSomething = false;

            // This function is called before queuing the first request, if we have one.
            var prepareRequests = function () {
                return new Promise(async (resolve, reject) => {
                    sails.log.verbose(`prepareRequests called.`);
                    switch (Meta['A'].state)
                    {
                        case 'live_on':
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                            return resolve();
                            break;
                        case 'remote_on':
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                            return resolve();
                            break;
                        case 'sports_on':
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                            return resolve();
                            break;
                        case 'sportsremote_on':
                            await sails.helpers.rest.cmd('EnableAssisted', 1);
                            return resolve();
                            break;
                        default:
                            return resolve();
                            break;
                    }
                });
            };

            // called when we are done queuing requests
            var finalizeRequests = function () {
                return new Promise(async (resolve, reject) => {
                    sails.log.verbose(`finalizeRequests called.`);
                    switch (Meta['A'].state)
                    {
                        case 'live_on':
                            if (queuedSomething)
                                await Meta.changeMeta({state: 'live_returning'});
                            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 0);
                            return resolve();
                            break;
                        case 'remote_on':
                            if (queuedSomething)
                                await Meta.changeMeta({state: 'remote_returning'});
                            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 0);
                            return resolve();
                            break;
                        case 'sports_on':
                            if (queuedSomething)
                                await Meta.changeMeta({state: 'sports_returning'});
                            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 0);
                            return resolve();
                            break;
                        case 'sportsremote_on':
                            if (queuedSomething)
                                await Meta.changeMeta({state: 'sportsremote_returning'});
                            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 0);
                            return resolve();
                            break;
                        default:
                            if (queuedSomething && inputs.liner_first)
                                await sails.helpers.songs.queue(sails.config.custom.subcats.requestLiners, 'Top', 1, false);
                            return resolve();
                            break;
                    }
                });
            };

            // This function queues a request into automation
            var queueRequest = function (record) {
                return new Promise(async (resolve, reject) => {
                    sails.log.verbose(`queueRequest called: ${record.ID}`);
                    // Check to see if the requested track is already in the queue. If so, terminate.
                    var inQueue = false;
                    queue.forEach(function (track) {
                        if (record.songID === track.ID)
                            inQueue = true;
                    });
                    if (inQueue)
                    {
                        sails.log.verbose(`Track already in queue. Abandoning queueRequest.`);
                        return resolve(false);
                    }

                    // Prepare the request
                    await sails.helpers.rest.cmd('LoadTrackToTop', record.songID);
                    if (!_.includes(Requests.pending, record.songID))
                        Requests.pending.push(record.songID);
                    return resolve(true);
                });
            };

            // Get a request
            var getRequest = function (quantity) {
                return new Promise(async (resolve, reject) => {
                    sails.log.verbose(`getRequest called: ${quantity}`);
                    if (checked.length > 0)
                        query.ID = {'!=': checked};
                    record = await Requests.find(query).limit(1)
                            .catch((err) => {
                                return reject(err);
                            });
                    sails.log.silly(`Request: ${record}`);
                    if (typeof record !== 'undefined' && typeof record[0] !== 'undefined' && record.length > 0 && Requests.pending.indexOf(record[0].songID) !== -1)
                    {
                        sails.log.verbose(`getRequest abandoned: the track was already queued.`);
                        checked.push(record[0].ID);
                        await getRequest(quantity);
                    } else {
                        if (quantity === inputs.quantity)
                            await prepareRequests();
                        var temp = await queueRequest(record);
                        if (temp)
                            queuedSomething = true;
                        if (quantity > 1) {
                            await getRequest(quantity - 1);
                        } else {
                            await finalizeRequests();
                            return resolve();
                        }
                    }
                });
            };

            await getRequest(inputs.quantity);
            if (queuedSomething)
                return exits.success(true);
            return exits.success(false);
        } catch (e) {
            return exits.error(e);
        }
    }


};