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
        },
    },

    exits: {
        success: {
            statusCode: 200,
            outputExample: {user: {}, token: 'Temporary token to use in Authorization header of API requests.'}
        },
        error: {
            statusCode: 403
        },
    },

    fn: async function (inputs, exits) {
        var user = await Nodeusers.find({email: inputs.email}).limit(1);
        if (user && user[0])
            return exits.success({
                user: user[0],
                token: await jwt.sign( // Sign and generate an authorization token
                        {id: user[0].ID},
                        sails.tokenSecret, // Token Secret that we sign it with
                        {
                            expiresIn: (60 * 15) // Token Expire time
                        }
                )
            });
        return exits.error();
    }


};
