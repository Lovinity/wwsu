/* global sails, Requests, _ */

module.exports = {

    friendlyName: 'rest.removeMusic',

    description: 'Remove all music-type tracks from the active RadioDJ queue.',

    inputs: {
        keepRequests: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, we will not delete any tracks that are in the queue that were requested.'
        },
        general: {
            type: 'boolean',
            defaultsTo: true,
            description: "If true, will NOT remove tracks found in config.categories.noClearGeneral. Otherwise, uses config.categories.noClearShow."
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
                    // If the track is not in a noClear category, remove it
                    if (parseInt(queue[loopposition].ID) !== 0 && ((inputs.general && sails.config.custom.subcats.noClearGeneral.indexOf(parseInt(queue[loopposition].IDSubcat)) === -1) || (!inputs.general && sails.config.custom.subcats.noClearShow.indexOf(parseInt(queue[loopposition].IDSubcat)) === -1)))
                    {
                        sails.log.verbose(`CLEAR`);
                        // If it was requested to keep track requests in the queue, skip over any tracks that were requested.
                        if (!inputs.keepRequests || Requests.pending.indexOf(parseInt(queue[loopposition].ID)) === -1)
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

