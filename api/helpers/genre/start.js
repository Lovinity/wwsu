/* global sails, Events, Meta, Logs, Playlists, moment */

module.exports = {

    friendlyName: 'genre.start',

    description: 'Start a RadioDJ rotation.',

    inputs: {
        event: {
            type: 'string',
            defaultsTo: 'Default',
            description: 'Name of the manual RadioDJ event to fire to start the rotation.'
        },
        ignoreChangingState: {
            type: 'boolean',
            defaultsTo: false,
            description: 'Set to true to ignore Meta.changingState conflict detection.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper genre.start called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {
            if (Meta['A'].state === 'automation_on' || (Meta['A'].state === 'automation_genre'))
            {
                if (Meta['A'].changingState === null || inputs.ignoreChangingState)
                {
                    if (!inputs.ignoreChangingState)
                        await Meta.changeMeta({changingState: `Switching to genre`});
                    // Find the manual RadioDJ event for Node to trigger
                    var event = await Events.find({type: 3, name: inputs.event, enabled: 'True'});
                    sails.log.verbose(`Events returned ${event.length} matched events, but we're only going to use the first one.`);
                    sails.log.silly(event);

                    if (event.length <= 0)
                    {
                        if (!inputs.ignoreChangingState)
                            await Meta.changeMeta({changingState: null});
                        return exits.error(new Error(`The provided event name was not found as an active manual event in RadioDJ.`));
                    }

                    await sails.helpers.rest.cmd('RefreshEvents', 0, 10000); // Reload events in RadioDJ just in case

                    await sails.helpers.rest.cmd('EnableAutoDJ', 0); // Don't want RadioDJ queuing tracks until we have switched rotations
                    await sails.helpers.rest.removeMusic(true); // We want the rotation change to be immediate; clear out any music tracks in the queue. But, leave requested tracks in the queue.
                    await sails.helpers.rest.cmd('EnableAssisted', 0);

                    await sails.helpers.rest.cmd('RunEvent', event[0].ID, 5000);
                    await sails.helpers.rest.cmd('EnableAutoDJ', 1);

                    // If we are going back to default rotation, we don't want to activate genre mode; leave in automation_on mode
                    if (inputs.event !== 'Default')
                    {
                        Playlists.played = moment();
                        await Meta.changeMeta({state: 'automation_genre', genre: inputs.event, playlist_played: moment().toISOString(true)});
                        await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: '', event: 'A genre was scheduled to start.' + "\n" + 'Genre: ' + inputs.event})
                                .tolerate((err) => {
                                    sails.log.error(err);
                                });
                    } else {
                        Playlists.played = moment('2002-01-01');
                        await Meta.changeMeta({state: 'automation_on', genre: '', playlist_played: moment("2002-01-01").toISOString(true)});
                        await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: '', event: 'Genre automation has ended; we switched to Default rotation.'})
                                .tolerate((err) => {
                                    sails.log.error(err);
                                });
                    }
                    if (!inputs.ignoreChangingState)
                        await Meta.changeMeta({changingState: null});
                } else {
                    sails.log.debug(`Helper SKIPPED.`);
                }
            }
            return exits.success();
        } catch (e) {
            if (!inputs.ignoreChangingState)
                await Meta.changeMeta({changingState: null});
            return exits.error(e);
        }

    }


};

