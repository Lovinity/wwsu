/* global sails, Meta */

module.exports = {

    friendlyName: 'sails.helpers.songs.calculateQueueLength',

    description: 'Re-calculates how much audio is in the automation queue and returns the float in seconds. Should NOT be used by the checks CRON (it has a specialized version of this); this is for switching states and getting an accurate queue time after changing stuff in the automation queue.',

    inputs: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug(`helper songs.calculateQueueLength called.`);
        try {
            var queue = await sails.helpers.rest.getQueue();
            var queueLength = 0;

            // When on queue to go live or return from break, search for the position of the last noMeta track
            var breakQueueLength = -2;
            var firstNoMeta = 0;
            if ((Meta['A'].state.includes("_returning") || Meta['A'].state === 'automation_live' || Meta['A'].state === 'automation_remote' || Meta['A'].state === 'automation_sports' || Meta['A'].state === 'automation_sportsremote'))
            {
                breakQueueLength = -1;
                firstNoMeta = -1;
                queue.map((track, index) => {
                    if (sails.config.custom.subcats.noMeta && sails.config.custom.subcats.noMeta.indexOf(parseInt(track.IDSubcat)) === -1)
                    {
                        if (firstNoMeta > -1 && breakQueueLength < 0)
                        {
                            breakQueueLength = index;
                        }
                    } else if (firstNoMeta < 0)
                    {
                        firstNoMeta = index;
                    }
                });
            }

            // Determine the queue length
            queue
                    .filter((track, index) => index < breakQueueLength || (breakQueueLength < 0 && firstNoMeta > -1))
                    .map(track => queueLength += (track.Duration - track.Elapsed));

            return exits.success(queueLength);
        } catch (e) {
            return exits.error(e);
        }

    }


};

