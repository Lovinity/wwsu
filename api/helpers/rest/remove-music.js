/* global sails, Requests, _ */

module.exports = {

    friendlyName: 'rest.removeMusic',

    description: 'Remove all music-type tracks from the active RadioDJ queue.',

    inputs: {
        keepRequests: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, we will not delete any tracks that are in the queue that were requested.'
        }
    },

    fn: async function (inputs, exits) {
        // API NOTE: This should never throw an error unless we have to stop all execution.
        sails.log.debug('Helper rest.removeMusic called.');
        var removetrack = async function (cb) {
            try {
                // Get current queue
                var queue = await sails.helpers.rest.getQueue();
                var terminateloop = false;
                var loopposition = 1;

                // Loop through all the tracks in the queue
                while (!terminateloop && loopposition < queue.length)
                {
                    sails.log.verbose(`Trying ${loopposition}`);
                    sails.log.verbose(`TrackType: ${queue[loopposition].TrackType}`);
                    sails.log.verbose(`Elapsed: ${queue[loopposition].Elapsed}`);
                    sails.log.verbose(`ID: ${queue[loopposition].ID}`);
                    // If the track is a music track, remove it
                    if (queue[loopposition].TrackType === 'Music' && queue[loopposition].ID !== 0)
                    {
                        sails.log.verbose(`MUSIC`);
                        // If it was requested to keep track requests in the queue, skip over any tracks that were requested.
                        if (!inputs.keepRequests || !_.includes(queue[loopposition].ID, Requests.pending))
                        {
                            sails.log.verbose(`REMOVING`);
                            terminateloop = true;
                            await sails.helpers.rest.cmd('RemovePlaylistTrack', loopposition - 1);

                            // We have to re-execute the entire function again after each time we remove something so we can load the new queue in memory and have correct position numbers.
                            setTimeout(async function () {
                                await removetrack(cb);
                            }, 100);
                        }
                    }
                    loopposition += 1;
                }
                if (!terminateloop)
                    cb();
            } catch (e) {
                sails.log.error(e);
                throw e;
            }
        };
        await removetrack(exits.success)
                .catch(e => {
                    return exits.error(e);
                });
    }


};

