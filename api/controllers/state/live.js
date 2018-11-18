/* global sails, Logs, Meta, Status */

module.exports = {

    friendlyName: 'state / live',

    description: 'Request to go live.',

    inputs: {
        topic: {
            type: 'string',
            defaultsTo: '',
            description: 'A string containing a short blurb about this live broadcast.'
        },

        showname: {
            type: 'string',
            required: true,
            custom: function (value) {
                var temp2 = value.split(" - ");
                if (temp2.length === 2)
                    return true;
                return false;
            },
            description: 'Name of the show beginning. It must follow the format "DJ name/handle - show name".'
        },

        webchat: {
            type: 'boolean',
            defaultsTo: true,
            description: 'Should the web chat be enabled during this show? Defaults to true.'
        },

        djcontrols: {
            type: 'string',
            required: true,
            description: 'Name of the computer which is triggering this live request (the live request should be coming from DJ Controls).'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller state/live called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Do not continue if not in live or automation mode; client should request automation before requesting live
            if (!Meta['A'].state.startsWith("live_") && !Meta['A'].state.startsWith("automation_"))
                return exits.error(new Error(`Cannot execute state/live unless in automation or live mode. Please go to automation first.`));

            // Block the request if we are changing states right now
            if (Meta['A'].changingState !== null)
                return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`));

            // Lock so other state changing requests get blocked until we are done
            await Meta.changeMeta({changingState: `Switching to live`});

            // Filter profanity and sanitize
            if (inputs.topic !== '')
            {
                inputs.topic = await sails.helpers.filterProfane(inputs.topic);
                inputs.topic = await sails.helpers.sanitize(inputs.topic);
                inputs.topic = await sails.helpers.truncateText(inputs.topic, 140);
            }
            if (inputs.showname !== '')
            {
                inputs.showname = await sails.helpers.filterProfane(inputs.showname);
                inputs.showname = await sails.helpers.sanitize(inputs.showname);
            }

            // Send meta early so that DJ Controls does not think this person is interfering with another show
            await Meta.changeMeta({dj: inputs.showname, topic: inputs.topic, trackStamp: null});

            // If we are not already in live mode, prepare to go live in RadioDJ
            if (!Meta['A'].state.startsWith("live_") || Meta['A'].state === 'live_prerecord')
            {

                //await sails.helpers.error.count('goLive');

                // Operation: Remove all music tracks, queue a station ID, and disable auto DJ.
                await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearShow, false, false, (Meta.automation[0] && (parseInt(Meta.automation[0].Duration) - parseInt(Meta.automation[0].Elapsed) > (sails.config.custom.liveSkip * 60))));
                await sails.helpers.rest.cmd('EnableAssisted', 1);
                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                Status.errorCheck.prevID = moment();
                await sails.helpers.error.count('stationID');
                
                // Queue a show opener if applicable
                if (typeof sails.config.custom.showcats[Meta['A'].dj] !== 'undefined')
                {
                    await sails.helpers.songs.queue([sails.config.custom.showcats[Meta['A'].dj]["Show Openers"]], 'Bottom', 1);
                } else {
                    await sails.helpers.songs.queue([sails.config.custom.showcats["Default"]["Show Openers"]], 'Bottom', 1);
                }
                
                await sails.helpers.rest.cmd('EnableAssisted', 0);

                await Meta.changeMeta({queueLength: await sails.helpers.songs.calculateQueueLength(), state: 'automation_live', dj: inputs.showname, topic: inputs.topic, trackStamp: null, webchat: inputs.webchat, djcontrols: inputs.djcontrols});
            } else {
                // Otherwise, just update metadata but do not do anything else
                await Meta.changeMeta({dj: inputs.showname, topic: inputs.topic, trackStamp: null, webchat: inputs.webchat, djcontrols: inputs.djcontrols});
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
