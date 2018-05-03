/**
 * Module dependencies
 */
var moment = require('moment');
// ...


/**
 * display/internal.js
 *
 * Internal display sign webpage.
 */
module.exports = async function internal(req, res) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    return res.view('display/layout', {layout: 'display/internal', timestamp: moment().valueOf()});

};
