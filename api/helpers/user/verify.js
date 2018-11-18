/* global sails */

var
        jwt = require('jsonwebtoken');

module.exports = {

    friendlyName: 'user.verify',

    description: 'Verify user.',

    inputs: {
        token: {
            type: 'string',
            required: true,
            description: 'The token to verify.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper user.verify called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        
        jwt.verify(inputs.token, sails.tokenSecret, {}, function(err, token) {
            if (err) return exits.success({err: 'Invalid Token!'});
            return exits.success(token);
        });
    }


};

