module.exports = async function public(req, res) {
    sails.log.debug('Controller listen/listen called.');
    return res.view('listen/listen', {layout: 'listen/layout', timestamp: moment().format("YYYYMMDD"), requestLimit: sails.config.custom.requests.dailyLimit});
};

