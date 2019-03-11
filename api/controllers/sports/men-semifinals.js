/* global sails, moment */

module.exports = async function public(req, res) {
    sails.log.debug('Controller called.');
    
    return res.view('sports/mensemifinals', {layout: 'sports/layout', timestamp: moment().valueOf()});

};

