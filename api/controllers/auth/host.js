/* global Hosts, sails */
var jwt = require('jsonwebtoken');

module.exports = {

    friendlyName: 'Auth / Host',

    description: 'Authorize a host and get a token.',

    inputs: {
        username: {
            type: 'string',
            description: 'The host to authorize.',
            required: true
        }
    },

    exits: {
        success: {
            statusCode: 200
        },
        noToken: {
            statusCode: 401
        },
        error: {
            statusCode: 500
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller auth/host called.');

        try {
            
            // Verify the host first
            var host = await Hosts.findOne({host: inputs.username, authorized: true});
            if (!host)
                return exits.noToken({err: "The provided host either does not exist or is not authorized."});
            
            // Generate the token valid for 15 minutes
            var token = jwt.sign({host: host.host, exp: Math.floor(Date.now() / 1000) + (60 * 15)}, sails.config.custom.secrets.host, {subject: 'host'});
            
            // Return the token as an object
            return exits.success({token: token});
        } catch (e) {
            return exits.error(e);
        }
    }


};
