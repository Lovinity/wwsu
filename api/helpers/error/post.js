/* global Meta, sails */

module.exports = {

    friendlyName: 'error.post helper',

    description: 'Used after switching RadioDJ instances; resets the queue on the new RadioDJ instance if necessary.',

    inputs: {
        oldQueue: {
            type: 'ref',
            description: 'Array of Meta.automation before radioDJs were switched. This will be re-queued in the new RadioDJ.',
            required: false
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper error.post called.');
        try {
            var reQueue = [];
            if (inputs.oldQueue && inputs.oldQueue.length > 1)
            {
                try {
                    inputs.oldQueue
                            .filter((queueItem, index) => index > 0)
                            .map(queueItem => reQueue.push(queueItem.ID));
                } catch (e2) {
                    // Do nothing on error
                }
            }
            // When in automation, but not playlist, queue an ID and re-queue oldQueue
            if (Meta['A'].state.startsWith("automation_") && Meta['A'].state !== 'automation_playlist')
            {
                sails.log.verbose(`Automation recovery triggered.`);
                await sails.helpers.rest.cmd('EnableAssisted', 1);
                await sails.helpers.rest.cmd('ClearPlaylist', 1);
                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1);
                await sails.helpers.rest.cmd('EnableAssisted', 0)
                await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                var maps = reQueue.map(async (queueItem) => await sails.helpers.songs.queue(queueItem, 'Bottom', 1));
                await Promise.all(maps);
                if (Meta['A'].state === 'automation_genre')
                {
                    await sails.helpers.genre.start(Meta['A'].genre, true);
                } else {
                    await sails.helpers.genre.start('Default', true);
                }
                ;
                await sails.helpers.rest.cmd('EnableAutoDJ', 1);
                // When in playlist or prerecord, queue an ID and restart the playlist/prerecord
            } else if (Meta['A'].state === 'automation_playlist' || Meta['A'].state === 'live_prerecord')
            {
                sails.log.verbose(`Playlist recovery triggered.`);
                await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                await sails.helpers.rest.cmd('EnableAssisted', 1);
                await sails.helpers.rest.cmd('ClearPlaylist', 1);
                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1);
                await sails.helpers.rest.cmd('EnableAssisted', 0);
                await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                var maps = reQueue.map(async (queueItem) => await sails.helpers.songs.queue(queueItem, 'Bottom', 1));
                await Promise.all(maps);
                // When in break, queue PSAs
            } else if (Meta['A'].state.includes("_break") || Meta['A'].state.includes("_returning") || Meta['A'].state.includes("_disconnected"))
            {
                sails.log.verbose(`Break recovery triggered.`);
                await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                await sails.helpers.rest.cmd('EnableAssisted', 1);
                await sails.helpers.rest.cmd('ClearPlaylist', 1);
                await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 1, false);
                await sails.helpers.rest.cmd('EnableAssisted', 0);
                await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                var maps = reQueue.map(async (queueItem) => await sails.helpers.songs.queue(queueItem, 'Bottom', 1));
                await Promise.all(maps);
                // Remote broadcasts; requeue remote track
            } else if (Meta['A'].state === 'remote_on' || Meta['A'].state === 'sportsremote_on')
            {
                await sails.helpers.songs.queue(sails.config.custom.subcats.remote, 'Bottom', 1);
                await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                await sails.helpers.rest.cmd('EnableAssisted', 0);
            }

            // All done.
            return exits.success();

        } catch (e) {
            return exits.error(e);
        }

    }


};

