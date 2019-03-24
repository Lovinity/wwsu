/* global sails */

module.exports = {

    friendlyName: 'config / meta / alt / set',

    description: 'Set what text is displayed in metadata depending on state when a categories.noMeta track is playing.',

    inputs: {
        automation: {
            type: 'string',
            description: `Meta text to use when playing a noMeta track in regular automation`
        },
        playlist: {
            type: 'string',
            description: `Meta text to use when playing a noMeta track in playlist mode`
        },
        genre: {
            type: 'string',
            description: `Meta text to use when playing a noMeta track in genre automation`
        },
        live: {
            type: 'string',
            description: `Meta text to use when playing a noMeta track during a live show`
        },
        prerecord: {
            type: 'string',
            description: `Meta text to use when playing a noMeta track during a prerecord`
        },
        remote: {
            type: 'string',
            description: `Meta text to use when playing a noMeta track, or when the remote stream disconnected, during a remote broadcast`
        },
        sports: {
            type: 'string',
            description: `Meta text to use when playing something in automation during a sports broadcast (live or remote)`
        }
    },

    exits: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/meta/alt/set called.');

        try {
            var returnData = {};
            // Set the new configuration of any and all values provided as input
            for (var key in inputs)
            {
                if (inputs.hasOwnProperty(key))
                {
                    sails.config.custom.meta.alt[key] = inputs[key];
                    returnData[key] = inputs[key];
                }
            }

            // broadcast changes over websockets
            sails.sockets.broadcast('config', 'config', {update: {meta: sails.config.custom.meta}});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


