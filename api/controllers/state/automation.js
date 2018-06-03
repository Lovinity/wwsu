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
                    .intercept((err) => {
                    });

            // Change meta and state
            Meta.changeMeta({state: 'automation_on', dj: '', track: '', topic: '', webchat: true, playlist: null, playlist_position: -1, playlist_played: null});
            
            // Reset playlist information; if any playlists / events are scheduled, we want them to start up immediately.
            Playlists.played = moment('2002-01-01');
            Playlists.active.name = null;
            Playlists.active.ID = 0;
            Playlists.active.position = -1;
            
            // Operation: Queue a station ID, queue up to 3 pending track requests, load any scheduled playlists/rotations, and enable Auto DJ.
            await sails.helpers.rest.cmd('EnableAssisted', 1);
            await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Top', 1);
            Status.errorCheck.prevID = moment();
            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
            await sails.helpers.rest.cmd('EnableAssisted', 0);
            
            // Add up to 3 track requests if any are pending
            await sails.helpers.requests.queue(3, true, true);
            
            // Re-load google calendar events to check for, and execute, any playlists/genres/etc that are scheduled.
            await Calendar.preLoadEvents();
            
            // Enable autoDJ
            await sails.helpers.rest.cmd('EnableAutoDJ', 1);
        } catch (e) {
            return exits.error(e);
        }
        return exits.success();

    }


};
