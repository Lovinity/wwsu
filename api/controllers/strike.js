/* global sails, moment */

module.exports = async function public(req, res) {
    sails.log.debug('Controller listen called.');
    
    return res.view('strike/home', {layout: 'strike/layout', timestamp: moment().valueOf()});

};


