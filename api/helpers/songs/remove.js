/* global sails, Requests, _ */

module.exports = {

    friendlyName: 'songs.remove',

    description: 'Remove tracks from the automation queue that fall (or do not fall) in the specified subcategories.',

    inputs: {
        exclusive: {
            type: 'boolean',
            required: true,
            description: `If false, tracks in the specified subcategories will be removed. If true, tracks NOT in the specified subcategories will be removed.`
        },
        subcategories: {
            type: 'ref',
            required: true,
            description: `An array of subcategory IDs.`
        },
        keepRequests: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, we will not delete any tracks that are in the queue that were requested.'
        },
        noRequeue: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If false, system will clear the entire queue and re-queue tracks that meet criteria. If true, system will remove tracks that fail specified criteria one by one instead of clearing the entire queue and re-queuing appropriate tracks.'
        }
    },

    fn: async function (inputs, exits) {
        // API NOTE: This should never throw an error unless we have to stop all execution.
        sails.log.debug('Helper songs.remove called.');

        try {

            // Get rid of all the null entries
            sails.log.debug(`Calling asyncForEach in songs.remove for getting rid of null entries`);
            await sails.helpers.asyncForEach(inputs.subcategories, function (subcategory, index) {
                return new Promise(async (resolve, reject) => {
                    if (subcategory === null)
                        delete inputs.subcategories[index];
                    return resolve(false);
                });
            });

            // Get a snapshot of the current queue.
            var queue = await sails.helpers.rest.getQueue();

            if (!inputs.noRequeue)
            {
                // Then, remove the entire queue.
                await sails.helpers.rest.cmd("ClearPlaylist");

                // Next, filter out all the necessary tracks
                for (i = queue.length - 1; i >= 0; i -= 1) {
                    if (parseInt(queue[i].ID) !== 0 && ((inputs.exclusive && inputs.subcategories.indexOf(parseInt(queue[i].IDSubcat)) === -1) || (!inputs.exclusive && inputs.subcategories.indexOf(parseInt(queue[i].IDSubcat)) !== -1)))
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
                    sails.log.debug(`Calling asyncForEach in songs.remove for re-queuing tracks`);
                    await sails.helpers.asyncForEach(queue, function (track, index) {
                        return new Promise(async (resolve, reject) => {
                            await sails.helpers.rest.cmd("LoadTrackToBottom", track.ID);
                            return resolve(false);
                        });
                    });
                }
                
                // Remove tracks one at a time instead of re-queuing a new playlist
            } else {
                for (i = queue.length - 1; i > 0; i -= 1) {
                    if (parseInt(queue[i].ID) !== 0 && ((inputs.exclusive && inputs.subcategories.indexOf(parseInt(queue[i].IDSubcat)) === -1) || (!inputs.exclusive && inputs.subcategories.indexOf(parseInt(queue[i].IDSubcat)) !== -1)))
                    {
                        // If it was requested to keep track requests in the queue, skip over any tracks that were requested.
                        if (!inputs.keepRequests || Requests.pending.indexOf(parseInt(queue[i].ID)) === -1)
                        {
                            sails.log.verbose(`REMOVING`);
                            await sails.helpers.rest.cmd('RemovePlaylistTrack', i - 1);
                        }
                    }
                }
            }

            return exits.success();
        } catch (e) {
            return exits.success();
        }
    }


};

