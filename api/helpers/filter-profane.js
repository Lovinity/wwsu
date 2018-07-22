/* global sails */

var profanity = require('profanity-util', {substring: "lite"});

module.exports = {

    friendlyName: 'filterProfane',

    description: 'Filter out any profanity in a string',

    inputs: {
        message: {
            type: 'string',
            defaultsTo: '',
            description: 'The string to be filtered.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper filterProfane called.');
        try {
            var filtered = profanity.purify(inputs.message);
            sails.log.silly(filtered);
            return exits.success(filtered[0]);
        } catch (e) {
            return exits.error(e);
        }
    }


};

