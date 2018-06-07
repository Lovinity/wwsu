/* global Meta, sails, Logs, Status, Playlists, Calendar */

module.exports = {

    friendlyName: 'State / Automation',

    description: 'Request to go into automation mode.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller state/automation called.');
        sails.log.silly(`Parameters passed: ${inputs}`);

        try {
            // Log the request
            await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: Meta['A'].dj, event: 'DJ/Producer signed off and went to automation.'})
                    .catch((err) => {
                    });

            // Reset playlist information; if any playlists / events are scheduled, we want them to start up immediately.
            Playlists.played = moment('2002-01-01');
            Playlists.active.name = null;
            Playlists.active.ID = 0;
            Playlists.active.position = -1;

            await sails.helpers.rest.cmd('EnableAssisted', 1);

            // If coming out of a sports broadcast, queue a closer if exists, a station ID, and up to 3 pending requests. Load any scheduled playlists/rotations.
            if (Meta['A'].state.startsWith("sports"))
            {
                if (typeof sails.config.custom.sportscats[Meta['A'].dj] !== 'undefined')
                {
                    await sails.helpers.songs.queue([sails.config.custom.sportscats[Meta['A'].dj]["Sports Closers"]], 'Top', 1);
                } else {
                    await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Top', 1);
                }

                await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                await sails.helpers.rest.cmd('EnableAssisted', 0);

                await Meta.changeMeta({state: 'automation_on', dj: '', track: '', topic: '', webchat: true, playlist: null, playlist_position: -1, playlist_played: null});

                // Add up to 3 track requests if any are pending
                await sails.helpers.requests.queue(3, true, true);

                // Re-load google calendar events to check for, and execute, any playlists/genres/etc that are scheduled. Load any scheduled playlists/rotations
                await Calendar.preLoadEvents();

                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1);
                Status.errorCheck.prevID = moment();
                await sails.helpers.error.count('stationID');
                // otherwise queue a station ID, and up to 3 pending requests.
            } else {
                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1);
                Status.errorCheck.prevID = moment();
                await sails.helpers.error.count('stationID');

                await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                await sails.helpers.rest.cmd('EnableAssisted', 0);

                await Meta.changeMeta({state: 'automation_on', dj: '', track: '', topic: '', webchat: true, playlist: null, playlist_position: -1, playlist_played: null});

                // Add up to 3 track requests if any are pending
                await sails.helpers.requests.queue(3, true, true);

                // Re-load google calendar events to check for, and execute, any playlists/genres/etc that are scheduled.
                await Calendar.preLoadEvents();
            }

            // Enable Auto DJ
            await sails.helpers.rest.cmd('EnableAutoDJ', 1);

            return exits.success();

        } catch (e) {
            return exits.error(e);
        }

    }


};
