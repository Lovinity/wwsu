/* global sails */

/**
 * isAuthorized
 *
 * @description :: Policy to check if user is authorized with JSON web token
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Policies
 */

var jwt = require('jsonwebtoken');

module.exports = async function (req, res, next) {
    var token;

    if (req.headers && req.headers.authorization) {
        var parts = req.headers.authorization.split(' ');
        if (parts.length === 2) {
            var scheme = parts[0],
                    credentials = parts[1];

            if (/^Bearer$/i.test(scheme)) {
                token = credentials;
            }
        } else {
            return res.status(401).json({err: 'Error with authorization. Format is Authorization: Bearer [token]'});
        }
    } else if (req.param('token')) {
        token = req.param('token');
        // We delete the token from param to not mess with blueprints
        delete req.query.token;
    } else {
        return res.status(401).json({err: 'This endpoint requires auth/director authorization.'});
    }

    try {
        var authorized = jwt.verify(token, sails.config.custom.secrets.director, {subject: 'director'});
        
        // Set the authorization data to req.payload so controllers/actions can use it
        req.payload = authorized;
        
        return next();
    } catch (e) {
        sails.log.error(e);
        return res.status(401).json({err: 'This endpoint requires auth/director authorization. The provided token is invalid or expired.'});
    }
};
