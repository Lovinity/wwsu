/* global sails, Meta, Logs, Status */

module.exports = {

    friendlyName: 'State / Remote',

    description: 'Request to begin a remote broadcast.',

    inputs: {
        topic: {
            type: 'string',
            defaultsTo: '',
            description: 'A string containing a short blurb about this remote broadcast.'
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
            description: 'Name of the broadcast beginning. It must follow the format "Show host - show name".'
        },

        webchat: {
            type: 'boolean',
            defaultsTo: true,
            description: 'Should the web chat be enabled during this show? Defaults to true.'
        },

        djcontrols: {
            type: 'string',
            required: true,
            description: 'Name of the computer which is triggering this remote request (the remote request should be coming from DJ Controls).'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller state/remote called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Do not continue if not in automation mode; client should request automation before requesting remote
            if (!Meta['A'].state.startsWith("automation_") && !Meta['A'].state.startsWith("remote_"))
                return exits.error(new Error(`Cannot execute state/remote unless in automation or remote. Please go to automation first.`));

            if (Meta.changingState)
                return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`));
            Meta.changingState = true;

            // Filter profanity
            if (inputs.topic !== '')
                inputs.topic = await sails.helpers.filterProfane(inputs.topic);
            if (inputs.showname !== '')
                inputs.showname = await sails.helpers.filterProfane(inputs.showname);
            
            // Send meta to prevent accidental interfering messages in Dj Controls
            await Meta.changeMeta({dj: inputs.showname, topic: inputs.topic, track: ''});

            // If we are not already in remote mode, prepare to go live in RadioDJ
            if (!Meta['A'].state.startsWith("remote_"))
            {
                // Log this request
                await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: inputs.showname, event: 'Remote show requested.' + "\n" + 'Producer - Show: ' + inputs.showname + "\n" + 'Topic: ' + inputs.topic})
                        .tolerate((err) => {
                            // Do not throw for errors, but log it
                            sails.log.error(err);
                        });

                //await sails.helpers.error.count('goRemote');

                // Operation: Remove all music tracks, queue a station ID, and disable auto DJ. CRON will queue and play the remote stream track once queue is empty.
                await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                await sails.helpers.rest.removeMusic();
                await sails.helpers.rest.cmd('EnableAssisted', 1);
                await sails.helpers.songs.queue(sails.config.custom.subcats.IDs, 'Bottom', 1);
                Status.errorCheck.prevID = moment();
                await sails.helpers.error.count('stationID');
                await sails.helpers.rest.cmd('EnableAssisted', 0);
                await Meta.changeMeta({state: 'automation_remote', dj: inputs.showname, topic: inputs.topic, track: '', webchat: inputs.webchat, djcontrols: inputs.djcontrols});
            } else {
                // Otherwise, just update metadata but do not do anything else
                await Meta.changeMeta({dj: inputs.showname, topic: inputs.topic, track: '', webchat: inputs.webchat, djcontrols: inputs.djcontrols});

                // Log this request
                await Logs.create({logtype: 'operation', loglevel: 'info', logsubtype: inputs.showname, event: 'Remote show requested (immediate transition from another show).' + "\n" + 'Host - Show: ' + inputs.showname + "\n" + 'Topic: ' + inputs.topic})
                        .tolerate((err) => {
                            // Do not throw for errors, but log it
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
