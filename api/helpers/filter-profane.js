var profanity = require('profanity-util', {substring: "lite"});

module.exports = {

    friendlyName: 'filterProfane',

    description: 'Filter out any profanity in a string',

    inputs: {
        message: {
            type: 'string',
            required: true,
            description: 'The string to be filtered.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper filterProfane called.');
        var filtered = profanity.purify(inputs.message);
        sails.log.silly(filtered);
        return exits.success(filtered[0]);
    }


};

