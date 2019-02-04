/* global Hosts, sails, Djs, host, Directors, DJ */
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
module.exports = {

    friendlyName: 'Auth / admin-director-uab',

    description: 'Authorize an admin UAB director and get a token.',

    inputs: {
        username: {
            type: 'string',
            description: 'The name of the admin director to authorize.',
            required: true
        },

        password: {
            type: 'string',
            description: 'Director login to authorize.',
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
        sails.log.debug('Controller auth/admin-director-uab called.');

        try {

            // Verify the Director exists first
            var director = await Uabdirectors.findOne({name: inputs.username, admin: true});
            if (!director)
                return exits.noToken({errToken: "The provided director either does not exist or is not authorized."});
            
            // Now check the password
            var match = await bcrypt.compare(inputs.password, director.login);
            
            if (!match)
                return exits.noToken({errToken: "The provided director either does not exist or is not authorized."});

            // Generate the token valid for 5 minutes
            var token = jwt.sign({name: director.name, exp: Math.floor(Date.now() / 1000) + (60 * 10)}, sails.config.custom.secrets.adminDirectorUab, {subject: 'adminDirectorUab'});

            // Return the token as an object
            return exits.success({token: token, expires: (60000 * 10)});
        } catch (e) {
            return exits.error(e);
        }
    }


};



