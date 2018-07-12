/* global sails */

module.exports = async function public(req, res) {
    sails.log.debug('Controller listen called.');
    
    return res.view('listen/home', {layout: 'listen/layout'});

};