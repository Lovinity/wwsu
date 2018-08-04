/* global sails, Meta, Logs, Status */

module.exports = {

    friendlyName: 'State / Sports',

    description: 'Request to begin a sports broadcast.',

    inputs: {
        topic: {
            type: 'string',
            defaultsTo: '',
            description: 'A string containing a short blurb about this sports broadcast.'
        },

        sport: {
            type: 'string',
            required: true,
            isIn: sails.config.custom.sports,
            description: 'Name of the sport that is being broadcasted.'
        },

        remote: {
            type: 'boolean',
            defaultsTo: false,
            description: 'True if this is a remote sports broadcast.'
        },

        webchat: {
            type: 'boolean',
            defaultsTo: true,
            description: 'Should the web chat be enabled during this broadcast? Defaults to true.'
        },

        djcontrols: {
            type: 'string',
            required: true,
            description: 'Name of the computer which is triggering this sports request (the sports request should be coming from DJ Controls).'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller state/sports called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {

            // Do not continue if not in sports or automation mode; client should request automation before requesting sports
            if (!Meta['A'].state.startsWith("sports") && !Meta['A'].state.startsWith("automation_"))
                return exits.error(new Error(`Cannot execute state/sports unless in automation or sports mode. Please go to automation first.`));

            if (Meta.changingState)
                return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`));
            Meta.changingState = true;

            // Filter profanity
            if (inputs.topic !== '')
                inputs.topic = await sails.helpers.filterProfane(inputs.topic);
            
            // Set meta to prevent accidental messages in DJ Controls
            Meta.changeMeta({dj: inputs.sport, topic: inputs.topic, track: ''});

            if (!Meta['A'].state.startsWith("sports"))
            {

                // Log this request
                await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: inputs.sport, event: 'Producer requested to start a sports broadcast.' + "\n" + 'Sport: ' + inputs.sport + "\n" + 'Remote?: ' + inputs.remote + "\n" + 'Topic: ' + inputs.topic})
                        .tolerate((err) => {
                            // Don't throw errors, but log them
                            sails.log.error(err);
                        });

                //await sails.helpers.error.count('goLive');

                // Operation: Remove all music tracks, queue a station ID, queue an opener if one exists for this sport, and start the next track if current track is music.
                await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                await sails.helpers.rest.removeMusic(false, false);
                await sails.helpers.rest.cmd('EnableAssisted', 1);
                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                if (typeof sails.config.custom.sportscats[inputs.sport] !== 'undefined')
                    await sails.helpers.songs.queue([sails.config.custom.sportscats[inputs.sport]["Sports Openers"]], 'Bottom', 1);
                Status.errorCheck.prevID = moment();
                await sails.helpers.error.count('stationID');
                await sails.helpers.rest.cmd('EnableAssisted', 0);

                // Due to timeliness of sports, skip currently playing track if it is a music track
                if (Meta.automation[0].TrackType === 'Music')
                    await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);

                // Change meta
                if (inputs.remote)
                {
                    Meta.changeMeta({state: 'automation_sportsremote', dj: inputs.sport, topic: inputs.topic, track: '', webchat: inputs.webchat, djcontrols: inputs.djcontrols});
                } else {
                    Meta.changeMeta({state: 'automation_sports', dj: inputs.sport, topic: inputs.topic, track: '', webchat: inputs.webchat, djcontrols: inputs.djcontrols});
                }
            } else {
                // Otherwise, just update metadata but do not do anything else
                Meta.changeMeta({dj: inputs.sport, topic: inputs.topic, track: '', webchat: inputs.webchat, djcontrols: inputs.djcontrols});

                // Log this request
                await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: inputs.sport, event: 'Producer requested to start a sports broadcast (immediate transition from another sports broadcast).' + "\n" + 'Sport: ' + inputs.sport + "\n" + 'Remote?: ' + inputs.remote + "\n" + 'Topic: ' + inputs.topic})
                        .tolerate((err) => {
                            // Don't throw errors, but log them
                            sails.log.error(err);
                        });
            }
            
            await sails.helpers.error.reset('automationBreak');
            Meta.changingState = false;
            return exits.success();
        } catch (e) {
            Meta.changingState = false;
            return exits.error(e);
        }

    }


};
