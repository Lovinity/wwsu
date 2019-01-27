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
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {
            var query = {played: 0};
            if (inputs.ID !== 0)
                query.ID = inputs.ID;

            // End if consider_playlist and we are not in automation mode.
            if (inputs.consider_playlist && Meta['A'].state !== 'automation_on' && Meta['A'].state !== 'automation_genre' && Meta['A'].state !== 'automation_playlist')
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
                        case 'remote_on':
                        case 'sports_on':
                        case 'sportsremote_on':
                            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                            await sails.helpers.rest.cmd('EnableAssisted', 0);
                            return resolve();
                            break;
                        default:
                            // For all other states, queue a request liner before we queue the requests
                            if (queuedSomething && inputs.liner_first)
                                await sails.helpers.songs.queue(sails.config.custom.subcats.requestLiners, 'Top', 1, false, null);
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
                    queue
                            .filter(track => record.songID === parseInt(track.ID))
                            .map(track => inQueue = true);
                    if (inQueue)
                    {
                        sails.log.verbose(`Track already in queue. Abandoning queueRequest.`);
                        return resolve(false);
                    }

                    // Prepare the request
                        await sails.helpers.rest.cmd('LoadTrackToTop', record.songID, 10000);
                    //wait.for.time(1);
                    if (!_.includes(Requests.pending, record.songID))
                    {
                        Requests.pending.push(record.songID);
                    }
                    return resolve(true);
                });
            };

            // Get a request
            var getRequest = function (quantity) {
                return new Promise(async (resolve, reject) => {
                    sails.log.verbose(`getRequest called: ${quantity}`);
                    if (checked.length > 0)
                        query.ID = {'!=': checked};
                    sails.log.silly(query);
                    record = await Requests.find(query).limit(1);
                    sails.log.silly(record);
                    if (typeof record !== 'undefined' && typeof record[0] !== 'undefined' && typeof record[0].ID !== 'undefined')
                    {
                        // Check if the request is already in the queue
                        var inQueue = false;
                        Meta.automation
                                .filter(track => parseInt(track.ID) === record[0].songID)
                                .map(track => inQueue = true);
                        // Skip it if so
                        if (inQueue)
                        {
                            sails.log.verbose(`getRequest abandoned: the track was already queued.`);
                            checked.push(record[0].ID);
                            await getRequest(quantity);
                            return resolve();
                            // Otherwise, queue it
                        } else {
                            checked.push(record[0].ID);
                            if (quantity === inputs.quantity)
                                await prepareRequests();
                            var temp = await queueRequest(record[0]);
                            if (temp)
                                queuedSomething = true;
                            if (quantity > 1) {
                                await getRequest(quantity - 1);
                                return resolve();
                            } else {
                                await finalizeRequests();
                                return resolve();
                            }
                        }
                    } else {
                        sails.log.verbose(`No more request records to process; exiting.`);
                        await finalizeRequests();
                        return resolve();
                    }
                });
            };

            queuedSomething = false;
            await getRequest(inputs.quantity);
            if (queuedSomething)
                return exits.success(true);
            return exits.success(false);
        } catch (e) {
            return exits.error(e);
        }
    }


};