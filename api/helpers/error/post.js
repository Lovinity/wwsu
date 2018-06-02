/* global Meta, sails */

module.exports = {

    friendlyName: 'error.post helper',

    description: 'Used after switching RadioDJ instances; resets the queue on the new RadioDJ instance if necessary.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper error.post called.');
        try {
        if (Meta['A'].state.startsWith("automation_") && Meta['A'].state !== 'automation_playlist')
        {
            sails.log.verbose(`Automation recovery triggered.`);
            await sails.helpers.rest.cmd('EnableAssisted', 1);
            await sails.helpers.rest.cmd('ClearPlaylist', 1);
            if (Meta['A'].state === 'automation_genre')
                await sails.helpers.genre.start(Meta['A'].genre);
            await sails.helpers.songs.queue(sails.config.custom.subcats.music, 'Top', 3, true);
            await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1);
            await sails.helpers.rest.cmd('EnableAssisted', 0);
            await sails.helpers.rest.cmd('EnableAutoDJ', 1);
            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
        } else if (Meta['A'].state === 'automation_playlist' || Meta['A'].state === 'live_prerecord')
        {
            sails.log.verbose(`Playlist recovery triggered.`);
            await sails.helpers.rest.cmd('EnableAutoDJ', 0);
            await sails.helpers.rest.cmd('EnableAssisted', 1);
            await sails.helpers.rest.cmd('ClearPlaylist', 1);
            await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1);
            await sails.helpers.rest.cmd('EnableAssisted', 0);
            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
            await sails.helpers.playlists.start(Meta['A'].playlist, true, Meta['A'].state === 'live_prerecord' ? 1 : 0);
        } else if (Meta['A'].state.includes("_break") || Meta['A'].state.includes("_returning") || Meta['A'].state.includes("_disconnected"))
        {
            sails.log.verbose(`Break recovery triggered.`);
            await sails.helpers.rest.cmd('EnableAutoDJ', 0);
            await sails.helpers.rest.cmd('EnableAssisted', 1);
            await sails.helpers.rest.cmd('ClearPlaylist', 1);
            await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 2, false);
            await sails.helpers.rest.cmd('EnableAssisted', 0);
            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
        }

        // All done.
        return exits.success();
        
        } catch (e) {
            return exits.error(e);
        }

    }


};

