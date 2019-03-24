/* global sails, Meta, Logs, Xp */

//TODO: rename to queue-top-add

module.exports = {

    friendlyName: 'songs / queue-add',

    description: 'Queue a Top Add into RadioDJ, and play it if necessary.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller songs/get called.');

        try {
            
            // Log it
            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'topadd', loglevel: 'info', logsubtype: Meta['A'].show, event: '<strong>Top Add requested.</strong>'}).fetch()
                    .tolerate((err) => {
                        // Do not throw for an error, but log it.
                        sails.log.error(err);
                    });

            // Queue it
            await sails.helpers.songs.queue(sails.config.custom.subcats.adds, 'Top', 1, true);

            // Play it
            await sails.helpers.rest.cmd('EnableAssisted', 0);
            await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);

            // Earn XP for playing a Top Add, if the show is live
            if (Meta['A'].state.startsWith("live_"))
            {
                await Xp.create({dj: Meta['A'].dj, type: 'xp', subtype: 'topadd', amount: sails.config.custom.XP.topAdd, description: "DJ played a Top Add."})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });
            }

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
