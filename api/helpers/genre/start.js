/* global sails, Events, Meta, Logs, Playlists, moment, Calendar, Attendance */

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
            // Do not start a genre if we're not in genre rotation or automation.
            if (Meta['A'].state === 'automation_on' || (Meta['A'].state === 'automation_genre'))
            {
                // Do not start a genre if we are in the middle of changing states, unless ignoreChangingState was provided true.
                if (Meta['A'].changingState === null || inputs.ignoreChangingState)
                {
                    // Lock future state changes until we are done if ignoreChangingState is false.
                    if (!inputs.ignoreChangingState)
                        await Meta.changeMeta({changingState: `Switching to genre`});

                    // Find the manual RadioDJ event for Node to trigger
                    var event = await Events.find({type: 3, name: inputs.event, enabled: 'True'});
                    sails.log.verbose(`Events returned ${event.length} matched events, but we're only going to use the first one.`);
                    sails.log.silly(event);

                    // We cannot find the event. Throw an error.
                    if (event.length <= 0)
                    {
                        if (!inputs.ignoreChangingState)
                            await Meta.changeMeta({changingState: null});
                        return exits.error(new Error(`The provided event name was not found as an active manual event in RadioDJ.`));
                    }

                    await sails.helpers.rest.cmd('RefreshEvents', 0, 10000); // Reload events in RadioDJ just in case

                    await sails.helpers.rest.cmd('EnableAutoDJ', 0); // Don't want RadioDJ queuing tracks until we have switched rotations
                    await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearGeneral, true); // We want the rotation change to be immediate; clear out any music tracks in the queue. But, leave requested tracks in the queue.
                    await sails.helpers.rest.cmd('EnableAssisted', 0);

                    await sails.helpers.rest.cmd('RunEvent', event[0].ID, 5000); // This triggers the change in rotation.
                    await sails.helpers.rest.cmd('EnableAutoDJ', 1);

                    // If we are going back to default rotation, we don't want to activate genre mode; leave in automation_on mode
                    if (inputs.event !== 'Default')
                    {
                        var attendance = await Attendance.createRecord(`Genre: ${inputs.event}`);
                        await Meta.changeMeta({state: 'automation_genre', genre: inputs.event});
                        await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'sign-on', loglevel: 'primary', logsubtype: '', event: '<strong>Genre started.</strong><br />Genre: ' + inputs.event}).fetch()
                                .tolerate((err) => {
                                    sails.log.error(err);
                                });
                        await sails.helpers.onesignal.sendEvent(`Genre: `, inputs.event, `Genre`, attendance.unique);
                    } else {
                        var attendance = await Attendance.createRecord(`Genre: Default`);
                        await Meta.changeMeta({state: 'automation_on', genre: 'Default'});
                        await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'sign-on', loglevel: 'primary', logsubtype: '', event: '<strong>Default rotation started.</strong>'}).fetch()
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

