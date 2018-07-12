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
            await sails.helpers.asyncForEach(Songs.pending, function (track, index) {
                return new Promise(async (resolve2, reject2) => {
                    await sails.helpers.rest.cmd('LoadTrackToTop', track);
                    delete Songs.pending[index];
                    return resolve2(false);
                });
            });
        }
        // All done.
        return exits.success();

    }


};

