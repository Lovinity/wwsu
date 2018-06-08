/* global sails, Nodeusers */

var
        jwt = require('jsonwebtoken'),
        cryptoRandomString = require('crypto-random-string');
sails.tokenSecret = cryptoRandomString(256);
module.exports = {

    friendlyName: 'Auth',

    description: 'Authenticate to some of the restricted API endpoints.',

    inputs: {
        email: {
            description: 'Email address of the user authenticating.',
            type: 'string',
            isEmail: true,
            required: true
        },
        password: {
            description: 'Password of the user authenticating.',
            type: 'string',
            required: true
        }
    },

    exits: {
        success: {
            statusCode: 200,
            outputExample: {user: {}, token: 'Temporary token to use in Authorization header of API requests.'}
        },
        error: {
            statusCode: 500
        },

        notFound: {
            statusCode: 404
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller user/auth called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            var user = await Nodeusers.find({email: inputs.email}).limit(1);
            sails.log.verbose(`Nodeusers records retrieved: ${user.length}`);
            if (user && user[0])
            {
                try {
                    var valid = await Nodeusers.comparePassword(inputs.password, user[0]);
                    if (valid) {
                        return exits.success({
                            user: user[0],
                            token: await jwt.sign(// Sign and generate an authorization token
                                    {id: user[0].ID},
                                    sails.tokenSecret, // Token Secret that we sign it with
                                    {
                                        expiresIn: (60 * 15) // Token Expire time
                                    }
                            )
                        });
                    }
                } catch (e) {
                    return exits.error(e);
                }
            } else {
                return exits.notFound({code: 'E_NOT_FOUND', problems: ['Could not find a user matching the provided credentials.'], message: 'The server could not fulfill your request. No users matching the provided email and password exist. Please ensure your email and password are correct.'});
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};
