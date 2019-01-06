/* global sails */

/**
 * isAuthorized
 *
 * @description :: Policy to check if user is authorized with JSON web token
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Policies
 */

module.exports = async function (req, res, next) {
    if (!req.isSocket)
        return res.status(403).json({err: "This endpoint must be called with a websocket"});
    
    next();
};
