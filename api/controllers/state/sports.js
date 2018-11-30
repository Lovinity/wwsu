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

            // Block this request if we are already switching states
            if (Meta['A'].changingState !== null)
                return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`));

            // Lock so that any other state changing requests are blocked until we are done
            await Meta.changeMeta({changingState: `Switching to sports`});

            // Filter profanity
            if (inputs.topic !== '')
            {
                inputs.topic = await sails.helpers.filterProfane(inputs.topic);
                inputs.topic = await sails.helpers.sanitize(inputs.topic);
                inputs.topic = await sails.helpers.truncateText(inputs.topic, 140);
            }

            // Set meta to prevent accidental messages in DJ Controls
            Meta.changeMeta({show: inputs.sport, topic: inputs.topic, trackStamp: null});

            // Start the sports broadcast
            if (!Meta['A'].state.startsWith("sports"))
            {

                //await sails.helpers.error.count('goLive');

                // Operation: Remove all music tracks, queue a station ID, queue an opener if one exists for this sport, and start the next track if current track is music.
                await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, false, true);
                await sails.helpers.rest.cmd('EnableAssisted', 1);
                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                
                // Queue a Sports opener if there is one
                if (typeof sails.config.custom.sportscats[inputs.sport] !== 'undefined')
                    await sails.helpers.songs.queue([sails.config.custom.sportscats[inputs.sport]["Sports Openers"]], 'Bottom', 1);
                
                Status.errorCheck.prevID = moment();
                await sails.helpers.error.count('stationID');
                await sails.helpers.rest.cmd('EnableAssisted', 0);

                // Change meta
                if (inputs.remote)
                {
                    Meta.changeMeta({queueFinish: moment().add(await sails.helpers.songs.calculateQueueLength(), 'seconds').toISOString(true), state: 'automation_sportsremote', show: inputs.sport, topic: inputs.topic, trackStamp: null, lastID: moment().toISOString(true), webchat: inputs.webchat, djcontrols: inputs.djcontrols});
                } else {
                    Meta.changeMeta({queueFinish: moment().add(await sails.helpers.songs.calculateQueueLength(), 'seconds').toISOString(true), state: 'automation_sports', show: inputs.sport, topic: inputs.topic, trackStamp: null, lastID: moment().toISOString(true), webchat: inputs.webchat, djcontrols: inputs.djcontrols});
                }
            } else {
                // Otherwise, just update metadata but do not do anything else
                Meta.changeMeta({show: inputs.sport, topic: inputs.topic, trackStamp: null, webchat: inputs.webchat, djcontrols: inputs.djcontrols});
            }

            await sails.helpers.error.reset('automationBreak');
            await Meta.changeMeta({changingState: null});
            return exits.success();
        } catch (e) {
            await Meta.changeMeta({changingState: null});
            return exits.error(e);
        }

    }


};
