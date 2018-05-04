module.exports = {

    friendlyName: 'Filter profane',

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
        var profanity = require('profanity-util', {substring: "lite"});
        var filtered = profanity.purify(inputs.message);
        return exits.success(filtered[0]);
    }


};

