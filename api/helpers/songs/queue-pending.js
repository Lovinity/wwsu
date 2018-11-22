/* global sails, Songs */

module.exports = {

    friendlyName: 'songs.queuePending',

    description: 'Queue songs that have been added to the pending list, such as duplicate underwritings.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug(`Helper songs.queuePending called.`);

        // Load in any duplicate non-music tracks that were removed prior, to ensure underwritings etc get proper play counts.
        if (Songs.pending.length > 0)
        {
            var maps = Songs.pending.map(async (track, index) => {
                await sails.helpers.rest.cmd('LoadTrackToTop', track);
                //wait.for.time(1);
                delete Songs.pending[index];
                return true;
            });
            await Promise.all(maps);
        }
        // All done.
        return exits.success();

    }


};

