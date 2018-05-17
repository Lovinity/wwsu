/**
 * Module dependencies
 */
    var moment = require('moment');
// ...


/**
 * display/public.js
 *
 * Public display sign webpage.
 * @param {object} req Express.js request object
 * @param {object} res Express.js response object
 */
module.exports = async function public(req, res) {

    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    return res.view('display/layout', {layout: 'display/public', timestamp: moment().valueOf()});

};
