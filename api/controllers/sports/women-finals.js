module.exports = async function public(req, res) {
    sails.log.debug('Controller called.');

    return res.view('sports/womenfinals', {layout: 'sports/layout', timestamp: moment().valueOf()});

};

