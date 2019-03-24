/* global sails */

module.exports = {

    friendlyName: 'config / profanity / remove',

    description: 'Remove a word from the profanity filter for metadata, messages, and other text that is public.',

    inputs: {
        word: {
            type: 'string',
            required: true,
            description: `The word or phrase that should no longer be filtered.`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/profanity/remove called.');

        try {
            sails.config.custom.profanity
                    .filter((word) => word === inputs.word)
                    .map((word, index) => delete sails.config.custom.profanity[index]);

            // broadcast changes over websockets
            sails.sockets.broadcast('config', 'config', {update: {profanity: sails.config.custom.profanity}});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


