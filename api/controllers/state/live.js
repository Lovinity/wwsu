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

            if (Meta.changingState)
                return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`));
            Meta.changingState = true;

            // Filter profanity
            if (inputs.topic !== '')
                inputs.topic = await sails.helpers.filterProfane(inputs.topic);
            if (inputs.showname !== '')
                inputs.showname = await sails.helpers.filterProfane(inputs.showname);

            // Send meta so that DJ Controls does not think this person is interfering with another show
            await Meta.changeMeta({dj: inputs.showname, topic: inputs.topic, track: ''});

            // If we are not already in live mode, prepare to go live in RadioDJ
            if (!Meta['A'].state.startsWith("live_"))
            {
                // Log this request
                await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: inputs.showname, event: 'DJ requested to go live.' + "\n" + 'DJ - Show: ' + inputs.showname + "\n" + 'Topic: ' + inputs.topic})
                        .tolerate((err) => {
                            // Do not throw for errors, but log it.
                            sails.log.error(err);
                        });

                //await sails.helpers.error.count('goLive');

                // Operation: Remove all music tracks, queue a station ID, and disable auto DJ.
                await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                await sails.helpers.rest.removeMusic(false, false);
                await sails.helpers.rest.cmd('EnableAssisted', 1);
                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                Status.errorCheck.prevID = moment();
                await sails.helpers.error.count('stationID');
                if (typeof sails.config.custom.showcats[Meta['A'].dj] !== 'undefined')
                    await sails.helpers.songs.queue([sails.config.custom.showcats[Meta['A'].dj]["Show Openers"]], 'Bottom', 1);
                await sails.helpers.rest.cmd('EnableAssisted', 0);
                await Meta.changeMeta({state: 'automation_live', dj: inputs.showname, topic: inputs.topic, track: '', webchat: inputs.webchat, djcontrols: inputs.djcontrols});
            } else {
                // Otherwise, just update metadata but do not do anything else
                await Meta.changeMeta({dj: inputs.showname, topic: inputs.topic, track: '', webchat: inputs.webchat, djcontrols: inputs.djcontrols});

                // Log this request
                await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: inputs.showname, event: 'DJ requested to go live (immediate transition from another live show).' + "\n" + 'DJ - Show: ' + inputs.showname + "\n" + 'Topic: ' + inputs.topic})
                        .tolerate((err) => {
                            // Do not throw for errors, but log it.
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
