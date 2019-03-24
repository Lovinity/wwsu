/* global sails */

module.exports = {

    friendlyName: 'config / profanity / add',

    description: 'Add a word into the profanity filter for metadata, messages, and other text that is public.',

    inputs: {
        word: {
            type: 'string',
            required: true,
            description: `The word or phrase that should be filtered out from all metadata and messages.`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/profanity/add called.');

        try {
            //Do not add duplicates
            var exists = false;
            sails.config.custom.profanity
                    .filter((word) => word === inputs.word)
                    .map(() => exists = true);
            
            if (!exists)
                sails.config.custom.profanity.push(inputs.word);

            // broadcast changes over websockets
            sails.sockets.broadcast('config', 'config', {update: {profanity: sails.config.custom.profanity}});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


