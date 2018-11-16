/* global sails, Meta, Logs, Status */

module.exports = {

    friendlyName: 'State / Break',

    description: 'Go to a break.',

    inputs: {
        halftime: {
            type: 'boolean',
            defaultsTo: false,
            description: 'Halftime is true if this is an extended or halftime sports break, rather than a standard one.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller state/break called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {
            if (Meta['A'].changingState !== null)
                return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`));
            await Meta.changeMeta({changingState: `Going into break`});
            
            // Do not allow a halftime break if not in a sports broadcast
            if (!Meta['A'].state.startsWith("sports") && inputs.halftime)
                inputs.halftime = false;

            // Log it
            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'break', loglevel: 'info', logsubtype: Meta['A'].dj, event: 'Break requested.'})
                    .tolerate((err) => {
                        // Do not throw for errors, but log it.
                        sails.log.error(err);
                    });

            // halftime break? Play a station ID and then begin halftime music
            if (inputs.halftime)
            {
                await sails.helpers.rest.cmd('EnableAssisted', 1);
                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                await sails.helpers.songs.queuePending();
                Status.errorCheck.prevID = moment();
                Status.errorCheck.prevBreak = moment();
                await sails.helpers.error.count('stationID');
                await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                await sails.helpers.rest.cmd('EnableAssisted', 0);
                await sails.helpers.songs.queue(sails.config.custom.subcats.halftime, 'Bottom', 2);
                if (Meta['A'].state.startsWith("sportsremote"))
                {
                    await Meta.changeMeta({state: 'sportsremote_halftime'});
                } else {
                    await Meta.changeMeta({state: 'sports_halftime'});
                }

                // Standard break
            } else {
                Status.errorCheck.prevBreak = moment();
                await sails.helpers.rest.cmd('EnableAssisted', 1);
                await sails.helpers.songs.queuePending();
                await sails.helpers.songs.queue(sails.config.custom.subcats.PSAs, 'Bottom', 2, true);
                await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                await sails.helpers.rest.cmd('EnableAssisted', 0);
                switch (Meta['A'].state)
                {
                    case 'live_on':
                        await Meta.changeMeta({state: 'live_break'});
                        break;
                    case 'remote_on':
                        await Meta.changeMeta({state: 'remote_break'});
                        break;
                    case 'sports_on':
                        await Meta.changeMeta({state: 'sports_break'});
                        break;
                    case 'sportsremote_on':
                        await Meta.changeMeta({state: 'sportsremote_break'});
                        break;
                }
            }
            
            await Meta.changeMeta({changingState: null});
            return exits.success();
        } catch (e) {
            await Meta.changeMeta({changingState: null});
            return exits.error(e);
        }

    }


};
