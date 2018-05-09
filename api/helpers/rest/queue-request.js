module.exports = {

    friendlyName: 'rest / queueRequest',

    description: 'Play/queue a request in RadioDJ.',

    inputs: {
        ID: {
            type: 'number',
            defaultsTo: 0,
            description: 'The ID number of the request to queue. If not provided, will queue the oldest pending request.'
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
        }
    },

    fn: async function (inputs, exits) {
        try {
            var query = {played: 0};
            if (typeof inputs.ID != 0)
                query.ID = inputs.ID;

            // End if consider_playlist and we are not in automation mode.
            if (inputs.consider_playlist && Meta['A'].state != 'automation_on' && Meta['A'].state != 'automation_genre')
            {
                return exits.success(false);
            }

            var queue = await sails.helpers.rest.getQueue();
            var checked = [];
            var record;
            
            // Get a request
            var getRequest = function () {
                return new Promise(async (resolve, reject) => {
                    if (checked.length > 0)
                        query.ID = {'!=': checked};
                    record = await Requests.find(query).limit(1)
                            .intercept((err) => {
                                return reject(err);
                            });
                            if (typeof record != 'undefined' && typeof record[0] != 'undefined' && record.length > 0 && Requests.pending.indexOf(record[0].songID) != -1)
                            {
                                checked.push(record[0].ID);
                                await getRequest();
                            }
                    return resolve();
                });
            };
            await getRequest();
            if (typeof record != 'undefined' && typeof record[0] != 'undefined')
            {
                record = record[0];

                // Check to see if the requested track is already in the queue. If so, terminate.
                var inQueue = false;
                queue.forEach(function (track) {
                    if (record.ID == track.ID)
                        inQueue = true;
                });
                if (inQueue)
                    return exits.success(false);

                // Prepare the request
                Requests.pending.push(record.songID);
                //sails.sockets.broadcast('message-delete', 'message-delete', {type: 'request', id: record.ID});

                // Process the request depending on which state we are in now
                switch (Meta['A'].state)
                {
                    case 'live_on':
                        await sails.helpers.rest.cmd('EnableAssisted', 1);
                        await sails.helpers.rest.cmd('LoadTrackToTop', record.songID);
                        sails.helpers.rest.cmd('EnableAssisted', 0);
                        sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                        await Meta.changeMeta({state: 'live_returning'});
                        return exits.success(true);
                        break;
                    case 'remote_on':
                        await sails.helpers.rest.cmd('EnableAssisted', 1);
                        await sails.helpers.rest.cmd('LoadTrackToTop', record.songID);
                        sails.helpers.rest.cmd('EnableAssisted', 0);
                        sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                        await Meta.changeMeta({state: 'remote_returning'});
                        return exits.success(true);
                        break;
                    case 'sports_on':
                        await sails.helpers.rest.cmd('EnableAssisted', 1);
                        await sails.helpers.rest.cmd('LoadTrackToTop', record.songID);
                        sails.helpers.rest.cmd('EnableAssisted', 0);
                        sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                        await Meta.changeMeta({state: 'sports_returning'});
                        return exits.success(true);
                        break;
                    case 'sportsremote_on':
                        await sails.helpers.rest.cmd('EnableAssisted', 1);
                        await sails.helpers.rest.cmd('LoadTrackToTop', record.songID);
                        sails.helpers.rest.cmd('EnableAssisted', 0);
                        sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                        await Meta.changeMeta({state: 'sportsremote_returning'});
                        return exits.success(true);
                        break;
                    default:
                        if (inputs.liner_first)
                        {
                            await sails.helpers.rest.cmd('LoadTrackToTop', record.songID);
                            await sails.helpers.rest.queueFromSubcategory('Request Liners', 'Jingles', 'Top', 1);
                            return exits.success(true);
                        } else {
                            await sails.helpers.rest.cmd('LoadTrackToTop', record.songID);
                            return exits.success(true);
                        }
                        break;
                }
            } else {
                return exits.success(false);
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};

