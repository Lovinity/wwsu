module.exports = {

    friendlyName: 'config / queue / set',

    description: 'Set configuration for defining when the automation queue should be corrected.',

    inputs: {
        live: {
            type: 'number',
            description: `If trying to begin a live show, and the total queue time is greater than this in seconds, skip currently playing track and try clearing necessary tracks from the queue again.`
        },
        prerecord: {
            type: 'number',
            description: `If the amount of time between now and the first prerecord playlist track is greater than this many seconds, try clearing/skipping some tracks to get the prerecord on the air sooner.`
        },
        sports: {
            type: 'number',
            description: `If trying to begin a sports broadcast, if the total queue is greater than this many seconds, skip current track, clear necessary tracks to try and get sports on sooner.`
        },
        sportsReturn: {
            type: 'number',
            description: `When first returning from a break in a sports broadcast, if the queue is greater than this in seconds, clear out some tracks.`
        },
        remote: {
            type: 'number',
            description: `If trying to begin a remote broadcast, if the total queue is greater than this many seconds, skip current track, clear necessary tracks to try and get remote on sooner.`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/queue/set called.');

        try {
            // Set the new configuration of any and all values provided as input
            for (var key in inputs)
            {
                if (inputs.hasOwnProperty(key))
                {
                    sails.config.custom.queueCorrection[key] = inputs[key];

                }
            }

            // broadcast changes over websockets
            sails.sockets.broadcast('config', 'config', {update: {queueCorrection: sails.config.custom.queueCorrection}});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


