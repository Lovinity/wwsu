/* global sails, Meta, Logs, Status, Xp, moment */

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
            // Block this request if we are already trying to change states
            if (Meta['A'].changingState !== null)
                return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`));

            // Lock so that other state changing requests get blocked until we are done
            await Meta.changeMeta({changingState: `Going into break`});

            // Do not allow a halftime break if not in a sports broadcast
            if (!Meta['A'].state.startsWith("sports") && inputs.halftime)
                inputs.halftime = false;

            // Log it
            await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'break', loglevel: 'info', logsubtype: Meta['A'].show, event: '<strong>Break requested.</strong>'}).fetch()
                    .tolerate((err) => {
                        // Do not throw for errors, but log it.
                        sails.log.error(err);
                    });

            // halftime break? Play a station ID and then begin halftime music
            if (inputs.halftime)
            {
                // Queue and play tracks
                await sails.helpers.rest.cmd('EnableAssisted', 1);
                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                await sails.helpers.rest.cmd('EnableAssisted', 0);
                await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.before);
                await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.duringHalftime);

                Status.errorCheck.prevID = moment();
                Status.errorCheck.prevBreak = moment();
                await sails.helpers.error.count('stationID');

                // Change state to halftime mode
                if (Meta['A'].state.startsWith("sportsremote"))
                {
                    await Meta.changeMeta({state: 'sportsremote_halftime', lastID: moment().toISOString(true)});
                } else {
                    await Meta.changeMeta({state: 'sports_halftime', lastID: moment().toISOString(true)});
                }

                // Standard break
            } else {
                Status.errorCheck.prevBreak = moment();

                // Queue and play tracks
                await sails.helpers.rest.cmd('EnableAssisted', 1);
                var d = new Date();
                var num = d.getMinutes();
                // Queue station ID if between :55 and :05, or if it's been more than 50 minutes since the last ID break.
                if (num >= 55 || num < 5 || Status.errorCheck.prevID === null || moment().diff(moment(Status.errorCheck.prevID)) > (60 * 50 * 1000))
                {
                    await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                    Status.errorCheck.prevID = moment();
                    await sails.helpers.error.count('stationID');
                    await Meta.changeMeta({lastID: moment().toISOString(true)});

                    // Earn XP for doing the top of the hour ID break, if the show is live
                    if (Meta['A'].state.startsWith("live_") && (num >= 55 || num < 5))
                    {
                        await Xp.create({dj: Meta['A'].dj, type: 'xp', subtype: 'id', amount: sails.config.custom.XP.ID, description: "DJ played an on-time Top of the Hour ID break."})
                                .tolerate((err) => {
                                    // Do not throw for error, but log it
                                    sails.log.error(err);
                                });
                    }
                }

                // Execute appropriate breaks, and switch state to break
                switch (Meta['A'].state)
                {
                    case 'live_on':
                        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.live.before);
                        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.live.during);
                        await Meta.changeMeta({state: 'live_break'});
                        break;
                    case 'remote_on':
                        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.before);
                        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.remote.during);
                        await Meta.changeMeta({state: 'remote_break'});
                        break;
                    case 'sports_on':
                        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.before);
                        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.during);
                        await Meta.changeMeta({state: 'sports_break'});
                        break;
                    case 'sportsremote_on':
                        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.before);
                        await sails.helpers.break.executeArray(sails.config.custom.specialBreaks.sports.during);
                        await Meta.changeMeta({state: 'sportsremote_break'});
                        break;
                }

                await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                await sails.helpers.rest.cmd('EnableAssisted', 0);
            }

            await Meta.changeMeta({changingState: null});
            return exits.success();
        } catch (e) {
            await Meta.changeMeta({changingState: null});
            return exits.error(e);
        }

    }


};
