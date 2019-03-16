/* global Hosts, sails, Djs, host */
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
module.exports = {

    friendlyName: 'Auth / dj',

    description: 'Authorize a dj and get a token.',

    inputs: {
        username: {
            type: 'string',
            description: 'The name of the DJ to authorize.',
            required: true
        },

        password: {
            type: 'string',
            description: 'DJ login to authorize.',
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
        sails.log.debug('Controller auth/dj called.');

        try {

            // Verify the DJ exists first
            var dj = await Djs.findOne({name: inputs.username});
            if (!dj)
                return exits.noToken({errToken: "The provided DJ either does not exist or is not authorized."});
            
            // Now check the password
            var match = await bcrypt.compare(inputs.password, dj.login);
            
            if (!match)
                return exits.noToken({errToken: "The provided DJ either does not exist or is not authorized."});

            // Generate the token valid for 60 minutes
            var token = jwt.sign({name: dj.name, exp: Math.floor(Date.now() / 1000) + (60 * 60)}, sails.config.custom.secrets.dj, {subject: 'dj'});

            // Return the token as an object
            return exits.success({token: token, expires: (60000 * 10)});
        } catch (e) {
            return exits.error(e);
        }
    }


};
