/* global sails, moment */

/**
 * Module dependencies
 */
// ...


/**
 * display/internal.js
 *
 * Internal display sign webpage.
 * @param {object} req Express.js request object
 * @param {object} res Express.js response object
 */
module.exports = async function internal(req, res) {
    sails.log.debug('Controller display/internal called.');
    
    // Disable cacheing. Cache should not be active on display signs, or the refresh command will be ineffective.
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    
    return res.view('display/layout', {layout: 'display/internal', timestamp: moment().valueOf()});

};
