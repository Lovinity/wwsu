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
        try {
            // First, get a snapshot of the current queue.
            var queue = await sails.helpers.rest.getQueue();

            // Then, remove the entire queue.
            await sails.helpers.rest.cmd("ClearPlaylist");

            // Next, filter out all the non-music tracks out of the array, using a reverse for loop
            for (i = queue.length - 1; i >= 0; i -= 1) {
                if (parseInt(queue[i].ID) !== 0 && ((inputs.general && sails.config.custom.subcats.noClearGeneral.indexOf(parseInt(queue[i].IDSubcat)) === -1) || (!inputs.general && sails.config.custom.subcats.noClearShow.indexOf(parseInt(queue[i].IDSubcat)) === -1)))
                {
                    // If it was requested to keep track requests in the queue, skip over any tracks that were requested.
                    if (!inputs.keepRequests || Requests.pending.indexOf(parseInt(queue[i].ID)) === -1)
                    {
                        sails.log.verbose(`REMOVING`);
                        queue.splice(i, 1);
                    }
                }
            }

            // Finally, re-queue the remaining tracks
            if (queue.length > 0)
            {
                await sails.helpers.asyncForEach(queue, function (track, index) {
                    return new Promise(async (resolve, reject) => {
                        await sails.helpers.rest.cmd("LoadTrackToBottom", track.ID);
                        return resolve(false);
                    });
                });
            }

            return exits.success();
        } catch (e) {
            return exits.success();
        }
    }


};

